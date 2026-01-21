package com.example.bitsave.features.verification.service;

public interface EmailService {
    void sendVerificationEmail(String to, String code);
}
