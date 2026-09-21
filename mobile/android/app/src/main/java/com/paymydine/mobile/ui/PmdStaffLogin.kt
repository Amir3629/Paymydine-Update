package com.paymydine.mobile.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.R
import com.paymydine.mobile.network.MobileApiClient
import com.paymydine.mobile.network.WorkspaceAuthorizationResult
import com.paymydine.mobile.security.StaffSession
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * PMD_ANDROID_DIRECT_STAFF_LOGIN_V1
 *
 * No workspace chooser. Restaurant identity is shown first, then the staff
 * member signs in once and the server-selected role route opens directly.
 */
@Composable
fun PmdStaffLogin(
    app: PayMyDineApplication,
    online: Boolean,
    onAuthorized: (WorkspaceAuthorizationResult) -> Unit,
    onContinueOffline: (StaffSession) -> Unit,
) {
    val scope = rememberCoroutineScope()
    val api = remember { MobileApiClient() }
    val remembered = remember { app.credentials.staffSession() }

    var username by remember {
        mutableStateOf(remembered?.username.orEmpty())
    }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val restaurant = app.bootstrapRepository.locationName()
        ?: app.credentials.tenantHost()
            ?.substringBefore(".paymydine.com")
            ?.replaceFirstChar { it.uppercase() }
        ?: "PayMyDine Restaurant"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 30.dp, vertical = 34.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Image(
                painter = painterResource(R.drawable.pmd_brand_mark),
                contentDescription = "PayMyDine",
                modifier = Modifier.size(58.dp),
            )
            Column {
                Text(
                    restaurant,
                    color = PmdDeepGreen,
                    fontWeight = FontWeight.Black,
                    style = MaterialTheme.typography.headlineSmall,
                )
                Text(
                    "PayMyDine",
                    color = PmdMuted,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }

        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 24.dp),
            shape = RoundedCornerShape(22.dp),
            color = Color.White,
            border = BorderStroke(1.dp, PmdLine),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(22.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Text(
                    "Sign in",
                    color = PmdText,
                    fontWeight = FontWeight.Black,
                    style = MaterialTheme.typography.headlineSmall,
                )
                Text(
                    "Use your normal PayMyDine username and password. Your role decides which page opens.",
                    color = PmdMuted,
                    style = MaterialTheme.typography.bodyMedium,
                )

                OutlinedTextField(
                    modifier = Modifier.fillMaxWidth(),
                    value = username,
                    onValueChange = {
                        username = it
                        error = null
                    },
                    enabled = online && !busy,
                    singleLine = true,
                    label = { Text("Username") },
                    placeholder = { Text("Your PayMyDine username") },
                )

                OutlinedTextField(
                    modifier = Modifier.fillMaxWidth(),
                    value = password,
                    onValueChange = {
                        password = it
                        error = null
                    },
                    enabled = online && !busy,
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    label = { Text("Password") },
                )

                Button(
                    modifier = Modifier.fillMaxWidth(),
                    enabled =
                        online &&
                            !busy &&
                            username.isNotBlank() &&
                            password.length >= 6,
                    onClick = {
                        val host = app.credentials.tenantHost().orEmpty()
                        val token = app.credentials.deviceToken().orEmpty()
                        if (host.isBlank() || token.isBlank()) {
                            error = "This Android device must be connected to the restaurant again."
                            return@Button
                        }

                        busy = true
                        error = null
                        scope.launch {
                            runCatching {
                                withContext(Dispatchers.IO) {
                                    api.authorizeStaff(
                                        tenantHost = host,
                                        deviceToken = token,
                                        username = username,
                                        password = password,
                                    )
                                }
                            }.onSuccess {
                                password = ""
                                busy = false
                                onAuthorized(it)
                            }.onFailure {
                                password = ""
                                busy = false
                                error = it.message ?: "PayMyDine sign-in failed."
                            }
                        }
                    },
                ) {
                    if (busy) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(19.dp),
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text("Sign in")
                    }
                }

                if (!online) {
                    val offlineSession = remembered
                        ?.takeIf {
                            it.expiresAtEpochSeconds >
                                System.currentTimeMillis() / 1000L
                        }
                        ?.takeIf { it.surface == "pos" || it.surface == "kds" }

                    if (offlineSession != null) {
                        Text(
                            "PayMyDine Cloud is offline. A previously verified local session is available.",
                            color = PmdMuted,
                            style = MaterialTheme.typography.bodySmall,
                        )
                        Button(
                            modifier = Modifier.fillMaxWidth(),
                            onClick = { onContinueOffline(offlineSession) },
                        ) {
                            Text(
                                "Continue offline as " +
                                    offlineSession.staffName
                                        .ifBlank { offlineSession.username },
                            )
                        }
                    } else {
                        Text(
                            "Internet is required to verify a new staff login. Previously verified POS/KDS sessions can continue offline.",
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }

                error?.let {
                    Text(
                        it,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        }
    }
}
