package com.paymydine.tabledisplay

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import org.json.JSONObject
import java.time.Instant

/**
 * Shared PayMyDine Device Shell runtime for the Table Companion.
 *
 * The Cloud controls desired screen/brightness policy and queues commands.
 * The device keeps Android + networking alive while "closed"; the customer
 * simply sees a black screen at minimum brightness, so a later Cloud WAKE can
 * be received without anyone touching the tablet.
 *
 * A normal APK install uses immersive mode. When the package is provisioned as
 * Android Device Owner on restaurant-owned hardware, Lock Task and managed
 * reboot are also available so Android itself effectively disappears.
 */
class DeviceShellController(
    private val activity: ComponentActivity,
    private val store: SecureStore,
    private val client: DevicePlatformClient,
) {
    var screenState by mutableStateOf(store.deviceScreenState())
        private set

    var brightness by mutableStateOf(store.deviceBrightness())
        private set

    var identifyActive by mutableStateOf(false)
        private set

    var deviceOwnerMode by mutableStateOf(false)
        private set

    var lastControlReason by mutableStateOf("")
        private set

    private val mainHandler = Handler(Looper.getMainLooper())
    private var readyLogged = false
    private var lastDesired = DeviceDesiredState(
        screenState = screenState,
        brightness = brightness,
        reason = "local_restore",
        kiosk = true,
    )

    private val adminComponent =
        ComponentName(activity, PmdDeviceAdminReceiver::class.java)

    private val devicePolicyManager =
        activity.getSystemService(Context.DEVICE_POLICY_SERVICE)
            as DevicePolicyManager

    init {
        applyBrightness(brightness)
        enterDedicatedMode()
    }

    fun enterDedicatedMode() {
        deviceOwnerMode =
            runCatching {
                devicePolicyManager.isDeviceOwnerApp(activity.packageName)
            }.getOrDefault(false)

        if (!deviceOwnerMode) {
            return
        }

        runCatching {
            devicePolicyManager.setLockTaskPackages(
                adminComponent,
                arrayOf(activity.packageName),
            )

            if (
                devicePolicyManager.isLockTaskPermitted(activity.packageName)
            ) {
                activity.startLockTask()
            }
        }
    }

    suspend fun heartbeatOnce(): Long {
        val host = store.host() ?: return 15L
        val token = store.token() ?: return 15L

        val result = client.heartbeat(
            host = host,
            token = token,
            payload = heartbeatPayload(),
        )

        if (!readyLogged) {
            runCatching {
                client.log(
                    host = host,
                    token = token,
                    level = "info",
                    event = "device_shell_ready",
                    message = "Table Companion Device Shell is online.",
                    context = mapOf(
                        "mode" to "table_display",
                        "app_version" to BuildConfig.VERSION_NAME,
                        "device_owner" to deviceOwnerMode,
                        "network_type" to networkType(),
                    ),
                )
            }
            readyLogged = true
        }

        lastDesired = result.desired
        if (!identifyActive) {
            applyDesired(result.desired)
        }

        for (command in result.commands) {
            processCommand(
                host = host,
                token = token,
                command = command,
            )
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
                applyScreenState(
                    state = "awake",
                    requestedBrightness =
                        command.payload["brightness"]?.toIntOrNull()
                            ?: lastDesired.brightness,
                    reason = "remote_wake",
                )
                acknowledgeCompleted(host, token, command, "awake")
            }

            "SLEEP" -> {
                applyScreenState(
                    state = "closed",
                    requestedBrightness =
                        command.payload["brightness"]?.toIntOrNull()
                            ?: 1,
                    reason = "remote_sleep",
                )
                acknowledgeCompleted(host, token, command, "closed")
            }

            "SET_BRIGHTNESS" -> {
                val level =
                    command.payload["brightness"]?.toIntOrNull()
                        ?.coerceIn(0, 100)
                        ?: lastDesired.brightness
                brightness = level
                applyBrightness(level)
                store.saveDeviceControlState(screenState, brightness)
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
                applyScreenState(
                    state = "awake",
                    requestedBrightness = 100,
                    reason = "identify",
                )
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
                        applyDesired(lastDesired)
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
                    mapOf("action" to "activity_recreate"),
                )
                mainHandler.post {
                    activity.recreate()
                }
            }

            "REBOOT" -> {
                if (!deviceOwnerMode) {
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
                /*
                 * Do not pretend that an APK update happened. Managed OTA is
                 * enabled only after a signed package/update channel is wired.
                 */
                client.acknowledge(
                    host,
                    token,
                    command.commandId,
                    "failed",
                    mapOf(
                        "reason" to
                            "Signed managed OTA channel is not configured for this device.",
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

    private suspend fun acknowledgeCompleted(
        host: String,
        token: String,
        command: DeviceCommand,
        appliedState: String,
    ) {
        client.acknowledge(
            host,
            token,
            command.commandId,
            "completed",
            mapOf(
                "screen_state" to appliedState,
                "brightness" to brightness,
            ),
        )
    }

    private fun applyDesired(desired: DeviceDesiredState) {
        lastControlReason = desired.reason

        if (desired.kiosk) {
            enterDedicatedMode()
        }

        applyScreenState(
            state = desired.screenState,
            requestedBrightness = desired.brightness,
            reason = desired.reason,
        )
    }

    private fun applyScreenState(
        state: String,
        requestedBrightness: Int,
        reason: String,
    ) {
        val normalized =
            when (state.lowercase()) {
                "closed", "sleep" -> "closed"
                "identify" -> "identify"
                else -> "awake"
            }

        screenState = normalized
        brightness = requestedBrightness.coerceIn(0, 100)
        lastControlReason = reason
        applyBrightness(brightness)
        store.saveDeviceControlState(screenState, brightness)
    }

    private fun applyBrightness(percent: Int) {
        val level = percent.coerceIn(0, 100)
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

    private fun heartbeatPayload(): JSONObject {
        val batteryManager =
            activity.getSystemService(Context.BATTERY_SERVICE)
                as BatteryManager

        val batteryLevel =
            batteryManager.getIntProperty(
                BatteryManager.BATTERY_PROPERTY_CAPACITY,
            ).takeIf { it in 0..100 }

        val batteryIntent =
            activity.registerReceiver(
                null,
                IntentFilter(Intent.ACTION_BATTERY_CHANGED),
            )
        val batteryStatus =
            batteryIntent?.getIntExtra(
                BatteryManager.EXTRA_STATUS,
                BatteryManager.BATTERY_STATUS_UNKNOWN,
            )
        val charging =
            batteryStatus == BatteryManager.BATTERY_STATUS_CHARGING ||
                batteryStatus == BatteryManager.BATTERY_STATUS_FULL

        val bootEpochMs =
            System.currentTimeMillis() - SystemClock.elapsedRealtime()

        return JSONObject()
            .put("device_mode", "table_display")
            .put("app_version", BuildConfig.VERSION_NAME)
            .put("os_version", Build.VERSION.RELEASE)
            .put("manufacturer", Build.MANUFACTURER)
            .put("model", Build.MODEL)
            .put(
                "screen_state",
                if (identifyActive) "identify" else screenState,
            )
            .put("brightness", brightness)
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
                    .put("device_owner", deviceOwnerMode)
                    .put(
                        "lock_task_permitted",
                        runCatching {
                            devicePolicyManager.isLockTaskPermitted(
                                activity.packageName,
                            )
                        }.getOrDefault(false),
                    )
                    .put("installation_id", store.installationId())
                    .put("device_id", store.deviceId()),
            )
    }

    private fun networkType(): String {
        val manager =
            activity.getSystemService(Context.CONNECTIVITY_SERVICE)
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

    companion object {
        private const val IDENTIFY_TOKEN = "pmd-identify-v1"
    }
}
