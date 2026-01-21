package com.example.bitsave.features.auth.dto;

import com.example.bitsave.shared.validation.NoHtml;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor


public class AuthenticationResponse {
    @NoHtml
    private String accessToken;
    @NoHtml
    private String refreshToken;
}
