package com.paymydine.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.paymydine.mobile.ui.PayMyDineApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as PayMyDineApplication
        setContent { PayMyDineApp(app) }
    }
}
