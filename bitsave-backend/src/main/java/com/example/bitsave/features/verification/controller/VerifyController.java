package com.example.bitsave.features.verification.controller;

import com.example.bitsave.features.auth.dto.AuthenticationResponse;
import com.example.bitsave.features.auth.dto.EmailRequest;
import com.example.bitsave.features.auth.model.User;
import com.example.bitsave.features.auth.repository.UserRepository;
import com.example.bitsave.features.auth.service.JwtService;
import com.example.bitsave.features.verification.dto.CodeRequest;
import com.example.bitsave.features.verification.model.VerificationCode;
import com.example.bitsave.features.verification.service.EmailService;
import com.example.bitsave.features.verification.service.VerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * Controller handling the secondary stage of the authentication process.
 * Responsible for verifying email-based codes and issuing final session tokens.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/auth")
public class VerifyController {

    private final VerificationService verificationService;
    private final UserRepository repository;
    private final JwtService jwtService;
    private final EmailService emailService;

    /**
     * Verifies the provided 6-digit code against the user's email.
     * If valid, the user's account is enabled (if new) and the final
     * JWT Access and Refresh tokens are issued.
     * @param request Contains the user's email and the verification code.
     * @return AuthenticationResponse with JWT tokens on success, or 400 Bad Request on failure.
     */
    @PostMapping("/verify")
    public ResponseEntity<AuthenticationResponse> verify(@RequestBody @Valid CodeRequest request) {
        String codeValue = request.getCode();
        String email = request.getEmail();
        Optional<User> userOpt = verificationService.validate(codeValue, email);

        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(AuthenticationResponse.builder()
                            .build());
        }

        User user = userOpt.get();

        // After successful verification, we generate the actual session tokens
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return ResponseEntity.ok(
                AuthenticationResponse.builder()
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .build()
        );
    }

    /**
     * Triggers a new verification code to be generated and emailed to the user.
     * Useful for scenarios where the initial email was lost or expired.
     * @param request Contains the user's email address.
     * @return Success message indicating the code has been resent.
     */
    @PostMapping("/resend-code")
    public ResponseEntity<String> resendCode(
            @RequestBody @Valid EmailRequest request
    ) {
        // Fetch user or throw exception if not found
        var user = repository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Generate a fresh code and dispatch via email service
        VerificationCode code = verificationService.createCode(user);
        emailService.sendVerificationEmail(user.getEmail(), code.getCode());

        return ResponseEntity.ok("Verification code has been resent successfully.");
    }
}