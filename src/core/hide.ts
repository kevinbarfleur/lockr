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

/**
 * Move all items from src into dest (which must already exist).
 * Works even when src is the CWD of the shell, because we're moving
 * children — not renaming the directory itself.
 */
async function moveContents(src: string, dest: string): Promise<void> {
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    await fs.rename(
      path.join(src, entry.name),
      path.join(dest, entry.name),
    )
  }
}

export async function hideFolder(
  folderPath: string,
  hiddenName: string,
): Promise<string> {
  const parentDir = path.dirname(folderPath)
  const hiddenPath = path.join(parentDir, hiddenName)

  // If our process CWD is the target folder, move to parent first
  // so Node itself doesn't hold a lock on it.
  const cwd = path.resolve(process.cwd())
  const target = path.resolve(folderPath)
  if (cwd === target || cwd.startsWith(target + path.sep)) {
    process.chdir(parentDir)
  }

  // Fast path: try a direct rename (works when nothing holds a lock)
  try {
    await fs.rename(folderPath, hiddenPath)
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'EBUSY' && code !== 'EPERM') throw err

    // Retry once after a short delay (antivirus, indexers…)
    await sleep(500)
    try {
      await fs.rename(folderPath, hiddenPath)
    } catch (retryErr: unknown) {
      const retryCode = (retryErr as NodeJS.ErrnoException).code
      if (retryCode !== 'EBUSY' && retryCode !== 'EPERM') throw retryErr

      // Fallback: the parent shell still holds a CWD lock on the folder.
      // We can't rename the folder, but we CAN move its contents out.
      // Create the hidden folder, move everything into it, then try to
      // remove the now-empty original (best-effort).
      await fs.mkdir(hiddenPath, { recursive: true })
      await moveContents(folderPath, hiddenPath)

      // Try to remove the empty shell — will fail if a process CWD is
      // still pointing at it, and that's fine.
      try {
        await fs.rmdir(folderPath)
      } catch {
        // Leave the empty folder. It contains nothing.
      }
    }
  }

  try {
    hideWithOsAttributes(hiddenPath)
  } catch {
    // Non-fatal: dot-prefix already hides on macOS/Linux
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

  // Fast path: direct rename
  try {
    await fs.rename(hiddenPath, originalPath)
    return
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'EBUSY' && code !== 'EPERM') throw err
  }

  // Fallback: original empty folder may still exist (CWD lock).
  // Move contents back into it.
  await fs.mkdir(originalPath, { recursive: true })
  await moveContents(hiddenPath, originalPath)

  try {
    await fs.rmdir(hiddenPath)
  } catch {
    // Best-effort
  }
}
