package com.paymydine.mobile.device

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class DeviceControlService : Service() {
    private val scope =
        CoroutineScope(
            SupervisorJob() + Dispatchers.IO,
        )
    private var loop: Job? = null

    override fun onCreate() {
        super.onCreate()
        startForeground(
            NOTIFICATION_ID,
            notification(),
        )

        loop =
            scope.launch {
                while (isActive) {
                    val app =
                        application as PayMyDineApplication
                    val waitSeconds =
                        runCatching {
                            app.deviceShell.heartbeatOnce()
                        }.getOrDefault(15L)

                    delay(
                        waitSeconds
                            .coerceIn(5L, 60L) *
                            1_000L,
                    )
                }
            }
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int = START_STICKY

    override fun onDestroy() {
        loop?.cancel()
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun notification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager =
                getSystemService(
                    NotificationManager::class.java,
                )
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "PayMyDine Device Control",
                    NotificationManager.IMPORTANCE_LOW,
                ).apply {
                    description =
                        "Keeps restaurant device control and wake/sleep commands available."
                    setShowBadge(false)
                },
            )
        }

        return NotificationCompat.Builder(
            this,
            CHANNEL_ID,
        )
            .setSmallIcon(R.drawable.pmd_notification_icon)
            .setContentTitle("PayMyDine device connected")
            .setContentText(
                "Restaurant device control is active.",
            )
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    companion object {
        private const val CHANNEL_ID =
            "pmd-device-control-v1"
        private const val NOTIFICATION_ID = 42031

        fun start(context: Context) {
            val intent =
                Intent(
                    context,
                    DeviceControlService::class.java,
                )
            ContextCompat.startForegroundService(
                context,
                intent,
            )
        }
    }
}
