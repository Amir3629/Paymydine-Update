package com.paymydine.mobile

import android.content.Context
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.paymydine.mobile.printer.PmdPrinterConfig
import com.paymydine.mobile.printer.PmdPrinterManager

/**
 * PMD_SHARED_PRINTER_SETUP_V18
 * Shared hardware setup for kiosk, cashier and waiter use.
 */
class PrinterSetupActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PrinterSetupScreen(
                manager = PmdPrinterManager(this),
                onClose = { finish() },
            )
        }
    }

    companion object {
        fun intent(context: Context): Intent =
            Intent(context, PrinterSetupActivity::class.java)
    }
}

@Composable
private fun PrinterSetupScreen(
    manager: PmdPrinterManager,
    onClose: () -> Unit,
) {
    val initial = remember { manager.config() }
    var name by remember { mutableStateOf(initial.name) }
    var host by remember { mutableStateOf(initial.host) }
    var port by remember { mutableStateOf(initial.port.toString()) }
    var autoPrint by remember { mutableStateOf(initial.autoPrintReceipts) }
    var status by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }

    fun currentConfig(): PmdPrinterConfig =
        PmdPrinterConfig(
            name = name.trim().ifBlank { "Receipt printer" },
            host = host.trim(),
            port = port.toIntOrNull()?.coerceIn(1, 65535) ?: 9100,
            autoPrintReceipts = autoPrint,
        )

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFFF4F8F6),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 28.dp, vertical = 34.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                "Printer setup",
                color = Color(0xFF073F35),
                fontWeight = FontWeight.Black,
                style = MaterialTheme.typography.headlineMedium,
            )
            Text(
                "Shared receipt printer for Kiosk, Cashier and Waiter. " +
                    "Use the printer LAN IP address; ESC/POS printers normally use port 9100.",
                color = Color(0xFF637872),
                style = MaterialTheme.typography.bodyMedium,
            )

            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = name,
                onValueChange = { name = it },
                label = { Text("Printer name") },
                singleLine = true,
            )
            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = host,
                onValueChange = { host = it },
                label = { Text("Printer IP / hostname") },
                placeholder = { Text("192.168.1.50") },
                singleLine = true,
            )
            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = port,
                onValueChange = { port = it.filter(Char::isDigit).take(5) },
                label = { Text("Port") },
                placeholder = { Text("9100") },
                singleLine = true,
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(
                    checked = autoPrint,
                    onCheckedChange = { autoPrint = it },
                )
                Text(
                    "Automatically print paid kiosk receipts",
                    color = Color(0xFF17342F),
                    fontWeight = FontWeight.Bold,
                )
            }

            Button(
                modifier = Modifier.fillMaxWidth(),
                enabled = !busy && host.isNotBlank(),
                shape = RoundedCornerShape(18.dp),
                onClick = {
                    val config = currentConfig()
                    manager.save(config)
                    busy = true
                    status = "Testing printer..."
                    Thread {
                        val result = manager.testPrint()
                        runOnUiThread {
                            busy = false
                            status =
                                result.fold(
                                    onSuccess = { "Printer connected. Test receipt sent." },
                                    onFailure = { error ->
                                        "Printer error: " + (error.message ?: "Connection failed")
                                    },
                                )
                        }
                    }.start()
                },
            ) {
                Text("Save & test print", fontWeight = FontWeight.Black)
            }

            OutlinedButton(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    manager.save(currentConfig())
                    status = "Printer settings saved."
                },
            ) {
                Text("Save without test")
            }

            if (status.isNotBlank()) {
                Text(
                    status,
                    color = if (status.startsWith("Printer error")) {
                        MaterialTheme.colorScheme.error
                    } else {
                        Color(0xFF0A6B57)
                    },
                    fontWeight = FontWeight.Bold,
                )
            }

            OutlinedButton(
                modifier = Modifier.fillMaxWidth(),
                onClick = onClose,
            ) {
                Text("Back")
            }
        }
    }
}
