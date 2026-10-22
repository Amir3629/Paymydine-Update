package com.paymydine.staff

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.net.http.SslError
import android.widget.Button
import android.widget.CheckBox
import android.widget.ImageView
import android.widget.ScrollView
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.text.InputType
import java.util.Locale

/**
 * PMD_STAFF_ANDROID_SEPARATE_APP_V1_20261021
 *
 * Dedicated Staff Portal client — NOT the POS/Device app.
 * Auth, requests, chat and clock records remain server-owned.
 * WebView requests foreground location only on the employee's own clock tap.
 * There is no background location permission, GPS cache, or device pairing.
 */
class StaffActivity : Activity() {
    private val preferences by lazy { getSharedPreferences("pmd_staff_portal_v1", MODE_PRIVATE) }
    private lateinit var root: LinearLayout
    private lateinit var toolbar: LinearLayout
    private lateinit var setup: LinearLayout
    private lateinit var onboardingScroll: ScrollView
    private lateinit var browser: WebView
    private lateinit var progress: ProgressBar
    private lateinit var alert: TextView
    // PMD_STAFF_NATIVE_ONBOARDING_V2_20261022: the only persistent value is workplace + notice acknowledgment.
    private lateinit var noticeCheckbox: CheckBox
    private var restaurantHost: String = ""
    private var pendingGeo: GeolocationPermissions.Callback? = null
    private var pendingOrigin: String? = null
    private val permissionCode = 4521
    // PMD_STAFF_NATIVE_CLOCK_GPS_V1_20261022
    // One-shot foreground-only bridge; no JavaScript interface, persistent GPS grant or background tracker.
    private val nativePermissionCode = 4522
    private val nativeLocationHandler = Handler(Looper.getMainLooper())
    private var nativeRequestId: String? = null
    private var nativeLocationListener: LocationListener? = null
    private var nativeTimeout: Runnable? = null
    // PMD_STAFF_FAST_PRECISE_GPS_V2_20261022: quick fresh fix, 15-second bound,
    // and non-sensitive accuracy progress (never location coordinates in logs).
    private var nativeBestAccuracy: Float? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(5, 74, 59)
        window.navigationBarColor = Color.rgb(4, 39, 33)

        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(247, 251, 250))
        }
        setContentView(root)

        // The Staff Portal already has its own PayMyDine logo and navigation.
        // Do not stack a native "PayMyDine / Staff / Restaurant" header above it.
        toolbar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            visibility = View.GONE
        }

        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            visibility = View.GONE
        }
        root.addView(progress, LinearLayout.LayoutParams(-1, dp(3)))

        val scroll = ScrollView(this).apply { isFillViewport = true }
        setup = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(36), dp(24), dp(28))
        }

        val branding = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
        }
        branding.addView(ImageView(this).apply {
            setImageResource(R.drawable.ic_staff_launcher)
            contentDescription = getString(R.string.app_name)
        }, LinearLayout.LayoutParams(dp(60), dp(60)))
        branding.addView(TextView(this).apply {
            text = "PayMyDine"
            textSize = 19f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.rgb(7, 85, 67))
            setPadding(dp(9), 0, 0, 0)
        })
        setup.addView(branding)

        setup.addView(TextView(this).apply {
            text = getString(R.string.staff_setup_title)
            textSize = 28f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.rgb(11, 58, 47))
            setPadding(0, dp(21), 0, dp(7))
        })
        setup.addView(TextView(this).apply {
            text = getString(R.string.staff_setup_subtitle)
            textSize = 14f
            setTextColor(Color.rgb(77, 103, 94))
            setPadding(0, 0, 0, dp(25))
        })
        setup.addView(TextView(this).apply {
            text = getString(R.string.staff_restaurant_code)
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.rgb(16, 53, 43))
            setPadding(0, 0, 0, dp(8))
        })

        val inputRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
            background = rounded(Color.WHITE, dp(14), Color.rgb(189, 217, 205))
            setPadding(dp(13), 0, dp(12), 0)
        }
        val savedCode = (preferences.getString("host", "") ?: "")
            .removeSuffix(".paymydine.com")
        val hostInput = EditText(this).apply {
            hint = getString(R.string.staff_restaurant_example)
            setSingleLine(true)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            textSize = 16f
            setTextColor(Color.rgb(12, 54, 44))
            setText(savedCode)
            setSelectAllOnFocus(true)
            background = null
            setPadding(0, 0, dp(5), 0)
        }
        inputRow.addView(hostInput, LinearLayout.LayoutParams(0, dp(54), 1f))
        inputRow.addView(TextView(this).apply {
            text = ".paymydine.com"
            textSize = 12f
            setTextColor(Color.rgb(100, 131, 121))
        })
        setup.addView(inputRow)
        setup.addView(TextView(this).apply {
            text = getString(R.string.staff_restaurant_hint)
            textSize = 12f
            setTextColor(Color.rgb(97, 120, 111))
            setPadding(0, dp(9), 0, dp(17))
        })

        alert = TextView(this).apply {
            textSize = 13f
            setTextColor(Color.rgb(163, 50, 45))
            setPadding(0, dp(6), 0, dp(12))
            visibility = View.GONE
        }
        setup.addView(alert)

        setup.addView(TextView(this).apply {
            text = getString(R.string.staff_location_summary)
            textSize = 12f
            setTextColor(Color.rgb(69, 95, 85))
            setPadding(0, dp(6), 0, dp(10))
        })
        val privacyInfo = Button(this).apply {
            text = getString(R.string.staff_privacy_view)
            isAllCaps = false
            textSize = 12f
            setTextColor(Color.rgb(7, 95, 79))
            background = rounded(Color.rgb(231, 245, 238), dp(10), 0)
            setOnClickListener { showPrivacyNotice() }
        }
        setup.addView(privacyInfo, LinearLayout.LayoutParams(-1, dp(42)))

        noticeCheckbox = CheckBox(this).apply {
            text = getString(R.string.staff_notice_ack)
            textSize = 12f
            setTextColor(Color.rgb(36, 75, 61))
            isChecked = preferences.getBoolean("staff_notice_ack_v2", false)
            setPadding(0, dp(14), 0, dp(9))
        }
        setup.addView(noticeCheckbox)

        val launch = Button(this).apply {
            text = getString(R.string.staff_continue)
            isAllCaps = false
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.WHITE)
            background = rounded(Color.rgb(7, 106, 82), dp(13), 0)
            setOnClickListener {
                val host = normalizeHost(hostInput.text.toString())
                when {
                    host == null -> {
                        alert.text = getString(R.string.staff_invalid_code)
                        alert.visibility = View.VISIBLE
                    }
                    !noticeCheckbox.isChecked -> {
                        alert.text = getString(R.string.staff_notice_required)
                        alert.visibility = View.VISIBLE
                    }
                    else -> {
                        preferences.edit().putBoolean("staff_notice_ack_v2", true).apply()
                        alert.visibility = View.GONE
                        connect(host)
                    }
                }
            }
        }
        setup.addView(launch, LinearLayout.LayoutParams(-1, dp(53)).apply {
            topMargin = dp(5)
        })
        scroll.addView(setup)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))

        browser = WebView(this).apply {
            visibility = View.GONE
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.setGeolocationEnabled(true)
            // Only the dedicated Staff APK advertises the native, one-shot time-clock GPS route.
            settings.userAgentString = settings.userAgentString + " PMDStaffNativeGPS/1"
            settings.allowContentAccess = false
            settings.allowFileAccess = false
            settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.setSupportMultipleWindows(false)
            if (android.os.Build.VERSION.SDK_INT >= 26) {
                settings.safeBrowsingEnabled = true
            }
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false)
        browser.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                // Intercept only a main-frame request from our authenticated restaurant Staff Portal.
                // Never deliver raw GPS in a URL or grant it to third-party frames.
                if (uri.scheme == "pmdstaff" && request.isForMainFrame &&
                    isTrustedClockDocument(view.url)) {
                    when (uri.host) {
                        "workplace" -> showSetup()
                        "privacy" -> showPrivacyNotice()
                    }
                    return true
                }
                if (uri.scheme == "pmdstaffgeo") {
                    if (request.isForMainFrame && uri.host == "clock"
                        && isTrustedClockDocument(view.url)) {
                        val id = uri.getQueryParameter("request")
                        if (id != null && Regex("^[A-Za-z0-9_-]{12,80}$").matches(id)) {
                            requestNativeClockGps(id)
                        }
                    }
                    return true
                }
                // PMD_STAFF_WORKFORCE_DAILY_RELIABILITY_V2_20261021: keep the authenticated WebView on the chosen tenant only.
                // Other PMD tenant origins open in the system browser, without Staff cookies.
                if (uri.scheme == "https" && uri.host?.lowercase(Locale.ROOT) == restaurantHost) return false
                if (uri.scheme == "https") {
                    try { startActivity(Intent(Intent.ACTION_VIEW, uri)) } catch (_: Exception) {}
                }
                return true
            }

            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler, error: SslError) {
                handler.cancel()  // Never click through an invalid staff login certificate.
            }

            override fun onPageFinished(view: WebView, url: String) {
                progress.visibility = View.GONE
            }
        }
        browser.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progress.progress = newProgress
                progress.visibility = if (newProgress in 1..99) View.VISIBLE else View.GONE
            }

            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                // Only the chosen restaurant HTTPS origin can obtain foreground GPS.
                val uri = Uri.parse(origin)
                if (uri.scheme != "https" || uri.host?.lowercase(Locale.ROOT) != restaurantHost) {
                    callback.invoke(origin, false, false)
                    return
                }
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false) // Never persist GPS site permission.
                    return
                }
                pendingGeo?.invoke(pendingOrigin ?: origin, false, false)
                pendingGeo = callback
                pendingOrigin = origin
                requestPermissions(
                    arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                    permissionCode
                )
            }
        }
        root.addView(browser, LinearLayout.LayoutParams(-1, 0, 1f))
        onboardingScroll = scroll

        val saved = normalizeHost(preferences.getString("host", "") ?: "")
        if (saved != null && preferences.getBoolean("staff_notice_ack_v2", false)) connect(saved) else showSetup()
    }

    private fun isTrustedClockDocument(url: String?): Boolean {
        if (restaurantHost.isBlank() || url.isNullOrBlank()) return false
        val uri = try { Uri.parse(url) } catch (_: Exception) { return false }
        if (uri.scheme != "https" || uri.host?.lowercase(Locale.ROOT) != restaurantHost) return false
        val path = uri.path ?: return false
        return path == "/admin/mywork" || path.startsWith("/admin/mywork/") ||
            path == "/staff" || path.startsWith("/staff/")
    }

    private fun requestNativeClockGps(id: String) {
        if (nativeRequestId != null || !isTrustedClockDocument(browser.url)) return
        nativeRequestId = id
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            // Android 12+ may grant approximate but not precise: request BOTH to let the user choose.
            requestPermissions(
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                nativePermissionCode
            )
            return
        }
        beginNativeClockGps()
    }

    private fun beginNativeClockGps() {
        if (nativeRequestId == null) return
        if (!isTrustedClockDocument(browser.url)) {
            finishNativeClockGps(null, "cancelled", notify = false)
            return
        }
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            finishNativeClockGps(null, "precise_denied")
            return
        }

        val manager = getSystemService(LOCATION_SERVICE) as LocationManager
        val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
            .filter { provider ->
                try { manager.isProviderEnabled(provider) } catch (_: Exception) { false }
            }
        if (providers.isEmpty()) {
            finishNativeClockGps(null, "location_off")
            return
        }

        nativeBestAccuracy = null

        fun goodFreshFix(location: Location): Boolean {
            val ageMs = System.currentTimeMillis() - location.time
            return ageMs in -5_000L..20_000L &&
                location.hasAccuracy() && location.accuracy > 0f &&
                location.accuracy <= 90f &&
                location.latitude.isFinite() && location.longitude.isFinite()
        }
        // LocationManager may already hold a fix acquired seconds ago.
        // Reuse only a truly fresh, precise one; older/city-level fixes still fail closed.
        for (provider in providers) {
            try {
                val fix = manager.getLastKnownLocation(provider)
                if (fix != null && goodFreshFix(fix)) {
                    finishNativeClockGps(fix, null)
                    return
                }
            } catch (_: SecurityException) {
                finishNativeClockGps(null, "precise_denied")
                return
            } catch (_: Exception) {}
        }

        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                val ageMs = System.currentTimeMillis() - location.time
                if (ageMs < -5_000L || ageMs > 20_000L ||
                    !location.hasAccuracy() || location.accuracy <= 0f ||
                    !location.latitude.isFinite() || !location.longitude.isFinite()) return
                if (location.accuracy > 90f) {
                    if (nativeBestAccuracy == null || location.accuracy < nativeBestAccuracy!!) {
                        nativeBestAccuracy = location.accuracy
                        reportNativeGpsAccuracy(location.accuracy)
                    }
                    return
                }
                finishNativeClockGps(location, null)
            }
        }
        nativeLocationListener = listener
        val timeout = Runnable {
            val accuracy = nativeBestAccuracy
            finishNativeClockGps(null,
                if (accuracy != null) "inaccurate:" + accuracy.toInt().coerceIn(91, 9999)
                else "no_fix")
        }
        nativeTimeout = timeout
        nativeLocationHandler.postDelayed(timeout, 15_000L)

        var registered = 0
        for (provider in providers) {
            try {
                manager.requestLocationUpdates(provider, 0L, 0f, listener, Looper.getMainLooper())
                registered++
            } catch (_: SecurityException) {
                // The separate precise-permission check above controls this path.
            } catch (_: Exception) {
                // A provider can disappear while location settings are changing.
            }
        }
        if (registered == 0) finishNativeClockGps(null, "provider_unavailable")
    }

    private fun reportNativeGpsAccuracy(accuracy: Float) {
        val request = nativeRequestId ?: return
        if (!isTrustedClockDocument(browser.url)) return
        val payload = JSONObject().put("request", request)
            .put("accuracy_m", accuracy.toDouble())
        // Only accuracy, no raw coordinates; the trusted page may display GPS progress.
        browser.evaluateJavascript(
            "window.PMD_STAFF_NATIVE_GPS_PROGRESS && window.PMD_STAFF_NATIVE_GPS_PROGRESS($payload);",
            null
        )
    }

    private fun finishNativeClockGps(
        location: Location?,
        error: String? = null,
        notify: Boolean = true
    ) {
        val request = nativeRequestId
        nativeRequestId = null
        nativeTimeout?.let { nativeLocationHandler.removeCallbacks(it) }
        nativeTimeout = null
        nativeLocationListener?.let { listener ->
            try {
                (getSystemService(LOCATION_SERVICE) as LocationManager).removeUpdates(listener)
            } catch (_: Exception) {}
        }
        nativeLocationListener = null
        nativeBestAccuracy = null

        if (!notify || request == null || !isTrustedClockDocument(browser.url)) return
        val payload = JSONObject()
            .put("request", request)
            .put("ok", location != null)
        if (location != null) {
            payload.put("latitude", location.latitude)
                .put("longitude", location.longitude)
                .put("accuracy_m", location.accuracy.toDouble())
                .put("captured_at_ms", location.time)
        } else {
            payload.put("error", error ?: "unavailable")
        }
        // Evaluate only in the trusted top-level Staff Portal. The server still
        // checks tenant, distance, accuracy and timestamp before inserting attendance.
        browser.evaluateJavascript(
            "window.PMD_STAFF_NATIVE_GPS_RESULT && window.PMD_STAFF_NATIVE_GPS_RESULT($payload);",
            null
        )
    }

    private fun connect(host: String) {
        restaurantHost = host
        preferences.edit().putString("host", host).apply()
        onboardingScroll.visibility = View.GONE
        toolbar.visibility = View.GONE
        browser.visibility = View.VISIBLE
        browser.loadUrl("https://$host/admin/login?destination=staff")
    }

    private fun showSetup() {
        finishNativeClockGps(null, "cancelled", notify = false)
        pendingGeo?.invoke(pendingOrigin ?: "", false, false)
        pendingGeo = null
        pendingOrigin = null
        browser.stopLoading()
        browser.loadUrl("about:blank")
        restaurantHost = ""
        browser.visibility = View.GONE
        toolbar.visibility = View.GONE
        onboardingScroll.visibility = View.VISIBLE
        progress.visibility = View.GONE
    }

    private fun normalizeHost(raw: String): String? {
        val candidate = raw.trim().lowercase(Locale.ROOT)
        if (candidate.isBlank() || candidate.startsWith("http://")) return null
        val code = candidate.removePrefix("https://").trimEnd('/')
        if (code.matches(Regex("^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$"))) {
            return "$code.paymydine.com"
        }
        // Backwards compatible with a pasted, complete, secure tenant hostname.
        return if (isPmdHost(code) && code != "paymydine.com" &&
            !code.contains('/') && !code.contains(':') &&
            !code.contains('?') && !code.contains('#')) code else null
    }

    private fun showPrivacyNotice() {
        AlertDialog.Builder(this)
            .setTitle(R.string.staff_privacy_title)
            .setMessage(R.string.staff_privacy_details)
            .setPositiveButton(R.string.staff_privacy_close, null)
            .show()
    }

    private fun isPmdHost(host: String?): Boolean {
        val value = host?.lowercase(Locale.ROOT) ?: return false
        return value == "paymydine.com" ||
            (value.endsWith(".paymydine.com") &&
                value.matches(Regex("^[a-z0-9-]+(\\.[a-z0-9-]+)*\\.paymydine\\.com$")))
    }

    private fun rounded(color: Int, radius: Int, border: Int): GradientDrawable =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = radius.toFloat()
            if (border != 0) setStroke(dp(1), border)
        }

    private fun dp(value: Int) = (resources.displayMetrics.density * value).toInt()

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == nativePermissionCode) {
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                beginNativeClockGps()
            } else {
                finishNativeClockGps(null, "precise_denied")
            }
            return
        }
        if (requestCode != permissionCode) return
        val allowed = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        pendingGeo?.invoke(pendingOrigin ?: "", allowed, false)
        pendingGeo = null
        pendingOrigin = null
    }

    @Deprecated("Back press API is supported for Android 8+")
    override fun onBackPressed() {
        if (browser.visibility == View.VISIBLE && browser.canGoBack()) browser.goBack()
        else if (browser.visibility == View.VISIBLE) showSetup()
        else super.onBackPressed()
    }

    override fun onDestroy() {
        finishNativeClockGps(null, "cancelled", notify = false)
        pendingGeo?.invoke(pendingOrigin ?: "", false, false)
        pendingGeo = null
        browser.destroy()
        super.onDestroy()
    }
}
