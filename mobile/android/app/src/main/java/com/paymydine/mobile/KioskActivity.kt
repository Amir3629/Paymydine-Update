package com.paymydine.mobile

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebStorage
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.paymydine.mobile.kiosk.KioskApiClient
import com.paymydine.mobile.kiosk.KioskProfile
import com.paymydine.mobile.tabledisplay.DevicePlatformClient
import com.paymydine.mobile.tabledisplay.DeviceShellController
import com.paymydine.mobile.tabledisplay.SecureStore
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * Dedicated customer-facing self-service kiosk inside the PayMyDine Device App.
 *
 * The native shell owns pairing, managed-device power/lock state, service-mode
 * choice, privacy reset and the final confirmation screen. The canonical
 * PayMyDine customer menu owns menu data, modifiers, cart, tax, discounts,
 * checkout and configured payment providers.
 */
class KioskActivity : ComponentActivity() {
    private lateinit var deviceShell: DeviceShellController

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        enterKioskMode()
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    // Dedicated guest kiosk: Android back never leaves the flow.
                }
            },
        )

        val app = application as PayMyDineApplication
        val store = SecureStore(
            context = this,
            storeName = "pmd-kiosk-v1",
            keyAlias = "pmd-kiosk-v1",
        )
        deviceShell = DeviceShellController(
            activity = this,
            store = store,
            client = DevicePlatformClient(),
            deviceMode = "kiosk",
        )

        val initialHost =
            intent.getStringExtra(EXTRA_RESTAURANT_HOST)
                ?: app.credentials.tenantHost()

        setContent {
            KioskApp(
                store = store,
                api = KioskApiClient(),
                deviceShell = deviceShell,
                initialHost = initialHost,
                onBackToDeviceChoice = {
                    app.credentials.setDevicePurpose("staff")
                    app.credentials.setOnboardingMemberHint(null)
                    startActivity(
                        Intent(this, MainActivity::class.java)
                            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP),
                    )
                    finish()
                },
            )
        }
    }

    override fun onResume() {
        super.onResume()
        enterKioskMode()
        if (::deviceShell.isInitialized) {
            deviceShell.enterDedicatedMode()
        }
    }

    private fun enterKioskMode() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    companion object {
        const val EXTRA_RESTAURANT_HOST =
            "com.paymydine.mobile.extra.KIOSK_RESTAURANT_HOST"

        fun intent(
            context: Context,
            restaurantHost: String?,
        ): Intent =
            Intent(context, KioskActivity::class.java).apply {
                restaurantHost
                    ?.trim()
                    ?.takeIf { it.isNotBlank() }
                    ?.let { putExtra(EXTRA_RESTAURANT_HOST, it) }
            }
    }
}

private enum class KioskScreen {
    SETUP,
    LOADING,
    WELCOME,
    MENU,
    COMPLETE,
}

@Composable
private fun KioskApp(
    store: SecureStore,
    api: KioskApiClient,
    deviceShell: DeviceShellController,
    initialHost: String?,
    onBackToDeviceChoice: () -> Unit,
) {
    var screen by remember {
        mutableStateOf(
            if (store.isPaired()) KioskScreen.LOADING else KioskScreen.SETUP,
        )
    }
    var profile by remember { mutableStateOf<KioskProfile?>(null) }
    var serviceMode by remember { mutableStateOf("eat_in") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var completedOrderId by remember { mutableStateOf<String?>(null) }
    var sessionNonce by remember { mutableStateOf(UUID.randomUUID().toString()) }
    var lastInteractionMs by remember {
        mutableLongStateOf(SystemClock.elapsedRealtime())
    }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    suspend fun loadProfile() {
        val host = store.host()
        val token = store.token()
        if (host.isNullOrBlank() || token.isNullOrBlank()) {
            screen = KioskScreen.SETUP
            return
        }

        try {
            profile = api.state(host, token)
            error = null
            if (screen == KioskScreen.LOADING) {
                screen = KioskScreen.WELCOME
            }
        } catch (t: Throwable) {
            error = t.message ?: "Kiosk connection is unavailable."
            if (profile == null) {
                screen = KioskScreen.LOADING
            }
        }
    }

    fun startNewOrder() {
        completedOrderId = null
        sessionNonce = UUID.randomUUID().toString()
        lastInteractionMs = SystemClock.elapsedRealtime()
        screen = KioskScreen.WELCOME
    }

    LaunchedEffect(store.isPaired()) {
        if (!store.isPaired()) return@LaunchedEffect

        while (true) {
            loadProfile()
            delay(15_000L)
        }
    }

    LaunchedEffect(screen, store.isPaired()) {
        if (!store.isPaired()) return@LaunchedEffect
        while (true) {
            runCatching { deviceShell.heartbeatOnce() }
            delay(10_000L)
        }
    }

    LaunchedEffect(screen, profile?.idleTimeoutSeconds) {
        if (screen != KioskScreen.MENU) return@LaunchedEffect
        while (screen == KioskScreen.MENU) {
            delay(1_000L)
            val timeoutMs = (profile?.idleTimeoutSeconds ?: 120L) * 1_000L
            if (SystemClock.elapsedRealtime() - lastInteractionMs > timeoutMs) {
                startNewOrder()
                break
            }
        }
    }

    LaunchedEffect(screen, completedOrderId) {
        if (screen == KioskScreen.COMPLETE) {
            delay(10_000L)
            if (screen == KioskScreen.COMPLETE) startNewOrder()
        }
    }

    if (store.isPaired() && deviceShell.identifyActive) {
        KioskIdentifyScreen(store.deviceId())
        return
    }

    if (store.isPaired() && deviceShell.screenState == "closed") {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black),
        )
        return
    }

    when (screen) {
        KioskScreen.SETUP ->
            KioskSetupScreen(
                initialHost = store.host() ?: initialHost ?: "restaurant.paymydine.com",
                loading = loading,
                error = error,
                onBack = onBackToDeviceChoice,
                onPair = { host, code ->
                    scope.launch {
                        loading = true
                        error = null
                        try {
                            val result = api.pair(
                                host = host,
                                code = code,
                                installationId = store.installationId(),
                            )
                            store.savePairing(
                                host = host,
                                token = result.token,
                                deviceId = result.deviceId,
                                centrallyManaged = true,
                            )
                            screen = KioskScreen.LOADING
                            loadProfile()
                        } catch (t: Throwable) {
                            error = t.message ?: "Kiosk pairing failed."
                        } finally {
                            loading = false
                        }
                    }
                },
            )

        KioskScreen.LOADING ->
            KioskLoadingScreen(
                error = error,
                onRetry = { scope.launch { loadProfile() } },
                onBack = onBackToDeviceChoice,
            )

        KioskScreen.WELCOME -> {
            val current = profile ?: return
            KioskWelcomeScreen(
                profile = current,
                onEatHere = {
                    lastInteractionMs = SystemClock.elapsedRealtime()
                    context.startActivity(
                        KioskMenuActivity.intent(
                            context = context,
                            profile = current,
                            serviceMode = "eat_in",
                        ),
                    )
                    if (context is KioskActivity) {
                        @Suppress("DEPRECATION")
                        context.overridePendingTransition(0, 0)
                    }
                },
                onTakeAway = {
                    lastInteractionMs = SystemClock.elapsedRealtime()
                    context.startActivity(
                        KioskMenuActivity.intent(
                            context = context,
                            profile = current,
                            serviceMode = "pickup",
                        ),
                    )
                    if (context is KioskActivity) {
                        @Suppress("DEPRECATION")
                        context.overridePendingTransition(0, 0)
                    }
                },
            )
        }

        KioskScreen.MENU -> {
            val current = profile ?: return
            KioskMenuScreen(
                profile = current,
                serviceMode = serviceMode,
                sessionNonce = sessionNonce,
                onInteraction = {
                    lastInteractionMs = SystemClock.elapsedRealtime()
                },
                onStartOver = { startNewOrder() },
                onOrderComplete = { orderId ->
                    completedOrderId = orderId
                    screen = KioskScreen.COMPLETE
                },
            )
        }

        KioskScreen.COMPLETE -> {
            val current = profile ?: return
            KioskCompleteScreen(
                profile = current,
                orderId = completedOrderId,
                onNewOrder = { startNewOrder() },
            )
        }
    }
}

@Composable
private fun KioskSetupScreen(
    initialHost: String,
    loading: Boolean,
    error: String?,
    onBack: () -> Unit,
    onPair: (String, String) -> Unit,
) {
    var host by remember(initialHost) { mutableStateOf(initialHost) }
    var code by remember { mutableStateOf("") }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFFF4F8F6),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 30.dp, vertical = 24.dp),
        ) {
            TextButton(
                modifier = Modifier.align(Alignment.TopStart),
                enabled = !loading,
                onClick = onBack,
            ) {
                Text(
                    "Back",
                    color = Color(0xFF0A6B57),
                    fontWeight = FontWeight.Bold,
                )
            }

            Column(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .widthIn(max = 520.dp)
                    .verticalScroll(rememberScrollState())
                    .padding(top = 52.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                KioskBrand(76.dp)
                Text(
                    "PayMyDine",
                    modifier = Modifier.padding(top = 10.dp),
                    color = Color(0xFF17342F),
                    fontSize = 30.sp,
                    fontWeight = FontWeight.Black,
                )
                Text(
                    "Kiosk",
                    modifier = Modifier.padding(top = 2.dp),
                    color = Color(0xFF6D7C79),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                )

                OutlinedTextField(
                    value = host,
                    onValueChange = { host = it.trim() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 34.dp),
                    label = { Text("Restaurant") },
                    placeholder = { Text("tomo.paymydine.com") },
                    singleLine = true,
                    enabled = !loading,
                )
                OutlinedTextField(
                    value = code,
                    onValueChange = {
                        code = it.filter(Char::isDigit).take(6)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                    label = { Text("Kiosk setup code") },
                    placeholder = { Text("123456") },
                    singleLine = true,
                    enabled = !loading,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.NumberPassword,
                    ),
                )

                if (!error.isNullOrBlank()) {
                    Text(
                        error,
                        modifier = Modifier.padding(top = 12.dp),
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                    )
                }

                Button(
                    onClick = { onPair(host, code) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 18.dp)
                        .height(54.dp),
                    enabled =
                        !loading &&
                            host.isNotBlank() &&
                            code.length == 6,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF0A6B57),
                    ),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    if (loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            color = Color.White,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text("Pair kiosk", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun KioskLoadingScreen(
    error: String?,
    onRetry: () -> Unit,
    onBack: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFFF4F8F6),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            KioskBrand(72.dp)
            Spacer(Modifier.height(22.dp))
            if (error.isNullOrBlank()) {
                CircularProgressIndicator(color = Color(0xFF0A6B57))
                Text(
                    "Opening kiosk…",
                    modifier = Modifier.padding(top = 14.dp),
                    color = Color(0xFF17342F),
                    fontWeight = FontWeight.Bold,
                )
            } else {
                Text(
                    "Connection needed",
                    color = Color(0xFF17342F),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                )
                Text(
                    error,
                    modifier = Modifier.padding(top = 8.dp),
                    color = Color(0xFF6D7C79),
                    textAlign = TextAlign.Center,
                )
                Button(
                    modifier = Modifier.padding(top = 18.dp),
                    onClick = onRetry,
                ) {
                    Text("Try again")
                }
                TextButton(onClick = onBack) {
                    Text("Back to device setup")
                }
            }
        }
    }
}

@Composable
private fun KioskWelcomeScreen(
    profile: KioskProfile,
    onEatHere: () -> Unit,
    onTakeAway: () -> Unit,
) {
    val background = kioskColor(profile.theme.background, Color(0xFFF4F8F6))
    val text = kioskColor(profile.theme.text, Color(0xFF17342F))
    val muted = kioskColor(profile.theme.muted, Color(0xFF6D7C79))
    val accent = kioskColor(profile.theme.accent, Color(0xFF0A6B57))
    val surface = kioskColor(profile.theme.surface, Color.White)

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 42.dp, vertical = 48.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            KioskBrand(72.dp)
            Text(
                profile.restaurantName,
                modifier = Modifier.padding(top = 18.dp),
                color = text,
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
            )
            Text(
                "How would you like to order?",
                modifier = Modifier.padding(top = 8.dp),
                color = muted,
                fontSize = 17.sp,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(46.dp))

            KioskModeButton(
                title = "EAT HERE",
                subtitle = "Order and enjoy it here",
                background = surface,
                text = text,
                accent = accent,
                onClick = onEatHere,
            )
            Spacer(Modifier.height(18.dp))
            KioskModeButton(
                title = "TAKE AWAY",
                subtitle = "Order for collection",
                background = surface,
                text = text,
                accent = accent,
                onClick = onTakeAway,
            )

            Spacer(Modifier.weight(1f))
        }
    }
}

@Composable
private fun KioskModeButton(
    title: String,
    subtitle: String,
    background: Color,
    text: Color,
    accent: Color,
    onClick: () -> Unit,
) {
    Button(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .height(112.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = background,
            contentColor = text,
        ),
        shape = RoundedCornerShape(22.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(
                        accent.copy(alpha = 0.14f),
                        RoundedCornerShape(14.dp),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    if (title == "EAT HERE") "01" else "02",
                    color = accent,
                    fontWeight = FontWeight.Black,
                )
            }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 18.dp),
            ) {
                Text(
                    title,
                    color = text,
                    fontSize = 21.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 0.7.sp,
                )
                Text(
                    subtitle,
                    modifier = Modifier.padding(top = 3.dp),
                    color = text.copy(alpha = 0.62f),
                    fontSize = 13.sp,
                )
            }
            Text(
                "→",
                color = accent,
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun KioskMenuScreen(
    profile: KioskProfile,
    serviceMode: String,
    sessionNonce: String,
    onInteraction: () -> Unit,
    onStartOver: () -> Unit,
    onOrderComplete: (String) -> Unit,
) {
    val surface = kioskColor(profile.theme.surface, Color.White)
    val text = kioskColor(profile.theme.text, Color(0xFF17342F))
    val accent = kioskColor(profile.theme.accent, Color(0xFF0A6B57))

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(surface),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .background(surface)
                .padding(horizontal = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextButton(onClick = onStartOver) {
                Text(
                    "← Start over",
                    color = accent,
                    fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.weight(1f))
            Text(
                if (serviceMode == "pickup") "TAKE AWAY" else "EAT HERE",
                color = text,
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.sp,
            )
            Spacer(Modifier.weight(1f))
            Spacer(Modifier.size(88.dp))
        }

        key(sessionNonce) {
            KioskWebView(
                profile = profile,
                serviceMode = serviceMode,
                sessionNonce = sessionNonce,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                onInteraction = onInteraction,
                onOrderComplete = onOrderComplete,
            )
        }
    }
}

@SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
@Composable
private fun KioskWebView(
    profile: KioskProfile,
    serviceMode: String,
    sessionNonce: String,
    modifier: Modifier,
    onInteraction: () -> Unit,
    onOrderComplete: (String) -> Unit,
) {
    val context = LocalContext.current
    var webView by remember { mutableStateOf<WebView?>(null) }

    val base = profile.menuUrl.trimEnd('/')
    val trustedHost = remember(base) {
        runCatching {
            Uri.parse(base).host?.lowercase().orEmpty()
        }.getOrDefault("")
    }
    val bridgeSecret = remember(sessionNonce) {
        UUID.randomUUID().toString()
    }
    val target =
        base +
            "/kiosk/?pmd_kiosk=1" +
            "&kiosk_order_type=" +
            Uri.encode(serviceMode) +
            "&kiosk_session=" +
            Uri.encode(sessionNonce) +
            "&kiosk_name=" +
            Uri.encode(profile.restaurantName) +
            "&kiosk_logo=" +
            Uri.encode(profile.restaurantLogoUrl) +
            "&kiosk_bg=" +
            Uri.encode(profile.theme.background) +
            "&kiosk_text=" +
            Uri.encode(profile.theme.text) +
            "&kiosk_muted=" +
            Uri.encode(profile.theme.muted) +
            "&kiosk_accent=" +
            Uri.encode(profile.theme.accent) +
            "&kiosk_surface=" +
            Uri.encode(profile.theme.surface)
    DisposableEffect(Unit) {
        onDispose {
            webView?.let { view ->
                runCatching {
                    view.evaluateJavascript(
                        "try{localStorage.clear();sessionStorage.clear();}catch(e){}",
                        null,
                    )
                    view.removeJavascriptInterface("PayMyDineKiosk")
                    view.stopLoading()
                    view.clearHistory()
                    view.destroy()
                }
            }
            webView = null
        }
    }

    AndroidView(
        modifier = modifier,
        factory = {
            WebView(context).apply {
                webView = this
                setBackgroundColor(android.graphics.Color.TRANSPARENT)

                val kioskBridge =
                    KioskJavascriptBridge(
                        secret = bridgeSecret,
                        onOrderComplete = onOrderComplete,
                    )
                fun enableKioskBridge(enabled: Boolean) {
                    removeJavascriptInterface("PayMyDineKiosk")
                    if (enabled) {
                        addJavascriptInterface(
                            kioskBridge,
                            "PayMyDineKiosk",
                        )
                    }
                }

                val cookies = CookieManager.getInstance()
                cookies.setAcceptCookie(true)
                cookies.setAcceptThirdPartyCookies(this, true)

                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.allowFileAccess = false
                settings.allowContentAccess = false
                settings.cacheMode = WebSettings.LOAD_DEFAULT
                settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                settings.userAgentString =
                    settings.userAgentString + " PayMyDineKiosk/" + BuildConfig.VERSION_NAME

                enableKioskBridge(true)
                webChromeClient = WebChromeClient()
                webViewClient =
                    object : WebViewClient() {
                        override fun onPageStarted(
                            view: WebView,
                            url: String?,
                            favicon: android.graphics.Bitmap?,
                        ) {
                            super.onPageStarted(view, url, favicon)
                            val pageHost =
                                runCatching {
                                    Uri.parse(url.orEmpty())
                                        .host
                                        ?.lowercase()
                                        .orEmpty()
                                }.getOrDefault("")
                            enableKioskBridge(
                                pageHost.isNotBlank() &&
                                    pageHost == trustedHost,
                            )
                        }

                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?,
                        ): Boolean {
                            val uri = request?.url ?: return true
                            val scheme = uri.scheme?.lowercase().orEmpty()
                            return scheme != "https" && scheme != "about"
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
                            if (
                                pageHost.isBlank() ||
                                pageHost != trustedHost
                            ) {
                                enableKioskBridge(false)
                                return
                            }

                            enableKioskBridge(true)

                            injectKioskGuestUi(
                                view,
                                bridgeSecret,
                            )
                        }
                    }

                setOnTouchListener { _, _ ->
                    onInteraction()
                    false
                }

                // PMD_KIOSK_NATIVE_DIRECT_LOAD_V57
                // Clear browser state natively and load the real kiosk page once.
                // Do not round-trip through /kiosk-reset: a reset-page navigation
                // can race WebView callbacks and leave the customer on a blank
                // surface even when the server page itself is healthy.
                WebStorage.getInstance().deleteAllData()
                clearCache(true)
                clearHistory()

                cookies.removeAllCookies {
                    cookies.flush()
                    post {
                        loadUrl(target)
                    }
                }
            }
        },
    )
}

private class KioskJavascriptBridge(
    private val secret: String,
    private val onOrderComplete: (String) -> Unit,
) {
    private val mainHandler = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun orderComplete(
        orderId: String,
        providedSecret: String,
    ) {
        if (
            providedSecret.isBlank() ||
            providedSecret != secret
        ) {
            return
        }

        mainHandler.post {
            onOrderComplete(orderId.trim())
        }
    }
}

private fun injectKioskGuestUi(
    webView: WebView,
    bridgeSecret: String,
) {
    val script =
        """
        (function () {
          document.documentElement.setAttribute('data-pmd-kiosk', '1');
          window.__PMD_KIOSK_BRIDGE_SECRET__ =
            __PMD_KIOSK_BRIDGE_SECRET__;

          // Dedicated kiosk UI contains no table-only controls.
        })();
        """.trimIndent()
            .replace(
                "__PMD_KIOSK_BRIDGE_SECRET__",
                org.json.JSONObject.quote(bridgeSecret),
            )

    webView.evaluateJavascript(script, null)
}

@Composable
private fun KioskCompleteScreen(
    profile: KioskProfile,
    orderId: String?,
    onNewOrder: () -> Unit,
) {
    val background = kioskColor(profile.theme.background, Color(0xFFF4F8F6))
    val text = kioskColor(profile.theme.text, Color(0xFF17342F))
    val muted = kioskColor(profile.theme.muted, Color(0xFF6D7C79))
    val accent = kioskColor(profile.theme.accent, Color(0xFF0A6B57))

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(38.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(84.dp)
                    .background(
                        accent.copy(alpha = 0.14f),
                        RoundedCornerShape(26.dp),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "✓",
                    color = accent,
                    fontSize = 46.sp,
                    fontWeight = FontWeight.Black,
                )
            }
            Text(
                "Order confirmed",
                modifier = Modifier.padding(top = 24.dp),
                color = text,
                fontSize = 32.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center,
            )
            if (!orderId.isNullOrBlank()) {
                Text(
                    "ORDER #$orderId",
                    modifier = Modifier.padding(top = 10.dp),
                    color = accent,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp,
                )
            }
            Text(
                "Thank you. Your order has been sent to the restaurant.",
                modifier = Modifier.padding(top = 10.dp),
                color = muted,
                fontSize = 15.sp,
                textAlign = TextAlign.Center,
            )
            Button(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 420.dp)
                    .padding(top = 30.dp)
                    .height(56.dp),
                onClick = onNewOrder,
                colors = ButtonDefaults.buttonColors(
                    containerColor = accent,
                ),
                shape = RoundedCornerShape(16.dp),
            ) {
                Text("Start new order", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun KioskIdentifyScreen(deviceId: Long) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF07120F))
            .padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            KioskBrand(86.dp)
            Text(
                "PAYMYDINE KIOSK",
                modifier = Modifier.padding(top = 20.dp),
                color = Color.White,
                fontSize = 26.sp,
                fontWeight = FontWeight.Black,
            )
            Text(
                "Device #$deviceId",
                modifier = Modifier.padding(top = 8.dp),
                color = Color.White.copy(alpha = 0.68f),
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun KioskBrand(size: androidx.compose.ui.unit.Dp) {
    Image(
        painter = painterResource(R.drawable.pmd_brand_mark),
        contentDescription = "PayMyDine",
        modifier = Modifier.size(size),
        contentScale = ContentScale.Fit,
    )
}

private fun kioskColor(
    raw: String,
    fallback: Color,
): Color {
    val hex = raw.trim().removePrefix("#")
    return runCatching {
        when (hex.length) {
            6 -> Color(("FF" + hex).toLong(16))
            8 -> Color(hex.toLong(16))
            else -> fallback
        }
    }.getOrDefault(fallback)
}
