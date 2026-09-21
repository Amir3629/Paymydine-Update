package com.paymydine.mobile.ui

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.view.View
import android.view.ViewTreeObserver
import android.webkit.CookieManager
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.RenderProcessGoneDetail
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
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
    val configuration = LocalConfiguration.current
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
    var pageReady by remember { mutableStateOf(false) }
    var fatalError by remember { mutableStateOf<String?>(null) }

    fun openPos(view: WebView) {
        val host = trustedHost
        if (host == null || deviceToken.isBlank()) {
            fatalError = "This PayMyDine device is not paired correctly."
            return
        }

        pageReady = false
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

    // PMD_ANDROID_POS_LANDSCAPE_VIEWPORT_V5
    // Some tablet WebView builds report a usable DOM while CSS dynamic viewport
    // units are still stale during landscape startup. Use the actual WebView
    // viewport as an explicit native height authority and never switch layer
    // types during rotation.
    fun synchronizeVisibleFrame(
        view: WebView,
        onVisible: (() -> Unit)? = null,
    ) {
        view.post {
            view.setLayerType(View.LAYER_TYPE_NONE, null)
            view.requestLayout()
            view.invalidate()
            view.evaluateJavascript(
                """
                (function(){
                  var vv = window.visualViewport;
                  var w = Math.max(
                    1,
                    window.innerWidth || 0,
                    document.documentElement.clientWidth || 0,
                    vv ? Math.round(vv.width || 0) : 0
                  );
                  var h = Math.max(
                    1,
                    window.innerHeight || 0,
                    document.documentElement.clientHeight || 0,
                    vv ? Math.round(vv.height || 0) : 0
                  );

                  document.documentElement.style.setProperty(
                    '--pmd-android-viewport-width',
                    w + 'px'
                  );
                  document.documentElement.style.setProperty(
                    '--pmd-android-viewport-height',
                    h + 'px'
                  );

                  var root = document.getElementById('pmd-quick-pos');
                  if (root) {
                    root.style.height = h + 'px';
                    root.style.minHeight = h + 'px';
                    root.style.maxHeight = h + 'px';
                    root.style.width = '100%';
                    root.style.minWidth = '0';
                    root.style.display = 'grid';

                    var main = root.querySelector('.pmd-qpos-main');
                    if (main) {
                      main.style.height = '100%';
                      main.style.minHeight = '0';
                    }

                    void root.offsetWidth;
                    void root.offsetHeight;
                    root.getBoundingClientRect();
                  }

                  window.dispatchEvent(new Event('resize'));
                  window.dispatchEvent(new Event('orientationchange'));
                  if (vv) {
                    try {
                      vv.dispatchEvent(new Event('resize'));
                    } catch (e) {}
                  }

                  return JSON.stringify({
                    root: !!root,
                    width: w,
                    height: h,
                    rootHeight: root ? root.getBoundingClientRect().height : 0
                  });
                })()
                """.trimIndent(),
                null,
            )

            // VisualStateCallback remains a useful compositor hint, but it is
            // deliberately non-blocking. A Samsung/Chromium callback stall must
            // never keep the native loading surface over a valid POS DOM.
            var delivered = false
            fun deliverVisible() {
                if (delivered) return
                delivered = true
                view.requestLayout()
                view.invalidate()
                onVisible?.invoke()
            }

            view.postVisualStateCallback(
                System.nanoTime(),
                object : WebView.VisualStateCallback() {
                    override fun onComplete(requestId: Long) {
                        deliverVisible()
                    }
                },
            )
            view.postDelayed(
                {
                    deliverVisible()
                },
                450L,
            )
        }
    }

    fun openPosWhenLaidOut(view: WebView) {
        if (view.width > 0 && view.height > 0) {
            view.post { openPos(view) }
            return
        }

        val observer = view.viewTreeObserver
        val listener = object : ViewTreeObserver.OnGlobalLayoutListener {
            override fun onGlobalLayout() {
                if (view.width <= 0 || view.height <= 0) {
                    return
                }

                if (view.viewTreeObserver.isAlive) {
                    view.viewTreeObserver.removeOnGlobalLayoutListener(this)
                }
                view.post { openPos(view) }
            }
        }
        observer.addOnGlobalLayoutListener(listener)
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

    // PMD_ANDROID_POS_ORIENTATION_STABILITY_V3
    // MainActivity handles orientation/screen-size changes without destroying
    // the WebView. Re-measure and explicitly notify the canonical POS runtime
    // so landscape/portrait changes cannot leave a stale white compositor.
    LaunchedEffect(
        configuration.orientation,
        configuration.screenWidthDp,
        configuration.screenHeightDp,
    ) {
        val currentWebView = webView ?: return@LaunchedEffect
        synchronizeVisibleFrame(currentWebView)
    }

    Surface(modifier.fillMaxSize()) {
        Box(Modifier.fillMaxSize()) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { androidContext ->
                    WebView(androidContext).apply {
                        webView = this
                        // Keep the default compositor. Switching a live WebView
                        // between hardware/software layers during rotation can
                        // itself produce a blank texture on tablet Chromium.
                        setLayerType(View.LAYER_TYPE_NONE, null)
                        setBackgroundColor(android.graphics.Color.rgb(244, 246, 248))

                        addOnLayoutChangeListener {
                                view,
                                left,
                                top,
                                right,
                                bottom,
                                oldLeft,
                                oldTop,
                                oldRight,
                                oldBottom,
                            ->
                            val sizeChanged =
                                (right - left) != (oldRight - oldLeft) ||
                                    (bottom - top) != (oldBottom - oldTop)

                            if (sizeChanged && view is WebView) {
                                synchronizeVisibleFrame(view)
                            }
                        }

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
                            offscreenPreRaster = true
                            useWideViewPort = true
                            loadWithOverviewMode = false
                            builtInZoomControls = false
                            displayZoomControls = false
                            javaScriptCanOpenWindowsAutomatically = true
                            setSupportMultipleWindows(true)
                            mediaPlaybackRequiresUserGesture = false
                            userAgentString =
                                userAgentString +
                                    " PayMyDine-Android-POS/" +
                                    BuildConfig.VERSION_NAME
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                safeBrowsingEnabled = true
                            }
                        }

                        webChromeClient = object : WebChromeClient() {
                            override fun onCreateWindow(
                                view: WebView,
                                isDialog: Boolean,
                                isUserGesture: Boolean,
                                resultMsg: android.os.Message,
                            ): Boolean {
                                val popup = WebView(view.context)
                                popup.webViewClient = object : WebViewClient() {
                                    override fun shouldOverrideUrlLoading(
                                        child: WebView,
                                        request: WebResourceRequest,
                                    ): Boolean {
                                        val uri = request.url
                                        val sameTenant =
                                            uri.scheme.equals("https", true) &&
                                                uri.host.equals(
                                                    trustedHost,
                                                    true,
                                                )

                                        child.stopLoading()
                                        child.destroy()

                                        if (sameTenant) {
                                            view.loadUrl(uri.toString())
                                        } else {
                                            runCatching {
                                                context.startActivity(
                                                    Intent(
                                                        Intent.ACTION_VIEW,
                                                        uri,
                                                    ),
                                                )
                                            }
                                        }
                                        return true
                                    }
                                }

                                val transport =
                                    resultMsg.obj as? WebView.WebViewTransport
                                        ?: return false
                                transport.webView = popup
                                resultMsg.sendToTarget()
                                return true
                            }
                        }
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
                                val isCanonicalPos =
                                    current?.host?.equals(
                                        trustedHost,
                                        ignoreCase = true,
                                    ) == true &&
                                        current.path?.startsWith("/admin/pos") == true

                                if (!isCanonicalPos) {
                                    return
                                }

                                synchronizeVisibleFrame(view)

                                // PMD_ANDROID_POS_RENDER_PROBE_V2
                                // A 200 response is not enough: verify that the
                                // canonical POS DOM actually rendered before
                                // removing the loading surface. This prevents a
                                // silent all-white WebView on runtime failures.
                                view.evaluateJavascript(
                                    "(function(){return !!document.getElementById('pmd-quick-pos');})()",
                                ) { result ->
                                    if (result == "true") {
                                        // DOM presence is the readiness gate.
                                        // Do not let a compositor callback stall
                                        // leave an opaque native loading surface
                                        // over a valid landscape POS.
                                        if (webView === view) {
                                            view.clearHistory()
                                            canGoBack = false
                                            pageReady = true
                                            fatalError = null
                                        }
                                        synchronizeVisibleFrame(view)
                                    } else {
                                        pageReady = false
                                        fatalError =
                                            "PayMyDine POS loaded but did not render. Retry POS."
                                    }
                                }
                            }

                            override fun onPageCommitVisible(
                                view: WebView,
                                url: String,
                            ) {
                                val current = runCatching { URI(url) }.getOrNull()
                                val isCanonicalPos =
                                    current?.host?.equals(
                                        trustedHost,
                                        ignoreCase = true,
                                    ) == true &&
                                        current.path?.startsWith("/admin/pos") == true

                                if (isCanonicalPos) {
                                    synchronizeVisibleFrame(view)
                                }
                            }

                            override fun onReceivedError(
                                view: WebView,
                                request: WebResourceRequest,
                                error: WebResourceError,
                            ) {
                                if (request.isForMainFrame) {
                                    pageReady = false
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
                                    pageReady = false
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
                                pageReady = false
                                fatalError =
                                    "The secure connection to PayMyDine could not be verified."
                            }

                            override fun onRenderProcessGone(
                                view: WebView,
                                detail: RenderProcessGoneDetail,
                            ): Boolean {
                                pageReady = false
                                fatalError =
                                    "PayMyDine POS renderer restarted. Tap Retry POS."
                                return true
                            }
                        }

                        openPosWhenLaidOut(this)
                    }
                },
                update = { view ->
                    synchronizeVisibleFrame(view)
                },
            )

            if (!pageReady && fatalError == null) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "Opening PayMyDine POS…",
                            style = MaterialTheme.typography.bodyLarge,
                        )
                    }
                }
            }

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
