# PayMyDine Super Admin R2

This package replaces the legacy DashLite Super Admin page stack with a dedicated PayMyDine control-plane UI and one canonical route owner.

## What R2 owns

- `/superadmin` entry and login
- `/superadmin/index` dashboard
- `/superadmin/new` restaurant registry + creator
- `/superadmin/health` tenant health
- `/superadmin/location-requests`
- `/superadmin/settings`
- central `ti_tenants` / `ti_superadmin` access only
- tenant database creation from `newtenantdb`
- per-tenant TLS/vhost provisioning through a root-owned validated helper

## Safety boundaries

- Super Admin routes explicitly remove TenantDatabaseMiddleware.
- Only the login action creates `superadmin_id` session state.
- R2 does not expose destructive tenant/database deletion.
- The provisioning helper accepts only `^[a-z0-9-]+.paymydine.com$` and is installed root-owned.
- PHP-FPM receives sudo permission only for `/usr/local/sbin/pmd-tenant-provision`.
- Tenant creation uses `status=provisioning` until domain/TLS provisioning succeeds.
- Database/registry state is rolled back if cloning/finalization fails before domain provisioning.
- Existing tenant databases are not modified by the installer.

## Live installation

Run the installer from the live VPS only after reviewing the branch diff:

```bash
curl -fsSL https://raw.githubusercontent.com/Amir3629/Paymydine-Update/feature/superadmin-r2-control-plane/ops/superadmin-r2/install-live.sh | bash
```

The installer:

1. creates a timestamped backup under `storage/pmd-superadmin-r2/`;
2. downloads only the isolated R2 files;
3. appends the R2 route loader after legacy Admin route modules;
4. ensures `/superadmin` is excluded from the Next.js catch-all;
5. installs the validated provisioning helper and narrow sudoers entry;
6. validates PHP and Nginx before reload;
7. does not run git checkout/reset/pull.

## Verification

After installation:

```bash
curl -skI https://test.paymydine.com/superadmin
curl -skI https://test.paymydine.com/superadmin/login
```

Expected:

- `/superadmin` -> 302 `/superadmin/login`
- `/superadmin/login` -> 200
- authenticated `/superadmin/index` -> 200

Create a disposable tenant only after dashboard, login, restaurant list and health page render correctly.

## Rollback

The installer prints the timestamped backup directory. Restore `routes.php`, `next-proxy.php` and the Nginx vhost from that backup, remove the R2 route/controller/service/view files, then run `nginx -t` before reload.

Do not use `git reset --hard` on the VPS: the live tree contains runtime work newer than repository history.
