// utils/encryption.ts
import { config } from "../config.js";
import CryptoJS from "crypto-js";

export function encrypt(data: string, password: string): string {
  return CryptoJS.AES.encrypt(data, password).toString();
}

export function decrypt(ciphertext: string, password: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, password);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Encrypt a PIN using the configured encryption key with deterministic output
 * This ensures the same PIN always produces the same encrypted result for comparison
 */
export function encryptPin(pin: string): string {
  const encryptionKey = config.SYSTEM.PIN_ENCRYPTION_KEY;

  // Create a deterministic salt from the encryption key
  // This ensures the same PIN always produces the same encrypted output
  const deterministicSalt = CryptoJS.SHA256(
    encryptionKey + "pin-salt-not-secret"
  )
    .toString()
    .substring(0, 16);

  // Use PBKDF2 for deterministic key derivation
  const key = CryptoJS.PBKDF2(encryptionKey, deterministicSalt, {
    keySize: 256 / 32,
    iterations: 1000,
  });

  // Use a fixed IV derived from the PIN and salt for deterministic encryption
  const fixedIV = CryptoJS.SHA256(pin + deterministicSalt)
    .toString()
    .substring(0, 32);
  const iv = CryptoJS.enc.Hex.parse(fixedIV);

  // Encrypt with fixed IV to ensure deterministic output
  const encrypted = CryptoJS.AES.encrypt(pin, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return encrypted.toString();
}
