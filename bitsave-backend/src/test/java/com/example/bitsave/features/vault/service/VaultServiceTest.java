package com.example.bitsave.features.vault.service;

import com.example.bitsave.features.auth.model.Role;
import com.example.bitsave.features.auth.model.User;
import com.example.bitsave.features.vault.dto.CipherRequest;
import com.example.bitsave.features.vault.model.Cipher;
import com.example.bitsave.features.vault.repository.CipherRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for VaultService.
 * Tests CRUD operations, ownership validation, and soft-deletion.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Vault Service Tests")
class VaultServiceTest {

    @Mock
    private CipherRepository cipherRepository;

    @InjectMocks
    private VaultService vaultService;

    private User testUser;
    private Cipher testCipher;
    private CipherRequest testRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .passwordHash("hashed")
                .enabled(true)
                .role(Role.USER)
                .build();

        testCipher = Cipher.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .type(1)
                .data("encryptedData")
                .favorite(false)
                .created(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        testRequest = CipherRequest.builder()
                .type(1)
                .data("newEncryptedData")
                .favorite(false)
                .build();
    }

    @Test
    @DisplayName("Should get all ciphers for user")
    void shouldGetAllCiphersForUser() {
        List<Cipher> ciphers = List.of(testCipher);
        when(cipherRepository.findAllByUserId(testUser.getId())).thenReturn(ciphers);

        List<Cipher> result = vaultService.getAllCiphers(testUser.getId());

        assertThat(result).hasSize(1);
        assertThat(result.getFirst()).isEqualTo(testCipher);
        verify(cipherRepository).findAllByUserId(testUser.getId());
    }

    @Test
    @DisplayName("Should return empty list when user has no ciphers")
    void shouldReturnEmptyListWhenUserHasNoCiphers() {
        when(cipherRepository.findAllByUserId(testUser.getId())).thenReturn(List.of());

        List<Cipher> result = vaultService.getAllCiphers(testUser.getId());

        assertThat(result).isEmpty();
    }


    @Test
    @DisplayName("Should get cipher by id when owned by user")
    void shouldGetCipherByIdWhenOwnedByUser() {
        when(cipherRepository.findByIdAndUserId(testCipher.getId(), testUser.getId()))
                .thenReturn(Optional.of(testCipher));

        Cipher result = vaultService.getCipherById(testCipher.getId(), testUser.getId());

        assertThat(result).isEqualTo(testCipher);
    }

    @Test
    @DisplayName("Should throw exception when cipher not found")
    void shouldThrowExceptionWhenCipherNotFound() {
        UUID nonExistentId = UUID.randomUUID();
        when(cipherRepository.findByIdAndUserId(nonExistentId, testUser.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> vaultService.getCipherById(nonExistentId, testUser.getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("not found or access denied");
    }

    @Test
    @DisplayName("Should throw exception when accessing another user's cipher")
    void shouldThrowExceptionWhenAccessingAnotherUsersCipher() {
        UUID otherUserId = UUID.randomUUID();
        when(cipherRepository.findByIdAndUserId(testCipher.getId(), otherUserId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> vaultService.getCipherById(testCipher.getId(), otherUserId))
                .isInstanceOf(ResponseStatusException.class);
    }


    @Test
    @DisplayName("Should create cipher successfully")
    void shouldCreateCipherSuccessfully() {
        when(cipherRepository.save(any(Cipher.class))).thenReturn(testCipher);

        Cipher result = vaultService.createCipher(testRequest, testUser);

        assertThat(result).isNotNull();
        verify(cipherRepository).save(argThat(cipher ->
                cipher.getType().equals(testRequest.getType()) &&
                        cipher.getData().equals(testRequest.getData()) &&
                        cipher.getUser().equals(testUser)
        ));
    }

    @Test
    @DisplayName("Should set favorite to false when not specified")
    void shouldSetFavoriteToFalseWhenNotSpecified() {
        CipherRequest requestWithoutFavorite = CipherRequest.builder()
                .type(1)
                .data("data")
                .favorite(null)
                .build();

        when(cipherRepository.save(any(Cipher.class))).thenReturn(testCipher);

        vaultService.createCipher(requestWithoutFavorite, testUser);

        verify(cipherRepository).save(argThat(cipher -> !cipher.isFavorite()));
    }


    @Test
    @DisplayName("Should update cipher successfully")
    void shouldUpdateCipherSuccessfully() {
        when(cipherRepository.findByIdAndUserId(testCipher.getId(), testUser.getId()))
                .thenReturn(Optional.of(testCipher));
        when(cipherRepository.save(any(Cipher.class))).thenReturn(testCipher);

        Cipher result = vaultService.updateCipher(testCipher.getId(), testRequest, testUser.getId());

        assertThat(result).isNotNull();
        verify(cipherRepository).save(argThat(cipher ->
                cipher.getType().equals(testRequest.getType()) &&
                        cipher.getData().equals(testRequest.getData())
        ));
    }

    @Test
    @DisplayName("Should throw exception when updating non-existent cipher")
    void shouldThrowExceptionWhenUpdatingNonExistentCipher() {
        UUID nonExistentId = UUID.randomUUID();
        when(cipherRepository.findByIdAndUserId(nonExistentId, testUser.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> vaultService.updateCipher(nonExistentId, testRequest, testUser.getId()))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    @DisplayName("Should prevent updating another user's cipher")
    void shouldPreventUpdatingAnotherUsersCipher() {
        UUID otherUserId = UUID.randomUUID();
        when(cipherRepository.findByIdAndUserId(testCipher.getId(), otherUserId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> vaultService.updateCipher(testCipher.getId(), testRequest, otherUserId))
                .isInstanceOf(ResponseStatusException.class);
    }


    @Test
    @DisplayName("Should soft delete cipher")
    void shouldSoftDeleteCipher() {
        when(cipherRepository.findByIdAndUserId(testCipher.getId(), testUser.getId()))
                .thenReturn(Optional.of(testCipher));
        when(cipherRepository.save(any(Cipher.class))).thenReturn(testCipher);

        vaultService.softDeleteCipher(testCipher.getId(), testUser.getId());

        verify(cipherRepository).save(argThat(cipher ->
                cipher.getDeletedDate() != null
        ));
    }

    @Test
    @DisplayName("Should prevent soft deleting another user's cipher")
    void shouldPreventSoftDeletingAnotherUsersCipher() {
        UUID otherUserId = UUID.randomUUID();
        when(cipherRepository.findByIdAndUserId(testCipher.getId(), otherUserId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> vaultService.softDeleteCipher(testCipher.getId(), otherUserId))
                .isInstanceOf(ResponseStatusException.class);
    }


    @Test
    @DisplayName("Should restore soft-deleted cipher")
    void shouldRestoreSoftDeletedCipher() {
        testCipher.setDeletedDate(LocalDateTime.now());
        when(cipherRepository.findByIdAndUserId(testCipher.getId(), testUser.getId()))
                .thenReturn(Optional.of(testCipher));
        when(cipherRepository.save(any(Cipher.class))).thenReturn(testCipher);

        vaultService.restoreCipher(testCipher.getId(), testUser.getId());

        verify(cipherRepository).save(argThat(cipher ->
                cipher.getDeletedDate() == null
        ));
    }

    @Test
    @DisplayName("Should throw exception when restoring non-deleted cipher")
    void shouldThrowExceptionWhenRestoringNonDeletedCipher() {
        testCipher.setDeletedDate(null);
        when(cipherRepository.findByIdAndUserId(testCipher.getId(), testUser.getId()))
                .thenReturn(Optional.of(testCipher));

        assertThatThrownBy(() -> vaultService.restoreCipher(testCipher.getId(), testUser.getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("not in the trash");
    }


    @Test
    @DisplayName("Should permanently delete soft-deleted cipher")
    void shouldPermanentlyDeleteSoftDeletedCipher() {
        testCipher.setDeletedDate(LocalDateTime.now());
        when(cipherRepository.findByIdAndUserId(testCipher.getId(), testUser.getId()))
                .thenReturn(Optional.of(testCipher));

        vaultService.permanentDeleteCipher(testCipher.getId(), testUser.getId());

        verify(cipherRepository).delete(testCipher);
    }

    @Test
    @DisplayName("Should prevent permanent deletion of non-soft-deleted cipher")
    void shouldPreventPermanentDeletionOfNonSoftDeletedCipher() {
        testCipher.setDeletedDate(null);
        when(cipherRepository.findByIdAndUserId(testCipher.getId(), testUser.getId()))
                .thenReturn(Optional.of(testCipher));

        assertThatThrownBy(() -> vaultService.permanentDeleteCipher(testCipher.getId(), testUser.getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("must be soft-deleted");
    }

    @Test
    @DisplayName("Should prevent permanent deletion of another user's cipher")
    void shouldPreventPermanentDeletionOfAnotherUsersCipher() {
        UUID otherUserId = UUID.randomUUID();
        when(cipherRepository.findByIdAndUserId(testCipher.getId(), otherUserId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> vaultService.permanentDeleteCipher(testCipher.getId(), otherUserId))
                .isInstanceOf(ResponseStatusException.class);
    }
}