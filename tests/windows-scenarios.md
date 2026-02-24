# lockr — Windows Test Scenarios

> **Platform:** Windows 11 Home (10.0.26200)
> **Node.js:** >= 22.x | **pnpm:** >= 10.x
>
> Check each scenario after testing. Mark with `[x]` for pass, `[!]` for known issue, `[-]` for skip.

---

## A. Paths & Locations (12 scenarios)

Tests covering path edge cases specific to Windows (NTFS, special characters, path limits).

| # | Scenario | Command | Expected Result | Status |
|---|----------|---------|-----------------|--------|
| A01 | Simple path in Documents | `lockr lock C:\Users\me\Documents\testfolder` | Folder hidden, attrib +h +s applied | [ ] |
| A02 | Path with spaces | `lockr lock "C:\Users\me\My Documents\test folder"` | Folder hidden normally | [ ] |
| A03 | Path with accented chars | `lockr lock "C:\Users\me\Documents\dossier-été"` | Folder hidden normally | [ ] |
| A04 | Path with special chars (&, #, ()) | `lockr lock "C:\Users\me\Documents\test & notes (2024) #1"` | Folder hidden normally | [ ] |
| A05 | Long path (>200 chars) | Create deeply nested path >200 chars, then lock | Should work (NTFS supports 32K chars with long path enabled) | [ ] |
| A06 | Path at MAX_PATH boundary (260 chars) | Create path exactly at 260 chars, then lock | May fail if long paths not enabled in Windows — lockr should show clear error | [ ] |
| A07 | UNC network path | `lockr lock "\\server\share\testfolder"` | Either works or fails with clear error (no silent data loss) | [ ] |
| A08 | USB / external drive | `lockr lock "D:\testfolder"` (USB drive) | Folder hidden. Note: attrib may behave differently on FAT32/exFAT | [ ] |
| A09 | OneDrive / cloud sync folder | `lockr lock "C:\Users\me\OneDrive\testfolder"` | Folder hidden. OneDrive will sync the renamed .lockr-* folder — expected behavior | [ ] |
| A10 | Program Files (requires admin) | `lockr lock "C:\Program Files\testfolder"` | Should fail with clear permission error (EPERM) | [ ] |
| A11 | Drive root | `lockr lock "C:\testfolder"` | Folder hidden at C:\.lockr-* — verify attrib works at root level | [ ] |
| A12 | Dot-prefix folder already exists | Create `.lockr-test` manually, then lock a folder | New hidden name generated (no collision), lock succeeds | [ ] |

---

## B. Hide Mode — Normal Flow (10 scenarios)

Standard lock/unlock operations in hide mode.

| # | Scenario | Command | Expected Result | Status |
|---|----------|---------|-----------------|--------|
| B01 | Lock and unlock simple folder | `lockr lock testfolder` then `lockr unlock testfolder` | Folder disappears then reappears, all files intact | [ ] |
| B02 | Deep folder tree (5+ nested levels) | Lock folder with `a/b/c/d/e/file.txt` | Entire tree hidden and restored | [ ] |
| B03 | Folder with hidden files (.git, .env) | Lock folder containing `.git/`, `.env`, `.gitignore` | All hidden files preserved after unlock | [ ] |
| B04 | Folder with read-only files | Lock folder with `attrib +r` files inside | Files remain read-only after unlock | [ ] |
| B05 | Empty folder (rejected) | `lockr lock empty-folder` | Error: "Folder is empty, nothing to lock." | [ ] |
| B06 | Verify invisibility in Explorer | After locking, open parent folder in Explorer (hidden files OFF) | Folder is NOT visible | [ ] |
| B07 | Verify invisibility in Explorer (hidden files ON) | After locking, open parent folder in Explorer (hidden files ON) | .lockr-* folder IS visible (expected limitation) | [ ] |
| B08 | Verify attrib applied | After locking, run `attrib .lockr-*` in parent dir | Shows `H S` (hidden + system) attributes | [ ] |
| B09 | Double lock same folder | Lock a folder, then try `lockr lock testfolder` again | Error: folder no longer exists (already renamed) | [ ] |
| B10 | Double unlock same folder | Unlock a folder, then try `lockr unlock testfolder` again | Error: not found in registry or already unlocked | [ ] |

---

## C. Hide Mode — CWD & System Locks (8 scenarios)

Windows-specific EBUSY situations and content-move fallback logic.

| # | Scenario | Command | Expected Result | Status |
|---|----------|---------|-----------------|--------|
| C01 | Lock from inside target (CWD = target) | `cd testfolder && lockr lock .` | Uses content-move fallback. All files moved to hidden dir. Empty original may remain. | [ ] |
| C02 | CWD in subdirectory of target | `cd testfolder/subdir && lockr lock ../` | process.chdir to parent, then rename or content-move fallback | [ ] |
| C03 | Another terminal has CWD in folder | Terminal 1: `cd testfolder` / Terminal 2: `lockr lock testfolder` | Content-move fallback after EBUSY retry. Files locked. | [ ] |
| C04 | File open in Word / Office app | Open a .docx inside testfolder, then lock | Lock should succeed (rename moves entire folder). Word will error on next save. | [ ] |
| C05 | File open in VS Code | Open testfolder as workspace in VS Code, then lock | Lock should succeed. VS Code will show "unable to watch" errors. | [ ] |
| C06 | Active write process in folder | Start a script writing to file inside folder, then lock | Rename should succeed. Writing process gets ENOENT on next write. | [ ] |
| C07 | Windows Search indexing the folder | Lock folder while Windows Search is scanning | May trigger EBUSY — retry + fallback should handle it | [ ] |
| C08 | Folder open in Explorer window | Have folder open in Explorer, then lock | Rename should succeed. Explorer tab shows "path not found". | [ ] |

---

## D. Encrypt Mode — Normal Flow (8 scenarios)

Standard lock/unlock operations with `--encrypt`.

| # | Scenario | Command | Expected Result | Status |
|---|----------|---------|-----------------|--------|
| D01 | Encrypt small folder (<1 MB) | `lockr lock testfolder --encrypt` | .vault file created, originals deleted, unlock restores all files | [ ] |
| D02 | Encrypt medium folder (~100 MB) | `lockr lock bigfolder --encrypt` | Spinner shows progress. Vault created. Unlock restores all. | [ ] |
| D03 | Encrypt large folder (>1 GB) | `lockr lock hugefolder --encrypt` | May take 30s–2min. Watch for memory usage (buffered encryption). Vault verified. | [ ] |
| D04 | Folder with binary files (exe, dll, images, videos) | Encrypt folder with mixed binary content | All files identical after unlock (byte-for-byte comparison) | [ ] |
| D05 | Folder with Windows symlinks | Create symlink inside folder: `mklink /D link target`, then encrypt | Behavior depends on tar handling of symlinks — document result | [ ] |
| D06 | Folder with junction points | Create junction: `mklink /J junc target`, then encrypt | Behavior depends on tar handling of junctions — document result | [ ] |
| D07 | Verify vault integrity | After encrypt, check vault file: `lockr status testfolder.vault` | Shows metadata (name, file count, size, date) without password | [ ] |
| D08 | Re-encrypt previously unlocked folder | Encrypt → unlock → encrypt again | New vault with fresh salt/IV. Old vault gone. New vault works. | [ ] |

---

## E. Encrypt Mode — Errors & Corruption (10 scenarios)

Edge cases around vault corruption, disk space, and error recovery. Inspired by user reports on FolderLock/Cryptomator/VeraCrypt data loss.

| # | Scenario | Command | Expected Result | Status |
|---|----------|---------|-----------------|--------|
| E01 | Wrong password (3 attempts) | `lockr unlock testfolder` with wrong password x3 | Error after 3 attempts. Vault file untouched. | [ ] |
| E02 | Vault corrupted (modified bytes) | Hex-edit the vault payload area (change random bytes) | Decryption fails with auth tag error. Clear error message. | [ ] |
| E03 | Vault truncated (file shortened) | Truncate vault file to half its size | Error: invalid vault or incomplete read. No crash. | [ ] |
| E04 | Vault header corrupted | Overwrite first 10 bytes of vault file | Error: invalid vault magic. Clear message. | [ ] |
| E05 | Vault moved to another location | Move .vault file to Desktop, then `lockr unlock ~/Desktop/testfolder.vault` | Direct vault unlock works (vault is self-contained) | [ ] |
| E06 | Vault renamed | Rename `testfolder.vault` to `other.vault`, then unlock | Direct vault unlock works. Folder name from metadata, not filename. | [ ] |
| E07 | Two copies of same vault | Copy vault file, unlock one, then try unlocking the copy | Second unlock should work independently | [ ] |
| E08 | Insufficient disk space (encrypt) | Fill disk to <50 MB free, then encrypt a 200 MB folder | Error during vault write. Originals should still be intact (not yet deleted). | [ ] |
| E09 | Insufficient disk space (decrypt) | Fill disk, then try to unlock a large vault | Error during extraction. Vault file should remain intact. | [ ] |
| E10 | .vault file already exists | Create dummy `testfolder.vault`, then `lockr lock testfolder --encrypt` | Error: "Vault already exists". No overwrite. | [ ] |

---

## F. Secure Deletion (5 scenarios)

Testing the 2-pass overwrite deletion in encrypt mode.

| # | Scenario | Command | Expected Result | Status |
|---|----------|---------|-----------------|--------|
| F01 | Secure delete normal files | `lockr lock testfolder --encrypt` | Files overwritten twice then deleted. Verify with recovery tool (e.g. Recuva) | [ ] |
| F02 | Secure delete read-only files | Lock folder with `attrib +r` files, encrypt mode | Secure delete should handle read-only (or error clearly) | [ ] |
| F03 | Secure delete large file (1 GB+) | Encrypt folder with single large file | 2-pass overwrite completes. May take noticeable time. | [ ] |
| F04 | Ctrl+C during secure deletion | Start encrypt, then Ctrl+C during "Removing originals..." | Partial deletion. Vault is already written. Entry marked `partial`. | [ ] |
| F05 | No secure delete flag | `lockr lock testfolder --encrypt --no-secure-delete` | Uses simple `fs.rm` instead of overwrite. Faster. | [ ] |

---

## G. `open` Command (8 scenarios)

Unlock → Explorer → Relock flow, inspired by user frustration with 7-Zip extract-edit-rezip cycle.

| # | Scenario | Command | Expected Result | Status |
|---|----------|---------|-----------------|--------|
| G01 | Open hide mode folder | `lockr open testfolder` | Folder unlocked → Explorer opens → Enter → relocked with same password | [ ] |
| G02 | Open encrypt mode folder | `lockr open testfolder` (encrypted) | Vault decrypted → Explorer opens → Enter → re-encrypted | [ ] |
| G03 | Close terminal without pressing Enter | `lockr open testfolder`, then close the terminal window | Folder remains unlocked (orphaned). Can be re-locked manually. | [ ] |
| G04 | Add files before relocking | Open → add new files to folder → Enter | New files included in relocked folder | [ ] |
| G05 | Delete files before relocking | Open → delete some files → Enter | Deleted files NOT in relocked folder (correct behavior) | [ ] |
| G06 | Modify files before relocking | Open → edit files → Enter | Modified versions saved in relocked folder | [ ] |
| G07 | Two simultaneous `lockr open` | Open same folder in two terminals | Second open should fail (folder already unlocked or not in registry) | [ ] |
| G08 | Explorer closed before Enter | Open → close Explorer window → Enter | Relock proceeds normally (Explorer state is independent) | [ ] |

---

## H. `status` & `list` Commands (8 scenarios)

| # | Scenario | Command | Expected Result | Status |
|---|----------|---------|-----------------|--------|
| H01 | Status of locked folder (hide) | `lockr status testfolder` (after hide lock) | Shows: LOCKED (hidden), name, file count, size, locked date | [ ] |
| H02 | Status of locked folder (encrypt) | `lockr status testfolder.vault` | Shows: LOCKED (encrypted), name, file count, size, locked date | [ ] |
| H03 | Status of normal unlocked folder | `lockr status testfolder` (never locked) | Shows: UNLOCKED | [ ] |
| H04 | Status of nonexistent path | `lockr status /nonexistent/path` | Error: path not found | [ ] |
| H05 | List with 0 entries | `lockr list` (empty registry) | Message: "No locked folders." | [ ] |
| H06 | List with multiple entries (mix) | `lockr list` (2 hide + 1 encrypt) | All 3 entries shown with correct mode labels | [ ] |
| H07 | List --json output | `lockr list --json` | Valid JSON array with all entries | [ ] |
| H08 | Stale registry entry (hidden folder deleted manually) | Delete .lockr-* folder, then `lockr unlock testfolder` | Error: hidden folder not found (moved or deleted). Clear message. | [ ] |

---

## I. Interactive Mode (7 scenarios)

Testing the guided menu when running `lockr` without arguments.

| # | Scenario | Command | Expected Result | Status |
|---|----------|---------|-----------------|--------|
| I01 | Launch interactive mode | `lockr` (no args) | ASCII banner + guided menu with 5 options | [ ] |
| I02 | Navigate each menu option | Select each option one by one | Each option flows correctly (Lock, Unlock, Open, Status, List) | [ ] |
| I03 | Invalid directory input | Enter nonexistent path in Lock menu | Validation error, re-prompt | [ ] |
| I04 | Ctrl+C at password prompt | Start lock flow, Ctrl+C during password entry | Clean exit (code 130), no partial state | [ ] |
| I05 | Ctrl+C at confirmation prompt | Start lock flow, Ctrl+C at "Continue?" | Clean exit (code 130), nothing changed | [ ] |
| I06 | No locked folders → manual input | Select Unlock with empty registry | Shows info "No locked folders", prompts for manual path | [ ] |
| I07 | Path with spaces in interactive prompt | Enter `C:\Users\me\My Documents\test folder` in Lock input | Path resolved correctly, lock proceeds | [ ] |

---

## J. Registry & Configuration (8 scenarios)

Testing the `%APPDATA%\lockr\registry.json` persistence layer.

| # | Scenario | Steps | Expected Result | Status |
|---|----------|-------|-----------------|--------|
| J01 | First launch (no config dir) | Delete `%APPDATA%\lockr\`, then `lockr lock testfolder` | Config dir auto-created. Registry file created. Lock succeeds. | [ ] |
| J02 | Registry deleted between lock/unlock | Lock folder, delete registry.json, then unlock | Error: entry not found in registry. Hidden folder still exists on disk. | [ ] |
| J03 | Corrupted registry JSON | Replace registry.json with `{invalid json` | Falls back to empty registry. Previous entries lost. | [ ] |
| J04 | Registry manually edited (path changed) | Edit registry.json, change hiddenPath to wrong value | Unlock fails: hidden folder not found at modified path. | [ ] |
| J05 | Two lockr instances simultaneously | Run `lockr lock folder1` and `lockr lock folder2` at exact same time | Both should succeed. Possible race condition on registry write. | [ ] |
| J06 | %APPDATA% not defined | Unset APPDATA env var, then run lockr | Fallback to `~/AppData/Roaming/lockr`. Should work. | [ ] |
| J07 | Registry file read-only | Set `attrib +r` on registry.json, then lock a folder | Error during registry write. Lock operation: folder renamed but not registered. | [ ] |
| J08 | Large registry (100+ entries) | Add 100+ entries manually, test lock/unlock/list | Performance should remain acceptable. List renders all entries. | [ ] |

---

## K. Password Edge Cases (7 scenarios)

| # | Scenario | Steps | Expected Result | Status |
|---|----------|-------|-----------------|--------|
| K01 | Simple ASCII password | Use "abc123" as password | Lock/unlock works normally | [ ] |
| K02 | Unicode password (emojis) | Use "my-pass-🔒🔑" as password | Lock/unlock works (or clear error if unsupported) | [ ] |
| K03 | Unicode password (CJK / Arabic) | Use "パスワード" or "كلمة" as password | Lock/unlock works (scrypt handles arbitrary bytes) | [ ] |
| K04 | Very long password (>1000 chars) | Paste 1000+ char string as password | Lock/unlock works (scrypt handles any length) | [ ] |
| K05 | Password with special chars | Use `!@#$%^&*()_+-={}[]|;:'",.<>?/\`` as password | Lock/unlock works | [ ] |
| K06 | Password mismatch (3 retries on confirm) | Enter different passwords 3 times at confirm prompt | Lock aborted after 3 mismatches | [ ] |
| K07 | Empty password (if allowed) | Press Enter without typing at password prompt | Behavior depends on prompt validation — document result | [ ] |

---

## L. Windows-Specific Files & Filesystem (9 scenarios)

Edge cases from NTFS features, system files, and Windows filesystem quirks.

| # | Scenario | Steps | Expected Result | Status |
|---|----------|-------|-----------------|--------|
| L01 | Folder with desktop.ini | Lock folder containing `desktop.ini` (custom folder icon) | File preserved after unlock. Folder icon may reset. | [ ] |
| L02 | Folder with Thumbs.db | Lock folder containing `Thumbs.db` (thumbnail cache) | File moved with folder. May be regenerated by Explorer. | [ ] |
| L03 | NTFS Alternate Data Streams (ADS) | Create file with ADS: `echo data > file.txt:hidden`, then lock | ADS preserved after hide lock. May be lost in encrypt mode (tar limitation). | [ ] |
| L04 | Files with restrictive ACLs | Lock folder with custom NTFS ACLs (icacls deny) | Hide mode: ACLs preserved (just rename). Encrypt mode: may fail to read files. | [ ] |
| L05 | Reserved filename (CON, PRN, NUL) | Create folder containing `CON.txt` (if possible), then lock | Windows may not allow creation. If created, lock should handle it. | [ ] |
| L06 | Folder with inherited permissions | Lock folder inside directory with complex permission inheritance | Hide mode: permissions preserved. Encrypt mode: restored with default perms. | [ ] |
| L07 | Files being synced by cloud app | Lock folder while OneDrive/Dropbox is actively syncing | May trigger EBUSY. Retry/fallback should handle it. Cloud app may re-sync. | [ ] |
| L08 | Folder with system attribute files | Lock folder containing files with `attrib +s` | System attribute preserved after hide lock. | [ ] |
| L09 | $RECYCLE.BIN or System Volume Information | Attempt to lock system-protected folder | Should fail with permission error. Never delete system folders. | [ ] |

---

## M. Concurrency & Interruptions (8 scenarios)

Critical scenarios inspired by FolderLock/Cryptomator user reports of data loss during interrupted operations.

| # | Scenario | Steps | Expected Result | Status |
|---|----------|-------|-----------------|--------|
| M01 | Ctrl+C during compression (encrypt) | Start `lockr lock --encrypt`, Ctrl+C during "Compressing..." | No vault file created. Original folder untouched. | [ ] |
| M02 | Ctrl+C during encryption | Start `lockr lock --encrypt`, Ctrl+C during "Encrypting..." | Partial vault may exist. Originals still intact (not yet deleted). | [ ] |
| M03 | Ctrl+C during vault write | Start `lockr lock --encrypt`, Ctrl+C during "Writing vault..." | Partial vault file on disk. Originals still intact. | [ ] |
| M04 | Ctrl+C during original deletion | Start `lockr lock --encrypt`, Ctrl+C during "Removing originals..." | Vault is complete. Some originals remain. Entry marked `partial`. | [ ] |
| M05 | Kill process during lock | `taskkill /F /PID <lockr-pid>` during lock operation | Same as Ctrl+C but more abrupt. Check for partial state. | [ ] |
| M06 | Partial status then re-lock | After M04, check `lockr list` | Entry shows `partial` status. Can manually clean up. | [ ] |
| M07 | Two `lockr lock` on same folder | Run `lockr lock testfolder` in 2 terminals simultaneously | One should succeed, one should fail (folder no longer exists after first rename). | [ ] |
| M08 | Lock during ongoing unlock | Start unlock, then immediately run lock on same path | Should fail — path doesn't exist or is in intermediate state. | [ ] |

---

## N. Limits & Performance (6 scenarios)

Stress testing and resource limits.

| # | Scenario | Steps | Expected Result | Status |
|---|----------|-------|-----------------|--------|
| N01 | 10,000+ files | Create folder with 10,000 small files, lock (hide) | Hide mode: instant rename (single operation). Works. | [ ] |
| N02 | 10,000+ files (encrypt) | Create folder with 10,000 small files, lock (encrypt) | Compression takes time. Watch for RAM usage. Should complete. | [ ] |
| N03 | Single 10+ GB file | Create folder with one 10 GB file, encrypt | CRITICAL: current implementation buffers in memory. May run out of RAM. | [ ] |
| N04 | 100,000+ tiny files (1 KB each) | Create folder with 100K files, lock (encrypt) | Tar creation may be very slow. getFolderStats walk may be slow. | [ ] |
| N05 | Disk nearly full (<100 MB free) | Fill disk to <100 MB free, then encrypt a 50 MB folder | Vault creation may fail (vault ≈ same size as compressed data). Clear error. | [ ] |
| N06 | Deep nesting (>20 levels) | Create folder with 20+ nested directories, lock | Hide mode: works (single rename). Encrypt mode: tar should handle it. | [ ] |

---

## O. Uninstall & Cleanup (4 scenarios)

Inspired by user complaints about FolderLock being impossible to uninstall cleanly.

| # | Scenario | Steps | Expected Result | Status |
|---|----------|-------|-----------------|--------|
| O01 | Clean uninstall with no locked folders | `npm unlink` from lockr directory | `lockr` command removed. No orphaned files. | [ ] |
| O02 | Uninstall with locked folders remaining | Lock 2 folders, then `npm unlink` | `lockr` removed but .lockr-* folders still exist. Registry still at %APPDATA%. | [ ] |
| O03 | Reinstall and recover | After O02, re-link lockr (`npm link`), then `lockr list` | Registry loaded. All entries visible. Unlock works. | [ ] |
| O04 | Manual recovery without lockr | After O02, find .lockr-* folder, run `attrib -h -s`, rename manually | Files accessible without lockr (hide mode is transparent). | [ ] |

---

## P. User Experience & Usability (5 scenarios)

Validating that lockr is intuitive for non-technical users (key differentiator vs. VeraCrypt/Cryptomator complexity).

| # | Scenario | Steps | Expected Result | Status |
|---|----------|-------|-----------------|--------|
| P01 | First-time user experience | Fresh install, run `lockr` | Banner + clear menu. User understands options without docs. | [ ] |
| P02 | Error messages are helpful | Trigger various errors (wrong path, wrong password, etc.) | Each error explains what went wrong AND suggests what to do | [ ] |
| P03 | --help output clarity | `lockr --help`, `lockr lock --help` | Clear description of each command and option | [ ] |
| P04 | Spinner and progress feedback | Run long encrypt operation | User sees spinner with changing text (Compressing → Encrypting → Writing → Verifying) | [ ] |
| P05 | Password feedback | Type password at prompt | Characters shown as `*` (not hidden completely). User knows they're typing. | [ ] |

---

## Summary

| Category | Count | Priority |
|----------|-------|----------|
| A. Paths & Locations | 12 | High |
| B. Hide — Normal | 10 | High |
| C. Hide — CWD & Locks | 8 | High (Windows-specific) |
| D. Encrypt — Normal | 8 | High |
| E. Encrypt — Errors | 10 | Critical |
| F. Secure Deletion | 5 | Medium |
| G. `open` Command | 8 | High |
| H. `status` & `list` | 8 | Medium |
| I. Interactive Mode | 7 | Medium |
| J. Registry & Config | 8 | High |
| K. Password Edge Cases | 7 | Medium |
| L. Windows Files & FS | 9 | High (Windows-specific) |
| M. Concurrency | 8 | Critical |
| N. Limits & Performance | 6 | Medium |
| O. Uninstall & Cleanup | 4 | Low |
| P. User Experience | 5 | Medium |
| **Total** | **123** | |

### Known Risks (from user research)

Based on Reddit, forums, and GitHub issues for similar tools (FolderLock, FolderGuard, Cryptomator, VeraCrypt):

1. **Data loss during interrupted encrypt/decrypt** (Categories M, E) — The #1 complaint. lockr mitigates by verifying vault before deleting originals, but Ctrl+C timing is critical.
2. **Orphaned hidden folders after uninstall** (Category O) — FolderLock users lost data after format. lockr's hide mode is transparent (manual recovery possible).
3. **Cloud sync conflicts** (L07, A09) — Cryptomator users report corruption with cloud-synced vaults. lockr's hide mode renames folders, which may confuse sync engines.
4. **Memory usage on large files** (N03) — Current implementation buffers entire archive in memory before encrypting. Files >2-4 GB may cause out-of-memory errors.
5. **Registry as single point of failure** (J02, J03) — If registry is deleted/corrupted, all hide-mode entries are orphaned. Encrypt-mode vaults are self-contained (less risk).
