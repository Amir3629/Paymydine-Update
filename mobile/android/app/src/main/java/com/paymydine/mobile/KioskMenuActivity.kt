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
import android.webkit.WebSettings
import android.webkit.WebStorage
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.paymydine.mobile.kiosk.KioskProfile
import java.util.UUID

/**
 * PMD_KIOSK_DEDICATED_WEB_ACTIVITY_V58
 * PMD_KIOSK_SOFTWARE_RENDER_V59
 *
 * Kiosk menu intentionally uses a classic Android view hierarchy instead of a
 * Compose AndroidView. V59 also forces the kiosk WebView onto Android's
 * software paint path. Some emulator/tablet WebView GPU surfaces report a
 * healthy DOM/page-finished state while compositing a visually blank surface.
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
            finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        enterKioskMode()
        buildNativeShell()

        root.postDelayed(
            {
                if (!windowFocusedOnce && webView == null && !isFinishing) {
                    createWebViewWhenReady()
                }
            },
            700L,
        )
        resetIdleTimer()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus || isFinishing) return

        windowFocusedOnce = true
        if (webView == null) {
            root.postDelayed(
                {
                    if (webView == null && !isFinishing) {
                        createWebViewWhenReady()
                    }
                },
                180L,
            )
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
            setOnClickListener { finish() }
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
            setBackgroundColor(Color.rgb(243, 245, 247))
        }

        loadingView = TextView(this).apply {
            text = "Opening menu…"
            textSize = 17f
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(64, 74, 84))
            setBackgroundColor(Color.rgb(243, 245, 247))
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
            setBackgroundColor(Color.rgb(243, 245, 247))
            // PMD_KIOSK_SOFTWARE_RENDER_V59
            // Bypass Chromium/GPU surface composition for the kiosk menu.
            // This is deliberately scoped to this dedicated activity only.
            setLayerType(View.LAYER_TYPE_SOFTWARE, null)
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
                            loadingView.visibility = View.VISIBLE
                            loadingView.text = "Restarting kiosk…"
                            webContainer.postDelayed(
                                { createWebViewWhenReady() },
                                250L,
                            )
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

        WebStorage.getInstance().deleteAllData()
        view.clearCache(true)
        view.clearHistory()

        val cookies = CookieManager.getInstance()
        cookies.removeAllCookies {
            cookies.flush()
            view.post {
                if (!isFinishing && webView === view) {
                    view.loadUrl(buildTargetUrl())
                }
            }
        }

        webContainer.postDelayed(
            {
                if (!pageReady && webView === view && !isFinishing) {
                    synchronizeVisibleFrame(view)
                    if (loadingView.visibility != View.GONE) {
                        loadingView.text = "Still opening menu…"
                    }
                }
            },
            2_500L,
        )
    }

    private fun presentReadyWebView(view: WebView) {
        if (webView !== view || isFinishing) return

        view.setLayerType(View.LAYER_TYPE_SOFTWARE, null)
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

            view.setLayerType(View.LAYER_TYPE_SOFTWARE, null)
            view.visibility = View.VISIBLE
            view.alpha = 1f
            view.requestLayout()
            view.invalidate()

            val measuredWidth = view.width.coerceAtLeast(1)
            val measuredHeight = view.height.coerceAtLeast(1)

            view.evaluateJavascript(
                """
                (function(){
                  var w = Math.max(
                    1,
                    $measuredWidth,
                    window.innerWidth || 0,
                    document.documentElement.clientWidth || 0
                  );
                  var h = Math.max(
                    1,
                    $measuredHeight,
                    window.innerHeight || 0,
                    document.documentElement.clientHeight || 0
                  );

                  document.documentElement.style.height = h + 'px';
                  document.body.style.height = h + 'px';
                  document.documentElement.style.setProperty(
                    '--pmd-android-viewport-width',
                    w + 'px'
                  );
                  document.documentElement.style.setProperty(
                    '--pmd-android-viewport-height',
                    h + 'px'
                  );

                  var app = document.getElementById('pmd-kiosk-app');
                  if (app) {
                    app.style.height = h + 'px';
                    app.style.minHeight = h + 'px';
                    app.style.maxHeight = h + 'px';
                    app.style.width = '100%';
                    app.style.minWidth = '0';

                    var workspace = app.querySelector('.pmd-kiosk-workspace');
                    var topbar = app.querySelector('.pmd-kiosk-topbar');
                    if (workspace) {
                      var topbarHeight = topbar
                        ? Math.round(topbar.getBoundingClientRect().height)
                        : 86;
                      workspace.style.height =
                        Math.max(1, h - topbarHeight) + 'px';
                    }

                    void app.offsetWidth;
                    void app.offsetHeight;
                    app.getBoundingClientRect();
                  }

                  window.dispatchEvent(new Event('resize'));
                  return JSON.stringify({
                    app: !!app,
                    width: w,
                    height: h,
                    appHeight: app ? app.getBoundingClientRect().height : 0
                  });
                })()
                """.trimIndent(),
                null,
            )

            view.postVisualStateCallback(
                System.nanoTime(),
                object : WebView.VisualStateCallback() {
                    override fun onComplete(requestId: Long) {
                        view.requestLayout()
                        view.invalidate()
                    }
                },
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
            Uri.encode(intent.getStringExtra(EXTRA_SURFACE).orEmpty())
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
                    if (!isFinishing) finish()
                },
                10_000L,
            )
        }
    }

    private fun showFatal(message: String) {
        loadingView.visibility = View.VISIBLE
        loadingView.text = message
    }

    private fun destroyWebView() {
        webView?.let { view ->
            webContainer.removeView(view)
            runCatching {
                view.evaluateJavascript(
                    "try{localStorage.clear();sessionStorage.clear();}catch(e){}",
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
        ): Intent =
            Intent(context, KioskMenuActivity::class.java).apply {
                putExtra(EXTRA_MENU_URL, profile.menuUrl)
                putExtra(EXTRA_SERVICE_MODE, serviceMode)
                putExtra(EXTRA_RESTAURANT_NAME, profile.restaurantName)
                putExtra(EXTRA_RESTAURANT_LOGO, profile.restaurantLogoUrl)
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
