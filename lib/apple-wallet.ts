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
 * Sign manifest data using Node.js built-in crypto + asn1js for proper PKCS#7.
 * Uses established libraries to avoid manual ASN.1 encoding errors.
 */
function signWithNodeCrypto(
  manifestData: Buffer,
  certPem: string,
  keyPem: string,
  wwdrPem: string,
  passphrase: string
): Buffer {
  const asn1js = require('asn1js')
  const pkijs = require('pkijs')

  // Configure PKI.js
  pkijs.setEngine('nodeEngine')

  // Parse private key
  const keyObject = createPrivateKey({
    key: keyPem,
    passphrase: passphrase || undefined,
    format: 'pem',
  })

  // Helper: PEM to DER
  function pemToDer(pem: string): Buffer {
    const lines = pem
      .split('\n')
      .filter(line => !line.includes('-----'))
      .join('')
    return Buffer.from(lines, 'base64')
  }

  const signerCertDer = pemToDer(certPem)
  const wwdrCertDer = pemToDer(wwdrPem)

  // Parse signer certificate using asn1js
  const signerCertAsn1 = asn1js.fromBER(signerCertDer.buffer.slice(
    signerCertDer.byteOffset,
    signerCertDer.byteOffset + signerCertDer.byteLength
  ))
  const signerCert = new pkijs.Certificate({ schema: signerCertAsn1.result })

  // Create the signature using Node crypto
  const sign = createSign('sha256')
  sign.update(manifestData)
  const signature = sign.sign(keyObject)

  // Build PKCS#7 SignedData structure
  // Version: 1
  const version = new asn1js.Integer({ value: 1 })

  // DigestAlgorithmIdentifier: SHA-256
  const digestAlgorithm = new pkijs.AlgorithmIdentifier({
    algorithmId: '2.16.840.1.101.3.4.2.1', // id-sha256
  })

  // Manifest hash
  const manifestHash = createHash('sha256').update(manifestData).digest()

  // ContentInfo: data (detached signature, so no content)
  const contentInfo = new asn1js.Sequence({
    value: [
      new asn1js.ObjectIdentifier({ value: '1.2.840.113549.1.7.1' }), // id-data
      // No content for detached signature
    ],
  })

  // Certificates
  const certificates = new asn1js.Constructed({
    idBlock: {
      tagClass: 3, // CONTEXT
      tagNumber: 0,
    },
    value: [
      signerCertAsn1.result,
      asn1js.fromBER(wwdrCertDer.buffer.slice(
        wwdrCertDer.byteOffset,
        wwdrCertDer.byteOffset + wwdrCertDer.byteLength
      )).result,
    ],
  })

  // SignerInfo
  // Extract issuer and serial from signer cert
  const issuerAndSerial = new asn1js.Sequence({
    value: [
      signerCert.issuer,
      signerCert.serialNumber,
    ],
  })

  // Attributes [0] IMPLICIT (messageDigest)
  const messageDigestAttr = new asn1js.Sequence({
    value: [
      new asn1js.ObjectIdentifier({ value: '1.2.840.113549.1.9.4' }), // messageDigest
      new asn1js.Set({
        value: [
          new asn1js.OctetString({ valueHex: manifestHash }),
        ],
      }),
    ],
  })

  const signatureAlgorithm = new pkijs.AlgorithmIdentifier({
    algorithmId: '1.2.840.113549.1.1.11', // sha256WithRSAEncryption
  })

  const signerInfo = new asn1js.Sequence({
    value: [
      new asn1js.Integer({ value: 1 }), // version
      issuerAndSerial,
      digestAlgorithm,
      new asn1js.Constructed({
        idBlock: {
          tagClass: 3, // CONTEXT
          tagNumber: 0,
          isConstructed: true,
        },
        value: [messageDigestAttr],
      }),
      signatureAlgorithm,
      new asn1js.OctetString({ valueHex: signature }),
    ],
  })

  // SignerInfos
  const signerInfos = new asn1js.Set({
    value: [signerInfo],
  })

  // SignedData
  const signedData = new asn1js.Sequence({
    value: [
      version,
      new asn1js.Set({
        value: [digestAlgorithm],
      }),
      contentInfo,
      certificates,
      signerInfos,
    ],
  })

  // ContentInfo wrapper
  const contentInfoWrapper = new asn1js.Sequence({
    value: [
      new asn1js.ObjectIdentifier({ value: '1.2.840.113549.1.7.2' }), // id-signedData
      new asn1js.Constructed({
        idBlock: {
          tagClass: 3, // CONTEXT
          tagNumber: 0,
          isConstructed: true,
        },
        value: [signedData],
      }),
    ],
  })

  return Buffer.from(contentInfoWrapper.toSchema(true).toBER(false))
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
