import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { hideWithOsAttributes, unhideWithOsAttributes } from '../utils/platform.js'

export function generateHiddenName(): string {
  return `.lockr-${crypto.randomBytes(8).toString('hex')}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function hideFolder(
  folderPath: string,
  hiddenName: string,
): Promise<string> {
  const parentDir = path.dirname(folderPath)
  const hiddenPath = path.join(parentDir, hiddenName)

  // On Windows, if our process CWD is the target folder, the rename
  // will fail with EBUSY. Move CWD to the parent directory first.
  const cwd = path.resolve(process.cwd())
  const target = path.resolve(folderPath)
  const needsCdBack = cwd === target || cwd.startsWith(target + path.sep)

  if (needsCdBack) {
    process.chdir(parentDir)
  }

  try {
    await fs.rename(folderPath, hiddenPath)
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code

    if (code === 'EBUSY' || code === 'EPERM') {
      // Retry once after a short delay (transient locks from indexers, antivirus, etc.)
      await sleep(500)
      try {
        await fs.rename(folderPath, hiddenPath)
      } catch (retryErr: unknown) {
        const retryCode = (retryErr as NodeJS.ErrnoException).code
        if (retryCode === 'EBUSY') {
          throw new Error(
            `Cannot lock: the folder is in use by another process.\n` +
            `  This usually happens when your terminal is open inside the folder.\n\n` +
            `  Fix: run ${path.basename(folderPath) === path.basename(cwd) ? '"cd .."' : '"cd" out of the folder'} first, then retry:\n\n` +
            `    cd ..\n` +
            `    lockr lock ${path.basename(folderPath)}`,
          )
        }
        throw retryErr
      }
    } else {
      throw err
    }
  }

  try {
    hideWithOsAttributes(hiddenPath)
  } catch {
    // Non-fatal: folder is already renamed/hidden by dot-prefix
  }

  return hiddenPath
}

export async function unhideFolder(
  hiddenPath: string,
  originalPath: string,
): Promise<void> {
  try {
    unhideWithOsAttributes(hiddenPath)
  } catch {
    // Non-fatal
  }

  await fs.rename(hiddenPath, originalPath)
}
