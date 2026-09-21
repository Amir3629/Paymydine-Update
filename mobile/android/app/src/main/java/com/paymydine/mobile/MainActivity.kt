package com.paymydine.mobile

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.paymydine.mobile.ui.PayMyDineApp

class MainActivity : ComponentActivity() {
    private val operationalPermissions =
        registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions(),
        ) {
            // The UI/transport router remains fail-closed if LAN permission is
            // denied. Cloud and local SQLite stay usable where applicable.
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as PayMyDineApplication
        app.handleIntent(intent)

        // PMD_ANDROID_DIRECT_LOGIN_LAUNCHER_V2
        // A paired device always opens the PayMyDine staff login. The server
        // selects the canonical destination from the authenticated staff role;
        // there is no workspace chooser in the Android launch flow.
        requestOperationalPermissions()
        setContent { PayMyDineApp(app) }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        (application as PayMyDineApplication).handleIntent(intent)
    }

    private fun requestOperationalPermissions() {
        val wanted = buildList {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                add(Manifest.permission.NEARBY_WIFI_DEVICES)
                add(Manifest.permission.POST_NOTIFICATIONS)
            }

            // ACCESS_LOCAL_NETWORK is introduced in API 37. Compile SDK remains
            // 36 for the Android 16 release, so use the platform permission
            // string until the project moves to compileSdk 37.
            if (Build.VERSION.SDK_INT >= 37) {
                add("android.permission.ACCESS_LOCAL_NETWORK")
            }
        }.filter {
            ContextCompat.checkSelfPermission(
                this,
                it,
            ) != PackageManager.PERMISSION_GRANTED
        }

        if (wanted.isNotEmpty()) {
            operationalPermissions.launch(wanted.toTypedArray())
        }
    }
}
