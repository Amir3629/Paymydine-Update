package com.paymydine.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.paymydine.mobile.printer.NetworkReceiptPrinter
import com.paymydine.mobile.printer.PrinterConfig
import com.paymydine.mobile.printer.PrinterConfigStore
import kotlinx.coroutines.launch

/**
 * PMD_ANDROID_PRINTER_SETUP_V18
 *
 * Shared receipt-printer setup for the unified Device App. Generic LAN
 * ESC/POS printers are supported directly (TCP/9100 by default). Vendor USB,
 * Bluetooth and built-in printer SDKs remain separate hardware adapters.
 */
class PrinterSetupActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val store = remember { PrinterConfigStore(this) }
            val initial = remember { store.load() }
            val scope = rememberCoroutineScope()

            var enabled by remember { mutableStateOf(initial.enabled) }
            var host by remember { mutableStateOf(initial.host) }
            var port by remember { mutableStateOf(initial.port.toString()) }
            var autoPrint by remember {
                mutableStateOf(initial.autoPrintKioskReceipt)
            }
            var status by remember { mutableStateOf("") }
            var busy by remember { mutableStateOf(false) }

            fun currentConfig(): PrinterConfig =
                PrinterConfig(
                    enabled = enabled,
                    host = host.trim(),
                    port = port.toIntOrNull()?.coerceIn(1, 65535) ?: 9100,
                    autoPrintKioskReceipt = autoPrint,
                )

            Surface(modifier = Modifier.fillMaxSize()) {
                Column(
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(28.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    Text(
                        "Receipt printer",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Black,
                    )
                    Text(
                        "Shared by Cashier, Waiter and Kiosk on this device. " +
                            "Connect a LAN ESC/POS printer by IP address.",
                        style = MaterialTheme.typography.bodyMedium,
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(
                            checked = enabled,
                            onCheckedChange = { enabled = it },
                        )
                        Text("Use receipt printer", fontWeight = FontWeight.Bold)
                    }

                    OutlinedTextField(
                        value = host,
                        onValueChange = { host = it.trim() },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Printer IP / hostname") },
                        placeholder = { Text("192.168.1.50") },
                        singleLine = true,
                    )

                    OutlinedTextField(
                        value = port,
                        onValueChange = {
                            port = it.filter(Char::isDigit).take(5)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Port") },
                        placeholder = { Text("9100") },
                        singleLine = true,
                        keyboardOptions =
                            KeyboardOptions(keyboardType = KeyboardType.Number),
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(
                            checked = autoPrint,
                            onCheckedChange = { autoPrint = it },
                        )
                        Text("Automatically print kiosk receipt after payment")
                    }

                    Button(
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !busy,
                        onClick = {
                            store.save(currentConfig())
                            status = "Printer settings saved."
                        },
                    ) {
                        Text("Save printer")
                    }

                    OutlinedButton(
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !busy && enabled && host.isNotBlank(),
                        onClick = {
                            store.save(currentConfig())
                            busy = true
                            status = "Sending test receipt…"
                            scope.launch {
                                val result = NetworkReceiptPrinter.test(this@PrinterSetupActivity)
                                status =
                                    result.fold(
                                        onSuccess = { "Test receipt sent successfully." },
                                        onFailure = { it.message ?: "Printer test failed." },
                                    )
                                busy = false
                            }
                        },
                    ) {
                        Text("Test print", fontWeight = FontWeight.Bold)
                    }

                    if (status.isNotBlank()) {
                        Text(
                            status,
                            color =
                                if (status.contains("failed", true)) {
                                    MaterialTheme.colorScheme.error
                                } else {
                                    MaterialTheme.colorScheme.primary
                                },
                        )
                    }

                    OutlinedButton(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { finish() },
                    ) {
                        Text("Back")
                    }
                }
            }
        }
    }
}
