package com.paymydine.tabledisplay

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.produceState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import java.text.NumberFormat
import java.util.Currency

private val PmdGreen = Color(0xFF0D6B4F)
private val PmdDark = Color(0xFF0B1713)
private val PmdCream = Color(0xFFF4F1E7)
private val PmdMuted = Color(0xFF718078)
private val PmdBlue = Color(0xFF173E64)
private val PmdAmber = Color(0xFF76511A)
private val PmdRed = Color(0xFF6E3434)

private enum class Screen {
    SETUP,
    TABLES,
    DISPLAY,
}

@Composable
fun TableDisplayApp(
    store: SecureStore,
    api: ApiClient,
    paymentBridge: PaymentBridge,
) {
    MaterialTheme {
        var screen by remember {
            mutableStateOf(
                if (store.isPaired()) Screen.DISPLAY else Screen.SETUP,
            )
        }
        var tables by remember { mutableStateOf<List<DeviceTable>>(emptyList()) }
        var displayState by remember { mutableStateOf<DisplayState?>(null) }
        var loading by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        var connected by remember { mutableStateOf(true) }
        var lastPaymentEventKey by remember { mutableStateOf<String?>(null) }
        var lastPresentedReactionKey by remember { mutableStateOf<String?>(null) }
        var reactionVisibleUntil by remember { mutableStateOf(0L) }
        val scope = rememberCoroutineScope()

        suspend fun loadTables() {
            val host = store.host() ?: return
            val token = store.token() ?: return
            loading = true
            error = null
            try {
                tables = api.tables(host, token)
                screen = Screen.TABLES
            } catch (t: Throwable) {
                error = t.message ?: "Tables could not be loaded."
            } finally {
                loading = false
            }
        }

        suspend fun loadDisplayState() {
            val host = store.host() ?: run {
                screen = Screen.SETUP
                return
            }
            val token = store.token() ?: run {
                screen = Screen.SETUP
                return
            }

            try {
                val next = api.state(host, token)
                val currentEvent = next.event
                val nowMs = System.currentTimeMillis()

                displayState =
                    if (
                        currentEvent.type == "idle" ||
                        currentEvent.type == "table_unavailable" ||
                        currentEvent.type == "payment_requested"
                    ) {
                        next
                    } else if (currentEvent.key != lastPresentedReactionKey) {
                        lastPresentedReactionKey = currentEvent.key
                        reactionVisibleUntil = nowMs + 2_200L
                        next
                    } else if (nowMs < reactionVisibleUntil) {
                        next
                    } else {
                        next.copy(
                            event = currentEvent.copy(
                                type = "idle",
                                key = "idle",
                                headline = "Scan to order",
                                message = "",
                                orderId = 0L,
                                amount = 0.0,
                            ),
                        )
                    }

                connected = true
                error = null
                screen = Screen.DISPLAY

                if (
                    currentEvent.type == "payment_requested" &&
                    currentEvent.key.isNotBlank() &&
                    currentEvent.key != lastPaymentEventKey
                ) {
                    lastPaymentEventKey = currentEvent.key
                    runCatching { paymentBridge.startPayment(currentEvent) }
                }
            } catch (_: TableNotBoundException) {
                connected = true
                loadTables()
            } catch (t: Throwable) {
                connected = false
                if (displayState == null) {
                    error = t.message ?: "Connection unavailable."
                }
            }
        }

        LaunchedEffect(screen) {
            if (screen == Screen.DISPLAY && store.isPaired()) {
                while (true) {
                    loadDisplayState()
                    delay(2_000)
                }
            }
        }

        Surface(
            modifier = Modifier.fillMaxSize(),
            color = PmdCream,
        ) {
            when (screen) {
                Screen.SETUP -> SetupScreen(
                    loading = loading,
                    error = error,
                    initialHost = store.host() ?: "tomo.paymydine.com",
                    onPair = { host, code ->
                        scope.launch {
                            loading = true
                            error = null
                            try {
                                val result = api.pair(
                                    host = host,
                                    code = code,
                                    installationId = store.installationId(),
                                )
                                store.savePairing(
                                    host = host,
                                    token = result.token,
                                    deviceId = result.deviceId,
                                )
                                tables = api.tables(
                                    store.host()!!,
                                    store.token()!!,
                                )
                                screen = Screen.TABLES
                            } catch (t: Throwable) {
                                error = t.message ?: "Pairing failed."
                            } finally {
                                loading = false
                            }
                        }
                    },
                )

                Screen.TABLES -> TableSelectionScreen(
                    tables = tables,
                    loading = loading,
                    error = error,
                    onRefresh = {
                        scope.launch { loadTables() }
                    },
                    onSelect = { table ->
                        if (table.enabled) {
                            scope.launch {
                                loading = true
                                error = null
                                try {
                                    api.bind(
                                        host = store.host()!!,
                                        token = store.token()!!,
                                        tableId = table.id,
                                    )
                                    loadDisplayState()
                                } catch (t: Throwable) {
                                    error = t.message ?: "Table could not be assigned."
                                } finally {
                                    loading = false
                                }
                            }
                        }
                    },
                )

                Screen.DISPLAY -> DisplayScreen(
                    state = displayState,
                    connected = connected,
                    error = error,
                )
            }
        }
    }
}

@Composable
private fun SetupScreen(
    loading: Boolean,
    error: String?,
    initialHost: String,
    onPair: (String, String) -> Unit,
) {
    var host by remember(initialHost) { mutableStateOf(initialHost) }
    var code by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PmdCream)
            .padding(28.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier.widthIn(max = 520.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            BrandMark(68.dp)
            Spacer(Modifier.height(16.dp))
            Text(
                "PayMyDine Table Companion",
                color = PmdDark,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 28.sp,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Pair this display once. No staff password is stored on the device.",
                color = PmdMuted,
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(28.dp))

            OutlinedTextField(
                value = host,
                onValueChange = { host = it.trim() },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Restaurant address") },
                placeholder = { Text("restaurant.paymydine.com") },
                singleLine = true,
                enabled = !loading,
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = code,
                onValueChange = {
                    code = it.filter(Char::isDigit).take(6)
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("6-digit setup code") },
                placeholder = { Text("123456") },
                singleLine = true,
                enabled = !loading,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.NumberPassword,
                ),
            )

            if (!error.isNullOrBlank()) {
                Spacer(Modifier.height(12.dp))
                ErrorNotice(error)
            }

            Spacer(Modifier.height(18.dp))
            Button(
                onClick = { onPair(host, code) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                enabled = !loading && host.isNotBlank() && code.length == 6,
                colors = ButtonDefaults.buttonColors(
                    containerColor = PmdGreen,
                ),
                shape = RoundedCornerShape(14.dp),
            ) {
                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text(
                        "Pair device",
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            Spacer(Modifier.height(14.dp))
            Text(
                "Create the setup code in PayMyDine Admin → Devices & hardware → Table display.",
                color = PmdMuted,
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun TableSelectionScreen(
    tables: List<DeviceTable>,
    loading: Boolean,
    error: String?,
    onRefresh: () -> Unit,
    onSelect: (DeviceTable) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF6F9F7))
            .padding(24.dp),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            BrandMark(44.dp)
            Column {
                Text(
                    "Choose this device's table",
                    color = PmdDark,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 24.sp,
                )
                Text(
                    "This device stays assigned to that table after restart.",
                    color = PmdMuted,
                    fontSize = 13.sp,
                )
            }
        }

        if (!error.isNullOrBlank()) {
            Spacer(Modifier.height(14.dp))
            ErrorNotice(error)
        }

        Spacer(Modifier.height(18.dp))

        if (loading && tables.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = PmdGreen)
            }
            return
        }

        if (tables.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    "No tables are available.",
                    color = PmdDark,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(12.dp))
                Button(onClick = onRefresh) {
                    Text("Try again")
                }
            }
            return
        }

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(
                items = tables,
                key = { it.id },
            ) { table ->
                val enabled = table.enabled
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(enabled = enabled) {
                            onSelect(table)
                        },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor =
                            if (enabled) Color.White else Color(0xFFE7EBE9),
                    ),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(
                                    if (enabled) {
                                        Color(0xFFE8F6F0)
                                    } else {
                                        Color(0xFFD5DAD7)
                                    },
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                table.number.ifBlank { table.id.toString() },
                                color = if (enabled) PmdGreen else PmdMuted,
                                fontWeight = FontWeight.ExtraBold,
                            )
                        }
                        Spacer(Modifier.size(14.dp))
                        Column(
                            modifier = Modifier.weight(1f),
                        ) {
                            Text(
                                table.name,
                                color = if (enabled) PmdDark else PmdMuted,
                                fontWeight = FontWeight.Bold,
                                fontSize = 17.sp,
                            )
                            if (table.floor.isNotBlank()) {
                                Text(
                                    table.floor,
                                    color = PmdMuted,
                                    fontSize = 12.sp,
                                )
                            }
                        }
                        Text(
                            if (enabled) "Select" else "Unavailable",
                            color = if (enabled) PmdGreen else PmdMuted,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DisplayScreen(
    state: DisplayState?,
    connected: Boolean,
    error: String?,
) {
    if (state == null) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                BrandMark(62.dp)
                Spacer(Modifier.height(18.dp))
                CircularProgressIndicator(color = PmdGreen)
                Spacer(Modifier.height(12.dp))
                Text(
                    error ?: "Connecting to PayMyDine…",
                    color = PmdMuted,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                )
            }
        }
        return
    }

    if (state.event.type == "table_unavailable") {
        UnavailableDisplay(
            state = state,
            connected = connected,
        )
        return
    }

    TableSurface(
        state = state,
        connected = connected,
    )
}

@Composable
private fun TableSurface(
    state: DisplayState,
    connected: Boolean,
) {
    val qr = remember(state.table.menuUrl) {
        generateQrCode(state.table.menuUrl)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PmdCream)
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 34.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            TableHeader(
                restaurantName = state.restaurantName,
                restaurantLogoUrl = state.restaurantLogoUrl,
                tableNumber = state.table.number,
            )

            Spacer(Modifier.height(16.dp))

            QrWithLogo(
                qr = qr,
                modifier = Modifier
                    .fillMaxWidth(0.72f)
                    .widthIn(max = 282.dp)
                    .aspectRatio(1f),
            )

            Spacer(Modifier.height(12.dp))

            GuestMessageLine(
                event = state.event,
            )
        }

        Text(
            "Powered by PayMyDine",
            modifier = Modifier.align(Alignment.BottomCenter),
            color = Color(0xFF7B8581),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
        )

        ConnectionBadge(
            connected = connected,
            modifier = Modifier.align(Alignment.BottomStart),
        )
    }
}

@Composable
private fun TableHeader(
    restaurantName: String,
    restaurantLogoUrl: String,
    tableNumber: String,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            modifier = Modifier.weight(1f),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            RestaurantLogo(
                logoUrl = restaurantLogoUrl,
                size = 32.dp,
            )
            Text(
                restaurantName,
                color = Color(0xFF32453D),
                fontWeight = FontWeight.ExtraBold,
                fontSize = 13.sp,
                maxLines = 1,
            )
        }

        Text(
            "TABLE " + tableNumber,
            color = Color(0xFF486057),
            fontWeight = FontWeight.ExtraBold,
            fontSize = 14.sp,
            letterSpacing = 0.7.sp,
            maxLines = 1,
        )
    }
}

@Composable
private fun GuestMessageLine(
    event: DisplayEvent,
) {
    val type = event.type
    val idle = type == "idle"

    val icon =
        when (type) {
            "payment_requested" -> "CARD"
            "order_received",
            "waiter_call",
            "payment_success",
            -> "✓"
            else -> ""
        }

    val title =
        when (type) {
            "order_received" -> "Order received"
            "waiter_call" -> "A team member is on the way"
            "payment_requested" -> "Ready for card payment"
            "payment_success" -> "Payment approved"
            else -> "Scan to order"
        }

    val subtitle =
        when (type) {
            "order_received" -> "Sent to the kitchen."
            "waiter_call" -> "We have notified the restaurant team."
            "payment_requested" -> "Tap or insert your card to complete payment."
            "payment_success" -> "Thank you for visiting us."
            else -> ""
        }

    val accent =
        when (type) {
            "payment_requested" -> PmdBlue
            "waiter_call" -> PmdAmber
            else -> PmdGreen
        }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(78.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (idle) {
            Text(
                title,
                color = PmdDark,
                fontSize = 27.sp,
                fontWeight = FontWeight.ExtraBold,
                textAlign = TextAlign.Center,
            )
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(0.96f),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(11.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(accent.copy(alpha = 0.11f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        icon,
                        color = accent,
                        fontWeight = FontWeight.Black,
                        fontSize = if (icon.length > 1) 9.sp else 20.sp,
                    )
                }

                Column(
                    modifier = Modifier.weight(1f),
                ) {
                    Text(
                        title,
                        color = PmdDark,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        maxLines = 1,
                    )
                    if (subtitle.isNotBlank()) {
                        Spacer(Modifier.height(2.dp))
                        Text(
                            subtitle,
                            color = PmdMuted,
                            fontSize = 10.sp,
                            maxLines = 2,
                        )
                    }
                }

                if (event.amount > 0.0) {
                    Text(
                        formatMoney(
                            event.amount,
                            event.currency,
                        ),
                        color = accent,
                        fontWeight = FontWeight.Black,
                        fontSize = 15.sp,
                        textAlign = TextAlign.End,
                    )
                }
            }
        }
    }
}

@Composable
private fun UnavailableDisplay(
    state: DisplayState,
    connected: Boolean,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PmdCream)
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            TableHeader(
                restaurantName = state.restaurantName,
                restaurantLogoUrl = state.restaurantLogoUrl,
                tableNumber = state.table.number,
            )

            Spacer(Modifier.height(76.dp))

            Box(
                modifier = Modifier
                    .size(82.dp)
                    .clip(CircleShape)
                    .background(PmdRed.copy(alpha = 0.10f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "!",
                    color = PmdRed,
                    fontWeight = FontWeight.Black,
                    fontSize = 36.sp,
                )
            }

            Spacer(Modifier.height(18.dp))

            Text(
                "Table unavailable",
                color = PmdDark,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 26.sp,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(7.dp))

            Text(
                "Please ask a team member for assistance.",
                color = PmdMuted,
                fontSize = 13.sp,
                textAlign = TextAlign.Center,
            )
        }

        ConnectionBadge(
            connected = connected,
            modifier = Modifier.align(Alignment.BottomStart),
        )
    }
}

@Composable
private fun RestaurantLogo(
    logoUrl: String,
    size: Dp,
) {
    val bitmap by produceState<ImageBitmap?>(
        initialValue = null,
        key1 = logoUrl,
    ) {
        value = loadRestaurantLogo(logoUrl)
    }

    if (bitmap != null) {
        Image(
            bitmap = bitmap!!,
            contentDescription = null,
            modifier = Modifier
                .size(size)
                .clip(RoundedCornerShape(8.dp)),
            contentScale = ContentScale.Fit,
        )
    } else {
        BrandMark(size)
    }
}

private suspend fun loadRestaurantLogo(
    logoUrl: String,
): ImageBitmap? = withContext(Dispatchers.IO) {
    if (
        !logoUrl.startsWith("https://", ignoreCase = true) &&
        !logoUrl.startsWith("http://", ignoreCase = true)
    ) {
        return@withContext null
    }

    runCatching {
        val connection = (URL(logoUrl).openConnection() as HttpURLConnection).apply {
            connectTimeout = 8_000
            readTimeout = 8_000
            useCaches = true
            setRequestProperty("Accept", "image/*")
        }

        try {
            if (connection.responseCode !in 200..299) {
                return@runCatching null
            }

            BitmapFactory.decodeStream(connection.inputStream)
                ?.asImageBitmap()
        } finally {
            connection.disconnect()
        }
    }.getOrNull()
}

@Composable
private fun QrWithLogo(
    qr: ImageBitmap?,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(22.dp))
            .background(Color.White)
            .padding(12.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (qr != null) {
            Image(
                bitmap = qr,
                contentDescription = "Table menu QR code",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit,
            )
        }

        Box(
            modifier = Modifier
                .size(54.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(Color.White)
                .padding(9.dp),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                painter = painterResource(R.drawable.pmd_brand_mark),
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit,
            )
        }
    }
}

@Composable
private fun BrandMark(size: Dp) {
    Image(
        painter = painterResource(R.drawable.pmd_brand_mark),
        contentDescription = null,
        modifier = Modifier.size(size),
        contentScale = ContentScale.Fit,
    )
}

@Composable
private fun ConnectionBadge(
    connected: Boolean,
    modifier: Modifier = Modifier,
    light: Boolean = false,
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(
                if (light) {
                    Color.White.copy(alpha = 0.12f)
                } else {
                    Color.White.copy(alpha = 0.75f)
                },
            )
            .padding(horizontal = 9.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Box(
            modifier = Modifier
                .size(7.dp)
                .clip(CircleShape)
                .background(
                    if (connected) Color(0xFF16A579) else Color(0xFFD66A5D),
                ),
        )
        Text(
            if (connected) "Live" else "Offline · last screen",
            color =
                if (light) {
                    Color.White.copy(alpha = 0.82f)
                } else {
                    Color(0xFF51635B)
                },
            fontWeight = FontWeight.Bold,
            fontSize = 10.sp,
        )
    }
}

@Composable
private fun ErrorNotice(message: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFFFEFED))
            .padding(12.dp),
    ) {
        Text(
            message,
            color = Color(0xFFA33737),
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

private fun formatMoney(
    amount: Double,
    currency: String,
): String {
    return runCatching {
        NumberFormat.getCurrencyInstance().apply {
            this.currency = Currency.getInstance(currency.uppercase())
        }.format(amount)
    }.getOrElse {
        "%.2f %s".format(amount, currency.uppercase())
    }
}
