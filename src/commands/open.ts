import path from 'node:path'
import readline from 'node:readline'
import chalk from 'chalk'

import { unlockCommand } from './unlock.js'
import { lockCommand } from './lock.js'
import { openInExplorer } from '../utils/platform.js'
import { findEntry } from '../utils/config.js'
import { error, info, success, warn } from '../utils/ui.js'

export interface OpenOptions {
  verbose: boolean
}

export async function openCommand(
  inputPath: string,
  options: OpenOptions,
): Promise<void> {
  const resolved = path.resolve(inputPath || process.cwd())

  // Find entry to know the mode
  const entry = await findEntry(resolved)
  if (!entry) {
    error(`No locked folder found for: ${resolved}`)
    error('Use "lockr list" to see all locked folders.')
    process.exit(1)
  }

  // Unlock (this will return the password and entry)
  const result = await unlockCommand(inputPath, { verbose: options.verbose })
  if (!result) {
    error('Failed to unlock folder.')
    process.exit(1)
  }

  const { password, entry: unlockedEntry } = result
  const folderPath = unlockedEntry.originalPath

  // Open in file explorer
  info('Opening folder in file explorer...')
  try {
    openInExplorer(folderPath)
  } catch {
    warn('Could not open file explorer. Please open the folder manually:')
    console.log(`  ${folderPath}`)
  }

  // Wait for user to press Enter
  console.log()
  console.log(chalk.yellow.bold('  Press Enter to relock the folder...'))
  console.log()

  await waitForEnter()

  // Relock with same password (no re-prompt)
  info('Relocking folder...')

  // We need to relock — simulate the lock flow but skip password prompt
  const { hideFolder, generateHiddenName } = await import('../core/hide.js')
  const { hashPassword } = await import('../utils/password.js')
  const { addEntry } = await import('../utils/config.js')
  const { getFolderStats, compressFolder } = await import('../core/archive.js')
  const { encryptBuffer, secureDeleteFolder } = await import('../core/crypto.js')
  const { writeVault } = await import('../core/vault.js')
  const { createSpinner, formatSize } = await import('../utils/ui.js')
  const { VAULT_EXTENSION } = await import('../types.js')
  const fs = await import('node:fs/promises')

  const stats = await getFolderStats(folderPath)

  if (unlockedEntry.mode === 'hide') {
    const { hash, salt } = await hashPassword(password)
    const hiddenName = generateHiddenName()
    const hiddenPath = await hideFolder(folderPath, hiddenName)

    await addEntry({
      originalPath: folderPath,
      mode: 'hide',
      hiddenPath,
      hiddenName,
      passwordHash: hash,
      passwordSalt: salt,
      originalName: unlockedEntry.originalName,
      fileCount: stats.fileCount,
      totalSize: stats.totalSize,
      lockedAt: new Date().toISOString(),
      status: 'locked',
    })

    success(`Relocked: ${unlockedEntry.originalName} [hide mode]`)
  } else {
    const spinner = createSpinner('Compressing files...')
    spinner.start()

    const vaultPath = path.join(
      path.dirname(folderPath),
      `${unlockedEntry.originalName}${VAULT_EXTENSION}`,
    )

    const archive = await compressFolder(folderPath)
    spinner.text = 'Encrypting...'

    const { encrypted, salt, iv, authTag } = await encryptBuffer(archive, password)

    spinner.text = 'Writing vault...'
    await writeVault(vaultPath, encrypted, salt, iv, authTag, {
      originalName: unlockedEntry.originalName,
      fileCount: stats.fileCount,
      totalSize: stats.totalSize,
      lockedAt: new Date().toISOString(),
      platform: process.platform,
    }, BigInt(archive.length))

    spinner.text = 'Removing originals...'
    await fs.rm(folderPath, { recursive: true, force: true })

    await addEntry({
      originalPath: folderPath,
      mode: 'encrypt',
      vaultPath,
      originalName: unlockedEntry.originalName,
      fileCount: stats.fileCount,
      totalSize: stats.totalSize,
      lockedAt: new Date().toISOString(),
      status: 'locked',
    })

    spinner.stop()
    success(`Relocked: ${unlockedEntry.originalName} [encrypt mode]`)
  }
}

function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.once('line', () => {
      rl.close()
      resolve()
    })
  })
}
