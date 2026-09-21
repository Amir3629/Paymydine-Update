package com.paymydine.mobile.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class DeviceCredentialStore(context: Context) {
    private val prefs = context.getSharedPreferences("pmd-device-v1", Context.MODE_PRIVATE)

    fun setTenantHost(value: String) = prefs.edit().putString("tenant_host", value.trim().lowercase()).apply()
    fun tenantHost(): String? = prefs.getString("tenant_host", null)
    fun setDeviceId(value: String) = prefs.edit().putString("device_id", value).apply()
    fun deviceId(): String? = prefs.getString("device_id", null)
    fun setEdgeFingerprint(value: String) = prefs.edit().putString("edge_fingerprint", value.trim().lowercase()).apply()
    fun edgeFingerprint(): String? = prefs.getString("edge_fingerprint", null)
    fun clearEdgeFingerprint() = prefs.edit().remove("edge_fingerprint").apply()
    fun putDeviceToken(value: String) = putSecret("device_token", value)
    fun deviceToken(): String? = getSecret("device_token")
    fun putPairingVerifier(value: String) = putSecret("pairing_verifier", value)
    fun pairingVerifier(): String? = getSecret("pairing_verifier")
    fun clearPairingVerifier() = prefs.edit().remove("pairing_verifier").apply()
    fun setPairingRequest(value: String) =
        prefs.edit().putString("pairing_request", value.trim().lowercase()).apply()
    fun pairingRequest(): String? = prefs.getString("pairing_request", null)
    fun clearPairingRequest() = prefs.edit().remove("pairing_request").apply()
    fun clearPairingAttempt() =
        prefs.edit()
            .remove("pairing_verifier")
            .remove("pairing_request")
            .apply()
    fun clearIdentity() = prefs.edit().clear().apply()

    private fun putSecret(name: String, plaintext: String) {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val encrypted = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
        prefs.edit().putString(
            name,
            Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" +
                Base64.encodeToString(encrypted, Base64.NO_WRAP)
        ).apply()
    }

    private fun getSecret(name: String): String? {
        val parts = prefs.getString(name, null)?.split(":", limit = 2) ?: return null
        if (parts.size != 2) return null
        return runCatching {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(
                Cipher.DECRYPT_MODE,
                secretKey(),
                GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP))
            )
            cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)).toString(Charsets.UTF_8)
        }.getOrNull()
    }

    private fun secretKey(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return generator.generateKey()
    }

    companion object {
        private const val KEY_ALIAS = "paymydine-device-secret-v1"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}
