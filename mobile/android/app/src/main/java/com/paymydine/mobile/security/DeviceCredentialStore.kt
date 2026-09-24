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
    val destination: String,
    val staffGrant: String,
    val expiresAtEpochSeconds: Long,
    val offlineExpiresAtEpochSeconds: Long,
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
                .put("destination", session.destination)
                .put("staff_grant", session.staffGrant)
                .put("expires_at", session.expiresAtEpochSeconds)
                .put(
                    "offline_expires_at",
                    session.offlineExpiresAtEpochSeconds,
                )
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
                destination = json.optString(
                    "destination",
                    "workspace",
                ),
                staffGrant = json.getString("staff_grant"),
                expiresAtEpochSeconds = json.getLong("expires_at"),
                offlineExpiresAtEpochSeconds = json.optLong(
                    "offline_expires_at",
                    json.getLong("expires_at"),
                ),
            )
        }.getOrNull()
    }

    fun staffSessionValid(
        nowEpochSeconds: Long = System.currentTimeMillis() / 1000L,
    ): Boolean = staffSession()
        ?.expiresAtEpochSeconds
        ?.let { it > nowEpochSeconds }
        ?: false

    /**
     * PMD_ANDROID_OFFLINE_SESSION_AUTHORITY_V12
     *
     * Cloud bearer lifetime and local-work authority are intentionally
     * separate. POS/KDS can continue from durable SQLite through the canonical
     * work-session boundary even when the short-lived Cloud grant has expired.
     */
    fun offlineSessionValid(
        surface: String,
        nowEpochSeconds: Long = System.currentTimeMillis() / 1000L,
    ): Boolean {
        val session = staffSession() ?: return false
        val requested = surface.trim().lowercase()
        if (session.surface != requested) return false
        if (requested !in setOf("pos", "kds")) return false
        return session.offlineExpiresAtEpochSeconds > nowEpochSeconds
    }

    // PMD_ANDROID_SAME_LOGIN_OFFLINE_V22
    // Explicit Sign out ends the active session, but the last successfully
    // authorized POS/KDS identity may be re-authenticated offline through the
    // SAME Login card. Only a salted PBKDF2 verifier is retained; the submitted
    // password/PIN itself is never persisted.
    fun rememberOfflineLogin(
        session: StaffSession,
        submittedUsername: String,
        secret: String,
    ) {
        if (
            secret.isBlank() ||
            session.surface !in setOf("pos", "kds") ||
            session.offlineExpiresAtEpochSeconds <=
                System.currentTimeMillis() / 1000L
        ) {
            return
        }

        val mode = if (submittedUsername.isBlank()) "pin" else "password"
        val normalizedUsername = if (mode == "password") {
            submittedUsername.trim().lowercase()
        } else {
            ""
        }
        val salt = OfflineCredentialCrypto.newSalt()
        val verifier = OfflineCredentialCrypto.derive(secret, salt)

        putSecret(
            OFFLINE_LOGIN_KEY,
            JSONObject()
                .put("version", 1)
                .put("tenant_host", tenantHost().orEmpty())
                .put("mode", mode)
                .put("login_username", normalizedUsername)
                .put(
                    "salt",
                    Base64.encodeToString(salt, Base64.NO_WRAP),
                )
                .put(
                    "verifier",
                    Base64.encodeToString(verifier, Base64.NO_WRAP),
                )
                .put("session", staffSessionJson(session))
                .toString(),
        )
    }

    fun offlineLoginAvailable(
        nowEpochSeconds: Long = System.currentTimeMillis() / 1000L,
    ): Boolean {
        val record = offlineLoginRecord() ?: return false
        val session = record.optJSONObject("session")
            ?.let(::staffSessionFromJson)
            ?: return false
        return (
            session.surface in setOf("pos", "kds") &&
                session.offlineExpiresAtEpochSeconds > nowEpochSeconds
        )
    }

    fun offlineLoginUsername(): String? {
        val record = offlineLoginRecord() ?: return null
        if (record.optString("mode") != "password") return null
        return record.optString("login_username")
            .trim()
            .takeIf { it.isNotBlank() }
    }

    fun verifyOfflineLogin(
        submittedUsername: String,
        secret: String,
        nowEpochSeconds: Long = System.currentTimeMillis() / 1000L,
    ): StaffSession? {
        if (secret.isBlank()) return null
        val record = offlineLoginRecord() ?: return null
        val mode = record.optString("mode")
        val expectedUsername = record
            .optString("login_username")
            .trim()
            .lowercase()
        val actualUsername = submittedUsername.trim().lowercase()

        if (
            (mode == "password" && actualUsername != expectedUsername) ||
            (mode == "pin" && actualUsername.isNotBlank()) ||
            mode !in setOf("password", "pin")
        ) {
            return null
        }

        val salt = runCatching {
            Base64.decode(record.getString("salt"), Base64.NO_WRAP)
        }.getOrNull() ?: return null
        val verifier = runCatching {
            Base64.decode(record.getString("verifier"), Base64.NO_WRAP)
        }.getOrNull() ?: return null

        if (!OfflineCredentialCrypto.matches(secret, salt, verifier)) {
            return null
        }

        val session = record.optJSONObject("session")
            ?.let(::staffSessionFromJson)
            ?: return null
        if (
            session.surface !in setOf("pos", "kds") ||
            session.offlineExpiresAtEpochSeconds <= nowEpochSeconds
        ) {
            return null
        }

        return session
    }

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
    fun setPairingSubmitted(value: Boolean) =
        prefs.edit().putBoolean("pairing_submitted", value).apply()
    fun pairingSubmitted(): Boolean =
        prefs.getBoolean("pairing_submitted", false)
    fun clearPairingRequest() =
        prefs.edit()
            .remove("pairing_request")
            .remove("pairing_submitted")
            .apply()
    fun clearPairingAttempt() =
        prefs.edit()
            .remove("pairing_verifier")
            .remove("pairing_request")
            .remove("pairing_submitted")
            .apply()
    fun clearIdentity() = prefs.edit().clear().apply()

    private fun offlineLoginRecord(): JSONObject? {
        val raw = getSecret(OFFLINE_LOGIN_KEY) ?: return null
        return runCatching { JSONObject(raw) }
            .getOrNull()
            ?.takeIf {
                it.optInt("version") == 1 &&
                    it.optString("tenant_host") == tenantHost().orEmpty()
            }
    }

    private fun staffSessionJson(session: StaffSession): JSONObject =
        JSONObject()
            .put("username", session.username)
            .put("staff_name", session.staffName)
            .put("user_id", session.userId)
            .put("staff_id", session.staffId)
            .put("role_code", session.roleCode)
            .put("route", session.route)
            .put("surface", session.surface)
            .put("destination", session.destination)
            .put("staff_grant", session.staffGrant)
            .put("expires_at", session.expiresAtEpochSeconds)
            .put(
                "offline_expires_at",
                session.offlineExpiresAtEpochSeconds,
            )

    private fun staffSessionFromJson(json: JSONObject): StaffSession =
        StaffSession(
            username = json.getString("username"),
            staffName = json.optString("staff_name"),
            userId = json.optLong("user_id"),
            staffId = json.optLong("staff_id"),
            roleCode = json.getString("role_code"),
            route = json.getString("route"),
            surface = json.getString("surface"),
            destination = json.optString("destination", "workspace"),
            staffGrant = json.getString("staff_grant"),
            expiresAtEpochSeconds = json.getLong("expires_at"),
            offlineExpiresAtEpochSeconds = json.optLong(
                "offline_expires_at",
                json.getLong("expires_at"),
            ),
        )

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
        private const val OFFLINE_LOGIN_KEY = "staff_offline_login_v1"
    }
}
