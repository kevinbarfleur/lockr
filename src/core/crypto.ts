import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { ALGORITHM, SCRYPT_N, SCRYPT_R, SCRYPT_P, SCRYPT_KEY_LENGTH } from '../types.js'

export function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_N * SCRYPT_R * 256 },
      (err, key) => (err ? reject(err) : resolve(key)),
    )
  })
}

export async function encryptBuffer(
  data: Buffer,
  password: string,
): Promise<{ encrypted: Buffer; salt: Buffer; iv: Buffer; authTag: Buffer }> {
  const salt = crypto.randomBytes(32)
  const iv = crypto.randomBytes(16)
  const key = await deriveKey(password, salt)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  const authTag = cipher.getAuthTag()

  return { encrypted, salt, iv, authTag }
}

export async function decryptBuffer(
  encrypted: Buffer,
  password: string,
  salt: Buffer,
  iv: Buffer,
  authTag: Buffer,
): Promise<Buffer> {
  const key = await deriveKey(password, salt)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  try {
    return Buffer.concat([decipher.update(encrypted), decipher.final()])
  } catch {
    throw new Error('Decryption failed: wrong password or corrupted vault')
  }
}

export function createEncryptStream(
  password: string,
  salt: Buffer,
  iv: Buffer,
  key: Buffer,
): { cipher: crypto.CipherGCM } {
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM
  return { cipher }
}

export function createDecryptStream(
  key: Buffer,
  iv: Buffer,
  authTag: Buffer,
): crypto.DecipherGCM {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM
  decipher.setAuthTag(authTag)
  return decipher
}

export async function secureDelete(filePath: string): Promise<void> {
  const stat = await fs.stat(filePath)
  if (stat.isDirectory()) return

  const fd = await fs.open(filePath, 'r+')
  try {
    // Pass 1: random bytes
    const randomBuf = crypto.randomBytes(stat.size)
    await fd.write(randomBuf, 0, randomBuf.length, 0)
    await fd.sync()

    // Pass 2: zeros
    const zeroBuf = Buffer.alloc(stat.size, 0)
    await fd.write(zeroBuf, 0, zeroBuf.length, 0)
    await fd.sync()
  } finally {
    await fd.close()
  }

  await fs.unlink(filePath)
}

export async function secureDeleteFolder(
  folderPath: string,
  files: string[],
): Promise<void> {
  const path = await import('node:path')
  // Delete files deepest-first
  const sorted = files.sort(
    (a, b) => b.split(path.sep).length - a.split(path.sep).length,
  )
  for (const file of sorted) {
    try {
      await secureDelete(path.join(folderPath, file))
    } catch {
      // Best effort
    }
  }
  await fs.rm(folderPath, { recursive: true, force: true })
}
