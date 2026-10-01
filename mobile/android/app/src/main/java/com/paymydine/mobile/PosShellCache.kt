package com.paymydine.mobile

import android.content.Context
import java.io.File

/**
 * PMD_ANDROID_CANONICAL_POS_SHELL_CACHE_V18
 *
 * Stores the last fully rendered canonical Quick POS document after a verified
 * online load. Cold-start offline then reuses the exact same HTML structure,
 * while CSS/JS are served from the exact build-time copies bundled in the APK.
 */
class PosShellCache(context: Context) {
    private val shell = File(context.filesDir, "pmd-canonical-pos-shell-v18.html")

    fun save(html: String) {
        val value = html.trim()
        if (
            value.length < 2_000 ||
            value.length > MAX_HTML_CHARS ||
            !value.contains("id=\"pmd-quick-pos\"") &&
                !value.contains("id='pmd-quick-pos'")
        ) {
            return
        }

        val tmp = File(shell.absolutePath + ".tmp")
        tmp.writeText(value, Charsets.UTF_8)
        if (!tmp.renameTo(shell)) {
            tmp.copyTo(shell, overwrite = true)
            tmp.delete()
        }
    }

    fun read(): String? =
        runCatching {
            if (!shell.isFile) return@runCatching null
            val value = shell.readText(Charsets.UTF_8)
            value.takeIf {
                it.length in 2_000..MAX_HTML_CHARS &&
                    (
                        it.contains("id=\"pmd-quick-pos\"") ||
                            it.contains("id='pmd-quick-pos'")
                    )
            }
        }.getOrNull()

    fun hasShell(): Boolean = read() != null

    companion object {
        private const val MAX_HTML_CHARS = 3_000_000
    }
}
