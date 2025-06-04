import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits (required for AES-256-CBC)
const SALT = Buffer.from('your-static-or-dynamic-salt');

// Promisify zlib functions
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Derive a 256-bit key from a passphrase.
 */
function deriveKey(password: string): Buffer {
  return crypto.pbkdf2Sync(password, SALT, 100_000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts a string and returns the encrypted buffer.
 */
export async function encryptString(text: string, password: string): Promise<Buffer> {
  const key = deriveKey(password);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Compress the text
  const compressed = await gzip(text);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(compressed),
    cipher.final()
  ]);

  // Prepend IV to the encrypted data
  return Buffer.concat([iv, encrypted]);
}

/**
 * Decrypts a buffer back into a string.
 */
export async function decryptString(encryptedData: Buffer, password: string): Promise<string> {
  const iv = encryptedData.slice(0, IV_LENGTH);
  const encrypted = encryptedData.slice(IV_LENGTH);

  const key = deriveKey(password);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  // Decompress the data
  const decompressed = await gunzip(decrypted);
  return decompressed.toString('utf8');
} 