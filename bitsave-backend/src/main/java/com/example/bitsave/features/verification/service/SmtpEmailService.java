package com.example.bitsave.features.verification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Profile("prod")

public class SmtpEmailService implements EmailService {

    private final JavaMailSender mailSender;

    @Override
    public void sendVerificationEmail(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Dein Bestätigungscode");
        String emailText = "Hallo,\n\n" +
                "Dein Bestätigungscode lautet:\n\n" +
                code + "\n\n" +
                "Bitte gib diesen Code in der App ein.";

        message.setText(emailText);
        mailSender.send(message);
    }
}
