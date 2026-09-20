package com.paymydine.mobile.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.paymydine.mobile.BuildConfig
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.data.local.BootstrapSummary
import com.paymydine.mobile.network.MobileApiClient
import com.paymydine.mobile.network.TransportKind
import com.paymydine.mobile.network.TransportRouter
import com.paymydine.mobile.sync.CommandEnvelope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.UUID

@Composable
fun PayMyDineApp(app: PayMyDineApplication) {
    val context = LocalContext.current
    val online by app.connectivity.online.collectAsState()
    val edge by app.edgeDiscovery.endpoint.collectAsState()
    val pairingLink by app.pairingLink.collectAsState()
    val router = remember { TransportRouter() }
    val api = remember { MobileApiClient() }

    var tenantCode by remember {
        mutableStateOf(app.credentials.tenantHost()?.substringBefore(".paymydine.com").orEmpty())
    }
    var outboxCount by remember { mutableStateOf(app.syncRepository.outboxCount()) }
    var pairingStatus by remember {
        mutableStateOf(
            if (app.credentials.deviceToken().isNullOrBlank()) "Not paired"
            else if (app.bootstrapRepository.hasBootstrap()) "Ready offline"
            else "Paired - bootstrap required"
        )
    }
    var bootstrapSummary by remember { mutableStateOf<BootstrapSummary?>(null) }
    var lastError by remember { mutableStateOf<String?>(null) }

    val decision = router.decide(online, edge, app.credentials.edgeFingerprint())

    LaunchedEffect(pairingLink) {
        val rawLink = pairingLink ?: return@LaunchedEffect
        try {
            pairingStatus = "Finishing secure pairing..."
            lastError = null

            val uri = Uri.parse(rawLink)
            val exchange = uri.getQueryParameter("exchange").orEmpty()
            val tenantBase = uri.getQueryParameter("tenant").orEmpty()
            require(exchange.length == 64 && tenantBase.isNotBlank()) {
                "Pairing callback is incomplete."
            }

            val summary = withContext(Dispatchers.IO) {
                val paired = api.exchange(tenantBase, exchange)
                app.credentials.setTenantHost(paired.tenantHost)
                app.credentials.setDeviceId(paired.deviceId)
                app.credentials.putDeviceToken(paired.deviceToken)

                val bootstrap = api.bootstrap(paired.tenantHost, paired.deviceToken)
                app.bootstrapRepository.apply(bootstrap)
            }

            tenantCode = app.credentials.tenantHost()
                ?.substringBefore(".paymydine.com")
                .orEmpty()
            bootstrapSummary = summary
            pairingStatus = "Ready offline"
        } catch (error: Throwable) {
            lastError = error.message ?: "Secure pairing failed."
            pairingStatus = "Pairing failed"
        } finally {
            app.consumePairingLink(rawLink)
        }
    }

    MaterialTheme {
        Surface(Modifier.fillMaxSize()) {
            Column(
                Modifier.verticalScroll(rememberScrollState()).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Text("PayMyDine", style = MaterialTheme.typography.headlineLarge)
                Text("Android Local-First", style = MaterialTheme.typography.titleMedium)

                StatusCard(
                    "Runtime",
                    when (decision.kind) {
                        TransportKind.EDGE -> "Restaurant Edge"
                        TransportKind.CLOUD -> "Cloud"
                        TransportKind.OFFLINE -> "Offline / local DB"
                    },
                    decision.reason,
                )

                StatusCard(
                    "Device trust",
                    pairingStatus,
                    "Password and MFA stay in the official PayMyDine browser flow. " +
                        "The app stores only a rotated device token in Android Keystore.",
                )

                StatusCard(
                    "Local database",
                    if (app.bootstrapRepository.hasBootstrap()) "Seeded" else "Waiting",
                    bootstrapSummary?.let {
                        "${it.menuItems} menu items · ${it.tables} tables · ${it.kdsStations} KDS stations"
                    } ?: "Native screens read durable SQLite instead of waiting for web pages.",
                )

                StatusCard(
                    "Durable outbox",
                    "$outboxCount queued",
                    "Stable command IDs survive process death. Server replay stays disabled until certified idempotent.",
                )

                OutlinedTextField(
                    modifier = Modifier.fillMaxWidth(),
                    value = tenantCode,
                    onValueChange = {
                        tenantCode = it.lowercase()
                            .filter { ch -> ch.isLetterOrDigit() || ch == '-' }
                    },
                    label = { Text("Restaurant code") },
                    singleLine = true,
                )

                Button(
                    modifier = Modifier.fillMaxWidth(),
                    enabled = tenantCode.isNotBlank() && online,
                    onClick = {
                        val host = "${tenantCode}.paymydine.com"
                        app.credentials.setTenantHost(host)
                        pairingStatus = "Opening PayMyDine security..."
                        lastError = null

                        val browserIntent = Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse("https://$host/admin/mobile/pair/start"),
                        )
                        runCatching { context.startActivity(browserIntent) }
                            .onFailure {
                                pairingStatus = "Pairing failed"
                                lastError = "No browser is available for secure login."
                            }
                    },
                ) {
                    Text(
                        if (app.credentials.deviceToken().isNullOrBlank()) {
                            "Connect this Android device"
                        } else {
                            "Re-pair this Android device"
                        },
                    )
                }

                lastError?.let {
                    Text(it, color = MaterialTheme.colorScheme.error)
                }

                if (BuildConfig.DEBUG) {
                    Button(
                        onClick = {
                            val host = app.credentials.tenantHost() ?: return@Button
                            val deviceId = app.credentials.deviceId()
                                ?: UUID.randomUUID().toString().also(app.credentials::setDeviceId)
                            app.syncRepository.enqueue(
                                CommandEnvelope.create(
                                    host,
                                    bootstrapSummary?.locationId ?: 1,
                                    deviceId,
                                    null,
                                    null,
                                    "diagnostic",
                                    deviceId,
                                    0,
                                    "DIAGNOSTIC_LOCAL_ONLY",
                                    "{\"source\":\"android-debug\"}",
                                ),
                            )
                            outboxCount = app.syncRepository.outboxCount()
                        },
                    ) {
                        Text("Queue local diagnostic command")
                    }
                }

                Spacer(Modifier.height(12.dp))
                Text(
                    "Current milestone: secure native pairing + read bootstrap + durable local DB. " +
                        "Order/payment replay remains intentionally fail-closed until the global command processor is idempotent.",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@Composable
private fun StatusCard(title: String, value: String, detail: String) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(value, style = MaterialTheme.typography.labelLarge)
            }
            Text(detail, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
