package com.paymydine.mobile.security

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PairingPkceTest {
    @Test
    fun generatedVerifierIsRfc7636Compatible() {
        val verifier = PairingPkce.newVerifier()

        assertEquals(43, verifier.length)
        assertTrue(verifier.matches(Regex("^[A-Za-z0-9._~-]{43,128}$")))
        assertEquals(43, PairingPkce.challenge(verifier).length)
    }

    @Test
    fun challengeMatchesRfc7636Vector() {
        val verifier =
            "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"

        assertEquals(
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
            PairingPkce.challenge(verifier),
        )
    }
}
