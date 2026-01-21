import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, switchMap, from } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CryptoService } from './crypto.service';

export interface Cipher {
  id: string;
  type: number;
  data: any; 
  favorite: boolean;
  deletedDate?: string;
  created: string;
  updatedAt: string;
}

export interface CipherRequest {
  type: number;
  data: string;
  favorite: boolean;
}

/**
 * Service responsible for managing vault items (Ciphers).
 * Implements a reactive data flow where sensitive information is decrypted
 * on-the-fly after being fetched from the server.
 * @security Plaintext data exists only within this service's Signals and is 
 * never sent to the backend unencrypted.
 */
@Injectable({
  providedIn: 'root',
})
export class VaultService {
  private apiUrl = `${environment.apiUrl}`;

  /** The master list of all decrypted vault items. */
  ciphers = signal<Cipher[]>([]);
  
  /** The currently active cipher for detail views or editing. */
  selectedCipher = signal<Cipher | null>(null);
  
  /** Current search query used for real-time filtering. */
  searchTerm = signal<string>('');
  
  /** Current UI filter category. */
  currentFilter = signal<'all' | 'favorites' | 'trash'>('all');

  /**
   * Reactive computed signal that returns a filtered and searched list of ciphers.
   * Handles trash logic, favorites, and multi-field text search automatically.
   */
  filteredCiphers = computed(() => {
    const all = this.ciphers();
    const term = this.searchTerm().toLowerCase().trim();
    const filter = this.currentFilter();
    
    let filtered: Cipher[];
    switch(filter) {
      case 'favorites':
        filtered = all.filter(c => !c.deletedDate && c.favorite);
        break;
      case 'trash':
        filtered = all.filter(c => c.deletedDate);
        break;
      default:
        filtered = all.filter(c => !c.deletedDate);
    }
    
    if (!term) return filtered;
    return filtered.filter(c => {
      const title = (c.data?.title || '').toLowerCase();
      const username = (c.data?.username || '').toLowerCase();
      const website = (c.data?.website || '').toLowerCase();
      const notes = (c.data?.notes || '').toLowerCase();
      return title.includes(term) || 
             username.includes(term) || 
             website.includes(term) || 
             notes.includes(term);
    });
  });

  private readonly http = inject(HttpClient);
  private readonly cryptoService = inject(CryptoService);

  /**
   * Fetches all encrypted ciphers from the server and decrypts them locally.
   * @param key - The master CryptoKey required for decryption.
   * @returns An Observable of the decrypted Cipher array.
   */
  getAllCiphers(key: CryptoKey): Observable<Cipher[]> {
    return this.http.get<Cipher[]>(`${this.apiUrl}/v1/ciphers`).pipe(
      switchMap(async (data) => {
        const decryptedCiphers = await Promise.all(
          data.map(async (cipher) => {
            const decryptedData = await this.cryptoService.decrypt(cipher.data, key);
            return {
              ...cipher,
              data: typeof decryptedData === 'string' ? JSON.parse(decryptedData) : decryptedData
            };
          })
        );
        return decryptedCiphers;
      }),
      tap(decryptedData => this.ciphers.set(decryptedData)),
      catchError(err => throwError(() => err))
    );
  }

  /**
   * Updates an existing vault item.
   * Encrypts the sensitive data block before transmitting it to the backend.
   * @param id - Unique identifier of the cipher.
   * @param request - The updated cipher data.
   * @param key - The master CryptoKey for encryption.
   */
  updateCipher(id: string, request: CipherRequest, key: CryptoKey): Observable<Cipher> {
    return from(this.cryptoService.encrypt(request.data, key)).pipe(
      switchMap(encryptedData => {
        const encryptedRequest = { ...request, data: encryptedData };
        return this.http.put<Cipher>(`${this.apiUrl}/v1/ciphers/${id}`, encryptedRequest);
      }),
      switchMap(async (updated) => ({
        ...updated,
        data: typeof request.data === 'string' ? JSON.parse(request.data) : request.data 
      })),
      tap(updatedCipher => {
        this.ciphers.update(current => 
          current.map(c => c.id === id ? updatedCipher : c)
        );
      })
    );
  }

  /**
   * Creates a new vault item.
   * Performs client-side encryption of the payload to ensure zero-knowledge storage.
   * @param request - The cipher data to be created.
   * @param key - The master CryptoKey for encryption.
   */
  createCipher(request: CipherRequest, key: CryptoKey): Observable<Cipher> {
    return from(this.cryptoService.encrypt(request.data, key)).pipe(
      switchMap(encryptedData => {
        const encryptedRequest = { ...request, data: encryptedData };
        return this.http.post<Cipher>(`${this.apiUrl}/v1/ciphers`, encryptedRequest);
      }),
      switchMap(async (newCipher: Cipher) => {
        const decryptedData = request.data;
        return {
          ...newCipher,
          data: typeof decryptedData === 'string' ? JSON.parse(decryptedData) : decryptedData 
        };
      }),
      tap(decryptedCipher => {
        this.ciphers.update(current => [...current, decryptedCipher]);
        this.selectedCipher.set(decryptedCipher);
      })
    );
  }

  /**
   * Soft-deletes a cipher by moving it to the trash.
   * @param id - Identifier of the cipher to be trashed.
   */
  deleteCipher(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/v1/ciphers/${id}`).pipe(
      tap(() => {
        this.ciphers.update(current => 
          current.map(c => c.id === id 
            ? { ...c, deletedDate: new Date().toISOString() }
            : c
          )
        );
        if (this.selectedCipher()?.id === id) {
          this.selectedCipher.set(null);
        }
      })
    );
  }

  /**
   * Irreversibly deletes a cipher from the database.
   * @param id - Identifier of the cipher to be removed.
   */
  permanentDeleteCipher(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/v1/ciphers/${id}/permanent-delete`).pipe(
      tap(() => {
        this.updateCiphersAfterDeletion(id);
      })
    );
  }

  /**
   * Restores a soft-deleted cipher from the trash.
   * @param id - Identifier of the cipher to be restored.
   */
  restoreCipher(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/v1/ciphers/${id}/restore`, {}).pipe(
      tap(() => {
        this.ciphers.update(current => 
          current.map(c => c.id === id 
            ? { ...c, deletedDate: undefined }
            : c
          )
        );
      })
    );
  }

  /**
   * Internal helper to sync the state after a permanent deletion.
   */
  private updateCiphersAfterDeletion(id: string): void {
    this.ciphers.update(current => current.filter(c => c.id !== id));
    if (this.selectedCipher()?.id === id) {
      this.selectedCipher.set(null);
    }
  }

  resetState(): void {
    this.ciphers.set([]);              
    this.selectedCipher.set(null);     
    this.searchTerm.set('');          
    this.currentFilter.set('all');     
  }
}