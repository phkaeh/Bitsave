import { inject, Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Intercepts all outgoing HTTP requests to attach the JWT access token.
 * Also implements an automatic 'silent refresh' logic: if a 403 Forbidden error 
 * occurs, it attempts to refresh the token and retries the original request.
 * @security This ensures that sensitive vault requests are always authenticated
 * without requiring the user to manually re-login until the refresh token expires.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  
  private readonly authService = inject(AuthService);
  
  /**
   * Intercepts the HTTP request, clones it to add the Authorization header,
   * and handles 403 errors for token refreshing.
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    let secureReq = req.clone({
      setHeaders: { 
        'X-API-KEY': environment.apiKey 
      }
    });
    
    // Skip authentication headers for auth-related endpoints (Login, Register, etc.)
    if (req.url.includes('/v1/auth/')) {
      return next.handle(secureReq);
    }
    
    const accessToken = localStorage.getItem('access_token');
    
    // Attach the JWT token if present in localStorage
    if (accessToken) {
      secureReq = this.addToken(secureReq, accessToken);
    }

    return next.handle(secureReq).pipe(
      catchError((error: HttpErrorResponse) => {
        /**
         * If the server returns 403 (Forbidden), the access token might be expired.
         * We attempt to refresh the token once, unless we are already on a refresh path.
         */
        if (error.status === 403 && !secureReq.url.includes('/refresh')) {
          return this.handle403Error(secureReq, next);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Helper method to clone a request and set the Authorization Bearer header.
   */
  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  /**
   * Orchestrates the token refresh flow. If the refresh is successful, 
   * it retries the failed request with the new token.
   */
  private handle403Error(secureReq: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.authService.refreshToken().pipe(
      switchMap(() => {
        const newToken = localStorage.getItem('access_token');
        if (newToken) {
          return next.handle(this.addToken(secureReq, newToken)); 
        }
        return throwError(() => new Error('Token refresh failed: No new token received.'));
      }),
      catchError((err) => {
        this.authService.logout();
        return throwError(() => err);
      })
    );
  }
}