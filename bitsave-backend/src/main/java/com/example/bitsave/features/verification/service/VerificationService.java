package com.example.bitsave.features.verification.service;

import com.example.bitsave.features.auth.model.User;
import com.example.bitsave.features.auth.repository.UserRepository;
import com.example.bitsave.features.verification.model.VerificationCode;
import com.example.bitsave.features.verification.repository.VerificationCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

/**
 * Service responsible for the lifecycle of bitsave verification codes.
 * Handles generation, expiration, and validation of 6-digit OTPs (One-Time Passwords).
 * fully activated or a login session is authorized.
 */
@Service
@RequiredArgsConstructor
public class VerificationService {

    private final VerificationCodeRepository codeRepo;
    private final UserRepository userRepo;

    /**
     * Generates a new verification code for a user.
     * Automatically invalidates and removes any existing codes for the same user.
     * @param user The user for whom the code is being generated.
     * @return The newly persisted VerificationCode entity.
     */
    public VerificationCode createCode(User user) {
        // Clear existing codes to prevent multiple valid codes at the same time
        Optional<VerificationCode> oldCodeOpt = codeRepo.findByUser(user);
        oldCodeOpt.ifPresent(codeRepo::delete);

        VerificationCode code = new VerificationCode();
        code.setCode(generateSixDigitCode());
        code.setUser(user);
        // OTP is valid for a short window (60 seconds) to minimize theft risk
        code.setExpiresAt(LocalDateTime.now().plusSeconds(60));

        return codeRepo.save(code);
    }

    /**
     * Generates a random 6-digit numeric string.
     */
    private String generateSixDigitCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }

    /**
     * Validates a code against an email and activates the user account upon success.
     * @param codeValue The 6-digit string provided by the user.
     * @param email The email associated with the user.
     * @return An Optional containing the enabled User if valid and not expired.
     */
    public Optional<User> validate(String codeValue, String email) {
        return codeRepo.findByCodeAndUserEmail(codeValue, email)
                .filter(t -> t.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(t -> {
                    User user = t.getUser();
                    // Permanently enable the user account after successful verification
                    user.setEnabled(true);
                    userRepo.save(user);

                    // Consume the code so it cannot be used again
                    codeRepo.delete(t);
                    return user;
                });
    }
}
