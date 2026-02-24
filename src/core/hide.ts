import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { hideWithOsAttributes, unhideWithOsAttributes } from '../utils/platform.js'

export function generateHiddenName(): string {
  return `.lockr-${crypto.randomBytes(8).toString('hex')}`
}

export async function hideFolder(
  folderPath: string,
  hiddenName: string,
): Promise<string> {
  const parentDir = path.dirname(folderPath)
  const hiddenPath = path.join(parentDir, hiddenName)

  await fs.rename(folderPath, hiddenPath)

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
