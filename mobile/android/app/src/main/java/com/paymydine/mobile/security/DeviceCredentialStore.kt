package com.paymydine.mobile.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class StaffSession(
    val username: String,
    val staffName: String,
    val userId: Long,
    val staffId: Long,
    val roleCode: String,
    val route: String,
    val surface: String,
    val staffGrant: String,
    val expiresAtEpochSeconds: Long,
)

class DeviceCredentialStore(context: Context) {
    private val prefs = context.getSharedPreferences("pmd-device-v1", Context.MODE_PRIVATE)

    fun setTenantHost(value: String) = prefs.edit().putString("tenant_host", value.trim().lowercase()).apply()
    fun tenantHost(): String? = prefs.getString("tenant_host", null)
    fun setDeviceId(value: String) = prefs.edit().putString("device_id", value).apply()
    fun deviceId(): String? = prefs.getString("device_id", null)
    fun setEdgeFingerprint(value: String) = prefs.edit().putString("edge_fingerprint", value.trim().lowercase()).apply()
    fun edgeFingerprint(): String? = prefs.getString("edge_fingerprint", null)
    fun clearEdgeFingerprint() = prefs.edit().remove("edge_fingerprint").apply()

    // PMD_ANDROID_WORKSPACE_INTENT_V2
    // This is a UX preference only, never an authorization claim. Cloud
    // bootstrap permissions still decide which workspaces the paired identity
    // may actually open.
    fun setPreferredWorkspace(value: String?) {
        val normalized = value?.trim()?.lowercase()
        if (normalized in setOf("pos", "kds", "reservations")) {
            prefs.edit().putString("preferred_workspace", normalized).apply()
        } else {
            prefs.edit().remove("preferred_workspace").apply()
        }
    }
    fun preferredWorkspace(): String? =
        prefs.getString("preferred_workspace", null)
            ?.takeIf { it in setOf("pos", "kds", "reservations") }
    // PMD_ANDROID_WORKSPACE_LEASE_V1
    // Passwords are never persisted. A successful Cloud re-auth only stores an
    // encrypted, short-lived continuation lease for the exact workspace.
    fun putWorkspaceLease(
        surface: String,
        username: String,
        expiresAtEpochSeconds: Long,
    ) {
        val normalized = normalizeWorkspace(surface) ?: return
        putSecret(
            "workspace_lease_$normalized",
            expiresAtEpochSeconds.toString() + "|" + username.trim(),
        )
        setPreferredWorkspace(normalized)
    }

    fun workspaceLeaseValid(
        surface: String,
        nowEpochSeconds: Long = System.currentTimeMillis() / 1000L,
    ): Boolean {
        val normalized = normalizeWorkspace(surface) ?: return false
        val raw = getSecret("workspace_lease_$normalized") ?: return false
        val expiresAt = raw.substringBefore('|').toLongOrNull() ?: return false
        return expiresAt > nowEpochSeconds
    }

    fun workspaceLeaseUsername(surface: String): String? {
        val normalized = normalizeWorkspace(surface) ?: return null
        val raw = getSecret("workspace_lease_$normalized") ?: return null
        return raw.substringAfter('|', "").trim().takeIf { it.isNotBlank() }
    }

    fun clearWorkspaceLease(surface: String) {
        val normalized = normalizeWorkspace(surface) ?: return
        prefs.edit().remove("workspace_lease_$normalized").apply()
    }

    private fun normalizeWorkspace(value: String?): String? =
        value?.trim()?.lowercase()
            ?.takeIf { it in setOf("pos", "kds", "reservations") }

    // PMD_ANDROID_STAFF_SESSION_V1
    // Human credentials are never stored. Only the post-auth identity/routing
    // lease is encrypted with Android Keystore for offline continuation.
    fun putStaffSession(session: StaffSession) {
        putSecret(
            "staff_session_v1",
            JSONObject()
                .put("username", session.username)
                .put("staff_name", session.staffName)
                .put("user_id", session.userId)
                .put("staff_id", session.staffId)
                .put("role_code", session.roleCode)
                .put("route", session.route)
                .put("surface", session.surface)
                .put("staff_grant", session.staffGrant)
                .put("expires_at", session.expiresAtEpochSeconds)
                .toString(),
        )
    }

    fun staffSession(): StaffSession? {
        val raw = getSecret("staff_session_v1") ?: return null
        return runCatching {
            val json = JSONObject(raw)
            StaffSession(
                username = json.getString("username"),
                staffName = json.optString("staff_name"),
                userId = json.optLong("user_id"),
                staffId = json.optLong("staff_id"),
                roleCode = json.getString("role_code"),
                route = json.getString("route"),
                surface = json.getString("surface"),
                staffGrant = json.getString("staff_grant"),
                expiresAtEpochSeconds = json.getLong("expires_at"),
            )
        }.getOrNull()
    }

    fun staffSessionValid(
        nowEpochSeconds: Long = System.currentTimeMillis() / 1000L,
    ): Boolean = staffSession()
        ?.expiresAtEpochSeconds
        ?.let { it > nowEpochSeconds }
        ?: false

    fun clearStaffSession() =
        prefs.edit().remove("staff_session_v1").apply()

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
