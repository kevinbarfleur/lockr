import path from 'node:path'
import fs from 'node:fs/promises'
import chalk from 'chalk'

import { readVaultHeader } from '../core/vault.js'
import { findEntry } from '../utils/config.js'
import { formatSize, info, error } from '../utils/ui.js'
import { VAULT_EXTENSION } from '../types.js'

export async function statusCommand(inputPath: string): Promise<void> {
  const targetPath = path.resolve(inputPath || process.cwd())
  const stat = await fs.stat(targetPath).catch(() => null)

  // Check registry first
  const entry = await findEntry(targetPath)
  if (entry) {
    const modeLabel =
      entry.mode === 'encrypt'
        ? chalk.yellow('encrypted')
        : chalk.green('hidden')

    console.log(chalk.bold.red('LOCKED') + ` (${modeLabel})`)
    console.log(`  Name:      ${entry.originalName}`)
    console.log(`  Path:      ${entry.originalPath}`)
    console.log(`  Files:     ${entry.fileCount}`)
    console.log(`  Size:      ${formatSize(entry.totalSize)}`)
    console.log(`  Locked at: ${entry.lockedAt}`)

    if (entry.status === 'partial') {
      console.log(chalk.yellow('  Status:    PARTIAL (originals may still exist)'))
    }
    return
  }

  if (!stat) {
    // Check if there's a vault file
    const vaultPath = targetPath.endsWith(VAULT_EXTENSION)
      ? targetPath
      : targetPath + VAULT_EXTENSION

    const vaultStat = await fs.stat(vaultPath).catch(() => null)
    if (vaultStat) {
      const header = await readVaultHeader(vaultPath).catch(() => null)
      if (header) {
        console.log(chalk.bold.red('LOCKED') + ` (${chalk.yellow('encrypted')})`)
        console.log(`  Name:      ${header.metadata.originalName}`)
        console.log(`  Files:     ${header.metadata.fileCount}`)
        console.log(`  Size:      ${formatSize(header.metadata.totalSize)}`)
        console.log(`  Locked at: ${header.metadata.lockedAt}`)
        return
      }
    }

    error(`Path does not exist: ${targetPath}`)
    process.exit(1)
  }

  // Check if it's a vault file
  if (targetPath.endsWith(VAULT_EXTENSION) && stat.isFile()) {
    const header = await readVaultHeader(targetPath).catch(() => null)
    if (header) {
      console.log(chalk.bold.red('LOCKED') + ` (${chalk.yellow('encrypted')})`)
      console.log(`  Name:      ${header.metadata.originalName}`)
      console.log(`  Files:     ${header.metadata.fileCount}`)
      console.log(`  Size:      ${formatSize(header.metadata.totalSize)}`)
      console.log(`  Locked at: ${header.metadata.lockedAt}`)
      return
    }
  }

  if (stat.isDirectory()) {
    console.log(chalk.bold.green('UNLOCKED'))
    console.log(`  Folder: ${path.basename(targetPath)}`)
    return
  }

  info(`Not a directory or vault file: ${targetPath}`)
}
