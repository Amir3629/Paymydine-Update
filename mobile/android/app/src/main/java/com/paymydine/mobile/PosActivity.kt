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
import android.webkit.RenderProcessGoneDetail
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
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
 * PMD_ANDROID_POS_DEDICATED_ACTIVITY_V6
 *
 * Canonical POS runs in a plain Android view hierarchy instead of Compose
 * AndroidView. On affected tablets the Compose/WebView surface can remain blank
 * when the app starts directly in landscape even though the DOM is healthy.
 *
 * The dedicated activity is landscape-only for the POS surface, waits for a
 * focused/stable window before creating WebView, and keeps all renderer
 * recovery inside the Android view system.
 */
class PosActivity : ComponentActivity() {
    private lateinit var root: FrameLayout
    private lateinit var loading: TextView
    private var webView: WebView? = null
    private var windowFocusedOnce = false
    private var buildGeneration = 0
    private var canonicalReady = false

    private val app: PayMyDineApplication
        get() = application as PayMyDineApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val host = trustedHost()
        val token = app.credentials.deviceToken().orEmpty()
        if (host == null || token.isBlank()) {
            finish()
            return
        }

        root = FrameLayout(this).apply {
            setBackgroundColor(Color.rgb(244, 246, 248))
        }
        loading = TextView(this).apply {
            text = "Opening PayMyDine POS..."
            textSize = 18f
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(17, 24, 39))
            setBackgroundColor(Color.rgb(244, 246, 248))
        }

        root.addView(
            loading,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            ),
        )
        setContentView(root)

        // Do not construct WebView during Activity inflation. The window can
        // still report transitional dimensions at that point on Samsung
        // tablets. onWindowFocusChanged creates it after landscape is stable.
        root.postDelayed(
            {
                if (!windowFocusedOnce && webView == null && !isFinishing) {
                    createCanonicalWebView()
                }
            },
            700L,
        )
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus || isFinishing) return

        windowFocusedOnce = true
        if (webView == null) {
            root.postDelayed(
                {
                    if (webView == null && !isFinishing) {
                        createCanonicalWebView()
                    }
                },
                220L,
            )
        } else {
            synchronizeViewport(webView ?: return)
        }
    }

    override fun onResume() {
        super.onResume()
        webView?.onResume()
        webView?.resumeTimers()
        webView?.let(::synchronizeViewport)
    }

    override fun onPause() {
        webView?.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        destroyWebView()
        super.onDestroy()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createCanonicalWebView() {
        if (isFinishing || isDestroyed) return

        val host = trustedHost() ?: run {
            finish()
            return
        }
        val token = app.credentials.deviceToken().orEmpty()
        if (token.isBlank()) {
            finish()
            return
        }

        destroyWebView()
        canonicalReady = false
        buildGeneration += 1
        val generation = buildGeneration

        val view = WebView(this).apply {
            setBackgroundColor(Color.rgb(244, 246, 248))
            setLayerType(View.LAYER_TYPE_NONE, null)
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false

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
                    userAgentString + " PayMyDine-Android-POS/" + BuildConfig.VERSION_NAME
                safeBrowsingEnabled = true
            }

            val cookieManager = CookieManager.getInstance()
            cookieManager.setAcceptCookie(true)
            cookieManager.setAcceptThirdPartyCookies(this, true)

            webChromeClient = object : WebChromeClient() {
                override fun onCreateWindow(
                    parent: WebView,
                    isDialog: Boolean,
                    isUserGesture: Boolean,
                    resultMsg: android.os.Message,
                ): Boolean {
                    val popup = WebView(parent.context)
                    popup.webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            child: WebView,
                            request: WebResourceRequest,
                        ): Boolean {
                            val uri = request.url
                            child.stopLoading()
                            child.destroy()

                            if (
                                uri.scheme.equals("https", true) &&
                                uri.host.equals(host, true)
                            ) {
                                parent.loadUrl(uri.toString())
                            } else {
                                runCatching {
                                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                                }
                            }
                            return true
                        }
                    }

                    val transport =
                        resultMsg.obj as? WebView.WebViewTransport ?: return false
                    transport.webView = popup
                    resultMsg.sendToTarget()
                    return true
                }
            }

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
                            openCanonicalPos(current, host, token)
                            return true
                        }
                        return false
                    }

                    runCatching {
                        startActivity(Intent(Intent.ACTION_VIEW, uri))
                    }
                    return true
                }

                override fun onPageCommitVisible(current: WebView, url: String) {
                    if (isCanonicalPos(url, host)) {
                        synchronizeViewport(current)
                    }
                }

                override fun onPageFinished(current: WebView, url: String) {
                    if (generation != buildGeneration || current !== webView) {
                        return
                    }
                    if (!isCanonicalPos(url, host)) {
                        return
                    }

                    synchronizeViewport(current)
                    current.evaluateJavascript(
                        """
                        (function(){
                          var root = document.getElementById('pmd-quick-pos');
                          if (!root) return 'missing';
                          var r = root.getBoundingClientRect();
                          return JSON.stringify({
                            ok: true,
                            width: Math.round(r.width),
                            height: Math.round(r.height),
                            innerWidth: window.innerWidth || 0,
                            innerHeight: window.innerHeight || 0
                          });
                        })()
                        """.trimIndent(),
                    ) { result ->
                        if (
                            generation != buildGeneration ||
                            current !== webView ||
                            !result.contains("\\\"ok\\\":true")
                        ) {
                            showFatal("PayMyDine POS loaded but did not render.")
                            return@evaluateJavascript
                        }

                        canonicalReady = true
                        current.clearHistory()
                        revealWebView(current)

                        // PMD_ANDROID_POS_SURFACE_PULSE_V6
                        // Force one real Android surface visibility transition
                        // after canonical DOM readiness. This reproduces the
                        // surface invalidation that a physical rotation was
                        // previously required to trigger.
                        current.postDelayed(
                            {
                                if (
                                    canonicalReady &&
                                    current === webView &&
                                    !isFinishing
                                ) {
                                    current.visibility = View.INVISIBLE
                                    current.post {
                                        current.visibility = View.VISIBLE
                                        current.requestLayout()
                                        current.invalidate()
                                        synchronizeViewport(current)
                                    }
                                }
                            },
                            120L,
                        )
                    }
                }

                override fun onReceivedError(
                    current: WebView,
                    request: WebResourceRequest,
                    error: WebResourceError,
                ) {
                    if (request.isForMainFrame) {
                        showFatal("PayMyDine POS could not be loaded. Check the connection and retry.")
                    }
                }

                override fun onReceivedHttpError(
                    current: WebView,
                    request: WebResourceRequest,
                    response: WebResourceResponse,
                ) {
                    if (request.isForMainFrame && response.statusCode >= 400) {
                        showFatal(
                            if (response.statusCode == 401 || response.statusCode == 403) {
                                "This paired device is no longer authorized for POS."
                            } else {
                                "PayMyDine POS returned HTTP ${response.statusCode}."
                            },
                        )
                    }
                }

                override fun onReceivedSslError(
                    current: WebView,
                    handler: SslErrorHandler,
                    error: android.net.http.SslError,
                ) {
                    handler.cancel()
                    showFatal("The secure connection to PayMyDine could not be verified.")
                }

                override fun onRenderProcessGone(
                    current: WebView,
                    detail: RenderProcessGoneDetail,
                ): Boolean {
                    if (current === webView) {
                        root.postDelayed(
                            {
                                if (!isFinishing) {
                                    createCanonicalWebView()
                                }
                            },
                            250L,
                        )
                    }
                    return true
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
        loading.bringToFront()
        loading.visibility = View.VISIBLE

        view.addOnLayoutChangeListener {
                changed,
                left,
                top,
                right,
                bottom,
                oldLeft,
                oldTop,
                oldRight,
                oldBottom,
            ->
            if (
                changed === webView &&
                (
                    right - left != oldRight - oldLeft ||
                        bottom - top != oldBottom - oldTop
                )
            ) {
                synchronizeViewport(changed)
            }
        }

        view.post {
            openCanonicalPos(view, host, token)
        }
    }

    private fun revealWebView(view: WebView) {
        view.visibility = View.VISIBLE
        view.requestLayout()
        view.invalidate()
        loading.visibility = View.GONE
    }

    private fun showFatal(message: String) {
        canonicalReady = false
        loading.text = "$message\n\nTap to retry."
        loading.visibility = View.VISIBLE
        loading.setOnClickListener {
            loading.setOnClickListener(null)
            loading.text = "Opening PayMyDine POS..."
            createCanonicalWebView()
        }
        loading.bringToFront()
    }

    private fun synchronizeViewport(view: WebView) {
        if (view !== webView || isFinishing) return

        view.post {
            if (view !== webView || isFinishing) return@post

            val nativeWidth = view.width.coerceAtLeast(1)
            val nativeHeight = view.height.coerceAtLeast(1)
            view.evaluateJavascript(
                """
                (function(){
                  var w = ${nativeWidth};
                  var h = ${nativeHeight};

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
                    root.style.width = '100%';
                    root.style.height = h + 'px';
                    root.style.minHeight = h + 'px';
                    root.style.maxHeight = h + 'px';
                    root.style.minWidth = '0';
                    root.style.display = 'grid';
                    void root.offsetWidth;
                    void root.offsetHeight;
                  }

                  window.dispatchEvent(new Event('resize'));
                  window.dispatchEvent(new Event('orientationchange'));
                  if (window.visualViewport) {
                    try {
                      window.visualViewport.dispatchEvent(new Event('resize'));
                    } catch (e) {}
                  }
                  return true;
                })()
                """.trimIndent(),
                null,
            )
            view.requestLayout()
            view.invalidate()
        }
    }

    private fun openCanonicalPos(
        view: WebView,
        host: String,
        token: String,
    ) {
        loading.text = "Opening PayMyDine POS..."
        loading.visibility = View.VISIBLE
        loading.bringToFront()

        view.loadUrl(
            "https://$host/admin/mobile/pos/open",
            mapOf(
                "Authorization" to "Bearer $token",
                "X-PayMyDine-Android-POS" to "1",
            ),
        )
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

    private fun isCanonicalPos(url: String, host: String): Boolean {
        val parsed = runCatching { URI(url) }.getOrNull() ?: return false
        return parsed.host.equals(host, ignoreCase = true) &&
            parsed.path?.startsWith("/admin/pos") == true
    }

    private fun destroyWebView() {
        val current = webView ?: return
        webView = null
        canonicalReady = false
        root.removeView(current)
        current.stopLoading()
        current.loadUrl("about:blank")
        current.removeAllViews()
        current.destroy()
    }
}
