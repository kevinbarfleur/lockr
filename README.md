<div align="center">

```
  ██╗      ██████╗  ██████╗██╗  ██╗██████╗
  ██║     ██╔═══██╗██╔════╝██║ ██╔╝██╔══██╗
  ██║     ██║   ██║██║     █████╔╝ ██████╔╝
  ██║     ██║   ██║██║     ██╔═██╗ ██╔══██╗
  ███████╗╚██████╔╝╚██████╗██║  ██╗██║  ██║
  ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝
```

**Lock and unlock folders from your terminal.**

Hide them instantly or encrypt them with AES-256-GCM.

Cross-platform · Interactive · Transparent security

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-orange)
![Platform](https://img.shields.io/badge/platform-win%20%7C%20mac%20%7C%20linux-lightgrey)
[![Security Policy](https://img.shields.io/badge/security-policy-green)](https://github.com/kevinbarfleur/lockr/security/policy)
![Encryption](https://img.shields.io/badge/encryption-AES--256--GCM-blueviolet)

</div>

---

## What is lockr?

**lockr** is a command-line tool that locks folders on your computer. When a folder is locked, it disappears from its original location — any application trying to access files inside it will get a "file not found" error, as if the folder never existed.

Two locking modes are available:

| Mode | Speed | Security | How it works |
|------|-------|----------|--------------|
| **Hide** (default) | Instant | Casual protection | Renames and hides the folder using OS-level attributes |
| **Encrypt** (`--encrypt`) | Depends on size | Military-grade | Compresses, encrypts with AES-256-GCM, then deletes the originals |

> **Think of it as a free, open-source, CLI-based alternative to [FolderGuard](https://www.winability.com/folderguard/)** — but cross-platform and fully transparent about how your data is protected.

---

## Platform Support

| OS | Supported | Tested | Hide mode | Encrypt mode | Notes |
|----|:---------:|:------:|-----------|--------------|-------|
| **Windows 10/11** | Yes | **Yes** | `attrib +h +s` | AES-256-GCM | Primary dev/test platform. EBUSY fallback for CWD lock. |
| **macOS** | Yes | No | `chflags hidden` | AES-256-GCM | Needs community testing. |
| **Linux** | Yes | No | Dot-prefix | AES-256-GCM | Needs community testing. |

> **Tested on:** Windows 11 Home (10.0.26200), Node.js 22.x, pnpm 10.x
>
> If you test on macOS or Linux, please [open an issue](https://github.com/kevinbarfleur/lockr/issues) with your results!

---

## Table of Contents

- [Platform Support](#platform-support)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [Interactive Mode](#interactive-mode)
  - [lock](#lock)
  - [unlock](#unlock)
  - [open](#open)
  - [status](#status)
  - [list](#list)
- [Examples](#examples)
- [Security](#security)
  - [Hide Mode — How It Works](#hide-mode--how-it-works)
  - [Encrypt Mode — How It Works](#encrypt-mode--how-it-works)
  - [Vault File Format](#vault-file-format)
  - [Cryptographic Parameters](#cryptographic-parameters)
  - [Secure Deletion](#secure-deletion)
  - [Password Storage](#password-storage)
  - [Threat Model](#threat-model)
- [Configuration](#configuration)
- [FAQ](#faq)
- [License](#license)

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) **>= 18**
- [pnpm](https://pnpm.io/) (or npm)

### Install from source (local link)

Since lockr is not yet published on npm, you install it by cloning the repo and linking it globally:

```bash
# 1. Clone the repository
git clone https://github.com/kevinbarfleur/lockr.git
cd lockr

# 2. Install dependencies
pnpm install

# 3. Build the CLI
pnpm build

# 4. Link it globally on your machine
npm link
```

That's it. The `lockr` command is now available **everywhere** in your terminal:

```bash
lockr --version
# 1.0.0
```

> **How does `npm link` work?** It creates a symbolic link from your global `node_modules` to your local project. Any time you modify the source code and run `pnpm build`, the changes are immediately available in the `lockr` command — no need to reinstall.

### Uninstall

```bash
# From the lockr directory
npm unlink
```

---

## Quick Start

### Lock a folder (hide mode — instant)

```bash
lockr lock ~/Documents/private-stuff
```

The folder `private-stuff` is instantly renamed and hidden. Any app pointing to `~/Documents/private-stuff` will see "file not found".

### Unlock it

```bash
lockr unlock ~/Documents/private-stuff
```

Enter your password and the folder is back, exactly as it was.

### Lock with encryption (maximum security)

```bash
lockr lock ~/Documents/private-stuff --encrypt
```

The folder is compressed, encrypted with AES-256-GCM, and the originals are securely deleted. Only a `.vault` file remains.

---

## Commands

### Interactive Mode

Just type `lockr` with no arguments:

```bash
lockr
```

You'll see the ASCII banner and a guided menu:

```
  ██╗      ██████╗  ██████╗██╗  ██╗██████╗
  ██║     ██╔═══██╗██╔════╝██║ ██╔╝██╔══██╗
  ██║     ██║   ██║██║     █████╔╝ ██████╔╝
  ██║     ██║   ██║██║     ██╔═██╗ ██╔══██╗
  ███████╗╚██████╔╝╚██████╗██║  ██╗██║  ██║
  ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝
  Folder encryption made simple.

  v1.0.0 — Type lockr --help for non-interactive usage.

? What would you like to do?
❯ Lock    — Hide or encrypt a folder
  Unlock  — Restore a locked folder
  Open    — Unlock, browse, then relock
  Status  — Check if a path is locked
  List    — Show all locked folders
```

The interactive mode walks you through every step: choosing a folder, selecting the lock mode, entering your password, and confirming.

---

### `lock`

Lock a folder using hide mode (default) or encryption.

```
lockr lock [path] [options]
```

| Argument | Description | Default |
|----------|-------------|---------|
| `path` | Folder to lock | `.` (current directory) |

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--encrypt` | `-e` | Use AES-256-GCM encryption instead of hide mode | `false` |
| `--no-confirm` | | Skip the confirmation prompt | — |
| `--no-secure-delete` | | Simple delete instead of overwrite (encrypt mode only) | — |
| `--verbose` | `-v` | Show detailed progress | `false` |

**What happens:**

1. You are shown the folder name, file count, and total size
2. You confirm (unless `--no-confirm`)
3. You type a password (masked with `*`) and confirm it
4. The folder is locked

**Output:**

```
Lock folder: my-project [hide]
  Files: 147, Size: 23.4 MB
? Continue? Yes
? Enter password ****
? Confirm password ****
✔ Locked: my-project [hide mode]
  Files: 147, Size: 23.4 MB
```

---

### `unlock`

Restore a locked folder. Automatically detects whether it was hidden or encrypted.

```
lockr unlock [path] [options]
```

| Argument | Description | Default |
|----------|-------------|---------|
| `path` | Original folder path, `.vault` file, or hidden folder path | `.` |

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output <dir>` | `-o` | Extract to a different directory (encrypt mode only) | Original location |
| `--verbose` | `-v` | Show detailed progress | `false` |

**You get 3 password attempts.** After that, lockr exits.

```
Unlock: my-project [hide mode]
  Files: 147, Size: 23.4 MB
? Enter password ****
✔ Unlocked: my-project
  Files: 147 restored
```

---

### `open`

Unlock a folder, open it in the file explorer, then relock it when you press Enter. This is the closest behavior to FolderGuard's "auto-relock" feature.

```
lockr open [path] [options]
```

| Argument | Description | Default |
|----------|-------------|---------|
| `path` | Locked folder path | `.` |

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--verbose` | `-v` | Show detailed progress | `false` |

**What happens:**

1. You type your password once
2. The folder is unlocked and the file explorer opens
3. You browse, edit, do whatever you need
4. When you're done, go back to the terminal and press **Enter**
5. The folder relocks automatically — same password, no re-prompt

```
Unlock: my-project [hide mode]
  Files: 147, Size: 23.4 MB
? Enter password ****
✔ Unlocked: my-project
  Files: 147 restored
ℹ Opening folder in file explorer...

  Press Enter to relock the folder...

ℹ Relocking folder...
✔ Relocked: my-project [hide mode]
```

> **Why "Press Enter" instead of auto-detecting when the explorer closes?**
> On Windows, macOS, and Linux, the file explorer is a single shared process — there's no reliable cross-platform way to detect when a specific folder window closes. "Press Enter" is simple, predictable, and works everywhere.

---

### `status`

Check whether a path is locked or unlocked.

```
lockr status [path]
```

| Argument | Description | Default |
|----------|-------------|---------|
| `path` | File or directory to check | `.` |

**Examples:**

```bash
# Locked folder (hide mode)
lockr status ~/Documents/private-stuff
# LOCKED (hidden)
#   Name:      private-stuff
#   Path:      /Users/me/Documents/private-stuff
#   Files:     147
#   Size:      23.4 MB
#   Locked at: 2025-02-24T14:30:00.000Z

# Locked folder (encrypt mode)
lockr status ~/Documents/private-stuff.vault
# LOCKED (encrypted)
#   Name:      private-stuff
#   Files:     147
#   Size:      23.4 MB
#   Locked at: 2025-02-24T14:30:00.000Z

# Unlocked folder
lockr status ~/Documents/private-stuff
# UNLOCKED
#   Folder: private-stuff
```

---

### `list`

Show all folders currently locked by lockr.

```
lockr list [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--json` | Output raw JSON (useful for scripting) | `false` |

**Output:**

```
Locked folders (2):

  🔒 private-stuff [hide]
     Path:   /Users/me/Documents/private-stuff
     Files:  147, Size: 23.4 MB
     Locked: 2025-02-24T14:30:00.000Z

  🔐 tax-returns [encrypt]
     Path:   /Users/me/Documents/tax-returns
     Files:  23, Size: 156.2 MB
     Locked: 2025-02-20T09:15:00.000Z
```

---

## Examples

### Lock the current directory

```bash
cd ~/Documents/secret-project
lockr lock
```

### Lock a folder with encryption, skip confirmation

```bash
lockr lock ~/Documents/finances --encrypt --no-confirm
```

### Unlock to a different location

```bash
lockr unlock ~/Documents/finances.vault --output ~/Desktop
```

### Quick browse and relock

```bash
lockr open ~/Documents/private-stuff
# → Explorer opens, you browse your files
# → Press Enter in the terminal
# → Folder is re-locked
```

### List locked folders as JSON (for scripting)

```bash
lockr list --json | jq '.[].originalPath'
```

### Check a vault file without unlocking

```bash
lockr status ~/Documents/finances.vault
```

---

## Security

lockr is designed to be **fully transparent** about how your data is protected. There are no hidden mechanisms — everything is documented here and readable in the source code.

### Hide Mode — How It Works

When you run `lockr lock` (default mode), here's what happens:

1. **Rename**: the folder is renamed to `.lockr-<random>` in the same parent directory
   - Example: `Documents/private-stuff` → `Documents/.lockr-a1b2c3d4e5f6g7h8`
2. **Hide**: OS-specific attributes are applied to make the folder invisible
   - **Windows**: `attrib +h +s` (hidden + system flags)
   - **macOS**: `chflags hidden`
   - **Linux**: the `.` prefix is enough to hide from file managers
3. **Register**: the original path, hidden path, and a hash of your password are saved in a local registry file

**Result**: the folder vanishes from its original location. Any application looking for `Documents/private-stuff` gets "file not found". The folder still exists on disk under a randomized hidden name, but it won't show up in file explorers under normal settings.

**Limitations**:
- Someone with "Show hidden files" enabled could find the `.lockr-*` folder
- The files are not encrypted — just hidden and renamed
- If your computer is lost or stolen, hide mode offers no real protection

**Use hide mode when**: you want instant lock/unlock and protection from casual access.

### Encrypt Mode — How It Works

When you run `lockr lock --encrypt`, here's what happens:

1. **Compress**: the entire folder is packed into a `.tar.gz` archive
2. **Derive key**: your password is processed through **scrypt** to produce a 256-bit encryption key
3. **Encrypt**: the archive is encrypted with **AES-256-GCM** (authenticated encryption)
4. **Write vault**: the encrypted data, along with a binary header containing the salt, IV, and auth tag, is written to a `.vault` file
5. **Delete originals**: each file is overwritten twice (random bytes, then zeros) before deletion
6. **Register**: the operation is recorded in the local registry

**Result**: the folder is gone. Only a `.vault` file remains. Without the password, the vault is a meaningless blob of bytes. The AES-GCM auth tag ensures that any tampering is detected.

**Use encrypt mode when**: you need real security — protecting sensitive files, financial data, or anything that must survive a lost or stolen device.

### Vault File Format

Every `.vault` file starts with the ASCII bytes `LKVT` (lockr vault), followed by a structured binary header:

```
Offset  Size     Field            Description
──────  ───────  ───────────────  ─────────────────────────────────
0       4 B      MAGIC            "LKVT" (0x4C 0x4B 0x56 0x54)
4       1 B      VERSION          Format version (currently 0x01)
5       32 B     SALT             Random salt for scrypt
37      16 B     IV               Random initialization vector
53      16 B     AUTH_TAG         AES-GCM authentication tag
69      8 B      ORIGINAL_SIZE    Uncompressed archive size (uint64)
77      8 B      TIMESTAMP        Lock time in ms since epoch (uint64)
85      2 B      METADATA_LEN     Length of the JSON metadata
87      N B      METADATA         JSON: name, file count, size, date
87+N    ...      PAYLOAD          AES-256-GCM encrypted tar.gz
```

The metadata JSON (unencrypted, readable without the password) contains:

```json
{
  "originalName": "private-stuff",
  "fileCount": 147,
  "totalSize": 24510432,
  "lockedAt": "2025-02-24T14:30:00.000Z",
  "platform": "win32"
}
```

> **Why is metadata unencrypted?** So commands like `lockr status` and `lockr list` can display folder info without requiring the password. The metadata contains no file contents — only the folder name, file count, total size, and timestamp.

### Cryptographic Parameters

| Parameter | Value | Standard |
|-----------|-------|----------|
| **Encryption** | AES-256-GCM | NIST SP 800-38D |
| **Key size** | 256 bits (32 bytes) | — |
| **IV size** | 128 bits (16 bytes), random per operation | — |
| **Auth tag** | 128 bits (16 bytes) | — |
| **Key derivation** | scrypt | RFC 7914 |
| **scrypt N** | 2¹⁷ (131,072) | CPU/memory cost factor |
| **scrypt r** | 8 | Block size |
| **scrypt p** | 1 | Parallelization |
| **Salt** | 256 bits (32 bytes), random per operation | — |
| **RNG** | `crypto.randomBytes()` (Node.js CSPRNG) | — |

**What does this mean in practice?**

- Every lock operation generates a **fresh random salt and IV** — locking the same folder twice with the same password produces completely different vault files
- AES-256-GCM is **authenticated encryption** — if a single bit of the vault is modified, decryption will fail with an explicit error rather than producing corrupted output
- scrypt with N=2¹⁷ requires ~256 MB of memory to compute — this makes brute-force attacks with GPUs or ASICs extremely expensive
- All randomness comes from Node.js `crypto.randomBytes()`, which uses the operating system's cryptographically secure random number generator

### Secure Deletion

When encrypt mode deletes the original files, it performs a **two-pass overwrite** on each file:

1. **Pass 1**: overwrite the entire file with cryptographically random bytes
2. **Pass 2**: overwrite the entire file with zeros
3. **Sync**: flush to disk after each pass
4. **Delete**: remove the file

Files are deleted deepest-first (subdirectories before parent directories).

> **Honest caveat about SSDs**: On solid-state drives, overwriting a file does not guarantee the physical sectors are erased — the SSD controller may keep old copies in spare blocks due to wear leveling. For maximum security on SSDs, combine lockr with full-disk encryption (BitLocker on Windows, FileVault on macOS, LUKS on Linux).

You can disable secure deletion with `--no-secure-delete` for faster locking (plain `rm` instead of overwrite).

### Password Storage

In **hide mode**, your password is never stored in plain text. Instead:

1. A random 32-byte salt is generated
2. Your password is processed through `scrypt(password, salt, 32)` with the parameters above
3. The resulting 256-bit hash and the salt are saved in the registry
4. On unlock, the same derivation is performed and the hash is compared

In **encrypt mode**, the password is not stored at all — it's only needed to derive the encryption key at lock/unlock time. The vault's AES-GCM auth tag serves as implicit password verification: a wrong password produces a wrong key, which fails the authentication check.

### Threat Model

| Threat | Hide mode | Encrypt mode |
|--------|-----------|--------------|
| Someone casually browsing your files | ✅ Protected | ✅ Protected |
| Someone with "show hidden files" on | ❌ Visible | ✅ Protected |
| Someone with admin/root access | ❌ Accessible | ✅ Protected |
| Lost or stolen device (no disk encryption) | ❌ Vulnerable | ✅ Protected |
| Lost or stolen device (with disk encryption) | ✅ Protected | ✅ Protected |
| Forensic recovery (HDD) | ❌ Recoverable | ⚠️ Originals may be recoverable |
| Forensic recovery (SSD) | ❌ Recoverable | ⚠️ Fragments may remain |
| Brute-force (weak password) | ❌ Dictionary attack on hash | ❌ Dictionary attack on key |
| Brute-force (strong password 12+ chars) | ✅ scrypt makes it expensive | ✅ scrypt makes it expensive |

---

## Configuration

lockr stores a registry of locked folders in a JSON file. The location depends on your OS:

| OS | Path |
|----|------|
| **Windows** | `%APPDATA%\lockr\registry.json` |
| **macOS** | `~/.lockr/registry.json` |
| **Linux** | `$XDG_CONFIG_HOME/lockr/registry.json` (fallback: `~/.config/lockr/registry.json`) |

The registry is created automatically on first use. It contains:

```json
{
  "version": 1,
  "entries": [
    {
      "id": "a1b2c3d4-...",
      "originalPath": "/Users/me/Documents/private-stuff",
      "mode": "hide",
      "status": "locked",
      "originalName": "private-stuff",
      "fileCount": 147,
      "totalSize": 24510432,
      "lockedAt": "2025-02-24T14:30:00.000Z",
      "hiddenPath": "/Users/me/Documents/.lockr-a1b2c3d4e5f6g7h8",
      "hiddenName": ".lockr-a1b2c3d4e5f6g7h8",
      "passwordHash": "...",
      "passwordSalt": "..."
    }
  ]
}
```

> **If you delete the registry**, lockr won't know about your hidden folders, but the folders themselves are still on disk under their `.lockr-*` names. For encrypted vaults, you can always unlock a `.vault` file directly without the registry.

---

## FAQ

### What happens if I forget my password?

**Hide mode**: there's no recovery. However, the files are not encrypted — if you find the `.lockr-*` folder on disk, you can rename it back manually.

**Encrypt mode**: **the data is permanently lost.** This is by design — the same behavior as VeraCrypt, 7-Zip encryption, or any serious encryption tool. There are no backdoors.

### Can I move a `.vault` file to another computer?

Yes. Vault files are self-contained — they include everything needed for decryption (salt, IV, metadata). You just need lockr (or any tool that implements the same format) and the password.

### Does lockr work on network drives / USB drives / cloud folders?

**Hide mode**: works as long as the drive supports rename operations. Cloud sync folders (OneDrive, Dropbox, Google Drive) will sync the hidden folder — it's just renamed, not invisible to the sync engine.

**Encrypt mode**: works anywhere. The `.vault` file is a regular file that can be synced, copied, or moved freely.

### Is lockr safe to use on important files?

lockr follows a strict **safety-first principle**:

- In encrypt mode, **originals are never deleted until the vault is verified** on disk
- If deletion fails partway through, the entry is marked as `partial` — you have both the vault and the remaining originals
- The `open` command always completes the unlock before attempting a relock

That said, this is v1.0.0 — **always keep backups of critical data**.

### How fast is encrypt mode?

It depends on the folder size and your disk speed:

| Folder size | Lock (approx.) | Unlock (approx.) |
|-------------|----------------|-------------------|
| 10–50 MB | 1–3 s | 1–2 s |
| 100–500 MB | 5–15 s | 3–10 s |
| 1–5 GB | 30 s – 2 min | 20 s – 1.5 min |

Hide mode is always instant regardless of size.

---

## License

MIT — do whatever you want with it.
