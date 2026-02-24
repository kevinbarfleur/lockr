import path from 'node:path'
import fs from 'node:fs/promises'
import { confirm } from '@inquirer/prompts'
import chalk from 'chalk'

import { getFolderStats } from '../core/archive.js'
import { compressFolder } from '../core/archive.js'
import { encryptBuffer, secureDeleteFolder } from '../core/crypto.js'
import { writeVault } from '../core/vault.js'
import { hideFolder, generateHiddenName } from '../core/hide.js'
import {
  promptPasswordWithConfirm,
  hashPassword,
} from '../utils/password.js'
import { createSpinner, formatSize, success, error, warn } from '../utils/ui.js'
import { addEntry } from '../utils/config.js'
import { VAULT_EXTENSION } from '../types.js'
import type { VaultMetadata } from '../types.js'

export interface LockOptions {
  encrypt: boolean
  confirm: boolean
  secureDelete: boolean
  verbose: boolean
}

export async function lockCommand(
  inputPath: string,
  options: LockOptions,
): Promise<void> {
  const folderPath = path.resolve(inputPath || process.cwd())
  const stat = await fs.stat(folderPath).catch(() => null)

  if (!stat?.isDirectory()) {
    error(`Not a directory: ${folderPath}`)
    process.exit(1)
  }

  const folderName = path.basename(folderPath)

  // Get stats
  const stats = await getFolderStats(folderPath)
  if (stats.fileCount === 0) {
    error('Folder is empty, nothing to lock.')
    process.exit(1)
  }

  // Display info
  const modeLabel = options.encrypt
    ? chalk.yellow('encrypt')
    : chalk.green('hide')
  console.log(chalk.bold(`Lock folder: ${folderName}`) + ` [${modeLabel}]`)
  console.log(`  Files: ${stats.fileCount}, Size: ${formatSize(stats.totalSize)}`)

  if (options.encrypt) {
    const vaultName = `${folderName}${VAULT_EXTENSION}`
    console.log(`  Vault: ${vaultName}`)
  }

  // Confirm
  if (options.confirm) {
    const proceed = await confirm({ message: 'Continue?', default: false })
    if (!proceed) {
      console.log('Aborted.')
      return
    }
  }

  // Password
  const password = await promptPasswordWithConfirm()

  if (options.encrypt) {
    await lockEncrypt(folderPath, folderName, password, stats, options)
  } else {
    await lockHide(folderPath, folderName, password, stats)
  }
}

async function lockHide(
  folderPath: string,
  folderName: string,
  password: string,
  stats: { fileCount: number; totalSize: number },
): Promise<void> {
  const spinner = createSpinner('Locking folder...')
  spinner.start()

  // Hash password for verification
  const { hash, salt } = await hashPassword(password)

  // Generate hidden name and rename
  const hiddenName = generateHiddenName()
  let hiddenPath: string
  try {
    hiddenPath = await hideFolder(folderPath, hiddenName)
  } catch (err) {
    spinner.stop()
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }

  // Register
  await addEntry({
    originalPath: folderPath,
    mode: 'hide',
    hiddenPath,
    hiddenName,
    passwordHash: hash,
    passwordSalt: salt,
    originalName: folderName,
    fileCount: stats.fileCount,
    totalSize: stats.totalSize,
    lockedAt: new Date().toISOString(),
    status: 'locked',
  })

  spinner.stop()
  success(`Locked: ${folderName} [hide mode]`)
  console.log(`  Files: ${stats.fileCount}, Size: ${formatSize(stats.totalSize)}`)
}

async function lockEncrypt(
  folderPath: string,
  folderName: string,
  password: string,
  stats: { fileCount: number; totalSize: number; files: string[] },
  options: LockOptions,
): Promise<void> {
  const vaultPath = path.join(
    path.dirname(folderPath),
    `${folderName}${VAULT_EXTENSION}`,
  )

  // Check vault doesn't already exist
  const vaultExists = await fs.stat(vaultPath).catch(() => null)
  if (vaultExists) {
    error(`Vault already exists: ${vaultPath}`)
    process.exit(1)
  }

  const spinner = createSpinner('Compressing files...')
  spinner.start()

  // Compress
  const archive = await compressFolder(folderPath)
  spinner.text = 'Encrypting...'

  // Encrypt
  const { encrypted, salt, iv, authTag } = await encryptBuffer(archive, password)

  // Write vault
  spinner.text = 'Writing vault file...'
  const metadata: VaultMetadata = {
    originalName: folderName,
    fileCount: stats.fileCount,
    totalSize: stats.totalSize,
    lockedAt: new Date().toISOString(),
    platform: process.platform,
  }
  await writeVault(
    vaultPath,
    encrypted,
    salt,
    iv,
    authTag,
    metadata,
    BigInt(archive.length),
  )

  // Verify vault
  spinner.text = 'Verifying vault...'
  const vaultStat = await fs.stat(vaultPath)
  if (vaultStat.size === 0) {
    spinner.fail('Vault verification failed')
    await fs.unlink(vaultPath).catch(() => {})
    process.exit(1)
  }

  // Delete originals
  spinner.text = 'Removing originals...'
  try {
    if (options.secureDelete) {
      await secureDeleteFolder(folderPath, stats.files)
    } else {
      await fs.rm(folderPath, { recursive: true, force: true })
    }
  } catch {
    spinner.stop()
    warn('Could not fully remove originals. Vault is safe.')
    await addEntry({
      originalPath: folderPath,
      mode: 'encrypt',
      vaultPath,
      originalName: folderName,
      fileCount: stats.fileCount,
      totalSize: stats.totalSize,
      lockedAt: metadata.lockedAt,
      status: 'partial',
    })
    return
  }

  // Register
  await addEntry({
    originalPath: folderPath,
    mode: 'encrypt',
    vaultPath,
    originalName: folderName,
    fileCount: stats.fileCount,
    totalSize: stats.totalSize,
    lockedAt: metadata.lockedAt,
    status: 'locked',
  })

  spinner.stop()
  success(`Locked: ${folderName} -> ${path.basename(vaultPath)} [encrypt mode]`)
  console.log(`  Files: ${stats.fileCount}, Size: ${formatSize(stats.totalSize)}`)
}
