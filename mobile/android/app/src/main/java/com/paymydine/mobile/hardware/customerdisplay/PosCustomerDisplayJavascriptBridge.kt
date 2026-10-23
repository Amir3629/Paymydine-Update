package com.paymydine.mobile.hardware.customerdisplay

import android.content.Context
import android.nfc.NfcAdapter
import android.webkit.JavascriptInterface
import org.json.JSONObject

/**
 * PMD_ZCS_CUSTOMER_DISPLAY_JS_BRIDGE_V1
 *
 * Exposed only inside the trusted PayMyDine POS WebView. It contains no payment
 * secrets and no card APIs; it can only paint the local customer display.
 */
class PosCustomerDisplayJavascriptBridge(
    private val display: CustomerDisplayManager,
    private val context: Context,
    private val nfcPresenceProbe: PosNfcPresenceProbe,
) {
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
     * PMD_Z100_ANDROID_NFC_NONPAYMENT_DIAGNOSTIC_V147
     * Public, read-only hardware introspection in the trusted POS WebView.
     * Never enables reader mode, reads tag/card data, launches EMV, or
     * authorizes charges. A ZCS card-reader Java method is not an acquirer.
     */
    @JavascriptInterface
    fun deviceHardwareCapabilities(): String {
        val adapter = runCatching { NfcAdapter.getDefaultAdapter(context) }
            .getOrNull()
        val zcsSdkHasCardMethod = runCatching {
            Class.forName("com.zcs.sdk.DriverManager")
                .methods.any { it.name == "getCardReadManager" }
        }.getOrDefault(false)
        return JSONObject()
            .put("android_nfc_present", adapter != null)
            .put("android_nfc_enabled", adapter?.isEnabled == true)
            .put("zcs_card_reader_sdk_method_present", zcsSdkHasCardMethod)
            .put("zcs_contactless_reader", false)
            .put("softpos_payment_enabled", false)
            .put("payment_sdk_certified", false)
            .put("diagnostic_only", true)
            .toString()
    }

    /** Safe, read-only presence check: no NFC payload, card number, APDU or charge. */
    @JavascriptInterface
    fun startNfcPresenceTest(): String = nfcPresenceProbe.start()

    @JavascriptInterface
    fun nfcPresenceTestStatus(): String = nfcPresenceProbe.snapshot()

    @JavascriptInterface
    fun setCustomerDisplayEnabled(enabled: Boolean) {
        display.setEnabled(enabled)
    }

    @JavascriptInterface
    fun setCustomerDisplayImages(enabled: Boolean) {
        display.setShowImages(enabled)
    }

    @JavascriptInterface
    fun setCustomerDisplayIdleMessage(message: String) {
        display.setIdleMessage(message)
    }
}
