package com.paymydine.mobile.data.local

import android.content.Context
import android.util.Base64
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.URI
import java.net.URL
import java.security.MessageDigest
import javax.net.ssl.HttpsURLConnection

/**
 * PMD_ANDROID_OFFLINE_IMAGE_CACHE_V16
 *
 * Menu thumbnails are copied into app-private storage while Cloud is available.
 * Offline WebView never reaches the network: it receives only data: URLs backed
 * by those trusted cached bytes.
 */
class OfflineImageCache(context: Context) {
    private val directory = File(context.filesDir, "pmd-menu-images-v1")

    fun prefetch(
        tenantHost: String,
        items: List<PosMenuItemRow>,
    ) {
        val host = tenantHost.trim().lowercase()
        if (host.isBlank()) return
        directory.mkdirs()

        items.forEach { item ->
            val payload = runCatching {
                JSONObject(item.payloadJson)
            }.getOrNull() ?: return@forEach

            val rawImage = payload.optString("image").trim()
            if (rawImage.isBlank()) {
                remove(item.id)
                return@forEach
            }

            val url = trustedImageUrl(host, rawImage) ?: return@forEach
            val version = payload.optString("updated_at").trim()
            val sourceKey = url.toString() + "|" + version
            val files = filesFor(item.id)

            val current = runCatching {
                JSONObject(files.meta.readText(Charsets.UTF_8))
            }.getOrNull()

            if (
                files.bytes.isFile &&
                files.bytes.length() in 1..MAX_IMAGE_BYTES.toLong() &&
                current?.optString("source_key") == sourceKey &&
                supportedMime(current.optString("mime"))
            ) {
                return@forEach
            }

            runCatching {
                download(url, sourceKey, files)
            }
        }
    }

    fun dataUriForItem(itemId: String): String {
        val files = filesFor(itemId)
        if (!files.bytes.isFile || !files.meta.isFile) return ""

        return runCatching {
            val meta = JSONObject(files.meta.readText(Charsets.UTF_8))
            val mime = meta.optString("mime").trim().lowercase()
            if (!supportedMime(mime)) return@runCatching ""

            val bytes = files.bytes.readBytes()
            if (bytes.isEmpty() || bytes.size > MAX_IMAGE_BYTES) {
                return@runCatching ""
            }

            "data:$mime;base64," +
                Base64.encodeToString(bytes, Base64.NO_WRAP)
        }.getOrDefault("")
    }

    private fun download(
        url: URL,
        sourceKey: String,
        files: CacheFiles,
    ) {
        val connection = (url.openConnection() as HttpsURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 3_500
            readTimeout = 7_000
            useCaches = false
            instanceFollowRedirects = false
            setRequestProperty("Accept", "image/avif,image/webp,image/png,image/jpeg,image/gif")
            setRequestProperty("User-Agent", "PayMyDine-Android-Offline-Image/1")
        }

        try {
            val code = connection.responseCode
            if (code !in 200..299) return

            val mime = connection.contentType
                ?.substringBefore(';')
                ?.trim()
                ?.lowercase()
                .orEmpty()
            if (!supportedMime(mime)) return

            val declared = connection.contentLengthLong
            if (declared > MAX_IMAGE_BYTES) return

            val output = ByteArrayOutputStream(
                when {
                    declared in 1..MAX_IMAGE_BYTES.toLong() -> declared.toInt()
                    else -> 32 * 1024
                },
            )

            connection.inputStream.use { input ->
                val buffer = ByteArray(16 * 1024)
                var total = 0
                while (true) {
                    val count = input.read(buffer)
                    if (count < 0) break
                    total += count
                    if (total > MAX_IMAGE_BYTES) return
                    output.write(buffer, 0, count)
                }
            }

            val bytes = output.toByteArray()
            if (bytes.isEmpty()) return

            directory.mkdirs()
            val tmpBytes = File(files.bytes.absolutePath + ".tmp")
            val tmpMeta = File(files.meta.absolutePath + ".tmp")

            tmpBytes.writeBytes(bytes)
            tmpMeta.writeText(
                JSONObject()
                    .put("source_key", sourceKey)
                    .put("mime", mime)
                    .toString(),
                Charsets.UTF_8,
            )

            if (!tmpBytes.renameTo(files.bytes)) {
                tmpBytes.copyTo(files.bytes, overwrite = true)
                tmpBytes.delete()
            }
            if (!tmpMeta.renameTo(files.meta)) {
                tmpMeta.copyTo(files.meta, overwrite = true)
                tmpMeta.delete()
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun trustedImageUrl(
        tenantHost: String,
        raw: String,
    ): URL? = runCatching {
        val uri = when {
            raw.startsWith("https://", ignoreCase = true) -> URI(raw)
            raw.startsWith("/") -> URI("https://$tenantHost$raw")
            else -> URI("https://$tenantHost/" + raw.trimStart('/'))
        }

        if (!uri.scheme.equals("https", ignoreCase = true)) return@runCatching null
        if (!uri.host.equals(tenantHost, ignoreCase = true)) return@runCatching null
        if (uri.userInfo != null) return@runCatching null
        if (uri.port !in setOf(-1, 443)) return@runCatching null

        uri.toURL()
    }.getOrNull()

    private fun supportedMime(value: String): Boolean =
        value.lowercase() in setOf(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/avif",
        )

    private fun remove(itemId: String) {
        val files = filesFor(itemId)
        files.bytes.delete()
        files.meta.delete()
    }

    private fun filesFor(itemId: String): CacheFiles {
        val key = MessageDigest.getInstance("SHA-256")
            .digest(itemId.toByteArray(Charsets.UTF_8))
            .joinToString("") { byte -> "%02x".format(byte) }

        return CacheFiles(
            bytes = File(directory, "$key.bin"),
            meta = File(directory, "$key.json"),
        )
    }

    private data class CacheFiles(
        val bytes: File,
        val meta: File,
    )

    companion object {
        private const val MAX_IMAGE_BYTES = 1_500_000
    }
}
