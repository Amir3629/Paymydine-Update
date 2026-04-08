# PayMyDine Local POS Agent (Pilot)

Minimal polling agent for executing drawer hardware actions **on the local POS machine**.

## Why this exists
- Backend (VPS) decides *when* to open/test drawer.
- Local POS agent executes *hardware* command where drawer/printer is physically connected.

## Setup
1. Install Node.js 18+ on local POS.
2. Copy this folder to local POS machine.
3. Create `.env` next to `agent.js`:

```env
BACKEND_BASE_URL=https://your-tenant.paymydine.com/admin
POS_AGENT_TOKEN=replace_with_same_token_as_backend
POS_DEVICE_CODE=your_pos_device_code
POLL_INTERVAL_MS=2000
```

4. Run:

```bash
node agent.js
```

## Supported target formats (pilot)
- `tcp://ip:port`
- `ip:port` (auto TCP)
- local file/device path (e.g. `/dev/usb/lp0`)

## Notes
- This pilot handles only `open_drawer` and `test_connection`.
- It sends ESC/POS pulse bytes from `payload.esc_pos_command`.
