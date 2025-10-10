# Phase 1 Verification Guide

## Changes Made

This phase eliminated cross-tenant leakage by:
1. Removing all duplicate `/api/v1` routes from `app/admin/routes.php`
2. Ensuring canonical API routes in `routes.php` have `detect.tenant` middleware
3. Removing duplicate notifications API routes from `app/admin/routes.php`
4. Fixed hardcoded `ti_statuses` references to use auto-prefixed `statuses`

## Files Modified

- `routes.php` - Added `webhooks/pos` route, fixed `ti_statuses` references
- `app/admin/routes.php` - Removed 709 lines of duplicate API routes (1085 → 376 lines)

## Manual Testing

### Prerequisites

1. Map tenant subdomains to localhost in `/etc/hosts`:
   ```
   127.0.0.1  amir.paymydine.com
   127.0.0.1  rosana.paymydine.com
   127.0.0.1  paymydine.com
   ```

2. Start the Laravel development server:
   ```
   php artisan serve
   ```

### Test 1: Tenant A Menu Items

```bash
# Should return menu items from tenant A's database
curl -H "Host: amir.paymydine.com" http://127.0.0.1:8000/api/v1/menu | jq '.data.items | length'

# Expected: Number of menu items for amir tenant
# Example output: 15
```

### Test 2: Tenant B Menu Items

```bash
# Should return menu items from tenant B's database (different from A)
curl -H "Host: rosana.paymydine.com" http://127.0.0.1:8000/api/v1/menu | jq '.data.items | length'

# Expected: Number of menu items for rosana tenant (should differ from tenant A)
# Example output: 23
```

### Test 3: No Subdomain (Should Fail or Use Default)

```bash
# Should return 404 or error since no tenant detected
curl -H "Host: paymydine.com" http://127.0.0.1:8000/api/v1/menu

# Expected: 404 Not Found or error message about tenant not found
```

### Test 4: Verify Tenant Isolation

```bash
# Get tenant A's menu
TENANT_A_MENU=$(curl -s -H "Host: amir.paymydine.com" http://127.0.0.1:8000/api/v1/menu | jq '.data.items[0].name')

# Get tenant B's menu  
TENANT_B_MENU=$(curl -s -H "Host: rosana.paymydine.com" http://127.0.0.1:8000/api/v1/menu | jq '.data.items[0].name')

# Compare - they should be different if tenants have different menus
echo "Tenant A first item: $TENANT_A_MENU"
echo "Tenant B first item: $TENANT_B_MENU"

# Expected: Different menu item names if tenants have unique menus
```

### Test 5: Settings Endpoint (Also Tenant-Scoped)

```bash
# Tenant A settings
curl -H "Host: amir.paymydine.com" http://127.0.0.1:8000/api/v1/settings | jq '.site_name'

# Tenant B settings
curl -H "Host: rosana.paymydine.com" http://127.0.0.1:8000/api/v1/settings | jq '.site_name'

# Expected: Different site names per tenant
```

### Test 6: Webhooks/POS Endpoint

```bash
# Should be accessible (may require authentication)
curl -X POST -H "Content-Type: application/json" \
  http://127.0.0.1:8000/api/v1/webhooks/pos \
  -d '{"test": "data"}'

# Expected: Some response (may be auth error, but route should exist)
```

## Automated Checks

### Check 1: No Duplicate API Routes in app/admin/routes.php

```bash
# Should return NO matches (all removed)
grep -n "prefix.*api/v1" app/admin/routes.php

# Expected output: (empty)
```

### Check 2: Canonical API in routes.php

```bash
# Should show TWO api/v1 groups:
# 1. Frontend API with ['api'] middleware
# 2. Custom API with ['web', 'detect.tenant'] middleware
grep -n "prefix.*api/v1" routes.php

# Expected output:
# 360:    'prefix' => 'api/v1',
# 375:    'prefix' => 'api/v1',
```

### Check 3: No Hard-Coded ti_statuses

```bash
# Should return NO matches
grep -n "ti_statuses" routes.php app/admin/routes.php

# Expected output: (empty)
```

### Check 4: webhooks/pos in routes.php

```bash
# Should find the route
grep -n "webhooks/pos" routes.php

# Expected output:
# 366:    Route::post('webhooks/pos', 'PosWebhookController@handle');
```

## Expected Route List

Key routes that should appear in `php artisan route:list`:

1. `GET|HEAD  api/v1/menu` - With `detect.tenant` middleware
2. `POST      api/v1/orders` - With `detect.tenant` middleware
3. `GET|HEAD  api/v1/restaurant` - With `detect.tenant` middleware
4. `GET|HEAD  api/v1/settings` - With `detect.tenant` middleware
5. `POST      api/v1/webhooks/pos` - With `api` middleware (not tenant-scoped)
6. `POST      admin/statuses/toggle-order-notifications` - With `web,admin` middleware

## Success Criteria

- [ ] Both route files pass `php -l` lint check
- [ ] `php artisan optimize:clear` runs successfully
- [ ] No `api/v1` routes in `app/admin/routes.php`
- [ ] Canonical `api/v1` routes in `routes.php` have `detect.tenant` middleware
- [ ] `webhooks/pos` route exists in `routes.php`
- [ ] No `ti_statuses` references (replaced with `statuses`)
- [ ] Manual curl tests show different data per tenant subdomain

## Files in This Directory

- `lint_and_clear.txt` - Output from PHP linting and artisan optimize:clear
- `grep_checks.txt` - Automated grep verification results
- `route_list_snapshot.txt` - First 200 lines of `php artisan route:list`
- `README.md` - This file

## Next Steps (Phase 2)

After Phase 1 is verified and approved, Phase 2 will address:
1. Cache scoping (dynamic cache prefix per tenant)
2. Session safety (tenant ID validation)
3. Filesystem isolation (tenant-specific storage paths)
4. Queue tenant context (if queues are used)

See `NEXT_STEPS_PHASE2.md` for detailed plans.

