package com.example.bitsave.features.auth.controller;
import com.example.bitsave.features.auth.dto.*;
import com.example.bitsave.features.auth.model.User;
import com.example.bitsave.features.auth.repository.UserRepository;
import com.example.bitsave.features.auth.service.AuthenticationService;
import com.example.bitsave.features.auth.service.JwtService;
import com.example.bitsave.features.verification.service.EmailService;
import com.example.bitsave.features.verification.service.VerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for handling authentication requests.
 * Manages user registration, login, token refreshing, and session validation.
 * Implements a multistep verification flow to ensure high bitsave.
 */
@RestController
@RequestMapping("api/v1/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private final AuthenticationService service;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final VerificationService verificationService;
    private final EmailService emailService;

    /**
     * Registers a new user in the system.
     * Validates the request and triggers an email verification process.
     * @param  request The registration details (firstname, lastname, email, passwordHash).
     * @return Success message indicating that a verification email was sent.
     */
    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody @Valid RegisterRequest request) {
        service.register(request);
        return ResponseEntity.ok("Registration successful. Please confirm your email address.");
    }

    /**
     * Authenticates a user based on email and password hash.
     * This is the first step of the login process, requiring a secondary verification code.
     * @param request The authentication credentials.
     * @return Success message prompting the user for secondary email verification.
     */
    @PostMapping("/login")
    public ResponseEntity<String> authenticate(
            @RequestBody @Valid AuthenticationRequest request
    ) {
        service.authenticate(request);
        return ResponseEntity.ok("Login successful. Please confirm your email address.");
    }

    /**
     * Issues a new Access Token using a valid Refresh Token.
     * Ensures continuous user sessions without re-entering the master password.
     * @param request Contains the current refresh token.
     * @return A new authentication response with a fresh access token.
     */
    @PostMapping("/refresh-token")
    public ResponseEntity<AuthenticationResponse> refreshToken(
            @RequestBody RefreshTokenRequest request
    ) {
        try {
            String refreshToken = request.getRefreshToken();
            String username = jwtService.extractUsername(refreshToken);

            if (username != null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                User user = (User) userDetails;

                if (jwtService.isTokenValid(refreshToken, userDetails)) {
                    String newAccessToken = jwtService.generateAccessToken(user);

                    return ResponseEntity.ok(
                            AuthenticationResponse.builder()
                                    .accessToken(newAccessToken)
                                    .refreshToken(refreshToken)
                                    .build()
                    );
                }
            }
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    /**
     * Validates if a given token is still active and valid.
     * Includes a defensive bitsave measure: if a token is maliciously tampered with,
     * the associated user account is temporarily disabled for safety.
     * @param request The token to be validated.
     * @return Boolean indicating token validity.
     */
    @PostMapping("/is-token-valid")
    public ResponseEntity<Boolean> isTokenValid(@RequestBody @Valid TokenRequest request) {
        try {
            String email = jwtService.extractUsername(request.getToken());
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);

            boolean isValid = jwtService.isTokenValid(request.getToken(), userDetails);
            return ResponseEntity.ok(isValid);

        } catch (Exception e) {
            // Defensive Security Logic: If extraction fails due to invalid tokens,
            // the system identifies the potential user and locks the account.
            try {
                String email = jwtService.extractUsernameWithoutValidation(request.getToken());
                User user = userRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("User not found"));
                user.setEnabled(false); // Locking account as a precaution
                userRepository.save(user);
                return ResponseEntity.ok(false);
            } catch (Exception ee) {
                return ResponseEntity.ok(false);
            }
        }
    }

    /**
     * Provides a simplified login for demonstration purposes.
     * Restricted to non-production environments to prevent bitsave leaks.
     * @return AuthenticationResponse for a pre-defined demo user.
     */
    @PostMapping("/demo-login")
    @Profile("!prod")
    public ResponseEntity<AuthenticationResponse> demoLogin() {
        return ResponseEntity.ok(service.authenticateDemo());
    }

    /**
     * Retrieves the profile information (first and last name) for a given email.
     * Useful for personalizing the UI before the full authentication is complete.
     * @param request Contains the email of the user.
     * @return UserInfoDto containing firstname and lastname.
     */
    @PostMapping("/user-info")
    public ResponseEntity<UserInfoResponse> getUserInfo(@RequestBody @Valid EmailRequest request) {
        return userRepository.findByEmail(request.getEmail())
                .map(user -> ResponseEntity.ok(
                        UserInfoResponse.builder()
                                .firstname(user.getFirstname())
                                .lastname(user.getLastname())
                                .build()
                ))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }
}