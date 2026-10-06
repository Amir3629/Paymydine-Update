package com.paymydine.mobile.hardware

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.InetSocketAddress
import java.net.Socket

// PMD_DEVICE_PRINTER_SETUP_V18
data class PmdPrinterConfig(
    val host: String,
    val port: Int,
    val enabled: Boolean,
)

object PmdPrinterManager {
    private const val PREFS = "pmd-device-hardware-v18"
    private const val KEY_HOST = "printer_host"
    private const val KEY_PORT = "printer_port"
    private const val KEY_ENABLED = "printer_enabled"

    fun config(context: Context): PmdPrinterConfig {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        return PmdPrinterConfig(
            host = prefs.getString(KEY_HOST, "").orEmpty().trim(),
            port = prefs.getInt(KEY_PORT, 9100).coerceIn(1, 65535),
            enabled = prefs.getBoolean(KEY_ENABLED, false),
        )
    }

    fun save(
        context: Context,
        host: String,
        port: Int,
        enabled: Boolean,
    ) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_HOST, host.trim())
            .putInt(KEY_PORT, port.coerceIn(1, 65535))
            .putBoolean(KEY_ENABLED, enabled && host.trim().isNotBlank())
            .apply()
    }

    suspend fun test(context: Context): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val cfg = config(context)
            require(cfg.host.isNotBlank()) { "Enter the receipt printer IP / host first." }
            send(
                cfg,
                buildList {
                    add(byteArrayOf(0x1B, 0x40))
                    add(byteArrayOf(0x1B, 0x61, 0x01))
                    add("PayMyDine\n".toByteArray(Charsets.UTF_8))
                    add("Printer connected\n".toByteArray(Charsets.UTF_8))
                    add("------------------------------\n\n\n".toByteArray(Charsets.UTF_8))
                    add(byteArrayOf(0x1D, 0x56, 0x00))
                }.fold(ByteArray(0)) { acc, bytes -> acc + bytes },
            )
        }
    }

    suspend fun printReceipt(
        context: Context,
        receiptJson: String,
    ): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val cfg = config(context)
            if (!cfg.enabled || cfg.host.isBlank()) return@runCatching

            val receipt = runCatching { JSONObject(receiptJson) }.getOrElse { JSONObject() }
            val restaurant = receipt.optString("restaurant", "PayMyDine")
            val orderId = receipt.optString("order_id", "")
            val total = receipt.optString("total", "")
            val rows = receipt.optJSONArray("lines")

            val out = StringBuilder()
            out.append(restaurant).append('\n')
            if (orderId.isNotBlank()) out.append("Order #").append(orderId).append('\n')
            out.append("------------------------------\n")
            if (rows != null) {
                for (i in 0 until rows.length()) {
                    val row = rows.optJSONObject(i) ?: continue
                    val qty = row.optInt("quantity", 1).coerceAtLeast(1)
                    val name = row.optString("name", "Item")
                    val price = row.optString("price", "")
                    out.append(qty).append(" x ").append(name)
                    if (price.isNotBlank()) out.append("  ").append(price)
                    out.append('\n')
                }
            }
            out.append("------------------------------\n")
            if (total.isNotBlank()) out.append("TOTAL  ").append(total).append('\n')
            out.append("\nThank you\n\n\n")

            send(
                cfg,
                byteArrayOf(0x1B, 0x40) +
                    out.toString().toByteArray(Charsets.UTF_8) +
                    byteArrayOf(0x1D, 0x56, 0x00),
            )
        }
    }

    private fun send(
        config: PmdPrinterConfig,
        bytes: ByteArray,
    ) {
        Socket().use { socket ->
            socket.connect(
                InetSocketAddress(config.host, config.port),
                3_500,
            )
            socket.soTimeout = 3_500
            socket.getOutputStream().use { stream ->
                stream.write(bytes)
                stream.flush()
            }
        }
    }
}
