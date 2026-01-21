package com.example.bitsave;

import com.example.bitsave.features.auth.model.Role;
import com.example.bitsave.features.auth.model.User;
import org.junit.jupiter.api.BeforeEach;

import java.util.UUID;

public class BaseUnitTest {
    @BeforeEach
    void baseSetUp() {
    }

    /**
     * Creates a mock user for testing
     */
    protected User createMockUser(UUID id, String email, boolean enabled) {
        return User.builder()
                .id(id)
                .firstname("Test")
                .lastname("User")
                .email(email)
                .passwordHash("hashedPassword")
                .enabled(enabled)
                .role(Role.USER)
                .build();
    }

    /**
     * Creates a default mock user
     */
    protected User createMockUser() {
        return createMockUser(UUID.randomUUID(), "test@example.com", true);
    }
}

