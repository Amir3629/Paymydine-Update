# PayMyDine Super Admin R2

This package replaces the legacy DashLite Super Admin page stack with a dedicated PayMyDine control-plane UI and one canonical route owner.

## What R2 owns

- `/superadmin` entry and login
- `/superadmin/index` overview dashboard
- `/superadmin/new` restaurant registry + creator
- safe restaurant metadata editing
- active / disabled status controls
- `/superadmin/health` database, DNS, TLS and subscription health + provisioning retry
- `/superadmin/location-requests`
- `/superadmin/settings`
- central `ti_tenants` / `ti_superadmin` access only
- tenant database creation from `newtenantdb`
- per-tenant TLS/vhost provisioning through a root-owned validated helper

## Safety boundaries

- Super Admin routes explicitly remove TenantDatabaseMiddleware.
- Only successful login creates `superadmin_id` session state.
- R2 does not expose destructive tenant/database deletion; Disable is the production-safe tenant off-switch.
- Domain and database identity cannot be changed from the normal Edit Restaurant page.
- The provisioning helper accepts only `^[a-z0-9-]+.paymydine.com$` tenant domains and is root-owned.
- PHP-FPM receives sudo permission only for `/usr/local/sbin/pmd-tenant-provision`.
- A new tenant stays `disabled` until database, baseline, domain and TLS provisioning succeed; then it becomes `active`.
- Database/registry state is rolled back if database cloning/finalization fails.
- If only domain/TLS fails, the completed database is retained, the tenant remains disabled, and Tenant Health offers Retry provisioning.
- Existing tenant databases are not modified by the installer.

## Live installation

Use the immutable installer commit below. The installer itself downloads an immutable R2 payload commit, so the live deployment cannot silently change if the branch moves later.

```bash
curl -fsSL https://raw.githubusercontent.com/Amir3629/Paymydine-Update/49057b4293d9ecfa867ddb3c54e39c1d1e467220/ops/superadmin-r2/install-live.sh | bash
```

The installer:

1. creates a timestamped backup under `storage/pmd-superadmin-r2/`;
2. downloads only the isolated R2 payload;
3. pre-validates PHP and the provisioning helper before touching live files;
4. appends the R2 route loader after legacy Admin route modules so R2 becomes the final Super Admin route authority;
5. ensures `/superadmin` is excluded from the Next.js catch-all;
6. installs the root-owned provisioning helper and narrow sudoers entry;
7. validates PHP, helper permissions and Nginx before reload;
8. automatically restores the backup if installation validation fails;
9. never runs git checkout/reset/pull.

## Verification

After installation:

```bash
curl -skI https://test.paymydine.com/superadmin
curl -skI https://test.paymydine.com/superadmin/login
```

Expected:

- `/superadmin` -> 302 `/superadmin/login`
- `/superadmin/login` -> 200
- login -> new PayMyDine R2 Overview
- Restaurants -> all central tenants
- Tenant Health -> DB/DNS/TLS/subscription state

Create a disposable tenant only after dashboard, login, restaurant list and health page render correctly. The new tenant should remain disabled during setup and become active only after TLS/vhost provisioning succeeds.

## Domain/TLS provisioning

Wildcard DNS already points tenant hostnames to the VPS, but the current certificate is not a wildcard certificate. R2 therefore provisions TLS per tenant.

For a new domain the helper first creates a temporary HTTP-only Nginx vhost that serves `/.well-known/acme-challenge/`, validates and reloads Nginx, obtains the Let's Encrypt certificate, then replaces the temporary vhost with a clone of the audited `test.paymydine.com` tenant vhost. If the process fails, the previous vhost state is restored.

## Rollback

The installer is rollback-aware and restores its timestamped backup automatically when installation validation fails. The backup path is printed on success as well.

Do not use `git reset --hard` on the VPS: the live tree contains runtime work newer than repository history.
