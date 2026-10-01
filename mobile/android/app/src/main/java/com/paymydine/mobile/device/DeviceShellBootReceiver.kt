package com.paymydine.mobile.device

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.paymydine.mobile.MainActivity
import com.paymydine.mobile.PayMyDineApplication

class DeviceShellBootReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent?,
    ) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) {
            return
        }

        val app =
            context.applicationContext
                as? PayMyDineApplication
                ?: return

        if (app.credentials.deviceToken().isNullOrBlank()) {
            return
        }

        DeviceControlService.start(context)

        runCatching {
            context.startActivity(
                Intent(
                    context,
                    MainActivity::class.java,
                ).addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP,
                ),
            )
        }
    }
}
