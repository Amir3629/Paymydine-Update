package com.paymydine.mobile.edge

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.math.BigInteger
import java.net.Socket
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.Principal
import java.security.PrivateKey
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.Date
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLEngine
import javax.net.ssl.X509ExtendedKeyManager
import javax.security.auth.x500.X500Principal

class EdgeTlsIdentity {
    data class Identity(
        val alias: String,
        val fingerprintSha256: String,
        val certificate: X509Certificate,
        val sslContext: SSLContext,
    )

    fun loadOrCreate(): Identity {
        ensureKey()

        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val privateKey = store.getKey(KEY_ALIAS, null) as? PrivateKey
            ?: error("PayMyDine Edge private key is unavailable.")
        val chain = store.getCertificateChain(KEY_ALIAS)
            ?.map { it as X509Certificate }
            ?.toTypedArray()
            ?: error("PayMyDine Edge certificate chain is unavailable.")

        val fingerprint = MessageDigest.getInstance("SHA-256")
            .digest(chain.first().encoded)
            .joinToString("") { "%02x".format(it) }

        val manager = SingleAliasKeyManager(
            alias = KEY_ALIAS,
            privateKey = privateKey,
            chain = chain,
        )

        val context = SSLContext.getInstance("TLS").apply {
            init(arrayOf(manager), null, SecureRandom())
        }

        return Identity(
            alias = KEY_ALIAS,
            fingerprintSha256 = fingerprint,
            certificate = chain.first(),
            sslContext = context,
        )
    }

    private fun ensureKey() {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (store.containsAlias(KEY_ALIAS)) return

        val now = System.currentTimeMillis()
        val generator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_RSA,
            "AndroidKeyStore",
        )

        generator.initialize(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY,
            )
                .setKeySize(2048)
                .setDigests(
                    KeyProperties.DIGEST_SHA256,
                    KeyProperties.DIGEST_SHA512,
                )
                .setSignaturePaddings(
                    KeyProperties.SIGNATURE_PADDING_RSA_PKCS1,
                )
                .setCertificateSubject(
                    X500Principal("CN=PayMyDine Restaurant Edge"),
                )
                .setCertificateSerialNumber(
                    BigInteger.valueOf(now.coerceAtLeast(1)),
                )
                .setCertificateNotBefore(Date(now - 86_400_000L))
                .setCertificateNotAfter(
                    Date(now + (3650L * 86_400_000L)),
                )
                .build(),
        )

        generator.generateKeyPair()
    }

    private class SingleAliasKeyManager(
        private val alias: String,
        private val privateKey: PrivateKey,
        private val chain: Array<X509Certificate>,
    ) : X509ExtendedKeyManager() {
        override fun getClientAliases(
            keyType: String?,
            issuers: Array<out Principal>?,
        ): Array<String>? = null

        override fun chooseClientAlias(
            keyType: Array<out String>?,
            issuers: Array<out Principal>?,
            socket: Socket?,
        ): String? = null

        override fun getServerAliases(
            keyType: String?,
            issuers: Array<out Principal>?,
        ): Array<String> = arrayOf(alias)

        override fun chooseServerAlias(
            keyType: String?,
            issuers: Array<out Principal>?,
            socket: Socket?,
        ): String = alias

        override fun getCertificateChain(alias: String?): Array<X509Certificate> =
            if (alias == this.alias) chain else emptyArray()

        override fun getPrivateKey(alias: String?): PrivateKey? =
            if (alias == this.alias) privateKey else null

        override fun chooseEngineServerAlias(
            keyType: String?,
            issuers: Array<out Principal>?,
            engine: SSLEngine?,
        ): String = alias
    }

    companion object {
        private const val KEY_ALIAS = "paymydine-edge-tls-v1"
    }
}
