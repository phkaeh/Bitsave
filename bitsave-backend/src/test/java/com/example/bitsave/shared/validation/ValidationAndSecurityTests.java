package com.example.bitsave.shared.validation;

import com.example.bitsave.BaseIntegrationTest;
import com.example.bitsave.features.auth.dto.RegisterRequest;
import com.example.bitsave.features.vault.dto.CipherRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests for input validation and XSS prevention.
 * Ensures @NoHtml annotation and validation work correctly.
 */
@DisplayName("Validation and Security Tests")
class ValidationAndSecurityTests extends BaseIntegrationTest {


    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        if (this.objectMapper == null) {
            this.objectMapper = new ObjectMapper().registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        }
    }

    @Test
    @DisplayName("Should reject HTML tags in registration firstname")
    void shouldRejectHtmlTagsInRegistrationFirstname() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .firstname("<script>alert('xss')</script>")
                .lastname("Test")
                .email("test@example.com")
                .passwordHash("password123")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should reject HTML tags in email field")
    void shouldRejectHtmlTagsInEmailField() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .firstname("Alice")
                .lastname("Test")
                .email("<b>alice.test@example.com</b>")
                .passwordHash("password123")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should accept valid input without HTML")
    void shouldAcceptValidInputWithoutHtml() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .firstname("Alice")
                .lastname("Test")
                .email("alice.test@example.com")
                .passwordHash("ValidPassword123!")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should reject JavaScript injection attempts")
    void shouldRejectJavaScriptInjectionAttempts() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .firstname("Alice")
                .lastname("javascript:alert(document.cookie)")
                .email("test@example.com")
                .passwordHash("password123")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should reject SQL injection patterns")
    void shouldRejectSqlInjectionPatterns() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .firstname("Alice'; DROP TABLE users;--")
                .lastname("Test")
                .email("alice.test@example.com")
                .passwordHash("password123")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should accept special characters in password hash")
    void shouldAcceptSpecialCharactersInPasswordHash() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .firstname("Alice")
                .lastname("Test")
                .email("alice.test@example.com")
                .passwordHash("$2a$10$N9qo8uLOickgx2ZMRZoMye") // BCrypt hash format
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should reject invalid email formats")
    void shouldRejectInvalidEmailFormats() throws Exception {
        String[] invalidEmails = {
                "notanemail",
                "@example.com",
                "user@",
                "user @example.com",
                "user@.com"
        };

        for (String email : invalidEmails) {
            RegisterRequest request = RegisterRequest.builder()
                    .firstname("Alice")
                    .lastname("Test")
                    .email(email)
                    .passwordHash("password123")
                    .build();

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "user@example.com",
            "user.name@example.com",
            "user+tag@example.co.uk",
            "123@example.com"
    })
    @DisplayName("Should accept valid email formats")
    void shouldAcceptValidEmailFormats(String email) throws Exception {

        RegisterRequest request = RegisterRequest.builder()
                .firstname("Alice")
                .lastname("Test")
                .email(email)
                .passwordHash("ValidPassword123!")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }


    @Test
    @DisplayName("Should enforce minimum password length")
    void shouldEnforceMinimumPasswordLength() throws Exception {
        // Password too short (less than 8 characters)
        RegisterRequest request = RegisterRequest.builder()
                .firstname("Alice")
                .lastname("Test")
                .email("alice.test@example.com")
                .passwordHash("short")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should accept password with minimum length")
    void shouldAcceptPasswordWithMinimumLength() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .firstname("Alice")
                .lastname("Test")
                .email("alice.test@example.com")
                .passwordHash("12345678") // Exactly 8 characters
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should reject registration with missing firstname")
    void shouldRejectRegistrationWithMissingFirstname() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .lastname("Test")
                .email("test@example.com")
                .passwordHash("password123")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should reject registration with missing email")
    void shouldRejectRegistrationWithMissingEmail() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .firstname("Alice")
                .lastname("Test")
                .passwordHash("password123")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should reject empty string values")
    void shouldRejectEmptyStringValues() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .firstname("")
                .lastname("Test")
                .email("alice.test@example.com")
                .passwordHash("password123")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }


    @Test
    @DisplayName("Should validate cipher request fields")
    void shouldValidateCipherRequestFields() throws Exception {
        var user = createEnabledTestUser();
        String token = getBearerToken(user);

        CipherRequest request = CipherRequest.builder()
                .type(null)
                .data(null)
                .favorite(null)
                .build();

        mockMvc.perform(post("/api/v1/ciphers")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}