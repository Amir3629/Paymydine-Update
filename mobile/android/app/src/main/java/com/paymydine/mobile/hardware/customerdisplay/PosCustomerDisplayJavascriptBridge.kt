package com.paymydine.mobile.hardware.customerdisplay

import android.content.Context
import android.content.Intent
import android.nfc.NfcAdapter
import android.provider.Settings
import android.webkit.JavascriptInterface
import org.json.JSONObject

/**
 * PMD_ZCS_CUSTOMER_DISPLAY_JS_BRIDGE_V1
 * PMD_ZCS_CONTACTLESS_DIAGNOSTICS_V124
 *
 * Trusted POS-WebView hardware bridge. Customer-display methods paint only the
 * local second screen. Contactless methods expose capability/status only: they
 * never return PAN, track data, PIN data or authorize a payment.
 */
class PosCustomerDisplayJavascriptBridge(
    context: Context,
    private val display: CustomerDisplayManager,
) {
    private val appContext = context.applicationContext

    @JavascriptInterface
    fun pushCustomerDisplay(payloadJson: String) {
        display.pushJson(payloadJson)
    }

    @JavascriptInterface
    fun showCustomerDisplayIdle() {
        display.showIdle()
    }

    @JavascriptInterface
    fun customerDisplayCapabilities(): String =
        display.capabilitiesJson()

    /**
     * Kept for Web compatibility. V124 customer display is always enabled.
     */
    @JavascriptInterface
    fun setCustomerDisplayEnabled(enabled: Boolean) {
        display.setEnabled(true)
    }

    /**
     * Kept for Web compatibility. V124 food images are always enabled.
     */
    @JavascriptInterface
    fun setCustomerDisplayImages(enabled: Boolean) {
        display.setShowImages(true)
    }

    @JavascriptInterface
    fun setCustomerDisplayIdleMessage(message: String) {
        display.setIdleMessage(message)
    }

    @JavascriptInterface
    fun deviceHardwareCapabilities(): String {
        val androidNfc =
            runCatching {
                NfcAdapter.getDefaultAdapter(appContext)
            }.getOrNull()

        val zcsSdkPresent =
            runCatching {
                Class.forName("com.zcs.sdk.DriverManager")
                true
            }.getOrDefault(false)

        val zcsContactlessReader =
            runCatching {
                val driverClass =
                    Class.forName("com.zcs.sdk.DriverManager")
                val manager =
                    driverClass
                        .getMethod("getInstance")
                        .invoke(null)
                val reader =
                    driverClass
                        .getMethod("getCardReadManager")
                        .invoke(manager)
                reader != null
            }.getOrDefault(false)

        val androidPresent = androidNfc != null
        val androidEnabled =
            runCatching {
                androidNfc?.isEnabled == true
            }.getOrDefault(false)

        return JSONObject()
            .put(
                "contactless_reader",
                zcsContactlessReader || androidEnabled,
            )
            .put("zcs_sdk", zcsSdkPresent)
            .put("zcs_contactless_reader", zcsContactlessReader)
            .put("android_nfc_present", androidPresent)
            .put("android_nfc_enabled", androidEnabled)
            // Hardware readiness is deliberately separate from payment
            // authorization. Real card charging still belongs to the configured
            // acquiring/payment-provider integration.
            .put("payment_provider_required", true)
            .put("raw_card_data_exposed", false)
            .toString()
    }

    @JavascriptInterface
    fun openNfcSettings(): Boolean =
        runCatching {
            val action =
                if (NfcAdapter.getDefaultAdapter(appContext) != null) {
                    Settings.ACTION_NFC_SETTINGS
                } else {
                    Settings.ACTION_WIRELESS_SETTINGS
                }

            appContext.startActivity(
                Intent(action).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                },
            )
            true
        }.getOrDefault(false)
}
