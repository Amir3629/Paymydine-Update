package com.paymydine.tabledisplay

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecureStore(context: Context) {
    private val prefs =
        context.getSharedPreferences("pmd-table-companion-v1", Context.MODE_PRIVATE)

    fun installationId(): String {
        val existing = prefs.getString("installation_id", null)
        if (!existing.isNullOrBlank()) return existing
        val created = UUID.randomUUID().toString()
        prefs.edit().putString("installation_id", created).apply()
        return created
    }

    fun host(): String? = prefs.getString("host", null)
    fun token(): String? = getSecret("device_token")
    fun deviceId(): Long = prefs.getLong("device_id", 0L)

    fun savePairing(host: String, token: String, deviceId: Long) {
        prefs.edit()
            .putString("host", normalizeHost(host))
            .putLong("device_id", deviceId)
            .apply()
        putSecret("device_token", token)
    }

    fun clearPairing() {
        prefs.edit()
            .remove("host")
            .remove("device_id")
            .remove("device_token")
            .apply()
    }

    fun isPaired(): Boolean =
        !host().isNullOrBlank() && !token().isNullOrBlank()

    companion object {
        fun normalizeHost(raw: String): String {
            var value = raw.trim().trimEnd('/')
            if (!value.startsWith("https://", ignoreCase = true)) {
                value = "https://$value"
            }
            require(value.startsWith("https://", ignoreCase = true)) {
                "PayMyDine Table Companion requires HTTPS."
            }
            return value
        }
    }

    private fun putSecret(key: String, value: String) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val payload =
            Base64.encodeToString(cipher.iv, Base64.NO_WRAP) +
                "." +
                Base64.encodeToString(
                    cipher.doFinal(value.toByteArray(Charsets.UTF_8)),
                    Base64.NO_WRAP,
                )
        prefs.edit().putString(key, payload).apply()
    }

    private fun getSecret(key: String): String? {
        val payload = prefs.getString(key, null) ?: return null
        val parts = payload.split(".", limit = 2)
        if (parts.size != 2) return null

        return runCatching {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(
                Cipher.DECRYPT_MODE,
                key(),
                GCMParameterSpec(
                    128,
                    Base64.decode(parts[0], Base64.NO_WRAP),
                ),
            )
            String(
                cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)),
                Charsets.UTF_8,
            )
        }.getOrNull()
    }

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        val existing = store.getKey(KEY_ALIAS, null) as? SecretKey
        if (existing != null) return existing

        val generator =
            KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES,
                "AndroidKeyStore",
            )
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build(),
        )
        return generator.generateKey()
    }

    private companion object {
        const val KEY_ALIAS = "pmd-table-companion-v1"
    }
}
