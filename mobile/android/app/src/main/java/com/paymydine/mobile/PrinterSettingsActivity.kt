package com.paymydine.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paymydine.mobile.hardware.printing.PrinterManager
import kotlinx.coroutines.launch

/**
 * PMD_SHARED_PRINTER_SETUP_V18
 *
 * Hardware setup belongs to the unified Device App rather than one Cashier or
 * Kiosk screen. V18 exposes a shared LAN ESC/POS configuration and test print.
 */
class PrinterSettingsActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val manager = PrinterManager(this)
        setContent {
            MaterialTheme {
                PrinterSettingsScreen(
                    manager = manager,
                    onBack = { finish() },
                )
            }
        }
    }
}

@Composable
private fun PrinterSettingsScreen(
    manager: PrinterManager,
    onBack: () -> Unit,
) {
    val initial = remember { manager.config() }
    var enabled by remember { mutableStateOf(initial.enabled) }
    var host by remember { mutableStateOf(initial.host) }
    var port by remember { mutableStateOf(initial.port.toString()) }
    var status by remember { mutableStateOf("") }
    var testing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFFF4F8F6),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 30.dp, vertical = 34.dp),
        ) {
            OutlinedButton(onClick = onBack) {
                Text("Back")
            }

            Text(
                "Receipt printer",
                modifier = Modifier.padding(top = 28.dp),
                color = Color(0xFF073F38),
                fontSize = 30.sp,
                fontWeight = FontWeight.Black,
            )
            Text(
                "Shared by Kiosk, Cashier and Waiter on this PayMyDine device.",
                modifier = Modifier.padding(top = 7.dp),
                color = Color(0xFF617773),
                fontSize = 15.sp,
            )

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 26.dp),
                shape = RoundedCornerShape(22.dp),
                color = Color.White,
                shadowElevation = 1.dp,
            ) {
                Column(
                    modifier = Modifier.padding(22.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Print receipts",
                                color = Color(0xFF073F38),
                                fontWeight = FontWeight.Black,
                                fontSize = 18.sp,
                            )
                            Text(
                                "Automatically print a receipt after a successful kiosk payment.",
                                modifier = Modifier.padding(top = 3.dp),
                                color = Color(0xFF6B7C79),
                                fontSize = 13.sp,
                            )
                        }
                        Switch(
                            checked = enabled,
                            onCheckedChange = { enabled = it },
                        )
                    }

                    OutlinedTextField(
                        value = host,
                        onValueChange = { host = it.trim() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 22.dp),
                        label = { Text("Printer IP / hostname") },
                        placeholder = { Text("192.168.1.50") },
                        singleLine = true,
                    )

                    OutlinedTextField(
                        value = port,
                        onValueChange = {
                            port = it.filter(Char::isDigit).take(5)
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp),
                        label = { Text("TCP port") },
                        placeholder = { Text("9100") },
                        keyboardOptions =
                            KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                    )

                    Text(
                        "V18 supports standard network ESC/POS printers on the same restaurant LAN. USB/vendor SDK support can be added without changing the shared printer profile.",
                        modifier = Modifier.padding(top = 12.dp),
                        color = Color(0xFF788884),
                        fontSize = 12.sp,
                    )

                    Button(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 22.dp)
                            .height(54.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF08745F),
                            contentColor = Color.White,
                        ),
                        enabled =
                            host.isNotBlank() &&
                                (port.toIntOrNull() ?: 0) in 1..65535,
                        onClick = {
                            val parsedPort = port.toIntOrNull() ?: 9100
                            manager.save(enabled, host, parsedPort)
                            status = "Printer settings saved."
                        },
                    ) {
                        Text(
                            "Save printer",
                            fontWeight = FontWeight.Black,
                        )
                    }

                    OutlinedButton(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp)
                            .height(54.dp),
                        enabled =
                            !testing &&
                                host.isNotBlank() &&
                                (port.toIntOrNull() ?: 0) in 1..65535,
                        onClick = {
                            val parsedPort = port.toIntOrNull() ?: 9100
                            manager.save(true, host, parsedPort)
                            enabled = true
                            testing = true
                            status = "Sending test print…"
                            scope.launch {
                                val result = manager.testPrint()
                                testing = false
                                status =
                                    result.fold(
                                        onSuccess = { "Test print sent successfully." },
                                        onFailure = {
                                            "Printer test failed: " +
                                                (it.message ?: "Connection error")
                                        },
                                    )
                            }
                        },
                    ) {
                        Text(
                            if (testing) "Testing…" else "Test print",
                            fontWeight = FontWeight.Bold,
                        )
                    }

                    if (status.isNotBlank()) {
                        Text(
                            status,
                            modifier = Modifier.padding(top = 16.dp),
                            color =
                                if (status.contains("failed", ignoreCase = true)) {
                                    MaterialTheme.colorScheme.error
                                } else {
                                    Color(0xFF08745F)
                                },
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }

            Spacer(Modifier.height(28.dp))
        }
    }
}
