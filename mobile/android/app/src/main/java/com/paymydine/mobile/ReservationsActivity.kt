package com.paymydine.mobile

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.SslErrorHandler
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import java.net.URI

/**
 * PMD_ANDROID_RESERVATIONS_ACTIVITY_V1
 *
 * Reservations uses the canonical authenticated PayMyDine Cloud workspace.
 * Unlike POS/KDS, reservation mutations are not yet part of pmd-sync-v1, so the
 * Android app fails closed instead of pretending an offline booking succeeded.
 */
class ReservationsActivity : ComponentActivity() {
    private lateinit var root: FrameLayout
    private lateinit var status: TextView
    private var webView: WebView? = null

    private val app: PayMyDineApplication
        get() = application as PayMyDineApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        root = FrameLayout(this).apply {
            setBackgroundColor(Color.rgb(244, 248, 246))
        }
        status = TextView(this).apply {
            gravity = Gravity.CENTER
            textSize = 17f
            setTextColor(Color.rgb(6, 63, 54))
            setBackgroundColor(Color.rgb(244, 248, 246))
            setPadding(36, 36, 36, 36)
        }
        root.addView(
            status,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            ),
        )
        setContentView(root)

        if (!app.connectivity.online.value) {
            showMessage(
                "Reservations currently needs PayMyDine Cloud.\n\n" +
                    "Cashier / Waiter and KDS remain available locally.\n\n" +
                    "Tap to return to Workspaces.",
                returnHome = true,
            )
            return
        }

        createWebView()
    }

    override fun onDestroy() {
        webView?.let { current ->
            root.removeView(current)
            current.stopLoading()
            current.loadUrl("about:blank")
            current.removeAllViews()
            current.destroy()
        }
        webView = null
        super.onDestroy()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createWebView() {
        val host = trustedHost() ?: run {
            finish()
            return
        }
        val token = app.credentials.deviceToken().orEmpty()
        if (token.isBlank()) {
            finish()
            return
        }

        status.text = "Opening PayMyDine Reservations…"
        status.visibility = View.VISIBLE

        val view = WebView(this).apply {
            setBackgroundColor(Color.WHITE)
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = false
                allowContentAccess = false
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = false
                safeBrowsingEnabled = true
                userAgentString =
                    userAgentString + " PayMyDine-Android-Reservations/" + BuildConfig.VERSION_NAME
            }

            val cookieManager = CookieManager.getInstance()
            cookieManager.setAcceptCookie(true)
            cookieManager.setAcceptThirdPartyCookies(this, true)

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    current: WebView,
                    request: WebResourceRequest,
                ): Boolean {
                    val uri = request.url
                    val sameTenant =
                        uri.scheme.equals("https", true) &&
                            uri.host.equals(host, true)

                    if (sameTenant) {
                        if (uri.path == "/admin/login") {
                            openWorkspace(current, host, token)
                            return true
                        }
                        return false
                    }

                    runCatching {
                        startActivity(Intent(Intent.ACTION_VIEW, uri))
                    }
                    return true
                }

                override fun onPageFinished(current: WebView, url: String) {
                    val parsed = runCatching { URI(url) }.getOrNull()
                    if (
                        parsed?.host.equals(host, ignoreCase = true) &&
                        parsed?.path?.startsWith("/admin/reservations") == true
                    ) {
                        current.visibility = View.VISIBLE
                        status.visibility = View.GONE
                    }
                }

                override fun onReceivedError(
                    current: WebView,
                    request: WebResourceRequest,
                    error: WebResourceError,
                ) {
                    if (request.isForMainFrame) {
                        showMessage(
                            "PayMyDine Reservations could not reach Cloud.\n\n" +
                                "Tap to retry when internet is available.",
                        )
                    }
                }

                override fun onReceivedHttpError(
                    current: WebView,
                    request: WebResourceRequest,
                    response: WebResourceResponse,
                ) {
                    if (request.isForMainFrame && response.statusCode >= 400) {
                        showMessage(
                            "PayMyDine Reservations returned HTTP " +
                                response.statusCode +
                                ".\n\nTap to retry.",
                        )
                    }
                }

                override fun onReceivedSslError(
                    current: WebView,
                    handler: SslErrorHandler,
                    error: android.net.http.SslError,
                ) {
                    handler.cancel()
                    showMessage(
                        "The secure PayMyDine connection could not be verified.\n\n" +
                            "Tap to return to Workspaces.",
                        returnHome = true,
                    )
                }
            }
        }

        webView = view
        root.addView(
            view,
            0,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            ),
        )
        view.visibility = View.INVISIBLE
        openWorkspace(view, host, token)
    }

    private fun openWorkspace(
        view: WebView,
        host: String,
        token: String,
    ) {
        view.loadUrl(
            "https://$host/admin/mobile/workspace/open?surface=reservations",
            mapOf(
                "Authorization" to "Bearer $token",
                "X-PayMyDine-Android-Workspace" to "reservations",
            ),
        )
    }

    private fun showMessage(
        message: String,
        returnHome: Boolean = false,
    ) {
        webView?.visibility = View.INVISIBLE
        status.text = message
        status.visibility = View.VISIBLE
        status.setOnClickListener {
            if (returnHome) {
                finish()
            } else if (app.connectivity.online.value) {
                webView?.let {
                    val host = trustedHost() ?: return@setOnClickListener
                    openWorkspace(
                        it,
                        host,
                        app.credentials.deviceToken().orEmpty(),
                    )
                    status.text = "Opening PayMyDine Reservations…"
                }
            }
        }
        status.bringToFront()
    }

    private fun trustedHost(): String? {
        val host = app.credentials.tenantHost()
            ?.trim()
            ?.lowercase()
            .orEmpty()

        return host.takeIf {
            it.endsWith(".paymydine.com") &&
                !it.contains('/') &&
                !it.contains(':') &&
                it.substringBefore(".paymydine.com").isNotBlank()
        }
    }
}
