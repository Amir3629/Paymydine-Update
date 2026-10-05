package com.paymydine.mobile

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.paymydine.mobile.kiosk.KioskBootstrapWarmCache
import com.paymydine.mobile.kiosk.KioskProfile
import java.io.ByteArrayInputStream
import java.util.UUID

/**
 * PMD_KIOSK_DEDICATED_WEB_ACTIVITY_V58
 * PMD_KIOSK_FAST_WEBVIEW_V10
 * PMD_KIOSK_PREMIUM_UI_V11
 * PMD_KIOSK_INSTANT_MENU_V12
 * PMD_KIOSK_RENDER_FALLBACK_V10
 * PMD_KIOSK_HARDWARE_SCROLL_V13
 *
 * Kiosk menu intentionally uses a classic Android view hierarchy instead of a
 * Compose AndroidView. V13 is hardware accelerated on both physical devices
 * and the Android emulator. Software rendering is now a crash fallback only;
 * forcing software on every emulator made touch scrolling visibly laggy.
 */
class KioskMenuActivity : ComponentActivity() {
    private lateinit var root: LinearLayout
    private lateinit var webContainer: FrameLayout
    private lateinit var loadingView: TextView

    private var webView: WebView? = null
    private var windowFocusedOnce = false
    private var pageReady = false

    private val mainHandler = Handler(Looper.getMainLooper())
    private val sessionNonce = UUID.randomUUID().toString()
    private val bridgeSecret = UUID.randomUUID().toString()

    private var useSoftwareRendererFallback = false

    private val menuUrl: String by lazy {
        intent.getStringExtra(EXTRA_MENU_URL).orEmpty().trimEnd('/')
    }
    private val serviceMode: String by lazy {
        intent.getStringExtra(EXTRA_SERVICE_MODE)
            ?.takeIf { it == "pickup" }
            ?: "eat_in"
    }
    private val restaurantName: String by lazy {
        intent.getStringExtra(EXTRA_RESTAURANT_NAME).orEmpty().ifBlank { "PayMyDine" }
    }
    private val restaurantLogo: String by lazy {
        intent.getStringExtra(EXTRA_RESTAURANT_LOGO).orEmpty()
    }
    private val heroImage: String by lazy {
        intent.getStringExtra(EXTRA_HERO_IMAGE).orEmpty()
    }
    private val surfaceColor: Int by lazy {
        parseColor(intent.getStringExtra(EXTRA_SURFACE), Color.rgb(244, 246, 248))
    }
    private val textColor: Int by lazy {
        parseColor(intent.getStringExtra(EXTRA_TEXT), Color.rgb(23, 33, 43))
    }
    private val accentColor: Int by lazy {
        parseColor(intent.getStringExtra(EXTRA_ACCENT), Color.rgb(10, 107, 87))
    }
    private val idleTimeoutMs: Long by lazy {
        intent.getLongExtra(EXTRA_IDLE_TIMEOUT_SECONDS, 120L)
            .coerceIn(45L, 600L) * 1_000L
    }

    private val idleRunnable = Runnable {
        if (!isFinishing) {
            finishWithoutTransition()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        enterKioskMode()
        buildNativeShell()

        // PMD_KIOSK_INSTANT_MENU_V12
        // WebView does not need to wait for a measured container. Attach and
        // navigate immediately so the guest never sees an intermediate page.
        createCanonicalKioskWebView()
        resetIdleTimer()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus || isFinishing) return

        windowFocusedOnce = true
        if (webView == null) {
            root.post {
                if (webView == null && !isFinishing) {
                    createWebViewWhenReady()
                }
            }
        } else {
            webView?.let(::synchronizeVisibleFrame)
        }
    }

    override fun onResume() {
        super.onResume()
        enterKioskMode()
        webView?.onResume()
        webView?.resumeTimers()
        webView?.let(::synchronizeVisibleFrame)
        resetIdleTimer()
    }

    override fun onPause() {
        mainHandler.removeCallbacks(idleRunnable)
        webView?.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        mainHandler.removeCallbacksAndMessages(null)
        destroyWebView()
        super.onDestroy()
    }

    private fun enterKioskMode() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    private fun buildNativeShell() {
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(surfaceColor)
        }

        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), 0, dp(12), 0)
            setBackgroundColor(surfaceColor)
        }

        val startOver = TextView(this).apply {
            text = "← Start over"
            setTextColor(accentColor)
            textSize = 16f
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), 0, dp(12), 0)
            setOnClickListener { finishWithoutTransition() }
        }

        val mode = TextView(this).apply {
            text = if (serviceMode == "pickup") "TAKE AWAY" else "EAT HERE"
            setTextColor(textColor)
            textSize = 12f
            gravity = Gravity.CENTER
            letterSpacing = 0.08f
        }

        val spacer = View(this)

        header.addView(
            startOver,
            LinearLayout.LayoutParams(0, dp(56), 1f),
        )
        header.addView(
            mode,
            LinearLayout.LayoutParams(0, dp(56), 1f),
        )
        header.addView(
            spacer,
            LinearLayout.LayoutParams(0, dp(56), 1f),
        )

        webContainer = FrameLayout(this).apply {
            setBackgroundColor(surfaceColor)
        }

        // Error-only overlay. V12 deliberately has no "Opening menu" screen.
        loadingView = TextView(this).apply {
            text = ""
            textSize = 15f
            gravity = Gravity.CENTER
            setTextColor(textColor)
            setBackgroundColor(surfaceColor)
            visibility = View.GONE
            setPadding(dp(28), dp(28), dp(28), dp(28))
        }

        webContainer.addView(
            loadingView,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            ),
        )

        root.addView(
            header,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(56),
            ),
        )
        root.addView(
            webContainer,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f,
            ),
        )

        setContentView(root)
    }

    private fun createWebViewWhenReady() {
        if (webView != null || isFinishing) return

        if (webContainer.width <= 0 || webContainer.height <= 0) {
            val observer = webContainer.viewTreeObserver
            val listener =
                object : ViewTreeObserver.OnGlobalLayoutListener {
                    override fun onGlobalLayout() {
                        if (webContainer.width <= 0 || webContainer.height <= 0) {
                            return
                        }
                        if (webContainer.viewTreeObserver.isAlive) {
                            webContainer.viewTreeObserver.removeOnGlobalLayoutListener(this)
                        }
                        webContainer.post { createCanonicalKioskWebView() }
                    }
                }
            observer.addOnGlobalLayoutListener(listener)
            return
        }

        createCanonicalKioskWebView()
    }

    @SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
    private fun createCanonicalKioskWebView() {
        if (webView != null || isFinishing) return

        val trustedHost =
            runCatching {
                Uri.parse(menuUrl).host?.lowercase().orEmpty()
            }.getOrDefault("")

        if (trustedHost.isBlank()) {
            showFatal("Kiosk restaurant URL is invalid.")
            return
        }

        pageReady = false

        val view = WebView(this).apply {
            setInitialScale(100)
            setBackgroundColor(surfaceColor)
            // PMD_KIOSK_RENDER_FALLBACK_V10
            // Hardware rendering keeps real kiosk devices fast. The software
            // path is retained only for emulator-like devices that previously
            // produced a blank Chromium surface.
            applyKioskRenderLayer(this)
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            isNestedScrollingEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = false
                allowContentAccess = false
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                cacheMode = WebSettings.LOAD_DEFAULT
                offscreenPreRaster = false
                useWideViewPort = true
                loadWithOverviewMode = false
                textZoom = 100
                builtInZoomControls = false
                displayZoomControls = false
                setSupportZoom(false)
                javaScriptCanOpenWindowsAutomatically = true
                setSupportMultipleWindows(true)
                mediaPlaybackRequiresUserGesture = false
                userAgentString =
                    userAgentString +
                        " PayMyDineKiosk/" +
                        BuildConfig.VERSION_NAME
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    safeBrowsingEnabled = true
                }
            }

            val cookies = CookieManager.getInstance()
            cookies.setAcceptCookie(true)
            cookies.setAcceptThirdPartyCookies(this, true)

            val bridge =
                KioskJavascriptBridge(
                    secret = bridgeSecret,
                    onOrderComplete = ::showComplete,
                )

            fun setBridgeEnabled(enabled: Boolean) {
                removeJavascriptInterface("PayMyDineKiosk")
                if (enabled) {
                    addJavascriptInterface(bridge, "PayMyDineKiosk")
                }
            }

            setBridgeEnabled(true)

            webChromeClient = WebChromeClient()
            webViewClient =
                object : WebViewClient() {
                    override fun onPageStarted(
                        view: WebView,
                        url: String?,
                        favicon: android.graphics.Bitmap?,
                    ) {
                        super.onPageStarted(view, url, favicon)
                        pageReady = false
                        val pageHost =
                            runCatching {
                                Uri.parse(url.orEmpty())
                                    .host
                                    ?.lowercase()
                                    .orEmpty()
                            }.getOrDefault("")
                        setBridgeEnabled(pageHost == trustedHost)
                    }

                    override fun shouldOverrideUrlLoading(
                        view: WebView,
                        request: WebResourceRequest,
                    ): Boolean {
                        val uri = request.url
                        val scheme = uri.scheme?.lowercase().orEmpty()
                        if (scheme == "https" || scheme == "about") {
                            return false
                        }
                        runCatching {
                            startActivity(Intent(Intent.ACTION_VIEW, uri))
                        }
                        return true
                    }

                    override fun shouldInterceptRequest(
                        view: WebView,
                        request: WebResourceRequest,
                    ): WebResourceResponse? {
                        val uri = request.url
                        val requestHost = uri.host?.lowercase().orEmpty()
                        if (
                            request.method.equals("GET", ignoreCase = true) &&
                            requestHost == trustedHost &&
                            uri.path == "/api/v1/frontend-bootstrap-batch-r1"
                        ) {
                            KioskBootstrapWarmCache.consume(menuUrl)?.let { body ->
                                return WebResourceResponse(
                                    "application/json",
                                    "UTF-8",
                                    ByteArrayInputStream(body.toByteArray(Charsets.UTF_8)),
                                )
                            }
                        }
                        return super.shouldInterceptRequest(view, request)
                    }

                    override fun onPageCommitVisible(
                        view: WebView,
                        url: String,
                    ) {
                        super.onPageCommitVisible(view, url)
                        synchronizeVisibleFrame(view)
                    }

                    override fun onPageFinished(
                        view: WebView,
                        url: String,
                    ) {
                        super.onPageFinished(view, url)

                        val pageHost =
                            runCatching {
                                Uri.parse(url)
                                    .host
                                    ?.lowercase()
                                    .orEmpty()
                            }.getOrDefault("")
                        if (pageHost != trustedHost) {
                            setBridgeEnabled(false)
                            return
                        }

                        setBridgeEnabled(true)
                        injectKioskGuestUi(view, bridgeSecret)
                        synchronizeVisibleFrame(view)

                        view.evaluateJavascript(
                            """
                            (function(){
                              return !!document.querySelector(
                                '[data-pmd-kiosk-terminal="blade-v8"]'
                              );
                            })()
                            """.trimIndent(),
                        ) { result ->
                            if (result == "true" && webView === view) {
                                pageReady = true
                                loadingView.visibility = View.GONE
                                presentReadyWebView(view)
                                synchronizeVisibleFrame(view)
                            } else {
                                loadingView.text =
                                    "The kiosk page loaded but did not render. Tap Start over and try again."
                            }
                        }
                    }

                    override fun onReceivedError(
                        view: WebView,
                        request: WebResourceRequest,
                        error: WebResourceError,
                    ) {
                        super.onReceivedError(view, request, error)
                        if (request.isForMainFrame) {
                            loadingView.visibility = View.VISIBLE
                            loadingView.text =
                                "Kiosk connection error. Tap Start over and try again."
                        }
                    }

                    override fun onRenderProcessGone(
                        view: WebView,
                        detail: RenderProcessGoneDetail,
                    ): Boolean {
                        if (webView === view) {
                            webContainer.removeView(view)
                            runCatching { view.destroy() }
                            webView = null
                            loadingView.visibility = View.GONE
                            loadingView.text = ""
                            // PMD_KIOSK_RENDER_FALLBACK_V13
                            // Hardware is the fast default. Only a real Chromium
                            // renderer death activates software for the retry.
                            useSoftwareRendererFallback = true
                            webContainer.post {
                                if (!isFinishing) createCanonicalKioskWebView()
                            }
                        }
                        return true
                    }
                }

            addOnLayoutChangeListener {
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
                val sizeChanged =
                    (right - left) != (oldRight - oldLeft) ||
                        (bottom - top) != (oldBottom - oldTop)
                if (sizeChanged && changed is WebView) {
                    synchronizeVisibleFrame(changed)
                }
            }

            setOnTouchListener { _, _ ->
                resetIdleTimer()
                false
            }
        }

        webView = view

        webContainer.addView(
            view,
            0,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            ),
        )

        // PMD_KIOSK_FAST_WEBVIEW_V10
        // Keep HTTP/WebView caches and cookies between kiosk orders. Session
        // isolation is handled by the per-order kiosk_session and sessionStorage.
        // Clearing all Chromium data here made every Dine In / Take Away tap a
        // full cold start.
        view.clearHistory()
        CookieManager.getInstance().flush()
        view.post {
            if (!isFinishing && webView === view) {
                view.loadUrl(buildTargetUrl())
            }
        }

        webContainer.postDelayed(
            {
                if (!pageReady && webView === view && !isFinishing) {
                    synchronizeVisibleFrame(view)
                }
            },
            1_200L,
        )
    }

    private fun presentReadyWebView(view: WebView) {
        if (webView !== view || isFinishing) return

        applyKioskRenderLayer(view)
        view.visibility = View.VISIBLE
        view.alpha = 1f
        view.bringToFront()
        view.requestLayout()
        view.invalidate()

        view.evaluateJavascript(
            """
            (function(){
              document.documentElement.style.visibility = 'visible';
              document.documentElement.style.opacity = '1';
              document.body.style.visibility = 'visible';
              document.body.style.opacity = '1';
              var app = document.getElementById('pmd-kiosk-app');
              if (app) {
                app.style.visibility = 'visible';
                app.style.opacity = '1';
              }
              return !!app;
            })()
            """.trimIndent(),
            null,
        )

        view.postDelayed(
            {
                if (webView === view && !isFinishing) {
                    view.requestLayout()
                    view.invalidate()
                }
            },
            120L,
        )
    }

    private fun synchronizeVisibleFrame(view: WebView) {
        view.post {
            if (webView !== view || isFinishing) return@post

            applyKioskRenderLayer(view)
            view.visibility = View.VISIBLE
            view.alpha = 1f

            val measuredWidth = view.width.coerceAtLeast(1)
            val measuredHeight = view.height.coerceAtLeast(1)

            // PMD_KIOSK_LIGHTWEIGHT_VIEWPORT_SYNC_V13
            // Do not force DOM reflow, dispatch synthetic resize events or
            // request visual-state callbacks during normal kiosk interaction.
            // Those operations were especially expensive in emulator WebView.
            view.evaluateJavascript(
                """
                (function(){
                  document.documentElement.style.setProperty(
                    '--pmd-android-viewport-width',
                    '${measuredWidth}px'
                  );
                  document.documentElement.style.setProperty(
                    '--pmd-android-viewport-height',
                    '${measuredHeight}px'
                  );
                  return true;
                })()
                """.trimIndent(),
                null,
            )
        }
    }

    private fun injectKioskGuestUi(
        view: WebView,
        secret: String,
    ) {
        val script =
            """
            (function () {
              document.documentElement.setAttribute('data-pmd-kiosk', '1');
              window.__PMD_KIOSK_BRIDGE_SECRET__ =
                __PMD_KIOSK_BRIDGE_SECRET__;
            })();
            """.trimIndent()
                .replace(
                    "__PMD_KIOSK_BRIDGE_SECRET__",
                    org.json.JSONObject.quote(secret),
                )
        view.evaluateJavascript(script, null)
    }

    private fun buildTargetUrl(): String {
        val base = menuUrl.trimEnd('/')
        return base +
            "/kiosk/?pmd_kiosk=1" +
            "&kiosk_order_type=" +
            Uri.encode(serviceMode) +
            "&kiosk_session=" +
            Uri.encode(sessionNonce) +
            "&kiosk_name=" +
            Uri.encode(restaurantName) +
            "&kiosk_logo=" +
            Uri.encode(restaurantLogo) +
            "&kiosk_bg=" +
            Uri.encode(intent.getStringExtra(EXTRA_BACKGROUND).orEmpty()) +
            "&kiosk_text=" +
            Uri.encode(intent.getStringExtra(EXTRA_TEXT).orEmpty()) +
            "&kiosk_muted=" +
            Uri.encode(intent.getStringExtra(EXTRA_MUTED).orEmpty()) +
            "&kiosk_accent=" +
            Uri.encode(intent.getStringExtra(EXTRA_ACCENT).orEmpty()) +
            "&kiosk_surface=" +
            Uri.encode(intent.getStringExtra(EXTRA_SURFACE).orEmpty()) +
            "&kiosk_hero=" +
            Uri.encode(heroImage)
    }

    private fun applyKioskRenderLayer(view: WebView) {
        view.setLayerType(
            if (useSoftwareRendererFallback) {
                View.LAYER_TYPE_SOFTWARE
            } else {
                View.LAYER_TYPE_HARDWARE
            },
            null,
        )
    }

    private fun resetIdleTimer() {
        mainHandler.removeCallbacks(idleRunnable)
        mainHandler.postDelayed(idleRunnable, idleTimeoutMs)
    }

    private fun showComplete(orderId: String) {
        runOnUiThread {
            destroyWebView()
            webContainer.removeAllViews()

            val complete = TextView(this).apply {
                text =
                    "Order received\\n\\n#" +
                        orderId.trim().ifBlank { "—" } +
                        "\\n\\nThank you"
                gravity = Gravity.CENTER
                textSize = 24f
                setTextColor(textColor)
                setBackgroundColor(Color.rgb(243, 245, 247))
            }
            webContainer.addView(
                complete,
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                ),
            )

            mainHandler.postDelayed(
                {
                    if (!isFinishing) finishWithoutTransition()
                },
                10_000L,
            )
        }
    }

    private fun showFatal(message: String) {
        loadingView.visibility = View.VISIBLE
        loadingView.text = message
    }

    // PMD_KIOSK_SEAMLESS_ACTIVITY_V10
    // The dedicated WebView activity remains isolated for blank-surface safety,
    // but it must feel like the same kiosk surface to the guest.
    private fun finishWithoutTransition() {
        finish()
        @Suppress("DEPRECATION")
        overridePendingTransition(0, 0)
    }

    private fun destroyWebView() {
        webView?.let { view ->
            webContainer.removeView(view)
            runCatching {
                // Keep visual/menu cache between kiosk sessions. Guest cart and
                // payment state live in sessionStorage and are still cleared.
                view.evaluateJavascript(
                    "try{sessionStorage.clear();}catch(e){}",
                    null,
                )
                view.removeJavascriptInterface("PayMyDineKiosk")
                view.stopLoading()
                view.loadUrl("about:blank")
                view.clearHistory()
                view.removeAllViews()
                view.destroy()
            }
        }
        webView = null
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    private fun parseColor(value: String?, fallback: Int): Int =
        runCatching {
            Color.parseColor(value?.trim().orEmpty())
        }.getOrDefault(fallback)

    private class KioskJavascriptBridge(
        private val secret: String,
        private val onOrderComplete: (String) -> Unit,
    ) {
        private val handler = Handler(Looper.getMainLooper())

        @JavascriptInterface
        fun orderComplete(
            orderId: String,
            providedSecret: String,
        ) {
            if (providedSecret.isBlank() || providedSecret != secret) {
                return
            }
            handler.post {
                onOrderComplete(orderId.trim())
            }
        }
    }

    companion object {
        private const val EXTRA_MENU_URL = "pmd.kiosk.menu_url"
        private const val EXTRA_SERVICE_MODE = "pmd.kiosk.service_mode"
        private const val EXTRA_RESTAURANT_NAME = "pmd.kiosk.restaurant_name"
        private const val EXTRA_RESTAURANT_LOGO = "pmd.kiosk.restaurant_logo"
        private const val EXTRA_HERO_IMAGE = "pmd.kiosk.hero_image"
        private const val EXTRA_BACKGROUND = "pmd.kiosk.background"
        private const val EXTRA_TEXT = "pmd.kiosk.text"
        private const val EXTRA_MUTED = "pmd.kiosk.muted"
        private const val EXTRA_ACCENT = "pmd.kiosk.accent"
        private const val EXTRA_SURFACE = "pmd.kiosk.surface"
        private const val EXTRA_IDLE_TIMEOUT_SECONDS = "pmd.kiosk.idle_timeout_seconds"

        fun intent(
            context: Context,
            profile: KioskProfile,
            serviceMode: String,
            heroImage: String = "",
        ): Intent =
            Intent(context, KioskMenuActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION)
                putExtra(EXTRA_MENU_URL, profile.menuUrl)
                putExtra(EXTRA_SERVICE_MODE, serviceMode)
                putExtra(EXTRA_RESTAURANT_NAME, profile.restaurantName)
                putExtra(EXTRA_RESTAURANT_LOGO, profile.restaurantLogoUrl)
                putExtra(EXTRA_HERO_IMAGE, heroImage)
                putExtra(EXTRA_BACKGROUND, profile.theme.background)
                putExtra(EXTRA_TEXT, profile.theme.text)
                putExtra(EXTRA_MUTED, profile.theme.muted)
                putExtra(EXTRA_ACCENT, profile.theme.accent)
                putExtra(EXTRA_SURFACE, profile.theme.surface)
                putExtra(
                    EXTRA_IDLE_TIMEOUT_SECONDS,
                    profile.idleTimeoutSeconds,
                )
            }
    }
}
