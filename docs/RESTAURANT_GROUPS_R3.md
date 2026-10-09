# Restaurant groups R3: release status and test boundaries

This is an experimental branch, not production acceptance. R2's 66 isolated
security checks were also run successfully by the operator on the VPS. R3 adds
52 isolated publication/money/date checks. Those use database/security fixtures,
not a running Laravel application or MySQL server.

## Implemented in R3

Publication previews are versioned and bind source, business UUID and owner auth
version. All targets are validated before the operation/targets/audit are committed
in one central transaction. Old R2 previews must be recreated. Applying rechecks
source/target membership and permissions. Existing target state (including absence)
is checked inside the target transaction. MySQL advisory locks serialize operation
replays and same-entity publications. InnoDB is required. Target receipts commit
with the target definition, so retrying after partial completion does not duplicate
already committed copies. Different local coupon-code owners are not overwritten.
Stale-preview force-overwrite is deliberately unavailable. Each target result stays
visible in the UI. Settings are written only in `sort=config`; the corresponding
tenant settings cache is invalidated. No runtime DDL is done by the publisher.

The new group overview is read-only. It never changes AdminLocation or the active
tenant database. Local KPI/analytics panels are hidden while an all/other-location
report is selected rather than overwritten with mixed-scope values. It reports
recorded settled amounts, paid/settled order count and tips. It is NOT a claim of
identical financial semantics to every native dashboard KPI, net sales, profit,
tax reporting or refund-adjusted revenue. Amounts use integer minor units; currencies
are separated, averages are weighted by order count, and unavailable sites are
explicitly excluded with an incomplete-report warning instead of shown as zero.
The report requires an explicitly reviewed order-storage timezone through
`PMD_GROUPS_REPORTING_STORAGE_TIMEZONE` (or a per-tenant
`pmd_groups_storage_timezone` config setting). Do not guess UTC for historical data.
Currency precision and restaurant timezone must be resolvable from tenant settings
or its supported country profile. Local calendar-day ranges handle DST.

## Real database test runner (opt-in)

`tests/restaurant-groups/mysql-r3.php` uses the VPS's already-installed Composer
packages and `.env` DB connection credentials. It does NOT bootstrap the application
kernel, load a real admin session, select the production DB, or copy production rows.
It creates four fresh random `pmd_rgtest_<12 hex characters>_<0..3>` databases using
CREATE DATABASE without IF NOT EXISTS. Only successfully created names are recorded
for cleanup, and only those names are dropped at the end. It deliberately requires
`--allow-create-test-databases`. A killed process can leave its generated test DBs;
remove only the exact printed generated names after review. Do not grant broad
production DB privileges merely to make this runner pass; use a staging database
server/test account when the existing account cannot create disposable databases.

Example, from an extracted feature bundle:

```sh
php tests/restaurant-groups/mysql-r3.php /var/www/paymydine --allow-create-test-databases
```

The runner covers real schema installation, Store membership checks, coupon writes,
receipt replay, conflicts, rollback/retry, access revocation, settings namespaces and
the reporting SQL. Authentication is an explicit fixture. It does NOT test full
HTTP login/MFA, browser workflows, TLS/domain provisioning or native menu models.
It has been syntax-checked but has NOT been executed against MySQL by the assistant.

## Remaining release blockers and intentionally refused cases

Full Super Admin provisioning/retry and live HTTP authentication/MFA still need
staging acceptance. The existing provisioner/owner linker were not repaired by R3;
its retry/group-activation and template-sanitization behavior must be audited.
The existing native menu writer is not proven cross-tenant safe. R3 refuses new
category creation through its raw SQL path, nested-category publication, modifier
allergens, and replacement of existing modifier identifiers. It also refuses
changes to an existing shared taxonomy/modifier definition. A native isolated writer
and complete menu graph/media/cache tests are still required. This is deliberately
NOT described as complete menu replication. Prices/images/stock/fiscal settings
must not be assumed to share identically. Only the three low-risk presentation
flags listed in PublicationData::SETTINGS are enabled; language bundles, payment,
tax, address, printer and terminal configuration are not published.

Food-court display lifecycle/status semantics and revocation need acceptance; R3
is not a completed venue-ordering/shared-cart/settlement implementation. No production
rollout or feature enablement is authorized by passing isolated tests alone. The
existing deployment script remains check-only by default; do not use --apply until
the above native/runtime gaps are resolved and a restorable backup is verified.
