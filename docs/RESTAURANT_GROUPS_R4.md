# Restaurant Groups R4: resumable provisioning

R3's 52 isolated tests and 9 real MySQL/Illuminate tests were reported successful
by the operator. This does not establish HTTP login, native migrations, TLS or
complete menu/media acceptance. R4 continues from the exact R3 commit
`778fdfc4e7269fb7ef62e2b561ebbde08dd2c025`, not from the stale R2 branch tip.

## Implemented

The canonical lifecycle service has a new internal `createDeferred` entry point.
It creates a disabled registry row and records the owning site in the same central
transaction. It never activates the tenant, never invokes TLS itself, and never
automatically drops a partial group database. Legacy `create(array)` callers keep
the ordinary creation path; registry cleanup now targets the inserted tenant ID.

A stable central MySQL advisory lock serializes retries for one site. Server-owned
checkpoints bind group, owner UUID, domain, database and tenant ID. The checkpoints
are stored under `_provisioning_r4` in the site's existing JSON payload. No additional
central schema migration is required. Phases are reserved, registered, prepared,
domain_ready, profile_ready and ready. An interrupted preparation without a prepared
checkpoint is deliberately held for review, not automatically recloned. Existing
R1/R2/R3 incomplete sites without an R4 checkpoint are not adopted by name.

TLS and country-profile completion precede local Owner linking. Exceptions and
regional readiness warnings block activation. A completed local identity can be
reused after an interrupted central commit without rotating its password. Only
after local verification do access mapping, ready state, activation and audit commit
in one central transaction. A failed sibling does not demote a group with a ready
site. Retry on an already-ready site cannot re-enable a restaurant disabled later.

New group tenants do not copy known group/mobile/sync/device security rows or job,
session and reset queues. Inherited user passwords are randomized, reset tokens
cleared and non-Owner template staff disabled. Exactly one active location and one
canonical pmd-owner role are required. This is not a claim that every extension's
arbitrary integration secret has been audited; review the template's provider and
extension settings before production use. The shared password is never copied into
a tenant. The Super Admin form excludes custom password fields from flashed input.

## Tests

`php tests/restaurant-groups/provisioning-r4.php` exercises the real orchestration,
Owner-link service and canonical creation control flow with in-memory SQL and fake
TLS/template-finalization boundaries. It is not a native migration or browser test.
The assistant ran 49 tests with zero failures. The R2/R3 code paths were not changed
by R4's production files, apart from replacing their unreviewed provisioning path.
Their earlier results must not be relabeled as a complete R4 acceptance result.

`tests/restaurant-groups/mysql-provisioning-r4.php` is an opt-in real-SQL test.
It uses installed Composer libraries and DB credentials from the supplied app root,
without bootstrapping the HTTP kernel or selecting/copying any production database.
It creates up to five fresh `pmd_rgtest_r4_<12 hex>_<0..4>` databases, including its
own miniature template. The canonical clone runs against that miniature template,
not `newtenantdb`. Only successfully created names are retained for cleanup. A
killed process can leave those names behind. Do not increase a production user's
DB privileges merely for this test; use a staging DB account/server when needed.

The runner checks actual checkpoint transactions, template row exclusions, local
credential rollback, activation/audit rollback, retry and sibling isolation.
Domain/TLS, regional profiles and native migration/theme finalization are fixtures.
It has been syntax-checked, but the assistant has not run it against MySQL.

Example from an extracted pinned bundle:

```sh
php tests/restaurant-groups/provisioning-r4.php
php tests/restaurant-groups/mysql-provisioning-r4.php /var/www/paymydine --allow-create-test-databases
```

## Remaining acceptance requirements

Do not run production deployment merely because these service tests pass. Native
full-template migrations, end-to-end HTTP MFA/role restrictions, native menu graph
and media replication, UI flows, and food-court status/revocation still require
acceptance. R3's conservative publishing restrictions remain in force. This revision
does not implement every requested feature or authorize production rollout. The
existing deployment script remains check-only by default.
