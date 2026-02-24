import fs from 'node:fs/promises'
import {
  VAULT_MAGIC,
  VAULT_VERSION,
  HEADER_FIXED_SIZE,
  HEADER_MAGIC_SIZE,
  HEADER_VERSION_SIZE,
  HEADER_SALT_SIZE,
  HEADER_IV_SIZE,
  HEADER_TAG_SIZE,
  HEADER_ORIGINAL_SIZE_SIZE,
  HEADER_TIMESTAMP_SIZE,
  HEADER_METADATA_LENGTH_SIZE,
  type VaultMetadata,
  type VaultHeader,
} from '../types.js'

export async function writeVault(
  vaultPath: string,
  encrypted: Buffer,
  salt: Buffer,
  iv: Buffer,
  authTag: Buffer,
  metadata: VaultMetadata,
  originalSize: bigint,
): Promise<void> {
  const metadataJson = Buffer.from(JSON.stringify(metadata), 'utf-8')
  const headerSize = HEADER_FIXED_SIZE + metadataJson.length
  const header = Buffer.alloc(headerSize)

  let offset = 0

  VAULT_MAGIC.copy(header, offset)
  offset += HEADER_MAGIC_SIZE

  header.writeUInt8(VAULT_VERSION, offset)
  offset += HEADER_VERSION_SIZE

  salt.copy(header, offset)
  offset += HEADER_SALT_SIZE

  iv.copy(header, offset)
  offset += HEADER_IV_SIZE

  authTag.copy(header, offset)
  offset += HEADER_TAG_SIZE

  header.writeBigUInt64BE(originalSize, offset)
  offset += HEADER_ORIGINAL_SIZE_SIZE

  header.writeBigUInt64BE(BigInt(Date.now()), offset)
  offset += HEADER_TIMESTAMP_SIZE

  header.writeUInt16BE(metadataJson.length, offset)
  offset += HEADER_METADATA_LENGTH_SIZE

  metadataJson.copy(header, offset)

  await fs.writeFile(vaultPath, Buffer.concat([header, encrypted]))
}

export async function readVaultHeader(
  vaultPath: string,
): Promise<VaultHeader> {
  const fd = await fs.open(vaultPath, 'r')
  try {
    const fixedBuf = Buffer.alloc(HEADER_FIXED_SIZE)
    await fd.read(fixedBuf, 0, HEADER_FIXED_SIZE, 0)

    let offset = 0

    const magic = fixedBuf.subarray(offset, offset + HEADER_MAGIC_SIZE)
    offset += HEADER_MAGIC_SIZE

    if (!magic.equals(VAULT_MAGIC)) {
      throw new Error('Not a valid vault file')
    }

    const version = fixedBuf.readUInt8(offset)
    offset += HEADER_VERSION_SIZE

    const salt = Buffer.from(fixedBuf.subarray(offset, offset + HEADER_SALT_SIZE))
    offset += HEADER_SALT_SIZE

    const iv = Buffer.from(fixedBuf.subarray(offset, offset + HEADER_IV_SIZE))
    offset += HEADER_IV_SIZE

    const authTag = Buffer.from(fixedBuf.subarray(offset, offset + HEADER_TAG_SIZE))
    offset += HEADER_TAG_SIZE

    const originalSize = fixedBuf.readBigUInt64BE(offset)
    offset += HEADER_ORIGINAL_SIZE_SIZE

    const timestamp = fixedBuf.readBigUInt64BE(offset)
    offset += HEADER_TIMESTAMP_SIZE

    const metadataLength = fixedBuf.readUInt16BE(offset)
    offset += HEADER_METADATA_LENGTH_SIZE

    const metaBuf = Buffer.alloc(metadataLength)
    await fd.read(metaBuf, 0, metadataLength, HEADER_FIXED_SIZE)

    const metadata: VaultMetadata = JSON.parse(metaBuf.toString('utf-8'))

    return {
      magic,
      version,
      salt,
      iv,
      authTag,
      originalSize,
      timestamp,
      metadata,
      metadataLength,
    }
  } finally {
    await fd.close()
  }
}

export async function readVaultPayload(
  vaultPath: string,
): Promise<{ header: VaultHeader; payload: Buffer }> {
  const header = await readVaultHeader(vaultPath)
  const payloadOffset = HEADER_FIXED_SIZE + header.metadataLength
  const fileData = await fs.readFile(vaultPath)
  const payload = fileData.subarray(payloadOffset)
  return { header, payload }
}
