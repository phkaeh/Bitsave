package com.example.bitsave.features.verification.service;

import com.example.bitsave.features.auth.model.Role;
import com.example.bitsave.features.auth.model.User;
import com.example.bitsave.features.auth.repository.UserRepository;
import com.example.bitsave.features.verification.model.VerificationCode;
import com.example.bitsave.features.verification.repository.VerificationCodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for VerificationService.
 * Tests code generation, validation, and expiration logic.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Verification Service Tests")
class VerificationServiceTest {

    @Mock
    private VerificationCodeRepository codeRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private VerificationService verificationService;

    private User testUser;
    private VerificationCode testCode;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .firstname("Test")
                .lastname("User")
                .email("test@example.com")
                .passwordHash("hashedPassword")
                .enabled(false)
                .role(Role.USER)
                .build();

        testCode = new VerificationCode();
        testCode.setId(UUID.randomUUID());
        testCode.setCode("123456");
        testCode.setUser(testUser);
        testCode.setExpiresAt(LocalDateTime.now().plusMinutes(5));
    }


    @Test
    @DisplayName("Should create 6-digit verification code")
    void shouldCreate6DigitVerificationCode() {
        when(codeRepository.findByUser(testUser)).thenReturn(Optional.empty());
        when(codeRepository.save(any(VerificationCode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VerificationCode createdCode = verificationService.createCode(testUser);

        assertThat(createdCode).isNotNull();
        assertThat(createdCode.getCode()).matches("\\d{6}"); // Exactly 6 digits
        assertThat(createdCode.getUser()).isEqualTo(testUser);
        assertThat(createdCode.getExpiresAt()).isAfter(LocalDateTime.now());
    }

    @Test
    @DisplayName("Should delete old verification code before creating new one")
    void shouldDeleteOldVerificationCodeBeforeCreatingNewOne() {
        VerificationCode oldCode = new VerificationCode();
        oldCode.setCode("999999");
        oldCode.setUser(testUser);

        when(codeRepository.findByUser(testUser)).thenReturn(Optional.of(oldCode));
        when(codeRepository.save(any(VerificationCode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        verificationService.createCode(testUser);

        verify(codeRepository).delete(oldCode);
        verify(codeRepository).save(any(VerificationCode.class));
    }

    @Test
    @DisplayName("Should set expiration time to 60 seconds from now")
    void shouldSetExpirationTimeTo60SecondsFromNow() {
        when(codeRepository.findByUser(testUser)).thenReturn(Optional.empty());
        when(codeRepository.save(any(VerificationCode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDateTime beforeCreation = LocalDateTime.now();

        VerificationCode createdCode = verificationService.createCode(testUser);

        LocalDateTime afterCreation = LocalDateTime.now();

        LocalDateTime expectedExpiryMin = beforeCreation.plusSeconds(60);
        LocalDateTime expectedExpiryMax = afterCreation.plusSeconds(60);

        assertThat(createdCode.getExpiresAt())
                .isAfterOrEqualTo(expectedExpiryMin)
                .isBeforeOrEqualTo(expectedExpiryMax);
    }

    @Test
    @DisplayName("Should generate different codes on multiple calls")
    void shouldGenerateDifferentCodesOnMultipleCalls() {
        when(codeRepository.findByUser(testUser)).thenReturn(Optional.empty());
        when(codeRepository.save(any(VerificationCode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String code1 = verificationService.createCode(testUser).getCode();
        String code2 = verificationService.createCode(testUser).getCode();

        assertThat(code1).isNotEqualTo(code2);
    }


    @Test
    @DisplayName("Should validate correct code and enable user")
    void shouldValidateCorrectCodeAndEnableUser() {
        testCode.setExpiresAt(LocalDateTime.now().plusMinutes(5)); // Not expired
        when(codeRepository.findByCodeAndUserEmail("123456", "test@example.com"))
                .thenReturn(Optional.of(testCode));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Optional<User> result = verificationService.validate("123456", "test@example.com");

        assertThat(result).isPresent();
        assertThat(result.get().isEnabled()).isTrue();

        verify(userRepository).save(argThat(user -> user.isEnabled()));
        verify(codeRepository).delete(testCode);
    }

    @Test
    @DisplayName("Should reject expired verification code")
    void shouldRejectExpiredVerificationCode() {
        testCode.setExpiresAt(LocalDateTime.now().minusSeconds(1)); // Expired
        when(codeRepository.findByCodeAndUserEmail("123456", "test@example.com"))
                .thenReturn(Optional.of(testCode));

        Optional<User> result = verificationService.validate("123456", "test@example.com");

        assertThat(result).isEmpty();
        verify(userRepository, never()).save(any(User.class));
        verify(codeRepository, never()).delete(any(VerificationCode.class));
    }

    @Test
    @DisplayName("Should reject invalid verification code")
    void shouldRejectInvalidVerificationCode() {
        when(codeRepository.findByCodeAndUserEmail("999999", "test@example.com"))
                .thenReturn(Optional.empty());

        Optional<User> result = verificationService.validate("999999", "test@example.com");

        assertThat(result).isEmpty();
        verify(userRepository, never()).save(any(User.class));
        verify(codeRepository, never()).delete(any(VerificationCode.class));
    }

    @Test
    @DisplayName("Should delete verification code after successful validation")
    void shouldDeleteVerificationCodeAfterSuccessfulValidation() {
        testCode.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        when(codeRepository.findByCodeAndUserEmail("123456", "test@example.com"))
                .thenReturn(Optional.of(testCode));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        verificationService.validate("123456", "test@example.com");

        verify(codeRepository).delete(testCode);
    }

    @Test
    @DisplayName("Should not validate code with wrong email")
    void shouldNotValidateCodeWithWrongEmail() {
        when(codeRepository.findByCodeAndUserEmail("123456", "wrong@example.com"))
                .thenReturn(Optional.empty());

        Optional<User> result = verificationService.validate("123456", "wrong@example.com");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Should handle validation at exact expiration time")
    void shouldHandleValidationAtExactExpirationTime() {
        testCode.setExpiresAt(LocalDateTime.now());
        when(codeRepository.findByCodeAndUserEmail("123456", "test@example.com"))
                .thenReturn(Optional.of(testCode));

        Optional<User> result = verificationService.validate("123456", "test@example.com");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Should preserve user data when enabling account")
    void shouldPreserveUserDataWhenEnablingAccount() {
        testCode.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        when(codeRepository.findByCodeAndUserEmail("123456", "test@example.com"))
                .thenReturn(Optional.of(testCode));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Optional<User> result = verificationService.validate("123456", "test@example.com");

        assertThat(result).isPresent();
        User enabledUser = result.get();
        assertThat(enabledUser.getEmail()).isEqualTo(testUser.getEmail());
        assertThat(enabledUser.getFirstname()).isEqualTo(testUser.getFirstname());
        assertThat(enabledUser.getLastname()).isEqualTo(testUser.getLastname());
        assertThat(enabledUser.getRole()).isEqualTo(testUser.getRole());
        assertThat(enabledUser.getPasswordHash()).isEqualTo(testUser.getPasswordHash());
    }
}