package com.example.bitsave.features.verification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Profile("!prod")

public class DevEmailSender implements EmailService{

    @Override
    public void sendVerificationEmail(String to, String code) {
        System.out.println("\n--- [SIMULIERTER E-MAIL VERSAND] ---");
        System.out.println("Empfänger: " + to);
        System.out.println("Betreff: Dein Bestätigungscode");
        System.out.println("Code: " + code);
        System.out.println("------------------------------------\n");
    }
}
