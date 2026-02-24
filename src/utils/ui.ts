import chalk from 'chalk'
import ora, { type Ora } from 'ora'

export const BANNER = `
  ${chalk.cyan('██╗      ██████╗  ██████╗██╗  ██╗██████╗ ')}
  ${chalk.cyan('██║     ██╔═══██╗██╔════╝██║ ██╔╝██╔══██╗')}
  ${chalk.cyan('██║     ██║   ██║██║     █████╔╝ ██████╔╝')}
  ${chalk.cyan('██║     ██║   ██║██║     ██╔═██╗ ██╔══██╗')}
  ${chalk.cyan('███████╗╚██████╔╝╚██████╗██║  ██╗██║  ██║')}
  ${chalk.cyan('╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝')}
  ${chalk.dim('Folder encryption made simple.')}
`

export function createSpinner(text: string): Ora {
  return ora({ text, spinner: 'dots' })
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

export function success(message: string): void {
  console.log(chalk.green('✔'), message)
}

export function error(message: string): void {
  console.error(chalk.red('✖'), message)
}

export function warn(message: string): void {
  console.warn(chalk.yellow('⚠'), message)
}

export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message)
}
