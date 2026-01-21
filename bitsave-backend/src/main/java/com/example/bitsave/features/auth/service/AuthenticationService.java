package com.example.bitsave.features.auth.service;

import com.example.bitsave.features.auth.dto.AuthenticationRequest;
import com.example.bitsave.features.auth.dto.AuthenticationResponse;
import com.example.bitsave.features.auth.dto.RegisterRequest;
import com.example.bitsave.features.verification.service.EmailService;
import com.example.bitsave.shared.exception.EmailAlreadyExistsException;
import com.example.bitsave.features.auth.model.Role;
import com.example.bitsave.features.auth.model.User;
import com.example.bitsave.features.auth.repository.UserRepository;
import com.example.bitsave.features.verification.model.VerificationCode;
import com.example.bitsave.features.verification.service.VerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Service class handling the core authentication and registration logic.
 * Orchestrates user onboarding, credential validation, and multi-factor
 * authentication triggers via email verification.
 */
@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final VerificationService verificationService;
    private final EmailService emailService;

    /**
     * Handles the registration of new users.
     * Implements a "Disabled by Default" policy to ensure email ownership
     * before granting vault access.
     * again using BCrypt/Argon2 before persistence to protect against DB leaks.
     * @param request Data transfer object containing user registration details.
     * @throws EmailAlreadyExistsException if the provided email is already in use.
     */
    public void register(RegisterRequest request) {
        if (repository.findByEmail(request.getEmail()).isPresent()) {
            throw new EmailAlreadyExistsException("The email address is already registered.");
        }

        var user = User.builder()
                .firstname(request.getFirstname())
                .lastname(request.getLastname())
                .email(request.getEmail())
                // Re-hashing the client-side hash for server-side bitsave
                .passwordHash(passwordEncoder.encode(request.getPasswordHash()))
                .enabled(false) // User must verify email first
                .role(Role.USER)
                .build();
        repository.save(user);

        VerificationCode code = verificationService.createCode(user);
        emailService.sendVerificationEmail(user.getEmail(), code.getCode());
    }

    /**
     * Validates user credentials and initiates the 2FA (email verification) flow.
     * Does not issue JWT tokens yet; a valid verification code is required first.
     * * @param request DTO containing login credentials (email and client-side password hash).
     */
    public void authenticate(AuthenticationRequest request) {
        // Validates credentials against stored server-side hash
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPasswordHash()
                )
        );

        var user = repository.findByEmail(request.getEmail()).orElseThrow();

        // Initiate Two-Factor Authentication (2FA) via email
        VerificationCode code = verificationService.createCode(user);
        emailService.sendVerificationEmail(user.getEmail(), code.getCode());
    }

    /**
     * Special authentication bypass for demonstration.
     * Directly generates tokens for a pre-defined demo account.
     * The Demo User gets only initiated when in dev mode.
     * @return AuthenticationResponse containing Access and Refresh JWT tokens.
     * @throws RuntimeException if the demo account has not been initialized in the DB.
     */
    public AuthenticationResponse authenticateDemo() {
        var user = repository.findByEmail("demo@portfolio.com")
                .orElseThrow(() -> new RuntimeException("Critical Error: Demo account not initialized."));

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return AuthenticationResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }
}