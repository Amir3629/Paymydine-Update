package com.paymydine.mobile

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.paymydine.mobile.ui.KdsScreen
import com.paymydine.mobile.ui.PmdBackground
import com.paymydine.mobile.ui.PmdDeepGreen
import com.paymydine.mobile.ui.PmdMuted
import com.paymydine.mobile.ui.PmdTheme

/**
 * PMD_ANDROID_KDS_ACTIVITY_V1
 *
 * Native local-first KDS entry point. KDS reads SQLite first and lets SyncEngine
 * choose trusted Edge/Cloud transport, so the screen remains useful during WAN
 * outages instead of depending on an Admin WebView.
 */
class KdsActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val app = application as PayMyDineApplication

        // PMD_ANDROID_WORKSPACE_ACTIVITY_GATE_V1
        if (!app.credentials.workspaceLeaseValid("kds")) {
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

        setContent {
            PmdTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = PmdBackground,
                ) {
                    Column(Modifier.fillMaxSize()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Image(
                                    painter = painterResource(R.drawable.pmd_brand_mark),
                                    contentDescription = "PayMyDine",
                                    modifier = Modifier.size(34.dp),
                                )
                                Column {
                                    Text(
                                        "Kitchen Display",
                                        color = PmdDeepGreen,
                                        fontWeight = FontWeight.Black,
                                    )
                                    Text(
                                        app.bootstrapRepository.locationName().orEmpty(),
                                        color = PmdMuted,
                                        style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                                    )
                                }
                            }
                            OutlinedButton(onClick = { finish() }) {
                                Text("Workspaces")
                            }
                        }

                        KdsScreen(
                            app = app,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }
    }
}
