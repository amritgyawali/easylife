import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Device-local PIN fallback for the app lock screen. This PIN is unrelated
 * to the account password — it never leaves the device and is not sent to
 * Supabase. Only a salted SHA-256 hash is persisted (in SecureStore, which
 * is itself backed by iOS Keychain / Android Keystore), never the raw PIN.
 */

const PIN_HASH_KEY = 'lifeos.pin_hash';
const PIN_SALT_KEY = 'lifeos.pin_salt';

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function isPinSet(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
  return hash !== null;
}

export async function setPin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [salt, storedHash] = await Promise.all([
    SecureStore.getItemAsync(PIN_SALT_KEY),
    SecureStore.getItemAsync(PIN_HASH_KEY),
  ]);

  if (!salt || !storedHash) return false;

  const candidateHash = await hashPin(pin, salt);
  return candidateHash === storedHash;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await SecureStore.deleteItemAsync(PIN_SALT_KEY);
}
