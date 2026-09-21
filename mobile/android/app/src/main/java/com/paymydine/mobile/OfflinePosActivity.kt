package com.paymydine.mobile

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.weight
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import com.paymydine.mobile.edge.EdgeRuntimeState
import com.paymydine.mobile.network.TransportKind
import com.paymydine.mobile.network.TransportRouter
import com.paymydine.mobile.sync.SyncEngine
import com.paymydine.mobile.ui.LocalPosScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * PMD_ANDROID_OFFLINE_POS_V1
 *
 * Durable native fallback for restaurant operation when Cloud is unavailable.
 * The local screen reads the last trusted bootstrap from SQLite and writes
 * order mutations to the same durable outbox used by Cloud/Restaurant Edge.
 *
 * Payments intentionally stay outside this offline surface: the server
 * bootstrap advertises offline_payment_enabled=false and no certified payment
 * command exists in pmd-sync-v1 yet.
 */
class OfflinePosActivity : ComponentActivity() {
    private val app: PayMyDineApplication
        get() = application as PayMyDineApplication

    private var sawOfflineSignal = false
    private var returningToCloud = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (!app.bootstrapRepository.hasBootstrap()) {
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

        sawOfflineSignal = !app.connectivity.online.value

        setContent {
            OfflinePosShell(
                app = app,
                reason = intent.getStringExtra(EXTRA_REASON),
                onTryCloud = ::returnToCloud,
            )
        }

        SyncEngine.enqueueImmediate(app)

        lifecycleScope.launch {
            app.connectivity.online.collectLatest { online ->
                if (!online) {
                    sawOfflineSignal = true
                    return@collectLatest
                }

                // Only auto-return after a real offline -> online transition.
                // If WebView fell back because Cloud returned 5xx/SSL while the
                // network stayed validated, remain safely local until the
                // cashier explicitly taps "Try Cloud".
                if (!sawOfflineSignal || returningToCloud) {
                    return@collectLatest
                }

                delay(900)
                if (app.connectivity.online.value) {
                    returnToCloud()
                }
            }
        }
    }

    private fun returnToCloud() {
        if (returningToCloud || isFinishing || isDestroyed) return
        if (!app.connectivity.online.value) return

        returningToCloud = true
        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                runCatching {
                    SyncEngine(app).runOnce()
                }
            }

            if (
                app.connectivity.online.value &&
                !isFinishing &&
                !isDestroyed
            ) {
                startActivity(
                    Intent(
                        this@OfflinePosActivity,
                        PosActivity::class.java,
                    ).apply {
                        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    },
                )
                finish()
            } else {
                returningToCloud = false
            }
        }
    }

    companion object {
        const val EXTRA_REASON = "pmd.offline.reason"
    }
}

@Composable
private fun OfflinePosShell(
    app: PayMyDineApplication,
    reason: String?,
    onTryCloud: () -> Unit,
) {
    val online by app.connectivity.online.collectAsState()
    val discoveredEdge by app.edgeDiscovery.endpoint.collectAsState()
    val localEdge by EdgeRuntimeState.state.collectAsState()
    val router = remember { TransportRouter() }

    var queued by remember {
        mutableIntStateOf(app.syncRepository.outboxCount())
    }

    val pinned = app.credentials.edgeFingerprint()
    val locationId = app.bootstrapRepository.locationId()
        ?.toString()

    val decision = router.decide(
        cloudOnline = online,
        edge = discoveredEdge,
        pinnedEdgeFingerprint = pinned,
        expectedSiteId = locationId,
    )
    val localEdgeTrusted =
        localEdge.running &&
            !localEdge.fingerprintSha256.isNullOrBlank() &&
            !pinned.isNullOrBlank() &&
            localEdge.fingerprintSha256.equals(
                pinned,
                ignoreCase = true,
            )

    val authorityLabel = when {
        online ->
            "Cloud connection available"
        localEdgeTrusted || decision.kind == TransportKind.EDGE ->
            "Restaurant Edge connected on local network"
        else ->
            "Offline on this tablet"
    }

    LaunchedEffect(Unit) {
        while (isActive) {
            queued = withContext(Dispatchers.IO) {
                app.syncRepository.outboxCount()
            }

            // Keep looking for Cloud/Edge and drain the durable outbox while
            // the native local POS remains open.
            withContext(Dispatchers.IO) {
                runCatching {
                    SyncEngine(app).runOnce()
                }
            }
            delay(5_000)
        }
    }

    MaterialTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
        ) {
            Column(
                modifier = Modifier.fillMaxSize(),
            ) {
                Surface(
                    tonalElevation = 2.dp,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(
                                horizontal = 14.dp,
                                vertical = 9.dp,
                            ),
                        horizontalArrangement =
                            Arrangement.SpaceBetween,
                    ) {
                        Column(
                            modifier = Modifier.weight(1f),
                        ) {
                            Text(
                                "PayMyDine Local POS",
                                style =
                                    MaterialTheme.typography.titleMedium,
                            )
                            Text(
                                buildString {
                                    append(authorityLabel)
                                    append(" · ")
                                    append(queued)
                                    append(
                                        if (queued == 1) {
                                            " queued command"
                                        } else {
                                            " queued commands"
                                        },
                                    )
                                },
                                style =
                                    MaterialTheme.typography.bodySmall,
                            )
                            if (!reason.isNullOrBlank()) {
                                Text(
                                    reason,
                                    style =
                                        MaterialTheme.typography.bodySmall,
                                )
                            }
                            if (!online) {
                                Text(
                                    "Orders are saved locally. Payments require Cloud.",
                                    style =
                                        MaterialTheme.typography.bodySmall,
                                )
                            }
                        }

                        if (online) {
                            Button(
                                onClick = onTryCloud,
                            ) {
                                Text("Try Cloud")
                            }
                        }
                    }
                }

                LocalPosScreen(
                    app = app,
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f),
                )
            }
        }
    }
}
