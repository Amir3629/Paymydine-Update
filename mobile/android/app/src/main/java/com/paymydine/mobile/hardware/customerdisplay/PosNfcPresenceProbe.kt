package com.paymydine.mobile.hardware.customerdisplay

import android.nfc.NfcAdapter
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.activity.ComponentActivity
import androidx.lifecycle.Lifecycle
import org.json.JSONObject

/**
 * PMD_Z100_FOREGROUND_NFC_PRESENCE_V149
 *
 * An optional 12-second, foreground-only NFC field diagnostic.
 * It never requests or reads UID, PAN, EMV APDU, card contents, NDEF or
 * payment credentials. It does not authorize or record a payment.
 * Some ZCS POS revisions expose their reader ONLY via licensed vendor SDK;
 * absence of Android NfcAdapter is reported, never forged as a scan.
 */
class PosNfcPresenceProbe(private val activity: ComponentActivity) {
    private val main = Handler(Looper.getMainLooper())
    @Volatile private var state = "idle"
    @Volatile private var reason = ""
    @Volatile private var endsAtElapsed = 0L
    private var reader: NfcAdapter? = null
    private var listening = false
    private var generation = 0

    fun start(): String {
        state = "starting"
        reason = ""
        main.post {
            closeReader()
            generation += 1
            val attempt = generation
            if (activity.isFinishing || activity.isDestroyed ||
                !activity.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) {
                state = "not_foreground"
                reason = "Open Cashier and keep this settings panel visible."
                return@post
            }
            val adapter = runCatching { NfcAdapter.getDefaultAdapter(activity) }.getOrNull()
            if (adapter == null) {
                state = "android_nfc_unavailable"
                reason = "No Android NFC adapter. A ZCS vendor-only reader needs its approved integration."
                return@post
            }
            if (!adapter.isEnabled) {
                state = "nfc_off"
                reason = "Enable NFC in Android system settings."
                return@post
            }
            try {
                reader = adapter
                adapter.enableReaderMode(
                    activity,
                    NfcAdapter.ReaderCallback { _ ->
                        main.post {
                            if (attempt == generation && listening && state == "waiting") {
                                state = "tag_detected"
                                reason = "NFC field detected a tag. No card information or payment was read."
                                closeReader()
                            }
                        }
                    },
                    NfcAdapter.FLAG_READER_NFC_A or
                        NfcAdapter.FLAG_READER_NFC_B or
                        NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
                    null,
                )
                listening = true
                state = "waiting"
                reason = "Present a harmless NFC test tag near the Android reader."
                endsAtElapsed = SystemClock.elapsedRealtime() + 12_000L
                main.postDelayed({
                    if (attempt == generation && listening && state == "waiting") {
                        state = "timeout"
                        reason = "No Android NFC tag detected within 12 seconds."
                        closeReader()
                    }
                }, 12_000L)
            } catch (_: Exception) {
                state = "reader_error"
                reason = "Android NFC reader mode could not start on this device."
                closeReader()
            }
        }
        return snapshot()
    }

    fun snapshot(): String =
        JSONObject()
            .put("phase", state)
            .put("reason", reason)
            .put("diagnostic_only", true)
            .put("bank_acquiring_active", false)
            .toString()

    fun stop() {
        if (Looper.myLooper() == Looper.getMainLooper()) {
            finish()
        } else {
            main.post { finish() }
        }
    }

    private fun finish() {
        generation += 1
        if (state == "waiting" || state == "starting") {
            state = "cancelled"
            reason = "NFC check stopped when Cashier left the foreground."
        }
        closeReader()
    }

    private fun closeReader() {
        if (listening) {
            runCatching { reader?.disableReaderMode(activity) }
        }
        listening = false
        reader = null
        endsAtElapsed = 0L
    }
}
