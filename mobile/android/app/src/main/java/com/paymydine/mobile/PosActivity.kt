package com.paymydine.mobile

import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.res.Configuration
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
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import com.paymydine.mobile.hardware.customerdisplay.CustomerDisplayManager
import com.paymydine.mobile.hardware.customerdisplay.PosCustomerDisplayJavascriptBridge
import com.paymydine.mobile.network.MobileApiClient
import com.paymydine.mobile.sync.SyncEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.json.JSONTokener
import java.io.ByteArrayInputStream
import java.net.URI

/**
 * PMD_ANDROID_POS_DEDICATED_ACTIVITY_V6
 *
 * Canonical POS runs in a plain Android view hierarchy instead of Compose
 * AndroidView. On affected tablets the Compose/WebView surface can remain blank
 * when the app starts before the window has stable dimensions even though the
 * DOM is healthy.
 *
 * The dedicated activity preserves one WebView while the tablet rotates
 * between portrait and landscape, waits for a focused/stable window before
 * creating WebView, and keeps all renderer recovery inside Android views.
 */
class PosActivity : ComponentActivity() {
    private enum class TransportMode {
        CLOUD,
        LOCAL,
    }

    private lateinit var root: FrameLayout
    private lateinit var loading: TextView
    private var webView: WebView? = null
    private var windowFocusedOnce = false
    private var buildGeneration = 0
    private var canonicalReady = false
    private var transportMode = TransportMode.CLOUD
    private var localBridge: LocalPosBridge? = null
    private var loadedFromCachedShell = false
    private var snapshotWarmInFlight = false
    private var localReconnectRefreshInFlight = false
    private var localReconnectRefreshComplete = false
    private lateinit var customerDisplay: CustomerDisplayManager
    private lateinit var posShellCache: PosShellCache

    private val app: PayMyDineApplication
        get() = application as PayMyDineApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // PMD_ANDROID_POS_LIVE_ROTATION_V87
        // Reassert sensor ownership on every POS Activity instance. The vendor
        // task/window must not keep the orientation that was active at login.
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR

        // PMD_ZCS_CUSTOMER_DISPLAY_V5
        // One display manager belongs to one physical PayMyDine POS device.
        customerDisplay = CustomerDisplayManager(this)
        customerDisplay.showIdle()
        posShellCache = PosShellCache(this)

        // PMD_ANDROID_OFFLINE_POS_AUTHORITY_V12
        // PMD_ANDROID_POS_SESSION_CONTINUATION_V20
        // A still-valid local shift is authority for continuing this exact POS
        // activity even when the short Cloud lease has expired. Starting or
        // switching a staff identity still happens only through MainActivity.
        val cloudAuthorized = app.credentials.workspaceLeaseValid("pos")
        val localAuthorized =
            app.bootstrapRepository.hasBootstrap() &&
                app.credentials.offlineSessionValid("pos")
        val posAuthorized = cloudAuthorized || localAuthorized
        if (!posAuthorized) {
            startActivity(
                Intent(this, MainActivity::class.java).apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                            Intent.FLAG_ACTIVITY_SINGLE_TOP,
                    )
                },
            )
            finish()
            return
        }

        val host = trustedHost()
        val token = app.credentials.deviceToken().orEmpty()
        if (host == null || token.isBlank()) {
            finish()
            return
        }

        // PMD_ANDROID_POS_SYSTEM_INSETS_V8
        // Target SDK 36 uses edge-to-edge windows. Handle status/navigation
        // bars explicitly so the POS WebView's measured height is the usable
        // restaurant workspace, not the physical display including system UI.
        WindowCompat.setDecorFitsSystemWindows(window, false)

        root = FrameLayout(this).apply {
            setBackgroundColor(Color.rgb(244, 246, 248))
        }
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val safe = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or
                    WindowInsetsCompat.Type.displayCutout(),
            )
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom)
            webView?.post {
                webView?.let(::synchronizeViewport)
            }
            insets
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
        ViewCompat.requestApplyInsets(root)

        observeCloudAvailability()
        startLiveSyncLoop()
        SyncEngine.enqueueImmediate(app)
        if (app.connectivity.online.value) {
            warmLocalSnapshot(refreshUi = false)
        }

        // PMD_ANDROID_POS_SEAMLESS_FAILOVER_V17
        // V104 supersedes the old Cloud-first failover decision while preserving
        // the same no-navigation/no-logout seamless-session guarantee.
        // PMD_ANDROID_LOCAL_FIRST_V2_V104
        // Once this device has a valid bootstrap/session, SQLite is always the
        // cashier-facing authority. Cloud availability changes background sync,
        // never the active POS transport. This removes the CLOUD<->LOCAL race
        // from normal operation.
        if (localAuthorized) {
            enterLocalMode("Opening PayMyDine POS...")
        }

        // Do not construct WebView during Activity inflation. The window can
        // still report transitional dimensions at that point on Samsung
        // tablets. onWindowFocusChanged creates it after the window is stable.
        root.postDelayed(
            {
                if (
                    !windowFocusedOnce &&
                    webView == null &&
                    !isFinishing &&
                    transportMode == TransportMode.CLOUD
                ) {
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
        if (
            webView == null &&
            transportMode == TransportMode.CLOUD
        ) {
            root.postDelayed(
                {
                    if (
                        webView == null &&
                        !isFinishing &&
                        transportMode == TransportMode.CLOUD
                    ) {
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
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
        webView?.onResume()
        webView?.resumeTimers()
        webView?.let(::synchronizeViewport)
    }

    // PMD_ANDROID_POS_ROTATION_V19
    // Keep the same POS/WebView instance across tablet rotation so the active
    // cart, selected table and in-page state are not discarded. V86 listens
    // for the resize event emitted by synchronizeViewport() and switches the
    // canonical Quick POS layout between landscape and portrait immediately.
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR

        if (::root.isInitialized) {
            ViewCompat.requestApplyInsets(root)
        }

        webView?.let { current ->
            current.requestLayout()
            current.invalidate()
            current.post {
                synchronizeViewport(current)
            }
            current.postDelayed(
                {
                    synchronizeViewport(current)
                },
                80L,
            )
            current.postDelayed(
                {
                    synchronizeViewport(current)
                },
                320L,
            )
        }
    }

    override fun onPause() {
        webView?.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        destroyWebView()
        if (::customerDisplay.isInitialized) {
            customerDisplay.close()
        }
        super.onDestroy()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createCanonicalWebView() {
        if (isFinishing || isDestroyed) return
        if (!app.connectivity.online.value) {
            if (offlinePosAvailable()) {
                enterLocalMode(
                    "Internet connection is unavailable. Local POS is active.",
                )
            }
            return
        }

        transportMode = TransportMode.CLOUD
        loadedFromCachedShell = false

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

        val bridge = LocalPosBridge(
            activity = this,
            app = app,
            onTryCloud = { attemptReturnToCloud() },
            onWorkspaces = { finish() },
            // PMD_ANDROID_POS_REQUEST_FAILOVER_BINDING_V21
            // A failed Cloud request can promote this exact WebView to SQLite
            // before ConnectivityObserver reports the WAN transition.
            onRequireLocalTransport = {
                enterLocalMode("Opening PayMyDine POS...")
            },
        )
        localBridge = bridge

        val view = WebView(this).apply {
            // PMD_ANDROID_NORMAL_PAGE_SCALE_V100
            // Zero means use the platform's natural initial scale; do not force
            // the cashier page into an artificial zoomed-in/out presentation.
            setInitialScale(0)
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
                // PMD_ANDROID_NORMAL_PAGE_SCALE_V100
                // Keep the canonical POS at the WebView's natural device scale.
                textZoom = 100
                builtInZoomControls = false
                displayZoomControls = false
                javaScriptCanOpenWindowsAutomatically = true
                setSupportMultipleWindows(true)
                mediaPlaybackRequiresUserGesture = false
                userAgentString =
                    userAgentString + " PayMyDine-Android-POS/" + BuildConfig.VERSION_NAME
                safeBrowsingEnabled = true
            }

            // PMD_ZCS_CUSTOMER_DISPLAY_JS_BRIDGE_V5
            // Display-only bridge. No raw card/payment data is exposed here.
            addJavascriptInterface(
                PosCustomerDisplayJavascriptBridge(customerDisplay),
                "PayMyDineHardware",
            )
            addJavascriptInterface(
                bridge,
                "PayMyDineOffline",
            )

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
                override fun shouldInterceptRequest(
                    current: WebView,
                    request: WebResourceRequest,
                ): WebResourceResponse? {
                    offlineCachedImage(request.url)?.let { return it }
                    canonicalBundledAsset(request.url)?.let { return it }

                    if (transportMode == TransportMode.LOCAL) {
                        app.offlineImageCache
                            .cachedForUrl(request.url.toString())
                            ?.let { cached ->
                                return WebResourceResponse(
                                    cached.mime,
                                    null,
                                    ByteArrayInputStream(cached.bytes),
                                )
                            }
                    }

                    return super.shouldInterceptRequest(current, request)
                }

                override fun shouldOverrideUrlLoading(
                    current: WebView,
                    request: WebResourceRequest,
                ): Boolean {
                    val uri = request.url
                    val sameTenant =
                        uri.scheme.equals("https", true) &&
                            uri.host.equals(host, true)

                    if (sameTenant) {
                        if (uri.path == "/admin/logout") {
                            // PMD_ANDROID_NATIVE_SIGN_OUT_V22
                            // Sign out is device-local first so it also works
                            // with no WAN. End only the active staff/WebView
                            // session; the salted offline Login verifier remains
                            // available until its server-issued offline expiry.
                            app.credentials.clearWorkspaceLease("pos")
                            app.credentials.clearStaffSession()
                            CookieManager.getInstance().removeSessionCookies {
                                CookieManager.getInstance().flush()
                            }
                            startActivity(
                                Intent(
                                    this@PosActivity,
                                    MainActivity::class.java,
                                ).apply {
                                    addFlags(
                                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                            Intent.FLAG_ACTIVITY_SINGLE_TOP,
                                    )
                                },
                            )
                            finish()
                            return true
                        }

                        if (uri.path == "/admin/login") {
                            // PMD_ANDROID_POS_LOGIN_LOOP_GUARD_V10
                            // A redirect back to Login means the server did not
                            // create/accept the POS Admin session. Never recurse
                            // into /mobile/pos/open from the same WebView cookie.
                            // PMD_ANDROID_POS_LOGIN_REDIRECT_LOCAL_V20
                            // Losing the Cloud browser session must not terminate
                            // a still-valid local restaurant work session.
                            app.credentials.clearWorkspaceLease("pos")
                            if (offlinePosAvailable()) {
                                enterLocalMode("Opening PayMyDine POS...")
                                return true
                            }

                            app.credentials.clearStaffSession()
                            startActivity(
                                Intent(
                                    this@PosActivity,
                                    MainActivity::class.java,
                                ).apply {
                                    addFlags(
                                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                            Intent.FLAG_ACTIVITY_SINGLE_TOP,
                                    )
                                },
                            )
                            finish()
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
                        captureCanonicalShell(current)
                        revealWebView(current)
                        warmLocalSnapshot(refreshUi = false)

                        // PMD_ANDROID_LOCAL_FIRST_PROMOTION_V104
                        // A Cloud-rendered page is used only to seed the exact
                        // canonical shell. Once ready, keep the same DOM but
                        // route all POS reads/mutations through SQLite/outbox.
                        if (offlinePosAvailable()) {
                            enterLocalMode("Opening PayMyDine POS...")
                        }

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
                                    // PMD_ANDROID_POS_GEOMETRY_NUDGE_V7
                                    // requestLayout()/invalidate() were not
                                    // sufficient on the affected tablet. Force
                                    // a real one-pixel Android layout delta,
                                    // then restore MATCH_PARENT on the next
                                    // animation frame. This reproduces the
                                    // geometry change that physical rotation
                                    // used to provide.
                                    val width = root.width.coerceAtLeast(2)
                                    val height = root.height.coerceAtLeast(2)
                                    current.visibility = View.INVISIBLE
                                    current.layoutParams =
                                        FrameLayout.LayoutParams(
                                            width - 1,
                                            height - 1,
                                        )

                                    current.postOnAnimation {
                                        if (current !== webView || isFinishing) {
                                            return@postOnAnimation
                                        }
                                        current.layoutParams =
                                            FrameLayout.LayoutParams(
                                                ViewGroup.LayoutParams.MATCH_PARENT,
                                                ViewGroup.LayoutParams.MATCH_PARENT,
                                            )
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
                    // PMD_ANDROID_POS_RESOURCE_FAILOVER_V15
                    // Once Android reports WAN loss, a failed XHR/fetch/resource
                    // is enough to move to SQLite. Do not wait for a main-frame
                    // navigation error while the canonical POS is already open.
                    if (
                        !app.connectivity.online.value &&
                        offlinePosAvailable()
                    ) {
                        enterLocalMode(
                            "Cloud connection was lost. Local POS is active.",
                        )
                        return
                    }

                    if (!request.isForMainFrame) return

                    if (offlinePosAvailable()) {
                        enterLocalMode(
                            "Cloud connection was lost. Local POS is active.",
                        )
                    } else {
                        showFatal(
                            "PayMyDine POS could not be loaded. Check the connection and retry.",
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

                    when {
                        response.statusCode == 401 ||
                            response.statusCode == 403 -> {
                            // PMD_ANDROID_POS_AUTH_RECOVERY_V10
                            // 401/403 can mean staff grant, role, location or
                            // session authority. Do not mislabel every auth
                            // failure as device revocation.
                            // PMD_ANDROID_POS_PRESERVE_OFFLINE_SESSION_V20
                            // A Cloud web-session failure invalidates the Cloud
                            // lease only. Never erase the verified local shift.
                            app.credentials.clearWorkspaceLease("pos")

                            // PMD_ANDROID_POS_AUTH_LOCAL_FALLBACK_V20
                            // An expired/rejected Cloud WebView session is not a
                            // reason to interrupt a still-valid restaurant work
                            // session. Keep the cashier inside the same POS and
                            // move transport to the durable local snapshot.
                            if (offlinePosAvailable()) {
                                enterLocalMode("Opening PayMyDine POS...")
                                return
                            }

                            loading.text =
                                "PayMyDine needs a fresh staff sign-in " +
                                    "(HTTP ${response.statusCode}).\n\n" +
                                    "Tap to return to Sign in."
                            loading.visibility = View.VISIBLE
                            loading.setOnClickListener {
                                startActivity(
                                    Intent(
                                        this@PosActivity,
                                        MainActivity::class.java,
                                    ).apply {
                                        addFlags(
                                            Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                                Intent.FLAG_ACTIVITY_SINGLE_TOP,
                                        )
                                    },
                                )
                                finish()
                            }
                            loading.bringToFront()
                        }

                        response.statusCode >= 500 &&
                            offlinePosAvailable() ->
                            enterLocalMode(
                                "PayMyDine Cloud is temporarily unavailable. Local POS is active.",
                            )

                        else ->
                            showFatal(
                                "PayMyDine POS returned HTTP ${response.statusCode}.",
                            )
                    }
                }

                override fun onReceivedSslError(
                    current: WebView,
                    handler: SslErrorHandler,
                    error: android.net.http.SslError,
                ) {
                    handler.cancel()
                    if (offlinePosAvailable()) {
                        enterLocalMode(
                            "Secure Cloud connection could not be verified. Local POS is active.",
                        )
                    } else {
                        showFatal(
                            "The secure connection to PayMyDine could not be verified.",
                        )
                    }
                }

                override fun onRenderProcessGone(
                    current: WebView,
                    detail: RenderProcessGoneDetail,
                ): Boolean {
                    if (current === webView) {
                        root.postDelayed(
                            {
                                if (!isFinishing) {
                                    if (
                                        transportMode == TransportMode.LOCAL &&
                                        offlinePosAvailable()
                                    ) {
                                        createCachedCanonicalWebView(
                                            "Local POS is active.",
                                        )
                                    } else {
                                        createCanonicalWebView()
                                    }
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

        // PMD_ANDROID_FRESH_WEB_SESSION_V10
        // The native Staff Grant is the authority for a new WebView Admin
        // session. Remove only old session cookies so a previous cashier/owner
        // browser session cannot contaminate this bootstrap request.
        CookieManager.getInstance().removeSessionCookies {
            CookieManager.getInstance().flush()
            view.post {
                if (view === webView && !isFinishing) {
                    openCanonicalPos(view, host, token)
                }
            }
        }
    }

    private fun observeCloudAvailability() {
        lifecycleScope.launch {
            app.connectivity.online.collectLatest { online ->
                if (online) {
                    SyncEngine.enqueueImmediate(app)
                    if (transportMode == TransportMode.LOCAL) {
                        attemptReturnToCloud()
                    }
                    return@collectLatest
                }

                localReconnectRefreshComplete = false

                // PMD_ANDROID_POS_WIFI_CUT_FAILOVER_V17
                // NET_CAPABILITY_VALIDATED has fallen away. Swap transport in
                // this Activity before the Cloud DOM can expose fetch errors.
                if (offlinePosAvailable()) {
                    enterLocalMode(
                        "Internet connection is unavailable. Local POS is active.",
                    )
                }
            }
        }
    }

    private fun startLiveSyncLoop() {
        lifecycleScope.launch {
            while (isActive && !isFinishing) {
                if (app.connectivity.online.value) {
                    val before = app.syncRepository.outboxCount()
                    withContext(Dispatchers.IO) {
                        runCatching { SyncEngine(app).runOnce() }
                    }
                    val after = app.syncRepository.outboxCount()

                    if (
                        transportMode == TransportMode.LOCAL &&
                        after == 0 &&
                        !localReconnectRefreshComplete
                    ) {
                        attemptReturnToCloud()
                    } else if (
                        transportMode == TransportMode.LOCAL &&
                        after != before
                    ) {
                        // Event-driven only. Never repaint the POS every few
                        // seconds just because a timer fired.
                        refreshLocalWeb()
                    }
                }
                delay(5_000L)
            }
        }
    }

    private fun offlinePosAvailable(): Boolean =
        app.bootstrapRepository.hasBootstrap() &&
            app.credentials.offlineSessionValid("pos")

    private fun enterLocalMode(reason: String) {
        if (
            isFinishing ||
            isDestroyed ||
            !offlinePosAvailable()
        ) {
            return
        }

        if (transportMode == TransportMode.LOCAL) return
        transportMode = TransportMode.LOCAL
        localReconnectRefreshComplete = false

        val current = webView
        if (current != null && canonicalReady) {
            // PMD_ANDROID_CANONICAL_POS_IN_PLACE_FAILOVER_V18
            // Do not destroy/reload the browser. Keep the exact DOM, current
            // table, scroll position, cart and open modal; switch fetchJson's
            // authority inside that same canonical page.
            current.post {
                if (
                    current === webView &&
                    transportMode == TransportMode.LOCAL &&
                    !isFinishing
                ) {
                    current.evaluateJavascript(
                        """
                        (function(){
                          if (
                            window.PMDQuickPOSV1 &&
                            typeof window.PMDQuickPOSV1.setNativeOffline === 'function'
                          ) {
                            window.PMDQuickPOSV1.setNativeOffline(true);
                            return 'local';
                          }
                          return 'missing';
                        })()
                        """.trimIndent(),
                        null,
                    )
                    loading.visibility = View.GONE
                    current.visibility = View.VISIBLE
                }
            }
            return
        }

        createCachedCanonicalWebView(reason)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createCachedCanonicalWebView(reason: String) {
        if (
            isFinishing ||
            isDestroyed ||
            !offlinePosAvailable()
        ) {
            return
        }

        val shell = posShellCache.read()
        if (shell.isNullOrBlank()) {
            // PMD_ANDROID_LOCAL_FIRST_BOOTSTRAP_ESCAPE_V104
            // The only Cloud-rendered POS opening is first-time shell seeding.
            // If Cloud is available, seed/capture the canonical shell and then
            // immediately promote this same WebView to local transport.
            if (app.connectivity.isOnlineNow()) {
                transportMode = TransportMode.CLOUD
                createCanonicalWebView()
                return
            }

            canonicalReady = false
            loading.text =
                "PayMyDine POS needs one successful online opening " +
                    "to finish local setup."
            loading.visibility = View.VISIBLE
            loading.setOnClickListener(null)
            loading.bringToFront()
            return
        }

        val host = trustedHost() ?: return
        destroyWebView()
        transportMode = TransportMode.LOCAL
        loadedFromCachedShell = true
        canonicalReady = false
        buildGeneration += 1
        val generation = buildGeneration

        val bridge = LocalPosBridge(
            activity = this,
            app = app,
            onTryCloud = { attemptReturnToCloud() },
            onWorkspaces = { finish() },
            onRequireLocalTransport = {
                enterLocalMode("Opening PayMyDine POS...")
            },
            // PMD_ANDROID_LOCAL_UI_RESTORE_BARRIER_V18
            // Cached canonical HTML stays covered until SQLite/bootstrap/cart
            // restoration has actually completed inside V86.
            onLocalUiReady = {
                val restored = webView
                if (
                    restored != null &&
                    transportMode == TransportMode.LOCAL &&
                    loadedFromCachedShell &&
                    !isFinishing
                ) {
                    canonicalReady = true
                    synchronizeViewport(restored)
                    revealWebView(restored)
                }
            },
        )
        localBridge = bridge

        val view = WebView(this).apply {
            // PMD_ANDROID_NORMAL_PAGE_SCALE_V100
            // Zero means use the platform's natural initial scale; do not force
            // the cashier page into an artificial zoomed-in/out presentation.
            setInitialScale(0)
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
                cacheMode = WebSettings.LOAD_CACHE_ELSE_NETWORK
                offscreenPreRaster = true
                useWideViewPort = true
                loadWithOverviewMode = false
                // PMD_ANDROID_NORMAL_PAGE_SCALE_V100
                // Keep the canonical POS at the WebView's natural device scale.
                textZoom = 100
                builtInZoomControls = false
                displayZoomControls = false
                javaScriptCanOpenWindowsAutomatically = false
                setSupportMultipleWindows(false)
                userAgentString =
                    userAgentString + " PayMyDine-Android-POS/" + BuildConfig.VERSION_NAME
                safeBrowsingEnabled = true
            }

            addJavascriptInterface(bridge, "PayMyDineOffline")
            addJavascriptInterface(
                PosCustomerDisplayJavascriptBridge(customerDisplay),
                "PayMyDineHardware",
            )

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    current: WebView,
                    request: WebResourceRequest,
                ): WebResourceResponse? {
                    offlineCachedImage(request.url)?.let { return it }
                    canonicalBundledAsset(request.url)?.let { return it }

                    app.offlineImageCache
                        .cachedForUrl(request.url.toString())
                        ?.let { cached ->
                            return WebResourceResponse(
                                cached.mime,
                                null,
                                ByteArrayInputStream(cached.bytes),
                            )
                        }

                    return super.shouldInterceptRequest(current, request)
                }

                override fun shouldOverrideUrlLoading(
                    current: WebView,
                    request: WebResourceRequest,
                ): Boolean {
                    val uri = request.url
                    if (
                        uri.scheme.equals("https", true) &&
                        uri.host.equals(host, true)
                    ) {
                        return false
                    }
                    return true
                }

                override fun onPageFinished(
                    current: WebView,
                    url: String,
                ) {
                    if (
                        generation != buildGeneration ||
                        current !== webView
                    ) {
                        return
                    }

                    current.evaluateJavascript(
                        """
                        (function(){
                          window.__PMD_NATIVE_OFFLINE__ = true;
                          var api = window.PMDQuickPOSV1;
                          if (
                            api &&
                            typeof api.setNativeOffline === 'function'
                          ) {
                            api.setNativeOffline(true);
                            if (typeof api.refreshNativeState === 'function') {
                              api.refreshNativeState();
                            }
                            return 'ok';
                          }
                          return 'missing';
                        })()
                        """.trimIndent(),
                        null,
                    )
                    // PMD_ANDROID_LOCAL_UI_RESTORE_BARRIER_V18
                    // refreshNativeState() calls PayMyDineOffline.localUiReady()
                    // only after the local bootstrap + durable cart restore.
                    // Do not reveal this cached shell on a timer.
                    synchronizeViewport(current)
                }
            }

            loadDataWithBaseURL(
                "https://$host/admin/pos",
                prepareOfflineShell(shell),
                "text/html",
                "UTF-8",
                "https://$host/admin/pos",
            )
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
        // PMD_ANDROID_POS_NO_MODE_OVERLAY_V20
        // Local restore is the same POS launch. Do not display a separate
        // Cloud/offline transition message to the cashier.
        loading.text = "Opening PayMyDine POS..."
        loading.visibility = View.VISIBLE
        loading.bringToFront()
    }

    private fun refreshLocalWeb() {
        if (transportMode != TransportMode.LOCAL) return
        val current = webView ?: return
        current.post {
            if (
                current === webView &&
                transportMode == TransportMode.LOCAL
            ) {
                current.evaluateJavascript(
                    """
                    if (
                      window.PMDQuickPOSV1 &&
                      typeof window.PMDQuickPOSV1.refreshNativeState === 'function'
                    ) {
                      window.PMDQuickPOSV1.refreshNativeState();
                    }
                    """.trimIndent(),
                    null,
                )
            }
        }
    }

    // PMD_ANDROID_POS_SNAPSHOT_WARM_V20
    // The POS itself owns offline readiness. MainActivity does not need to stay
    // visible for menu/table/history/image snapshots to be current.
    private suspend fun refreshLocalSnapshotFromCloud(): Boolean =
        withContext(Dispatchers.IO) {
            val host = trustedHost() ?: return@withContext false
            val token = app.credentials.deviceToken().orEmpty()
            if (token.isBlank()) return@withContext false

            runCatching {
                val bootstrap = MobileApiClient().bootstrap(host, token)
                app.bootstrapRepository.apply(
                    bootstrap,
                    preserveCriticalOnEmpty = true,
                )
                app.bootstrapRepository.locationId()?.let { locationId ->
                    app.offlineImageCache.prefetch(
                        host,
                        app.localPosRepository.menu(locationId),
                    )
                }
                true
            }.getOrDefault(false)
        }

    private fun warmLocalSnapshot(refreshUi: Boolean) {
        if (
            snapshotWarmInFlight ||
            !app.connectivity.online.value ||
            isFinishing ||
            isDestroyed
        ) {
            return
        }

        snapshotWarmInFlight = true
        lifecycleScope.launch {
            val refreshed = refreshLocalSnapshotFromCloud()
            snapshotWarmInFlight = false
            if (
                refreshed &&
                refreshUi &&
                transportMode == TransportMode.LOCAL
            ) {
                refreshLocalWeb()
            }
        }
    }

    // PMD_ANDROID_POS_STICKY_LOCAL_V20
    // Once WAN loss moves the POS to SQLite, keep the exact canonical DOM and
    // local transport. Reconnect drains durable work and refreshes the trusted
    // snapshot/images in the background without destroying/reloading WebView.
    private fun attemptReturnToCloud() {
        if (
            isFinishing ||
            isDestroyed ||
            !app.connectivity.online.value ||
            transportMode != TransportMode.LOCAL ||
            localReconnectRefreshInFlight ||
            localReconnectRefreshComplete
        ) {
            return
        }

        localReconnectRefreshInFlight = true
        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                runCatching { SyncEngine(app).runOnce() }
            }

            if (
                !app.connectivity.online.value ||
                app.syncRepository.outboxCount() > 0
            ) {
                localReconnectRefreshInFlight = false
                return@launch
            }

            val refreshed = refreshLocalSnapshotFromCloud()
            localReconnectRefreshInFlight = false
            if (!app.connectivity.online.value) return@launch

            localReconnectRefreshComplete = refreshed
            transportMode = TransportMode.LOCAL
            if (refreshed) {
                refreshLocalWeb()
            }
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

    // PMD_ANDROID_POS_CSS_PIXEL_VIEWPORT_V8
    // Android View dimensions are physical pixels; CSS px inside WebView are
    // density/page-scale adjusted. V13 incorrectly copied view.height directly
    // into CSS px, making the POS root too tall on high-density tablets and
    // pushing Pay/Profile/table actions below the visible screen.
    private fun synchronizeViewport(view: WebView) {
        if (view !== webView || isFinishing) return

        view.post {
            if (view !== webView || isFinishing) return@post

            val nativeWidthPx = view.width.coerceAtLeast(1)
            val nativeHeightPx = view.height.coerceAtLeast(1)
            view.evaluateJavascript(
                """
                (function(){
                  var dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
                  var vv = window.visualViewport;
                  var doc = document.documentElement;

                  var nativeCssWidth = ${nativeWidthPx} / dpr;
                  var nativeCssHeight = ${nativeHeightPx} / dpr;
                  var innerWidth = Number(window.innerWidth) || 0;
                  var innerHeight = Number(window.innerHeight) || 0;
                  var clientWidth = Number(doc.clientWidth) || 0;
                  var clientHeight = Number(doc.clientHeight) || 0;
                  var visualWidth = vv ? (Number(vv.width) || 0) : 0;
                  var visualHeight = vv ? (Number(vv.height) || 0) : 0;

                  /* PMD_ANDROID_POS_VIEWPORT_ROTATION_V87
                   * The old "smallest of everything" rule could keep the
                   * previous portrait width/landscape height after rotation.
                   * Native WebView bounds are authoritative for orientation.
                   * visualViewport may reduce height only when its width still
                   * matches the current native orientation (for the IME). */
                  var w = Math.max(1, Math.round(nativeCssWidth));
                  var h = Math.max(1, Math.round(nativeCssHeight));
                  var widthTolerance = Math.max(32, nativeCssWidth * 0.18);
                  var visualMatchesNative =
                    visualWidth > 1 &&
                    Math.abs(visualWidth - nativeCssWidth) <= widthTolerance;
                  var innerMatchesNative =
                    innerWidth > 1 &&
                    Math.abs(innerWidth - nativeCssWidth) <= widthTolerance;

                  if (visualMatchesNative) {
                    w = Math.max(1, Math.round(visualWidth));
                    if (
                      visualHeight > 1 &&
                      visualHeight <= nativeCssHeight * 1.08
                    ) {
                      h = Math.max(1, Math.round(visualHeight));
                    }
                  } else if (innerMatchesNative) {
                    w = Math.max(1, Math.round(innerWidth));
                    if (
                      innerHeight > 1 &&
                      innerHeight <= nativeCssHeight * 1.08
                    ) {
                      h = Math.max(1, Math.round(innerHeight));
                    }
                  }

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
                    root.style.boxSizing = 'border-box';
                    void root.offsetWidth;
                    void root.offsetHeight;
                  }

                  window.dispatchEvent(new Event('resize'));
                  if (vv) {
                    try {
                      vv.dispatchEvent(new Event('resize'));
                    } catch (e) {}
                  }

                  return JSON.stringify({
                    width: w,
                    height: h,
                    dpr: dpr,
                    nativeWidthPx: ${nativeWidthPx},
                    nativeHeightPx: ${nativeHeightPx},
                    innerWidth: innerWidth,
                    innerHeight: innerHeight,
                    visualWidth: visualWidth,
                    visualHeight: visualHeight
                  });
                })()
                """.trimIndent(),
                null,
            )
            view.requestLayout()
            view.invalidate()
        }
    }

    private fun captureCanonicalShell(view: WebView) {
        if (view !== webView || !canonicalReady) return

        view.evaluateJavascript(
            """
            (function(){
              var root = document.getElementById('pmd-quick-pos');
              if (!root) return '';
              return document.documentElement.outerHTML || '';
            })()
            """.trimIndent(),
        ) { raw ->
            if (view !== webView || isFinishing) return@evaluateJavascript
            val html = runCatching {
                JSONTokener(raw).nextValue() as? String
            }.getOrNull().orEmpty()
            if (html.isNotBlank()) {
                runCatching { posShellCache.save(html) }
            }
        }
    }

    private fun prepareOfflineShell(html: String): String {
        val bootstrap = """
            <script>
            window.__PMD_NATIVE_OFFLINE__ = true;
            document.documentElement.classList.add('pmd-native-offline');
            </script>
        """.trimIndent()

        return when {
            html.contains("<head>") ->
                html.replaceFirst("<head>", "<head>$bootstrap")
            html.contains("<head ") -> {
                val end = html.indexOf('>', html.indexOf("<head "))
                if (end >= 0) {
                    html.substring(0, end + 1) +
                        bootstrap +
                        html.substring(end + 1)
                } else {
                    bootstrap + html
                }
            }
            else -> bootstrap + html
        }
    }

    // PMD_ANDROID_OFFLINE_IMAGE_ROUTE_V20
    private fun offlineCachedImage(uri: Uri): WebResourceResponse? {
        val prefix = "/__pmd_offline/image/"
        val path = uri.path.orEmpty()
        if (!path.startsWith(prefix)) return null

        val itemId = Uri.decode(path.removePrefix(prefix)).trim()
        if (itemId.isBlank() || itemId.contains('/')) return null

        val cached = app.offlineImageCache.cachedForItem(itemId) ?: return null
        return WebResourceResponse(
            cached.mime,
            null,
            ByteArrayInputStream(cached.bytes),
        )
    }

    /**
     * PMD_ANDROID_BUNDLED_CANONICAL_POS_UI_V18
     *
     * The Android package contains the exact Quick POS stylesheet/script files
     * from this source commit. Online and offline therefore execute the same
     * presentation/runtime files. Query strings are intentionally ignored.
     */
    private fun canonicalBundledAsset(uri: Uri): WebResourceResponse? {
        val asset = when (uri.path.orEmpty()) {
            "/app/admin/assets/css/pmd-floor-v1.css" ->
                "pmd-canonical/css/pmd-floor-v1.css" to "text/css"
            "/app/admin/assets/css/pmd-floor-v1-stable-v11.css" ->
                "pmd-canonical/css/pmd-floor-v1-stable-v11.css" to "text/css"
            "/app/admin/assets/css/pmd-floor-v1-native-smart-v20.css" ->
                "pmd-canonical/css/pmd-floor-v1-native-smart-v20.css" to "text/css"
            "/app/admin/assets/css/pmd-reservations2-floor-canvas-v310.css" ->
                "pmd-canonical/css/pmd-reservations2-floor-canvas-v310.css" to "text/css"
            "/app/admin/assets/css/pmd-reservations2-floor-toolbar-v316.css" ->
                "pmd-canonical/css/pmd-reservations2-floor-toolbar-v316.css" to "text/css"
            "/app/admin/assets/css/pmd-reservations2-floor-reservation-v312.css" ->
                "pmd-canonical/css/pmd-reservations2-floor-reservation-v312.css" to "text/css"
            "/app/admin/assets/css/pmd-dashboard-lab-exact-floor-v1.css" ->
                "pmd-canonical/css/pmd-dashboard-lab-exact-floor-v1.css" to "text/css"
            "/app/admin/assets/css/pmd-shared-floor-multi-floor-v1.css" ->
                "pmd-canonical/css/pmd-shared-floor-multi-floor-v1.css" to "text/css"
            "/app/admin/assets/css/push-notifications.css" ->
                "pmd-canonical/css/push-notifications.css" to "text/css"
            "/app/admin/assets/css/pmd-quick-pos-v1.css" ->
                "pmd-canonical/css/pmd-quick-pos-v1.css" to "text/css"
            "/app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js" ->
                "pmd-canonical/js/pmd-dashboard-lab-exact-floor-v1.js" to
                    "application/javascript"
            "/app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js" ->
                "pmd-canonical/js/pmd-shared-floor-multi-floor-v1.js" to
                    "application/javascript"
            "/app/admin/assets/js/push-notifications.js" ->
                "pmd-canonical/js/push-notifications.js" to
                    "application/javascript"
            "/app/admin/assets/js/pmd-quick-pos-v1.js" ->
                "pmd-canonical/js/pmd-quick-pos-v1.js" to
                    "application/javascript"
            "/app/admin/assets/js/pmd-site-access-hub-v13.js" ->
                "pmd-canonical/js/pmd-site-access-hub-v13.js" to
                    "application/javascript"
            "/app/admin/assets/images/pmd-favicon-final-20260822.svg" ->
                "pmd-canonical/images/pmd-favicon-final-20260822.svg" to
                    "image/svg+xml"
            else -> null
        } ?: return null

        return runCatching {
            WebResourceResponse(
                asset.second,
                if (asset.second.startsWith("image/")) null else "UTF-8",
                assets.open(asset.first),
            )
        }.getOrNull()
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
            buildMap {
                put("Authorization", "Bearer $token")
                put("X-PayMyDine-Android-POS", "1")
                app.credentials.staffSession()
                    ?.staffGrant
                    ?.takeIf { it.isNotBlank() }
                    ?.let { put("X-PayMyDine-Staff-Grant", it) }
            },
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
        localBridge = null
        runCatching {
            current.removeJavascriptInterface("PayMyDineOffline")
            current.removeJavascriptInterface("PayMyDineHardware")
        }
        root.removeView(current)
        current.stopLoading()
        current.loadUrl("about:blank")
        current.removeAllViews()
        current.destroy()
    }
}
