package com.paymydine.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.data.local.KdsStationRow
import com.paymydine.mobile.data.local.KdsStatusRow
import com.paymydine.mobile.data.local.KdsTicketRow
import com.paymydine.mobile.sync.SyncEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

@Composable
fun KdsScreen(
    app: PayMyDineApplication,
    modifier: Modifier = Modifier,
) {
    val locationId = app.bootstrapRepository.locationId() ?: return
    var stations by remember { mutableStateOf<List<KdsStationRow>>(emptyList()) }
    var selectedSlug by remember { mutableStateOf(app.kdsRepository.selectedStationSlug()) }
    var statuses by remember { mutableStateOf<List<KdsStatusRow>>(emptyList()) }
    var tickets by remember { mutableStateOf<List<KdsTicketRow>>(emptyList()) }
    var stationMenu by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var revision by remember { mutableStateOf(0) }

    fun reloadLocal() {
        stations = app.kdsRepository.stations()
        if (selectedSlug.isNullOrBlank()) {
            selectedSlug = app.kdsRepository.ensureDefaultStation()
        }
        statuses = app.kdsRepository.statuses()
        tickets = app.kdsRepository.tickets(locationId, selectedSlug)
    }

    LaunchedEffect(locationId, selectedSlug, revision) {
        reloadLocal()
    }

    LaunchedEffect(locationId, selectedSlug) {
        while (isActive) {
            withContext(Dispatchers.IO) {
                SyncEngine(app).runOnce()
            }
            reloadLocal()
            delay(5_000)
        }
    }

    Column(
        modifier = modifier.fillMaxSize().padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column {
                Text("Kitchen Display", style = MaterialTheme.typography.headlineSmall)
                Text(
                    "${tickets.size} active tickets · local-first",
                    style = MaterialTheme.typography.bodySmall,
                )
            }

            Column {
                OutlinedButton(onClick = { stationMenu = true }) {
                    Text(
                        stations.firstOrNull { it.slug == selectedSlug }?.name
                            ?: "All kitchen",
                    )
                }
                DropdownMenu(
                    expanded = stationMenu,
                    onDismissRequest = { stationMenu = false },
                ) {
                    if (stations.isEmpty()) {
                        DropdownMenuItem(
                            text = { Text("All kitchen") },
                            onClick = {
                                stationMenu = false
                                selectedSlug = null
                                app.kdsRepository.selectStation(null)
                                SyncEngine.enqueueImmediate(app)
                                revision += 1
                            },
                        )
                    } else {
                        stations.forEach { station ->
                            DropdownMenuItem(
                                text = { Text(station.name) },
                                onClick = {
                                    stationMenu = false
                                    selectedSlug = station.slug
                                    app.kdsRepository.selectStation(station.slug)
                                    SyncEngine.enqueueImmediate(app)
                                    revision += 1
                                },
                            )
                        }
                    }
                }
            }
        }

        message?.let {
            Text(it, style = MaterialTheme.typography.bodySmall)
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(tickets, key = { it.ticketId }) { ticket ->
                KdsTicketCard(
                    ticket = ticket,
                    statuses = statuses,
                    onStatus = { nextStatus ->
                        val host = app.credentials.tenantHost()
                        val deviceId = app.credentials.deviceId()

                        if (host.isNullOrBlank() || deviceId.isNullOrBlank()) {
                            message = "Pair this device before changing kitchen status."
                        } else {
                            runCatching {
                                val command = app.kdsRepository.buildStatusCommand(
                                    ticket = ticket,
                                    newStatusId = nextStatus.id,
                                    tenantHost = host,
                                    locationId = locationId,
                                    deviceId = deviceId,
                                )

                                check(app.syncRepository.enqueue(command)) {
                                    "This exact KDS action is already queued."
                                }

                                SyncEngine.enqueueImmediate(app)
                                message = "Kitchen status queued safely."
                                revision += 1
                            }.onFailure {
                                message = it.message ?: "Could not queue KDS status."
                            }
                        }
                    },
                )
            }
        }
    }
}

@Composable
private fun KdsTicketCard(
    ticket: KdsTicketRow,
    statuses: List<KdsStatusRow>,
    onStatus: (KdsStatusRow) -> Unit,
) {
    val payload = remember(ticket.payloadJson) {
        runCatching { JSONObject(ticket.payloadJson) }.getOrElse { JSONObject() }
    }
    val itemsJson = payload.optJSONArray("items") ?: JSONArray()
    val notesJson = payload.optJSONArray("notes") ?: JSONArray()

    Card(Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text(
                        "#${ticket.orderId}",
                        style = MaterialTheme.typography.titleLarge,
                    )
                    Text(
                        payload.optString("order_type_name", "Order"),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
                Column {
                    Text(
                        ticket.statusName,
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Text(
                        payload.optString("elapsed_time"),
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            for (index in 0 until itemsJson.length()) {
                val item = itemsJson.optJSONObject(index) ?: continue
                val modifiers = item.optJSONArray("modifiers") ?: JSONArray()
                Column {
                    Text(
                        "${item.opt("quantity") ?: 1} × ${item.optString("name", "Item")}",
                    )
                    val comment = item.optString("comment").trim()
                    if (comment.isNotBlank()) {
                        Text(
                            comment,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    for (modifierIndex in 0 until modifiers.length()) {
                        val modifier = modifiers.optJSONObject(modifierIndex)
                            ?: continue
                        Text(
                            "• ${modifier.optString("name")}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }

            for (index in 0 until notesJson.length()) {
                val note = notesJson.optJSONObject(index) ?: continue
                val noteText = note.optString("note").trim()
                if (noteText.isNotBlank()) {
                    Text(
                        "Note: $noteText",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            val eta = payload.optJSONObject("eta")
            if (eta != null && eta.optBoolean("available")) {
                val remaining = eta.opt("remaining_minutes")
                Text(
                    "ETA: ${remaining ?: "—"} min",
                    style = MaterialTheme.typography.bodySmall,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                statuses.forEach { status ->
                    val isCurrent = status.id == ticket.statusId
                    if (isCurrent) {
                        OutlinedButton(
                            modifier = Modifier.weight(1f),
                            enabled = false,
                            onClick = {},
                        ) {
                            Text(status.name)
                        }
                    } else {
                        Button(
                            modifier = Modifier.weight(1f),
                            onClick = { onStatus(status) },
                        ) {
                            Text(status.name)
                        }
                    }
                }
            }

            Text(
                "sync v${ticket.aggregateVersion}",
                style = MaterialTheme.typography.labelSmall,
            )
        }
    }
}
