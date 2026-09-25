# PayMyDine Android 0.3.37 / V122 Local-First frozen release

Frozen platform baseline: `4d16e6a4c8d18ef581d117281c2183dbfea5b627`
Android versionCode: `50`
Android versionName: `0.3.37-v122-local-first`
Sync protocol: `pmd-sync-v1`
Android source commit: `PENDING_FINAL_RELEASE_COMMIT`
APK SHA-256: `PENDING_FINAL_RELEASE_DIGEST`

## Local-First authority

After a valid bootstrap and local staff verifier exist:

`Quick POS -> Android SQLite -> durable Outbox -> Sync Engine -> PayMyDine Cloud`

WAN loss/reconnect does not replace the active POS WebView or discard the active cart.

## Frozen V122 Web/Android parity

The APK is built from the frozen V122 platform baseline. Android bundles the exact V122 contents of:

- `pmd-qpos-web-parity-v112.css`
- `pmd-qpos-web-parity-v112.js`

Those unique paths remain the offline resource contract, while their contents are byte-for-byte the frozen V122 canonical Web Quick POS CSS/JS.

## V122 preserved behavior

- received-order append refreshes the existing KDS ticket
- server-side Kitchen-round authority from V121
- new Kitchen round after preparation from V119
- combined Pay from the main Pay button for 2+ selected unpaid checks
- floating mobile payment keypad
- mobile payment stack and mobile cart-end behavior
- V108 Pay-before-Kitchen

## Durable offline behavior

- dine-in Send/Hold
- cart/draft restore
- full Cash queue
- table state/move queue
- provisional-order item editing
- Cloud-existing line quantity increase/void through `ORDER_ITEM_ADJUST_V1`
- exact selected received-order continuation
- new local check after Kitchen preparation starts
- trusted offline timestamps
- verified cached media
- rejected reconciliation visible as `Needs attention`

Payment-gated HOLD remains Cloud-only so Restaurant Edge cannot release it to Kitchen early.

## Intentionally Cloud-only

- card / terminal / provider authorization
- combined multi-check settlement
- split/provider payment flows
- payment-gated HOLD reconciliation
- canonical operations requiring payment/KDS/manager approval

## Release gates

The authoritative workflow must pass:

- PHP syntax
- responsive regression
- Local-First offline/reconciliation matrix
- V108 Pay-before-Kitchen
- V112 parity contract
- V113/V114/V116/V117/V118/V119/V120/V121/V122 contracts
- pinned signing certificate
- Android unit tests
- APK assembly
- Android lint
- package/version identity

Production deployment must pin the exact source commit and APK SHA-256 above.
