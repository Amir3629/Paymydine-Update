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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import com.paymydine.mobile.hardware.ReceiptPrinterManager
import kotlinx.coroutines.launch

/**
 * PMD_ANDROID_HARDWARE_SETUP_V17
 *
 * Shared Device App hardware setup. Payment terminals stay centrally managed
 * in PayMyDine Devices; the local receipt printer is stored once on this
 * Android device and can be reused by kiosk/cashier/waiter flows.
 */
class HardwareSetupActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            MaterialTheme {
                HardwareSetupScreen(
                    printer = remember { ReceiptPrinterManager(this) },
                    onClose = { finish() },
                )
            }
        }
    }
}

@Composable
private fun HardwareSetupScreen(
    printer: ReceiptPrinterManager,
    onClose: () -> Unit,
) {
    val initial = remember { printer.settings() }
    var host by remember { mutableStateOf(initial.host) }
    var port by remember { mutableStateOf(initial.port.toString()) }
    var enabled by remember { mutableStateOf(initial.enabled) }
    var message by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Surface(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(28.dp),
            verticalArrangement = Arrangement.Top,
        ) {
            Text(
                "Device hardware",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Black,
            )
            Text(
                "Payment terminal",
                modifier = Modifier.padding(top = 28.dp),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
            )
            Text(
                "Kiosk payments use the active terminal configured for this restaurant in PayMyDine Devices. Wallet and PayPal checkout are not used on the kiosk.",
                modifier = Modifier.padding(top = 6.dp),
                style = MaterialTheme.typography.bodyLarge,
            )

            Text(
                "Receipt printer",
                modifier = Modifier.padding(top = 30.dp),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
            )
            Text(
                "Standard LAN / ESC-POS printer. Most receipt printers use port 9100.",
                modifier = Modifier.padding(top = 6.dp),
                style = MaterialTheme.typography.bodyMedium,
            )

            OutlinedTextField(
                value = host,
                onValueChange = { host = it.trim() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 18.dp),
                label = { Text("Printer IP / host") },
                placeholder = { Text("192.168.1.50") },
                singleLine = true,
            )
            OutlinedTextField(
                value = port,
                onValueChange = { port = it.filter(Char::isDigit).take(5) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                label = { Text("Port") },
                placeholder = { Text("9100") },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Number,
                ),
                singleLine = true,
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 18.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Use receipt printer", fontWeight = FontWeight.Bold)
                    Text(
                        "Automatically available to Device App workspaces.",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                Switch(
                    checked = enabled,
                    onCheckedChange = { enabled = it },
                )
            }

            message?.let {
                Text(
                    it,
                    modifier = Modifier.padding(top = 14.dp),
                    color = if (it.startsWith("Printer ready")) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.error
                    },
                    fontWeight = FontWeight.Bold,
                )
            }

            Button(
                onClick = {
                    val parsedPort = port.toIntOrNull() ?: 0
                    runCatching {
                        printer.save(host, parsedPort, enabled)
                    }.onSuccess {
                        message = "Printer settings saved."
                    }.onFailure {
                        message = it.message ?: "Printer settings are invalid."
                    }
                },
                enabled = !busy,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp)
                    .height(54.dp),
            ) {
                Text("Save printer", fontWeight = FontWeight.Bold)
            }

            OutlinedButton(
                onClick = {
                    val parsedPort = port.toIntOrNull() ?: 0
                    val saved = runCatching {
                        printer.save(host, parsedPort, enabled = true)
                    }
                    if (saved.isFailure) {
                        message =
                            saved.exceptionOrNull()?.message
                                ?: "Printer settings are invalid."
                        return@OutlinedButton
                    }

                    enabled = true
                    busy = true
                    message = "Sending test receipt…"
                    scope.launch {
                        val result = printer.testPrint()
                        busy = false
                        message =
                            result.fold(
                                onSuccess = { "Printer ready — test receipt sent." },
                                onFailure = {
                                    it.message
                                        ?: "Printer did not accept the test receipt."
                                },
                            )
                    }
                },
                enabled = !busy,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp)
                    .height(54.dp),
            ) {
                Text("Save & test print", fontWeight = FontWeight.Bold)
            }

            Spacer(Modifier.height(24.dp))

            OutlinedButton(
                onClick = onClose,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Close")
            }
        }
    }
}
