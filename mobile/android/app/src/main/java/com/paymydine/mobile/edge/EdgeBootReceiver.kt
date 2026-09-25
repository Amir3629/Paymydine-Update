package com.paymydine.mobile.edge

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class EdgeBootReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        if (
            intent.action == Intent.ACTION_BOOT_COMPLETED
            || intent.action ==
                "android.intent.action.LOCKED_BOOT_COMPLETED"
        ) {
            EdgeService.startIfEnabled(context)
        }
    }
}
