package com.paymydine.mobile.printer

import android.content.Context

/**
 * PMD_ANDROID_SHARED_PRINTER_SETUP_V18
 *
 * One printer configuration belongs to the PayMyDine Device App, not to a
 * single role. Cashier, waiter and kiosk therefore read the same receipt
 * printer binding on this physical device.
 */
data class PrinterConfig(
    val enabled: Boolean,
    val host: String,
    val port: Int,
    val autoPrintKioskReceipt: Boolean,
)

class PrinterConfigStore(context: Context) {
    private val prefs =
        context.applicationContext.getSharedPreferences(
            "pmd-device-printer-v1",
            Context.MODE_PRIVATE,
        )

    fun load(): PrinterConfig =
        PrinterConfig(
            enabled = prefs.getBoolean("enabled", false),
            host = prefs.getString("host", "").orEmpty().trim(),
            port = prefs.getInt("port", 9100).coerceIn(1, 65535),
            autoPrintKioskReceipt =
                prefs.getBoolean("auto_print_kiosk_receipt", true),
        )

    fun save(config: PrinterConfig) {
        prefs.edit()
            .putBoolean("enabled", config.enabled)
            .putString("host", config.host.trim())
            .putInt("port", config.port.coerceIn(1, 65535))
            .putBoolean(
                "auto_print_kiosk_receipt",
                config.autoPrintKioskReceipt,
            )
            .apply()
    }
}
