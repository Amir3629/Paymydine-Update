package com.paymydine.mobile.hardware

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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * PMD_ANDROID_PRINTER_SETUP_V18
 *
 * One printer setup surface shared by kiosk, cashier and waiter modes.
 */
class PrinterSetupActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PrinterSetupScreen(onClose = { finish() })
        }
    }

    companion object {
        fun intent(context: Context): Intent =
            Intent(context, PrinterSetupActivity::class.java)
    }
}

@Composable
private fun PrinterSetupScreen(
    onClose: () -> Unit,
) {
    val context = LocalContext.current
    val initial = remember { ReceiptPrinterManager.load(context) }
    val scope = rememberCoroutineScope()

    var enabled by remember { mutableStateOf(initial.enabled) }
    var host by remember { mutableStateOf(initial.host) }
    var port by remember { mutableStateOf(initial.port.toString()) }
    var autoPrintKiosk by remember { mutableStateOf(initial.autoPrintKiosk) }
    var status by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }

    fun currentConfig(): ReceiptPrinterConfig =
        ReceiptPrinterConfig(
            enabled = enabled,
            host = host.trim(),
            port = port.toIntOrNull()?.coerceIn(1, 65535) ?: 9100,
            autoPrintKiosk = autoPrintKiosk,
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
            verticalArrangement = Arrangement.Top,
        ) {
            Text(
                "Receipt printer",
                color = Color(0xFF063F35),
                fontSize = 30.sp,
                fontWeight = FontWeight.Black,
            )
            Text(
                "Shared hardware setup for Kiosk, Cashier and Waiter. " +
                    "V18 supports LAN ESC/POS printers (usually port 9100).",
                modifier = Modifier.padding(top = 8.dp),
                color = Color(0xFF6B7C78),
                fontSize = 15.sp,
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 28.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "Enable receipt printer",
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF17342F),
                    )
                    Text(
                        "Use this printer from PayMyDine device modes.",
                        color = Color(0xFF6B7C78),
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
                    .padding(top = 20.dp),
                label = { Text("Printer IP / host") },
                placeholder = { Text("192.168.1.50") },
                singleLine = true,
                enabled = !busy,
            )

            OutlinedTextField(
                value = port,
                onValueChange = { port = it.filter(Char::isDigit).take(5) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                label = { Text("Port") },
                placeholder = { Text("9100") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                enabled = !busy,
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 18.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "Auto-print kiosk receipt",
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF17342F),
                    )
                    Text(
                        "Print after the paid order is confirmed.",
                        color = Color(0xFF6B7C78),
                        fontSize = 13.sp,
                    )
                }
                Switch(
                    checked = autoPrintKiosk,
                    onCheckedChange = { autoPrintKiosk = it },
                    enabled = enabled && !busy,
                )
            }

            Button(
                onClick = {
                    ReceiptPrinterManager.save(context, currentConfig())
                    status = "Printer settings saved."
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 28.dp),
                enabled = !busy && (!enabled || host.isNotBlank()),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF0A6B57),
                ),
                shape = RoundedCornerShape(16.dp),
            ) {
                Text(
                    "Save printer",
                    modifier = Modifier.padding(vertical = 5.dp),
                    fontWeight = FontWeight.Black,
                )
            }

            OutlinedButton(
                onClick = {
                    val config = currentConfig()
                    ReceiptPrinterManager.save(context, config)
                    busy = true
                    status = "Sending test receipt…"
                    scope.launch {
                        val result = withContext(Dispatchers.IO) {
                            ReceiptPrinterManager.testPrint(context, config)
                        }
                        busy = false
                        status = result.fold(
                            onSuccess = { "Test receipt sent successfully." },
                            onFailure = { it.message ?: "Printer test failed." },
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                enabled = !busy && enabled && host.isNotBlank(),
                shape = RoundedCornerShape(16.dp),
            ) {
                Text(
                    if (busy) "Testing…" else "Test print",
                    modifier = Modifier.padding(vertical = 5.dp),
                    fontWeight = FontWeight.Black,
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
                            Color(0xFF0A6B57)
                        },
                    fontWeight = FontWeight.Bold,
                )
            }

            OutlinedButton(
                onClick = onClose,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 28.dp),
                shape = RoundedCornerShape(16.dp),
            ) {
                Text("Back", fontWeight = FontWeight.Bold)
            }
        }
    }
}
