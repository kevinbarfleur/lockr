import { password as passwordPrompt } from '@inquirer/prompts'
import crypto from 'node:crypto'
import chalk from 'chalk'
import { SCRYPT_N, SCRYPT_R, SCRYPT_P, SCRYPT_KEY_LENGTH } from '../types.js'

export async function promptPassword(message = 'Enter password'): Promise<string> {
  return passwordPrompt({ message, mask: '*' })
}

export async function promptPasswordWithConfirm(): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const pw = await promptPassword('Enter password')
    const confirm = await promptPassword('Confirm password')

    if (pw === confirm) return pw
    console.error(chalk.red('Passwords do not match. Try again.'))
  }

  throw new Error('Password confirmation failed after 3 attempts')
}

export async function promptPasswordWithRetry(
  verify: (password: string) => Promise<boolean>,
  maxAttempts = 3,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pw = await promptPassword()
    if (await verify(pw)) return pw

    const remaining = maxAttempts - attempt - 1
    if (remaining > 0) {
      console.error(chalk.red(`Wrong password. ${remaining} attempt(s) remaining.`))
    }
  }

  throw new Error('Too many failed password attempts')
}

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

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(32)
  const key = await deriveKey(password, salt)
  return { hash: key.toString('hex'), salt: salt.toString('hex') }
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
): Promise<boolean> {
  const salt = Buffer.from(storedSalt, 'hex')
  const key = await deriveKey(password, salt)
  return key.toString('hex') === storedHash
}
