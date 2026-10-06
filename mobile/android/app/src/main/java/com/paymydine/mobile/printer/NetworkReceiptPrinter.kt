package com.paymydine.mobile.printer

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedOutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.nio.charset.Charset

object NetworkReceiptPrinter {
    private val escPosCharset: Charset =
        runCatching { Charset.forName("CP437") }.getOrDefault(Charsets.UTF_8)

    suspend fun test(context: Context): Result<Unit> =
        printText(
            context,
            buildString {
                appendLine("PayMyDine")
                appendLine("Printer test")
                appendLine("------------------------------")
                appendLine("Connection is ready.")
                appendLine()
            },
        )

    suspend fun printKioskReceipt(
        context: Context,
        receiptJson: String,
    ): Result<Unit> {
        val data = runCatching { JSONObject(receiptJson) }.getOrElse {
            return Result.failure(IllegalArgumentException("Invalid kiosk receipt data."))
        }

        val restaurant = data.optString("restaurant", "PayMyDine").trim()
        val order = data.optString("order", "").trim()
        val mode = data.optString("mode", "").trim()
        val total = data.optString("total", "").trim()
        val lines = data.optJSONArray("lines")

        val text =
            buildString {
                appendLine(restaurant.ifBlank { "PayMyDine" })
                if (order.isNotBlank()) appendLine("Order #$order")
                if (mode.isNotBlank()) appendLine(mode)
                appendLine("------------------------------")
                if (lines != null) {
                    for (index in 0 until lines.length()) {
                        val line = lines.optJSONObject(index) ?: continue
                        val qty = line.optInt("quantity", 1).coerceAtLeast(1)
                        val name = line.optString("name", "Item").trim()
                        val price = line.optString("price", "").trim()
                        append(qty).append(" x ").append(name)
                        if (price.isNotBlank()) append("  ").append(price)
                        appendLine()
                    }
                }
                appendLine("------------------------------")
                if (total.isNotBlank()) appendLine("TOTAL  $total")
                appendLine()
                appendLine("Thank you")
                appendLine("Powered by PayMyDine")
                appendLine()
            }

        return printText(context, text)
    }

    private suspend fun printText(
        context: Context,
        text: String,
    ): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val config = PrinterConfigStore(context).load()
            require(config.enabled) { "Receipt printer is disabled." }
            require(config.host.isNotBlank()) { "Printer IP / hostname is missing." }

            Socket().use { socket ->
                socket.connect(
                    InetSocketAddress(config.host.trim(), config.port),
                    4_000,
                )
                socket.soTimeout = 4_000

                BufferedOutputStream(socket.getOutputStream()).use { output ->
                    // ESC @ — initialize printer.
                    output.write(byteArrayOf(0x1B, 0x40))
                    // Left alignment.
                    output.write(byteArrayOf(0x1B, 0x61, 0x00))
                    output.write(text.toByteArray(escPosCharset))
                    output.write("\n\n\n".toByteArray(escPosCharset))
                    // Partial cut. Printers without a cutter safely ignore it.
                    output.write(byteArrayOf(0x1D, 0x56, 0x01))
                    output.flush()
                }
            }
        }
    }
}
