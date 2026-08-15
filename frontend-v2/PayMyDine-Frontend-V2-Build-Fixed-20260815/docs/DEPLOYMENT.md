# Staging Deployment

Do not replace port 3001 directly.

## Suggested directories

```text
/var/www/paymydine/frontend/Paymydine-Update/frontend      # current :3001
/var/www/paymydine/frontend/Paymydine-Frontend-V2          # new :3002
```

## Build

```bash
cd /var/www/paymydine/frontend/Paymydine-Frontend-V2
cp .env.example .env.local
npm ci
npm run release:audit
npm run build
```

## PM2 staging

Use `integration/pm2/ecosystem.config.cjs` and start with a different process name:

```bash
pm2 start integration/pm2/ecosystem.config.cjs
pm2 status
```

## Nginx preview

Use a separate preview hostname or an internal protected path. The example under `integration/nginx/` proxies only the preview host to `127.0.0.1:3002`, leaves production on 3001, and uses the staging process environment value `PMD_TENANT_HOST_OVERRIDE=mimoza.paymydine.com` so Laravel selects the intended tenant instead of the preview subdomain. The public request is not allowed to choose this override.

## Cutover

Only after all QA is complete:

1. Keep the existing 3001 PM2 process online.
2. Build and verify 3002.
3. Capture hashes and screenshots.
4. Change only the customer-menu upstream to 3002.
5. Reload Nginx after `nginx -t` succeeds.
6. Run real QR, waiter, note, valet, order, split and payment smoke tests.
7. Roll back by returning the upstream to 3001 if any critical test fails.
