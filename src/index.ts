import { Command } from 'commander'
import { BANNER } from './utils/ui.js'
import { lockCommand } from './commands/lock.js'
import { unlockCommand } from './commands/unlock.js'
import { openCommand } from './commands/open.js'
import { statusCommand } from './commands/status.js'
import { listCommand } from './commands/list.js'
import { interactiveMode } from './commands/interactive.js'

// No subcommand → interactive mode
if (process.argv.length <= 2) {
  interactiveMode().catch((err) => {
    if (err instanceof Error && err.message.includes('prompt')) process.exit(130)
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
} else {

const program = new Command()

program
  .name('lockr')
  .description('Lock and unlock folders with hide mode or AES-256-GCM encryption')
  .version('0.1.0')
  .addHelpText('before', BANNER)

program
  .command('lock')
  .description('Lock a folder (hide by default, or encrypt with --encrypt)')
  .argument('[path]', 'folder to lock', '.')
  .option('-e, --encrypt', 'use AES-256-GCM encryption instead of hide mode', false)
  .option('--no-confirm', 'skip confirmation prompt')
  .option('--no-secure-delete', 'use simple delete instead of overwrite (encrypt mode)')
  .option('-v, --verbose', 'show detailed progress', false)
  .action(async (inputPath: string, opts) => {
    try {
      await lockCommand(inputPath, {
        encrypt: opts.encrypt,
        confirm: opts.confirm,
        secureDelete: opts.secureDelete,
        verbose: opts.verbose,
      })
    } catch (err) {
      if (err instanceof Error && err.message.includes('prompt')) process.exit(130)
      console.error(err instanceof Error ? err.message : err)
      process.exit(1)
    }
  })

program
  .command('unlock')
  .description('Unlock a folder (auto-detects hide or encrypt mode)')
  .argument('[path]', '.vault file or original folder path', '.')
  .option('-o, --output <dir>', 'extract to different directory (encrypt mode)')
  .option('-v, --verbose', 'show detailed progress', false)
  .action(async (inputPath: string, opts) => {
    try {
      await unlockCommand(inputPath, {
        output: opts.output,
        verbose: opts.verbose,
      })
    } catch (err) {
      if (err instanceof Error && err.message.includes('prompt')) process.exit(130)
      console.error(err instanceof Error ? err.message : err)
      process.exit(1)
    }
  })

program
  .command('open')
  .description('Unlock, open in file explorer, then relock on Enter')
  .argument('[path]', 'locked folder path', '.')
  .option('-v, --verbose', 'show detailed progress', false)
  .action(async (inputPath: string, opts) => {
    try {
      await openCommand(inputPath, { verbose: opts.verbose })
    } catch (err) {
      if (err instanceof Error && err.message.includes('prompt')) process.exit(130)
      console.error(err instanceof Error ? err.message : err)
      process.exit(1)
    }
  })

program
  .command('status')
  .description('Check if a path is locked or unlocked')
  .argument('[path]', 'file or directory to check', '.')
  .action(async (inputPath: string) => {
    try {
      await statusCommand(inputPath)
    } catch (err) {
      console.error(err instanceof Error ? err.message : err)
      process.exit(1)
    }
  })

program
  .command('list')
  .description('List all locked folders from registry')
  .option('--json', 'output as JSON', false)
  .action(async (opts) => {
    try {
      await listCommand({ json: opts.json })
    } catch (err) {
      console.error(err instanceof Error ? err.message : err)
      process.exit(1)
    }
  })

program.parse()

} // end else (subcommand mode)
