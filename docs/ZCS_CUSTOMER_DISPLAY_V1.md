# PayMyDine ZCS Customer Display V1

## What this adds

This integration connects the PayMyDine cashier running inside the Android POS app to the customer-facing ZCS secondary display.

It is intentionally **device-local**:

- Cashier A on device A controls only device A's customer display.
- Cashier B on device B controls only device B's customer display.
- No restaurant-wide "current cart" is stored on the server.
- A normal browser has no access to the hardware bridge.

## ZCS API confirmed from vendor SDK

Vendor package:
- `SmartPos_2.0.6_R260615.aar`
- SHA-256: `fe2269746167064571ae23fc655838f203436deeb145606ff5c2d34b0054db18`

Confirmed `com.zcs.sdk.Sys` methods:
- `showBitmapOnSecondaryScreen(Bitmap, boolean)`
- `showJpgOnSecondScreen(String)`
- `setSecondaryScreenDefaultBitmap(Bitmap)`
- `awakeSubScreen()`
- `asleepSubScreen()`
- `setSubScreenTimeout(int)`
- `isSecondScreenTPSupport()`
- `isLargeSecondScreenSupport()`

The vendor demo assets are 480x480, so PayMyDine renders a complete 480x480 customer frame.

## Customer states

The renderer supports:

1. Idle / welcome
2. Order/cart
   - last-added product highlighted
   - food image when available
   - last cart rows
   - total
3. Payment
   - amount due
   - simple payment instruction
4. Success
   - paid confirmation
   - automatic return to idle
5. Error
   - payment failure / retry message

## Runtime connection

```
Quick POS web page
       |
       | JavaScriptInterface (local WebView only)
       v
PayMyDine Android PosActivity
       |
       v
CustomerDisplayManager
       |
       v
CustomerDisplayRenderer (480x480 Bitmap)
       |
       v
ZCS SmartPos SDK
       |
       v
Physical customer display
```

The bridge name exposed to the trusted POS WebView is `PayMyDineHardware`.

## Device-local settings

When the Android bridge is present, Quick POS adds a small **Customer display** control.

It supports:
- enable / disable
- show / hide food images
- test order
- test payment
- test success
- return to idle

The control is not visible in a normal desktop/mobile browser.

## Vendor SDK packaging

The vendor AAR is proprietary and is therefore not committed in this repository.

For a hardware-enabled APK place the exact vendor file here:

```
mobile/android/app/libs/SmartPos_2.0.6_R260615.aar
```

Gradle already includes `app/libs/*.aar` and `app/libs/*.jar`.

If the AAR is not packaged, PayMyDine still builds and runs; the hardware bridge reports that the ZCS SDK is unavailable and the physical display is not driven.

## Payment boundary

This feature **does not read bank cards** and does not move card data through the customer-display bridge.

The display may show "Tap / insert card", but actual contactless/card payment must remain inside a certified payment/provider flow.

NFC staff tags, table tags, loyalty tags, and bank-card/contactless payment should be implemented as separate hardware capabilities.
