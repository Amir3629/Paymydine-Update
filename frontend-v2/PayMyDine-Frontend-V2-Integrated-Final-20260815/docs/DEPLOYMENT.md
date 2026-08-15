# Frontend V2 Staging Deployment

Production port `3001` must stay untouched until real QA passes.

## 1. Extract into a separate directory

Example:

```text
/var/www/paymydine/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-20260815
```

Set ownership to the service user, not root, before npm installation.

## 2. Environment

```bash
cp .env.example .env.local
```

Mimoza staging values:

```dotenv
PMD_BACKEND_ORIGIN=auto
PMD_PUBLIC_HOST=mimoza.paymydine.com
PMD_TENANT_HOST_OVERRIDE=mimoza.paymydine.com
PMD_TRUST_TENANT_OVERRIDE_HEADER=false
PMD_ALLOW_MOCK_FALLBACK=false
PMD_ENABLE_THEME_PREVIEW=true
PMD_DEMO_MODE=0
PORT=3002
```

## 3. Dependency/security gate and build

The source release omits the stale pre-security-fix lockfile intentionally. Run:

```bash
npm run secure:install
npm run release:audit
npm run build
```

`secure:install` generates a fresh lock, runs a non-force audit repair, then requires `npm audit --omit=dev` to pass. Do not use `npm audit fix --force`.

## 4. Install V2 Admin/Theme bridge

This is the only Laravel/Admin integration required for 10-theme selection. It backs up affected files and does not replace legacy `/simple-theme`:

```bash
sudo env PMD_ROOT=/var/www/paymydine \
  bash integration/laravel/install-v2-theme-bridge.sh
```

Verify:

```bash
curl -sS https://mimoza.paymydine.com/api/v2/frontend-theme
curl -sS https://mimoza.paymydine.com/simple-theme
```

Both should still respond. The first is V2; the second remains the 3001 compatibility authority.

## 5. Start only on 3002

For manual smoke testing:

```bash
PORT=3002 npm run start
```

Or set `PMD_V2_DIR` and use `integration/pm2/ecosystem.config.cjs` after the manual smoke test passes.

Verify locally on VPS:

```bash
curl -i http://127.0.0.1:3002/api/health
curl -I http://127.0.0.1:3002/
curl -I http://127.0.0.1:3002/preview
```

## 6. Browser access during staging

An SSH tunnel from the **Mac**, not from inside the VPS:

```bash
ssh -N -L 33002:127.0.0.1:3002 ubuntu@57.129.43.190
```

Then open `http://127.0.0.1:33002/` or `/preview` locally. A real staging hostname can replace the tunnel later.

## 7. Cutover gate

Before any Nginx switch, pass `docs/QA_MATRIX.md` with a real safe Mimoza QR/table and at least two devices. Critical flows are personal cart → shared Table Order → kitchen, second order before payment, Waiter Call, optional Valet, all enabled payment methods/splits, and paid-state synchronization across devices.

Only then change the customer-menu upstream from 3001 to the V2 service. Rollback remains returning it to 3001.
