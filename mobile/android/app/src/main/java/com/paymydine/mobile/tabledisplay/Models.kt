package com.paymydine.mobile.tabledisplay

data class PairResult(
    val token: String,
    val deviceId: Long,
    val locationId: Long,
    val deploymentMode: Boolean,
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

data class DisplayTheme(
    val id: String = "kazen_japanese",
    val background: String = "#F5F1EB",
    val text: String = "#25231F",
    val muted: String = "#777168",
    val accent: String = "#B5413F",
    val surface: String = "#FBF8F3",
    val isDark: Boolean = false,
)

data class DisplayState(
    val restaurantName: String,
    val restaurantLogoUrl: String,
    val table: DisplayTable,
    val event: DisplayEvent,
    val serverTime: String,
    val theme: DisplayTheme = DisplayTheme(),
)

class TableNotBoundException : Exception()


data class DeviceDesiredState(
    val screenState: String,
    val brightness: Int,
    val reason: String,
    val kiosk: Boolean,
)

data class DeviceCommand(
    val commandId: String,
    val command: String,
    val payload: Map<String, String>,
)

data class DeviceHeartbeatResult(
    val desired: DeviceDesiredState,
    val commands: List<DeviceCommand>,
    val pollAfterSeconds: Long,
)
