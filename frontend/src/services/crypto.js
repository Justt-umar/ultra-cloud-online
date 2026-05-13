/**
 * Client-side AES-256-GCM encryption/decryption using Web Crypto API.
 * Zero-knowledge: files are encrypted in the browser before upload.
 * The server never sees unencrypted data or the passphrase.
 *
 * File format: [16 bytes salt][12 bytes IV][encrypted data][16 bytes auth tag]
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 100000;

/**
 * Derive an AES-256-GCM key from a passphrase using PBKDF2.
 */
async function deriveKey(passphrase, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a File object using AES-256-GCM.
 * Returns a new File with `.enc` extension containing [salt + IV + ciphertext].
 *
 * @param {File} file - The file to encrypt
 * @param {string} passphrase - User's passphrase
 * @returns {Promise<File>} - Encrypted file
 */
export async function encryptFile(file, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);

  const fileData = await file.arrayBuffer();

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileData
  );

  // Combine: salt + iv + encrypted data
  const combined = new Uint8Array(
    salt.length + iv.length + encryptedData.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

  const encryptedFile = new File(
    [combined],
    file.name + '.enc',
    { type: 'application/octet-stream' }
  );

  return encryptedFile;
}

/**
 * Decrypt a File/Blob that was encrypted with encryptFile().
 * Returns a Blob containing the decrypted data.
 *
 * @param {Blob} blob - The encrypted data
 * @param {string} passphrase - User's passphrase
 * @param {string} originalContentType - The original content type for the decrypted blob
 * @returns {Promise<Blob>} - Decrypted blob
 */
export async function decryptBlob(blob, passphrase, originalContentType = 'application/octet-stream') {
  const data = new Uint8Array(await blob.arrayBuffer());

  const salt = data.slice(0, SALT_LENGTH);
  const iv = data.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = data.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(passphrase, salt);

  try {
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new Blob([decryptedData], { type: originalContentType });
  } catch {
    throw new Error('Decryption failed — wrong passphrase or corrupted file');
  }
}

/**
 * Check if a filename indicates an encrypted file.
 */
export function isEncryptedFile(filename) {
  return filename?.endsWith('.enc');
}

/**
 * Get the original filename by removing the .enc extension.
 */
export function getOriginalFilename(encryptedFilename) {
  if (!encryptedFilename?.endsWith('.enc')) return encryptedFilename;
  return encryptedFilename.slice(0, -4);
}
