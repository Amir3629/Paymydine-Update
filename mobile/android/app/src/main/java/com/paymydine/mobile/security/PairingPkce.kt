package com.paymydine.mobile.security

import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

object PairingPkce {
    fun newVerifier(): String {
        val bytes = ByteArray(32)
        SecureRandom().nextBytes(bytes)
        return base64Url(bytes)
    }

    fun challenge(verifier: String): String {
        require(verifier.matches(Regex("^[A-Za-z0-9._~-]{43,128}$"))) {
            "Invalid PayMyDine pairing verifier."
        }
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(verifier.toByteArray(Charsets.US_ASCII))
        return base64Url(digest)
    }

    private fun base64Url(bytes: ByteArray): String =
        Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(bytes)
}
