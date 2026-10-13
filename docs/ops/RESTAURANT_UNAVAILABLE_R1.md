# PMD restaurant unavailable page R1

## Why

A missing, disabled, removed, not-yet-started, or expired
\`*.paymydine.com\` tenant is rejected by the central
\`/__pmd/tenant-access\` gate. The former Nginx fallback sent visitors
directly to the company landing page. R1 presents a branded, non-indexable
"Restaurant unavailable" page on the **original tenant hostname** and
offers explicit links to PayMyDine, Contact and Support.

The generic text intentionally does not distinguish unknown from private,
suspended, or expired restaurants and never offers tenant sign-in.

## Files

- \`public/restaurant-unavailable.html\`: standalone EN/DE page, with
  system fonts and inline CSS/JS; **no tenant database** and no external assets
- \`ops/nginx/pmd-tenant-unavailable-r1.conf\`: Nginx server-context
  \`error_page\` and internal static file location
- \`app/Http/Middleware/TenantDatabaseMiddleware.php\`: fail-closed Laravel
  Admin fallback using the same HTML document, HTTP 503
- \`scripts/pmd-install-tenant-unavailable-r1.py\`: safe installer / rollback
- \`ops/nginx/pmd-unknown-tenant-wildcard-r1.conf.example\`: OPTIONAL example
  for catch-all HTTPS after wildcard DNS and TLS are ready

## Deploy

From \`/var/www/paymydine\`:

\`\`\`bash
git -c gc.auto=0 fetch origin main
git -c gc.auto=0 merge --ff-only origin/main
python3 scripts/test-pmd-tenant-unavailable-r1.py
php -l app/Http/Middleware/TenantDatabaseMiddleware.php
python3 scripts/pmd-install-tenant-unavailable-r1.py
sudo python3 scripts/pmd-install-tenant-unavailable-r1.py --apply
php artisan view:clear
\`\`\`

The installer only touches active Nginx site files containing
\`PMD_TENANT_ACCESS_GATE_R2_START\` and the exact previous
\`error_page 401 403 =302 https://paymydine.com/;\` directive.
It backs up files under \`/var/backups/pmd-tenant-unavailable/\`, tests
Nginx syntax and reloads, and auto-restores on failure. Its output includes
a rollback command. **Never replace active tenant vhosts wholesale.**

## Verify

- Active tenant: \`curl -I https://london.paymydine.com/admin/login\`
  must NOT show the unavailable page.
- Rejected tenant: GET a known inactive/expired tenant on the same VPS.
  Expect HTTP 503, \`X-Robots-Tag: noindex, nofollow\`, a page saying
  "This restaurant isn't available yet" and working official contact links.
- Central company page: \`https://www.paymydine.com/\` still loads normally.
- Re-run installer dry run: changed file count must be zero.

## Completely unknown subdomains: DNS and HTTPS matter

A hostname that has never been provisioned needs **both**
1. wildcard DNS A/AAAA \`*.paymydine.com\` to the correct gateway; and
2. a valid wildcard \`*.paymydine.com\` HTTPS certificate via DNS-01
   and an Nginx wildcard catch-all server.

The installer **does not** assume or configure these prerequisites. See
the example Nginx vhost, inspect \`sudo nginx -T\`, and provision wildcard
DNS/cert before enabling it. Exact active tenant vhosts take precedence
over the wildcard server. Without wildcard DNS and a matching TLS cert,
the browser cannot reach any HTML page on \`random.paymydine.com\`
over HTTPS. Do not use \`curl -k\` as proof that HTTPS is correctly deployed.

## Contact information

The site currently exposes official public Contact and Support pages:
\`https://www.paymydine.com/contact\` and
\`https://www.paymydine.com/support\`.
A business email/phone has not been independently verified, so the page
does not invent one. Replace these links only when official contact details
are confirmed.
