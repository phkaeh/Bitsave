package com.example.bitsave.features.auth.service;

import com.example.bitsave.features.auth.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;


import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

/**
 * Service responsible for the JSON Web Token (JWT) lifecycle.
 * Handles generation, extraction, and validation of both Access and Refresh tokens.
 * Utilizes HMAC SHA-256 for secure token signing.
 */
@Service
public class JwtService {

    @Value("${jwt.SECRET_KEY}")
    private String SECRET_KEY;

    /**
     * Extracts the subject (username/email) from the token.
     * @param token The JWT string.
     * @return The username contained in the subject claim.
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extracts the custom 'userId' claim from the token.
     * Useful for performing database operations without re-querying the user by email.
     * @param token The JWT string.
     * @return The UUID of the user or null if not present.
     */
    public UUID extractUserId(String token) {
        String userIdString = extractClaim(token, claims -> claims.get("userId", String.class));
        return userIdString != null ? UUID.fromString(userIdString) : null;
    }

    /**
     * Extracts the username even if the token has expired.
     * @param token The expired or invalid JWT string.
     * @return The username from the claims, even if an ExpiredJwtException occurred.
     */
    public String extractUsernameWithoutValidation(String token) {
        try {
            return extractClaim(token, Claims::getSubject);
        } catch (ExpiredJwtException e) {
            return e.getClaims().getSubject();
        }
    }

    /**
     * Generic helper to extract a specific claim from the token using a resolver function.
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Generates a long-lived Refresh Token (1 hour).
     * Used to obtain new access tokens without requiring user credentials.
     */
    public String generateRefreshToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("jti", UUID.randomUUID().toString());
        return generateToken(claims, user, 1000 * 60 * 60); // 1 hour
    }

    /**
     * Generates a short-lived Access Token (15 minutes).
     */
    public String generateAccessToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("jti", UUID.randomUUID().toString());
        return generateToken(claims, user, 1000 * 60 * 15); // 15 minutes
    }

    /**
     * Core logic for JWT construction.
     * @param extraClaims Additional data to include (e.g., userId).
     * @param userDetails The Spring Security user details.
     * @param expiration Time in milliseconds until the token expires.
     * @return A signed, compacted JWT string.
     */
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails, long expiration) {
        return Jwts
                .builder()
                .setClaims(extraClaims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt((new Date(System.currentTimeMillis())))
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Validates if the token belongs to the user and is not expired.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Checks if the token's expiration date has passed.
     */
    public boolean isTokenExpired(String token) {
        try {
            return extractExpiration(token).before(new Date());
        } catch (ExpiredJwtException e) {
            return true;
        }
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Parses the JWT string and validates the signature using the Signing Key.
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /**
     * Decodes the Base64 SECRET_KEY and generates the HMAC-SHA signing key.
     */
    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(SECRET_KEY);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}