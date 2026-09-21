package com.paymydine.mobile.ui

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.webkit.CookieManager
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.paymydine.mobile.BuildConfig
import java.net.URI

/**
 * PMD_ANDROID_CANONICAL_POS_WEBVIEW_V1
 *
 * The Android app intentionally renders the canonical PayMyDine /admin/pos
 * instead of maintaining a second visual implementation. Authentication enters
 * through /admin/mobile/pos/open with the Keystore-backed device bearer token;
 * the token never appears in the URL or in JavaScript.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun PosWebView(
    tenantHost: String,
    deviceToken: String,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val normalizedHost = remember(tenantHost) {
        tenantHost.trim().lowercase()
    }
    val trustedHost = remember(normalizedHost) {
        normalizedHost.takeIf {
            it.endsWith(".paymydine.com") &&
                !it.contains('/') &&
                !it.contains(':') &&
                it.substringBefore(".paymydine.com").isNotBlank()
        }
    }

    var webView by remember { mutableStateOf<WebView?>(null) }
    var canGoBack by remember { mutableStateOf(false) }
    var fatalError by remember { mutableStateOf<String?>(null) }

    fun openPos(view: WebView) {
        val host = trustedHost
        if (host == null || deviceToken.isBlank()) {
            fatalError = "This PayMyDine device is not paired correctly."
            return
        }

        fatalError = null
        val url = "https://$host/admin/mobile/pos/open"
        view.loadUrl(
            url,
            mapOf(
                "Authorization" to "Bearer $deviceToken",
                "X-PayMyDine-Android-POS" to "1",
            ),
        )
    }

    BackHandler(enabled = canGoBack) {
        webView?.goBack()
    }

    DisposableEffect(Unit) {
        onDispose {
            webView?.apply {
                stopLoading()
                loadUrl("about:blank")
                removeAllViews()
                destroy()
            }
            webView = null
        }
    }

    Surface(modifier.fillMaxSize()) {
        Box(Modifier.fillMaxSize()) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { androidContext ->
                    WebView(androidContext).apply {
                        webView = this

                        val cookies = CookieManager.getInstance()
                        cookies.setAcceptCookie(true)
                        cookies.setAcceptThirdPartyCookies(this, true)

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
                            builtInZoomControls = false
                            displayZoomControls = false
                            javaScriptCanOpenWindowsAutomatically = false
                            mediaPlaybackRequiresUserGesture = false
                            userAgentString =
                                userAgentString +
                                    " PayMyDine-Android-POS/" +
                                    BuildConfig.VERSION_NAME
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                safeBrowsingEnabled = true
                            }
                        }

                        webChromeClient = WebChromeClient()
                        webViewClient = object : WebViewClient() {
                            override fun shouldOverrideUrlLoading(
                                view: WebView,
                                request: WebResourceRequest,
                            ): Boolean {
                                val uri = request.url
                                val scheme = uri.scheme?.lowercase().orEmpty()
                                val host = uri.host?.lowercase().orEmpty()
                                val path = uri.path.orEmpty()

                                if (
                                    scheme == "https" &&
                                    host == trustedHost
                                ) {
                                    if (path == "/admin/login") {
                                        openPos(view)
                                        return true
                                    }
                                    return false
                                }

                                runCatching {
                                    context.startActivity(
                                        Intent(Intent.ACTION_VIEW, uri),
                                    )
                                }
                                return true
                            }

                            override fun onPageFinished(
                                view: WebView,
                                url: String,
                            ) {
                                canGoBack = view.canGoBack()
                                val current = runCatching { URI(url) }.getOrNull()
                                if (
                                    current?.host?.equals(
                                        trustedHost,
                                        ignoreCase = true,
                                    ) == true &&
                                    current.path?.startsWith("/admin/pos") == true
                                ) {
                                    // Keep Android as a single-purpose POS
                                    // surface. The bearer bootstrap redirect
                                    // must not remain in the browser back stack.
                                    view.clearHistory()
                                    canGoBack = false
                                    fatalError = null
                                }
                            }

                            override fun onReceivedError(
                                view: WebView,
                                request: WebResourceRequest,
                                error: WebResourceError,
                            ) {
                                if (request.isForMainFrame) {
                                    fatalError =
                                        "PayMyDine POS could not be loaded. Check the connection and retry."
                                }
                            }

                            override fun onReceivedHttpError(
                                view: WebView,
                                request: WebResourceRequest,
                                errorResponse: WebResourceResponse,
                            ) {
                                if (
                                    request.isForMainFrame &&
                                    errorResponse.statusCode >= 400
                                ) {
                                    fatalError = when (errorResponse.statusCode) {
                                        401, 403 ->
                                            "This paired device is no longer authorized for POS."
                                        else ->
                                            "PayMyDine POS returned HTTP ${errorResponse.statusCode}."
                                    }
                                }
                            }

                            override fun onReceivedSslError(
                                view: WebView,
                                handler: SslErrorHandler,
                                error: android.net.http.SslError,
                            ) {
                                handler.cancel()
                                fatalError =
                                    "The secure connection to PayMyDine could not be verified."
                            }
                        }

                        openPos(this)
                    }
                },
            )

            fatalError?.let { message ->
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.surface,
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        androidx.compose.foundation.layout.Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                message,
                                style = MaterialTheme.typography.bodyLarge,
                            )
                            Button(
                                onClick = {
                                    webView?.let(::openPos)
                                },
                            ) {
                                Text("Retry POS")
                            }
                        }
                    }
                }
            }
        }
    }
}
