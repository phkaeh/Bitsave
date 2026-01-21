import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, of, tap , throwError} from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CryptoService } from './crypto.service';
import { VaultService } from './vault.service';

interface SignUpRequest {
  firstname: string;
  lastname: string;
  email: string;
  passwordHash: string;
}

export interface UserInfo {
  firstname: string;
  lastname: string;
}

export interface SignUpFormValues {
  firstname: string;
  lastname: string;
  email: string;
  password: string; 
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

interface LoginRequest {
  email: string;
  passwordHash: string;
}

interface CodeRequest {
  code: string;
  email: string;
}

interface ResendCodeRequest {
  email: string;
}

export interface LoginFormValues {
  email: string;
  password: string;
}


/**
 * Manages the authentication lifecycle of the application.
 * Implements a zero-knowledge security model by combining client-side 
 * cryptographic key derivation with backend identity management.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}`;
  private readonly http = inject(HttpClient);
  private readonly cryptoService = inject(CryptoService);
  private readonly router = inject(Router);
  private readonly vaultService = inject(VaultService);

  /**
   * Registers a new user.
   * Derives two keys client-side: an authentication hash for the backend 
   * and an encryption key that remains strictly in local memory.
   * @param values - Registration data including password and email.
   * @returns An Observable containing the backend AuthResponse. In this case it will only contain a string.
   */
  signup(values: SignUpFormValues): Observable<AuthResponse> {
    return from(Promise.all([
      this.cryptoService.deriveAuthKey(values.password, values.email),
      this.cryptoService.deriveEncryptionKey(values.password, values.email)
    ])).pipe(
      switchMap(([authKey, encryptionKey]) => {
        const credentials: SignUpRequest = {
          firstname: values.firstname,
          lastname: values.lastname,
          email: values.email,
          passwordHash: authKey
        };
        return this.http.post<AuthResponse>(
          `${this.apiUrl}/v1/auth/register`, 
          credentials, 
          { responseType: 'text' as 'json' }
        ).pipe(
          tap(() => {
            // Stores the derived encryption key securely in the CryptoService RAM.
            this.cryptoService.setEncryptionKey(encryptionKey);
          })
        );
      }),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Authenticates an existing user.
   * Derives two keys client-side: an authentication hash for the backend 
   * and an encryption key that remains strictly in local memory.
   * @param values - User credentials (email and master password).
   * @returns An Observable containing the backend AuthResponse. In this case it will only contain a string.
   */
  login(values: LoginFormValues): Observable<any> {
    return from(Promise.all([
      this.cryptoService.deriveAuthKey(values.password, values.email),
      this.cryptoService.deriveEncryptionKey(values.password, values.email)
    ])).pipe(
      switchMap(([authKey, encryptionKey]) => {
        const loginRequest = {
          email: values.email,
          passwordHash: authKey
        };
        return this.http.post(`${this.apiUrl}/v1/auth/login`, loginRequest, { 
          responseType: 'text' 
        }).pipe(
          switchMap(() => this.getUserInfo(values.email)),
          tap((userInfo) => {
            localStorage.setItem('user_email', values.email);
            localStorage.setItem('user_firstname', userInfo.firstname);
            localStorage.setItem('user_lastname', userInfo.lastname);
            this.cryptoService.setEncryptionKey(encryptionKey);
          })
        );
      }),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Verifies the user via an email code (2FA/Verification).
   * @param code - The verification code entered by the user.
   * @param email - The user's email address.
   * @returns An Observable containing an AuthResponse with JWT tokens upon successful verification.
   */
  verify(code: string, email: string): Observable<AuthResponse> {
    const request: CodeRequest = {code, email};
    return this.http.post<AuthResponse>(`${this.apiUrl}/v1/auth/verify`, request)
      .pipe(
        tap(response => {
          if (response.accessToken && response.refreshToken) {
            localStorage.setItem('access_token', response.accessToken);
            localStorage.setItem('refresh_token', response.refreshToken);
          }
        }),
        catchError(error => throwError(() => error))
      );
  }

  /**
   * Requests a new verification code for the given email address.
   * @param email - The user's email address.
   * @returns An Observable containing the backend AuthResponse. In this case it will only contain a string.
   */
  resendCode(email: string): Observable<AuthResponse> {
    const resendCode: ResendCodeRequest = {email: email};
    return this.http.post<AuthResponse>(`${this.apiUrl}/v1/auth/resend-code`, resendCode, {responseType: 'text' as 'json'})
      .pipe(
        catchError(error => throwError(() => error))
      );
  }

  /**
   * Retrieves the current refresh token from persistent storage.
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Checks with the backend if the currently stored refresh token is still valid.
   * @returns An Observable containing a boolean indicating the token's validity.
   */
  isRefreshTokenValid(): Observable<boolean> {
    const token = this.getRefreshToken();
    const body = { token: token };

    return this.http.post<boolean>(`${this.apiUrl}/v1/auth/is-token-valid`, body)
      .pipe(
        catchError(() => of(false))
      );
  }

  /**
   * Refreshes the access token using the valid refresh token.
   * Triggers an automatic logout if the refresh fails.
   * @returns An Observable containing an AuthResponse with JWT tokens upon successful verification.
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
  
    if (!this.isRefreshTokenValid()) {
      return throwError(() => new Error('Refresh token is invalid'));
    }

    const body = { refreshToken: refreshToken };

    return this.http.post<AuthResponse>(`${this.apiUrl}/v1/auth/refresh-token`, body)
      .pipe(
        tap(response => {
          if (response.accessToken) localStorage.setItem('access_token', response.accessToken);
          if (response.refreshToken) localStorage.setItem('refresh_token', response.refreshToken);
        }),
        catchError(error => {
          this.logout();
          return throwError(() => error);
        })
      );
  }

  /**
   * Determines if the user is currently authenticated based on token presence.
   * @security This does not verify the cryptographic validity of the token.
   * @returns A boolean indicating whether the user is authenticated.
   */
  isAuthenticated(): boolean {
    return !!this.getRefreshToken();
  }

  /**
   * Terminates the current session.
   * Clears all tokens from storage and forces the destruction of 
   * the encryption key held in RAM.
   */
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_firstname');
    localStorage.removeItem('user_lastname');
    this.cryptoService.clearEncryptionKey();
    this.vaultService.resetState();
    this.router.navigate(['']);
  }

  /**
   * Performs a login for demonstration purposes using pre-defined credentials.
   * @note Intended for portfolio presentations and testing only.
   */
  demoLogin(): Observable<AuthResponse> {
    const demoEmail = localStorage.getItem('user_email') || 'demo@portfolio.com';
    const demoPassword = "Demo1234!";

    return from(this.cryptoService.deriveEncryptionKey(demoPassword, demoEmail)).pipe(
      switchMap(encryptionKey => {
        return this.http.post<AuthResponse>(`${this.apiUrl}/v1/auth/demo-login`, {}).pipe(
          tap(response => {
            if (response.accessToken && response.refreshToken) {
              localStorage.setItem('access_token', response.accessToken);
              localStorage.setItem('refresh_token', response.refreshToken);
            }
            this.cryptoService.setEncryptionKey(encryptionKey);
          })
        );
      }),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Retrieves the user's profile information (first and last name) by email.
   * This is used to personalize the UI, for example, during the verification step.
   * @param email - The user's email address.
   * @returns An Observable containing the UserInfo (firstname, lastname).
   */
  getUserInfo(email: string): Observable<UserInfo> {
    return this.http.post<UserInfo>(`${this.apiUrl}/v1/auth/user-info`, { email }).pipe(
      catchError(error => throwError(() => error))
    );
  }
}