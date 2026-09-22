package com.paymydine.mobile.ui

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.network.MobileApiClient
import com.paymydine.mobile.network.PairRequestResult
import com.paymydine.mobile.network.WorkspaceAuthorizationResult
import com.paymydine.mobile.security.StaffSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

/**
 * PMD_ANDROID_CANONICAL_LOGIN_UI_V12
 *
 * Android renders the same PayMyDine Login card contract as
 * auth/login_workplace_v4, but from a local asset. Restaurant approval changes
 * this same card into its waiting state; it never navigates to a browser
 * confirmation page.
 */
@Composable
fun PmdStaffLogin(
    app: PayMyDineApplication,
    online: Boolean,
    onAuthorized: (WorkspaceAuthorizationResult) -> Unit,
    onContinueOffline: (StaffSession) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val api = remember { MobileApiClient() }

    var pendingRequest by remember { mutableStateOf<String?>(null) }
    var requestCode by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var clearPassword by remember { mutableStateOf(false) }

    val remembered = app.credentials.staffSession()
    val offlineAvailable =
        !online &&
            remembered != null &&
            app.bootstrapRepository.hasBootstrap() &&
            app.credentials.offlineSessionValid(remembered.surface)

    val state = NativeLoginState(
        mode = if (pendingRequest != null) "wait" else "login",
        online = online,
        busy = busy,
        username = remembered?.username.orEmpty(),
        requestCode = requestCode,
        error = error,
        clearPassword = clearPassword,
        offlineAvailable = offlineAvailable,
        offlineText = if (offlineAvailable) {
            "PayMyDine Cloud is offline. Your last verified work session " +
                "is available from this tablet."
        } else {
            ""
        },
        offlineLabel = remembered?.let {
            "Continue offline as " +
                it.staffName.ifBlank { it.username }
        }.orEmpty(),
        allowCancel = pendingRequest != null,
    )

    LaunchedEffect(pendingRequest, online) {
        val loginRequest = pendingRequest ?: return@LaunchedEffect
        if (!online) return@LaunchedEffect

        val host = app.credentials.tenantHost().orEmpty()
        val token = app.credentials.deviceToken().orEmpty()
        if (host.isBlank() || token.isBlank()) return@LaunchedEffect

        while (isActive && pendingRequest == loginRequest) {
            delay(1_600L)

            val result = try {
                withContext(Dispatchers.IO) {
                    api.staffLoginStatus(
                        tenantHost = host,
                        deviceToken = token,
                        loginRequest = loginRequest,
                    )
                }
            } catch (failure: Throwable) {
                error = failure.message
                    ?: "Restaurant approval could not be checked."
                continue
            }

            requestCode = result.requestCode ?: requestCode

            when (result.status) {
                "authorized" -> {
                    val authorization = result.authorization
                    if (authorization != null) {
                        pendingRequest = null
                        requestCode = null
                        error = null
                        onAuthorized(authorization)
                    }
                    return@LaunchedEffect
                }

                "declined" -> {
                    pendingRequest = null
                    requestCode = null
                    clearPassword = true
                    error = "The restaurant declined this sign-in request."
                    return@LaunchedEffect
                }

                "expired" -> {
                    pendingRequest = null
                    requestCode = null
                    clearPassword = true
                    error =
                        "This restaurant approval request expired. Sign in again."
                    return@LaunchedEffect
                }
            }
        }
    }

    PmdCanonicalLoginCard(
        modifier = Modifier,
        state = state,
        onSubmit = { username, password ->
            if (!online || busy || pendingRequest != null) {
                return@PmdCanonicalLoginCard
            }

            val host = app.credentials.tenantHost().orEmpty()
            val token = app.credentials.deviceToken().orEmpty()
            if (host.isBlank() || token.isBlank()) {
                error =
                    "This Android device must be connected to the restaurant again."
                return@PmdCanonicalLoginCard
            }

            busy = true
            error = null
            clearPassword = false

            scope.launch {
                val result = runCatching {
                    withContext(Dispatchers.IO) {
                        api.requestStaffLogin(
                            tenantHost = host,
                            deviceToken = token,
                            username = username,
                            password = password,
                        )
                    }
                }

                busy = false
                clearPassword = true

                result.onSuccess { login ->
                    when (login.status) {
                        "authorized" -> {
                            val authorization = login.authorization
                            if (authorization == null) {
                                error =
                                    "PayMyDine sign-in response is incomplete."
                            } else {
                                error = null
                                onAuthorized(authorization)
                            }
                        }

                        "pending" -> {
                            pendingRequest = login.loginRequest
                            requestCode = login.requestCode
                            error = null
                        }

                        else -> {
                            error = "PayMyDine sign-in could not continue."
                        }
                    }
                }.onFailure {
                    error = it.message ?: "PayMyDine sign-in failed."
                }
            }
        },
        onContinueOffline = {
            val session = app.credentials.staffSession()
            if (
                session != null &&
                app.bootstrapRepository.hasBootstrap() &&
                app.credentials.offlineSessionValid(session.surface)
            ) {
                onContinueOffline(session)
            }
        },
        onCancelWaiting = {
            pendingRequest = null
            requestCode = null
            error = null
            clearPassword = true
        },
        onForgotPassword = {
            app.credentials.tenantHost()
                ?.takeIf { it.endsWith(".paymydine.com") }
                ?.let { host ->
                    runCatching {
                        context.startActivity(
                            Intent(
                                Intent.ACTION_VIEW,
                                Uri.parse("https://$host/admin/login/reset"),
                            ),
                        )
                    }
                }
        },
    )

    if (clearPassword) {
        LaunchedEffect(Unit) {
            clearPassword = false
        }
    }
}

/**
 * First-device connection uses the exact same card as normal staff sign-in.
 * Credentials create a PKCE-bound pair request; the app remains on the waiting
 * card while an existing Owner/Manager/Cashier dashboard approves it.
 */
@Composable
fun PmdPairLogin(
    app: PayMyDineApplication,
    online: Boolean,
    pairRequest: String,
    codeChallenge: String,
    requestCode: String?,
    waiting: Boolean,
    errorMessage: String?,
    onRequested: (PairRequestResult) -> Unit,
    onCancel: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val api = remember { MobileApiClient() }

    var busy by remember { mutableStateOf(false) }
    var localError by remember { mutableStateOf<String?>(null) }
    var clearPassword by remember { mutableStateOf(false) }

    val state = NativeLoginState(
        mode = if (waiting) "wait" else "login",
        online = online,
        busy = busy,
        username = "",
        requestCode = requestCode,
        error = localError ?: errorMessage,
        clearPassword = clearPassword,
        offlineAvailable = false,
        offlineText = "",
        offlineLabel = "",
        allowCancel = true,
    )

    PmdCanonicalLoginCard(
        modifier = Modifier,
        state = state,
        onSubmit = { username, password ->
            if (!online || busy || waiting) {
                return@PmdCanonicalLoginCard
            }

            val host = app.credentials.tenantHost().orEmpty()
            if (
                host.isBlank() ||
                pairRequest.isBlank() ||
                codeChallenge.length != 43
            ) {
                localError =
                    "Secure connection request expired. Start again."
                return@PmdCanonicalLoginCard
            }

            busy = true
            localError = null
            clearPassword = false

            scope.launch {
                val result = runCatching {
                    withContext(Dispatchers.IO) {
                        api.requestPairing(
                            tenantBaseUrl = "https://$host",
                            pairRequest = pairRequest,
                            codeChallenge = codeChallenge,
                            deviceName =
                                "PayMyDine Android · Restaurant App",
                            username = username,
                            password = password,
                        )
                    }
                }

                busy = false
                clearPassword = true
                result.onSuccess(onRequested)
                    .onFailure {
                        localError = it.message
                            ?: "Android connection could not be requested."
                    }
            }
        },
        onContinueOffline = {},
        onCancelWaiting = onCancel,
        onForgotPassword = {
            app.credentials.tenantHost()
                ?.takeIf { it.endsWith(".paymydine.com") }
                ?.let { host ->
                    runCatching {
                        context.startActivity(
                            Intent(
                                Intent.ACTION_VIEW,
                                Uri.parse("https://$host/admin/login/reset"),
                            ),
                        )
                    }
                }
        },
    )

    if (clearPassword) {
        LaunchedEffect(Unit) {
            clearPassword = false
        }
    }
}

private data class NativeLoginState(
    val mode: String,
    val online: Boolean,
    val busy: Boolean,
    val username: String,
    val requestCode: String?,
    val error: String?,
    val clearPassword: Boolean,
    val offlineAvailable: Boolean,
    val offlineText: String,
    val offlineLabel: String,
    val allowCancel: Boolean,
)

private class NativeLoginBridge {
    var webView: WebView? = null
    var stateProvider: (() -> NativeLoginState)? = null
    var submitCallback: ((String, String) -> Unit)? = null
    var continueOfflineCallback: (() -> Unit)? = null
    var cancelWaitingCallback: (() -> Unit)? = null
    var forgotPasswordCallback: (() -> Unit)? = null

    @JavascriptInterface
    fun ready() {
        val state = stateProvider?.invoke() ?: return
        webView?.let { pushNativeState(it, state) }
    }

    @JavascriptInterface
    fun submit(username: String, password: String) {
        submitCallback?.invoke(username, password)
    }

    @JavascriptInterface
    fun continueOffline() {
        continueOfflineCallback?.invoke()
    }

    @JavascriptInterface
    fun cancelWaiting() {
        cancelWaitingCallback?.invoke()
    }

    @JavascriptInterface
    fun forgotPassword() {
        forgotPasswordCallback?.invoke()
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun PmdCanonicalLoginCard(
    modifier: Modifier,
    state: NativeLoginState,
    onSubmit: (String, String) -> Unit,
    onContinueOffline: () -> Unit,
    onCancelWaiting: () -> Unit,
    onForgotPassword: () -> Unit,
) {
    val bridge = remember { NativeLoginBridge() }

    bridge.stateProvider = { state }
    bridge.submitCallback = onSubmit
    bridge.continueOfflineCallback = onContinueOffline
    bridge.cancelWaitingCallback = onCancelWaiting
    bridge.forgotPasswordCallback = onForgotPassword

    AndroidView(
        modifier = modifier,
        factory = { context ->
            WebView(context).apply {
                setBackgroundColor(android.graphics.Color.TRANSPARENT)
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = false
                    databaseEnabled = false
                    allowFileAccess = true
                    allowContentAccess = false
                    blockNetworkLoads = true
                    javaScriptCanOpenWindowsAutomatically = false
                    setSupportMultipleWindows(false)
                }
                addJavascriptInterface(bridge, "PayMyDineNative")
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(
                        view: WebView,
                        url: String,
                    ) {
                        pushNativeState(view, state)
                    }
                }
                bridge.webView = this
                loadUrl(
                    "file:///android_asset/" +
                        "pmd-login-workplace-v11-native.html",
                )
            }
        },
        update = { view ->
            bridge.webView = view
            pushNativeState(view, state)
        },
    )
}

private fun pushNativeState(
    view: WebView,
    state: NativeLoginState,
) {
    val json = JSONObject()
        .put("mode", state.mode)
        .put("online", state.online)
        .put("busy", state.busy)
        .put("username", state.username)
        .put("requestCode", state.requestCode ?: "")
        .put("error", state.error ?: "")
        .put("clearPassword", state.clearPassword)
        .put("offlineAvailable", state.offlineAvailable)
        .put("offlineText", state.offlineText)
        .put("offlineLabel", state.offlineLabel)
        .put("allowCancel", state.allowCancel)

    view.post {
        view.evaluateJavascript(
            "if(window.pmdNativeLoginState){" +
                "window.pmdNativeLoginState(${json});" +
                "}",
            null,
        )
    }
}
