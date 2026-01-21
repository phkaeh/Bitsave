package com.example.bitsave.config;

import com.example.bitsave.features.auth.model.Role;
import com.example.bitsave.features.auth.model.User;
import com.example.bitsave.features.auth.repository.UserRepository;
import com.example.bitsave.features.vault.repository.CipherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor

public class ApplicationConfig {

    private final UserRepository repository;
    private final CipherRepository cipherRepository;

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> repository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    @Profile("!prod")
    public CommandLineRunner initDemoData() {
        return args -> {
            String demoEmail = "demo@portfolio.com";

            User demoUser = repository.findByEmail(demoEmail)
                    .orElseGet(() -> {
                        User newUser = User.builder()
                                .firstname("Demo")
                                .lastname("User")
                                .email(demoEmail)
                                .passwordHash(passwordEncoder().encode("Demo1234!"))
                                .enabled(true)
                                .role(Role.USER)
                                .build();
                        return repository.save(newUser);
                    });
        };
    }
}
