package com.paymydine.mobile.ui

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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.paymydine.mobile.BuildConfig
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.network.TransportKind
import com.paymydine.mobile.network.TransportRouter
import com.paymydine.mobile.sync.CommandEnvelope
import java.util.UUID

@Composable
fun PayMyDineApp(app: PayMyDineApplication) {
    val online by app.connectivity.online.collectAsState()
    val edge by app.edgeDiscovery.endpoint.collectAsState()
    val router = remember { TransportRouter() }
    var tenantCode by remember {
        mutableStateOf(app.credentials.tenantHost()?.substringBefore(".paymydine.com").orEmpty())
    }
    var outboxCount by remember { mutableStateOf(app.syncRepository.outboxCount()) }
    val decision = router.decide(online, edge, app.credentials.edgeFingerprint())

    MaterialTheme {
        Surface(Modifier.fillMaxSize()) {
            Column(
                Modifier.verticalScroll(rememberScrollState()).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text("PayMyDine", style = MaterialTheme.typography.headlineLarge)
                Text("Android Local-First Foundation", style = MaterialTheme.typography.titleMedium)

                StatusCard(
                    "Runtime",
                    when (decision.kind) {
                        TransportKind.EDGE -> "Restaurant Edge"
                        TransportKind.CLOUD -> "Cloud"
                        TransportKind.OFFLINE -> "Offline / local DB"
                    },
                    decision.reason
                )
                StatusCard(
                    "Local database", "Ready",
                    "UI state is designed to come from durable SQLite, never from a WebView."
                )
                StatusCard(
                    "Durable outbox", "$outboxCount queued",
                    "Commands keep stable UUID/idempotency keys across process death and retries."
                )

                OutlinedTextField(
                    modifier = Modifier.fillMaxWidth(),
                    value = tenantCode,
                    onValueChange = {
                        tenantCode = it.lowercase().filter { ch -> ch.isLetterOrDigit() || ch == '-' }
                    },
                    label = { Text("Restaurant code") },
                    singleLine = true
                )
                Button(enabled = tenantCode.isNotBlank(), onClick = {
                    app.credentials.setTenantHost("${tenantCode}.paymydine.com")
                }) { Text("Save restaurant") }

                if (BuildConfig.DEBUG) {
                    Button(onClick = {
                        val host = app.credentials.tenantHost() ?: return@Button
                        val deviceId = app.credentials.deviceId()
                            ?: UUID.randomUUID().toString().also(app.credentials::setDeviceId)
                        app.syncRepository.enqueue(
                            CommandEnvelope.create(
                                host, 1, deviceId, null, null,
                                "diagnostic", deviceId, 0,
                                "DIAGNOSTIC_LOCAL_ONLY", "{\"source\":\"android-debug\"}"
                            )
                        )
                        outboxCount = app.syncRepository.outboxCount()
                    }) { Text("Queue local diagnostic command") }
                }

                Spacer(Modifier.height(12.dp))
                Text(
                    "Order/payment replay is intentionally disabled until the server-side order command " +
                        "contract is idempotent. This build will not fake a successful restaurant write.",
                    style = MaterialTheme.typography.bodySmall
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
