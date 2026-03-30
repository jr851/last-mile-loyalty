/**
 * Google Wallet pass generation for Last Mile Loyalty.
 * Edge-runtime compatible — uses Web Crypto API for JWT signing.
 *
 * Prerequisites (one-time setup):
 *  1. Google Cloud project created at console.cloud.google.com
 *  2. Google Wallet API enabled
 *  3. Service account created with Wallet Object Issuer role
 *  4. JSON key file downloaded, base64-encoded, stored in env var
 *  5. Issuer ID obtained from pay.google.com/business/console
 *
 * Env vars required:
 *  GOOGLE_WALLET_ISSUER_ID=3388000000XXXXXXXXX
 *  GOOGLE_WALLET_CLASS_SUFFIX=lastmileloyalty_stamps  (no spaces)
 *  GOOGLE_SERVICE_ACCOUNT_B64=<base64-encoded service account JSON>
 */

const WALLET_API_BASE = 'https://walletobjects.googleapis.com/walletobjects/v1'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'

interface ServiceAccountCredentials {
  client_email: string
  private_key: string
}

function getCredentials(): ServiceAccountCredentials {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64
  if (!b64) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_B64 env var')
  const json = atob(b64)
  const parsed = JSON.parse(json)
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Service account JSON missing client_email or private_key')
  }
  return { client_email: parsed.client_email, private_key: parsed.private_key }
}

function classId() {
  return `${process.env.GOOGLE_WALLET_ISSUER_ID}.${process.env.GOOGLE_WALLET_CLASS_SUFFIX || 'lastmileloyalty_stamps'}`
}

function objectId(customerId: string) {
  return `${process.env.GOOGLE_WALLET_ISSUER_ID}.customer_${customerId}`
}

// ─── Web Crypto helpers ──────────────────────────────────────────────────────

function base64urlEncode(data: ArrayBuffer | string): string {
  let bytes: Uint8Array
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data)
  } else {
    bytes = new Uint8Array(data)
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Import a PEM-encoded RSA private key for RS256 signing.
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Strip PEM headers/footers and decode base64
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\r?\n/g, '')
    .trim()

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

/**
 * Sign a JWT using RS256 with the service account private key.
 */
async function signJwtEdge(payload: Record<string, unknown>, privateKeyPem: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const headerB64 = base64urlEncode(JSON.stringify(header))
  const payloadB64 = base64urlEncode(JSON.stringify(payload))
  const signingInput = `${headerB64}.${payloadB64}`

  const key = await importPrivateKey(privateKeyPem)
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  )

  const sigB64 = base64urlEncode(signature)
  return `${signingInput}.${sigB64}`
}

/**
 * Obtain a short-lived OAuth2 access token for the Google Wallet API
 * using a service account JWT (two-legged OAuth).
 */
async function getAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const jwtPayload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
    aud: OAUTH_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }

  const jwt = await signJwtEdge(jwtPayload, credentials.private_key)

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to get access token: ${text}`)
  }

  const data = await res.json() as { access_token: string }
  return data.access_token
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface GooglePassInput {
  customerId: string
  businessName: string
  businessSlug: string
  brandColor: string        // hex e.g. "#c07a3e"
  stampCount: number
  rewardStampsNeeded: number
  rewardDescription: string
  cafeAddress?: string
  latitude?: number
  longitude?: number
}

/**
 * Create or update the loyalty class (template) for Last Mile Loyalty.
 * Only needs to be called once, but safe to call repeatedly.
 */
export async function upsertLoyaltyClass(businessName: string, brandColor: string) {
  const credentials = getCredentials()
  const token = await getAccessToken(credentials)

  const classResource = {
    id: classId(),
    issuerName: 'Last Mile Loyalty',
    programName: businessName,
    programLogo: {
      sourceUri: {
        uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://lastmileloyalty.com'}/wallet-logo.png`,
      },
    },
    loyaltyPoints: {
      label: 'Stamps',
      balance: { int: 0 },
    },
    hexBackgroundColor: brandColor,
    countryCode: 'AU',
    reviewStatus: 'UNDER_REVIEW',
  }

  const updateRes = await fetch(`${WALLET_API_BASE}/loyaltyClass/${classId()}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(classResource),
  })

  if (updateRes.status === 404) {
    await fetch(`${WALLET_API_BASE}/loyaltyClass`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(classResource),
    })
  }
}

/**
 * Create or update a loyalty object (pass) for a specific customer.
 * Returns a "Save to Google Wallet" JWT link.
 */
export async function generateGooglePassUrl(input: GooglePassInput): Promise<string> {
  const credentials = getCredentials()
  const token = await getAccessToken(credentials)

  const {
    customerId,
    businessName,
    stampCount,
    rewardStampsNeeded,
    rewardDescription,
    brandColor,
    latitude,
    longitude,
  } = input

  const stampsRemaining = Math.max(0, rewardStampsNeeded - stampCount)

  const objectResource = {
    id: objectId(customerId),
    classId: classId(),
    state: 'ACTIVE',
    loyaltyPoints: {
      balance: { int: stampCount },
      label: 'Stamps',
    },
    textModulesData: [
      {
        id: 'reward',
        header: 'Your Reward',
        body:
          stampsRemaining > 0
            ? `${stampsRemaining} more stamp${stampsRemaining === 1 ? '' : 's'} to earn: ${rewardDescription}`
            : `🎉 You've earned: ${rewardDescription}! Show this to staff.`,
      },
      {
        id: 'programme',
        header: 'About',
        body: `Collect ${rewardStampsNeeded} stamps at ${businessName} to earn ${rewardDescription}.`,
      },
    ],
    barcode: {
      type: 'QR_CODE',
      value: customerId,
      alternateText: 'Show to staff',
    },
    hexBackgroundColor: brandColor,
    ...(latitude && longitude
      ? { locations: [{ latitude, longitude }] }
      : {}),
  }

  // Upsert the object
  const updateRes = await fetch(`${WALLET_API_BASE}/loyaltyObject/${objectId(customerId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(objectResource),
  })

  if (updateRes.status === 404) {
    await fetch(`${WALLET_API_BASE}/loyaltyObject`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(objectResource),
    })
  }

  // Generate JWT save link
  const now = Math.floor(Date.now() / 1000)
  const jwtClaims = {
    iss: credentials.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: now,
    payload: {
      loyaltyObjects: [{ id: objectId(customerId) }],
    },
  }

  const jwt = await signJwtEdge(jwtClaims, credentials.private_key)
  return `https://pay.google.com/gp/v/save/${jwt}`
}

/**
 * Update an existing Google Wallet pass when stamps change.
 */
export async function updateGooglePassStamps(
  customerId: string,
  stampCount: number,
  rewardStampsNeeded: number,
  rewardDescription: string
) {
  const credentials = getCredentials()
  const token = await getAccessToken(credentials)

  const stampsRemaining = Math.max(0, rewardStampsNeeded - stampCount)

  const patch = {
    loyaltyPoints: {
      balance: { int: stampCount },
      label: 'Stamps',
    },
    textModulesData: [
      {
        id: 'reward',
        header: 'Your Reward',
        body:
          stampsRemaining > 0
            ? `${stampsRemaining} more stamp${stampsRemaining === 1 ? '' : 's'} to earn: ${rewardDescription}`
            : `🎉 You've earned: ${rewardDescription}! Show this to staff.`,
      },
    ],
  }

  await fetch(`${WALLET_API_BASE}/loyaltyObject/${objectId(customerId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })
}
