import { Injectable, signal } from '@angular/core';
import { argon2id } from '@noble/hashes/argon2.js';

/**
 * Service responsible for all cryptographic operations within the application.
 * It handles client-side key derivation using Argon2id and authenticated 
 * encryption/decryption using AES-GCM. 
 * @security Encryption keys are stored in volatile memory (Signals) and 
 * are never persisted to localStorage or cookies.
 */
@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  
  /**
   * Reactive signal holding the master encryption key.
   * Being a signal, it allows the application to react to the 'locked/unlocked' state.
   */
  private encryptionKey = signal<CryptoKey | null>(null);

  /**
   * Sets the master encryption key in volatile memory.
   * @param key - The derived AES-GCM CryptoKey.
   */
  async setEncryptionKey(key: CryptoKey) {
    this.encryptionKey.set(key);
  }

  /**
   * Retrieves the current encryption key from memory.
   * @returns A Promise resolving to the CryptoKey or null if the vault is locked.
   */
  async getEncryptionKey(): Promise<CryptoKey | null> {
    return this.encryptionKey();
  }

  /**
   * Checks if an encryption key is currently present in memory.
   * @returns Boolean indicating if the vault is unlocked.
   */
  hasEncryptionKey(): boolean {
    return this.encryptionKey() !== null;
  }

  /**
   * Purges the encryption key from memory.
   * Should be called during logout or when the vault is manually locked.
   */
  clearEncryptionKey(): void {
    this.encryptionKey.set(null);
  }

  /**
   * Derives a deterministic authentication hash for backend validation.
   * Uses Argon2id to ensure high resistance against GPU-based brute-force attacks.
   * @param masterPassword - The user's plain-text master password.
   * @param email - Used as a component for salt generation.
   * @returns A Base64 encoded string of the derived authentication hash.
   */
  async deriveAuthKey(masterPassword: string, email: string): Promise<string> {
    const salt = await this.generateSalt(email, 'auth');
    const passwordBytes = new TextEncoder().encode(masterPassword);
    
    // Argon2id parameters: 64MB RAM, 3 iterations, 4 parallel threads
    const hash = argon2id(passwordBytes, salt, {
      t: 3,       
      m: 65536,    
      p: 4         
    });
    return this.uint8ArrayToBase64(hash);
  }

  /**
   * Derives the master encryption key for local data protection.
   * This key is used for AES-GCM operations and never leaves the client.
   * @param masterPassword - The user's plain-text master password.
   * @param email - Used as a component for salt generation.
   * @returns A CryptoKey object suitable for AES-GCM operations.
   */
  async deriveEncryptionKey(masterPassword: string, email: string): Promise<CryptoKey> {
    const salt = await this.generateSalt(email, 'encryption');
    const passwordBytes = new TextEncoder().encode(masterPassword);
    
    // Argon2id parameters: 64MB RAM, 3 iterations, 4 parallel threads
    const hash = argon2id(passwordBytes, salt, {
      t: 3,
      m: 65536,
      p: 4
    });
    
    const hashArray = new Uint8Array(hash);
    return await window.crypto.subtle.importKey(
      'raw',
      hashArray,
      { name: 'AES-GCM' },
      false, // Key is not extractable for added security
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generates a deterministic salt based on the user's email and a specific purpose.
   * This ensures that the same password results in different keys for Auth vs Encryption.
   * @param email - User's email address.
   * @param purpose - String identifier (e.g., 'auth' or 'encryption').
   * @returns A 16-byte salt as Uint8Array.
   */
  private async generateSalt(email: string, purpose: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase() + purpose);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer).slice(0, 16);
  }

  /**
   * Encrypts a plaintext string using AES-GCM.
   * Generates a unique 12-byte IV for every encryption operation.
   * @param plaintext - The data to be encrypted.
   * @param key - The master encryption CryptoKey.
   * @returns A Base64 encoded string containing [IV (12 bytes) + Ciphertext + Tag].
   */
  async encrypt(plaintext: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate a cryptographically strong random Initialization Vector (IV)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );
    
    const encryptedArray = new Uint8Array(encrypted);
    
    // Concatenate IV and Ciphertext for storage
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);
    
    return this.uint8ArrayToBase64(combined);
  }

  /**
   * Decrypts a Base64 encoded AES-GCM payload.
   * Extracts the IV from the first 12 bytes of the payload.
   * @param encryptedData - Base64 string containing [IV + Ciphertext].
   * @param key - The master encryption CryptoKey.
   * @returns The decrypted plaintext string.
   * @throws Will throw an error if decryption or integrity check (GCM tag) fails.
   */
  async decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    const combined = this.base64ToUint8Array(encryptedData);
    
    // Extract the IV (first 12 bytes) and the ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Helper: Converts a Uint8Array to a Base64 encoded string.
   */
  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Helper: Converts a Base64 encoded string back to a Uint8Array.
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}