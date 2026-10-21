package com.paymydine.staff

import android.Manifest
import android.app.Activity
import android.content.Intent
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
    private lateinit var browser: WebView
    private lateinit var progress: ProgressBar
    private lateinit var alert: TextView
    private var restaurantHost: String = ""
    private var pendingGeo: GeolocationPermissions.Callback? = null
    private var pendingOrigin: String? = null
    private val permissionCode = 4521

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(5, 74, 59)
        window.navigationBarColor = Color.rgb(4, 39, 33)

        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(247, 251, 250))
        }
        setContentView(root)
        toolbar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
            setPadding(dp(18), dp(11), dp(14), dp(11))
            setBackgroundColor(Color.rgb(5, 85, 67))
        }
        val name = TextView(this).apply {
            text = "PayMyDine  /  Staff"
            textSize = 17f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.WHITE)
        }
        toolbar.addView(name, LinearLayout.LayoutParams(0, dp(42), 1f))
        val change = Button(this).apply {
            text = "Restaurant"
            textSize = 11f
            isAllCaps = false
            setTextColor(Color.rgb(5, 85, 67))
            background = rounded(Color.WHITE, dp(12), 0)
            setOnClickListener { showSetup() }
        }
        toolbar.addView(change, LinearLayout.LayoutParams(dp(107), dp(40)))
        root.addView(toolbar, LinearLayout.LayoutParams(-1, dp(64)))

        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            visibility = View.GONE
        }
        root.addView(progress, LinearLayout.LayoutParams(-1, dp(3)))

        setup = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(26), dp(40), dp(26), dp(24))
        }
        val eyebrow = TextView(this).apply {
            text = "YOUR WORKPLACE"
            textSize = 11f
            letterSpacing = .1f
            setTextColor(Color.rgb(15, 113, 87))
            typeface = Typeface.DEFAULT_BOLD
        }
        setup.addView(eyebrow)
        val welcome = TextView(this).apply {
            text = "Your shifts,\nyour team."
            textSize = 30f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.rgb(11, 58, 47))
            setPadding(0, dp(9), 0, dp(13))
        }
        setup.addView(welcome)
        val instructions = TextView(this).apply {
            text = "Enter your restaurant's PayMyDine address to open My Work. Only when you tap Start or Finish Shift will the app request precise GPS. Your manager handles attendance, requests and team activity in Shifts."
            textSize = 14f
            setTextColor(Color.rgb(71, 99, 92))
            setPadding(0, 0, 0, dp(24))
        }
        setup.addView(instructions)
        val hostInput = EditText(this).apply {
            hint = "tomo.paymydine.com"
            setSingleLine(true)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setTextColor(Color.rgb(12, 54, 44))
            setText(preferences.getString("host", "") ?: "")
            setPadding(dp(16), 0, dp(16), 0)
            background = rounded(Color.WHITE, dp(15), Color.rgb(188, 217, 210))
        }
        setup.addView(hostInput, LinearLayout.LayoutParams(-1, dp(56)))
        alert = TextView(this).apply {
            textSize = 12f
            setTextColor(Color.rgb(165, 54, 43))
            setPadding(0, dp(9), 0, dp(8))
            visibility = View.GONE
        }
        setup.addView(alert)
        val launch = Button(this).apply {
            text = "Open Staff Portal"
            isAllCaps = false
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.WHITE)
            background = rounded(Color.rgb(7, 106, 82), dp(15), 0)
            setOnClickListener {
                val host = normalizeHost(hostInput.text.toString())
                if (host == null) {
                    alert.text = "Use your *.paymydine.com restaurant address, without any path or port."
                    alert.visibility = View.VISIBLE
                } else {
                    alert.visibility = View.GONE
                    connect(host)
                }
            }
        }
        val launchParams = LinearLayout.LayoutParams(-1, dp(54)).apply { topMargin = dp(16) }
        setup.addView(launch, launchParams)
        root.addView(setup, LinearLayout.LayoutParams(-1, -2))

        browser = WebView(this).apply {
            visibility = View.GONE
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.setGeolocationEnabled(true)
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
                if (uri.scheme == "https" && isPmdHost(uri.host)) return false
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

        val saved = normalizeHost(preferences.getString("host", "") ?: "")
        if (saved != null) connect(saved) else showSetup()
    }

    private fun connect(host: String) {
        restaurantHost = host
        preferences.edit().putString("host", host).apply()
        setup.visibility = View.GONE
        browser.visibility = View.VISIBLE
        browser.loadUrl("https://$host/admin/login?destination=staff")
    }

    private fun showSetup() {
        pendingGeo?.invoke(pendingOrigin ?: "", false, false)
        pendingGeo = null
        pendingOrigin = null
        browser.stopLoading()
        browser.loadUrl("about:blank")
        restaurantHost = ""
        browser.visibility = View.GONE
        setup.visibility = View.VISIBLE
        progress.visibility = View.GONE
    }

    private fun normalizeHost(raw: String): String? {
        val candidate = raw.trim().lowercase(Locale.ROOT)
            .removePrefix("https://").trimEnd('/')
        return if (isPmdHost(candidate) && !candidate.contains('/') &&
            !candidate.contains(':') && !candidate.contains('?')) candidate else null
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
        pendingGeo?.invoke(pendingOrigin ?: "", false, false)
        pendingGeo = null
        browser.destroy()
        super.onDestroy()
    }
}
