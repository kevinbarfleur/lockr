import path from 'node:path'
import fs from 'node:fs/promises'
import chalk from 'chalk'

import { decryptBuffer, secureDelete } from '../core/crypto.js'
import { extractArchive } from '../core/archive.js'
import { readVaultHeader, readVaultPayload } from '../core/vault.js'
import { unhideFolder } from '../core/hide.js'
import {
  promptPassword,
  promptPasswordWithRetry,
  verifyPassword,
} from '../utils/password.js'
import { createSpinner, formatSize, success, error } from '../utils/ui.js'
import { findEntry, removeEntry } from '../utils/config.js'
import { VAULT_EXTENSION } from '../types.js'
import type { RegistryEntry } from '../types.js'

export interface UnlockOptions {
  output?: string
  verbose: boolean
}

export async function unlockCommand(
  inputPath: string,
  options: UnlockOptions,
): Promise<{ password: string; entry: RegistryEntry } | void> {
  const resolved = path.resolve(inputPath || process.cwd())

  // Find entry in registry
  let entry = await findEntry(resolved)

  // If not found by exact path, try with .vault extension
  if (!entry && !resolved.endsWith(VAULT_EXTENSION)) {
    entry = await findEntry(resolved + VAULT_EXTENSION)
  }

  // If still not found, check if it's a vault file directly
  if (!entry && resolved.endsWith(VAULT_EXTENSION)) {
    const vaultExists = await fs.stat(resolved).catch(() => null)
    if (vaultExists) {
      return await unlockVaultDirect(resolved, options)
    }
  }

  if (!entry) {
    error(`No locked folder found for: ${resolved}`)
    error('Use "lockr list" to see all locked folders.')
    process.exit(1)
  }

  if (entry.mode === 'hide') {
    return await unlockHide(entry)
  } else {
    return await unlockEncrypt(entry, options)
  }
}

async function unlockHide(
  entry: RegistryEntry,
): Promise<{ password: string; entry: RegistryEntry }> {
  console.log(chalk.bold(`Unlock: ${entry.originalName}`) + ` [hide mode]`)
  console.log(`  Files: ${entry.fileCount}, Size: ${formatSize(entry.totalSize)}`)

  // Verify password
  const password = await promptPasswordWithRetry(async (pw) => {
    return verifyPassword(pw, entry.passwordHash!, entry.passwordSalt!)
  })

  // Verify hidden folder still exists
  const hiddenExists = await fs.stat(entry.hiddenPath!).catch(() => null)
  if (!hiddenExists) {
    error(`Hidden folder not found: ${entry.hiddenPath}`)
    error('The folder may have been moved or deleted.')
    process.exit(1)
  }

  // Unhide
  await unhideFolder(entry.hiddenPath!, entry.originalPath)

  // Remove from registry
  await removeEntry(entry.originalPath)

  success(`Unlocked: ${entry.originalName}`)
  console.log(`  Files: ${entry.fileCount} restored`)

  return { password, entry }
}

async function unlockEncrypt(
  entry: RegistryEntry,
  options: UnlockOptions,
): Promise<{ password: string; entry: RegistryEntry }> {
  const vaultPath = entry.vaultPath!

  const header = await readVaultHeader(vaultPath).catch(() => null)
  if (!header) {
    error(`Invalid or corrupted vault file: ${vaultPath}`)
    process.exit(1)
  }

  console.log(chalk.bold(`Unlock: ${entry.originalName}`) + ` [encrypt mode]`)
  console.log(`  Files: ${entry.fileCount}, Size: ${formatSize(entry.totalSize)}`)

  // Read payload
  const { payload } = await readVaultPayload(vaultPath)
  let decrypted: Buffer | null = null
  let savedPassword = ''

  // Password with retry
  const password = await promptPasswordWithRetry(async (pw) => {
    try {
      decrypted = await decryptBuffer(
        payload,
        pw,
        header.salt,
        header.iv,
        header.authTag,
      )
      savedPassword = pw
      return true
    } catch {
      return false
    }
  })

  if (!decrypted) {
    error('Failed to decrypt vault.')
    process.exit(1)
  }

  // Extract
  const spinner = createSpinner('Extracting files...')
  spinner.start()

  const outputDir = options.output
    ? path.resolve(options.output)
    : path.dirname(vaultPath)

  await extractArchive(decrypted, outputDir)

  // Delete vault
  spinner.text = 'Cleaning up...'
  try {
    await secureDelete(vaultPath)
  } catch {
    await fs.unlink(vaultPath).catch(() => {})
  }

  // Update registry
  await removeEntry(entry.originalPath)

  spinner.stop()
  success(`Unlocked: ${entry.originalName}`)
  console.log(`  Files: ${entry.fileCount} restored`)

  return { password: savedPassword, entry }
}

async function unlockVaultDirect(
  vaultPath: string,
  options: UnlockOptions,
): Promise<void> {
  const header = await readVaultHeader(vaultPath).catch(() => null)
  if (!header) {
    error(`Invalid or corrupted vault file: ${vaultPath}`)
    process.exit(1)
  }

  console.log(chalk.bold(`Unlock: ${header.metadata.originalName}`) + ` [encrypt mode]`)
  console.log(`  Files: ${header.metadata.fileCount}, Size: ${formatSize(header.metadata.totalSize)}`)

  const { payload } = await readVaultPayload(vaultPath)
  let decrypted: Buffer | null = null

  await promptPasswordWithRetry(async (pw) => {
    try {
      decrypted = await decryptBuffer(
        payload,
        pw,
        header.salt,
        header.iv,
        header.authTag,
      )
      return true
    } catch {
      return false
    }
  })

  if (!decrypted) {
    error('Failed to decrypt vault.')
    process.exit(1)
  }

  const spinner = createSpinner('Extracting files...')
  spinner.start()

  const outputDir = options.output
    ? path.resolve(options.output)
    : path.dirname(vaultPath)

  await extractArchive(decrypted, outputDir)

  try {
    await secureDelete(vaultPath)
  } catch {
    await fs.unlink(vaultPath).catch(() => {})
  }

  spinner.stop()
  success(`Unlocked: ${header.metadata.originalName}`)
  console.log(`  Files: ${header.metadata.fileCount} restored`)
}
