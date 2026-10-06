package com.paymydine.mobile

import android.os.Bundle
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.lifecycle.lifecycleScope
import com.paymydine.mobile.hardware.PmdPrinterManager
import com.paymydine.mobile.tabledisplay.DeviceHardwareState
import com.paymydine.mobile.tabledisplay.DevicePlatformClient
import com.paymydine.mobile.tabledisplay.DeviceTerminalOption
import com.paymydine.mobile.tabledisplay.SecureStore
import kotlinx.coroutines.launch

/**
 * PMD_DEVICE_HARDWARE_SETUP_V18
 *
 * Shared local hardware setup for the unified PayMyDine Device App.
 * Receipt-printer networking is configured on-device. A paired kiosk can also
 * bind itself to one of the restaurant's server-approved payment terminals.
 */
class DeviceHardwareSetupActivity : ComponentActivity() {
    private val client = DevicePlatformClient()
    private lateinit var kioskStore: SecureStore
    private lateinit var terminalSpinner: Spinner
    private lateinit var terminalStatus: TextView
    private var terminals: List<DeviceTerminalOption> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        kioskStore = SecureStore(
            context = this,
            storeName = "pmd-kiosk-v1",
            keyAlias = "pmd-kiosk-v1",
        )

        val density = resources.displayMetrics.density
        fun dp(value: Int) = (value * density).toInt()

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(28), dp(24), dp(40))
        }

        content.addView(TextView(this).apply {
            text = "PayMyDine hardware setup"
            textSize = 27f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })
        content.addView(TextView(this).apply {
            text = "Receipt printer"
            textSize = 20f
            setPadding(0, dp(28), 0, dp(8))
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })

        val currentPrinter = PmdPrinterManager.config(this)
        val printerHost = EditText(this).apply {
            hint = "Printer IP / host (for example 192.168.1.45)"
            setText(currentPrinter.host)
            isSingleLine = true
        }
        val printerPort = EditText(this).apply {
            hint = "Port"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
            setText(currentPrinter.port.toString())
            isSingleLine = true
        }
        val printerEnabled = CheckBox(this).apply {
            text = "Print receipt automatically after kiosk payment"
            isChecked = currentPrinter.enabled
        }
        content.addView(printerHost, ViewGroup.LayoutParams(-1, dp(56)))
        content.addView(printerPort, ViewGroup.LayoutParams(-1, dp(56)))
        content.addView(printerEnabled)

        val printerActions = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        val savePrinter = Button(this).apply { text = "Save printer" }
        val testPrinter = Button(this).apply { text = "Test print" }
        printerActions.addView(savePrinter, LinearLayout.LayoutParams(0, dp(52), 1f))
        printerActions.addView(testPrinter, LinearLayout.LayoutParams(0, dp(52), 1f))
        content.addView(printerActions)

        savePrinter.setOnClickListener {
            val port = printerPort.text.toString().toIntOrNull() ?: 9100
            PmdPrinterManager.save(
                this,
                printerHost.text.toString(),
                port,
                printerEnabled.isChecked,
            )
            Toast.makeText(this, "Printer settings saved.", Toast.LENGTH_SHORT).show()
        }
        testPrinter.setOnClickListener {
            val port = printerPort.text.toString().toIntOrNull() ?: 9100
            PmdPrinterManager.save(
                this,
                printerHost.text.toString(),
                port,
                printerEnabled.isChecked,
            )
            testPrinter.isEnabled = false
            lifecycleScope.launch {
                val result = PmdPrinterManager.test(this@DeviceHardwareSetupActivity)
                testPrinter.isEnabled = true
                Toast.makeText(
                    this@DeviceHardwareSetupActivity,
                    result.fold(
                        onSuccess = { "Test receipt sent." },
                        onFailure = { it.message ?: "Printer test failed." },
                    ),
                    Toast.LENGTH_LONG,
                ).show()
            }
        }

        content.addView(TextView(this).apply {
            text = "Kiosk payment terminal"
            textSize = 20f
            setPadding(0, dp(34), 0, dp(8))
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })
        terminalStatus = TextView(this).apply {
            text = if (kioskStore.isPaired()) {
                "Loading linked terminals…"
            } else {
                "Pair this device as a Kiosk first to link a payment terminal."
            }
            setPadding(0, 0, 0, dp(10))
        }
        terminalSpinner = Spinner(this)
        content.addView(terminalStatus)
        content.addView(terminalSpinner, ViewGroup.LayoutParams(-1, dp(56)))

        val linkTerminal = Button(this).apply {
            text = "Link selected terminal"
            isEnabled = kioskStore.isPaired()
        }
        content.addView(linkTerminal, ViewGroup.LayoutParams(-1, dp(54)))
        linkTerminal.setOnClickListener {
            val selected = terminals.getOrNull(terminalSpinner.selectedItemPosition) ?: return@setOnClickListener
            val host = kioskStore.host().orEmpty()
            val token = kioskStore.token().orEmpty()
            if (host.isBlank() || token.isBlank()) return@setOnClickListener
            linkTerminal.isEnabled = false
            lifecycleScope.launch {
                runCatching {
                    client.configureTerminal(host, token, selected.id)
                }.onSuccess {
                    terminalStatus.text = "Linked: " + selected.name
                }.onFailure {
                    terminalStatus.text = it.message ?: "Terminal link failed."
                }
                linkTerminal.isEnabled = true
            }
        }

        val close = Button(this).apply {
            text = "Done"
            setOnClickListener { finish() }
        }
        content.addView(close, LinearLayout.LayoutParams(-1, dp(54)).apply {
            topMargin = dp(34)
        })

        setContentView(
            ScrollView(this).apply { addView(content) },
        )

        if (kioskStore.isPaired()) loadTerminals()
    }

    private fun loadTerminals() {
        val host = kioskStore.host().orEmpty()
        val token = kioskStore.token().orEmpty()
        if (host.isBlank() || token.isBlank()) return

        lifecycleScope.launch {
            runCatching { client.hardware(host, token) }
                .onSuccess(::showHardware)
                .onFailure {
                    terminalStatus.text = it.message ?: "Could not load terminals."
                }
        }
    }

    private fun showHardware(state: DeviceHardwareState) {
        terminals = state.terminals
        terminalSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            terminals.map { option ->
                option.name + " · " + option.providerCode.uppercase()
            },
        )
        val selectedIndex = terminals.indexOfFirst { it.id == state.selectedTerminalId }
        if (selectedIndex >= 0) terminalSpinner.setSelection(selectedIndex)
        terminalStatus.text =
            if (terminals.isEmpty()) {
                "No active payment terminal is configured for this restaurant."
            } else if (selectedIndex >= 0) {
                "Linked: " + terminals[selectedIndex].name
            } else {
                "Choose the terminal physically connected to this kiosk."
            }
    }
}
