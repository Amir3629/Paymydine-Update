package com.paymydine.mobile.hardware

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.InetSocketAddress
import java.net.Socket

/**
 * PMD_ANDROID_RECEIPT_PRINTER_V17
 *
 * App-wide receipt-printer authority for the PayMyDine Device App. A standard
 * LAN ESC/POS printer can be configured once and reused by kiosk, cashier and
 * waiter surfaces without exposing printer credentials to guest WebViews.
 */
data class ReceiptPrinterSettings(
    val host: String,
    val port: Int,
    val enabled: Boolean,
)

class ReceiptPrinterManager(context: Context) {
    private val appContext = context.applicationContext
    private val preferences =
        appContext.getSharedPreferences(
            "pmd-device-hardware-v1",
            Context.MODE_PRIVATE,
        )

    fun settings(): ReceiptPrinterSettings =
        ReceiptPrinterSettings(
            host = preferences.getString(KEY_HOST, "").orEmpty(),
            port = preferences.getInt(KEY_PORT, DEFAULT_PORT),
            enabled = preferences.getBoolean(KEY_ENABLED, false),
        )

    fun save(
        host: String,
        port: Int,
        enabled: Boolean = true,
    ) {
        val normalizedHost = normalizeHost(host)
        require(normalizedHost.isNotBlank()) {
            "Enter the receipt printer IP address or host."
        }
        require(port in 1..65535) {
            "Printer port must be between 1 and 65535."
        }

        preferences.edit()
            .putString(KEY_HOST, normalizedHost)
            .putInt(KEY_PORT, port)
            .putBoolean(KEY_ENABLED, enabled)
            .apply()
    }

    fun disable() {
        preferences.edit().putBoolean(KEY_ENABLED, false).apply()
    }

    suspend fun testPrint(): Result<Unit> =
        printText(
            buildString {
                appendLine("PayMyDine")
                appendLine("Printer connected")
                appendLine("------------------------------")
                appendLine("Device App receipt printer test")
            },
            force = true,
        )

    suspend fun printReceipt(text: String): Result<Unit> =
        printText(text, force = false)

    private suspend fun printText(
        text: String,
        force: Boolean,
    ): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val current = settings()
            if (!force && !current.enabled) return@runCatching
            require(current.host.isNotBlank()) {
                "Receipt printer is not configured."
            }

            val socket = Socket()
            try {
                socket.connect(
                    InetSocketAddress(current.host, current.port),
                    CONNECT_TIMEOUT_MS,
                )
                socket.soTimeout = WRITE_TIMEOUT_MS
                socket.getOutputStream().use { output ->
                    // ESC @ = initialize, followed by UTF-8 receipt text,
                    // feed and GS V cut. Unsupported cutters safely ignore it.
                    output.write(byteArrayOf(0x1B, 0x40))
                    output.write(
                        text
                            .replace("\r\n", "\n")
                            .trim()
                            .toByteArray(Charsets.UTF_8),
                    )
                    output.write(byteArrayOf(0x0A, 0x0A, 0x0A))
                    output.write(byteArrayOf(0x1D, 0x56, 0x00))
                    output.flush()
                }
            } finally {
                runCatching { socket.close() }
            }
        }
    }

    private fun normalizeHost(raw: String): String =
        raw.trim()
            .removePrefix("http://")
            .removePrefix("https://")
            .substringBefore('/')
            .substringBefore(':')
            .trim()

    companion object {
        private const val KEY_HOST = "receipt_printer_host"
        private const val KEY_PORT = "receipt_printer_port"
        private const val KEY_ENABLED = "receipt_printer_enabled"
        private const val DEFAULT_PORT = 9100
        private const val CONNECT_TIMEOUT_MS = 3_500
        private const val WRITE_TIMEOUT_MS = 4_000
    }
}
