import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService, SignUpFormValues, LoginFormValues, AuthResponse } from './auth.service';
import { CryptoService } from './crypto.service';
import { config, of } from "rxjs";
import { provideHttpClient } from "@angular/common/http";
import { ConfigService } from "./config.service";

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;
    let cryptoService: MockedObject<CryptoService>;
    let router: MockedObject<Router>;
    let configService: ConfigService;

    const mockAuthResponse: AuthResponse = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
    };

    const mockConfigService = {
        apiUrl: 'http://localhost:8080/api',
        apiKey: 'test-api-key',
        isDemoMode: true
    };

    const mockUserInfo = {
        firstname: 'Alice',
        lastname: 'Test'
    };

    const testEmail = 'alice.test@example.com';
    const testPassword = 'SecurePassword123!';

    const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

    beforeEach(() => {
        const cryptoSpy = {
            deriveAuthKey: vi.fn(),
            deriveEncryptionKey: vi.fn(),
            setEncryptionKey: vi.fn(),
            clearEncryptionKey: vi.fn()
        };

        const routerSpy = {
            navigate: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                AuthService,
                provideHttpClient(),
                provideHttpClientTesting(), 
                { provide: CryptoService, useValue: cryptoSpy },
                { provide: Router, useValue: routerSpy },
                { provide: ConfigService, useValue: mockConfigService }
            ]
        });

        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
        cryptoService = TestBed.inject(CryptoService) as MockedObject<CryptoService>;
        router = TestBed.inject(Router) as MockedObject<Router>;
        configService = TestBed.inject(ConfigService);

        localStorage.clear();
    });

    afterEach(() => {
        httpMock.verify();
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('signup', () => {
        it('should register a new user', async () => {
            const signupData: SignUpFormValues = {
                firstname: 'Alice',
                lastname: 'Test',
                email: testEmail,
                password: testPassword
            };

            const mockAuthKey = 'mock-auth-hash';
            const mockEncKey = {} as CryptoKey;

            cryptoService.deriveAuthKey.mockReturnValue(Promise.resolve(mockAuthKey));
            cryptoService.deriveEncryptionKey.mockReturnValue(Promise.resolve(mockEncKey));

            service.signup(signupData).subscribe({
                next: (response) => {
                    expect(response).toBe('Registration successful' as any);
                    expect(cryptoService.setEncryptionKey).toHaveBeenCalledWith(mockEncKey);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/register`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({
                firstname: 'Alice',
                lastname: 'Test',
                email: testEmail,
                passwordHash: mockAuthKey
            });

            req.flush('Registration successful');
        });

        it('should derive both auth and encryption keys', async () => {
            const signupData: SignUpFormValues = {
                firstname: 'Alice',
                lastname: 'Test',
                email: testEmail,
                password: testPassword
            };

            cryptoService.deriveAuthKey.mockReturnValue(Promise.resolve('auth-key'));
            cryptoService.deriveEncryptionKey.mockReturnValue(Promise.resolve({} as CryptoKey));

            service.signup(signupData).subscribe({
                next: () => {
                    expect(cryptoService.deriveAuthKey).toHaveBeenCalledWith(testPassword, testEmail);
                    expect(cryptoService.deriveEncryptionKey).toHaveBeenCalledWith(testPassword, testEmail);
                    ;
                }
            });
            
            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/register`);
            req.flush('Success');
        });

        it('should handle registration errors', async () => {
            const signupData: SignUpFormValues = {
                firstname: 'Alice',
                lastname: 'Test',
                email: testEmail,
                password: testPassword
            };

            cryptoService.deriveAuthKey.mockReturnValue(Promise.resolve('auth-key'));
            cryptoService.deriveEncryptionKey.mockReturnValue(Promise.resolve({} as CryptoKey));

            service.signup(signupData).subscribe({
                error: (error) => {
                    expect(error.status).toBe(409);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/register`);
            req.flush('Email already exists', { status: 409, statusText: 'Conflict' });
        });
    });

    describe('login', () => {
        it('should authenticate user and store user info in localStorage', async () => {
        const loginData: LoginFormValues = {
            email: testEmail,
            password: testPassword
        };

        const mockAuthKey = 'mock-auth-hash';
        const mockEncKey = {} as CryptoKey;

        cryptoService.deriveAuthKey.mockReturnValue(Promise.resolve(mockAuthKey));
        cryptoService.deriveEncryptionKey.mockReturnValue(Promise.resolve(mockEncKey));

        service.login(loginData).subscribe({
            next: (response) => {
                expect(response).toEqual(mockUserInfo);
          
                expect(localStorage.getItem('user_email')).toBe(testEmail);
                expect(localStorage.getItem('user_firstname')).toBe(mockUserInfo.firstname);
                expect(localStorage.getItem('user_lastname')).toBe(mockUserInfo.lastname);
                
                expect(cryptoService.setEncryptionKey).toHaveBeenCalledWith(mockEncKey);
            }
        });

        await flushPromises();

        const loginReq = httpMock.expectOne(`${configService.apiUrl}/v1/auth/login`);
        expect(loginReq.request.method).toBe('POST');
        loginReq.flush('Login successful'); 

        const infoReq = httpMock.expectOne(`${configService.apiUrl}/v1/auth/user-info`);
        expect(infoReq.request.method).toBe('POST');
        expect(infoReq.request.body).toEqual({ email: testEmail });
        infoReq.flush(mockUserInfo);
    });

        it('should handle invalid credentials', async () => {
            const loginData: LoginFormValues = {
                email: testEmail,
                password: 'wrongpassword'
            };

            cryptoService.deriveAuthKey.mockReturnValue(Promise.resolve('wrong-hash'));
            cryptoService.deriveEncryptionKey.mockReturnValue(Promise.resolve({} as CryptoKey));

            service.login(loginData).subscribe({
                error: (error) => {
                    expect(error.status).toBe(401);
                    ;
                }
            });
            
            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/login`);
            req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
        });
    });

    describe('verify', () => {
        it('should verify user with code', async () => {
            const code = '123456';

            service.verify(code, testEmail).subscribe({
                next: (response) => {
                    expect(response).toEqual(mockAuthResponse);
                    expect(localStorage.getItem('access_token')).toBe(mockAuthResponse.accessToken);
                    expect(localStorage.getItem('refresh_token')).toBe(mockAuthResponse.refreshToken);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/verify`);
            expect(req.request.body).toEqual({ code, email: testEmail });
            req.flush(mockAuthResponse);
        });

        it('should handle invalid verification code', async () => {
            service.verify('wrong-code', testEmail).subscribe({
                error: (error) => {
                    expect(error.status).toBe(400);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/verify`);
            req.flush('Invalid code', { status: 400, statusText: 'Bad Request' });
        });
    });

    describe('resendCode', () => {
        it('should resend verification code', async () => {
            service.resendCode(testEmail).subscribe({
                next: (response) => {
                    expect(response).toBe('Code sent' as any);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/resend-code`);
            expect(req.request.body).toEqual({ email: testEmail });
            req.flush('Code sent');
        });
    });

    describe('Token Management', () => {
        it('should get refresh token from localStorage', () => {
            localStorage.setItem('refresh_token', 'test-token');
            expect(service.getRefreshToken()).toBe('test-token');
        });

        it('should return null when no refresh token exists', () => {
            expect(service.getRefreshToken()).toBeNull();
        });

        it('should validate refresh token', async () => {
            localStorage.setItem('refresh_token', 'valid-token');

            service.isRefreshTokenValid().subscribe({
                next: (isValid) => {
                    expect(isValid).toBe(true);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/is-token-valid`);
            req.flush(true);
        });

        it('should return false for invalid token', async () => {
            localStorage.setItem('refresh_token', 'invalid-token');

            service.isRefreshTokenValid().subscribe({
                next: (isValid) => {
                    expect(isValid).toBe(false);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/is-token-valid`);
            req.flush(null, { status: 401, statusText: 'Unauthorized' });
        });

        it('should refresh access token', async () => {
            localStorage.setItem('refresh_token', 'old-refresh-token');
            vi.spyOn(service, 'isRefreshTokenValid').mockReturnValue(of(true));

            service.refreshToken().subscribe({
                next: (response) => {
                    expect(response).toEqual(mockAuthResponse);
                    expect(localStorage.getItem('access_token')).toBe(mockAuthResponse.accessToken);
                    expect(localStorage.getItem('refresh_token')).toBe(mockAuthResponse.refreshToken);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/refresh-token`);
            req.flush(mockAuthResponse);
        });

        it('should logout on refresh token failure', async () => {
            localStorage.setItem('refresh_token', 'expired-token');
            vi.spyOn(service, 'isRefreshTokenValid').mockReturnValue(of(true));

            service.refreshToken().subscribe({
                error: () => {
                    expect(cryptoService.clearEncryptionKey).toHaveBeenCalled();
                    expect(router.navigate).toHaveBeenCalledWith(['']);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/refresh-token`);
            req.flush(null, { status: 401, statusText: 'Unauthorized' });
        });
    });

    describe('Authentication State', () => {
        it('should return true when refresh token exists', () => {
            localStorage.setItem('refresh_token', 'token');
            expect(service.isAuthenticated()).toBe(true);
        });

        it('should return false when no refresh token exists', () => {
            expect(service.isAuthenticated()).toBe(false);
        });
    });

    describe('logout', () => {
        it('should clear all tokens and encryption key', () => {
            localStorage.setItem('access_token', 'access');
            localStorage.setItem('refresh_token', 'refresh');

            service.logout();

            expect(localStorage.getItem('access_token')).toBeNull();
            expect(localStorage.getItem('refresh_token')).toBeNull();
            expect(cryptoService.clearEncryptionKey).toHaveBeenCalled();
            expect(router.navigate).toHaveBeenCalledWith(['']);
        });
    });

    describe('demoLogin', () => {
        it('should perform demo login', async () => {
            localStorage.setItem('user_email', 'demo@portfolio.com');
            const mockEncKey = {} as CryptoKey;

            cryptoService.deriveEncryptionKey.mockReturnValue(Promise.resolve(mockEncKey));

            service.demoLogin().subscribe({
                next: (response) => {
                    expect(response).toEqual(mockAuthResponse);
                    expect(localStorage.getItem('access_token')).toBe(mockAuthResponse.accessToken);
                    expect(localStorage.getItem('refresh_token')).toBe(mockAuthResponse.refreshToken);
                    expect(cryptoService.setEncryptionKey).toHaveBeenCalledWith(mockEncKey);
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/demo-login`);
            req.flush(mockAuthResponse);
        });

        it('should use default demo email when not in localStorage', async () => {
            const mockEncKey = {} as CryptoKey;
            cryptoService.deriveEncryptionKey.mockReturnValue(Promise.resolve(mockEncKey));

            service.demoLogin().subscribe({
                next: () => {
                    expect(cryptoService.deriveEncryptionKey).toHaveBeenCalledWith('Demo1234!', 'demo@portfolio.com');
                    ;
                }
            });

            await flushPromises();

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/demo-login`);
            req.flush(mockAuthResponse);
        });
    });
    describe('getUserInfo', () => {
        it('should retrieve user names via POST', () => {
            service.getUserInfo(testEmail).subscribe(info => {
                expect(info).toEqual(mockUserInfo);
            });

            const req = httpMock.expectOne(`${configService.apiUrl}/v1/auth/user-info`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ email: testEmail });
            req.flush(mockUserInfo);
        });
    });
});
