package com.example.bitsave.features.vault.service;

import com.example.bitsave.features.vault.repository.CipherRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Background service responsible for enforcing the system's data retention policy.
 * Automatically purges items from the 'Trash' that have exceeded the 30-day retention period.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CipherCleanupService {

    private final CipherRepository cipherRepository;

    /**
     * Scheduled task that runs daily at 3:00 AM.
     * Identifies and permanently removes ciphers that were soft-deleted more than 30 days ago.
     * discarded sensitive data is not kept indefinitely.
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupDeletedCiphers() {
        try {
            // Define the age limit for deleted items (30 days)
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30);

            // Execute bulk deletion of expired records
            int deleted = cipherRepository.deleteByDeletedDateBefore(cutoffDate);

            if (deleted > 0) {
                log.info("Cleanup Task: Permanently deleted {} expired ciphers from the trash.", deleted);
            }
        } catch (Exception ex) {
            // Log the error but prevent the scheduler from crashing
            log.error("Critical Error during scheduled cipher cleanup", ex);
        }
    }
}