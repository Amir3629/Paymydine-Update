package com.paymydine.tabledisplay

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        enterDisplayMode()

        val store = SecureStore(this)
        val api = ApiClient()
        val paymentBridge = PaymentBridgeRegistry.resolve(this)

        setContent {
            TableDisplayApp(
                store = store,
                api = api,
                paymentBridge = paymentBridge,
            )
        }
    }

    override fun onResume() {
        super.onResume()
        enterDisplayMode()
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
