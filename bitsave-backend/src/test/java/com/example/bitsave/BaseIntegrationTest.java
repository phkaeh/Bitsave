package com.example.bitsave;

import com.example.bitsave.features.auth.model.Role;
import com.example.bitsave.features.auth.model.User;
import com.example.bitsave.features.auth.repository.UserRepository;
import com.example.bitsave.features.auth.service.JwtService;
import com.example.bitsave.features.vault.repository.CipherRepository;
import com.example.bitsave.features.verification.repository.VerificationCodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;


/**
 * Base class for integration tests providing common setup and utilities.
 * Extends this class for controller and integration tests.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected CipherRepository cipherRepository;

    @Autowired
    protected VerificationCodeRepository verificationCodeRepository;

    @Autowired
    protected JwtService jwtService;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @BeforeEach
    void baseSetUp() {
        // Clean database before each test
        cipherRepository.deleteAll();
        verificationCodeRepository.deleteAll();
        userRepository.deleteAll();
    }

    /**
     * Creates a test user with default credentials
     */
    protected User createTestUser(String email, String password, boolean enabled) {
        User user = User.builder()
                .firstname("Test")
                .lastname("User")
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .enabled(enabled)
                .role(Role.USER)
                .build();
        return userRepository.save(user);
    }

    /**
     * Creates an enabled test user
     */
    protected User createEnabledTestUser() {
        return createTestUser("test@example.com", "TestPassword123!", true);
    }

    /**
     * Generates a valid JWT access token for a user
     */
    protected String generateAccessToken(User user) {
        return jwtService.generateAccessToken(user);
    }

    /**
     * Generates a valid JWT refresh token for a user
     */
    protected String generateRefreshToken(User user) {
        return jwtService.generateRefreshToken(user);
    }

    /**
     * Generates an authorization header with Bearer token
     */
    protected String getBearerToken(User user) {
        return "Bearer " + generateAccessToken(user);
    }
}
