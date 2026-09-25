package com.paymydine.mobile.security

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OfflineCredentialCryptoTest {
    @Test
    fun sameSecretMatchesStoredVerifier() {
        val salt = OfflineCredentialCrypto.newSalt()
        val verifier = OfflineCredentialCrypto.derive("correct-horse-123", salt)

        assertTrue(
            OfflineCredentialCrypto.matches(
                "correct-horse-123",
                salt,
                verifier,
            ),
        )
    }

    @Test
    fun differentSecretDoesNotMatch() {
        val salt = OfflineCredentialCrypto.newSalt()
        val verifier = OfflineCredentialCrypto.derive("correct-horse-123", salt)

        assertFalse(
            OfflineCredentialCrypto.matches(
                "wrong-horse-123",
                salt,
                verifier,
            ),
        )
    }
}
