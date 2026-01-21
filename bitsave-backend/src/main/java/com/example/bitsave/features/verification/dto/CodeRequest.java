package com.example.bitsave.features.verification.dto;

import com.example.bitsave.shared.validation.NoHtml;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@Builder
@NoArgsConstructor

public class CodeRequest {

    @NotBlank
    @NoHtml
    private String code;

    @NotBlank
    @NoHtml
    private String email;
}
