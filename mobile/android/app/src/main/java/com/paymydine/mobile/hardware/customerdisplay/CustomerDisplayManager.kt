package com.paymydine.mobile.hardware.customerdisplay

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.LruCache
import android.util.Log
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicReference

/**
 * PMD_ZCS_CUSTOMER_DISPLAY_V1
 *
 * Device-local authority for the customer-facing display. Nothing is shared
 * between cashiers: each Android installation owns its own manager and its own
 * physical secondary screen.
 *
 * ZCS is accessed through reflection so normal CI still builds without the
 * proprietary AAR. When SmartPos_2.0.6_R260615.aar is present under app/libs,
 * Gradle packages it and the same code activates automatically on the device.
 */
class CustomerDisplayManager(
    context: Context,
) {
    private val appContext = context.applicationContext
    private val prefs =
        appContext.getSharedPreferences(
            "pmd_customer_display",
            Context.MODE_PRIVATE,
        )
    private val worker: ExecutorService =
        Executors.newSingleThreadExecutor { runnable ->
            Thread(runnable, "pmd-customer-display").apply {
                isDaemon = true
            }
        }
    private val renderer = CustomerDisplayRenderer()
    private val zcs = ZcsSecondaryScreenDevice()
    private val latest = AtomicReference(CustomerDisplayState.idle())
    private val imageCache =
        object : LruCache<String, Bitmap>(6) {
            override fun sizeOf(
                key: String,
                value: Bitmap,
            ): Int = 1
        }

    @Volatile
    private var lastHardwareError: String? = null

    fun pushJson(raw: String) {
        val state =
            runCatching {
                CustomerDisplayState.fromJson(raw)
            }.getOrElse {
                CustomerDisplayState(
                    phase = CustomerDisplayPhase.ERROR,
                    currency = "€",
                    total = 0.0,
                    amountDue = 0.0,
                    tableLabel = null,
                    orderLabel = null,
                    headline = "Display update failed",
                    message = "Please continue on the cashier screen.",
                    highlightName = null,
                    highlightImageUrl = null,
                    items = emptyList(),
                )
            }

        latest.set(state)
        if (!enabled()) return

        worker.execute {
            renderAndShow(state)
        }
    }

    fun showIdle() {
        val state =
            CustomerDisplayState.idle(
                prefs.getString(
                    KEY_IDLE_MESSAGE,
                    "Ready when you are",
                ) ?: "Ready when you are",
            )
        latest.set(state)
        if (!enabled()) return
        worker.execute {
            renderAndShow(state)
        }
    }

    fun showSuccess(
        amount: Double,
        currency: String,
        message: String = "Thank you!",
    ) {
        val state =
            CustomerDisplayState(
                phase = CustomerDisplayPhase.SUCCESS,
                currency = currency,
                total = amount,
                amountDue = 0.0,
                tableLabel = null,
                orderLabel = null,
                headline = "Paid",
                message = message,
                highlightName = null,
                highlightImageUrl = null,
                items = emptyList(),
            )
        latest.set(state)
        if (!enabled()) return
        worker.execute {
            renderAndShow(state)
        }
    }

    fun setEnabled(value: Boolean) {
        prefs.edit().putBoolean(KEY_ENABLED, value).apply()
        if (value) {
            worker.execute {
                renderAndShow(latest.get())
            }
        } else {
            worker.execute {
                zcs.sleep()
            }
        }
    }

    fun setShowImages(value: Boolean) {
        prefs.edit().putBoolean(KEY_SHOW_IMAGES, value).apply()
        worker.execute {
            renderAndShow(latest.get())
        }
    }

    fun setIdleMessage(value: String) {
        prefs.edit()
            .putString(
                KEY_IDLE_MESSAGE,
                value.take(80),
            )
            .apply()
    }

    fun enabled(): Boolean =
        prefs.getBoolean(KEY_ENABLED, true)

    fun showImages(): Boolean =
        prefs.getBoolean(KEY_SHOW_IMAGES, true)

    fun capabilitiesJson(): String {
        val capabilities = zcs.capabilities()
        val json =
            JSONObject()
                .put("customer_display", capabilities.available)
                .put("vendor", capabilities.vendor)
                .put("model", capabilities.model)
                .put("width", CustomerDisplayRenderer.WIDTH)
                .put("height", CustomerDisplayRenderer.HEIGHT)
                .put("images_enabled", showImages())
                .put("enabled", enabled())

        capabilities.largeSecondarySupported?.let {
            json.put("large_secondary_supported", it)
        }
        capabilities.touchSecondarySupported?.let {
            json.put("touch_secondary_supported", it)
        }
        capabilities.sdkInitStatus?.let {
            json.put("sdk_init_status", it)
        }
        capabilities.lastAwakeStatus?.let {
            json.put("last_awake_status", it)
        }
        capabilities.lastShowStatus?.let {
            json.put("last_show_status", it)
        }

        return json
            .put("last_error", lastHardwareError ?: zcs.lastError())
            .toString()
    }

    fun close() {
        worker.execute {
            runCatching {
                val idle =
                    CustomerDisplayState.idle(
                        prefs.getString(
                            KEY_IDLE_MESSAGE,
                            "Ready when you are",
                        ) ?: "Ready when you are",
                    )
                renderAndShow(idle)
            }
        }
    }

    private fun renderAndShow(state: CustomerDisplayState) {
        val image =
            if (
                showImages() &&
                state.phase == CustomerDisplayPhase.ORDER
            ) {
                loadImage(
                    state.highlightImageUrl
                        ?: state.items.lastOrNull()?.imageUrl,
                )
            } else {
                null
            }

        val frame = renderer.render(state, image)
        val result =
            runCatching {
                zcs.show(frame)
            }.getOrElse {
                lastHardwareError = it.message ?: it.javaClass.simpleName
                false
            }

        if (result) {
            lastHardwareError = null
        } else if (lastHardwareError == null) {
            lastHardwareError = zcs.lastError()
        }

        frame.recycle()
    }

    private fun loadImage(rawUrl: String?): Bitmap? {
        val value = rawUrl?.trim().orEmpty()
        if (value.isBlank()) return null

        imageCache.get(value)?.let { cached ->
            if (!cached.isRecycled) return cached
        }

        // PMD_ZCS_OFFLINE_CACHED_IMAGE_V17
        // Local POS exposes only app-private cached menu images as data URIs.
        // Decode them in-process so the customer display never needs WAN access.
        if (value.startsWith("data:image/", ignoreCase = true)) {
            val marker = ";base64,"
            val split = value.indexOf(marker, ignoreCase = true)
            if (split < 0) return null

            return runCatching {
                val bytes = Base64.decode(
                    value.substring(split + marker.length),
                    Base64.DEFAULT,
                )
                val decoded = BitmapFactory.decodeByteArray(
                    bytes,
                    0,
                    bytes.size,
                ) ?: return@runCatching null
                imageCache.put(value, decoded)
                decoded
            }.getOrNull()
        }

        if (!value.startsWith("https://", ignoreCase = true)) {
            return null
        }

        imageCache.get(value)?.let { cached ->
            if (!cached.isRecycled) return cached
        }

        return runCatching {
            val connection =
                (URL(value).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 1800
                    readTimeout = 2200
                    instanceFollowRedirects = true
                    useCaches = true
                    setRequestProperty(
                        "User-Agent",
                        "PayMyDine-Android-CustomerDisplay",
                    )
                }

            try {
                connection.connect()
                if (connection.responseCode !in 200..299) {
                    return@runCatching null
                }
                val decoded =
                    connection.inputStream.use {
                        BitmapFactory.decodeStream(it)
                    } ?: return@runCatching null

                imageCache.put(value, decoded)
                decoded
            } finally {
                connection.disconnect()
            }
        }.getOrNull()
    }

    private data class ZcsCapabilities(
        val available: Boolean,
        val vendor: String,
        val model: String,
        val largeSecondarySupported: Boolean?,
        val touchSecondarySupported: Boolean?,
        val sdkInitStatus: Int?,
        val lastAwakeStatus: Int?,
        val lastShowStatus: Int?,
    )

    private class ZcsSecondaryScreenDevice {
        private var driverManager: Any? = null
        private var sys: Any? = null
        private var initialized = false
        private var failure: String? = null
        private var largeSecondarySupported: Boolean? = null
        private var touchSecondarySupported: Boolean? = null
        private var sdkInitStatus: Int? = null
        private var lastAwakeStatus: Int? = null
        private var lastShowStatus: Int? = null

        fun capabilities(): ZcsCapabilities {
            ensureInitialized()
            return ZcsCapabilities(
                available = initialized && sys != null,
                vendor = if (sys != null) "ZCS" else "",
                model = if (sys != null) "SmartPOS secondary screen" else "",
                largeSecondarySupported = largeSecondarySupported,
                touchSecondarySupported = touchSecondarySupported,
                sdkInitStatus = sdkInitStatus,
                lastAwakeStatus = lastAwakeStatus,
                lastShowStatus = lastShowStatus,
            )
        }

        fun lastError(): String? = failure

        fun show(bitmap: Bitmap): Boolean {
            if (!ensureInitialized()) return false
            val target = sys ?: return false

            return runCatching {
                lastAwakeStatus = invokeIntOptional(target, "awakeSubScreen")
                if (lastAwakeStatus != null && lastAwakeStatus != 0) {
                    Log.w(
                        TAG,
                        "awakeSubScreen returned $lastAwakeStatus",
                    )
                }

                val result =
                    target.javaClass
                        .getMethod(
                            "showBitmapOnSecondaryScreen",
                            Bitmap::class.java,
                            java.lang.Boolean.TYPE,
                        )
                        .invoke(target, bitmap, true)

                val code = (result as? Number)?.toInt() ?: 0
                lastShowStatus = code

                if (code != 0) {
                    failure = "ZCS showBitmapOnSecondaryScreen returned $code"
                    Log.e(TAG, failure!!)
                    false
                } else {
                    failure = null
                    Log.i(TAG, "Secondary screen frame sent successfully")
                    true
                }
            }.getOrElse {
                failure =
                    it.cause?.message
                        ?: it.message
                        ?: it.javaClass.simpleName
                Log.e(TAG, "Secondary screen show failed", it)
                false
            }
        }

        fun sleep() {
            val target = sys ?: return
            runCatching {
                invokeOptional(target, "asleepSubScreen")
            }
        }

        private fun ensureInitialized(): Boolean {
            if (initialized && sys != null) return true
            if (failure?.startsWith("ZCS SDK not packaged") == true) {
                return false
            }

            return runCatching {
                val driverClass =
                    Class.forName("com.zcs.sdk.DriverManager")
                val manager =
                    driverClass
                        .getMethod("getInstance")
                        .invoke(null)

                val device =
                    driverClass
                        .getMethod("getBaseSysDevice")
                        .invoke(manager)

                driverManager = manager
                sys = device

                // Match the official SmartPos_2.0.6 demo initialization
                // sequence: sdkInit -> sysPowerOn -> wait 1s -> sdkInit.
                invokeOptionalBoolean(device, "showDetailLog", true)

                var status =
                    (device.javaClass
                        .getMethod("sdkInit")
                        .invoke(device) as? Number)
                        ?.toInt()
                        ?: 0
                sdkInitStatus = status

                if (status != 0) {
                    val powerStatus = invokeIntOptional(device, "sysPowerOn")
                    Log.w(
                        TAG,
                        "sdkInit=$status; sysPowerOn=$powerStatus; retrying",
                    )
                    Thread.sleep(1000L)
                    status =
                        (device.javaClass
                            .getMethod("sdkInit")
                            .invoke(device) as? Number)
                            ?.toInt()
                            ?: status
                    sdkInitStatus = status
                }

                if (status != 0) {
                    failure = "ZCS sdkInit returned $status"
                    initialized = false
                    Log.e(TAG, failure!!)
                    false
                } else {
                    largeSecondarySupported =
                        invokeBooleanOptional(
                            device,
                            "isLargeSecondScreenSupport",
                        )
                    touchSecondarySupported =
                        invokeBooleanOptional(
                            device,
                            "isSecondScreenTPSupport",
                        )
                    lastAwakeStatus =
                        invokeIntOptional(device, "awakeSubScreen")

                    initialized = true
                    failure =
                        if (
                            lastAwakeStatus != null &&
                            lastAwakeStatus != 0
                        ) {
                            "ZCS awakeSubScreen returned $lastAwakeStatus"
                        } else {
                            null
                        }

                    Log.i(
                        TAG,
                        "ZCS initialized: large=$largeSecondarySupported " +
                            "touch=$touchSecondarySupported " +
                            "awake=$lastAwakeStatus",
                    )
                    true
                }
            }.getOrElse {
                sys = null
                driverManager = null
                initialized = false
                failure =
                    if (it is ClassNotFoundException) {
                        "ZCS SDK not packaged in this APK"
                    } else {
                        it.cause?.message
                            ?: it.message
                            ?: it.javaClass.simpleName
                    }
                Log.e(TAG, "ZCS initialization failed", it)
                false
            }
        }

        private fun invokeOptional(
            target: Any,
            name: String,
        ): Any? =
            runCatching {
                target.javaClass
                    .getMethod(name)
                    .invoke(target)
            }.getOrNull()

        private fun invokeIntOptional(
            target: Any,
            name: String,
        ): Int? =
            runCatching {
                (target.javaClass
                    .getMethod(name)
                    .invoke(target) as? Number)
                    ?.toInt()
            }.getOrNull()

        private fun invokeBooleanOptional(
            target: Any,
            name: String,
        ): Boolean? =
            runCatching {
                target.javaClass
                    .getMethod(name)
                    .invoke(target) as? Boolean
            }.getOrNull()

        private fun invokeOptionalBoolean(
            target: Any,
            name: String,
            value: Boolean,
        ): Any? =
            runCatching {
                target.javaClass
                    .getMethod(
                        name,
                        java.lang.Boolean.TYPE,
                    )
                    .invoke(target, value)
            }.getOrNull()
    }

    companion object {
        private const val TAG = "PMD-ZCS-Display"
        private const val KEY_ENABLED = "enabled"
        private const val KEY_SHOW_IMAGES = "show_images"
        private const val KEY_IDLE_MESSAGE = "idle_message"
    }
}
