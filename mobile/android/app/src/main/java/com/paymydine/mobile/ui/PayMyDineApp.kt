package com.paymydine.mobile.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.data.local.BootstrapSummary
import com.paymydine.mobile.edge.EdgeRuntimeState
import com.paymydine.mobile.edge.EdgeService
import com.paymydine.mobile.network.MobileApiClient
import com.paymydine.mobile.network.TransportKind
import com.paymydine.mobile.network.TransportRouter
import com.paymydine.mobile.security.PairingPkce
import com.paymydine.mobile.sync.SyncEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.net.URI
import java.util.UUID

@Composable
fun PayMyDineApp(app: PayMyDineApplication) {
    val context = LocalContext.current
    val online by app.connectivity.online.collectAsState()
    val edge by app.edgeDiscovery.endpoint.collectAsState()
    val pairingLink by app.pairingLink.collectAsState()
    val edgeRuntime by EdgeRuntimeState.state.collectAsState()
    val scope = rememberCoroutineScope()
    val router = remember { TransportRouter() }
    val api = remember { MobileApiClient() }
    val pairingMutex = remember { Mutex() }

    var tenantCode by remember {
        mutableStateOf(
            app.credentials.tenantHost()
                ?.substringBefore(".paymydine.com")
                .orEmpty(),
        )
    }
    var pairingStatus by remember {
        mutableStateOf(
            when {
                !app.credentials.deviceToken().isNullOrBlank()
                    && app.bootstrapRepository.hasBootstrap() ->
                    "Ready offline"
                !app.credentials.deviceToken().isNullOrBlank() ->
                    "Paired - bootstrap required"
                !app.credentials.pairingVerifier().isNullOrBlank()
                    && !app.credentials.pairingRequest().isNullOrBlank()
                    && !app.credentials.tenantHost().isNullOrBlank() ->
                    "Waiting for browser approval"
                else ->
                    "Not paired"
            },
        )
    }
    var pairingAttempt by remember {
        mutableStateOf(app.credentials.pairingRequest().orEmpty())
    }
    var bootstrapSummary by remember { mutableStateOf<BootstrapSummary?>(null) }
    var lastError by remember { mutableStateOf<String?>(null) }
    var paired by remember {
        mutableStateOf(
            !app.credentials.deviceToken().isNullOrBlank()
                && !app.credentials.tenantHost().isNullOrBlank(),
        )
    }
    var ready by remember {
        mutableStateOf(
            !app.credentials.deviceToken().isNullOrBlank()
                && app.bootstrapRepository.hasBootstrap(),
        )
    }

    suspend fun completePairing(
        tenantBase: String,
        exchange: String,
    ): BootstrapSummary? = pairingMutex.withLock {
        val expectedHost = app.credentials.tenantHost()
            ?.trim()
            ?.lowercase()
            .orEmpty()
        val callbackHost = runCatching {
            URI(tenantBase).host?.lowercase().orEmpty()
        }.getOrDefault("")

        require(
            exchange.length == 64 &&
                expectedHost.isNotBlank() &&
                callbackHost == expectedHost
        ) {
            "Pairing response belongs to another restaurant."
        }

        var token = app.credentials.deviceToken()
        var pairedHost = expectedHost

        if (token.isNullOrBlank()) {
            val verifier = app.credentials.pairingVerifier().orEmpty()
            require(verifier.length in 43..128) {
                "Secure pairing expired. Tap Connect again."
            }

            val pairedResult = withContext(Dispatchers.IO) {
                api.exchange(
                    tenantBase,
                    exchange,
                    verifier,
                )
            }

            require(pairedResult.tenantHost == expectedHost) {
                "Pairing response belongs to another restaurant."
            }

            pairedHost = pairedResult.tenantHost
            token = pairedResult.deviceToken
            app.credentials.setTenantHost(pairedHost)
            app.credentials.setDeviceId(pairedResult.deviceId)
            app.credentials.putDeviceToken(pairedResult.deviceToken)
            app.credentials.clearPairingAttempt()
            paired = true
        }

        if (app.bootstrapRepository.hasBootstrap()) {
            return@withLock null
        }

        val deviceToken = requireNotNull(token) {
            "Secure device token is unavailable."
        }

        val bootstrap = withContext(Dispatchers.IO) {
            api.bootstrap(pairedHost, deviceToken)
        }
        val edgeFingerprint = bootstrap
            .optJSONObject("edge")
            ?.optString("fingerprint_sha256")
            ?.trim()
            ?.takeIf { it.length == 64 }

        if (edgeFingerprint != null) {
            app.credentials.setEdgeFingerprint(edgeFingerprint)
        } else {
            app.credentials.clearEdgeFingerprint()
        }

        withContext(Dispatchers.IO) {
            app.bootstrapRepository.apply(bootstrap)
        }
    }

    val discoveredDecision = router.decide(
        cloudOnline = online,
        edge = edge,
        pinnedEdgeFingerprint = app.credentials.edgeFingerprint(),
        expectedSiteId = app.bootstrapRepository.locationId()?.toString(),
    )
    val localEdgeTrusted =
        edgeRuntime.running &&
            !edgeRuntime.fingerprintSha256.isNullOrBlank() &&
            edgeRuntime.fingerprintSha256.equals(
                app.credentials.edgeFingerprint(),
                ignoreCase = true,
            )
    val runtimeKind = if (localEdgeTrusted) {
        TransportKind.EDGE
    } else {
        discoveredDecision.kind
    }

    val surfaces = if (ready) {
        app.bootstrapRepository.surfaces()
    } else {
        emptySet()
    }
    val canManageEdge = "manager" in surfaces
    val availableWorkspaces = buildList {
        if ("pos" in surfaces || "waiter" in surfaces) add("pos")
        if ("kds" in surfaces) add("kds")
    }.ifEmpty { listOf("pos") }
    var activeWorkspace by remember(ready, surfaces) {
        mutableStateOf(
            if (availableWorkspaces.size == 1) {
                availableWorkspaces.first()
            } else if ("pos" in availableWorkspaces) {
                "pos"
            } else {
                availableWorkspaces.first()
            },
        )
    }

    LaunchedEffect(online, ready, pairingAttempt) {
        if (
            ready ||
            !online ||
            pairingAttempt.isBlank() ||
            !app.credentials.deviceToken().isNullOrBlank()
        ) {
            return@LaunchedEffect
        }

        val host = app.credentials.tenantHost().orEmpty()
        val verifier = app.credentials.pairingVerifier().orEmpty()
        val requestId = pairingAttempt

        if (
            host.isBlank() ||
            verifier.length !in 43..128 ||
            requestId.isBlank()
        ) {
            return@LaunchedEffect
        }

        pairingStatus = "Waiting for browser approval"
        lastError = null

        while (
            isActive &&
            !ready &&
            app.credentials.deviceToken().isNullOrBlank() &&
            pairingAttempt == requestId
        ) {
            val status = runCatching {
                withContext(Dispatchers.IO) {
                    api.pairStatus(
                        tenantBaseUrl = "https://$host",
                        pairRequest = requestId,
                        codeVerifier = verifier,
                    )
                }
            }.getOrNull()

            when (status?.status) {
                "approved" -> {
                    pairingStatus = "Finishing secure pairing..."
                    lastError = null

                    try {
                        val summary = completePairing(
                            tenantBase = status.tenantBaseUrl
                                ?: "https://$host",
                            exchange = status.exchange.orEmpty(),
                        )
                        tenantCode = app.credentials.tenantHost()
                            ?.substringBefore(".paymydine.com")
                            .orEmpty()
                        bootstrapSummary = summary
                        pairingAttempt = ""
                        pairingStatus = "Ready offline"
                        ready = true
                        SyncEngine.enqueueImmediate(app)
                    } catch (error: Throwable) {
                        val hasDeviceToken =
                            !app.credentials.deviceToken().isNullOrBlank()
                        if (hasDeviceToken) {
                            paired = true
                            pairingAttempt = ""
                        }
                        pairingStatus =
                            if (!hasDeviceToken) {
                                "Pairing failed"
                            } else {
                                "Paired - bootstrap required"
                            }
                        lastError = error.message
                            ?: "Secure pairing could not be completed."
                    }
                    return@LaunchedEffect
                }

                "expired" -> {
                    app.credentials.clearPairingAttempt()
                    pairingAttempt = ""
                    pairingStatus = "Pairing expired"
                    lastError =
                        "The connection request expired. Tap Connect and try again."
                    return@LaunchedEffect
                }

                "used" -> {
                    if (app.credentials.deviceToken().isNullOrBlank()) {
                        app.credentials.clearPairingAttempt()
                        pairingAttempt = ""
                        pairingStatus = "Pairing expired"
                        lastError =
                            "This connection request was already used. Tap Connect again."
                    }
                    return@LaunchedEffect
                }
            }

            delay(2_000)
        }
    }

    LaunchedEffect(online, ready, pairingAttempt) {
        if (
            ready ||
            !online ||
            app.credentials.deviceToken().isNullOrBlank() ||
            app.bootstrapRepository.hasBootstrap()
        ) {
            return@LaunchedEffect
        }

        val host = app.credentials.tenantHost()
        val token = app.credentials.deviceToken()
        if (host.isNullOrBlank() || token.isNullOrBlank()) {
            return@LaunchedEffect
        }

        pairingStatus = "Finishing secure setup..."
        lastError = null

        runCatching {
            withContext(Dispatchers.IO) {
                val bootstrap = api.bootstrap(host, token)
                val edgeFingerprint = bootstrap
                    .optJSONObject("edge")
                    ?.optString("fingerprint_sha256")
                    ?.trim()
                    ?.takeIf { it.length == 64 }

                if (edgeFingerprint != null) {
                    app.credentials.setEdgeFingerprint(edgeFingerprint)
                } else {
                    app.credentials.clearEdgeFingerprint()
                }

                app.bootstrapRepository.apply(bootstrap)
            }
        }.onSuccess { summary ->
            bootstrapSummary = summary
            pairingStatus = "Ready offline"
            ready = true
            SyncEngine.enqueueImmediate(app)
        }.onFailure { error ->
            pairingStatus = "Paired - bootstrap required"
            lastError = error.message
                ?: "PayMyDine setup will retry when the connection is available."
        }
    }

    LaunchedEffect(ready) {
        if (!ready) return@LaunchedEffect

        while (isActive) {
            withContext(Dispatchers.IO) {
                runCatching { SyncEngine(app).runOnce() }
            }
            delay(5_000)
        }
    }

    LaunchedEffect(pairingLink) {
        val rawLink = pairingLink ?: return@LaunchedEffect

        try {
            // If the polling fallback already completed pairing while the
            // browser was open, this callback is simply redundant.
            if (
                !app.credentials.deviceToken().isNullOrBlank() &&
                app.bootstrapRepository.hasBootstrap()
            ) {
                paired = true
                pairingStatus = "Ready offline"
                ready = true
                return@LaunchedEffect
            }

            pairingStatus = "Finishing secure pairing..."
            lastError = null

            val uri = Uri.parse(rawLink)
            val exchange = uri.getQueryParameter("exchange").orEmpty()
            val tenantBase = uri.getQueryParameter("tenant").orEmpty()

            val summary = completePairing(
                tenantBase = tenantBase,
                exchange = exchange,
            )

            tenantCode = app.credentials.tenantHost()
                ?.substringBefore(".paymydine.com")
                .orEmpty()
            bootstrapSummary = summary
            paired = true
            pairingAttempt = ""
            pairingStatus = "Ready offline"
            ready = true
            SyncEngine.enqueueImmediate(app)
        } catch (error: Throwable) {
            val hasDeviceToken = !app.credentials.deviceToken().isNullOrBlank()
            if (hasDeviceToken) {
                paired = true
                pairingAttempt = ""
            }
            pairingStatus =
                if (!hasDeviceToken) {
                    "Pairing failed"
                } else {
                    "Paired - bootstrap required"
                }
            lastError = error.message ?: "Secure pairing failed."
        } finally {
            app.consumePairingLink(rawLink)
        }
    }

    MaterialTheme {
        Surface(Modifier.fillMaxSize()) {
            if (paired) {
                PosWebView(
                    tenantHost = app.credentials.tenantHost().orEmpty(),
                    deviceToken = app.credentials.deviceToken().orEmpty(),
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Onboarding(
                    tenantCode = tenantCode,
                    onTenantCode = {
                        tenantCode = it.trim().lowercase()
                    },
                    online = online,
                    pairingStatus = pairingStatus,
                    lastError = lastError,
                    onConnect = {
                        val code = normalizeTenantCode(tenantCode)

                        if (code == null) {
                            pairingStatus = "Not paired"
                            lastError =
                                "Use the restaurant code from your PayMyDine URL. " +
                                    "For example, tomo.paymydine.com means the code is tomo."
                        } else {
                            val host = "$code.paymydine.com"
                            val verifier = PairingPkce.newVerifier()
                            val challenge = PairingPkce.challenge(verifier)
                            val requestId = UUID.randomUUID().toString()

                            tenantCode = code
                            app.credentials.setTenantHost(host)
                            app.credentials.putPairingVerifier(verifier)
                            app.credentials.setPairingRequest(requestId)
                            pairingAttempt = requestId
                            pairingStatus = "Opening PayMyDine security..."
                            lastError = null

                            val pairingUrl = Uri.parse(
                                "https://$host/admin/mobile/pair/start",
                            ).buildUpon()
                                .appendQueryParameter(
                                    "code_challenge",
                                    challenge,
                                )
                                .appendQueryParameter(
                                    "pair_request",
                                    requestId,
                                )
                                .build()

                            runCatching {
                                context.startActivity(
                                    Intent(Intent.ACTION_VIEW, pairingUrl),
                                )
                            }.onFailure {
                                app.credentials.clearPairingAttempt()
                                pairingAttempt = ""
                                pairingStatus = "Pairing failed"
                                lastError =
                                    "No browser is available for secure login."
                            }
                        }
                    },
                )
            }
        }
    }

}

internal fun normalizeTenantCode(raw: String): String? {
    var value = raw.trim().lowercase()
    value = value
        .removePrefix("https://")
        .removePrefix("http://")
        .substringBefore('/')
        .substringBefore('?')
        .substringBefore('#')
        .substringBefore(':')

    if (value.endsWith(".paymydine.com")) {
        value = value.removeSuffix(".paymydine.com")
    }

    return value.takeIf {
        it.matches(
            Regex("^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$"),
        )
    }
}

@Composable
private fun Onboarding(
    tenantCode: String,
    onTenantCode: (String) -> Unit,
    online: Boolean,
    pairingStatus: String,
    lastError: String?,
    onConnect: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 28.dp, vertical = 34.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            "PayMyDine",
            style = MaterialTheme.typography.headlineLarge,
        )
        Text(
            "Connect this tablet",
            modifier = Modifier.padding(top = 6.dp),
            style = MaterialTheme.typography.titleLarge,
        )
        Text(
            "Restaurant code is the part before .paymydine.com. " +
                "For example, if your URL is tommo.paymydine.com, enter tommo. " +
                "You can also paste the full PayMyDine URL.",
            modifier = Modifier.padding(top = 10.dp, bottom = 26.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = tenantCode,
            onValueChange = onTenantCode,
            label = { Text("Restaurant code or PayMyDine URL") },
            placeholder = { Text("tommo") },
            singleLine = true,
        )

        Button(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 14.dp),
            enabled = tenantCode.isNotBlank() && online,
            onClick = onConnect,
        ) {
            Text("Connect")
        }

        if (!online) {
            Text(
                "Internet is required for the first connection.",
                modifier = Modifier.padding(top = 12.dp),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
            )
        } else if (
            pairingStatus != "Not paired" &&
            pairingStatus != "Ready offline"
        ) {
            Text(
                when (pairingStatus) {
                    "Opening PayMyDine security...",
                    "Waiting for browser approval" ->
                        "Finish PayMyDine sign-in in the browser, then tap Connect device. You may return to this app at any time; it checks approval automatically."
                    "Finishing secure pairing..." ->
                        "Connecting this tablet…"
                    "Finishing secure setup..." ->
                        "Preparing restaurant data for offline use…"
                    else -> pairingStatus
                },
                modifier = Modifier.padding(top = 12.dp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall,
            )
        }

        lastError?.let {
            Text(
                it,
                modifier = Modifier.padding(top = 10.dp),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

