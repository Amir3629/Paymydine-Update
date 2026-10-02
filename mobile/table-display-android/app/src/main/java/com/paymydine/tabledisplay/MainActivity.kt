package com.paymydine.tabledisplay

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : ComponentActivity() {
    private lateinit var deviceShell: DeviceShellController

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        enterDisplayMode()

        val store = SecureStore(this)
        val api = ApiClient()
        val paymentBridge = PaymentBridgeRegistry.resolve(this)

        deviceShell =
            DeviceShellController(
                activity = this,
                store = store,
                client = DevicePlatformClient(),
            )

        setContent {
            TableDisplayApp(
                store = store,
                api = api,
                paymentBridge = paymentBridge,
                deviceShell = deviceShell,
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
}
