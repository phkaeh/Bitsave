import { inject, Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CryptoService } from '../services/crypto.service';

/**
 * Guard responsible for protecting sensitive vault routes.
 * It enforces a dual-authentication check: 
 * 1. Validates the presence of the cryptographic key in RAM.
 * 2. Validates the session token via the backend.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  private readonly authService = inject(AuthService);
  private readonly cryptoService = inject(CryptoService);
  private readonly router = inject(Router);

  /**
   * Main entry point for the route guard.
   * @param route - Information about the route to be activated.
   * @param state - The state of the router at the time of access.
   * @returns An Observable, Promise, or boolean indicating if access is granted.
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuthentication(state);
  }

  /**
   * Orchestrates the security checks required to access a protected route.
   * Redirects the user to the login page if the encryption key is missing or
   * if the session token is invalid.
   * @param state - Used to capture the target URL for post-login redirection.
   * @returns An Observable resolving to true if authorized, or a UrlTree for redirection.
   * @security This guard ensures that even with a valid session token, 
   * data cannot be accessed if the volatile encryption key has been purged from RAM.
   */
  private checkAuthentication(state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    
    // 1. Critical Check: Is the encryption key available in volatile memory?
    if (!this.cryptoService.hasEncryptionKey()) {
      // If the page was refreshed, the key is lost. User must re-authenticate.
      sessionStorage.setItem('vault_locked_reason', 'ram_cleared');
      this.authService.logout(); 
      return of(this.router.createUrlTree([''], {
        queryParams: { returnUrl: state.url }
      }));
    }

    // 2. Session Check: Does a refresh token exist?
    const token = this.authService.getRefreshToken();
    if (!token) {
      this.authService.logout();
      return of(this.router.createUrlTree([''], {
        queryParams: { returnUrl: state.url }
      }));
    }

    // 3. Integrity Check: Is the session still valid on the server?
    return this.authService.isRefreshTokenValid().pipe(
      map(isValid => {
        if (isValid) {
          return true;
        } else {
          this.authService.logout();
          return this.router.createUrlTree([''], {
            queryParams: { returnUrl: state.url }
          });
        }
      }),
      catchError(() => {
        this.authService.logout();
        return of(this.router.createUrlTree([''], {
          queryParams: { returnUrl: state.url }
        }));
      })
    );
  }
}