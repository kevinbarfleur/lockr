import chalk from 'chalk'
import { loadRegistry } from '../utils/config.js'
import { formatSize } from '../utils/ui.js'

export interface ListOptions {
  json: boolean
}

export async function listCommand(options: ListOptions): Promise<void> {
  const registry = await loadRegistry()

  if (registry.entries.length === 0) {
    console.log(chalk.dim('No locked folders found.'))
    return
  }

  if (options.json) {
    console.log(JSON.stringify(registry.entries, null, 2))
    return
  }

  console.log(chalk.bold(`Locked folders (${registry.entries.length}):\n`))

  for (const entry of registry.entries) {
    const modeIcon =
      entry.mode === 'encrypt' ? chalk.yellow('🔐') : chalk.red('🔒')

    const modeLabel =
      entry.mode === 'encrypt'
        ? chalk.yellow('encrypt')
        : chalk.green('hide')

    console.log(`  ${modeIcon} ${chalk.bold(entry.originalName)} [${modeLabel}]`)
    console.log(`     Path:   ${entry.originalPath}`)
    console.log(`     Files:  ${entry.fileCount}, Size: ${formatSize(entry.totalSize)}`)
    console.log(`     Locked: ${entry.lockedAt}`)

    if (entry.status === 'partial') {
      console.log(chalk.yellow('     Status: PARTIAL (originals may still exist)'))
    }

    console.log()
  }
}
