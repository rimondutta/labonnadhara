import crypto from 'crypto';

const ENCRYPTION_PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
let warnedMissingKey = false;

function getEncryptionKey(): Buffer {
  const configured = process.env.SETTINGS_ENCRYPTION_KEY?.trim();
  if (configured && configured.length >= 16) {
    return Buffer.from(
      crypto.hkdfSync(
        'sha256',
        Buffer.from(configured, 'utf8'),
        Buffer.from('labonnadhara-settings-salt-v1', 'utf8'),
        Buffer.from('aes-256-gcm-settings-key', 'utf8'),
        32
      )
    );
  }

  const fallbackSecret = process.env.NEXTAUTH_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (fallbackSecret) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        '[crypto-settings] SETTINGS_ENCRYPTION_KEY not configured; using domain-separated HKDF derived key. Set SETTINGS_ENCRYPTION_KEY for dedicated key isolation.'
      );
    }
    return Buffer.from(
      crypto.hkdfSync(
        'sha256',
        Buffer.from(fallbackSecret, 'utf8'),
        Buffer.from('labonnadhara-settings-fallback-salt-v1', 'utf8'),
        Buffer.from('aes-256-gcm-settings-fallback-key', 'utf8'),
        32
      )
    );
  }

  throw new Error('SETTINGS_ENCRYPTION_KEY environment variable is required to protect settings secrets.');
}

/**
 * Encrypts a sensitive settings string (API key, token, webhook secret) with AES-256-GCM.
 * Empty values remain empty strings. Already-encrypted payloads are returned as-is.
 */
export function encryptSettingSecret(plaintext: string | null | undefined): string {
  const value = typeof plaintext === 'string' ? plaintext.trim() : '';
  if (!value) return '';
  if (value.startsWith(ENCRYPTION_PREFIX)) return value;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypts an `enc:v1:` encrypted secret. Seamlessly returns legacy plaintext values unchanged
 * until the next admin save upgrades them to encrypted storage.
 */
export function decryptSettingSecret(stored: string | null | undefined): string {
  const value = typeof stored === 'string' ? stored.trim() : '';
  if (!value) return '';
  if (!value.startsWith(ENCRYPTION_PREFIX)) {
    return value;
  }

  try {
    const rest = value.slice(ENCRYPTION_PREFIX.length);
    const parts = rest.split(':');
    if (parts.length !== 3) return '';

    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[crypto-settings] Failed to decrypt secret:', err instanceof Error ? err.message : 'Error');
    return '';
  }
}

/**
 * Masks a stored secret (plaintext or encrypted) for safe API response display.
 */
export function maskSettingSecret(stored: string | null | undefined): string {
  const plain = decryptSettingSecret(stored);
  if (!plain) return '';
  if (plain.length <= 4) return '••••';
  return `••••••••${plain.slice(-4)}`;
}

/**
 * Checks whether an incoming admin form value is an unmodified mask placeholder
 * rather than a newly typed secret.
 */
export function isMaskedSecretPlaceholder(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('••••') || /^\*{4,}$/.test(trimmed);
}
