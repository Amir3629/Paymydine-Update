package com.paymydine.mobile.ui

import android.app.Activity
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.paymydine.mobile.KdsActivity
import com.paymydine.mobile.OfflinePosActivity
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.PosActivity
import com.paymydine.mobile.R
import com.paymydine.mobile.ReservationsActivity
import com.paymydine.mobile.RoleWorkspaceActivity
import com.paymydine.mobile.data.local.BootstrapSummary
import com.paymydine.mobile.edge.EdgeRuntimeState
import com.paymydine.mobile.edge.EdgeService
import com.paymydine.mobile.network.MobileApiClient
import com.paymydine.mobile.network.TransportKind
import com.paymydine.mobile.network.TransportRouter
import com.paymydine.mobile.security.PairingPkce
import com.paymydine.mobile.security.StaffSession
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
    var pairingCode by remember { mutableStateOf<String?>(null) }
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

            status?.requestCode?.let {
                pairingCode = it
            }

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
                        pairingCode = null
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
                        pairingCode = null
                        pairingStatus = "Pairing expired"
                        lastError =
                            "This connection request was already used. Tap Connect again."
                    }
                    return@LaunchedEffect
                }

                "declined" -> {
                    app.credentials.clearPairingAttempt()
                    pairingAttempt = ""
                    pairingCode = null
                    pairingStatus = "Pairing declined"
                    lastError =
                        "The restaurant declined this Android connection. Tap Connect to request again."
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

    fun openStaffSession(session: StaffSession) {
        if (session.surface == "kds") {
            session.roleCode
                .removePrefix("pmd-kds:")
                .takeIf { session.roleCode.startsWith("pmd-kds:") && it.isNotBlank() }
                ?.let { app.kdsRepository.selectStation(it) }
        }

        if (session.surface in setOf("pos", "kds", "reservations")) {
            app.credentials.putWorkspaceLease(
                surface = session.surface,
                username = session.username,
                expiresAtEpochSeconds = session.expiresAtEpochSeconds,
            )
        }

        val destination = when (session.surface) {
            "pos" -> if (online) {
                PosActivity::class.java
            } else {
                OfflinePosActivity::class.java
            }
            "kds" -> KdsActivity::class.java
            else -> RoleWorkspaceActivity::class.java
        }

        context.startActivity(
            Intent(context, destination).apply {
                if (destination == OfflinePosActivity::class.java) {
                    putExtra(
                        OfflinePosActivity.EXTRA_REASON,
                        "PayMyDine Cloud is unavailable. Continuing the last verified POS session locally.",
                    )
                }
            },
        )
    }

    PmdTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = PmdBackground,
        ) {
            if (paired && ready) {
                // PMD_ANDROID_DIRECT_LOGIN_ROUTER_V1
                PmdStaffLogin(
                    app = app,
                    online = online,
                    onAuthorized = { result ->
                        val session = StaffSession(
                            username = result.username,
                            staffName = result.staffName,
                            userId = result.userId,
                            staffId = result.staffId,
                            roleCode = result.roleCode,
                            route = result.route,
                            surface = result.surface,
                            expiresAtEpochSeconds = result.leaseExpiresAt,
                        )
                        app.credentials.putStaffSession(session)
                        openStaffSession(session)
                    },
                    onContinueOffline = { session ->
                        openStaffSession(session)
                    },
                )
            } else if (paired) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(28.dp),
                    verticalArrangement = Arrangement.Center,
                ) {
                    Image(
                        painter = painterResource(R.drawable.pmd_brand_mark),
                        contentDescription = "PayMyDine",
                        modifier = Modifier.size(58.dp),
                    )
                    Text(
                        "Preparing PayMyDine",
                        modifier = Modifier.padding(top = 16.dp),
                        color = PmdDeepGreen,
                        fontWeight = FontWeight.Black,
                        style = MaterialTheme.typography.headlineSmall,
                    )
                    Text(
                        if (online) {
                            "Downloading the restaurant menu, tables, open bills and operational data for secure local use."
                        } else {
                            "Connect this tablet to the internet once so PayMyDine can download the trusted restaurant snapshot."
                        },
                        modifier = Modifier.padding(top = 10.dp),
                        color = PmdMuted,
                    )
                    lastError?.let {
                        Text(
                            it,
                            modifier = Modifier.padding(top = 10.dp),
                            color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            } else {
                Onboarding(
                    tenantCode = tenantCode,
                    onTenantCode = {
                        tenantCode = it.trim().lowercase()
                    },
                    online = online,
                    pairingStatus = pairingStatus,
                    pairingCode = pairingCode,
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
                            pairingCode = null
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
                                .appendQueryParameter(
                                    "device_name",
                                    "PayMyDine Android · Restaurant App",
                                )
                                .build()

                            runCatching {
                                context.startActivity(
                                    Intent(Intent.ACTION_VIEW, pairingUrl),
                                )
                            }.onFailure {
                                app.credentials.clearPairingAttempt()
                                pairingAttempt = ""
                                pairingCode = null
                                pairingStatus = "Pairing failed"
                                lastError =
                                    "No browser is available for secure PayMyDine sign-in."
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
    pairingCode: String?,
    lastError: String?,
    onConnect: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 30.dp, vertical = 34.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Image(
                painter = painterResource(R.drawable.pmd_brand_mark),
                contentDescription = "PayMyDine",
                modifier = Modifier.size(62.dp),
            )
            Column {
                Text(
                    "PayMyDine",
                    color = PmdDeepGreen,
                    fontWeight = FontWeight.Black,
                    style = MaterialTheme.typography.headlineMedium,
                )
                Text(
                    "Restaurant Operations",
                    color = PmdMuted,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }

        Text(
            "Connect your restaurant",
            modifier = Modifier.padding(top = 24.dp),
            color = PmdText,
            fontWeight = FontWeight.Black,
            style = MaterialTheme.typography.headlineSmall,
        )
        Text(
            "Enter your restaurant name/code first. On the first installation only, PayMyDine completes the normal secure device approval. After that, the app always opens the staff login page directly.",
            modifier = Modifier.padding(top = 8.dp, bottom = 22.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = PmdMuted,
        )

        OutlinedTextField(
            modifier = Modifier.fillMaxWidth(),
            value = tenantCode,
            onValueChange = onTenantCode,
            label = { Text("Restaurant code or PayMyDine URL") },
            placeholder = { Text("tomo") },
            singleLine = true,
        )

        Button(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 14.dp),
            enabled = tenantCode.isNotBlank() && online,
            onClick = onConnect,
        ) {
            Text("Continue")
        }

        pairingCode?.let { raw ->
            val digits = raw.filter(Char::isDigit).take(6)
            if (digits.length == 6) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 18.dp),
                    shape = RoundedCornerShape(18.dp),
                    color = PmdSurfaceSoft,
                    border = BorderStroke(1.dp, PmdLine),
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            "CONNECTION CODE",
                            color = PmdMuted,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.labelSmall,
                        )
                        Text(
                            digits.take(3) + " " + digits.drop(3),
                            modifier = Modifier.padding(top = 7.dp),
                            color = PmdDeepGreen,
                            fontWeight = FontWeight.Black,
                            style = MaterialTheme.typography.headlineLarge,
                        )
                        Text(
                            "Match this code on the bottom-right Android approval card in PayMyDine.",
                            modifier = Modifier.padding(top = 8.dp),
                            color = PmdMuted,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
        }

        if (!online) {
            Text(
                "Internet is required only for the first secure connection.",
                modifier = Modifier.padding(top = 14.dp),
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
                        "Complete PayMyDine sign-in in the browser. This browser does not approve the Android device."
                    "Waiting for browser approval" ->
                        "Waiting for a Cashier, Manager or Owner to approve this Android device from the small PayMyDine approval icon."
                    "Finishing secure pairing..." ->
                        "Restaurant approval received. Securing this device…"
                    "Finishing secure setup..." ->
                        "Preparing restaurant data for offline use…"
                    else -> pairingStatus
                },
                modifier = Modifier.padding(top = 14.dp),
                color = PmdMuted,
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

// PMD_ANDROID_PREPAIR_WORKSPACE_CHOOSER_V2
@Composable
private fun PairWorkspaceChooser(
    onWorkspace: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 28.dp, vertical = 26.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Image(
                painter = painterResource(R.drawable.pmd_brand_mark),
                contentDescription = "PayMyDine",
                modifier = Modifier.size(66.dp),
            )
            Column {
                Text(
                    "PayMyDine",
                    color = PmdDeepGreen,
                    fontWeight = FontWeight.Black,
                    style = MaterialTheme.typography.headlineMedium,
                )
                Text(
                    "One app for restaurant operations",
                    color = PmdMuted,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }

        Column {
            Text(
                "How will this device be used?",
                color = PmdText,
                fontWeight = FontWeight.Black,
                style = MaterialTheme.typography.headlineMedium,
            )
            Text(
                "Choose the workspace you want to connect. PayMyDine will confirm the signed-in staff permissions after restaurant approval.",
                modifier = Modifier.padding(top = 6.dp),
                color = PmdMuted,
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
            if (maxWidth >= 760.dp) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    PairWorkspaceCard(
                        modifier = Modifier.weight(1f),
                        badge = "POS",
                        title = "Cashier / Waiter",
                        description = "Tables, menu, checks, Send/Hold and offline order service.",
                        footer = "POS + Waiter",
                        onClick = { onWorkspace("pos") },
                    )
                    PairWorkspaceCard(
                        modifier = Modifier.weight(1f),
                        badge = "KDS",
                        title = "Kitchen Display",
                        description = "Kitchen tickets, preparation status and LAN operation with Restaurant Edge.",
                        footer = "Local-first KDS",
                        onClick = { onWorkspace("kds") },
                    )
                    PairWorkspaceCard(
                        modifier = Modifier.weight(1f),
                        badge = "RES",
                        title = "Reservations",
                        description = "Open the PayMyDine reservation workspace using this paired device identity.",
                        footer = "Cloud workspace",
                        onClick = { onWorkspace("reservations") },
                    )
                }
            } else {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    PairWorkspaceCard(
                        modifier = Modifier.fillMaxWidth(),
                        badge = "POS",
                        title = "Cashier / Waiter",
                        description = "Tables, menu, checks, Send/Hold and offline order service.",
                        footer = "POS + Waiter",
                        onClick = { onWorkspace("pos") },
                    )
                    PairWorkspaceCard(
                        modifier = Modifier.fillMaxWidth(),
                        badge = "KDS",
                        title = "Kitchen Display",
                        description = "Kitchen tickets, preparation status and LAN operation with Restaurant Edge.",
                        footer = "Local-first KDS",
                        onClick = { onWorkspace("kds") },
                    )
                    PairWorkspaceCard(
                        modifier = Modifier.fillMaxWidth(),
                        badge = "RES",
                        title = "Reservations",
                        description = "Open the PayMyDine reservation workspace using this paired device identity.",
                        footer = "Cloud workspace",
                        onClick = { onWorkspace("reservations") },
                    )
                }
            }
        }

        Text(
            "PayMyDine · secure restaurant pairing",
            color = PmdMuted,
            style = MaterialTheme.typography.labelSmall,
        )
    }
}

@Composable
private fun PairWorkspaceCard(
    modifier: Modifier,
    badge: String,
    title: String,
    description: String,
    footer: String,
    onClick: () -> Unit,
) {
    Surface(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(22.dp),
        color = Color.White,
        border = BorderStroke(1.dp, PmdLine),
        tonalElevation = 1.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Surface(
                modifier = Modifier.size(54.dp),
                shape = RoundedCornerShape(16.dp),
                color = PmdDeepGreen,
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text(
                        badge,
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
            Text(
                title,
                color = PmdText,
                fontWeight = FontWeight.Black,
                style = MaterialTheme.typography.titleLarge,
            )
            Text(
                description,
                color = PmdMuted,
                style = MaterialTheme.typography.bodySmall,
            )
            Surface(
                shape = RoundedCornerShape(999.dp),
                color = PmdSurfaceSoft,
            ) {
                Text(
                    footer,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    color = PmdGreen,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.labelSmall,
                )
            }
            Text(
                "Select →",
                color = PmdDeepGreen,
                fontWeight = FontWeight.ExtraBold,
            )
        }
    }
}
