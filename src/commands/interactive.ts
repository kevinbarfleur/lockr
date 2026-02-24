import path from 'node:path'
import fs from 'node:fs/promises'
import { select, input, confirm } from '@inquirer/prompts'
import chalk from 'chalk'

import { BANNER, formatSize, info } from '../utils/ui.js'
import { loadRegistry } from '../utils/config.js'
import { lockCommand } from './lock.js'
import { unlockCommand } from './unlock.js'
import { openCommand } from './open.js'
import { statusCommand } from './status.js'
import { listCommand } from './list.js'
import type { RegistryEntry } from '../types.js'

export async function interactiveMode(): Promise<void> {
  console.log(BANNER)
  console.log(
    chalk.dim('  v1.0.0 — Type ') +
      chalk.cyan('lockr --help') +
      chalk.dim(' for non-interactive usage.\n'),
  )

  const action = await select({
    message: 'What would you like to do?',
    choices: [
      {
        name: `${chalk.green('Lock')}    — Hide or encrypt a folder`,
        value: 'lock',
      },
      {
        name: `${chalk.blue('Unlock')}  — Restore a locked folder`,
        value: 'unlock',
      },
      {
        name: `${chalk.magenta('Open')}    — Unlock, browse, then relock`,
        value: 'open',
      },
      {
        name: `${chalk.yellow('Status')}  — Check if a path is locked`,
        value: 'status',
      },
      {
        name: `${chalk.cyan('List')}    — Show all locked folders`,
        value: 'list',
      },
    ],
  })

  switch (action) {
    case 'lock':
      return await interactiveLock()
    case 'unlock':
      return await interactiveUnlock()
    case 'open':
      return await interactiveOpen()
    case 'status':
      return await interactiveStatus()
    case 'list':
      return await listCommand({ json: false })
  }
}

async function interactiveLock(): Promise<void> {
  const folderPath = await input({
    message: 'Folder to lock:',
    default: '.',
    validate: async (value) => {
      const resolved = path.resolve(value)
      const stat = await fs.stat(resolved).catch(() => null)
      if (!stat?.isDirectory()) return 'Not a valid directory'
      return true
    },
  })

  const mode = await select({
    message: 'Lock mode:',
    choices: [
      {
        name: `${chalk.green('Hide')} — Instant, hides folder (like FolderGuard)`,
        value: 'hide',
      },
      {
        name: `${chalk.yellow('Encrypt')} — AES-256-GCM encryption (slower, more secure)`,
        value: 'encrypt',
      },
    ],
  })

  const encrypt = mode === 'encrypt'

  let secureDelete = true
  if (encrypt) {
    secureDelete = await confirm({
      message: 'Secure delete originals? (overwrite before deleting)',
      default: true,
    })
  }

  await lockCommand(folderPath, {
    encrypt,
    confirm: true,
    secureDelete,
    verbose: false,
  })
}

async function interactiveUnlock(): Promise<void> {
  const target = await pickLockedFolder('Folder to unlock:')
  if (!target) return

  await unlockCommand(target, { verbose: false })
}

async function interactiveOpen(): Promise<void> {
  const target = await pickLockedFolder('Folder to open:')
  if (!target) return

  await openCommand(target, { verbose: false })
}

async function interactiveStatus(): Promise<void> {
  const folderPath = await input({
    message: 'Path to check:',
    default: '.',
  })

  await statusCommand(folderPath)
}

async function pickLockedFolder(
  message: string,
): Promise<string | null> {
  const registry = await loadRegistry()
  const entries = registry.entries.filter((e) => e.status === 'locked')

  if (entries.length === 0) {
    info('No locked folders in registry.')
    const manual = await confirm({
      message: 'Enter a path manually?',
      default: true,
    })
    if (!manual) return null

    return await input({ message })
  }

  const choices = [
    ...entries.map((entry) => ({
      name: formatEntryChoice(entry),
      value: entry.originalPath,
    })),
    {
      name: chalk.dim('Enter a path manually...'),
      value: '__manual__',
    },
  ]

  const selected = await select({ message, choices })

  if (selected === '__manual__') {
    return await input({ message: 'Path:' })
  }

  return selected
}

function formatEntryChoice(entry: RegistryEntry): string {
  const modeIcon = entry.mode === 'encrypt' ? chalk.yellow('🔐') : chalk.red('🔒')
  const modeLabel =
    entry.mode === 'encrypt' ? chalk.yellow('encrypt') : chalk.green('hide')

  return `${modeIcon} ${chalk.bold(entry.originalName)} [${modeLabel}] — ${entry.fileCount} files, ${formatSize(entry.totalSize)}`
}
