import { inject, Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service'; 

/**
 * Guard responsible for managing access to public-facing routes (e.g., Login, Register).
 * It prevents authenticated users from accessing these pages by redirecting them 
 * to the main application area.
 * @usage This guard should be applied to routes that are only intended for 
 * non-authenticated users.
 */
@Injectable({
  providedIn: 'root'
})
export class PublicGuard implements CanActivate { 

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Main entry point for the route guard.
   * Checks if the user is already authenticated and handles redirection if necessary.
   * @param route - Information about the route to be activated.
   * @param state - The current state of the router.
   * @returns A boolean allowing access or a UrlTree redirecting to the vault dashboard.
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    // If the user is already authenticated (valid token exists), send them to the vault.
    if (this.authService.isAuthenticated()) {
      return this.router.createUrlTree(['/allitems']);
    }
    
    // Allow access to the public page (e.g., Login/Registration).
    return true;
  }
}