import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { CryptoService } from '../services/crypto.service';
import { of, throwError } from 'rxjs';

describe('AuthGuard', () => {
    let guard: AuthGuard;
    let authService: MockedObject<AuthService>;
    let cryptoService: MockedObject<CryptoService>;
    let router: MockedObject<Router>;
    let mockRoute: ActivatedRouteSnapshot;
    let mockState: RouterStateSnapshot;

    beforeEach(() => {
        const authSpy = {
            getRefreshToken: vi.fn().mockName("AuthService.getRefreshToken"),
            isRefreshTokenValid: vi.fn().mockName("AuthService.isRefreshTokenValid"),
            logout: vi.fn().mockName("AuthService.logout")
        };
        const cryptoSpy = {
            hasEncryptionKey: vi.fn().mockName("CryptoService.hasEncryptionKey")
        };
        const routerSpy = {
            createUrlTree: vi.fn().mockName("Router.createUrlTree")
        };

        TestBed.configureTestingModule({
            providers: [
                AuthGuard,
                { provide: AuthService, useValue: authSpy },
                { provide: CryptoService, useValue: cryptoSpy },
                { provide: Router, useValue: routerSpy }
            ]
        });

        guard = TestBed.inject(AuthGuard);
        authService = TestBed.inject(AuthService) as MockedObject<AuthService>;
        cryptoService = TestBed.inject(CryptoService) as MockedObject<CryptoService>;
        router = TestBed.inject(Router) as MockedObject<Router>;

        mockRoute = {} as ActivatedRouteSnapshot;
        mockState = { url: '/allitems' } as RouterStateSnapshot;

        // Clear sessionStorage before each test
        sessionStorage.clear();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    describe('canActivate', () => {
        it('should allow access when encryption key exists and token is valid', async () => {
            cryptoService.hasEncryptionKey.mockReturnValue(true);
            authService.getRefreshToken.mockReturnValue('valid-token');
            authService.isRefreshTokenValid.mockReturnValue(of(true));

            const result = guard.canActivate(mockRoute, mockState);

            if (result instanceof Object && 'subscribe' in result) {
                result.subscribe({
                    next: (canActivate) => {
                        expect(canActivate).toBe(true);
                        expect(authService.logout).not.toHaveBeenCalled();
                        ;
                    }
                });
            }
        });

        it('should block access when encryption key is missing', async () => {
            cryptoService.hasEncryptionKey.mockReturnValue(false);
            router.createUrlTree.mockReturnValue({} as any);

            const result = guard.canActivate(mockRoute, mockState);

            if (result instanceof Object && 'subscribe' in result) {
                result.subscribe({
                    next: (canActivate) => {
                        expect(canActivate).not.toBe(true);
                        expect(authService.logout).toHaveBeenCalled();
                        expect(sessionStorage.getItem('vault_locked_reason')).toBe('ram_cleared');
                        expect(router.createUrlTree).toHaveBeenCalledWith([''], {
                            queryParams: { returnUrl: '/allitems' }
                        });
                        ;
                    }
                });
            }
        });

        it('should block access when no refresh token exists', async () => {
            cryptoService.hasEncryptionKey.mockReturnValue(true);
            authService.getRefreshToken.mockReturnValue(null);
            router.createUrlTree.mockReturnValue({} as any);

            const result = guard.canActivate(mockRoute, mockState);

            if (result instanceof Object && 'subscribe' in result) {
                result.subscribe({
                    next: (canActivate) => {
                        expect(canActivate).not.toBe(true);
                        expect(authService.logout).toHaveBeenCalled();
                        ;
                    }
                });
            }
        });

        it('should block access when token is invalid', async () => {
            cryptoService.hasEncryptionKey.mockReturnValue(true);
            authService.getRefreshToken.mockReturnValue('invalid-token');
            authService.isRefreshTokenValid.mockReturnValue(of(false));
            router.createUrlTree.mockReturnValue({} as any);

            const result = guard.canActivate(mockRoute, mockState);

            if (result instanceof Object && 'subscribe' in result) {
                result.subscribe({
                    next: (canActivate) => {
                        expect(canActivate).not.toBe(true);
                        expect(authService.logout).toHaveBeenCalled();
                        ;
                    }
                });
            }
        });

        it('should handle token validation errors', async () => {
            cryptoService.hasEncryptionKey.mockReturnValue(true);
            authService.getRefreshToken.mockReturnValue('token');
            authService.isRefreshTokenValid.mockReturnValue(throwError(() => new Error('Network error')));
            router.createUrlTree.mockReturnValue({} as any);

            const result = guard.canActivate(mockRoute, mockState);

            if (result instanceof Object && 'subscribe' in result) {
                result.subscribe({
                    next: (canActivate) => {
                        expect(canActivate).not.toBe(true);
                        expect(authService.logout).toHaveBeenCalled();
                        ;
                    }
                });
            }
        });

        it('should preserve return URL in query params', async () => {
            cryptoService.hasEncryptionKey.mockReturnValue(false);
            const expectedUrl = '/vault/favorites';
            const state = { url: expectedUrl } as RouterStateSnapshot;
            router.createUrlTree.mockReturnValue({} as any);

            const result = guard.canActivate(mockRoute, state);

            if (result instanceof Object && 'subscribe' in result) {
                result.subscribe({
                    next: () => {
                        expect(router.createUrlTree).toHaveBeenCalledWith([''], {
                            queryParams: { returnUrl: expectedUrl }
                        });
                        ;
                    }
                });
            }
        });
    });

    describe('Security Checks', () => {
        it('should enforce dual authentication (key + token)', async () => {
            // Both must be present
            cryptoService.hasEncryptionKey.mockReturnValue(true);
            authService.getRefreshToken.mockReturnValue('token');
            authService.isRefreshTokenValid.mockReturnValue(of(true));

            const result = guard.canActivate(mockRoute, mockState);

            if (result instanceof Object && 'subscribe' in result) {
                result.subscribe({
                    next: (canActivate) => {
                        expect(canActivate).toBe(true);
                        ;
                    }
                });
            }
        });

        it('should fail if only token exists (no encryption key)', async () => {
            cryptoService.hasEncryptionKey.mockReturnValue(false);
            authService.getRefreshToken.mockReturnValue('token');
            router.createUrlTree.mockReturnValue({} as any);

            const result = guard.canActivate(mockRoute, mockState);

            if (result instanceof Object && 'subscribe' in result) {
                result.subscribe({
                    next: (canActivate) => {
                        expect(canActivate).not.toBe(true);
                        ;
                    }
                });
            }
        });

        it('should fail if only encryption key exists (no token)', async () => {
            cryptoService.hasEncryptionKey.mockReturnValue(true);
            authService.getRefreshToken.mockReturnValue(null);
            router.createUrlTree.mockReturnValue({} as any);

            const result = guard.canActivate(mockRoute, mockState);

            if (result instanceof Object && 'subscribe' in result) {
                result.subscribe({
                    next: (canActivate) => {
                        expect(canActivate).not.toBe(true);
                        ;
                    }
                });
            }
        });
    });
});
