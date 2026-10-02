package com.paymydine.mobile

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.paymydine.mobile.tabledisplay.ApiClient
import com.paymydine.mobile.tabledisplay.DevicePlatformClient
import com.paymydine.mobile.tabledisplay.DeviceShellController
import com.paymydine.mobile.tabledisplay.PaymentBridgeRegistry
import com.paymydine.mobile.tabledisplay.SecureStore
import com.paymydine.mobile.tabledisplay.TableDisplayApp

/**
 * Guest-facing Table Display mode inside the single PayMyDine Device App.
 *
 * Table mode has its own device bearer credential and never stores a staff
 * password. Dedicated hardware can still use Device Owner / Lock Task.
 */
class TableDisplayActivity : ComponentActivity() {
    private lateinit var deviceShell: DeviceShellController

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        enterDisplayMode()

        val store = SecureStore(this)
        deviceShell = DeviceShellController(
            activity = this,
            store = store,
            client = DevicePlatformClient(),
        )

        val initialHost =
            intent.getStringExtra(EXTRA_RESTAURANT_HOST)
                ?: (application as PayMyDineApplication)
                    .credentials
                    .tenantHost()

        setContent {
            TableDisplayApp(
                store = store,
                api = ApiClient(),
                paymentBridge = PaymentBridgeRegistry.resolve(this),
                deviceShell = deviceShell,
                initialHost = initialHost,
            )
        }
    }

    override fun onResume() {
        super.onResume()
        enterDisplayMode()
        if (::deviceShell.isInitialized) {
            deviceShell.enterDedicatedMode()
        }
    }

    private fun enterDisplayMode() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    companion object {
        const val EXTRA_RESTAURANT_HOST =
            "com.paymydine.mobile.extra.RESTAURANT_HOST"

        fun intent(context: Context, restaurantHost: String?): Intent =
            Intent(context, TableDisplayActivity::class.java).apply {
                restaurantHost
                    ?.trim()
                    ?.takeIf { it.isNotBlank() }
                    ?.let { putExtra(EXTRA_RESTAURANT_HOST, it) }
            }
    }
}
