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
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import java.net.URI

/**
 * PMD_ANDROID_ROLE_WORKSPACE_ACTIVITY_V1
 *
 * Cloud workspaces without a native local-first implementation (Owner,
 * Manager, Accountant, Reservations, My Work, etc.) open the canonical web
 * workspace selected server-side from the authenticated role.
 */
class RoleWorkspaceActivity : ComponentActivity() {
    private lateinit var root: FrameLayout
    private lateinit var status: TextView
    private var webView: WebView? = null

    private val app: PayMyDineApplication
        get() = application as PayMyDineApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (!app.credentials.staffSessionValid()) {
            returnHome()
            return
        }

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
                "This PayMyDine workspace currently requires Cloud.\n\n" +
                    "POS and KDS can continue locally when a verified offline session is available.",
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
            returnHome()
            return
        }
        val token = app.credentials.deviceToken().orEmpty()
        if (token.isBlank()) {
            returnHome()
            return
        }

        val staff = app.credentials.staffSession()
        status.text = buildString {
            append("Opening PayMyDine")
            staff?.roleCode?.takeIf { it.isNotBlank() }?.let {
                append(" · ")
                append(it.removePrefix("pmd-"))
            }
            append("…")
        }
        status.visibility = View.VISIBLE

        val view = WebView(this).apply {
            setBackgroundColor(Color.WHITE)
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = false
                allowContentAccess = false
                javaScriptCanOpenWindowsAutomatically = false
                setSupportMultipleWindows(false)
                userAgentString =
                    userAgentString +
                        " PayMyDine-Android-Workspace/" +
                        BuildConfig.VERSION_NAME
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
                            val session = app.credentials.staffSession()
                            val canonicalSecurity =
                                session?.roleCode == "pmd-owner" ||
                                    session?.destination == "staff"

                            // PMD_ANDROID_CANONICAL_MFA_WEBVIEW_V12
                            // Owner and usernameportal both use the real
                            // /admin/login security continuation. Never recurse
                            // those pages into mobile workspace bootstrap.
                            if (canonicalSecurity) {
                                return false
                            }

                            app.credentials.clearStaffSession()
                            returnHome()
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
                        parsed?.path?.startsWith("/admin/") == true
                    ) {
                        val session = app.credentials.staffSession()
                        val canonicalSecurityLogin =
                            parsed.path == "/admin/login" &&
                                (
                                    session?.roleCode == "pmd-owner" ||
                                        session?.destination == "staff"
                                )

                        if (
                            parsed.path != "/admin/login" ||
                            canonicalSecurityLogin
                        ) {
                            current.visibility = View.VISIBLE
                            status.visibility = View.GONE
                        }
                    }
                }

                override fun onReceivedError(
                    current: WebView,
                    request: WebResourceRequest,
                    error: WebResourceError,
                ) {
                    if (request.isForMainFrame) {
                        showMessage(
                            "PayMyDine could not reach Cloud.\n\nTap to retry.",
                        )
                    }
                }

                override fun onReceivedHttpError(
                    current: WebView,
                    request: WebResourceRequest,
                    response: WebResourceResponse,
                ) {
                    if (!request.isForMainFrame || response.statusCode < 400) {
                        return
                    }

                    if (
                        response.statusCode == 401 ||
                        response.statusCode == 403
                    ) {
                        app.credentials.clearStaffSession()
                        showMessage(
                            "PayMyDine needs a fresh staff sign-in " +
                                "(HTTP ${response.statusCode}).\n\n" +
                                "Tap to return to Sign in.",
                            returnHome = true,
                        )
                    } else {
                        showMessage(
                            "PayMyDine returned HTTP " +
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
                        "The secure PayMyDine connection could not be verified.",
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

        // PMD_ANDROID_FRESH_ROLE_WEB_SESSION_V2
        CookieManager.getInstance().removeSessionCookies {
            CookieManager.getInstance().flush()
            view.post {
                if (view === webView && !isFinishing) {
                    openWorkspace(view, host, token)
                }
            }
        }
    }

    private fun openWorkspace(
        view: WebView,
        host: String,
        token: String,
    ) {
        val session = app.credentials.staffSession()
        val destination = session
            ?.destination
            ?.takeIf { it == "staff" || it == "workspace" }
            ?: "workspace"
        val surface = session
            ?.surface
            ?.takeIf { it == "reservations" }
            ?: "auto"

        view.loadUrl(
            "https://$host/admin/mobile/workspace/open" +
                "?surface=$surface&destination=$destination",
            buildMap {
                put("Authorization", "Bearer $token")
                put("X-PayMyDine-Android-Workspace", surface)
                app.credentials.staffSession()
                    ?.staffGrant
                    ?.takeIf { it.isNotBlank() }
                    ?.let { put("X-PayMyDine-Staff-Grant", it) }
            },
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
                returnHome()
            } else if (app.connectivity.online.value) {
                val host = trustedHost() ?: return@setOnClickListener
                val token = app.credentials.deviceToken().orEmpty()
                if (token.isBlank()) return@setOnClickListener
                webView?.let {
                    status.text = "Opening PayMyDine…"
                    openWorkspace(it, host, token)
                }
            }
        }
        status.bringToFront()
    }

    private fun returnHome() {
        startActivity(
            Intent(this, MainActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP,
                )
            },
        )
        finish()
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
