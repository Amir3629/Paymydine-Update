package com.paymydine.mobile.security

import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/**
 * PMD_ANDROID_OFFLINE_LOGIN_VERIFIER_V22
 *
 * PayMyDine never persists a staff password or PIN. After a successful online
 * authorization, Android keeps only a salted PBKDF2 verifier inside the
 * Keystore-encrypted credential record. This allows the same canonical Login
 * card to re-authenticate the last verified staff identity during a WAN outage
 * without creating a separate "offline mode" button.
 */
object OfflineCredentialCrypto {
    private const val ITERATIONS = 180_000
    private const val KEY_BITS = 256
    private const val SALT_BYTES = 16

    fun newSalt(): ByteArray =
        ByteArray(SALT_BYTES).also(SecureRandom()::nextBytes)

    fun derive(
        secret: String,
        salt: ByteArray,
    ): ByteArray {
        require(secret.isNotEmpty()) { "Credential is required." }
        require(salt.size >= SALT_BYTES) { "Credential salt is invalid." }

        val spec = PBEKeySpec(
            secret.toCharArray(),
            salt,
            ITERATIONS,
            KEY_BITS,
        )
        return try {
            SecretKeyFactory
                .getInstance("PBKDF2WithHmacSHA256")
                .generateSecret(spec)
                .encoded
        } finally {
            spec.clearPassword()
        }
    }

    fun matches(
        secret: String,
        salt: ByteArray,
        expected: ByteArray,
    ): Boolean {
        if (secret.isEmpty() || expected.isEmpty()) return false
        val actual = runCatching { derive(secret, salt) }.getOrNull()
            ?: return false
        return MessageDigest.isEqual(actual, expected)
    }
}
