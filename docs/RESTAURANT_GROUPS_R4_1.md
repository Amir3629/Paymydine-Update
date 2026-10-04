# R4.1: repair the disposable-database runner bootstrap

The operator ran R4 at `25fcf743d8ec98c638c3be406ede6eb4fabe873f`.
Its 49 isolated provisioning tests passed, but the real-SQL runner reported
10 failures and created only its central and miniature-template databases.
Both were reported removed. This is a failed integration result, not acceptance.

## Identified bootstrap defect

The runner installed a config repository with `database.default=mysql` BEFORE
constructing `Illuminate\Database\Capsule\Manager`. In Laravel 8 that constructor
calls `setupDefaultConfiguration()`, which unconditionally sets the default to
`default`. Adding named connections does not restore the selected default.
`SuperAdminTenantLifecycleService::createDeferred()` then correctly rejects the
noncentral default before any tenant allocation. The old runner converted the
service's failed result into an uninformative assertion error and discarded the
underlying service log with NullLogger. Dependent checks then used absent tenants.

R4.1 explicitly calls `setDefaultConnection('mysql')` AFTER Capsule construction,
on the isolated test container only. No production service, guard, database
migration, authentication code or deployment setting is changed by this revision.

## Runner changes

The original ten SQL scenarios/assertions are retained. Two checks additionally
verify the selected central TEST database and prove the production creator still
refuses a template-default context before allocation. Dependencies are explicit:
a failed prerequisite produces SKIP rather than another misleading failure.
Skipped checks never count as successful acceptance and cause a nonzero exit.
Service error diagnostics are buffered and printed on failed checks, with SQL
bindings, configured credentials, control characters and unrelated context omitted.

The original opt-in and cleanup boundaries remain: at most five freshly generated
`pmd_rgtest_r4_<12 hex>_<0..4>` databases; no application bootstrap, production-row
copying, native migrations, real TLS, web-server changes or production deployment.
A forcibly killed process can leave its exact printed test databases behind.
Do not grant wider production privileges merely to run these tests.

## Verification status

The assistant checked PHP syntax and ran 14 diagnostics/dependency self-tests with
zero failures. Those are tests of the test runner, NOT real SQL or provisioning.
The corrected MySQL suite has not been executed by the assistant; a successful
operator rerun is still required. Passing it would still not establish full
HTTP/MFA, native-template, menu/media or Food Court UI acceptance.

From an extracted pinned bundle:

```sh
php tests/restaurant-groups/mysql-r4-support-test.php
php tests/restaurant-groups/mysql-provisioning-r4.php /var/www/paymydine --allow-create-test-databases
```

No `--apply` deployment is part of this repair.
