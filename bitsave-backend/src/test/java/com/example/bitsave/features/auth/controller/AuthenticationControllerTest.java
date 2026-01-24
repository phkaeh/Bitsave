package com.example.bitsave.features.auth.controller;

import com.example.bitsave.BaseIntegrationTest;
import com.example.bitsave.features.auth.dto.AuthenticationRequest;
import com.example.bitsave.features.auth.dto.RefreshTokenRequest;
import com.example.bitsave.features.auth.dto.RegisterRequest;
import com.example.bitsave.features.auth.dto.TokenRequest;
import com.example.bitsave.features.auth.model.Role;
import com.example.bitsave.features.auth.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for AuthenticationController.
 * Tests all authentication endpoints end-to-end.
 */
@DisplayName("Authentication Controller Integration Tests")
class AuthenticationControllerTest extends BaseIntegrationTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        if (this.objectMapper == null) {
            this.objectMapper = new ObjectMapper().registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        }
    }


    @Test
    @DisplayName("POST /api/v1/auth/register - Should register new user successfully")
    void shouldRegisterNewUserSuccessfully() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .firstname("Alice")
                .lastname("Test")
                .email("alice.test@example.com")
                .passwordHash("hashedPassword123")
                .build();

        ResultActions result = mockMvc.perform(post("/api/v1/auth/register")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isOk())
                .andExpect(content().string(containsString("Registration successful")));

        assertThat(userRepository.findByEmail("alice.test@example.com"))
                .isPresent()
                .get()
                .satisfies(user -> {
                    assertThat(user.getFirstname()).isEqualTo("Alice");
                    assertThat(user.getLastname()).isEqualTo("Test");
                    assertThat(user.isEnabled()).isFalse();
                });
    }

    @Test
    @DisplayName("POST /api/v1/auth/register - Should reject duplicate email")
    void shouldRejectDuplicateEmail() throws Exception {
        createTestUser("existing@test.com", "password123", true);

        RegisterRequest request = RegisterRequest.builder()
                .firstname("Bob")
                .lastname("Test")
                .email("existing@test.com")
                .passwordHash("hashedPassword456")
                .build();

        ResultActions result = mockMvc.perform(post("/api/v1/auth/register")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("already registered")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/register - Should validate required fields")
    void shouldValidateRequiredFields() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("invalid@test.com")
                // Missing firstname, lastname, password
                .build();

        ResultActions result = mockMvc.perform(post("/api/v1/auth/register")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/v1/auth/register - Should reject invalid email format")
    void shouldRejectInvalidEmailFormat() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .firstname("Alice")
                .lastname("Test")
                .email("not-an-email")
                .passwordHash("hashedPassword123")
                .build();

        ResultActions result = mockMvc.perform(post("/api/v1/auth/register")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isBadRequest());
    }


    @Test
    @DisplayName("POST /api/v1/auth/login - Should authenticate valid user")
    void shouldAuthenticateValidUser() throws Exception {
        String rawPassword = "TestPassword123!";
        createTestUser("login@test.com", rawPassword, true);

        AuthenticationRequest request = AuthenticationRequest.builder()
                .email("login@test.com")
                .passwordHash(rawPassword)
                .build();

        ResultActions result = mockMvc.perform(post("/api/v1/auth/login")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isOk())
                .andExpect(content().string(containsString("Login successful")));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login - Should reject invalid credentials")
    void shouldRejectInvalidCredentials() throws Exception {
        createTestUser("user@test.com", "correctPassword", true);

        AuthenticationRequest request = AuthenticationRequest.builder()
                .email("user@test.com")
                .passwordHash("wrongPassword")
                .build();

        ResultActions result = mockMvc.perform(post("/api/v1/auth/login")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/v1/auth/login - Should reject non-existent user")
    void shouldRejectNonExistentUser() throws Exception {
        AuthenticationRequest request = AuthenticationRequest.builder()
                .email("nonexistent@test.com")
                .passwordHash("anyPassword")
                .build();

        ResultActions result = mockMvc.perform(post("/api/v1/auth/login")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isForbidden());
    }


    @Test
    @DisplayName("POST /api/v1/auth/refresh-token - Should issue new access token with valid refresh token")
    void shouldIssueNewAccessTokenWithValidRefreshToken() throws Exception {
        User user = createEnabledTestUser();
        String refreshToken = generateRefreshToken(user);

        RefreshTokenRequest request = RefreshTokenRequest.builder()
                .refreshToken(refreshToken)
                .build();

        ResultActions result = mockMvc.perform(post("/api/v1/auth/refresh-token")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").value(refreshToken));
    }

    @Test
    @DisplayName("POST /api/v1/auth/refresh-token - Should reject expired refresh token")
    void shouldRejectExpiredRefreshToken() throws Exception {
        User user = createEnabledTestUser();
        String expiredToken = jwtService.generateToken(
                java.util.Map.of(
                        "userId", user.getId().toString(),
                        "jti", java.util.UUID.randomUUID().toString()
                ),
                user,
                -1000
        );

        RefreshTokenRequest request = RefreshTokenRequest.builder()
                .refreshToken(expiredToken)
                .build();

        ResultActions result = mockMvc.perform(post("/api/v1/auth/refresh-token")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/v1/auth/refresh-token - Should reject invalid token")
    void shouldRejectInvalidRefreshToken() throws Exception {
        RefreshTokenRequest request = RefreshTokenRequest.builder()
                .refreshToken("invalid.token.here")
                .build();

        ResultActions result = mockMvc.perform(post("/api/v1/auth/refresh-token")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isUnauthorized());
    }


    @Test
    @DisplayName("POST /api/v1/auth/is-token-valid - Should validate correct token")
    void shouldValidateCorrectToken() throws Exception {
        User user = createEnabledTestUser();
        String validToken = generateAccessToken(user);

        TokenRequest request = TokenRequest.builder()
                .token(validToken)
                .build();

        ResultActions result = mockMvc.perform(post("/api/v1/auth/is-token-valid")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/is-token-valid - Should reject expired token")
    void shouldRejectExpiredToken() throws Exception {
        User user = createEnabledTestUser();
        String expiredToken = jwtService.generateToken(
                java.util.Map.of("userId", user.getId().toString()),
                user,
                -1000
        );

        TokenRequest request = TokenRequest.builder()
                .token(expiredToken)
                .build();

        ResultActions result = mockMvc.perform(post("/api/v1/auth/is-token-valid")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isOk())
                .andExpect(content().string("false"));
    }


    @Test
    @DisplayName("POST /api/v1/auth/demo-login - Should authenticate demo user")

    void shouldAuthenticateDemoUser() throws Exception {

        if (userRepository.findByEmail("demo@portfolio.com").isEmpty()) {
            createTestUser("demo@portfolio.com", "Demo1234!", true);
        }

        ResultActions result = mockMvc.perform(post("/api/v1/auth/demo-login")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON));


        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists());
    }

    @Test
    @DisplayName("POST /api/v1/auth/user-info - Should return names for existing email")
    void shouldReturnUserNamesForExistingEmail() throws Exception {

        User user = User.builder()
                .firstname("Alice")
                .lastname("Test")
                .email("personalized@test.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .enabled(true)
                .role(Role.USER)
                .build();
        userRepository.save(user);

        java.util.Map<String, String> request = java.util.Map.of("email", "personalized@test.com");

        ResultActions result = mockMvc.perform(post("/api/v1/auth/user-info")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isOk())
                .andExpect(jsonPath("$.firstname").value("Alice"))
                .andExpect(jsonPath("$.lastname").value("Test"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/user-info - Should return 404 for non-existent email")
    void shouldReturn404ForNonExistentEmail() throws Exception {
        java.util.Map<String, String> request = java.util.Map.of("email", "not-found@test.com");

        ResultActions result = mockMvc.perform(post("/api/v1/auth/user-info")
                .header("X-API-KEY", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        result.andExpect(status().isNotFound());
    }
}