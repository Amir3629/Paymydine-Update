# Menu Highlight Tenant Diagnostics

Use these checks on the production host when Chef Recommended / Best Seller badges do not appear for a tenant.

## Confirm the active `/api/v1/menu` handler

```bash
sudo -u www-data php artisan route:list | grep -E 'api/v1/menu(\s|$)'
```

The production menu route should return `data.menu_api_version = "menu-highlights-v2"`:

```bash
curl -ks --resolve mimoza.paymydine.com:443:127.0.0.1 \
  'https://mimoza.paymydine.com/api/v1/menu?ts='"$(date +%s)" \
  | python3 -m json.tool | head -80
```

## Resolve the tenant DB for `mimoza.paymydine.com`

Do not use `DB_DATABASE=paymydine` for tenant menu checks. Resolve the tenant row from the landlord connection:

```bash
sudo -u www-data php artisan tinker --execute='\
$tenant = DB::connection("mysql")->table("tenants")\
    ->where("domain", "mimoza.paymydine.com")\
    ->orWhere("domain", "mimoza")\
    ->orWhere("domain", "like", "mimoza.%")\
    ->first();\
dump($tenant);\
'
```

The tenant row's `database` value is the database that must contain menu IDs such as 94, 133, and 134.

## Check tenant menu highlight columns and sample values

Replace `<TENANT_DB>` with the resolved tenant database name:

```bash
mysql -u "$DB_USERNAME" -p -e "
SELECT DATABASE();
SHOW COLUMNS FROM <TENANT_DB>.ti_menus LIKE 'is_chef_recommended';
SHOW COLUMNS FROM <TENANT_DB>.ti_menus LIKE 'is_manual_bestseller';
SHOW COLUMNS FROM <TENANT_DB>.ti_menus LIKE 'bestseller_override_mode';
SELECT menu_id, menu_name, is_chef_recommended, is_manual_bestseller, bestseller_override_mode
FROM <TENANT_DB>.ti_menus
WHERE menu_id IN (94,133,134)
   OR is_chef_recommended = 1
   OR bestseller_override_mode = 'force_on'
ORDER BY is_chef_recommended DESC, bestseller_override_mode = 'force_on' DESC, menu_id DESC
LIMIT 20;
"
```

## Expected API proof

For a tenant item marked Chef Recommended, the `/api/v1/menu` response should include:

```json
{
  "is_chef_recommended": true,
  "is_bestseller": false,
  "bestseller_source": null,
  "popularity_count": 0
}
```

For a tenant item with `bestseller_override_mode = "force_on"`, the response should include:

```json
{
  "is_bestseller": true,
  "bestseller_source": "manual"
}
```
