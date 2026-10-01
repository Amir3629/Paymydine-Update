package com.paymydine.mobile.device

import android.app.Application
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.paymydine.mobile.BuildConfig
import com.paymydine.mobile.MainActivity
import com.paymydine.mobile.security.DeviceCredentialStore
import org.json.JSONObject
import java.lang.ref.WeakReference
import java.time.Instant

class DeviceShellManager(
    private val application: Application,
    private val credentials: DeviceCredentialStore,
    private val client: DevicePlatformClient = DevicePlatformClient(),
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val devicePolicyManager =
        application.getSystemService(Context.DEVICE_POLICY_SERVICE)
            as DevicePolicyManager
    private val adminComponent =
        ComponentName(application, PmdDeviceAdminReceiver::class.java)

    @Volatile
    private var activityRef: WeakReference<ComponentActivity>? = null

    @Volatile
    private var attachedMode: String = "restaurant_app"

    @Volatile
    private var identifyActive = false

    @Volatile
    private var readyLogged = false

    @Volatile
    private var lastDesired = DeviceDesiredState(
        screenState = credentials.deviceShellScreenState(),
        brightness = credentials.deviceShellBrightness(),
        reason = "local_restore",
        kiosk = credentials.deviceShellManaged(),
    )

    fun attach(
        activity: ComponentActivity,
        mode: String,
    ) {
        activityRef = WeakReference(activity)
        attachedMode = normalizeMode(mode)
        mainHandler.post {
            enterDedicatedMode(activity)
            applyCurrentState(activity)
        }
    }

    fun detach(activity: ComponentActivity) {
        val current = activityRef?.get()
        if (current === activity) {
            activityRef = null
        }
    }

    suspend fun heartbeatOnce(): Long {
        val host = credentials.tenantHost()
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?: return 30L
        val token = credentials.deviceToken()
            ?.trim()
            ?.takeIf { it.isNotBlank() }
            ?: return 30L

        val result = client.heartbeat(
            tenantHost = host,
            token = token,
            payload = heartbeatPayload(),
        )

        if (!readyLogged) {
            runCatching {
                client.log(
                    tenantHost = host,
                    token = token,
                    level = "info",
                    event = "device_shell_ready",
                    message = "PayMyDine Android Device Shell is online.",
                    context = mapOf(
                        "mode" to currentMode(),
                        "app_version" to BuildConfig.VERSION_NAME,
                        "device_owner" to isDeviceOwner(),
                        "network_type" to networkType(),
                    ),
                )
            }
            readyLogged = true
        }

        lastDesired = result.desired
        if (!identifyActive) {
            persistAndApply(result.desired)
        }

        for (command in result.commands) {
            processCommand(host, token, command)
        }

        return result.pollAfterSeconds
    }

    private suspend fun processCommand(
        host: String,
        token: String,
        command: DeviceCommand,
    ) {
        when (command.command) {
            "WAKE" -> {
                val state = DeviceDesiredState(
                    screenState = "awake",
                    brightness =
                        command.payload["brightness"]?.toIntOrNull()
                            ?.coerceIn(0, 100)
                            ?: lastDesired.brightness,
                    reason = "remote_wake",
                    kiosk = true,
                )
                persistAndApply(state)
                client.acknowledge(
                    host,
                    token,
                    command.commandId,
                    "completed",
                    mapOf(
                        "screen_state" to "awake",
                        "brightness" to state.brightness,
                    ),
                )
            }

            "SLEEP" -> {
                val state = DeviceDesiredState(
                    screenState = "closed",
                    brightness =
                        command.payload["brightness"]?.toIntOrNull()
                            ?.coerceIn(0, 100)
                            ?: 1,
                    reason = "remote_sleep",
                    kiosk = true,
                )
                persistAndApply(state)
                client.acknowledge(
                    host,
                    token,
                    command.commandId,
                    "completed",
                    mapOf(
                        "screen_state" to "closed",
                        "brightness" to state.brightness,
                    ),
                )
            }

            "SET_BRIGHTNESS" -> {
                val level =
                    command.payload["brightness"]?.toIntOrNull()
                        ?.coerceIn(0, 100)
                        ?: lastDesired.brightness
                val state = lastDesired.copy(
                    brightness = level,
                    reason = "remote_brightness",
                )
                lastDesired = state
                persistAndApply(state)
                client.acknowledge(
                    host,
                    token,
                    command.commandId,
                    "completed",
                    mapOf("brightness" to level),
                )
            }

            "IDENTIFY" -> {
                identifyActive = true
                mainHandler.post {
                    activityRef?.get()?.let {
                        applyIdentifyOverlay(it)
                    }
                }

                client.acknowledge(
                    host,
                    token,
                    command.commandId,
                    "completed",
                    mapOf("identify_seconds" to 10),
                )

                mainHandler.removeCallbacksAndMessages(IDENTIFY_TOKEN)
                mainHandler.postAtTime(
                    {
                        identifyActive = false
                        activityRef?.get()?.let {
                            applyCurrentState(it)
                        }
                    },
                    IDENTIFY_TOKEN,
                    SystemClock.uptimeMillis() + 10_000L,
                )
            }

            "RELOAD_APP" -> {
                client.acknowledge(
                    host,
                    token,
                    command.commandId,
                    "completed",
                    mapOf("action" to "reload_app"),
                )

                mainHandler.post {
                    val activity = activityRef?.get()
                    if (activity != null) {
                        activity.recreate()
                    } else {
                        launchMainActivity()
                    }
                }
            }

            "REBOOT" -> {
                if (!isDeviceOwner()) {
                    client.acknowledge(
                        host,
                        token,
                        command.commandId,
                        "failed",
                        mapOf(
                            "reason" to
                                "Android Device Owner provisioning is required for managed reboot.",
                        ),
                    )
                    return
                }

                client.acknowledge(
                    host,
                    token,
                    command.commandId,
                    "acknowledged",
                    mapOf("action" to "managed_reboot"),
                )

                try {
                    devicePolicyManager.reboot(adminComponent)
                } catch (error: Throwable) {
                    client.acknowledge(
                        host,
                        token,
                        command.commandId,
                        "failed",
                        mapOf(
                            "reason" to
                                (error.message ?: "Managed reboot failed."),
                        ),
                    )
                }
            }

            "UPDATE_APP" -> {
                client.acknowledge(
                    host,
                    token,
                    command.commandId,
                    "failed",
                    mapOf(
                        "reason" to
                            "Signed managed OTA channel is not configured for this Android build.",
                    ),
                )
            }

            else -> {
                client.acknowledge(
                    host,
                    token,
                    command.commandId,
                    "failed",
                    mapOf("reason" to "Unsupported device command."),
                )
            }
        }
    }

    private fun persistAndApply(desired: DeviceDesiredState) {
        lastDesired = desired
        credentials.setDeviceShellState(
            screenState = normalizedScreenState(desired.screenState),
            brightness = desired.brightness,
            managed = desired.kiosk,
        )

        mainHandler.post {
            activityRef?.get()?.let {
                applyCurrentState(it)
            }
        }
    }

    private fun applyCurrentState(activity: ComponentActivity) {
        if (identifyActive) {
            applyIdentifyOverlay(activity)
            return
        }

        val screen = normalizedScreenState(
            credentials.deviceShellScreenState(),
        )
        val brightness = credentials.deviceShellBrightness()

        applyBrightness(activity, brightness)
        enterDedicatedMode(activity)
        removeShellOverlay(activity)

        if (screen == "closed") {
            val overlay = FrameLayout(activity).apply {
                tag = OVERLAY_TAG
                setBackgroundColor(Color.BLACK)
                isClickable = true
                isFocusable = true
                elevation = 10000f
            }
            addOverlay(activity, overlay)
        }
    }

    private fun applyIdentifyOverlay(activity: ComponentActivity) {
        applyBrightness(activity, 100)
        removeShellOverlay(activity)

        val label = TextView(activity).apply {
            tag = OVERLAY_TAG
            text =
                "PAYMYDINE DEVICE\n\n" +
                    "Mode: " +
                    currentMode().uppercase() +
                    "\nDevice: " +
                    credentials.deviceId().orEmpty()
            gravity = android.view.Gravity.CENTER
            textSize = 24f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.rgb(8, 54, 44))
            isClickable = true
            isFocusable = true
            elevation = 10000f
        }
        addOverlay(activity, label)
    }

    private fun addOverlay(
        activity: ComponentActivity,
        view: View,
    ) {
        val root = activity.window.decorView as? ViewGroup ?: return
        root.addView(
            view,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            ),
        )
    }

    private fun removeShellOverlay(activity: ComponentActivity) {
        val root = activity.window.decorView as? ViewGroup ?: return
        val existing =
            (0 until root.childCount)
                .map { root.getChildAt(it) }
                .filter { it.tag == OVERLAY_TAG }

        existing.forEach(root::removeView)
    }

    private fun applyBrightness(
        activity: ComponentActivity,
        value: Int,
    ) {
        val level = value.coerceIn(0, 100)
        val attributes = activity.window.attributes
        attributes.screenBrightness =
            if (level <= 0) {
                0.01f
            } else {
                (level / 100f).coerceIn(0.01f, 1f)
            }
        activity.window.attributes = attributes
        activity.window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
        )
    }

    private fun enterDedicatedMode(activity: ComponentActivity) {
        WindowCompat.setDecorFitsSystemWindows(activity.window, false)
        WindowInsetsControllerCompat(
            activity.window,
            activity.window.decorView,
        ).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior =
                WindowInsetsControllerCompat
                    .BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }

        if (!credentials.deviceShellManaged() || !isDeviceOwner()) {
            return
        }

        runCatching {
            devicePolicyManager.setLockTaskPackages(
                adminComponent,
                arrayOf(application.packageName),
            )
            if (
                devicePolicyManager.isLockTaskPermitted(
                    application.packageName,
                )
            ) {
                activity.startLockTask()
            }
        }
    }

    private fun heartbeatPayload(): JSONObject {
        val batteryManager =
            application.getSystemService(Context.BATTERY_SERVICE)
                as BatteryManager
        val batteryLevel =
            batteryManager.getIntProperty(
                BatteryManager.BATTERY_PROPERTY_CAPACITY,
            ).takeIf { it in 0..100 }

        val batteryIntent =
            application.registerReceiver(
                null,
                IntentFilter(Intent.ACTION_BATTERY_CHANGED),
            )
        val status =
            batteryIntent?.getIntExtra(
                BatteryManager.EXTRA_STATUS,
                BatteryManager.BATTERY_STATUS_UNKNOWN,
            )
        val charging =
            status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL

        val bootEpochMs =
            System.currentTimeMillis() - SystemClock.elapsedRealtime()

        return JSONObject()
            .put("device_mode", currentMode())
            .put("app_version", BuildConfig.VERSION_NAME)
            .put("os_version", Build.VERSION.RELEASE)
            .put("manufacturer", Build.MANUFACTURER)
            .put("model", Build.MODEL)
            .put(
                "screen_state",
                if (identifyActive) {
                    "identify"
                } else {
                    normalizedScreenState(
                        credentials.deviceShellScreenState(),
                    )
                },
            )
            .put(
                "brightness",
                credentials.deviceShellBrightness(),
            )
            .put(
                "battery_level",
                batteryLevel ?: JSONObject.NULL,
            )
            .put("is_charging", charging)
            .put("network_type", networkType())
            .put("booted_at", Instant.ofEpochMilli(bootEpochMs).toString())
            .put(
                "metadata",
                JSONObject()
                    .put("device_owner", isDeviceOwner())
                    .put(
                        "lock_task_permitted",
                        runCatching {
                            devicePolicyManager.isLockTaskPermitted(
                                application.packageName,
                            )
                        }.getOrDefault(false),
                    )
                    .put(
                        "offline_bootstrap",
                        true,
                    ),
            )
    }

    private fun currentMode(): String {
        val attached = normalizeMode(attachedMode)
        if (attached != "restaurant_app") {
            return attached
        }

        val session = credentials.staffSession()
        val surface = session?.surface?.trim()?.lowercase()
        if (surface in setOf("pos", "kds", "reservations")) {
            return surface!!
        }

        return credentials.preferredWorkspace()
            ?.takeIf { it in setOf("pos", "kds", "reservations") }
            ?: "restaurant_app"
    }

    private fun normalizeMode(value: String): String {
        return when (value.trim().lowercase()) {
            "cashier", "waiter", "pos" -> "pos"
            "kitchen", "kds" -> "kds"
            "reservations" -> "reservations"
            else -> "restaurant_app"
        }
    }

    private fun normalizedScreenState(value: String): String {
        return when (value.trim().lowercase()) {
            "closed", "sleep" -> "closed"
            else -> "awake"
        }
    }

    private fun networkType(): String {
        val manager =
            application.getSystemService(Context.CONNECTIVITY_SERVICE)
                as ConnectivityManager
        val network = manager.activeNetwork ?: return "offline"
        val caps =
            manager.getNetworkCapabilities(network)
                ?: return "unknown"

        return when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) ->
                "ethernet"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ->
                "wifi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ->
                "cellular"
            else -> "other"
        }
    }

    private fun isDeviceOwner(): Boolean =
        runCatching {
            devicePolicyManager.isDeviceOwnerApp(
                application.packageName,
            )
        }.getOrDefault(false)

    private fun launchMainActivity() {
        runCatching {
            application.startActivity(
                Intent(
                    application,
                    MainActivity::class.java,
                ).addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP,
                ),
            )
        }
    }

    companion object {
        private const val OVERLAY_TAG =
            "pmd-device-shell-overlay-v1"
        private const val IDENTIFY_TOKEN =
            "pmd-device-shell-identify-v1"
    }
}
