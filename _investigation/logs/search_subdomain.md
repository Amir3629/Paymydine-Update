`grep -r "subdomain" .`

<file_content>
_investigation/logs/search_from_ti.md
71:50:- **Live database**: `SELECT id, domain, database, subdomain FROM ti_tenants LIMIT 10;`
76:547:SELECT id, domain, database, subdomain, status, db_host FROM ti_tenants LIMIT 10;

_investigation/logs/search_tenant.md
88:12:**Root Cause**: The admin table edit blade view (`app/admin/views/tables/edit.blade.php`) constructs QR URLs using **database-stored `permalink_slug`** (value: `'default'`) instead of the **current HTTP request host**. This causes all QR codes to point to `http://default.paymydine.com` regardless of which tenant subdomain the admin is accessing.
121:123:**Solution**: Use tenant-specific subdomain
161:27:            $subdomain = $request->header('X-Tenant-Override');
162:28:            Log::channel('tenant_detection')->info('Using X-Tenant-Override header: ' . $subdomain);
165:31:            $subdomain = $parts[0];
166:32:            Log::channel('tenant_detection')->info('Extracted subdomain: ' . $subdomain);
169:35:        if ($subdomain === 'www' || $subdomain === env('APP_DOMAIN', 'paymydine.com')) {
174:40:        $tenant = $this->resolveTenant($subdomain);
177:43:            Log::channel('tenant_detection')->error('Tenant not found for subdomain: ' . $subdomain);
188:54:    protected function resolveTenant($subdomain)
192:58:            return DB::connection('mysql')->table('tenants')->where('subdomain', $subdomain)->first();
227:93:        Log::channel('tenant_detection')->info('Successfully configured and set default connection to tenant: ' . $tenant->subdomain . ' (DB: ' . $tenant->db_name . ')');

TENANT_HOST_LEAK_INVESTIGATION.md
12:**Root Cause**: The admin table edit blade view (`app/admin/views/tables/edit.blade.php`) constructs QR URLs using **database-stored `permalink_slug`** (value: `'default'`) instead of the **current HTTP request host**. This causes all QR codes to point to `http://default.paymydine.com` regardless of which tenant subdomain the admin is accessing.
107:# From subdomain  
136:// From subdomain: "https://amir.paymydine.com/table/1?location=1&guest=1&qr=cashier&..."
358:- Purpose: Originally intended for location-specific subdomains
650:**Testing Required**: 2 scenarios (localhost + subdomain)

FINAL_DEPLOYMENT_REPORT.md
123:**Solution**: Use tenant-specific subdomain
505:# [2024-10-09 XX:XX:XX] local.INFO: Switched to tenant database: rosana for subdomain: rosana
515:# Test 2: QR URLs use tenant subdomain

GITHUB_DEPLOYMENT_SUCCESS.md
40:- ✅ Use tenant-specific subdomains (not localhost)
115:[2024-10-09 XX:XX:XX] local.INFO: Switched to tenant database: rosana for subdomain: rosana
187:✅ QR codes use tenant subdomains  
198:- [ ] Different menus per subdomain

CHANGES_APPLIED_DIFF.md
354:1. Logs show: `"Switched to tenant database: rosana for subdomain: rosana"`
355:2. Different menus per subdomain
357:4. QR URLs contain tenant subdomain (not localhost)

TENANT_FIX_COMPLETE_SUMMARY.md
139:[2024-10-09 XX:XX:XX] local.INFO: Switched to tenant database: rosana for subdomain: rosana

DEPLOYMENT_READY.md
153:[2024-10-09 XX:XX:XX] local.INFO: Switched to tenant database: rosana for subdomain: rosana

FINAL_TENANT_FIX_VERIFICATION.md
207:[2024-10-09 XX:XX:XX] local.INFO: Switched to tenant database: rosana for subdomain: rosana
251:- [ ] Menus/notes observed from two subdomains are isolated (requires server deploy + testing)
278:3. **Test HTTP requests** from both subdomains

CHANGES_SUMMARY.md
104:[2024-10-09 19:30:00] local.INFO: Switched to tenant database: rosana for subdomain: rosana
205:- Confirming different data per subdomain

TENANT_FIX_APPLIED.md
91:**Result**: QR now uses tenant subdomain (e.g., `https://rosana.paymydine.com`)
106:**Result**: Cashier URL uses tenant subdomain
122:**Result**: Table QR URLs use tenant subdomain
165:# Log::info("Switched to tenant database: {$tenant->database} for subdomain: {$subdomain}");
172:# Expected: "Switched to tenant database: rosana for subdomain: rosana"
186:    'subdomain' => $subdomain,
290:- [ ] Test menu API: Different data per subdomain?
292:- [ ] Test QR codes: Use tenant subdomain URLs?
304:[2024-10-09 19:30:00] local.INFO: Switched to tenant database: rosana for subdomain: rosana
309:[2024-10-09 19:31:00] local.INFO: Switched to tenant database: amir for subdomain: amir
342:// Line 27, right after subdomain resolution
344:    'subdomain' => $subdomain,
405:6. **Test QR codes work with tenant subdomains**

README_TENANT_FIX.md
27:- Fixed QR URLs to use tenant subdomain (not localhost)
78:[2024-10-09 XX:XX:XX] local.INFO: Switched to tenant database: rosana for subdomain: rosana
185:**Check 2**: Does subdomain match?
201:    'subdomain' => $subdomain,
290:**Expected Log**: "Switched to tenant database: rosana for subdomain: rosana"  

TENANT_BLEED_INVESTIGATION_REPORT.md
300:$subdomain = $request->header('X-Tenant-Subdomain') 
319:    // If we have at least 3 parts (subdomain.domain.tld), return the first part
339:    ->where('domain', 'like', $subdomain . '.%')
340:    ->orWhere('domain', $subdomain)
399:    // Extract subdomain (e.g., "rosana" from "rosana.paymydine.com")
523:- Domain format: `{subdomain}.paymydine.com`
524:- Database naming: Simple subdomain (`rosana`, not `rosana_db` or `tenant_rosana`)
595:**Result**: QR URLs point to localhost, not tenant subdomain.

artifacts/cache-qr-notes.md
7:**QR URLs**: Use global `FRONTEND_URL` instead of tenant-specific subdomains, potentially directing customers to wrong tenant's menu.
443:3. Browser opens Rosana's subdomain
471:- No subdomain differentiation
476:**Still wrong** - needs tenant-specific subdomain.
504:- Each tenant's QR points to their own subdomain ✓
603:**Impact**: QR codes will use tenant-specific subdomain.
694:4. Verify URL opens correct tenant subdomain

artifacts/README.md
91:- QR URLs: Use localhost, not tenant subdomains

artifacts/middleware-diff.md
21:| **Tenant Lookup** | LIKE pattern: `'domain', 'like', $subdomain . '%'` | Exact match: `'domain', $tenant . '.paymydine.com'` |
38:$subdomain = $request->header('X-Tenant-Subdomain') 
53:    // If we have at least 3 parts (subdomain.domain.tld), return the first part
72:- Standard subdomain parsing
88:    // Extract subdomain (e.g., "rosana" from "rosana.paymydine.com")
120:    ->where('domain', 'like', $subdomain . '.%')
121:    ->orWhere('domain', $subdomain)
265:    Log::warning("No tenant found for subdomain: {$subdomain}");
356:2. Domain format: `{subdomain}.paymydine.com` (full domain with suffix)
357:3. Database name: Simple subdomain without prefix/suffix (`rosana` not `rosana_db`)

artifacts/executive-summary.md
344:# Expected: "Switched to tenant database: rosana for subdomain: rosana"
471:4. **QR codes are broken** - Point to localhost, not tenant subdomains

TENANCY_OVERVIEW.md
17:$subdomain = $request->header('X-Tenant-Subdomain') 
23:- Splits host by `.` and checks for minimum 3 parts (subdomain.domain.tld)
30:    ->where('domain', 'like', $subdomain . '.%')
31:    ->orWhere('domain', $subdomain)
35:- Matches subdomain against `domain` column with flexible pattern
60:- `DetectTenant`: Uses flexible LIKE pattern (`'domain', 'like', $subdomain . '.%'`)

INVESTIGATION_SUMMARY.md
220:- QR codes use global URL instead of tenant-specific subdomain
405:   - Use current request subdomain instead of global FRONTEND_URL

OPEN_QUESTIONS.md
37:### Q2: How does ti_tenants.domain map to subdomains?
41:- Or as `amir` (subdomain only)?
50:- **Live database**: `SELECT id, domain, database, subdomain FROM ti_tenants LIMIT 10;`
53:- `DetectTenant.php:31`: Uses `->where('domain', 'like', $subdomain . '.%')`
276:  - Only current subdomain's tenant?
342:3. Customer scans QR, goes to amir's subdomain
360:- Does frontend make API calls to tenant-specific subdomain?
377:- Verify API calls go to `amir.paymydine.com/api/v1/menu` (not different subdomain)
379:**⚠️ Risk**: If frontend calls wrong subdomain, it will get wrong tenant's data even if backend is fixed.
387:- Could it be stripping or modifying subdomain headers?
392:  $subdomain = $request->header('X-Tenant-Subdomain') 
400:  - If frontend is on Vercel, how does it handle subdomains?
409:      'resolved' => $subdomain,
413:- Check logs to see which header/method provided subdomain
469:- Line 55 of `DetectTenant.php`: "Switched to tenant database: {database} for subdomain: {subdomain}"
547:SELECT id, domain, database, subdomain, status, db_host FROM ti_tenants LIMIT 10;

CONN_TRACE_NOTES.md
23:   - Resolves tenant from subdomain
689:Log::info("Switched to tenant database: {$tenant->database} for subdomain: {$subdomain}");
692:Expected in logs: `Switched to tenant database: amir_db for subdomain: amir`

ROUTES_MIDDLEWARE_COVERAGE.md
363:- Main domain routes (non-subdomain)

INVESTIGATION_INDEX.md
133:1. **Multi-tenancy via subdomain + DB switching** (DetectTenant middleware)
152:- [x] Probed tenancy system (subdomain detection, DB switching)

docs/FINDINGS_Admin_Logout_Issue.md
5:**Environment:** HTTP (no TLS), multi-tenant via subdomain, Laravel + TastyIgniter  
167:- If `SESSION_DOMAIN=.paymydine.com` is set, cookie applies to all subdomains
176:# Bad: .paymydine.com (wildcard) or tenant1.paymydine.com (wrong subdomain)
180:- ✅ Logout happens **only on specific subdomains**

docs/README.md
22:  - Multi-tenant architecture with subdomain-based tenant detection

docs/DEPLOYMENT.md
493:# Tenant subdomains (wildcard)

docs/SECURITY_THREAT_MODEL.md
683:+        // Add tenant subdomains dynamically

docs/ARCHITECTURE.md
81:2. DetectTenant middleware extracts subdomain "rosana"
128:    // If we have at least 3 parts (subdomain.domain.tld), return the first part
361:   - **Code:** `$subdomain = $request->header('X-Tenant-Subdomain') ?? ...`
474:    ↓ Extract subdomain → Query ti_tenants → Switch DB

tenant-icons-map.csv
... and more
