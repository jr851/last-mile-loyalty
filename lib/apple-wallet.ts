/**
 * Apple Wallet pass generation for Last Mile Loyalty.
 *
 * Uses Node.js built-in crypto for PKCS#7 signing (pure JavaScript, no external CLI).
 * No openssl CLI dependency required.
 *
 * Env vars required:
 *  APPLE_SIGNER_CERT_B64  - DER signing cert, base64-encoded
 *  APPLE_SIGNER_KEY_B64   - PEM private key, base64-encoded
 *  APPLE_WWDR_B64         - Apple WWDR G4 cert (DER), base64-encoded
 *  APPLE_PASS_TYPE_ID     - e.g. pass.com.lastmileloyalty.card
 *  APPLE_TEAM_ID          - e.g. JN748A5TNV
 *  APPLE_CERT_PASSWORD    - private key passphrase (optional)
 */

import { createHash, createSign, createPrivateKey } from 'crypto'
import { randomUUID } from 'crypto'

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

/**
 * Convert a certificate buffer to PEM format.
 * Handles both PEM input (pass-through) and DER input (convert to PEM).
 */
function toPem(buf: Buffer, type: string = 'CERTIFICATE'): string {
  const str = buf.toString('utf-8')
  if (str.includes('-----BEGIN')) return str
  // It's DER -- convert to PEM
  const b64 = buf.toString('base64')
  const lines = b64.match(/.{1,64}/g) || []
  return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----\n`
}

/**
 * Sign manifest data using node-forge for proper PKCS#7 SignedData.
 * Properly handles both encrypted and unencrypted private keys.
 */
function signWithNodeCrypto(
  manifestData: Buffer,
  certPem: string,
  keyPem: string,
  wwdrPem: string,
  passphrase: string
): Buffer {
  const forge = require('node-forge')
  
  // Parse certificates
  const signerCert = forge.pki.certificateFromPem(certPem)
  const wwdrCert = forge.pki.certificateFromPem(wwdrPem)
  
  // Parse private key - handle both encrypted and unencrypted keys
  let privateKey
  try {
    // First try to parse as unencrypted key
    privateKey = forge.pki.privateKeyFromPem(keyPem)
  } catch (e) {
    // If that fails, try decrypting with passphrase
    try {
      privateKey = forge.pki.decryptRsaPrivateKey(keyPem, passphrase || undefined)
    } catch (e2) {
      throw new Error(`Failed to parse private key: ${e2}`)
    }
  }
  
  // Create PKCS#7 SignedData for detached signature
  const p7 = forge.pkcs7.createSignedData()
  p7.content = forge.util.createBuffer('', 'raw')
  
  // Add certificates to signature
  p7.addCertificate(signerCert)
  p7.addCertificate(wwdrCert)
  
  // Add signer with manifest data
  p7.addSigner({
    key: privateKey,
    certificate: signerCert,
    digestAlgorithm: forge.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.oids.contentType,
        value: forge.oids.data,
      },
      {
        type: forge.oids.messageDigest,
        value: forge.md.sha256.create().update(manifestData.toString('binary')).digest().getBytes(),
      },
      {
        type: forge.oids.signingTime,
        value: new Date(),
      },
    ],
  })
  
  // Create detached signature
  p7.sign({ detached: true })
  
  // Get ASN.1 and convert to DER
  const asn1 = p7.toAsn1()
  const der = forge.asn1.toDer(asn1).getBytes()
  
  return Buffer.from(der, 'binary')
}

export async function generateApplePass(input: ApplePassInput): Promise<Buffer> {
  const signerCertBuf = Buffer.from(process.env.APPLE_SIGNER_CERT_B64!.trim(), 'base64')
  const signerKeyBuf  = Buffer.from(process.env.APPLE_SIGNER_KEY_B64!.trim(), 'base64')
  const wwdrBuf       = Buffer.from(process.env.APPLE_WWDR_B64!.trim(), 'base64')

  const signerCertPem = toPem(signerCertBuf, 'CERTIFICATE')
  const signerKeyPem  = toPem(signerKeyBuf, 'RSA PRIVATE KEY')
  const wwdrPem       = toPem(wwdrBuf, 'CERTIFICATE')

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

  // Build pass.json
  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID!.trim(),
    teamIdentifier: process.env.APPLE_TEAM_ID!.trim(),
    serialNumber: `${customerId}-v3`,
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

  // Step 3: Sign manifest.json using Node.js crypto (no openssl CLI needed)
  const passphrase = (process.env.APPLE_CERT_PASSWORD || '').trim()
  const signatureDer = signWithNodeCrypto(
    manifestBuffer,
    signerCertPem,
    signerKeyPem,
    wwdrPem,
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

/**
 * Minimal ZIP builder (STORE method, no compression).
 */
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
