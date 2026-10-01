package com.paymydine.tabledisplay

data class PairResult(
    val token: String,
    val deviceId: Long,
    val locationId: Long,
)

data class DeviceTable(
    val id: Long,
    val number: String,
    val name: String,
    val floor: String,
    val enabled: Boolean,
)

data class DisplayTable(
    val id: Long,
    val number: String,
    val name: String,
    val menuUrl: String,
    val enabled: Boolean,
)

data class DisplayEvent(
    val type: String,
    val key: String,
    val headline: String,
    val message: String,
    val orderId: Long,
    val amount: Double,
    val currency: String,
)

data class DisplayState(
    val restaurantName: String,
    val restaurantLogoUrl: String,
    val table: DisplayTable,
    val event: DisplayEvent,
    val serverTime: String,
)

class TableNotBoundException : Exception()
