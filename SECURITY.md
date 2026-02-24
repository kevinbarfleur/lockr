# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in lockr, please report it responsibly:

1. **Do NOT open a public GitHub issue**
2. Email: open a [private security advisory](https://github.com/kevinbarfleur/lockr/security/advisories/new) on GitHub
3. Include: description, steps to reproduce, potential impact

You should receive a response within 48 hours. If confirmed, a fix will be prioritized and a new release issued.

## Security Model

lockr offers two locking modes with different security guarantees:

- **Hide mode** (default): casual protection only — files are renamed and hidden, not encrypted. An advanced user with "show hidden files" enabled can find them.
- **Encrypt mode** (`--encrypt`): AES-256-GCM with scrypt key derivation. Files are compressed, encrypted, and originals are securely deleted (2-pass overwrite).

For full details, see the [Security section](README.md#security) in the README.

## Dependencies

lockr uses a minimal set of well-maintained dependencies. Dependabot is enabled to automatically flag and update vulnerable packages.
