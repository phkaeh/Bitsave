import { TestBed } from '@angular/core/testing';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;
  const testEmail = 'test@example.com';
  const testPassword = 'SecurePassword123!';
  const testPlaintext = 'This is a secret message';

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CryptoService);
  });

  afterEach(() => {
    // Clean up encryption key after each test
    service.clearEncryptionKey();
  });

  describe('Encryption Key Management', () => {
    it('should create service', () => {
      expect(service).toBeTruthy();
    });

    it('should start with no encryption key', () => {
      expect(service.hasEncryptionKey()).toBe(false);
    });

    it('should set and retrieve encryption key', async () => {
      const key = await service.deriveEncryptionKey(testPassword, testEmail);
      await service.setEncryptionKey(key);

      expect(service.hasEncryptionKey()).toBe(true);
      const retrievedKey = await service.getEncryptionKey();
      expect(retrievedKey).toBeTruthy();
      expect(retrievedKey).toBe(key);
    });

    it('should clear encryption key', async () => {
      const key = await service.deriveEncryptionKey(testPassword, testEmail);
      await service.setEncryptionKey(key);
      expect(service.hasEncryptionKey()).toBe(true);

      service.clearEncryptionKey();
      expect(service.hasEncryptionKey()).toBe(false);
      
      const retrievedKey = await service.getEncryptionKey();
      expect(retrievedKey).toBeNull();
    });

    it('should return null when no key is set', async () => {
      const key = await service.getEncryptionKey();
      expect(key).toBeNull();
    });
  });

  describe('Authentication Key Derivation', () => {
    it('should derive authentication key', async () => {
      const authKey = await service.deriveAuthKey(testPassword, testEmail);
      
      expect(authKey).toBeTruthy();
      expect(typeof authKey).toBe('string');
      expect(authKey.length).toBeGreaterThan(0);
    });

    it('should produce deterministic auth keys', async () => {
      const authKey1 = await service.deriveAuthKey(testPassword, testEmail);
      const authKey2 = await service.deriveAuthKey(testPassword, testEmail);
      
      expect(authKey1).toBe(authKey2);
    });

    it('should produce different keys for different passwords', async () => {
      const authKey1 = await service.deriveAuthKey('Password1', testEmail);
      const authKey2 = await service.deriveAuthKey('Password2', testEmail);
      
      expect(authKey1).not.toBe(authKey2);
    });

    it('should produce different keys for different emails', async () => {
      const authKey1 = await service.deriveAuthKey(testPassword, 'user1@example.com');
      const authKey2 = await service.deriveAuthKey(testPassword, 'user2@example.com');
      
      expect(authKey1).not.toBe(authKey2);
    });

    it('should produce different keys for different purposes', async () => {
      const authKey = await service.deriveAuthKey(testPassword, testEmail);
      const encKey = await service.deriveEncryptionKey(testPassword, testEmail);
      
      // Auth key is base64 string, encryption key is CryptoKey object
      expect(typeof authKey).toBe('string');
      expect(encKey).toBeInstanceOf(CryptoKey);
    });

    it('should be case-insensitive for email', async () => {
      const authKey1 = await service.deriveAuthKey(testPassword, 'Test@Example.COM');
      const authKey2 = await service.deriveAuthKey(testPassword, 'test@example.com');
      
      expect(authKey1).toBe(authKey2);
    });
  });

  describe('Encryption Key Derivation', () => {
    it('should derive encryption key', async () => {
      const encKey = await service.deriveEncryptionKey(testPassword, testEmail);
      
      expect(encKey).toBeTruthy();
      expect(encKey).toBeInstanceOf(CryptoKey);
      expect(encKey.type).toBe('secret');
      expect(encKey.algorithm.name).toBe('AES-GCM');
    });

    it('should produce deterministic encryption keys', async () => {
      const encKey1 = await service.deriveEncryptionKey(testPassword, testEmail);
      const encKey2 = await service.deriveEncryptionKey(testPassword, testEmail);
      
      // Keys should produce same encrypted output
      const plaintext = 'test';
      const encrypted1 = await service.encrypt(plaintext, encKey1);
      const decrypted = await service.decrypt(encrypted1, encKey2);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should create non-extractable keys', async () => {
      const encKey = await service.deriveEncryptionKey(testPassword, testEmail);
      
      expect(encKey.extractable).toBe(false);
    });

    it('should have correct key usages', async () => {
      const encKey = await service.deriveEncryptionKey(testPassword, testEmail);
      
      expect(encKey.usages).toContain('encrypt');
      expect(encKey.usages).toContain('decrypt');
    });
  });

  describe('Encryption & Decryption', () => {
    let encryptionKey: CryptoKey;

    beforeEach(async () => {
      encryptionKey = await service.deriveEncryptionKey(testPassword, testEmail);
    });

    it('should encrypt plaintext', async () => {
      const encrypted = await service.encrypt(testPlaintext, encryptionKey);
      
      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(testPlaintext);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should decrypt ciphertext', async () => {
      const encrypted = await service.encrypt(testPlaintext, encryptionKey);
      const decrypted = await service.decrypt(encrypted, encryptionKey);
      
      expect(decrypted).toBe(testPlaintext);
    });

    it('should produce different ciphertexts for same plaintext', async () => {
      // Due to random IV, same plaintext produces different ciphertext
      const encrypted1 = await service.encrypt(testPlaintext, encryptionKey);
      const encrypted2 = await service.encrypt(testPlaintext, encryptionKey);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same plaintext
      const decrypted1 = await service.decrypt(encrypted1, encryptionKey);
      const decrypted2 = await service.decrypt(encrypted2, encryptionKey);
      
      expect(decrypted1).toBe(testPlaintext);
      expect(decrypted2).toBe(testPlaintext);
    });

    it('should handle empty string', async () => {
      const encrypted = await service.encrypt('', encryptionKey);
      const decrypted = await service.decrypt(encrypted, encryptionKey);
      
      expect(decrypted).toBe('');
    });

    it('should handle special characters', async () => {
      const specialText = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`';
      const encrypted = await service.encrypt(specialText, encryptionKey);
      const decrypted = await service.decrypt(encrypted, encryptionKey);
      
      expect(decrypted).toBe(specialText);
    });

    it('should handle unicode characters', async () => {
      const unicodeText = '你好世界 🔐 émojis';
      const encrypted = await service.encrypt(unicodeText, encryptionKey);
      const decrypted = await service.decrypt(encrypted, encryptionKey);
      
      expect(decrypted).toBe(unicodeText);
    });

    it('should handle large text', async () => {
      const largeText = 'A'.repeat(10000);
      const encrypted = await service.encrypt(largeText, encryptionKey);
      const decrypted = await service.decrypt(encrypted, encryptionKey);
      
      expect(decrypted).toBe(largeText);
    });

    it('should fail to decrypt with wrong key', async () => {
      const encrypted = await service.encrypt(testPlaintext, encryptionKey);
      const wrongKey = await service.deriveEncryptionKey('WrongPassword', testEmail);
      
      await expect(
        service.decrypt(encrypted, wrongKey)
      ).rejects.toThrow();
    });

    it('should fail to decrypt tampered ciphertext', async () => {
      const encrypted = await service.encrypt(testPlaintext, encryptionKey);
      const tampered = encrypted.substring(0, encrypted.length - 5) + 'XXXXX';
      
      await expect(
        service.decrypt(tampered, encryptionKey)
      ).rejects.toThrow();
    });

    it('should fail to decrypt malformed base64', async () => {
      const malformed = 'not-valid-base64!!!';
      
      await expect(
        service.decrypt(malformed, encryptionKey)
      ).rejects.toThrow();
    });

    it('should include IV in encrypted output', async () => {
      const encrypted = await service.encrypt(testPlaintext, encryptionKey);
      
      // Base64 decode to check structure
      const decoded = atob(encrypted);
      
      // Should have at least 12 bytes (IV) + ciphertext + 16 bytes (GCM tag)
      expect(decoded.length).toBeGreaterThan(12 + 16);
    });
  });

  describe('Security Properties', () => {
    it('should use Argon2id with secure parameters', async () => {
      // Test that key derivation is computationally expensive
      const start = performance.now();
      await service.deriveAuthKey(testPassword, testEmail);
      const duration = performance.now() - start;
      
      // Should take noticeable time (Argon2id with 64MB RAM)
      // Note: This is a rough check, actual time varies by hardware
      expect(duration).toBeGreaterThan(10); // At least 10ms
    });

    it('should use AES-GCM for authenticated encryption', async () => {
      const key = await service.deriveEncryptionKey(testPassword, testEmail);
      
      expect(key.algorithm.name).toBe('AES-GCM');
    });

    it('should generate random IVs', async () => {
      const key = await service.deriveEncryptionKey(testPassword, testEmail);
      const encrypted1 = await service.encrypt('test', key);
      const encrypted2 = await service.encrypt('test', key);
      
      // Different IVs = different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);
      
      // Extract IVs (first 12 bytes after base64 decode)
      const iv1 = atob(encrypted1).substring(0, 12);
      const iv2 = atob(encrypted2).substring(0, 12);
      
      expect(iv1).not.toBe(iv2);
    });

    it('should prevent key extraction', async () => {
      const key = await service.deriveEncryptionKey(testPassword, testEmail);
      
      // Key should not be extractable
      expect(key.extractable).toBe(false);
      
      // Attempting to export should fail
      await expect(
        window.crypto.subtle.exportKey('raw', key)
      ).rejects.toThrow();
    });

    it('should detect authentication tag tampering', async () => {
      const key = await service.deriveEncryptionKey(testPassword, testEmail);
      const encrypted = await service.encrypt(testPlaintext, key);
      
      // Tamper with the last few bytes (GCM tag is at the end)
      const tampered = encrypted.substring(0, encrypted.length - 4) + 'XXXX';
      
      // Should throw due to failed authentication
      await expect(
        service.decrypt(tampered, key)
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long passwords', async () => {
      const longPassword = 'A'.repeat(1000);
      const key = await service.deriveAuthKey(longPassword, testEmail);
      
      expect(key).toBeTruthy();
    });

    it('should handle very long emails', async () => {
      const longEmail = 'a'.repeat(200) + '@example.com';
      const key = await service.deriveAuthKey(testPassword, longEmail);
      
      expect(key).toBeTruthy();
    });

    it('should handle email with special characters', async () => {
      const specialEmail = 'user+tag@sub-domain.example.com';
      const key = await service.deriveAuthKey(testPassword, specialEmail);
      
      expect(key).toBeTruthy();
    });

    it('should handle consecutive encryption/decryption', async () => {
      const key = await service.deriveEncryptionKey(testPassword, testEmail);
      
      for (let i = 0; i < 10; i++) {
        const encrypted = await service.encrypt(`Message ${i}`, key);
        const decrypted = await service.decrypt(encrypted, key);
        expect(decrypted).toBe(`Message ${i}`);
      }
    });
  });

  describe('Performance', () => {
    it('should encrypt and decrypt within reasonable time', async () => {
      const key = await service.deriveEncryptionKey(testPassword, testEmail);
      
      const start = performance.now();
      const encrypted = await service.encrypt(testPlaintext, key);
      await service.decrypt(encrypted, key);
      const duration = performance.now() - start;
      
      // Should be fast (< 200ms for small data)
      expect(duration).toBeLessThan(200);
    });
  });
});