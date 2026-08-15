# Laravel/Admin V2 Integration

This directory now contains the installable V2 Theme bridge.

## Files

- `pmd-frontend-v2-theme.php`: read-only `GET /api/v2/frontend-theme` with all 10 canonical V2 Theme IDs.
- `install-v2-theme-bridge.sh`: backup-aware installer that inserts the V2 route loader after the existing legacy `theme-settings.php` loader.
- `../admin/frontend-theme-fields-v2.php`: Admin field definition for the 10 Theme choices and V2 feature switches.

The installer intentionally leaves legacy `/simple-theme` untouched so the existing port-3001 frontend continues to work during staging.

Run from the extracted V2 release:

```bash
sudo env PMD_ROOT=/var/www/paymydine bash integration/laravel/install-v2-theme-bridge.sh
```

Then verify both `/api/v2/frontend-theme` and `/simple-theme` return successfully before restarting or changing any customer frontend upstream.
