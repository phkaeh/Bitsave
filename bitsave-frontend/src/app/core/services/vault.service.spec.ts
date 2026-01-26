import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { VaultService, Cipher, CipherRequest } from './vault.service';
import { CryptoService } from './crypto.service';
import { provideHttpClient } from "@angular/common/http";
import { ConfigService } from "./config.service";

describe('VaultService', () => {
    let service: VaultService;
    let httpMock: HttpTestingController;
    let cryptoService: MockedObject<CryptoService>;
    let mockKey: CryptoKey;
    let configService: ConfigService;

    const mockCipherData = {
        title: 'Test Login',
        username: 'testuser',
        password: 'testpass',
        website: 'https://test.com'
    };

    const mockConfigService = {
        apiUrl: 'http://localhost:8080/api',
        apiKey: 'test-api-key',
        isDemoMode: true
    };

    const mockEncryptedCipher: Cipher = {
        id: '123',
        type: 1,
        data: 'encrypted-data-blob',
        favorite: false,
        created: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    };

    const mockDecryptedCipher: Cipher = {
        ...mockEncryptedCipher,
        data: mockCipherData
    };

    const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

    beforeEach(() => {
        const cryptoSpy = {
            encrypt: vi.fn().mockName("CryptoService.encrypt"),
            decrypt: vi.fn().mockName("CryptoService.decrypt")
        };
        mockKey = {} as CryptoKey;

        TestBed.configureTestingModule({
            providers: [
                VaultService,
                provideHttpClient(),
                provideHttpClientTesting(), 
                { provide: CryptoService, useValue: cryptoSpy },
                { provide: ConfigService, useValue: mockConfigService }
            ]
        });

        service = TestBed.inject(VaultService);
        httpMock = TestBed.inject(HttpTestingController);
        configService = TestBed.inject(ConfigService);
        cryptoService = TestBed.inject(CryptoService) as MockedObject<CryptoService>;
    });

    afterEach(() => {
        httpMock.verify();
        // Reset signals
        service.ciphers.set([]);
        service.selectedCipher.set(null);
        service.searchTerm.set('');
        service.currentFilter.set('all');
    });

    describe('Signal State Management', () => {
        it('should initialize with empty ciphers', () => {
            expect(service.ciphers()).toEqual([]);
        });

        it('should initialize with no selected cipher', () => {
            expect(service.selectedCipher()).toBeNull();
        });

        it('should initialize with empty search term', () => {
            expect(service.searchTerm()).toBe('');
        });

        it('should initialize with "all" filter', () => {
            expect(service.currentFilter()).toBe('all');
        });
    });

    describe('filteredCiphers computed signal', () => {
        beforeEach(() => {
            const testCiphers: Cipher[] = [
                { ...mockDecryptedCipher, id: '1', favorite: true, deletedDate: undefined },
                { ...mockDecryptedCipher, id: '2', favorite: false, deletedDate: undefined },
                { ...mockDecryptedCipher, id: '3', favorite: true, deletedDate: '2024-01-01' }
            ];
            service.ciphers.set(testCiphers);
        });

        it('should filter favorites', () => {
            service.currentFilter.set('favorites');
            const filtered = service.filteredCiphers();

            expect(filtered.length).toBe(1);
            expect(filtered[0].id).toBe('1');
        });

        it('should filter trash', () => {
            service.currentFilter.set('trash');
            const filtered = service.filteredCiphers();

            expect(filtered.length).toBe(1);
            expect(filtered[0].id).toBe('3');
        });

        it('should filter active items (not deleted)', () => {
            service.currentFilter.set('all');
            const filtered = service.filteredCiphers();

            expect(filtered.length).toBe(2);
            expect(filtered.every(c => !c.deletedDate)).toBe(true);
        });

        it('should search by title', () => {
            service.ciphers.set([
                { ...mockDecryptedCipher, id: '1', data: { title: 'Google Login' } },
                { ...mockDecryptedCipher, id: '2', data: { title: 'Facebook Login' } }
            ]);

            service.searchTerm.set('google');
            const filtered = service.filteredCiphers();

            expect(filtered.length).toBe(1);
            expect(filtered[0].id).toBe('1');
        });

        it('should search by username', () => {
            service.ciphers.set([
                { ...mockDecryptedCipher, id: '1', data: { username: 'alice@example.com' } },
                { ...mockDecryptedCipher, id: '2', data: { username: 'jane@example.com' } }
            ]);

            service.searchTerm.set('alice');
            const filtered = service.filteredCiphers();

            expect(filtered.length).toBe(1);
            expect(filtered[0].id).toBe('1');
        });

        it('should be case-insensitive', () => {
            service.ciphers.set([
                { ...mockDecryptedCipher, id: '1', data: { title: 'GitHub' } }
            ]);

            service.searchTerm.set('GITHUB');
            const filtered = service.filteredCiphers();

            expect(filtered.length).toBe(1);
        });

        it('should combine filter and search', () => {
            service.ciphers.set([
                { ...mockDecryptedCipher, id: '1', favorite: true, data: { title: 'Google' } },
                { ...mockDecryptedCipher, id: '2', favorite: true, data: { title: 'Facebook' } },
                { ...mockDecryptedCipher, id: '3', favorite: false, data: { title: 'Google Backup' } }
            ]);

            service.currentFilter.set('favorites');
            service.searchTerm.set('google');
            const filtered = service.filteredCiphers();

            expect(filtered.length).toBe(1);
            expect(filtered[0].id).toBe('1');
        });
    });

    describe('getAllCiphers', () => {
        it('should fetch and decrypt all ciphers', async () => {
            const encryptedCiphers = [mockEncryptedCipher];
            cryptoService.decrypt.mockReturnValue(Promise.resolve(JSON.stringify(mockCipherData)));

            service.getAllCiphers(mockKey).subscribe({
                next: (ciphers) => {
                    expect(ciphers.length).toBe(1);
                    expect(ciphers[0].data).toEqual(mockCipherData);
                    expect(service.ciphers().length).toBe(1);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers`);
            expect(req.request.method).toBe('GET');
            req.flush(encryptedCiphers);
        });

        it('should handle empty cipher list', async () => {
            service.getAllCiphers(mockKey).subscribe({
                next: (ciphers) => {
                    expect(ciphers).toEqual([]);
                    expect(service.ciphers()).toEqual([]);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers`);
            req.flush([]);
        });

        it('should handle decryption errors', async () => {
            cryptoService.decrypt.mockReturnValue(Promise.reject(new Error('Decryption failed')));

            service.getAllCiphers(mockKey).subscribe({
                error: (error) => {
                    expect(error.message).toBe('Decryption failed');
                    ;
                }
            });
            
            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers`);
            req.flush([mockEncryptedCipher]);
        });
    });

    describe('createCipher', () => {
        it('should create and encrypt new cipher', async () => {
            const request: CipherRequest = {
                type: 1,
                data: JSON.stringify(mockCipherData),
                favorite: false
            };

            cryptoService.encrypt.mockReturnValue(Promise.resolve('encrypted-blob'));

            service.createCipher(request, mockKey).subscribe({
                next: (cipher) => {
                    expect(cipher.data).toEqual(mockCipherData);
                    expect(service.ciphers().length).toBe(1);
                    expect(service.selectedCipher()).toEqual(cipher);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body.data).toBe('encrypted-blob');
            req.flush(mockEncryptedCipher);
        });

        it('should add cipher to state', async () => {
            const request: CipherRequest = {
                type: 1,
                data: JSON.stringify(mockCipherData),
                favorite: false
            };

            cryptoService.encrypt.mockReturnValue(Promise.resolve('encrypted-blob'));

            service.createCipher(request, mockKey).subscribe({
                next: () => {
                    expect(service.ciphers().length).toBe(1);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers`);
            req.flush(mockEncryptedCipher);
        });
    });

    describe('updateCipher', () => {
        it('should update and re-encrypt cipher', async () => {
            const updatedData = { ...mockCipherData, title: 'Updated Title' };
            const request: CipherRequest = {
                type: 1,
                data: JSON.stringify(updatedData),
                favorite: true
            };

            service.ciphers.set([mockDecryptedCipher]);
            cryptoService.encrypt.mockReturnValue(Promise.resolve('new-encrypted-blob'));

            service.updateCipher('123', request, mockKey).subscribe({
                next: (cipher) => {
                    expect(cipher.data).toEqual(updatedData);
                    expect(service.ciphers()[0].data).toEqual(updatedData);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers/123`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body.data).toBe('new-encrypted-blob');
            req.flush({ ...mockEncryptedCipher, id: '123' });
        });

        it('should update cipher in state', async () => {
            const request: CipherRequest = {
                type: 1,
                data: JSON.stringify(mockCipherData),
                favorite: true
            };

            service.ciphers.set([mockDecryptedCipher]);
            cryptoService.encrypt.mockReturnValue(Promise.resolve('encrypted'));

            service.updateCipher('123', request, mockKey).subscribe({
                next: () => {
                    const updated = service.ciphers().find(c => c.id === '123');
                    expect(updated).toBeTruthy();
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers/123`);
            req.flush(mockEncryptedCipher);
        });
    });

    describe('deleteCipher (soft delete)', () => {
        it('should soft delete cipher', async () => {
            service.ciphers.set([mockDecryptedCipher]);

            service.deleteCipher('123').subscribe({
                next: () => {
                    const cipher = service.ciphers().find(c => c.id === '123');
                    expect(cipher?.deletedDate).toBeTruthy();
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers/123`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });

        it('should clear selected cipher if deleted', async () => {
            service.ciphers.set([mockDecryptedCipher]);
            service.selectedCipher.set(mockDecryptedCipher);

            service.deleteCipher('123').subscribe({
                next: () => {
                    expect(service.selectedCipher()).toBeNull();
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers/123`);
            req.flush(null);
        });
    });

    describe('permanentDeleteCipher', () => {
        it('should permanently delete cipher', async () => {
            service.ciphers.set([mockDecryptedCipher]);

            service.permanentDeleteCipher('123').subscribe({
                next: () => {
                    expect(service.ciphers().length).toBe(0);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers/123/permanent-delete`);
            expect(req.request.method).toBe('DELETE');
            req.flush(null);
        });

        it('should remove cipher from state', async () => {
            service.ciphers.set([mockDecryptedCipher, { ...mockDecryptedCipher, id: '456' }]);

            service.permanentDeleteCipher('123').subscribe({
                next: () => {
                    expect(service.ciphers().length).toBe(1);
                    expect(service.ciphers()[0].id).toBe('456');
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers/123/permanent-delete`);
            req.flush(null);
        });
    });

    describe('restoreCipher', () => {
        it('should restore deleted cipher', async () => {
            const deletedCipher = { ...mockDecryptedCipher, deletedDate: '2024-01-01' };
            service.ciphers.set([deletedCipher]);

            service.restoreCipher('123').subscribe({
                next: () => {
                    const cipher = service.ciphers().find(c => c.id === '123');
                    expect(cipher?.deletedDate).toBeUndefined();
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers/123/restore`);
            expect(req.request.method).toBe('POST');
            req.flush(null);
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors', async () => {
            service.getAllCiphers(mockKey).subscribe({
                error: (error) => {
                    expect(error.status).toBe(500);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers`);
            req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
        });

        it('should handle unauthorized errors', async () => {
            const request: CipherRequest = {
                type: 1,
                data: JSON.stringify(mockCipherData),
                favorite: false
            };

            cryptoService.encrypt.mockReturnValue(Promise.resolve('encrypted'));

            service.createCipher(request, mockKey).subscribe({
                error: (error) => {
                    expect(error.status).toBe(401);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/ciphers`);
            req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
        });
    });
});
