package com.paymydine.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.paymydine.mobile.PayMyDineApplication
import com.paymydine.mobile.data.local.DraftOrder
import com.paymydine.mobile.data.local.PosMenuItemRow
import com.paymydine.mobile.data.local.PosTableRow
import com.paymydine.mobile.sync.SyncEngine
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Currency

@Composable
fun LocalPosScreen(
    app: PayMyDineApplication,
    modifier: Modifier = Modifier,
) {
    val locationId = app.bootstrapRepository.locationId() ?: return
    var tables by remember { mutableStateOf<List<PosTableRow>>(emptyList()) }
    var menu by remember { mutableStateOf<List<PosMenuItemRow>>(emptyList()) }
    var selectedTableId by remember { mutableStateOf<String?>(null) }
    var draft by remember { mutableStateOf<DraftOrder?>(null) }
    var search by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    var revision by remember { mutableStateOf(0) }
    var optionsFor by remember { mutableStateOf<PosMenuItemRow?>(null) }

    LaunchedEffect(locationId, revision) {
        tables = app.localPosRepository.tables(locationId)
        menu = app.localPosRepository.menu(locationId)
        if (selectedTableId == null) {
            selectedTableId = tables.firstOrNull()?.id
        }
        draft = selectedTableId?.let(app.localPosRepository::draftForTable)
    }

    LaunchedEffect(selectedTableId, revision) {
        draft = selectedTableId?.let(app.localPosRepository::draftForTable)
    }

    val visibleMenu = remember(menu, search) {
        val q = search.trim().lowercase()
        if (q.isBlank()) menu else menu.filter {
            it.name.lowercase().contains(q)
        }
    }

    fun addItem(item: PosMenuItemRow, optionIds: List<Long> = emptyList()) {
        val tableId = selectedTableId ?: return
        runCatching {
            app.localPosRepository.addItem(
                locationId = locationId,
                tableId = tableId,
                menuItemId = item.id,
                selectedOptionIds = optionIds,
            )
        }.onSuccess {
            draft = it
            message = null
            error = null
            revision += 1
        }.onFailure {
            error = it.message ?: "Could not add item."
        }
    }

    optionsFor?.let { item ->
        OptionPickerDialog(
            item = item,
            onDismiss = { optionsFor = null },
            onConfirm = { ids ->
                optionsFor = null
                addItem(item, ids)
            },
        )
    }

    BoxWithConstraints(
        modifier = modifier.fillMaxSize().padding(12.dp),
    ) {
        val wide = maxWidth >= 900.dp

        if (wide) {
            Row(
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                TablePane(
                    modifier = Modifier.weight(0.8f).fillMaxHeight(),
                    tables = tables,
                    selectedTableId = selectedTableId,
                    onSelect = {
                        selectedTableId = it
                        message = null
                        error = null
                    },
                )
                MenuPane(
                    modifier = Modifier.weight(1.5f).fillMaxHeight(),
                    menu = visibleMenu,
                    search = search,
                    onSearch = { search = it },
                    onAdd = { item ->
                        if (item.hasOptions) optionsFor = item else addItem(item)
                    },
                )
                CartPane(
                    modifier = Modifier.weight(1.15f).fillMaxHeight(),
                    draft = draft,
                    onQty = { lineId, delta ->
                        draft = app.localPosRepository.changeQuantity(lineId, delta)
                        revision += 1
                    },
                    onGuests = { delta ->
                        val current = draft ?: return@CartPane
                        draft = app.localPosRepository.setDraftMeta(
                            current.localId,
                            current.guestCount + delta,
                            current.note,
                        )
                        revision += 1
                    },
                    onNote = { note ->
                        val current = draft ?: return@CartPane
                        draft = app.localPosRepository.setDraftMeta(
                            current.localId,
                            current.guestCount,
                            note,
                        )
                    },
                    onHold = {
                        queueDraft(app, draft, hold = true)?.let {
                            message = it
                            revision += 1
                        }
                    },
                    onSend = {
                        queueDraft(app, draft, hold = false)?.let {
                            message = it
                            revision += 1
                        }
                    },
                    onSync = {
                        SyncEngine.enqueueImmediate(app)
                        message = "Sync requested."
                    },
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    TablePane(
                        modifier = Modifier.fillMaxWidth().height(260.dp),
                        tables = tables,
                        selectedTableId = selectedTableId,
                        onSelect = {
                            selectedTableId = it
                            message = null
                            error = null
                        },
                    )
                }
                item {
                    MenuPane(
                        modifier = Modifier.fillMaxWidth().height(520.dp),
                        menu = visibleMenu,
                        search = search,
                        onSearch = { search = it },
                        onAdd = { item ->
                            if (item.hasOptions) optionsFor = item else addItem(item)
                        },
                    )
                }
                item {
                    CartPane(
                        modifier = Modifier.fillMaxWidth(),
                        draft = draft,
                        onQty = { lineId, delta ->
                            draft = app.localPosRepository.changeQuantity(lineId, delta)
                            revision += 1
                        },
                        onGuests = { delta ->
                            val current = draft ?: return@CartPane
                            draft = app.localPosRepository.setDraftMeta(
                                current.localId,
                                current.guestCount + delta,
                                current.note,
                            )
                            revision += 1
                        },
                        onNote = { note ->
                            val current = draft ?: return@CartPane
                            draft = app.localPosRepository.setDraftMeta(
                                current.localId,
                                current.guestCount,
                                note,
                            )
                        },
                        onHold = {
                            queueDraft(app, draft, hold = true)?.let {
                                message = it
                                revision += 1
                            }
                        },
                        onSend = {
                            queueDraft(app, draft, hold = false)?.let {
                                message = it
                                revision += 1
                            }
                        },
                        onSync = {
                            SyncEngine.enqueueImmediate(app)
                            message = "Sync requested."
                        },
                    )
                }
            }
        }

        Column {
            error?.let {
                Text(
                    text = it,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            message?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

private fun queueDraft(
    app: PayMyDineApplication,
    draft: DraftOrder?,
    hold: Boolean,
): String? {
    val current = draft ?: return "Add items first."
    val host = app.credentials.tenantHost() ?: return "Pair this device first."
    val deviceId = app.credentials.deviceId() ?: return "Pair this device first."

    return runCatching {
        val command = app.localPosRepository.buildSendCommand(
            draft = current,
            tenantHost = host,
            deviceId = deviceId,
            staffId = null,
            userId = null,
            hold = hold,
        )

        check(app.syncRepository.enqueue(command)) {
            "This exact command is already queued."
        }

        app.localPosRepository.markQueued(current.localId)
        SyncEngine.enqueueImmediate(app)

        if (hold) {
            "Order saved to durable outbox."
        } else {
            "Order queued. It will send exactly once when an authority is reachable."
        }
    }.getOrElse {
        it.message ?: "Could not queue order."
    }
}

@Composable
private fun TablePane(
    modifier: Modifier,
    tables: List<PosTableRow>,
    selectedTableId: String?,
    onSelect: (String) -> Unit,
) {
    Card(modifier) {
        Column(Modifier.fillMaxSize().padding(12.dp)) {
            Text("Tables", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(tables, key = { it.id }) { table ->
                    val selected = table.id == selectedTableId
                    if (selected) {
                        Button(
                            modifier = Modifier.fillMaxWidth(),
                            onClick = { onSelect(table.id) },
                        ) {
                            Text(table.label.ifBlank { "Table ${table.number}" })
                        }
                    } else {
                        OutlinedButton(
                            modifier = Modifier.fillMaxWidth(),
                            onClick = { onSelect(table.id) },
                        ) {
                            Text(table.label.ifBlank { "Table ${table.number}" })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MenuPane(
    modifier: Modifier,
    menu: List<PosMenuItemRow>,
    search: String,
    onSearch: (String) -> Unit,
    onAdd: (PosMenuItemRow) -> Unit,
) {
    Card(modifier) {
        Column(Modifier.fillMaxSize().padding(12.dp)) {
            Text("Menu", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = search,
                onValueChange = onSearch,
                label = { Text("Search menu") },
                singleLine = true,
            )
            Spacer(Modifier.height(8.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(menu, key = { it.id }) { item ->
                    OutlinedButton(
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { onAdd(item) },
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(item.name, modifier = Modifier.weight(1f))
                            Spacer(Modifier.width(8.dp))
                            Text(formatMoney(item.priceMinor, item.currency))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CartPane(
    modifier: Modifier,
    draft: DraftOrder?,
    onQty: (String, Int) -> Unit,
    onGuests: (Int) -> Unit,
    onNote: (String) -> Unit,
    onHold: () -> Unit,
    onSend: () -> Unit,
    onSync: () -> Unit,
) {
    Card(modifier) {
        Column(Modifier.fillMaxWidth().padding(12.dp)) {
            Text("Order", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(8.dp))

            if (draft == null || draft.lines.isEmpty()) {
                Text("No local items yet.")
            } else {
                draft.lines.forEach { line ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(line.name)
                            Text(
                                formatMoney(line.unitPriceMinor, draft.currency),
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        OutlinedButton(onClick = { onQty(line.lineId, -1) }) {
                            Text("−")
                        }
                        Text(
                            line.quantity.toString(),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 12.dp),
                        )
                        OutlinedButton(onClick = { onQty(line.lineId, 1) }) {
                            Text("+")
                        }
                    }
                    HorizontalDivider()
                }

                Spacer(Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("Guests")
                    Row {
                        TextButton(onClick = { onGuests(-1) }) { Text("−") }
                        Text(
                            draft.guestCount.toString(),
                            modifier = Modifier.padding(vertical = 12.dp),
                        )
                        TextButton(onClick = { onGuests(1) }) { Text("+") }
                    }
                }

                OutlinedTextField(
                    modifier = Modifier.fillMaxWidth(),
                    value = draft.note,
                    onValueChange = onNote,
                    label = { Text("Kitchen / order note") },
                )

                Spacer(Modifier.height(10.dp))
                Text(
                    "Total ${formatMoney(draft.totalMinor, draft.currency)}",
                    style = MaterialTheme.typography.titleMedium,
                )
                Text(
                    "Local status: ${draft.status}",
                    style = MaterialTheme.typography.bodySmall,
                )
                Spacer(Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedButton(
                        modifier = Modifier.weight(1f),
                        onClick = onHold,
                    ) {
                        Text("Hold")
                    }
                    Button(
                        modifier = Modifier.weight(1f),
                        onClick = onSend,
                    ) {
                        Text("Send")
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
            TextButton(onClick = onSync) {
                Text("Sync now")
            }
        }
    }
}

private data class OptionValueUi(
    val id: Long,
    val name: String,
    val price: Double,
)

private data class OptionGroupUi(
    val name: String,
    val min: Int,
    val max: Int,
    val values: List<OptionValueUi>,
)

@Composable
private fun OptionPickerDialog(
    item: PosMenuItemRow,
    onDismiss: () -> Unit,
    onConfirm: (List<Long>) -> Unit,
) {
    val groups = remember(item.id) { parseOptionGroups(item.payloadJson) }
    var selected by remember(item.id) {
        mutableStateOf(
            groups.flatMap { group ->
                group.values.take(group.min).map { it.id }
            }.toSet(),
        )
    }
    var validation by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(item.name) },
        text = {
            LazyColumn(
                modifier = Modifier.height(420.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(groups) { group ->
                    Column {
                        Text(
                            group.name,
                            style = MaterialTheme.typography.titleSmall,
                        )
                        group.values.forEach { value ->
                            val checked = value.id in selected
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Row(Modifier.weight(1f)) {
                                    if (group.max == 1) {
                                        RadioButton(
                                            selected = checked,
                                            onClick = {
                                                val groupIds = group.values.map { it.id }.toSet()
                                                selected = (selected - groupIds) + value.id
                                            },
                                        )
                                    } else {
                                        Checkbox(
                                            checked = checked,
                                            onCheckedChange = { next ->
                                                selected = if (next) {
                                                    val groupIds = group.values.map { v -> v.id }.toSet()
                                                    val inGroup = selected.count { it in groupIds }
                                                    if (inGroup < group.max) selected + value.id else selected
                                                } else {
                                                    selected - value.id
                                                }
                                            },
                                        )
                                    }
                                    Text(
                                        value.name,
                                        modifier = Modifier.padding(top = 12.dp),
                                    )
                                }
                                if (value.price != 0.0) {
                                    Text(
                                        "+${value.price}",
                                        modifier = Modifier.padding(top = 12.dp),
                                    )
                                }
                            }
                        }
                    }
                }
                validation?.let { msg ->
                    item {
                        Text(msg, color = MaterialTheme.colorScheme.error)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val bad = groups.firstOrNull { group ->
                        selected.count { id -> group.values.any { it.id == id } } !in group.min..group.max
                    }
                    if (bad != null) {
                        validation = "${bad.name}: choose ${bad.min} to ${bad.max}."
                    } else {
                        onConfirm(selected.toList())
                    }
                },
            ) {
                Text("Add")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
    )
}

private fun parseOptionGroups(payload: String): List<OptionGroupUi> = runCatching {
    val root = JSONObject(payload)
    val groups = root.optJSONArray("options") ?: JSONArray()
    buildList {
        for (i in 0 until groups.length()) {
            val group = groups.getJSONObject(i)
            val valuesJson = group.optJSONArray("values") ?: JSONArray()
            val values = buildList {
                for (j in 0 until valuesJson.length()) {
                    val value = valuesJson.getJSONObject(j)
                    add(
                        OptionValueUi(
                            id = value.optLong("id"),
                            name = value.optString("name", "Option"),
                            price = value.optDouble("price", 0.0),
                        ),
                    )
                }
            }
            add(
                OptionGroupUi(
                    name = group.optString("name", "Options"),
                    min = group.optInt("min", if (group.optBoolean("required")) 1 else 0),
                    max = group.optInt("max", 1).coerceAtLeast(1),
                    values = values,
                ),
            )
        }
    }
}.getOrDefault(emptyList())

private fun formatMoney(minor: Long, currencyCode: String): String = runCatching {
    NumberFormat.getCurrencyInstance().apply {
        currency = Currency.getInstance(currencyCode)
    }.format(minor / 100.0)
}.getOrElse {
    "${minor / 100.0} $currencyCode"
}
