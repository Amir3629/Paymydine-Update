package com.paymydine.mobile.hardware.customerdisplay

import org.json.JSONObject

enum class CustomerDisplayPhase {
    IDLE,
    ORDER,
    PAYMENT,
    SUCCESS,
    ERROR,
}

data class CustomerDisplayLine(
    val menuId: Long?,
    val name: String,
    val quantity: Double,
    val unitPrice: Double,
    val lineTotal: Double,
    val imageUrl: String?,
)

data class CustomerDisplayState(
    val phase: CustomerDisplayPhase,
    val currency: String,
    val total: Double,
    val amountDue: Double,
    val tableLabel: String?,
    val orderLabel: String?,
    val headline: String?,
    val message: String?,
    val highlightName: String?,
    val highlightImageUrl: String?,
    val items: List<CustomerDisplayLine>,
) {
    companion object {
        fun idle(message: String = "Welcome"): CustomerDisplayState =
            CustomerDisplayState(
                phase = CustomerDisplayPhase.IDLE,
                currency = "€",
                total = 0.0,
                amountDue = 0.0,
                tableLabel = null,
                orderLabel = null,
                headline = "Welcome",
                message = message,
                highlightName = null,
                highlightImageUrl = null,
                items = emptyList(),
            )

        fun fromJson(raw: String): CustomerDisplayState {
            val root = JSONObject(raw)
            val phase =
                runCatching {
                    CustomerDisplayPhase.valueOf(
                        root.optString("phase", "idle").uppercase(),
                    )
                }.getOrDefault(CustomerDisplayPhase.IDLE)

            val rows = buildList {
                val items = root.optJSONArray("items")
                if (items != null) {
                    for (index in 0 until items.length()) {
                        val row = items.optJSONObject(index) ?: continue
                        add(
                            CustomerDisplayLine(
                                menuId =
                                    row.optLong("menu_id", 0L)
                                        .takeIf { it > 0L },
                                name = row.optString("name", "Item"),
                                quantity = row.optDouble("quantity", 1.0),
                                unitPrice = row.optDouble("unit_price", 0.0),
                                lineTotal = row.optDouble("line_total", 0.0),
                                imageUrl =
                                    row.optString("image", "")
                                        .trim()
                                        .takeIf { it.isNotEmpty() },
                            ),
                        )
                    }
                }
            }

            return CustomerDisplayState(
                phase = phase,
                currency = root.optString("currency", "€").ifBlank { "€" },
                total = root.optDouble("total", 0.0),
                amountDue = root.optDouble("amount_due", root.optDouble("total", 0.0)),
                tableLabel =
                    root.optString("table_label", "")
                        .trim()
                        .takeIf { it.isNotEmpty() },
                orderLabel =
                    root.optString("order_label", "")
                        .trim()
                        .takeIf { it.isNotEmpty() },
                headline =
                    root.optString("headline", "")
                        .trim()
                        .takeIf { it.isNotEmpty() },
                message =
                    root.optString("message", "")
                        .trim()
                        .takeIf { it.isNotEmpty() },
                highlightName =
                    root.optString("highlight_name", "")
                        .trim()
                        .takeIf { it.isNotEmpty() },
                highlightImageUrl =
                    root.optString("highlight_image", "")
                        .trim()
                        .takeIf { it.isNotEmpty() },
                items = rows,
            )
        }
    }
}
