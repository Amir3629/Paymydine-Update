package com.paymydine.mobile.printer

import android.content.Context
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.nio.charset.StandardCharsets

/**
 * PMD_SHARED_PRINTER_SETUP_V18
 *
 * One printer configuration is shared by kiosk, cashier and waiter modes.
 * The first implementation targets ESC/POS over LAN (TCP/9100 by default).
 */
data class PmdPrinterConfig(
    val name: String,
    val host: String,
    val port: Int,
    val autoPrintReceipts: Boolean,
) {
    val configured: Boolean
        get() = host.isNotBlank() && port in 1..65535
}

class PmdPrinterManager(context: Context) {
    private val prefs =
        context.applicationContext.getSharedPreferences(
            "pmd_printer_setup_v18",
            Context.MODE_PRIVATE,
        )

    fun config(): PmdPrinterConfig =
        PmdPrinterConfig(
            name = prefs.getString("name", "Receipt printer").orEmpty(),
            host = prefs.getString("host", "").orEmpty().trim(),
            port = prefs.getInt("port", 9100).coerceIn(1, 65535),
            autoPrintReceipts = prefs.getBoolean("auto_print_receipts", true),
        )

    fun save(config: PmdPrinterConfig) {
        prefs.edit()
            .putString("name", config.name.trim().take(80))
            .putString("host", config.host.trim().take(255))
            .putInt("port", config.port.coerceIn(1, 65535))
            .putBoolean("auto_print_receipts", config.autoPrintReceipts)
            .apply()
    }

    fun testPrint(): Result<Unit> =
        printText(
            buildString {
                appendLine("PayMyDine")
                appendLine("Printer connected")
                appendLine("------------------------------")
                appendLine("Test print successful")
            },
        )

    fun printReceiptJson(raw: String): Result<Unit> {
        val current = config()
        if (!current.autoPrintReceipts) return Result.success(Unit)

        val json =
            runCatching { JSONObject(raw) }
                .getOrElse {
                    return Result.failure(
                        IllegalArgumentException("Receipt payload is invalid."),
                    )
                }

        val text =
            buildString {
                appendLine(json.optString("restaurant", "PayMyDine"))
                appendLine("------------------------------")
                val orderNumber = json.optString("orderNumber", "")
                if (orderNumber.isNotBlank()) {
                    appendLine("Order #$orderNumber")
                    appendLine("------------------------------")
                }

                val lines = json.optJSONArray("lines")
                if (lines != null) {
                    for (index in 0 until lines.length()) {
                        val line = lines.optJSONObject(index) ?: continue
                        val quantity = line.optInt("quantity", 1).coerceAtLeast(1)
                        val name = line.optString("name", "Item")
                        val total = line.optString("total", "")
                        appendLine("$quantity x $name")
                        if (total.isNotBlank()) appendLine("  $total")
                    }
                }

                appendLine("------------------------------")
                val total = json.optString("total", "")
                if (total.isNotBlank()) appendLine("TOTAL  $total")
                appendLine()
                appendLine("Thank you")
            }

        return printText(text)
    }

    fun printText(text: String): Result<Unit> {
        val current = config()
        if (!current.configured) {
            return Result.failure(
                IllegalStateException("No receipt printer is configured."),
            )
        }

        return runCatching {
            Socket().use { socket ->
                socket.connect(
                    InetSocketAddress(current.host, current.port),
                    3_500,
                )
                socket.soTimeout = 4_000

                val output = ByteArrayOutputStream()
                output.write(byteArrayOf(0x1B, 0x40))
                output.write(text.toByteArray(StandardCharsets.UTF_8))
                output.write(byteArrayOf(0x0A, 0x0A, 0x0A))
                output.write(byteArrayOf(0x1D, 0x56, 0x00))

                socket.getOutputStream().use { stream ->
                    stream.write(output.toByteArray())
                    stream.flush()
                }
            }
        }
    }
}
