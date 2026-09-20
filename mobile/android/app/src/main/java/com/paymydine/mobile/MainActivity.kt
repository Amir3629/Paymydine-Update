package com.paymydine.mobile

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.paymydine.mobile.ui.PayMyDineApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as PayMyDineApplication
        app.handleIntent(intent)
        setContent { PayMyDineApp(app) }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        (application as PayMyDineApplication).handleIntent(intent)
    }
}
