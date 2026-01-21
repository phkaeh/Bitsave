package com.example.bitsave.features.auth.dto;

import com.example.bitsave.shared.validation.NoHtml;
import jakarta.persistence.Column;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor

public class RegisterRequest {

    @NotBlank(message = "Vorname ist erforderlich.")
    @NoHtml
    private String firstname;

    @NotBlank(message = "Nachname ist erforderlich.")
    @NoHtml
    private String lastname;

    @Column(unique = true)
    @NotBlank(message = "E-Mail ist erforderlich.")
    @Email(message = "Ungültiges E-Mail-Format.")
    @NoHtml
    private String email;

    @NotBlank(message = "Passwort ist erforderlich.")
    @Size(min = 8, message = "Passwort muss mindestens 8 Zeichen lang sein.")
    @NoHtml
    private String passwordHash;

}
