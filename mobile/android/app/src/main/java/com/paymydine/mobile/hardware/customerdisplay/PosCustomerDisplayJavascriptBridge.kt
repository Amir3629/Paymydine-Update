package com.paymydine.mobile.hardware.customerdisplay

import android.webkit.JavascriptInterface

/**
 * PMD_ZCS_CUSTOMER_DISPLAY_JS_BRIDGE_V1
 *
 * Exposed only inside the trusted PayMyDine POS WebView. It contains no payment
 * secrets and no card APIs; it can only paint the local customer display.
 */
class PosCustomerDisplayJavascriptBridge(
    private val display: CustomerDisplayManager,
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
