# Restaurant Groups: actual installation versus isolated tests

R4.1 was reported by the operator to pass 12 real MySQL provisioning checks,
with zero failures/skips and cleanup of all five disposable databases. Its TLS,
native template migration and HTTP authentication boundaries were still fixtures.
The previous commands extracted tests to /tmp; they never installed a feature in
/var/www/paymydine. No visible change in Super Admin was expected from those commands.

## This installer actually changes the running checkout

`scripts/install-restaurant-groups-live.py ROOT PINNED_COMMIT --apply` is a real
installation operation. It is not `deploy-restaurant-groups-v1.sh --check-only`.
Run with sudo. The web user defaults to www-data; when multiple PHP-FPM services
are running, select the application's service explicitly with --fpm-service.
PHP CLI must match that PHP-FPM version. Git, Python 3, PHP, Composer, runuser and
systemctl must already be installed; the installer installs no dependencies.

The installer keeps Git HEAD/index and unrelated files intact. It selects only
Restaurant Groups runtime files from the cumulative feature diff and uses a
three-way textual merge for pre-existing integration files. Conflicts, symlinks,
unrecognized existing new feature files and unexpected view structure stop before
live replacement. It inserts a Blade include in the existing Restaurants screen,
so the new multi-location entry is visible without moving the single-restaurant
form. It explicitly enables PMD_RESTAURANT_GROUPS_ENABLED and preserves other env
settings. Because runtime files are applied to the working tree, git status will
show these deployment changes; this is not a branch checkout or commit.

Private backups go to /var/backups/paymydine-groups/<time>-<commit>/ (root-only).
They contain affected files/.env, Composer autoload maps, known native cache paths,
and an SQL snapshot of the central tenants registry and existing group tables.
No tenant database contents are copied. The SQL file has an end marker and checksum;
this is not a claim that a separate restore rehearsal has occurred.

During application the site enters Laravel maintenance mode. The installer applies
files, refreshes Composer autoload without plugins/scripts, clears config/route/view
caches, installs additive CENTRAL tables, validates route/auth bindings and renders
the actual Business Account Blade form with an in-memory CLI session. It reloads
the selected PHP-FPM service and reopens the site. It prints INSTALLED only after
those commands succeed. It does not create/link existing restaurant owners, backfill
all tenants, invoke real TLS or run provisioning as part of installation.

On a handled failure after replacement, it restores backed-up runtime files and
attempts to reopen/reload the previous version. Additive central tables are retained;
it never automatically restores SQL over live data. A killed process, machine crash
or failed rollback may still require manual recovery using the private manifest/log.
Do not share the private SQL backup, .env or unredacted deployment log.

## Visible result

Open `/superadmin/new`: the multi-location entry appears above the existing screen.
Open `/superadmin/groups`: the Independent / Multi-Location / Food Court form and
business-account list are available. The existing group-owner authentication,
scoped overview and conservative publication services from R4.1 are installed.
The native CLI render verifies HTML/form wiring, not an end-to-end browser login.

## Honest scope

This is installation of the CURRENT implementation, not completion of every feature
in the original request. Full native menu/category/modifier/media propagation and
Food Court status/revocation remain restricted or unverified as documented in R3/R4.
Reporting needs a reviewed order-storage timezone; the installer does not guess it.
Do not label a blocked menu publication, unknown report clock, successful route render
or successful synthetic SQL test as full feature acceptance.

The assistant ran 12 isolated installer tests for merge preservation, no early writes,
conflict rejection, rollback, symlink protection, env handling and permissions, and
checked PHP syntax. The live installer has not been executed on the user's VPS by
the assistant. Main is not merged by this commit.
