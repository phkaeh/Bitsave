package com.example.bitsave.features.auth.repository;

import java.util.Optional;

import com.example.bitsave.features.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByEmail(String email);
}
