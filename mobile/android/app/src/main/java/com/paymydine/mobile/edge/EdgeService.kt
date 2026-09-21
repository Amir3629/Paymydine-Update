package com.paymydine.mobile.edge

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.network.EdgeDiscovery
import com.paymydine.mobile.network.MobileApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class EdgeRuntimeSnapshot(
    val enabled: Boolean = false,
    val running: Boolean = false,
    val port: Int = 0,
    val fingerprintSha256: String? = null,
    val cloudRegistered: Boolean = false,
    val lastError: String? = null,
)

object EdgeRuntimeState {
    private val _state = MutableStateFlow(EdgeRuntimeSnapshot())
    val state = _state.asStateFlow()

    internal fun publish(value: EdgeRuntimeSnapshot) {
        _state.value = value
    }
}

/**
 * User-controlled restaurant LAN authority.
 *
 * A foreground service is required because Android must not silently kill the
 * only local restaurant coordinator while Waiter/POS/KDS devices are using it.
 */
class EdgeService : Service() {
    private val serviceScope = CoroutineScope(
        SupervisorJob() + Dispatchers.IO,
    )

    private lateinit var app: PayMyDineApplication
    private lateinit var nsd: NsdManager
    private var server: EdgeHttpServer? = null
    private var authority: EdgeAuthority? = null
    private var identity: EdgeTlsIdentity.Identity? = null
    private var registrationListener: NsdManager.RegistrationListener? = null
    private var multicastLock: WifiManager.MulticastLock? = null
    private var loopJob: Job? = null

    override fun onCreate() {
        super.onCreate()
        app = application as PayMyDineApplication
        nsd = getSystemService(NsdManager::class.java)
        ensureNotificationChannel()

        startForeground(
            NOTIFICATION_ID,
            notification(
                title = "PayMyDine Restaurant Edge",
                text = "Starting secure local restaurant network…",
            ),
        )
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {
        if (!isEnabled(this)) {
            stopSelf()
            return START_NOT_STICKY
        }

        if (server == null) {
            serviceScope.launch {
                startRuntime()
            }
        }

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        loopJob?.cancel()
        unregisterNsd()
        runCatching { server?.close() }
        server = null
        authority = null
        identity = null

        runCatching {
            if (multicastLock?.isHeld == true) {
                multicastLock?.release()
            }
        }
        multicastLock = null

        EdgeRuntimeState.publish(
            EdgeRuntimeSnapshot(
                enabled = isEnabled(this),
                running = false,
            ),
        )

        super.onDestroy()
    }

    private suspend fun startRuntime() {
        val locationId = app.bootstrapRepository.locationId()
        val host = app.credentials.tenantHost()
        val token = app.credentials.deviceToken()

        if (
            locationId == null
            || host.isNullOrBlank()
            || token.isNullOrBlank()
        ) {
            fail(
                "Pair and bootstrap this Android device before enabling Restaurant Edge.",
            )
            stopSelf()
            return
        }

        try {
            val tlsIdentity = EdgeTlsIdentity().loadOrCreate()
            val edgeAuthority = EdgeAuthority(app)

            // Prime this primary POS as a Cloud-validated Edge peer while WAN
            // is available. If Android NSD does not discover its own service
            // after a later WAN cut, direct local Edge routing still has a
            // current offline trust snapshot for this exact device token.
            if (app.connectivity.online.value) {
                runCatching {
                    edgeAuthority.authenticate(token)
                }
            }

            val edgeServer = EdgeHttpServer(
                app = app,
                authority = edgeAuthority,
                identity = tlsIdentity,
            )
            val boundPort = edgeServer.start()

            identity = tlsIdentity
            authority = edgeAuthority
            server = edgeServer

            acquireMulticastLock()
            registerNsd(
                locationId = locationId,
                port = boundPort,
                fingerprint = tlsIdentity.fingerprintSha256,
            )

            EdgeRuntimeState.publish(
                EdgeRuntimeSnapshot(
                    enabled = true,
                    running = true,
                    port = boundPort,
                    fingerprintSha256 =
                        tlsIdentity.fingerprintSha256,
                    cloudRegistered = false,
                ),
            )

            getSystemService(NotificationManager::class.java)
                .notify(
                    NOTIFICATION_ID,
                    notification(
                        title = "PayMyDine Restaurant Edge",
                        text =
                            "LAN authority active on port $boundPort · secure TLS",
                    ),
                )

            loopJob?.cancel()
            loopJob = serviceScope.launch {
                runAuthorityLoop(
                    host = host,
                    token = token,
                    port = boundPort,
                    fingerprint =
                        tlsIdentity.fingerprintSha256,
                )
            }
        } catch (error: Throwable) {
            fail(
                error.message
                    ?: "Restaurant Edge could not start.",
            )
            stopSelf()
        }
    }

    private suspend fun runAuthorityLoop(
        host: String,
        token: String,
        port: Int,
        fingerprint: String,
    ) {
        val cloud = MobileApiClient()
        var registered = false
        var heartbeatAt = 0L

        while (currentCoroutineContext().isActive && isEnabled(this@EdgeService)) {
            if (app.connectivity.online.value) {
                if (!registered) {
                    registered = runCatching {
                        val response = cloud.registerEdge(
                            tenantHost = host,
                            deviceToken = token,
                            fingerprintSha256 = fingerprint,
                            port = port,
                        )
                        response.optBoolean("ok")
                    }.getOrDefault(false)

                    if (registered) {
                        app.credentials.setEdgeFingerprint(
                            fingerprint,
                        )
                        publishRegistered(true)
                    }
                }

                val now = System.currentTimeMillis()
                if (
                    registered
                    && now - heartbeatAt >= HEARTBEAT_MS
                ) {
                    runCatching {
                        cloud.edgeHeartbeat(host, token)
                    }.onSuccess {
                        heartbeatAt = now
                    }
                }

                runCatching {
                    authority?.drainCloud(50)
                }
            }

            delay(3_000)
        }
    }

    private fun publishRegistered(registered: Boolean) {
        val current = EdgeRuntimeState.state.value
        EdgeRuntimeState.publish(
            current.copy(
                enabled = true,
                running = true,
                cloudRegistered = registered,
                lastError = null,
            ),
        )
    }

    private fun registerNsd(
        locationId: Long,
        port: Int,
        fingerprint: String,
    ) {
        unregisterNsd()

        val info = NsdServiceInfo().apply {
            serviceName = "PayMyDine Edge $locationId"
            serviceType = EdgeDiscovery.SERVICE_TYPE
            setPort(port)
            setAttribute("tls", "1")
            setAttribute(
                "fingerprint",
                fingerprint.lowercase(),
            )
            setAttribute("site", locationId.toString())
            setAttribute("protocol", "pmd-edge-v1")
        }

        val listener = object :
            NsdManager.RegistrationListener {
            override fun onRegistrationFailed(
                serviceInfo: NsdServiceInfo,
                errorCode: Int,
            ) {
                fail(
                    "Restaurant Edge LAN advertisement failed ($errorCode).",
                )
            }

            override fun onUnregistrationFailed(
                serviceInfo: NsdServiceInfo,
                errorCode: Int,
            ) = Unit

            override fun onServiceRegistered(
                serviceInfo: NsdServiceInfo,
            ) = Unit

            override fun onServiceUnregistered(
                serviceInfo: NsdServiceInfo,
            ) = Unit
        }

        registrationListener = listener
        nsd.registerService(
            info,
            NsdManager.PROTOCOL_DNS_SD,
            listener,
        )
    }

    private fun unregisterNsd() {
        val listener = registrationListener ?: return
        registrationListener = null

        runCatching {
            nsd.unregisterService(listener)
        }
    }

    private fun acquireMulticastLock() {
        if (multicastLock?.isHeld == true) return

        val wifi = applicationContext
            .getSystemService(WifiManager::class.java)
        multicastLock = wifi
            ?.createMulticastLock("paymydine-edge-mdns-v1")
            ?.apply {
                setReferenceCounted(false)
                acquire()
            }
    }

    private fun fail(message: String) {
        val current = EdgeRuntimeState.state.value
        EdgeRuntimeState.publish(
            current.copy(
                enabled = isEnabled(this),
                running = server != null,
                lastError = message,
            ),
        )

        getSystemService(NotificationManager::class.java)
            .notify(
                NOTIFICATION_ID,
                notification(
                    title = "PayMyDine Restaurant Edge",
                    text = message.take(120),
                ),
            )
    }

    private fun ensureNotificationChannel() {
        val manager =
            getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "PayMyDine Restaurant Edge",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description =
                    "Keeps PayMyDine POS, Waiter and KDS devices connected on the restaurant LAN."
            },
        )
    }

    private fun notification(
        title: String,
        text: String,
    ): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(com.paymydine.mobile.R.drawable.pmd_notification_icon)
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()

    companion object {
        private const val PREFS = "pmd-edge-runtime-v1"
        private const val KEY_ENABLED = "enabled"
        private const val CHANNEL_ID =
            "paymydine_restaurant_edge"
        private const val NOTIFICATION_ID = 4107
        private const val HEARTBEAT_MS = 30_000L

        fun isEnabled(context: Context): Boolean =
            context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE,
            ).getBoolean(KEY_ENABLED, false)

        fun setEnabled(
            context: Context,
            enabled: Boolean,
        ) {
            context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE,
            ).edit()
                .putBoolean(KEY_ENABLED, enabled)
                .apply()

            EdgeRuntimeState.publish(
                EdgeRuntimeState.state.value.copy(
                    enabled = enabled,
                ),
            )

            val intent = Intent(
                context,
                EdgeService::class.java,
            )

            if (enabled) {
                ContextCompat.startForegroundService(
                    context,
                    intent,
                )
            } else {
                context.stopService(intent)
            }
        }

        fun startIfEnabled(context: Context) {
            if (isEnabled(context)) {
                ContextCompat.startForegroundService(
                    context,
                    Intent(
                        context,
                        EdgeService::class.java,
                    ),
                )
            }
        }
    }
}
