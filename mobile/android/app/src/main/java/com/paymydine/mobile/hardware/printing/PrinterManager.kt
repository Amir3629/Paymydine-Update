package com.paymydine.mobile.hardware.printing

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.InetSocketAddress
import java.net.Socket
import java.nio.charset.StandardCharsets
import java.text.NumberFormat
import java.util.Currency
import java.util.Locale

/**
 * PMD_SHARED_NETWORK_PRINTER_V18
 *
 * One printer configuration belongs to the PayMyDine Device App installation,
 * not to one role screen. Kiosk, Cashier and Waiter therefore share the same
 * network ESC/POS receipt printer configuration.
 *
 * V18 intentionally starts with the most portable hardware path: an ESC/POS
 * printer reachable by TCP on the restaurant LAN (normally port 9100). USB and
 * vendor-specific Android SDKs can be layered on without changing callers.
 */
data class PrinterConfig(
    val enabled: Boolean,
    val host: String,
    val port: Int,
)

class PrinterManager(context: Context) {
    private val prefs =
        context.applicationContext.getSharedPreferences(
            PREFS,
            Context.MODE_PRIVATE,
        )

    fun config(): PrinterConfig =
        PrinterConfig(
            enabled = prefs.getBoolean(KEY_ENABLED, false),
            host = prefs.getString(KEY_HOST, "").orEmpty().trim(),
            port = prefs.getInt(KEY_PORT, DEFAULT_PORT).coerceIn(1, 65535),
        )

    fun save(
        enabled: Boolean,
        host: String,
        port: Int,
    ) {
        prefs.edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putString(KEY_HOST, host.trim())
            .putInt(KEY_PORT, port.coerceIn(1, 65535))
            .apply()
    }

    suspend fun testPrint(): Result<Unit> =
        printRaw(
            buildString {
                append("PayMyDine printer test\n")
                append("------------------------\n")
                append("Connection OK\n\n\n")
            },
        )

    suspend fun printReceipt(receiptJson: String): Result<Unit> {
        val json =
            runCatching { JSONObject(receiptJson) }
                .getOrElse {
                    return Result.failure(
                        IllegalArgumentException("Receipt payload is invalid."),
                    )
                }

        val currency =
            json.optString("currency", "EUR")
                .uppercase()
                .takeIf { it.length == 3 }
                ?: "EUR"
        val formatter =
            NumberFormat.getCurrencyInstance(Locale.GERMANY).apply {
                runCatching { this.currency = Currency.getInstance(currency) }
            }

        val text =
            buildString {
                append(json.optString("restaurant", "PayMyDine"))
                append("\n")
                append("==============================\n")
                val orderNumber =
                    json.optString("order_number", "")
                        .ifBlank { json.optString("order_id", "") }
                if (orderNumber.isNotBlank()) {
                    append("Order #")
                    append(orderNumber)
                    append("\n")
                }

                val serviceMode = json.optString("service_mode", "")
                if (serviceMode.isNotBlank()) {
                    append(
                        if (serviceMode == "pickup") {
                            "TAKE AWAY"
                        } else {
                            "DINE IN"
                        },
                    )
                    append("\n")
                }

                append("------------------------------\n")
                val items = json.optJSONArray("items")
                if (items != null) {
                    for (index in 0 until items.length()) {
                        val item = items.optJSONObject(index) ?: continue
                        val quantity = item.optInt("quantity", 1).coerceAtLeast(1)
                        val name = item.optString("name", "Item")
                        val total = item.optDouble("total", 0.0)
                        append(quantity)
                        append("x ")
                        append(name)
                        append("\n")
                        append("   ")
                        append(formatter.format(total))
                        append("\n")
                    }
                }
                append("------------------------------\n")
                append("TOTAL  ")
                append(formatter.format(json.optDouble("total", 0.0)))
                append("\n")
                append("==============================\n")
                append("Thank you\n")
                append("Powered by PayMyDine\n\n\n")
            }

        return printRaw(text)
    }

    private suspend fun printRaw(text: String): Result<Unit> =
        withContext(Dispatchers.IO) {
            runCatching {
                val current = config()
                check(current.enabled) {
                    "Printer is disabled in PayMyDine Device settings."
                }
                check(current.host.isNotBlank()) {
                    "Printer IP / hostname is missing."
                }

                Socket().use { socket ->
                    socket.connect(
                        InetSocketAddress(current.host, current.port),
                        CONNECT_TIMEOUT_MS,
                    )
                    socket.soTimeout = WRITE_TIMEOUT_MS
                    socket.getOutputStream().use { output ->
                        // ESC @ = initialize.
                        output.write(byteArrayOf(0x1B, 0x40))
                        output.write(text.toByteArray(StandardCharsets.UTF_8))
                        // GS V 0 = full cut on common ESC/POS receipt printers.
                        output.write(byteArrayOf(0x1D, 0x56, 0x00))
                        output.flush()
                    }
                }
            }
        }

    companion object {
        private const val PREFS = "pmd_printer_v1"
        private const val KEY_ENABLED = "enabled"
        private const val KEY_HOST = "host"
        private const val KEY_PORT = "port"
        private const val DEFAULT_PORT = 9100
        private const val CONNECT_TIMEOUT_MS = 3_000
        private const val WRITE_TIMEOUT_MS = 4_000
    }
}
