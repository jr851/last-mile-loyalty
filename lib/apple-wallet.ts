/**
 * Apple Wallet pass generation for Last Mile Loyalty.
 *
 * Uses Node.js built-in crypto module for PKCS#7 detached signing.
 * Zero external dependencies -- the PKCS#7 DER structure is built manually.
 *
 * Env vars required:
 *  APPLE_SIGNER_CERT_B64  - PEM signing cert, base64-encoded
 *  APPLE_SIGNER_KEY_B64   - PEM private key, base64-encoded
 *  APPLE_WWDR_B64         - Apple WWDR G4 cert (PEM), base64-encoded
 *  APPLE_PASS_TYPE_ID     - e.g. pass.com.lastmileloyalty.card
 *  APPLE_TEAM_ID          - e.g. JN748A5TNV
 *  APPLE_CERT_PASSWORD    - private key passphrase (optional)
 */

import { createHash, createSign, createPrivateKey } from 'crypto'

// Minimal solid-colour PNG assets required by Apple Wallet.
const PASS_ASSETS: Record<string, string> = {
  'icon.png': 'iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAIAAADZ8fBYAAAAJklEQVR4nGM4UGVHC8Qwau6ouaPmjpo7au6ouaPmjpo7au6gMhcA6QvTdaw7c5cAAAAASUVORK5CYII=',
  'icon@2x.png': 'iVBORw0KGgoAAAANSUhEUgAAADoAAAA6CAIAAABu2d1/AAAATElEQVR4nO3OQQ0AMAgEMJQhbOombRb2O0iaVEDrnl6k4gPdMXR1dXV1dXV1ddN0dXV1dXV1dXXTdHV1dXV1dXV103R1dXV1dXV1fzw9dE3+Xuv3tAAAAABJRU5ErkJggg==',
  'icon@3x.png': 'iVBORw0KGgoAAAANSUhEUgAAAFcAAABXCAIAAAD+qk47AAAAh0lEQVR4nO3QQQ0AQAgEMZQhDHUn7VSQ5dFkBExab1oVP7gQBQoUKFCgQIECBQoUKFCgQIECBQoUKFCgQIECBQoUKFCgQIFCOgoUKFCgQIECBQoUKFCgQIECBQoUKFCgQIECBQoUKFCgQIEChXQUKFCgQIECBQoUKFCgQIECBQoUKFCgQGGjD+hab360C/LYAAAAAElFTkSuQmCC',
  'logo.png': 'iVBORw0KGgoAAAANSUhEUgAAAKAAAAAyCAIAAABUA0cyAAAAkUlEQVR4nO3RAQkAIBDAwE9mMNMZzRQijIMLMNicvQib7wU8ZXCcwXEGxxkcZ3CcwXEGxxkcZ3CcwXEGxxkcZ3CcwXEGxxkcZ3CcwXEGxxkcZ3CcwXEGxxkcZ3CcwXEGxxkcZ3CcwXEGxxkcZ3CcwXEGxxkcZ3CcwXEGxxkcZ3CcwXEGxxkcZ3CcwXEGxxkcdwFOW+ikSkx03AAAAABJRU5ErkJggg==',
  'logo@2x.png': 'iVBORw0KGgoAAAANSUhEUgAAAUAAAABkCAIAAAB4uH5pAAABQUlEQVR4nO3TQQ0AIBDAsFOGMNQhDQ98yJImFbDP5uwFRM33AuCZgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBBmYAgzMIQZGMIMDGEGhjADQ5iBIczAEGZgCDMwhBkYwgwMYQaGMANDmIEhzMAQZmAIMzCEGRjCDAxhBoYwA0OYgSHMwBB2ATrQorqZWo8fAAAAAElFTkSuQmCC',
}

export interface ApplePassInput {
  customerId: string
  businessName: string
  businessSlug: string
  brandColor: string
  stampCount: number
  rewardStampsNeeded: number
  rewardDescription: string
  cafeAddress?: string
  latitude?: number
  longitude?: number
}

/* ------------------------------------------------------------------ */
/*  ASN.1 DER encoding helpers                                        */
/* ------------------------------------------------------------------ */

function derLen(len: number): Buffer {
  if (len < 0x80) return Buffer.from([len])
  if (len < 0x100) return Buffer.from([0x81, len])
  if (len < 0x10000) return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff])
  return Buffer.from([0x83, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff])
}

function derWrap(tag: number, ...parts: Buffer[]): Buffer {
  const body = Buffer.concat(parts)
  return Buffer.concat([Buffer.from([tag]), derLen(body.length), body])
}

const SEQUENCE = ((...p: Buffer[]) => derWrap(0x30, ...p))
const SET      = ((...p: Buffer[]) => derWrap(0x31, ...p))
const CONTEXT  = ((n: number, ...p: Buffer[]) => derWrap(0xa0 | n, ...p))
const OCTET_STRING = ((d: Buffer) => derWrap(0x04, d))
const INTEGER_RAW  = ((d: Buffer) => derWrap(0x02, d))

function derOid(oid: number[]): Buffer {
  const first = oid[0] * 40 + oid[1]
  const bytes: number[] = [first]
  for (let i = 2; i < oid.length; i++) {
    let v = oid[i]
    if (v < 128) {
      bytes.push(v)
    } else {
      const enc: number[] = []
      while (v > 0) { enc.unshift(v & 0x7f); v >>>= 7 }
      for (let j = 0; j < enc.length - 1; j++) enc[j] |= 0x80
      bytes.push(...enc)
    }
  }
  return derWrap(0x06, Buffer.from(bytes))
}

function derUtcTime(date: Date): Buffer {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const y = date.getUTCFullYear() % 100
  const s = `${pad(y)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  return derWrap(0x17, Buffer.from(s, 'ascii'))
}

const DER_NULL = Buffer.from([0x05, 0x00])

// Well-known OIDs
const OID_DATA               = [1,2,840,113549,1,7,1]
const OID_SIGNED_DATA        = [1,2,840,113549,1,7,2]
const OID_SHA256             = [2,16,840,1,101,3,4,2,1]
const OID_RSA_ENCRYPTION     = [1,2,840,113549,1,1,1]
const OID_CONTENT_TYPE       = [1,2,840,113549,1,9,3]
const OID_MESSAGE_DIGEST     = [1,2,840,113549,1,9,4]
const OID_SIGNING_TIME       = [1,2,840,113549,1,9,5]

/* ------------------------------------------------------------------ */
/*  Minimal ASN.1 DER parser (just enough to extract cert fields)     */
/* ------------------------------------------------------------------ */

interface Asn1Node {
  tag: number
  headerLen: number
  length: number
  value: Buffer
  children?: Asn1Node[]
  raw: Buffer
}

function parseDer(buf: Buffer, offset = 0): Asn1Node {
  const tag = buf[offset]
  let len: number
  let headerLen: number

  if (buf[offset + 1] < 0x80) {
    len = buf[offset + 1]
    headerLen = 2
  } else {
    const numBytes = buf[offset + 1] & 0x7f
    len = 0
    for (let i = 0; i < numBytes; i++) {
      len = (len << 8) | buf[offset + 2 + i]
    }
    headerLen = 2 + numBytes
  }

  const value = buf.subarray(offset + headerLen, offset + headerLen + len)
  const raw = buf.subarray(offset, offset + headerLen + len)

  const isConstructed = (tag & 0x20) !== 0
  let children: Asn1Node[] | undefined
  if (isConstructed) {
    children = []
    let pos = 0
    while (pos < value.length) {
      const child = parseDer(value, pos)
      children.push(child)
      pos += child.headerLen + child.length
    }
  }

  return { tag, headerLen, length: len, value, children, raw }
}

/**
 * Extract issuer Name (DER) and serialNumber (DER-encoded INTEGER value)
 * from a DER-encoded X.509 certificate.
 *
 * X.509 structure:
 *   SEQUENCE {
 *     SEQUENCE {  -- tbsCertificate
 *       [0] { INTEGER version }  -- optional, v3 certs have this
 *       INTEGER serialNumber
 *       SEQUENCE { ... }  -- signature algorithm
 *       SEQUENCE { ... }  -- issuer Name
 *       ...
 *     }
 *     ...
 *   }
 */
function extractCertFields(certDer: Buffer): { issuerDer: Buffer; serialDer: Buffer } {
  if (!certDer || certDer.length === 0) {
    throw new Error('extractCertFields: empty certificate DER')
  }
  const cert = parseDer(certDer)
  if (!cert.children || cert.children.length === 0) {
    throw new Error(`extractCertFields: cert has no children, tag=0x${cert.tag.toString(16)}, len=${cert.length}`)
  }
  const tbs = cert.children[0]
  if (!tbs.children || tbs.children.length === 0) {
    throw new Error(`extractCertFields: tbsCert has no children, tag=0x${tbs.tag.toString(16)}, len=${tbs.length}`)
  }
  const tbsKids = tbs.children

  // If first child is context [0] (tag 0xa0), skip it (version)
  let idx = 0
  if (tbsKids[0].tag === 0xa0) {
    idx = 1
  }

  if (tbsKids.length < idx + 3) {
    throw new Error(`extractCertFields: not enough tbsCert children (${tbsKids.length}), idx=${idx}, tags=[${tbsKids.map(c => '0x' + c.tag.toString(16)).join(',')}]`)
  }

  const serialNode = tbsKids[idx]       // INTEGER serialNumber
  const _sigAlg    = tbsKids[idx + 1]   // SEQUENCE signatureAlgorithm
  const issuerNode = tbsKids[idx + 2]   // SEQUENCE issuer Name

  return {
    issuerDer: Buffer.from(issuerNode.raw),
    serialDer: Buffer.from(serialNode.value),  // raw integer bytes
  }
}

/**
 * Convert a buffer to PEM format.
 */
function toPem(buf: Buffer, type: string = 'CERTIFICATE'): string {
  const str = buf.toString('utf-8')
  if (str.includes('-----BEGIN')) return str
  const b64 = buf.toString('base64')
  const lines = b64.match(/.{1,64}/g) || []
  return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----\n`
}

/**
 * Convert PEM to DER.
 * Handles PEM files that have "Bag Attributes" or other metadata
 * before the -----BEGIN line (common with PKCS#12 exports).
 * IMPORTANT: Extracts only the FIRST PEM block. PKCS#12 exports
 * often contain multiple certificates -- we must not concatenate them.
 */
function pemToDer(pem: string): Buffer {
  // Find the first -----BEGIN marker
  const beginMatch = pem.match(/-----BEGIN [^-]+-----/)
  if (!beginMatch) {
    throw new Error('pemToDer: no -----BEGIN marker found')
  }
  const beginIdx = pem.indexOf(beginMatch[0])
  const afterHeader = beginIdx + beginMatch[0].length

  // Find the corresponding -----END marker
  const endMarker = beginMatch[0].replace('BEGIN', 'END')
  const endIdx = pem.indexOf(endMarker, afterHeader)
  if (endIdx === -1) {
    throw new Error('pemToDer: no matching -----END marker found')
  }

  // Extract ONLY the base64 between the first BEGIN and its END
  const b64 = pem.substring(afterHeader, endIdx).replace(/\s/g, '')
  return Buffer.from(b64, 'base64')
}

/**
 * Load a certificate from an env var value.
 * Handles three formats:
 * 1. Raw PEM text (starts with -----BEGIN)
 * 2. Base64-encoded PEM text
 * 3. Base64-encoded DER bytes
 */
function loadCertFromEnv(envValue: string): Buffer {
  const trimmed = envValue.trim()
  let der: Buffer

  // Case 1: Raw PEM text pasted directly into env var (may have Bag Attributes prefix)
  if (trimmed.includes('-----BEGIN')) {
    der = pemToDer(trimmed)
  } else {
    // Case 2 or 3: Base64-encoded data
    const decoded = Buffer.from(trimmed, 'base64')
    const decodedStr = decoded.toString('utf-8')

    if (decodedStr.includes('-----BEGIN')) {
      // Case 2: It was base64-encoded PEM text (possibly with Bag Attributes)
      der = pemToDer(decodedStr)
    } else {
      // Case 3: It was base64-encoded DER bytes
      der = decoded
    }
  }

  // Validate DER -- must start with SEQUENCE (0x30)
  if (!der || der.length === 0 || der[0] !== 0x30) {
    throw new Error(`[v5] loadCertFromEnv: invalid DER. first byte=0x${der?.[0]?.toString(16) ?? 'undef'}, len=${der?.length ?? 0}, envStarts=${trimmed.substring(0, 30)}`)
  }

  return der
}

/**
 * Load a private key from an env var value and return PEM.
 * Handles raw PEM, base64-encoded PEM, and base64-encoded DER.
 */
function loadKeyFromEnv(envValue: string, passphrase: string): string {
  const trimmed = envValue.trim()

  // Case 1: Raw PEM text (may have Bag Attributes prefix)
  if (trimmed.includes('-----BEGIN')) {
    // Strip everything before the first -----BEGIN marker
    const idx = trimmed.indexOf('-----BEGIN')
    return trimmed.substring(idx)
  }

  // Case 2 or 3: Base64-encoded data
  const decoded = Buffer.from(trimmed, 'base64')
  const decodedStr = decoded.toString('utf-8')

  if (decodedStr.includes('-----BEGIN')) {
    // Case 2: Base64-encoded PEM text (possibly with Bag Attributes)
    const idx = decodedStr.indexOf('-----BEGIN')
    return decodedStr.substring(idx)
  }

  // Case 3: Base64-encoded DER bytes -- wrap as PEM
  const b64 = decoded.toString('base64')
  const lines = b64.match(/.{1,64}/g) || []

  // Try PKCS#8 first, then encrypted, then PKCS#1
  for (const type of ['PRIVATE KEY', 'ENCRYPTED PRIVATE KEY', 'RSA PRIVATE KEY']) {
    const pem = `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----\n`
    try {
      createPrivateKey({ key: pem, passphrase: passphrase || undefined, format: 'pem' })
      return pem
    } catch {
      continue
    }
  }

  // Last resort -- return RSA PRIVATE KEY and let it fail with a clear error
  return `-----BEGIN RSA PRIVATE KEY-----\n${lines.join('\n')}\n-----END RSA PRIVATE KEY-----\n`
}

/* ------------------------------------------------------------------ */
/*  PKCS#7 detached signature builder                                 */
/* ------------------------------------------------------------------ */

function buildPkcs7Detached(
  content: Buffer,
  signerCertDer: Buffer,
  signerKeyPem: string,
  wwdrCertDer: Buffer,
  passphrase: string
): Buffer {
  // Extract issuer and serial from signer cert
  const { issuerDer, serialDer } = extractCertFields(signerCertDer)

  // Compute SHA-256 digest of the content (manifest.json)
  const contentDigest = createHash('sha256').update(content).digest()

  // Build authenticated attributes (sorted by OID as required by DER SET)
  const now = new Date()

  const attrContentType = SEQUENCE(
    derOid(OID_CONTENT_TYPE),
    SET(derOid(OID_DATA))
  )

  const attrSigningTime = SEQUENCE(
    derOid(OID_SIGNING_TIME),
    SET(derUtcTime(now))
  )

  const attrMessageDigest = SEQUENCE(
    derOid(OID_MESSAGE_DIGEST),
    SET(OCTET_STRING(contentDigest))
  )

  // Authenticated attributes as a SET (tag 0x31) for inclusion in SignerInfo
  // but signed as CONTEXT [0] (tag 0xa0) -- Apple expects them in this order
  const authAttrsContent = Buffer.concat([attrContentType, attrSigningTime, attrMessageDigest])

  // For signing, we encode as SET (0x31)
  const authAttrsForSigning = derWrap(0x31, authAttrsContent)

  // For embedding in SignerInfo, we encode as CONTEXT [0] (0xa0)
  const authAttrsForEmbed = derWrap(0xa0, authAttrsContent)

  // Sign the SET-encoded authenticated attributes
  const key = createPrivateKey({
    key: signerKeyPem,
    passphrase: passphrase || undefined,
    format: 'pem',
  })

  const signer = createSign('SHA256')
  signer.update(authAttrsForSigning)
  const signature = signer.sign(key)

  // Build SignerInfo
  const signerInfo = SEQUENCE(
    INTEGER_RAW(Buffer.from([1])),                    // version 1
    SEQUENCE(issuerDer, INTEGER_RAW(serialDer)),       // issuerAndSerialNumber
    SEQUENCE(derOid(OID_SHA256), DER_NULL),            // digestAlgorithm (SHA-256)
    authAttrsForEmbed,                                 // authenticatedAttributes [0]
    SEQUENCE(derOid(OID_RSA_ENCRYPTION), DER_NULL),    // digestEncryptionAlgorithm
    OCTET_STRING(signature)                            // encryptedDigest
  )

  // Build SignedData
  const signedData = SEQUENCE(
    INTEGER_RAW(Buffer.from([1])),                     // version 1
    SET(SEQUENCE(derOid(OID_SHA256), DER_NULL)),        // digestAlgorithms
    SEQUENCE(derOid(OID_DATA)),                        // contentInfo (detached = no content)
    CONTEXT(0, signerCertDer, wwdrCertDer),            // certificates [0] IMPLICIT
    SET(signerInfo)                                     // signerInfos
  )

  // Wrap in ContentInfo
  return SEQUENCE(
    derOid(OID_SIGNED_DATA),
    CONTEXT(0, signedData)
  )
}

/* ------------------------------------------------------------------ */
/*  Pass generation                                                   */
/* ------------------------------------------------------------------ */

export async function generateApplePass(input: ApplePassInput): Promise<Buffer> {
  const passphrase = (process.env.APPLE_CERT_PASSWORD || '').trim()

  // Load certs and key from env vars (handles raw PEM, base64 PEM, base64 DER)
  const signerCertDer = loadCertFromEnv(process.env.APPLE_SIGNER_CERT_B64!)
  const wwdrCertDer   = loadCertFromEnv(process.env.APPLE_WWDR_B64!)
  const signerKeyPem  = loadKeyFromEnv(process.env.APPLE_SIGNER_KEY_B64!, passphrase)

  const {
    customerId,
    businessName,
    stampCount,
    rewardStampsNeeded,
    rewardDescription,
    cafeAddress,
    latitude,
    longitude,
  } = input

  const stampsRemaining = Math.max(0, rewardStampsNeeded - stampCount)
  const progressLabel = `${stampCount} / ${rewardStampsNeeded}`

  // Use timestamp in serial to defeat iOS caching of previous failed attempts
  const serial = `${customerId}-${Date.now()}`

  // Build pass.json
  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID!.trim(),
    teamIdentifier: process.env.APPLE_TEAM_ID!.trim(),
    serialNumber: serial,
    description: `${businessName} Loyalty Card`,
    organizationName: businessName,
    logoText: businessName,
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: hexToRgb(input.brandColor),
    labelColor: 'rgb(255, 255, 255)',
    storeCard: {
      primaryFields: [
        {
          key: 'stamps',
          label: 'STAMPS',
          value: progressLabel,
          textAlignment: 'PKTextAlignmentCenter',
        },
      ],
      secondaryFields: [
        {
          key: 'reward',
          label: 'REWARD',
          value: rewardDescription,
        },
        {
          key: 'remaining',
          label: 'TO GO',
          value: stampsRemaining > 0 ? `${stampsRemaining} more` : 'Ready to redeem!',
        },
      ],
      backFields: [
        {
          key: 'programme',
          label: 'About this card',
          value: `Collect ${rewardStampsNeeded} stamps at ${businessName} to earn: ${rewardDescription}`,
        },
        ...(cafeAddress
          ? [{ key: 'address', label: 'Location', value: cafeAddress }]
          : []),
      ],
    },
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: customerId,
        messageEncoding: 'iso-8859-1',
        altText: 'Show to staff',
      },
    ],
    ...(latitude && longitude
      ? {
          locations: [
            {
              latitude,
              longitude,
              relevantText: `${businessName} is nearby - tap for your stamp card`,
            },
          ],
        }
      : {}),
  }

  // Step 1: Collect all pass files
  const passFiles: Record<string, Buffer> = {
    'pass.json': Buffer.from(JSON.stringify(passJson)),
  }
  for (const [name, b64] of Object.entries(PASS_ASSETS)) {
    passFiles[name] = Buffer.from(b64, 'base64')
  }

  // Step 2: Build manifest.json (SHA1 of each file)
  const manifest: Record<string, string> = {}
  for (const [name, data] of Object.entries(passFiles)) {
    manifest[name] = createHash('sha1').update(data).digest('hex')
  }
  const manifestBuffer = Buffer.from(JSON.stringify(manifest))

  // Step 3: Sign manifest with PKCS#7 detached signature
  const signatureDer = buildPkcs7Detached(
    manifestBuffer,
    signerCertDer,
    signerKeyPem,
    wwdrCertDer,
    passphrase
  )

  // Step 4: Build the .pkpass zip
  const zipBuffer = buildZip({
    ...passFiles,
    'manifest.json': manifestBuffer,
    'signature': signatureDer,
  })

  return zipBuffer
}

/* ------------------------------------------------------------------ */
/*  Minimal ZIP builder (STORE method, no compression)                */
/* ------------------------------------------------------------------ */

function buildZip(files: Record<string, Buffer>): Buffer {
  const entries: { name: Buffer; data: Buffer; offset: number }[] = []
  const parts: Buffer[] = []
  let offset = 0

  for (const [name, data] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, 'utf-8')
    const crc = crc32(data)

    const header = Buffer.alloc(30 + nameBytes.length)
    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(0, 6)
    header.writeUInt16LE(0, 8)
    header.writeUInt16LE(0, 10)
    header.writeUInt16LE(0, 12)
    header.writeUInt32LE(crc, 14)
    header.writeUInt32LE(data.length, 18)
    header.writeUInt32LE(data.length, 22)
    header.writeUInt16LE(nameBytes.length, 26)
    header.writeUInt16LE(0, 28)
    nameBytes.copy(header, 30)

    entries.push({ name: nameBytes, data, offset })
    parts.push(header, data)
    offset += header.length + data.length
  }

  const centralStart = offset
  for (const entry of entries) {
    const crc = crc32(entry.data)
    const cd = Buffer.alloc(46 + entry.name.length)
    cd.writeUInt32LE(0x02014b50, 0)
    cd.writeUInt16LE(20, 4)
    cd.writeUInt16LE(20, 6)
    cd.writeUInt16LE(0, 8)
    cd.writeUInt16LE(0, 10)
    cd.writeUInt16LE(0, 12)
    cd.writeUInt16LE(0, 14)
    cd.writeUInt32LE(crc, 16)
    cd.writeUInt32LE(entry.data.length, 20)
    cd.writeUInt32LE(entry.data.length, 24)
    cd.writeUInt16LE(entry.name.length, 28)
    cd.writeUInt16LE(0, 30)
    cd.writeUInt16LE(0, 32)
    cd.writeUInt16LE(0, 34)
    cd.writeUInt16LE(0, 36)
    cd.writeUInt32LE(0, 38)
    cd.writeUInt32LE(entry.offset, 42)
    entry.name.copy(cd, 46)

    parts.push(cd)
    offset += cd.length
  }
  const centralSize = offset - centralStart

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralSize, 12)
  eocd.writeUInt32LE(centralStart, 16)
  eocd.writeUInt16LE(0, 20)
  parts.push(eocd)

  return Buffer.concat(parts)
}

function crc32(data: Buffer): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}
