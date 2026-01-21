package com.example.bitsave.features.vault.repository;

import com.example.bitsave.features.vault.model.Cipher;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CipherRepository extends JpaRepository<Cipher, Long> {

    List<Cipher> findAllByUserId(UUID userId);

    Optional<Cipher> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Transactional
    int deleteByDeletedDateBefore(LocalDateTime cutoffDate);
}
