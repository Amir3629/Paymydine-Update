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
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import com.paymydine.mobile.hardware.customerdisplay.CustomerDisplayManager
import com.paymydine.mobile.hardware.customerdisplay.PosCustomerDisplayJavascriptBridge
import com.paymydine.mobile.sync.SyncEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.json.JSONTokener
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
    private enum class TransportMode {
        CLOUD,
        LOCAL,
        RECONNECTING,
    }

    private data class LocalUiSeed(
        val tableId: String? = null,
        val floorId: String? = null,
    )

    private lateinit var root: FrameLayout
    private lateinit var loading: TextView
    private var webView: WebView? = null
    private var windowFocusedOnce = false
    private var buildGeneration = 0
    private var canonicalReady = false
    private var transportMode = TransportMode.CLOUD
    private var localBridge: LocalPosBridge? = null
    private lateinit var customerDisplay: CustomerDisplayManager

    private val app: PayMyDineApplication
        get() = application as PayMyDineApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // PMD_ZCS_CUSTOMER_DISPLAY_V5
        // One display manager belongs to one physical PayMyDine POS device.
        customerDisplay = CustomerDisplayManager(this)
        customerDisplay.showIdle()

        // PMD_ANDROID_OFFLINE_POS_AUTHORITY_V12
        val posAuthorized = if (app.connectivity.online.value) {
            app.credentials.workspaceLeaseValid("pos")
        } else {
            app.bootstrapRepository.hasBootstrap() &&
                app.credentials.offlineSessionValid("pos")
        }
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

        // PMD_ANDROID_POS_SEAMLESS_FAILOVER_V17
        // Stay inside this exact Activity. A WAN cut changes only the transport
        // authority/WebView content; it never logs the staff member out and
        // never navigates through a separate "offline mode" screen.
        if (
            !app.connectivity.online.value &&
            offlinePosAvailable()
        ) {
            enterLocalMode(
                "Cloud is unavailable. Local POS is active.",
            )
        }

        // Do not construct WebView during Activity inflation. The window can
        // still report transitional dimensions at that point on Samsung
        // tablets. onWindowFocusChanged creates it after landscape is stable.
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
        localBridge = null

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

            // PMD_ZCS_CUSTOMER_DISPLAY_JS_BRIDGE_V5
            // Display-only bridge. No raw card/payment data is exposed here.
            addJavascriptInterface(
                PosCustomerDisplayJavascriptBridge(customerDisplay),
                "PayMyDineHardware",
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
                            // PMD_ANDROID_POS_LOGIN_LOOP_GUARD_V10
                            // A redirect back to Login means the server did not
                            // create/accept the POS Admin session. Never recurse
                            // into /mobile/pos/open from the same WebView cookie.
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
                            app.credentials.clearStaffSession()
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
                    withContext(Dispatchers.IO) {
                        runCatching { SyncEngine(app).runOnce() }
                    }

                    if (
                        transportMode == TransportMode.LOCAL &&
                        app.syncRepository.outboxCount() == 0
                    ) {
                        attemptReturnToCloud()
                    } else if (transportMode == TransportMode.LOCAL) {
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
            !offlinePosAvailable() ||
            transportMode == TransportMode.LOCAL
        ) {
            return
        }

        transportMode = TransportMode.LOCAL
        captureCloudUiState { seed ->
            if (
                !isFinishing &&
                !isDestroyed &&
                transportMode == TransportMode.LOCAL
            ) {
                createLocalWebView(seed, reason)
            }
        }
    }

    private fun captureCloudUiState(onCaptured: (LocalUiSeed) -> Unit) {
        val current = webView
        if (
            current == null ||
            !canonicalReady ||
            transportMode != TransportMode.LOCAL
        ) {
            onCaptured(LocalUiSeed())
            return
        }

        current.evaluateJavascript(
            """
            (function(){
              try {
                var api = window.PMDQuickPOSV1 || {};
                var state = api.state || {};
                return JSON.stringify({
                  table_id: state.selectedTable && state.selectedTable.id
                    ? String(state.selectedTable.id)
                    : '',
                  floor_id: state.activeFloorId
                    ? String(state.activeFloorId)
                    : ''
                });
              } catch (e) {
                return '{}';
              }
            })()
            """.trimIndent(),
        ) { raw ->
            val seed = runCatching {
                val decoded = JSONTokener(raw).nextValue() as? String
                    ?: return@runCatching LocalUiSeed()
                val json = JSONObject(decoded)
                LocalUiSeed(
                    tableId = json.optString("table_id")
                        .takeIf { it.isNotBlank() },
                    floorId = json.optString("floor_id")
                        .takeIf { it.isNotBlank() },
                )
            }.getOrDefault(LocalUiSeed())
            onCaptured(seed)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createLocalWebView(
        seed: LocalUiSeed,
        reason: String,
    ) {
        destroyWebView()
        transportMode = TransportMode.LOCAL
        buildGeneration += 1
        val generation = buildGeneration

        val bridge = LocalPosBridge(
            activity = this,
            app = app,
            initialSelectedTableId = seed.tableId,
            initialFloorId = seed.floorId,
            onTryCloud = { attemptReturnToCloud() },
            onWorkspaces = { finish() },
        )
        localBridge = bridge

        val view = WebView(this).apply {
            setBackgroundColor(Color.rgb(244, 246, 248))
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = false
                databaseEnabled = false
                allowFileAccess = true
                allowContentAccess = false
                blockNetworkLoads = true
                javaScriptCanOpenWindowsAutomatically = false
                setSupportMultipleWindows(false)
                useWideViewPort = true
                loadWithOverviewMode = false
            }
            addJavascriptInterface(bridge, "PayMyDineOffline")
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    current: WebView,
                    request: WebResourceRequest,
                ): Boolean = !request.url.toString()
                    .startsWith("file:///android_asset/")

                override fun onPageFinished(
                    current: WebView,
                    url: String,
                ) {
                    if (
                        generation != buildGeneration ||
                        current !== webView ||
                        !url.startsWith("file:///android_asset/")
                    ) {
                        return
                    }
                    canonicalReady = true
                    synchronizeViewport(current)
                    revealWebView(current)
                }
            }
            loadUrl("file:///android_asset/pmd-offline-pos.html")
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
        loading.text = reason
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
                    "if(window.pmdOfflineRefresh){window.pmdOfflineRefresh();}",
                    null,
                )
            }
        }
    }

    private fun attemptReturnToCloud() {
        if (
            isFinishing ||
            isDestroyed ||
            !app.connectivity.online.value ||
            transportMode != TransportMode.LOCAL
        ) {
            return
        }

        transportMode = TransportMode.RECONNECTING
        loading.text = "Syncing local work to PayMyDine Cloud..."
        loading.visibility = View.VISIBLE
        loading.bringToFront()

        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                runCatching { SyncEngine(app).runOnce() }
            }

            if (!app.connectivity.online.value) {
                transportMode = TransportMode.LOCAL
                loading.visibility = View.GONE
                refreshLocalWeb()
                return@launch
            }

            if (app.syncRepository.outboxCount() > 0) {
                // Keep serving the fully functional local surface until every
                // durable command has either reconciled or been explicitly
                // rejected. Do not hide unsynced restaurant work behind Cloud.
                transportMode = TransportMode.LOCAL
                loading.visibility = View.GONE
                refreshLocalWeb()
                return@launch
            }

            createCanonicalWebView()
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

                  function smallestPositive(values, fallback) {
                    var positive = values.filter(function(value) {
                      return Number.isFinite(value) && value > 1;
                    });
                    if (!positive.length) return Math.max(1, Math.round(fallback));
                    return Math.max(1, Math.round(Math.min.apply(Math, positive)));
                  }

                  var w = smallestPositive(
                    [visualWidth, innerWidth, clientWidth],
                    nativeCssWidth
                  );
                  var h = smallestPositive(
                    [visualHeight, innerHeight, clientHeight],
                    nativeCssHeight
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
        }
        root.removeView(current)
        current.stopLoading()
        current.loadUrl("about:blank")
        current.removeAllViews()
        current.destroy()
    }
}
