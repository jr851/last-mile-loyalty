/**
 * Google Wallet pass generation for Last Mile Loyalty.
 *
 * Prerequisites (one-time setup):
 *  1. Google Cloud project created at console.cloud.google.com
 *  2. Google Wallet API enabled
 *  3. Service account created with Wallet Object Issuer role
 *  4. JSON key file downloaded to certs/google-wallet-key.json
 *  5. Issuer ID obtained from pay.google.com/business/console
 *
 * Env vars required:
 *  GOOGLE_WALLET_ISSUER_ID=3388000000XXXXXXXXX
 *  GOOGLE_WALLET_CLASS_SUFFIX=lastmileloyalty_stamps  (no spaces)
 */

import { GoogleAuth } from 'google-auth-library'
import path from 'path'

const WALLET_API_BASE = 'https://walletobjects.googleapis.com/walletobjects/v1'

function getAuth() {
  return new GoogleAuth({
    keyFile: path.join(process.cwd(), 'certs', 'google-wallet-key.json'),
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  })
}

function classId() {
  return `${process.env.GOOGLE_WALLET_ISSUER_ID}.${process.env.GOOGLE_WALLET_CLASS_SUFFIX || 'lastmileloyalty_stamps'}`
}

function objectId(customerId: string) {
  return `${process.env.GOOGLE_WALLET_ISSUER_ID}.customer_${customerId}`
}

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
  const auth = getAuth()
  const client = await auth.getClient()
  const token = await client.getAccessToken()

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
      balance: {
        int: 0,
      },
    },
    hexBackgroundColor: brandColor,
    countryCode: 'AU',
    reviewStatus: 'UNDER_REVIEW',
  }

  // Try to update first, create if it doesn't exist
  const updateRes = await fetch(`${WALLET_API_BASE}/loyaltyClass/${classId()}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(classResource),
  })

  if (updateRes.status === 404) {
    await fetch(`${WALLET_API_BASE}/loyaltyClass`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.token}`,
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
  const auth = getAuth()
  const client = await auth.getClient()
  const token = await client.getAccessToken()

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
      balance: {
        int: stampCount,
      },
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
      ? {
          locations: [
            {
              latitude,
              longitude,
            },
          ],
        }
      : {}),
  }

  // Upsert the object
  const updateRes = await fetch(`${WALLET_API_BASE}/loyaltyObject/${objectId(customerId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(objectResource),
  })

  if (updateRes.status === 404) {
    await fetch(`${WALLET_API_BASE}/loyaltyObject`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(objectResource),
    })
  }

  // Generate JWT save link
  const jwtClaims = {
    iss: (await auth.getCredentials()).client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    payload: {
      loyaltyObjects: [{ id: objectId(customerId) }],
    },
  }

  // Sign the JWT using the service account key
  const jwt = await signJwt(jwtClaims, auth)
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
  const auth = getAuth()
  const client = await auth.getClient()
  const token = await client.getAccessToken()

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
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })
}

/**
 * Sign a JWT payload using the Google service account.
 */
async function signJwt(payload: Record<string, unknown>, auth: GoogleAuth): Promise<string> {
  const credentials = await auth.getCredentials()
  const header = { alg: 'RS256', typ: 'JWT' }

  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const signingInput = `${encode(header)}.${encode(payload)}`

  const crypto = await import('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signingInput)
  const signature = sign
    .sign(credentials.private_key as string)
    .toString('base64url')

  return `${signingInput}.${signature}`
}
