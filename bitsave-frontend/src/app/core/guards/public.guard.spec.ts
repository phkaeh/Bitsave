import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PublicGuard } from './public.guard';
import { AuthService } from '../services/auth.service';

describe('PublicGuard', () => {
    let guard: PublicGuard;
    let authService: MockedObject<AuthService>;
    let router: MockedObject<Router>;
    let mockRoute: ActivatedRouteSnapshot;
    let mockState: RouterStateSnapshot;

    beforeEach(() => {
        const authSpy = {
            isAuthenticated: vi.fn().mockName("AuthService.isAuthenticated")
        };
        const routerSpy = {
            createUrlTree: vi.fn().mockName("Router.createUrlTree")
        };

        TestBed.configureTestingModule({
            providers: [
                PublicGuard,
                { provide: AuthService, useValue: authSpy },
                { provide: Router, useValue: routerSpy }
            ]
        });

        guard = TestBed.inject(PublicGuard);
        authService = TestBed.inject(AuthService) as MockedObject<AuthService>;
        router = TestBed.inject(Router) as MockedObject<Router>;

        mockRoute = {} as ActivatedRouteSnapshot;
        mockState = { url: '/login' } as RouterStateSnapshot;
    });

    describe('canActivate', () => {
        it('should allow access to public routes when not authenticated', () => {
            authService.isAuthenticated.mockReturnValue(false);

            const result = guard.canActivate(mockRoute, mockState);

            expect(result).toBe(true);
            expect(router.createUrlTree).not.toHaveBeenCalled();
        });

        it('should redirect to vault when already authenticated', () => {
            authService.isAuthenticated.mockReturnValue(true);
            const expectedUrlTree = {} as any;
            router.createUrlTree.mockReturnValue(expectedUrlTree);

            const result = guard.canActivate(mockRoute, mockState);

            expect(result).toBe(expectedUrlTree);
            expect(router.createUrlTree).toHaveBeenCalledWith(['/allitems']);
        });

        it('should redirect authenticated users from login page', () => {
            authService.isAuthenticated.mockReturnValue(true);
            router.createUrlTree.mockReturnValue({} as any);
            const loginState = { url: '/login' } as RouterStateSnapshot;

            const result = guard.canActivate(mockRoute, loginState);

            expect(result).not.toBe(true);
            expect(router.createUrlTree).toHaveBeenCalledWith(['/allitems']);
        });

        it('should redirect authenticated users from signup page', () => {
            authService.isAuthenticated.mockReturnValue(true);
            router.createUrlTree.mockReturnValue({} as any);
            const signupState = { url: '/signup' } as RouterStateSnapshot;

            const result = guard.canActivate(mockRoute, signupState);

            expect(result).not.toBe(true);
            expect(router.createUrlTree).toHaveBeenCalledWith(['/allitems']);
        });

        it('should allow unauthenticated users to access login', () => {
            authService.isAuthenticated.mockReturnValue(false);

            const result = guard.canActivate(mockRoute, mockState);

            expect(result).toBe(true);
        });

        it('should allow unauthenticated users to access signup', () => {
            authService.isAuthenticated.mockReturnValue(false);
            const signupState = { url: '/signup' } as RouterStateSnapshot;

            const result = guard.canActivate(mockRoute, signupState);

            expect(result).toBe(true);
        });
    });

    describe('User Flow', () => {
        it('should prevent double login', () => {
            // User is already logged in, tries to access login page
            authService.isAuthenticated.mockReturnValue(true);
            router.createUrlTree.mockReturnValue({} as any);

            const result = guard.canActivate(mockRoute, mockState);

            expect(result).not.toBe(true);
        });

        it('should allow first-time login', () => {
            // New user tries to access login page
            authService.isAuthenticated.mockReturnValue(false);

            const result = guard.canActivate(mockRoute, mockState);

            expect(result).toBe(true);
        });
    });
});
