import { execSync } from 'node:child_process'

export function hideWithOsAttributes(folderPath: string): void {
  switch (process.platform) {
    case 'win32':
      execSync(`attrib +h +s "${folderPath}"`, { stdio: 'pipe' })
      break
    case 'darwin':
      execSync(`chflags hidden "${folderPath}"`, { stdio: 'pipe' })
      break
    // Linux: dot-prefix is enough
  }
}

export function unhideWithOsAttributes(folderPath: string): void {
  switch (process.platform) {
    case 'win32':
      execSync(`attrib -h -s "${folderPath}"`, { stdio: 'pipe' })
      break
    case 'darwin':
      execSync(`chflags nohidden "${folderPath}"`, { stdio: 'pipe' })
      break
  }
}

export function openInExplorer(folderPath: string): void {
  switch (process.platform) {
    case 'win32':
      execSync(`start "" "${folderPath}"`, { stdio: 'pipe' })
      break
    case 'darwin':
      execSync(`open "${folderPath}"`, { stdio: 'pipe' })
      break
    default:
      execSync(`xdg-open "${folderPath}"`, { stdio: 'pipe' })
      break
  }
}
