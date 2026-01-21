package com.example.bitsave.features.auth.service;

import com.example.bitsave.features.auth.model.Role;
import com.example.bitsave.features.auth.model.User;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Comprehensive tests for JWT Service functionality.
 * Tests token generation, validation, extraction, and bitsave.
 */
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("JWT Service Tests")
class JwtServiceTest {

    @Autowired
    private JwtService jwtService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .firstname("Test")
                .lastname("User")
                .email("test@example.com")
                .passwordHash("hashedPassword")
                .enabled(true)
                .role(Role.USER)
                .build();
    }

    @Test
    @DisplayName("Should generate valid access token")
    void shouldGenerateValidAccessToken() {
        String token = jwtService.generateAccessToken(testUser);

        assertThat(token).isNotNull().isNotEmpty();
        assertThat(jwtService.extractUsername(token)).isEqualTo(testUser.getEmail());
        assertThat(jwtService.isTokenValid(token, testUser)).isTrue();
    }

    @Test
    @DisplayName("Should generate valid refresh token")
    void shouldGenerateValidRefreshToken() {
        String token = jwtService.generateRefreshToken(testUser);

        assertThat(token).isNotNull().isNotEmpty();
        assertThat(jwtService.extractUsername(token)).isEqualTo(testUser.getEmail());
        assertThat(jwtService.isTokenValid(token, testUser)).isTrue();
    }

    @Test
    @DisplayName("Should extract username from token")
    void shouldExtractUsername() {
        String token = jwtService.generateAccessToken(testUser);

        String extractedUsername = jwtService.extractUsername(token);

        assertThat(extractedUsername).isEqualTo(testUser.getEmail());
    }

    @Test
    @DisplayName("Should extract userId from token")
    void shouldExtractUserId() {
        String token = jwtService.generateAccessToken(testUser);

        UUID extractedUserId = jwtService.extractUserId(token);

        assertThat(extractedUserId).isEqualTo(testUser.getId());
    }

    @Test
    @DisplayName("Should validate token with correct user")
    void shouldValidateTokenWithCorrectUser() {
        String token = jwtService.generateAccessToken(testUser);

        boolean isValid = jwtService.isTokenValid(token, testUser);

        assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("Should reject token with different user")
    void shouldRejectTokenWithDifferentUser() {
        String token = jwtService.generateAccessToken(testUser);

        User differentUser = User.builder()
                .id(UUID.randomUUID())
                .email("different@example.com")
                .passwordHash("hashedPassword")
                .enabled(true)
                .role(Role.USER)
                .build();

        boolean isValid = jwtService.isTokenValid(token, differentUser);

        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should detect expired token")
    void shouldDetectExpiredToken() {
        String expiredToken = jwtService.generateToken(
                java.util.Map.of("userId", testUser.getId().toString()),
                testUser,
                -1000 // Expired 1 second ago
        );

        assertThat(jwtService.isTokenExpired(expiredToken)).isTrue();
        assertThat(jwtService.isTokenValid(expiredToken, testUser)).isFalse();
    }

    @Test
    @DisplayName("Should reject malformed token")
    void shouldRejectMalformedToken() {
        String malformedToken = "this.is.not.a.valid.jwt";

        assertThatThrownBy(() -> jwtService.extractUsername(malformedToken))
                .isInstanceOf(MalformedJwtException.class);
    }

    @Test
    @DisplayName("Should reject token with invalid signature")
    void shouldRejectTokenWithInvalidSignature() {
        //Token signed with different key
        String token = jwtService.generateAccessToken(testUser);
        String tamperedToken = token.substring(0, token.length() - 5) + "XXXXX";

        assertThatThrownBy(() -> jwtService.extractUsername(tamperedToken))
                .isInstanceOf(SignatureException.class);
    }

    @Test
    @DisplayName("Should extract username from expired token without validation")
    void shouldExtractUsernameFromExpiredToken() {
        //Expired token
        String expiredToken = jwtService.generateToken(
                java.util.Map.of("userId", testUser.getId().toString()),
                testUser,
                -1000
        );

        String username = jwtService.extractUsernameWithoutValidation(expiredToken);

        assertThat(username).isEqualTo(testUser.getEmail());
    }

    @Test
    @DisplayName("Should generate tokens with userId claim")
    void shouldGenerateTokensWithUserIdClaim() {
        String accessToken = jwtService.generateAccessToken(testUser);
        String refreshToken = jwtService.generateRefreshToken(testUser);

        assertThat(jwtService.extractUserId(accessToken)).isEqualTo(testUser.getId());
        assertThat(jwtService.extractUserId(refreshToken)).isEqualTo(testUser.getId());
    }

    @Test
    @DisplayName("Access token and refresh token should be different")
    void accessTokenAndRefreshTokenShouldBeDifferent() {
        String accessToken = jwtService.generateAccessToken(testUser);
        String refreshToken = jwtService.generateRefreshToken(testUser);

        assertThat(accessToken).isNotEqualTo(refreshToken);
    }

    @Test
    @DisplayName("Should handle null user gracefully")
    void shouldHandleNullUserGracefully() {
        assertThatThrownBy(() -> jwtService.generateAccessToken(null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    @DisplayName("Generated tokens should not be expired immediately")
    void generatedTokensShouldNotBeExpiredImmediately() {
        String accessToken = jwtService.generateAccessToken(testUser);
        String refreshToken = jwtService.generateRefreshToken(testUser);

        assertThat(jwtService.isTokenExpired(accessToken)).isFalse();
        assertThat(jwtService.isTokenExpired(refreshToken)).isFalse();
    }

    @Test
    @DisplayName("Should generate unique tokens for same user")
    void shouldGenerateUniqueTokensForSameUser() {
        String token1 = jwtService.generateAccessToken(testUser);
        String token2 = jwtService.generateAccessToken(testUser);

        assertThat(token1).isNotEqualTo(token2);
    }
}