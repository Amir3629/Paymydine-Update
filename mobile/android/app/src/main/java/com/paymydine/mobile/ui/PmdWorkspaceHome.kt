package com.paymydine.mobile.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.paymydine.mobile.BuildConfig
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.R
import com.paymydine.mobile.edge.EdgeRuntimeState
import com.paymydine.mobile.edge.EdgeService
import com.paymydine.mobile.network.MobileApiClient
import com.paymydine.mobile.network.TransportKind
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch

/**
 * PMD_ANDROID_WORKSPACE_HUB_V1
 *
 * One branded entry point for the restaurant app. The user explicitly chooses
 * the operational surface instead of every paired launch being forced into POS.
 */
@Composable
fun PmdWorkspaceHome(
    app: PayMyDineApplication,
    surfaces: Set<String>,
    online: Boolean,
    runtimeKind: TransportKind,
    onOpenPos: () -> Unit,
    onOpenKds: () -> Unit,
    onOpenReservations: () -> Unit,
) {
    val edge by EdgeRuntimeState.state.collectAsState()
    val canManageEdge = "manager" in surfaces
    val canPos = "pos" in surfaces || "waiter" in surfaces
    val canKds = "kds" in surfaces
    val canReservations = "reservations" in surfaces
    var queued by remember { mutableIntStateOf(app.syncRepository.outboxCount()) }
    val authScope = rememberCoroutineScope()
    var pendingSurface by remember { mutableStateOf<String?>(null) }
    var authUsername by remember { mutableStateOf("") }
    var authPassword by remember { mutableStateOf("") }
    var authError by remember { mutableStateOf<String?>(null) }
    var authBusy by remember { mutableStateOf(false) }

    fun openAuthorizedSurface(surface: String) {
        when (surface) {
            "pos" -> onOpenPos()
            "kds" -> onOpenKds()
            "reservations" -> onOpenReservations()
        }
    }

    fun requestWorkspace(surface: String) {
        if (surface == "reservations" && !online) {
            authError = "Reservations requires PayMyDine Cloud."
            pendingSurface = surface
            return
        }

        if (!online) {
            val sameWorkspace =
                app.credentials.preferredWorkspace() == surface &&
                    app.credentials.workspaceLeaseValid(surface)

            if (sameWorkspace) {
                openAuthorizedSurface(surface)
            } else {
                authError =
                    "برای ورود یا تغییر Workspace باید یک‌بار با اینترنت، نام کاربری و رمز عبور همین بخش تأیید شود."
                authUsername =
                    app.credentials.workspaceLeaseUsername(surface).orEmpty()
                authPassword = ""
                pendingSurface = surface
            }
            return
        }

        authUsername = app.credentials.workspaceLeaseUsername(surface).orEmpty()
        authPassword = ""
        authError = null
        pendingSurface = surface
    }

    LaunchedEffect(Unit) {
        while (isActive) {
            queued = withContext(Dispatchers.IO) {
                app.syncRepository.outboxCount()
            }
            delay(2_000)
        }
    }

    val connectionTitle = when {
        runtimeKind == TransportKind.EDGE -> "Restaurant Edge"
        online -> "PayMyDine Cloud"
        else -> "Offline on this tablet"
    }
    val connectionDetail = when {
        runtimeKind == TransportKind.EDGE ->
            "Local restaurant network is available."
        online ->
            "Cloud is connected. Local data stays ready for outages."
        else ->
            "Changes stay safely on this device until an authority is reachable."
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = PmdBackground,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 28.dp, vertical = 22.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(13.dp),
                ) {
                    Image(
                        painter = painterResource(R.drawable.pmd_brand_mark),
                        contentDescription = "PayMyDine",
                        modifier = Modifier.size(48.dp),
                    )
                    Column {
                        Text(
                            "PayMyDine",
                            color = PmdDeepGreen,
                            fontWeight = FontWeight.Black,
                            style = androidx.compose.material3.MaterialTheme.typography.headlineSmall,
                        )
                        Text(
                            app.bootstrapRepository.locationName()
                                ?: app.credentials.tenantHost().orEmpty(),
                            color = PmdMuted,
                            style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = if (runtimeKind == TransportKind.OFFLINE) {
                        Color(0xFFFFF4DF)
                    } else {
                        Color(0xFFE9F7F1)
                    },
                    border = BorderStroke(
                        1.dp,
                        if (runtimeKind == TransportKind.OFFLINE) {
                            Color(0xFFE8C77A)
                        } else {
                            Color(0xFFBFE1D2)
                        },
                    ),
                ) {
                    Text(
                        connectionTitle,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
                        color = PmdDeepGreen,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            Column {
                Text(
                    "Choose your workspace",
                    color = PmdText,
                    fontWeight = FontWeight.Black,
                    style = androidx.compose.material3.MaterialTheme.typography.headlineMedium,
                )
                Text(
                    "Cashier, Waiter, Kitchen and Reservations use the same paired PayMyDine device and restaurant identity.",
                    modifier = Modifier.padding(top = 5.dp),
                    color = PmdMuted,
                    style = androidx.compose.material3.MaterialTheme.typography.bodyMedium,
                )
            }

            BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
                if (maxWidth >= 760.dp) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        WorkspaceCard(
                            modifier = Modifier.weight(1f),
                            badge = "POS",
                            title = if ("waiter" in surfaces && "pos" in surfaces) {
                                "Cashier / Waiter"
                            } else if ("waiter" in surfaces) {
                                "Waiter"
                            } else {
                                "Cashier"
                            },
                            description = "Tables, menu, checks and order service. Works locally when Cloud is unavailable.",
                            state = if (canPos) "Ready" else "Not assigned",
                            enabled = canPos,
                            onClick = { requestWorkspace("pos") },
                        )
                        WorkspaceCard(
                            modifier = Modifier.weight(1f),
                            badge = "KDS",
                            title = "Kitchen Display",
                            description = "Kitchen tickets and preparation status. Uses Restaurant Edge on the LAN during WAN outages.",
                            state = if (canKds) "Local-first" else "Not assigned",
                            enabled = canKds,
                            onClick = { requestWorkspace("kds") },
                        )
                        WorkspaceCard(
                            modifier = Modifier.weight(1f),
                            badge = "RES",
                            title = "Reservations",
                            description = "Open the canonical PayMyDine reservation workspace with this paired identity.",
                            state = when {
                                !canReservations -> "Not assigned"
                                !online -> "Cloud required"
                                else -> "Ready"
                            },
                            enabled = canReservations && online,
                            onClick = { requestWorkspace("reservations") },
                        )
                    }
                } else {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        WorkspaceCard(
                            modifier = Modifier.fillMaxWidth(),
                            badge = "POS",
                            title = if ("waiter" in surfaces) "Cashier / Waiter" else "Cashier",
                            description = "Tables, menu, checks and local order service.",
                            state = if (canPos) "Ready" else "Not assigned",
                            enabled = canPos,
                            onClick = { requestWorkspace("pos") },
                        )
                        WorkspaceCard(
                            modifier = Modifier.fillMaxWidth(),
                            badge = "KDS",
                            title = "Kitchen Display",
                            description = "Kitchen tickets and LAN status updates.",
                            state = if (canKds) "Local-first" else "Not assigned",
                            enabled = canKds,
                            onClick = { requestWorkspace("kds") },
                        )
                        WorkspaceCard(
                            modifier = Modifier.fillMaxWidth(),
                            badge = "RES",
                            title = "Reservations",
                            description = "Canonical PayMyDine reservation workspace.",
                            state = when {
                                !canReservations -> "Not assigned"
                                !online -> "Cloud required"
                                else -> "Ready"
                            },
                            enabled = canReservations && online,
                            onClick = { requestWorkspace("reservations") },
                        )
                    }
                }
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, PmdLine),
                shape = RoundedCornerShape(18.dp),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(connectionTitle, color = PmdText, fontWeight = FontWeight.ExtraBold)
                            Text(
                                connectionDetail,
                                modifier = Modifier.padding(top = 3.dp),
                                color = PmdMuted,
                                style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                            )
                        }
                        Text(
                            "$queued queued",
                            color = if (queued > 0) PmdGreen else PmdMuted,
                            fontWeight = FontWeight.Bold,
                        )
                    }

                    if (canManageEdge) {
                        HorizontalDivider(
                            modifier = Modifier.padding(vertical = 13.dp),
                            color = Color(0xFFE7EFEC),
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Restaurant Edge", color = PmdText, fontWeight = FontWeight.ExtraBold)
                                Text(
                                    when {
                                        edge.running && edge.cloudRegistered ->
                                            "Running · Cloud registered · LAN authority ready"
                                        edge.running ->
                                            "Running · LAN authority ready"
                                        edge.enabled ->
                                            edge.lastError ?: "Starting local restaurant authority…"
                                        else ->
                                            "Enable this on the primary powered restaurant tablet."
                                    },
                                    modifier = Modifier.padding(top = 3.dp),
                                    color = PmdMuted,
                                    style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                                )
                            }
                            OutlinedButton(
                                onClick = {
                                    EdgeService.setEnabled(app, !edge.enabled)
                                },
                            ) {
                                Text(if (edge.enabled) "Disable" else "Enable")
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(2.dp))
            Text(
                "Android " + BuildConfig.VERSION_NAME + " · " +
                    app.bootstrapRepository.roleCode().orEmpty(),
                color = PmdMuted,
                style = androidx.compose.material3.MaterialTheme.typography.labelSmall,
            )
        }

        pendingSurface?.let { surface ->
            val title = when (surface) {
                "pos" -> "Cashier / Waiter"
                "kds" -> "Kitchen Display"
                else -> "Reservations"
            }
            AlertDialog(
                onDismissRequest = {
                    if (!authBusy) {
                        pendingSurface = null
                        authPassword = ""
                        authError = null
                    }
                },
                title = {
                    Text(
                        "Sign in to $title",
                        color = PmdText,
                        fontWeight = FontWeight.Black,
                    )
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            if (online) {
                                "Use the same PayMyDine username and password as the web platform. Access is checked for this workspace only."
                            } else {
                                "This workspace cannot be unlocked for the first time while Cloud is unavailable."
                            },
                            color = PmdMuted,
                        )
                        OutlinedTextField(
                            modifier = Modifier.fillMaxWidth(),
                            value = authUsername,
                            onValueChange = { authUsername = it },
                            enabled = online && !authBusy,
                            singleLine = true,
                            label = { Text("Username") },
                        )
                        OutlinedTextField(
                            modifier = Modifier.fillMaxWidth(),
                            value = authPassword,
                            onValueChange = { authPassword = it },
                            enabled = online && !authBusy,
                            singleLine = true,
                            visualTransformation = PasswordVisualTransformation(),
                            label = { Text("Password") },
                        )
                        authError?.let {
                            Text(
                                it,
                                color = androidx.compose.material3.MaterialTheme.colorScheme.error,
                                style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                },
                confirmButton = {
                    if (online) {
                        Button(
                            enabled =
                                !authBusy &&
                                    authUsername.isNotBlank() &&
                                    authPassword.length >= 6,
                            onClick = {
                                val host = app.credentials.tenantHost().orEmpty()
                                val token = app.credentials.deviceToken().orEmpty()
                                if (host.isBlank() || token.isBlank()) {
                                    authError = "This tablet must be paired again."
                                    return@Button
                                }

                                authBusy = true
                                authError = null
                                authScope.launch {
                                    runCatching {
                                        withContext(Dispatchers.IO) {
                                            MobileApiClient().authorizeWorkspace(
                                                tenantHost = host,
                                                deviceToken = token,
                                                surface = surface,
                                                username = authUsername,
                                                password = authPassword,
                                            )
                                        }
                                    }.onSuccess { result ->
                                        app.credentials.putWorkspaceLease(
                                            result.surface,
                                            result.username,
                                            result.leaseExpiresAt,
                                        )
                                        pendingSurface = null
                                        authPassword = ""
                                        authBusy = false
                                        openAuthorizedSurface(surface)
                                    }.onFailure { error ->
                                        authBusy = false
                                        authPassword = ""
                                        authError = error.message
                                            ?: "PayMyDine could not authorize this workspace."
                                    }
                                }
                            },
                        ) {
                            if (authBusy) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(18.dp),
                                    strokeWidth = 2.dp,
                                )
                            } else {
                                Text("Sign in")
                            }
                        }
                    }
                },
                dismissButton = {
                    TextButton(
                        enabled = !authBusy,
                        onClick = {
                            pendingSurface = null
                            authPassword = ""
                            authError = null
                        },
                    ) {
                        Text("Cancel")
                    }
                },
            )
        }
    }
}

@Composable
private fun WorkspaceCard(
    modifier: Modifier,
    badge: String,
    title: String,
    description: String,
    state: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (enabled) Color.White else Color(0xFFF0F3F2),
        ),
        border = BorderStroke(
            1.dp,
            if (enabled) PmdLine else Color(0xFFE1E6E4),
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Surface(
                modifier = Modifier.size(50.dp),
                shape = RoundedCornerShape(15.dp),
                color = if (enabled) PmdDeepGreen else Color(0xFFDDE4E1),
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        badge,
                        color = if (enabled) Color.White else PmdMuted,
                        fontWeight = FontWeight.Black,
                        style = androidx.compose.material3.MaterialTheme.typography.labelMedium,
                    )
                }
            }

            Text(
                title,
                color = if (enabled) PmdText else PmdMuted,
                fontWeight = FontWeight.Black,
                style = androidx.compose.material3.MaterialTheme.typography.titleLarge,
            )
            Text(
                description,
                color = PmdMuted,
                style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
            )
            Surface(
                shape = RoundedCornerShape(999.dp),
                color = if (enabled) Color(0xFFEAF7F2) else Color(0xFFE7ECEA),
            ) {
                Text(
                    state,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    color = if (enabled) PmdGreen else PmdMuted,
                    fontWeight = FontWeight.Bold,
                    style = androidx.compose.material3.MaterialTheme.typography.labelSmall,
                )
            }
            Button(
                modifier = Modifier.fillMaxWidth(),
                enabled = enabled,
                onClick = onClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = PmdDeepGreen,
                    contentColor = Color.White,
                    disabledContainerColor = Color(0xFFD9E0DE),
                    disabledContentColor = PmdMuted,
                ),
            ) {
                Text(if (enabled) "Open" else "Unavailable")
            }
        }
    }
}
