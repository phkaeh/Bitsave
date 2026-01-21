package com.example.bitsave.features.vault.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CipherRequest {

    @NotNull
    private Integer type;

    @NotBlank
    private String data;

    @NotNull
    private Boolean favorite;

}
