package com.paymydine.mobile.hardware

import android.content.Context
import org.json.JSONObject
import java.net.InetSocketAddress
import java.net.Socket
import java.nio.charset.Charset
import java.util.concurrent.Executors

/**
 * PMD_ANDROID_PRINTER_SETUP_V18
 *
 * Shared receipt-printer authority for the unified Device App. V18 supports
 * standard LAN ESC/POS printers (typically TCP 9100).
 */
data class ReceiptPrinterConfig(
    val enabled: Boolean,
    val host: String,
    val port: Int,
    val autoPrintKiosk: Boolean,
)

object ReceiptPrinterManager {
    private const val PREFS = "pmd-receipt-printer-v18"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_HOST = "host"
    private const val KEY_PORT = "port"
    private const val KEY_AUTO_KIOSK = "auto_kiosk"
    private val executor = Executors.newSingleThreadExecutor()

    fun load(context: Context): ReceiptPrinterConfig {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return ReceiptPrinterConfig(
            enabled = prefs.getBoolean(KEY_ENABLED, false),
            host = prefs.getString(KEY_HOST, "").orEmpty().trim(),
            port = prefs.getInt(KEY_PORT, 9100).coerceIn(1, 65535),
            autoPrintKiosk = prefs.getBoolean(KEY_AUTO_KIOSK, true),
        )
    }

    fun save(
        context: Context,
        config: ReceiptPrinterConfig,
    ) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_ENABLED, config.enabled)
            .putString(KEY_HOST, config.host.trim())
            .putInt(KEY_PORT, config.port.coerceIn(1, 65535))
            .putBoolean(KEY_AUTO_KIOSK, config.autoPrintKiosk)
            .apply()
    }

    fun printKioskReceiptAsync(
        context: Context,
        restaurantName: String,
        orderId: String,
        receiptJson: String = "",
    ) {
        val config = load(context)
        if (!config.enabled || !config.autoPrintKiosk || config.host.isBlank()) return

        executor.execute {
            runCatching {
                val payload = runCatching { JSONObject(receiptJson) }.getOrNull()
                val receiptLines = mutableListOf<String>()
                receiptLines += restaurantName.ifBlank { "PayMyDine" }
                receiptLines += "------------------------------"
                receiptLines += "Order #${payload?.optString("order_number")?.ifBlank { orderId } ?: orderId}"
                payload?.optJSONArray("lines")?.let { lines ->
                    for (index in 0 until lines.length()) {
                        val line = lines.optJSONObject(index) ?: continue
                        val quantity = line.optInt("quantity", 1).coerceAtLeast(1)
                        val name = line.optString("name", "Item")
                        val total = line.optDouble("total", 0.0)
                        receiptLines += "${quantity}x ${name}  ${"%.2f".format(total)}"
                    }
                }
                val total = payload?.optDouble("total", Double.NaN)
                if (total != null && total.isFinite()) {
                    val currency = payload.optString("currency", "EUR")
                    receiptLines += "------------------------------"
                    receiptLines += "TOTAL  ${"%.2f".format(total)} ${currency}"
                }
                receiptLines += "Payment received"
                receiptLines += "Thank you"

                printText(
                    config = config,
                    lines = receiptLines,
                )
            }
        }
    }

    fun testPrint(
        context: Context,
        config: ReceiptPrinterConfig = load(context),
    ): Result<Unit> =
        runCatching {
            require(config.enabled) { "Enable the receipt printer first." }
            require(config.host.isNotBlank()) { "Printer IP / host is required." }
            printText(
                config = config,
                lines = listOf(
                    "PayMyDine",
                    "Printer test",
                    "Connection OK",
                ),
            )
        }

    fun printText(
        config: ReceiptPrinterConfig,
        lines: List<String>,
    ) {
        require(config.host.isNotBlank()) { "Printer IP / host is required." }

        Socket().use { socket ->
            socket.connect(
                InetSocketAddress(config.host.trim(), config.port),
                2_500,
            )
            socket.soTimeout = 3_000

            val out = socket.getOutputStream()
            out.write(byteArrayOf(0x1B, 0x40))
            out.write(byteArrayOf(0x1B, 0x61, 0x01))
            val charset = runCatching { Charset.forName("UTF-8") }
                .getOrDefault(Charsets.UTF_8)
            lines.forEach { line ->
                out.write(line.toByteArray(charset))
                out.write('\n'.code)
            }
            out.write('\n'.code)
            out.write('\n'.code)
            out.write(byteArrayOf(0x1D, 0x56, 0x42, 0x00))
            out.flush()
        }
    }
}
