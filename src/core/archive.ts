import * as tar from 'tar'
import path from 'node:path'
import fs from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { FolderStats } from '../types.js'

export async function compressFolder(folderPath: string): Promise<Buffer> {
  const parentDir = path.dirname(folderPath)
  const folderName = path.basename(folderPath)

  const chunks: Buffer[] = []
  const stream = tar.c({ gzip: true, cwd: parentDir }, [folderName])

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk as Buffer))
  }

  return Buffer.concat(chunks)
}

export async function extractArchive(
  data: Buffer,
  outputPath: string,
): Promise<void> {
  await fs.mkdir(outputPath, { recursive: true })
  const stream = Readable.from(data)
  const extractor = tar.x({ cwd: outputPath })
  await pipeline(stream, extractor)
}

export async function getFolderStats(
  folderPath: string,
): Promise<FolderStats> {
  const files: string[] = []
  let totalSize = 0

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else {
        const stat = await fs.stat(fullPath)
        files.push(path.relative(folderPath, fullPath))
        totalSize += stat.size
      }
    }
  }

  await walk(folderPath)
  return { fileCount: files.length, totalSize, files }
}
