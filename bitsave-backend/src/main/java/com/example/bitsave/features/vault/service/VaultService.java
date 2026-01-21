package com.example.bitsave.features.vault.service;

import com.example.bitsave.features.auth.model.User;
import com.example.bitsave.features.vault.dto.CipherRequest;
import com.example.bitsave.features.vault.model.Cipher;
import com.example.bitsave.features.vault.repository.CipherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Core service for managing vault entries (Ciphers).
 * Implements full CRUD functionality with a strong focus on data ownership
 * and soft-deletion logic.
 * to prevent unauthorized cross-user data access
 */
@Service
@RequiredArgsConstructor
public class VaultService {
    private final CipherRepository cipherRepository;

    /**
     * Retrieves all encrypted ciphers belonging to a specific user.
     * @param userId The unique identifier of the user.
     * @return A list of Cipher entities.
     */
    public List<Cipher> getAllCiphers(UUID userId) {
        return cipherRepository.findAllByUserId(userId);
    }

    /**
     * Fetches a single cipher by its ID, ensuring it belongs to the requesting user.
     * @param cipherId The ID of the vault entry.
     * @param userId The ID of the authenticated user.
     * @return The Cipher entity if found and authorized.
     * @throws ResponseStatusException 404 if the entry is missing or belongs to another user.
     */
    public Cipher getCipherById(UUID cipherId, UUID userId) {
        return cipherRepository.findByIdAndUserId(cipherId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found or access denied"));
    }

    /**
     * Persists a new encrypted entry to the vault.
     * @param request DTO containing the encrypted payload and metadata.
     * @param user The User entity to be associated with this cipher.
     * @return The saved Cipher entity.
     */
    public Cipher createCipher(CipherRequest request, User user) {
        Cipher cipher = Cipher.builder()
                .type(request.getType())
                .data(request.getData())
                .favorite(request.getFavorite() != null ? request.getFavorite() : false)
                .user(user)
                .build();

        return cipherRepository.save(cipher);
    }

    /**
     * Updates an existing vault entry after verifying ownership.
     * @param id The ID of the entry to update.
     * @param request Updated data and metadata.
     * @param userId The ID of the authenticated user.
     * @return The updated Cipher entity.
     */
    public Cipher updateCipher(UUID id, CipherRequest request, UUID userId) {
        Cipher cipher = cipherRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cipher not found or access denied"));

        cipher.setType(request.getType());
        cipher.setData(request.getData());
        cipher.setFavorite(Boolean.TRUE.equals(request.getFavorite()));
        cipher.setUpdatedAt(LocalDateTime.now());

        return cipherRepository.save(cipher);
    }

    /**
     * Soft-deletes an entry by setting a deletion timestamp.
     * This moves the item to the "Trash" instead of removing it immediately.
     * @param id ID of the entry to soft-delete.
     * @param userId ID of the authenticated user.
     */
    public void softDeleteCipher(UUID id, UUID userId) {
        Cipher cipher = cipherRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        cipher.setDeletedDate(LocalDateTime.now());
        cipher.setUpdatedAt(LocalDateTime.now());
        cipherRepository.save(cipher);
    }

    /**
     * Restores an entry from the trash by clearing the deletion timestamp.
     * @param id ID of the entry to restore.
     * @param userId ID of the authenticated user.
     */
    public void restoreCipher(UUID id, UUID userId) {
        Cipher cipher = cipherRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (cipher.getDeletedDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cipher is not in the trash");
        }

        cipher.setDeletedDate(null);
        cipher.setUpdatedAt(LocalDateTime.now());
        cipherRepository.save(cipher);
    }

    /**
     * Irreversibly deletes an entry from the database.
     * @param id ID of the entry to permanently remove.
     * @param userId ID of the authenticated user.
     */
    public void permanentDeleteCipher(UUID id, UUID userId) {
        Cipher cipher = cipherRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (cipher.getDeletedDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cipher must be soft-deleted before permanent removal");
        }

        cipherRepository.delete(cipher);
    }
}