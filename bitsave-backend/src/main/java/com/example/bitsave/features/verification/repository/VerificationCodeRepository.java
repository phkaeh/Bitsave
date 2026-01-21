package com.example.bitsave.features.verification.repository;

import com.example.bitsave.features.auth.model.User;
import com.example.bitsave.features.verification.model.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {
    Optional<VerificationCode> findByCodeAndUserEmail(String code, String email);
    Optional<VerificationCode> findByUser(User user);
}
