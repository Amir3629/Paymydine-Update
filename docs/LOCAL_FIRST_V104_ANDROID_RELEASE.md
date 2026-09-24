# Android 0.3.30 / V104 Local-First V2

Release branch: `feature/android-local-first-v2-v104`

## Runtime contract

- Valid local POS setup opens through SQLite/native local transport even when WAN is healthy.
- Cloud synchronization runs in the background.
- First setup may use the Cloud-rendered canonical shell once; the same WebView is then promoted to local transport.
- Reconnect does not replace the visible POS page.
- Active outbox work and rejected reconciliation work are shown separately.
- Cloud health is based on real PayMyDine sync API results rather than only Android's validated-network bit.
- Offline order/payment business time uses a server epoch + Android monotonic elapsed-time anchor.
- Cached menu images are SHA-256 verified when hash metadata is present.

## Version

- versionCode: 43
- versionName: 0.3.30-v104-local-first-v2

## Safety boundaries

Cash full settlement remains durable/offline-capable. Card/terminal/provider approval and split payments remain Cloud-only. New Pickup/off-premise creation and canonical mutation of an already-sent Cloud line remain unavailable offline until they have certified command semantics preserving payment, KDS and manager-policy checks.
