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
import androidx.compose.material3.Card
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
import kotlinx.coroutines.withContext
import java.net.URI

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

    var tenantCode by remember {
        mutableStateOf(
            app.credentials.tenantHost()
                ?.substringBefore(".paymydine.com")
                .orEmpty(),
        )
    }
    var pairingStatus by remember {
        mutableStateOf(
            if (app.credentials.deviceToken().isNullOrBlank()) "Not paired"
            else if (app.bootstrapRepository.hasBootstrap()) "Ready offline"
            else "Paired - bootstrap required",
        )
    }
    var bootstrapSummary by remember { mutableStateOf<BootstrapSummary?>(null) }
    var lastError by remember { mutableStateOf<String?>(null) }
    var ready by remember {
        mutableStateOf(
            !app.credentials.deviceToken().isNullOrBlank()
                && app.bootstrapRepository.hasBootstrap(),
        )
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

    LaunchedEffect(online, ready) {
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
            pairingStatus = "Finishing secure pairing..."
            lastError = null

            val uri = Uri.parse(rawLink)
            val exchange = uri.getQueryParameter("exchange").orEmpty()
            val tenantBase = uri.getQueryParameter("tenant").orEmpty()
            val codeVerifier = app.credentials.pairingVerifier().orEmpty()
            val expectedHost = app.credentials.tenantHost()
                ?.trim()
                ?.lowercase()
                .orEmpty()
            val callbackHost = runCatching {
                URI(tenantBase).host?.lowercase().orEmpty()
            }.getOrDefault("")

            require(
                exchange.length == 64 &&
                    tenantBase.isNotBlank() &&
                    codeVerifier.length in 43..128 &&
                    expectedHost.isNotBlank() &&
                    callbackHost == expectedHost
            ) {
                "Pairing callback is incomplete or belongs to another restaurant."
            }

            val summary = withContext(Dispatchers.IO) {
                val paired = api.exchange(
                    tenantBase,
                    exchange,
                    codeVerifier,
                )

                require(paired.tenantHost == expectedHost) {
                    "Pairing response belongs to another restaurant."
                }

                app.credentials.clearPairingVerifier()
                app.credentials.setTenantHost(paired.tenantHost)
                app.credentials.setDeviceId(paired.deviceId)
                app.credentials.putDeviceToken(paired.deviceToken)

                val bootstrap = api.bootstrap(
                    paired.tenantHost,
                    paired.deviceToken,
                )
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

            tenantCode = app.credentials.tenantHost()
                ?.substringBefore(".paymydine.com")
                .orEmpty()
            bootstrapSummary = summary
            pairingStatus = "Ready offline"
            ready = true
            SyncEngine.enqueueImmediate(app)
        } catch (error: Throwable) {
            lastError = error.message ?: "Secure pairing failed."
            pairingStatus = "Pairing failed"
        } finally {
            app.consumePairingLink(rawLink)
        }
    }

    MaterialTheme {
        Surface(Modifier.fillMaxSize()) {
            if (ready) {
                Column(Modifier.fillMaxSize()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                "PayMyDine",
                                style = MaterialTheme.typography.titleLarge,
                            )
                            Text(
                                when (runtimeKind) {
                                    TransportKind.EDGE -> "Restaurant Edge"
                                    TransportKind.CLOUD -> "Cloud connected"
                                    TransportKind.OFFLINE -> "Offline local mode"
                                } + " · " +
                                    (app.bootstrapRepository.roleCode() ?: "staff"),
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }

                        availableWorkspaces.forEach { workspace ->
                            val selected = activeWorkspace == workspace
                            if (selected) {
                                Button(
                                    onClick = { activeWorkspace = workspace },
                                ) {
                                    Text(
                                        if (workspace == "kds") "Kitchen" else "POS",
                                    )
                                }
                            } else {
                                OutlinedButton(
                                    onClick = { activeWorkspace = workspace },
                                ) {
                                    Text(
                                        if (workspace == "kds") "Kitchen" else "POS",
                                    )
                                }
                            }
                        }

                        OutlinedButton(
                            onClick = { SyncEngine.enqueueImmediate(app) },
                        ) {
                            Text("Sync ${app.syncRepository.outboxCount()}")
                        }

                        OutlinedButton(
                            onClick = {
                                val host = app.credentials.tenantHost()
                                    ?: return@OutlinedButton
                                val verifier = PairingPkce.newVerifier()
                                val challenge = PairingPkce.challenge(verifier)
                                app.credentials.putPairingVerifier(verifier)
                                val pairingUrl = Uri.parse(
                                    "https://$host/admin/mobile/pair/start",
                                ).buildUpon()
                                    .appendQueryParameter(
                                        "code_challenge",
                                        challenge,
                                    )
                                    .build()

                                runCatching {
                                    context.startActivity(
                                        Intent(Intent.ACTION_VIEW, pairingUrl),
                                    )
                                }.onFailure {
                                    app.credentials.clearPairingVerifier()
                                    lastError =
                                        "No browser is available for secure login."
                                }
                            },
                        ) {
                            Text("Device")
                        }

                        if (canManageEdge) {
                            OutlinedButton(
                                enabled = edgeRuntime.enabled || online,
                                onClick = {
                                    val turnOn = !edgeRuntime.enabled

                                    if (turnOn) {
                                        lastError = null
                                        EdgeService.setEnabled(app, true)
                                    } else {
                                        scope.launch {
                                            lastError = null
                                            val host = app.credentials.tenantHost()
                                            val token = app.credentials.deviceToken()

                                            if (
                                                online &&
                                                !host.isNullOrBlank() &&
                                                !token.isNullOrBlank()
                                            ) {
                                                withContext(Dispatchers.IO) {
                                                    runCatching {
                                                        api.disableEdge(
                                                            host,
                                                            token,
                                                        )
                                                    }
                                                }
                                            }

                                            EdgeService.setEnabled(app, false)
                                            app.credentials.clearEdgeFingerprint()
                                        }
                                    }
                                },
                            ) {
                                Text(
                                    when {
                                        edgeRuntime.running ->
                                            "Edge On"
                                        edgeRuntime.enabled ->
                                            "Edge Starting"
                                        else ->
                                            "Make Edge"
                                    },
                                )
                            }
                        }
                    }

                    when (activeWorkspace) {
                        "kds" -> KdsScreen(
                            app = app,
                            modifier = Modifier.weight(1f),
                        )
                        else -> LocalPosScreen(
                            app = app,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            } else {
                Onboarding(
                    tenantCode = tenantCode,
                    onTenantCode = {
                        tenantCode = it.lowercase()
                            .filter { ch -> ch.isLetterOrDigit() || ch == '-' }
                    },
                    online = online,
                    pairingStatus = pairingStatus,
                    lastError = lastError,
                    onConnect = {
                        val host = "${tenantCode}.paymydine.com"
                        val verifier = PairingPkce.newVerifier()
                        val challenge = PairingPkce.challenge(verifier)
                        app.credentials.setTenantHost(host)
                        app.credentials.putPairingVerifier(verifier)
                        pairingStatus = "Opening PayMyDine security..."
                        lastError = null

                        val pairingUrl = Uri.parse(
                            "https://$host/admin/mobile/pair/start",
                        ).buildUpon()
                            .appendQueryParameter(
                                "code_challenge",
                                challenge,
                            )
                            .build()

                        runCatching {
                            context.startActivity(
                                Intent(Intent.ACTION_VIEW, pairingUrl),
                            )
                        }.onFailure {
                            app.credentials.clearPairingVerifier()
                            pairingStatus = "Pairing failed"
                            lastError = "No browser is available for secure login."
                        }
                    },
                )
            }
        }
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
            "Enter your restaurant code. Secure sign-in opens in your browser once and then returns to the app automatically.",
            modifier = Modifier.padding(top = 10.dp, bottom = 26.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = tenantCode,
            onValueChange = onTenantCode,
            label = { Text("Restaurant code") },
            placeholder = { Text("your-restaurant") },
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
                    "Opening PayMyDine security..." ->
                        "Complete the secure step in your browser. PayMyDine will return here automatically."
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

