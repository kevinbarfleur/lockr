// Vault file format constants
export const VAULT_MAGIC = Buffer.from('LKVT', 'ascii')
export const VAULT_VERSION = 0x01
export const VAULT_EXTENSION = '.vault'

// Header field sizes (bytes)
export const HEADER_MAGIC_SIZE = 4
export const HEADER_VERSION_SIZE = 1
export const HEADER_SALT_SIZE = 32
export const HEADER_IV_SIZE = 16
export const HEADER_TAG_SIZE = 16
export const HEADER_ORIGINAL_SIZE_SIZE = 8
export const HEADER_TIMESTAMP_SIZE = 8
export const HEADER_METADATA_LENGTH_SIZE = 2

export const HEADER_FIXED_SIZE =
  HEADER_MAGIC_SIZE +
  HEADER_VERSION_SIZE +
  HEADER_SALT_SIZE +
  HEADER_IV_SIZE +
  HEADER_TAG_SIZE +
  HEADER_ORIGINAL_SIZE_SIZE +
  HEADER_TIMESTAMP_SIZE +
  HEADER_METADATA_LENGTH_SIZE // = 87

// Crypto parameters
export const SCRYPT_N = 2 ** 17
export const SCRYPT_R = 8
export const SCRYPT_P = 1
export const SCRYPT_KEY_LENGTH = 32
export const ALGORITHM = 'aes-256-gcm' as const

// Interfaces
export interface VaultMetadata {
  originalName: string
  fileCount: number
  totalSize: number
  lockedAt: string
  platform: NodeJS.Platform
}

export interface VaultHeader {
  magic: Buffer
  version: number
  salt: Buffer
  iv: Buffer
  authTag: Buffer
  originalSize: bigint
  timestamp: bigint
  metadata: VaultMetadata
  metadataLength: number
}

export interface RegistryEntry {
  id: string
  originalPath: string
  mode: 'hide' | 'encrypt'
  // Hide mode fields
  hiddenPath?: string
  hiddenName?: string
  passwordHash?: string
  passwordSalt?: string
  // Encrypt mode fields
  vaultPath?: string
  // Common
  originalName: string
  fileCount: number
  totalSize: number
  lockedAt: string
  status: 'locked' | 'partial'
}

export interface Registry {
  version: 1
  entries: RegistryEntry[]
}

export interface FolderStats {
  fileCount: number
  totalSize: number
  files: string[]
}
