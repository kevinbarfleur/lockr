import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import type { Registry, RegistryEntry } from '../types.js'

function getConfigDir(): string {
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'lockr',
    )
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), '.lockr')
  }
  return path.join(
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
    'lockr',
  )
}

const CONFIG_DIR = getConfigDir()
const REGISTRY_PATH = path.join(CONFIG_DIR, 'registry.json')

async function ensureConfigDir(): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true })
}

export async function loadRegistry(): Promise<Registry> {
  try {
    const data = await fs.readFile(REGISTRY_PATH, 'utf-8')
    return JSON.parse(data) as Registry
  } catch {
    return { version: 1, entries: [] }
  }
}

async function saveRegistry(registry: Registry): Promise<void> {
  await ensureConfigDir()
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2))
}

export async function addEntry(entry: Omit<RegistryEntry, 'id'>): Promise<void> {
  const registry = await loadRegistry()
  registry.entries.push({ ...entry, id: crypto.randomUUID() })
  await saveRegistry(registry)
}

export async function removeEntry(originalPath: string): Promise<void> {
  const registry = await loadRegistry()
  registry.entries = registry.entries.filter(
    (e) => e.originalPath !== originalPath,
  )
  await saveRegistry(registry)
}

export async function findEntry(
  searchPath: string,
): Promise<RegistryEntry | undefined> {
  const registry = await loadRegistry()
  const resolved = path.resolve(searchPath)
  return registry.entries.find(
    (e) =>
      e.originalPath === resolved ||
      e.hiddenPath === resolved ||
      e.vaultPath === resolved,
  )
}

export async function updateEntryStatus(
  originalPath: string,
  status: RegistryEntry['status'],
): Promise<void> {
  const registry = await loadRegistry()
  const entry = registry.entries.find((e) => e.originalPath === originalPath)
  if (entry) entry.status = status
  await saveRegistry(registry)
}
