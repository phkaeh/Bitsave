package com.example.bitsave.config;

import com.example.bitsave.BaseIntegrationTest;
import com.example.bitsave.features.auth.model.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.ResultActions;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for Security Configuration.
 * Tests JWT authentication, authorization, and bitsave filters.
 */
@Tag("integration")
@DisplayName("Security Integration Tests")
class SecurityIntegrationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("Should allow access to public endpoints without authentication")
    void shouldAllowAccessToPublicEndpointsWithoutAuth() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .header("X-API-KEY", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest()); // Bad request due to validation, not unauthorized

        mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-API-KEY", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest()); // Bad request due to validation, not unauthorized
    }

    @Test
    @DisplayName("Should block access to protected endpoints without token")
    void shouldBlockAccessToProtectedEndpointsWithoutToken() throws Exception {
        mockMvc.perform(get("/api/v1/ciphers"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should allow access to protected endpoints with valid JWT")
    void shouldAllowAccessToProtectedEndpointsWithValidJWT() throws Exception {
        User user = createEnabledTestUser();
        String token = getBearerToken(user);

        mockMvc.perform(get("/api/v1/ciphers")
                        .header("X-API-KEY", apiKey)
                        .header("Authorization", token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should reject expired JWT tokens")
    void shouldRejectExpiredJWTTokens() throws Exception {
        User user = createEnabledTestUser();
        String expiredToken = jwtService.generateToken(
                java.util.Map.of("userId", user.getId().toString()),
                user,
                -1000 // Expired
        );

        mockMvc.perform(get("/api/v1/ciphers")
                        .header("X-API-KEY", apiKey)
                        .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should reject malformed JWT tokens")
    void shouldRejectMalformedJWTTokens() throws Exception {
        String malformedToken = "this.is.not.a.valid.jwt";

        mockMvc.perform(get("/api/v1/ciphers")
                        .header("X-API-KEY", apiKey)
                        .header("Authorization", "Bearer " + malformedToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should reject requests with missing Bearer prefix")
    void shouldRejectRequestsWithMissingBearerPrefix() throws Exception {
        User user = createEnabledTestUser();
        String token = generateAccessToken(user);

        mockMvc.perform(get("/api/v1/ciphers")
                        .header("X-API-KEY", apiKey)
                        .header("Authorization", token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should reject requests with tampered JWT signature")
    void shouldRejectRequestsWithTamperedJWTSignature() throws Exception {
        User user = createEnabledTestUser();
        String validToken = generateAccessToken(user);
        String tamperedToken = validToken.substring(0, validToken.length() - 10) + "TAMPERED!!";

        mockMvc.perform(get("/api/v1/ciphers")
                        .header("X-API-KEY", apiKey)
                        .header("Authorization", "Bearer " + tamperedToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should extract user information from JWT token")
    void shouldExtractUserInformationFromJWTToken() throws Exception {
        User user = createTestUser("unique@test.com", "password", true);
        String token = getBearerToken(user);

        mockMvc.perform(get("/api/v1/ciphers")
                        .header("X-API-KEY", apiKey)
                        .header("Authorization", token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should allow requests within rate limit")
    void shouldAllowRequestsWithinRateLimit() throws Exception {
        //Make 5 requests (well within limit of 150)
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/register")
                            .header("X-API-KEY", apiKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest()); // Validation error, not rate limited
        }
    }

    @Test
    @DirtiesContext
    @DisplayName("Should enforce rate limiting after 100 requests")
    void shouldEnforceRateLimitingAfter100Requests() throws Exception {
        //Make 151 requests from same IP
        for (int i = 0; i < 150; i++) {
            mockMvc.perform(post("/api/v1/auth/register")
                    .header("X-API-KEY", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"));
        }

        //151st request should be rate limited
        mockMvc.perform(post("/api/v1/auth/register")
                        .header("X-API-KEY", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isTooManyRequests());
    }


    @Test
    @DisplayName("Should handle CORS preflight requests")

    void shouldHandleCorsPreflightRequests() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/api/v1/auth/login")
                        .header("X-API-KEY", apiKey)
                        .header("Origin", "http://localhost:4200")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should include CORS headers in response")
    void shouldIncludeCorsHeadersInResponse() throws Exception {
        ResultActions result = mockMvc.perform(post("/api/v1/auth/register")
                .header("X-API-KEY", apiKey)
                .header("Origin", "http://localhost:4200")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"));

        result.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                .header().exists("Access-Control-Allow-Origin"));
    }


    @Test
    @DisplayName("Should not create HTTP sessions (stateless)")
    void shouldNotCreateHttpSessions() throws Exception {
        User user = createEnabledTestUser();
        String token = getBearerToken(user);

        ResultActions result = mockMvc.perform(get("/api/v1/ciphers")
                .header("X-API-KEY", apiKey)
                .header("Authorization", token));

        result.andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                .request().sessionAttributeDoesNotExist("SPRING_SECURITY_CONTEXT"));
    }


    @Test
    @DisplayName("Should prevent access to another user's resources")
    void shouldPreventAccessToAnotherUsersResources() throws Exception {
        User user1 = createTestUser("user1@test.com", "pass1", true);
        User user2 = createTestUser("user2@test.com", "pass2", true);

        var cipher = com.example.bitsave.features.vault.model.Cipher.builder()
                .user(user2)
                .type(1)
                .data("encrypted")
                .favorite(false)
                .build();
        cipherRepository.save(cipher);

        mockMvc.perform(get("/api/v1/ciphers/" + cipher.getId())
                        .header("X-API-KEY", apiKey)
                        .header("Authorization", getBearerToken(user1)))
                .andExpect(status().isNotFound()); // Should not reveal existence
    }

    @Test
    @DisplayName("Should allow disabled users to access public endpoints")
    void shouldAllowDisabledUsersToAccessPublicEndpoints() throws Exception {
        createTestUser("disabled@test.com", "password", false);

        mockMvc.perform(post("/api/v1/auth/verify")
                        .header("X-API-KEY", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"123456\",\"email\":\"disabled@test.com\"}"))
                .andExpect(status().isBadRequest()); // Bad request, not forbidden
    }
}