# PayMyDine Table Companion Android V1

Dedicated Android app for the small guest-facing display installed on a restaurant table.

## Product contract

- No Digital Menu is rendered inside the device.
- Idle screen shows restaurant name, table identity and the canonical table QR.
- QR is generated locally with error-correction level H and a centered PayMyDine mark.
- Reacts to canonical PayMyDine events: order received, waiter called, card payment requested, provider-confirmed payment success and table unavailable.
- No staff/customer password is stored in the device.
- First setup uses a 6-digit one-time code created in Admin > Devices > Table display.
- The device then receives a random bearer credential protected by Android Keystore.
- The app lists the restaurant's tables and binds itself to one table.

## Payment

PaymentBridge is intentionally fail-closed. The UI can receive and display a payment request now, but a real card/mobile-wallet charge must be implemented with the exact hardware manufacturer's certified Android SDK and the configured PayMyDine gateway/provider. The app never marks an order paid by itself.

## Build

Requires Java 17, Android SDK 36 and Gradle 8.13.

Build command: gradle assembleDebug

Debug package: com.paymydine.tabledisplay.preview

Version: 0.1.0-table-companion-debug
