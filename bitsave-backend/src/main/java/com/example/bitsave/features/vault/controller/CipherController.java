package com.example.bitsave.features.vault.controller;

import com.example.bitsave.features.auth.model.User;
import com.example.bitsave.features.vault.dto.CipherRequest;
import com.example.bitsave.features.vault.model.Cipher;
import com.example.bitsave.features.vault.service.VaultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller managing vault entries (Ciphers).
 * Provides endpoints for CRUD operations, soft-deletion, and restoration.
 * strict data ownership and prevent ID-spoofing attacks.
 */
@RestController
@RequestMapping("api/v1/ciphers")
@RequiredArgsConstructor
public class CipherController {

    private final VaultService vaultService;

    /**
     * Retrieves all vault entries for the currently authenticated user.
     * @param user The authenticated user principal injected by Spring Security.
     * @return List of ciphers (encrypted blobs) owned by the user.
     */
    @GetMapping
    public ResponseEntity<List<Cipher>> getAllCiphers(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vaultService.getAllCiphers(user.getId()));
    }

    /**
     * Retrieves a specific vault entry by its ID.
     * @param id The UUID of the cipher.
     * @param user The authenticated user principal.
     * @return The requested cipher if ownership is verified.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Cipher> getCipherById(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vaultService.getCipherById(id, user.getId()));
    }

    /**
     * Creates a new encrypted vault entry.
     * @param user The authenticated user principal.
     * @param request DTO containing the encrypted payload and cipher metadata.
     * @return The newly created Cipher object.
     */
    @PostMapping
    public ResponseEntity<Cipher> createCipher(@AuthenticationPrincipal User user,@Valid @RequestBody CipherRequest request) {
        return ResponseEntity.ok(vaultService.createCipher(request, user));
    }

    /**
     * Updates an existing vault entry.
     * @param id The UUID of the cipher to update.
     * @param request DTO containing the updated encrypted data.
     * @param user The authenticated user principal.
     * @return The updated Cipher object.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Cipher> updateCipher(@PathVariable UUID id,@Valid @RequestBody CipherRequest request, @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(vaultService.updateCipher(id, request, user.getId()));
    }

    /**
     * Performs a soft-delete on a vault entry (moves it to the trash).
     * @param id The UUID of the cipher to delete.
     * @param user The authenticated user principal.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCipher(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        vaultService.softDeleteCipher(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Restores a previously soft-deleted vault entry.
     * @param id The UUID of the cipher to restore.
     * @param user The authenticated user principal.
     */
    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restoreCipher(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        vaultService.restoreCipher(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Irreversibly deletes a vault entry from the database.
     * @param id The UUID of the cipher to delete permanently.
     * @param user The authenticated user principal.
     */
    @DeleteMapping("/{id}/permanent-delete")
    public ResponseEntity<Void> permanentDeleteCipher(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        vaultService.permanentDeleteCipher(id, user.getId());
        return ResponseEntity.noContent().build();
    }
}