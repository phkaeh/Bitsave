package com.example.bitsave.shared.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

public class NoHtmlValidator implements ConstraintValidator<NoHtml, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {

        if (value == null || value.trim().isEmpty()) {
            return true;
        }

        if (!Jsoup.isValid(value, Safelist.none())) {
            return false;
        }

        String normalized = value.toLowerCase().replaceAll("\\s+", "");

        return !normalized.contains("javascript:") &&
                !normalized.contains("vbscript:") &&
                !normalized.contains("data:");
    }
}
