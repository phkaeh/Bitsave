package com.example.bitsave.features.auth.service;

import com.example.bitsave.features.auth.dto.AuthenticationRequest;
import com.example.bitsave.features.auth.dto.AuthenticationResponse;
import com.example.bitsave.features.auth.dto.RegisterRequest;
import com.example.bitsave.features.auth.model.Role;
import com.example.bitsave.features.auth.model.User;
import com.example.bitsave.features.auth.repository.UserRepository;
import com.example.bitsave.features.verification.model.VerificationCode;
import com.example.bitsave.features.verification.service.EmailService;
import com.example.bitsave.features.verification.service.VerificationService;
import com.example.bitsave.shared.exception.EmailAlreadyExistsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuthenticationService.
 * Tests registration, authentication, and demo login functionality.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Authentication Service Tests")
class AuthenticationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private VerificationService verificationService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthenticationService authenticationService;

    private RegisterRequest registerRequest;
    private AuthenticationRequest authRequest;
    private User mockUser;

    @BeforeEach
    void setUp() {
        registerRequest = RegisterRequest.builder()
                .firstname("Alice")
                .lastname("Test")
                .email("alice.test@example.com")
                .passwordHash("clientSideHash123")
                .build();

        authRequest = AuthenticationRequest.builder()
                .email("alice.test@example.com")
                .passwordHash("clientSideHash123")
                .build();

        mockUser = User.builder()
                .id(UUID.randomUUID())
                .firstname("Alice")
                .lastname("Test")
                .email("alice.test@example.com")
                .passwordHash("serverSideHash456")
                .enabled(false)
                .role(Role.USER)
                .build();
    }


    @Test
    @DisplayName("Should register new user successfully")
    void shouldRegisterNewUserSuccessfully() {
        when(userRepository.findByEmail(registerRequest.getEmail())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(registerRequest.getPasswordHash())).thenReturn("serverSideHash456");
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        VerificationCode mockCode = new VerificationCode();
        mockCode.setCode("123456");
        when(verificationService.createCode(any(User.class))).thenReturn(mockCode);

        authenticationService.register(registerRequest);

        verify(userRepository).findByEmail(registerRequest.getEmail());
        verify(passwordEncoder).encode(registerRequest.getPasswordHash());
        verify(userRepository).save(argThat(user ->
                user.getFirstname().equals("Alice") &&
                        user.getLastname().equals("Test") &&
                        user.getEmail().equals("alice.test@example.com") &&
                        !user.isEnabled() && // User should be disabled by default
                        user.getRole() == Role.USER
        ));
        verify(verificationService).createCode(any(User.class));
        verify(emailService).sendVerificationEmail(eq(registerRequest.getEmail()), eq("123456"));
    }

    @Test
    @DisplayName("Should throw exception when email already exists")
    void shouldThrowExceptionWhenEmailAlreadyExists() {
        when(userRepository.findByEmail(registerRequest.getEmail())).thenReturn(Optional.of(mockUser));

        assertThatThrownBy(() -> authenticationService.register(registerRequest))
                .isInstanceOf(EmailAlreadyExistsException.class)
                .hasMessageContaining("email address is already registered");

        verify(userRepository, never()).save(any(User.class));
        verify(emailService, never()).sendVerificationEmail(anyString(), anyString());
    }

    @Test
    @DisplayName("Should re-hash client-side password hash on server")
    void shouldReHashClientSidePasswordHashOnServer() {
        when(userRepository.findByEmail(registerRequest.getEmail())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("clientSideHash123")).thenReturn("serverSideHash456");
        when(userRepository.save(any(User.class))).thenReturn(mockUser);

        VerificationCode mockCode = new VerificationCode();
        when(verificationService.createCode(any(User.class))).thenReturn(mockCode);

        authenticationService.register(registerRequest);

        verify(passwordEncoder).encode("clientSideHash123");
        verify(userRepository).save(argThat(user ->
                user.getPasswordHash().equals("serverSideHash456")
        ));
    }


    @Test
    @DisplayName("Should authenticate user with valid credentials")
    void shouldAuthenticateUserWithValidCredentials() {
        when(userRepository.findByEmail(authRequest.getEmail())).thenReturn(Optional.of(mockUser));

        VerificationCode mockCode = new VerificationCode();
        mockCode.setCode("654321");
        when(verificationService.createCode(mockUser)).thenReturn(mockCode);

        authenticationService.authenticate(authRequest);

        verify(authenticationManager).authenticate(
                argThat(auth ->
                        auth instanceof UsernamePasswordAuthenticationToken &&
                                auth.getPrincipal().equals("alice.test@example.com") &&
                                auth.getCredentials().equals("clientSideHash123")
                )
        );
        verify(verificationService).createCode(mockUser);
        verify(emailService).sendVerificationEmail(eq("alice.test@example.com"), eq("654321"));
    }

    @Test
    @DisplayName("Should throw exception with invalid credentials")
    void shouldThrowExceptionWithInvalidCredentials() {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        assertThatThrownBy(() -> authenticationService.authenticate(authRequest))
                .isInstanceOf(BadCredentialsException.class);

        verify(verificationService, never()).createCode(any());
        verify(emailService, never()).sendVerificationEmail(anyString(), anyString());
    }

    @Test
    @DisplayName("Should generate verification code after successful authentication")
    void shouldGenerateVerificationCodeAfterSuccessfulAuth() {
        when(userRepository.findByEmail(authRequest.getEmail())).thenReturn(Optional.of(mockUser));

        VerificationCode mockCode = new VerificationCode();
        mockCode.setCode("999888");
        when(verificationService.createCode(mockUser)).thenReturn(mockCode);

        authenticationService.authenticate(authRequest);

        verify(verificationService).createCode(mockUser);
        verify(emailService).sendVerificationEmail("alice.test@example.com", "999888");
    }


    @Test
    @DisplayName("Should authenticate demo user successfully")
    void shouldAuthenticateDemoUserSuccessfully() {
        User demoUser = User.builder()
                .id(UUID.randomUUID())
                .email("demo@portfolio.com")
                .firstname("Demo")
                .lastname("User")
                .passwordHash("hashedPassword")
                .enabled(true)
                .role(Role.USER)
                .build();

        when(userRepository.findByEmail("demo@portfolio.com")).thenReturn(Optional.of(demoUser));
        when(jwtService.generateAccessToken(demoUser)).thenReturn("accessToken123");
        when(jwtService.generateRefreshToken(demoUser)).thenReturn("refreshToken456");

        AuthenticationResponse response = authenticationService.authenticateDemo();

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("accessToken123");
        assertThat(response.getRefreshToken()).isEqualTo("refreshToken456");

        verify(jwtService).generateAccessToken(demoUser);
        verify(jwtService).generateRefreshToken(demoUser);
    }

    @Test
    @DisplayName("Should throw exception when demo user not found")
    void shouldThrowExceptionWhenDemoUserNotFound() {
        when(userRepository.findByEmail("demo@portfolio.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authenticationService.authenticateDemo())
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Demo account not initialized");
    }

    @Test
    @DisplayName("Should not send verification email for demo login")
    void shouldNotSendVerificationEmailForDemoLogin() {
        User demoUser = User.builder()
                .id(UUID.randomUUID())
                .email("demo@portfolio.com")
                .enabled(true)
                .role(Role.USER)
                .build();

        when(userRepository.findByEmail("demo@portfolio.com")).thenReturn(Optional.of(demoUser));
        when(jwtService.generateAccessToken(any())).thenReturn("token");
        when(jwtService.generateRefreshToken(any())).thenReturn("token");

        authenticationService.authenticateDemo();

        verify(emailService, never()).sendVerificationEmail(anyString(), anyString());
        verify(verificationService, never()).createCode(any());
    }
}