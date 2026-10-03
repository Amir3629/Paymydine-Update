# PayMyDine R36 — Task 3 Final Bill Fiscal + Release Gate

See PR #161 and GitHub Actions release gates for the exact deployment evidence. The release implementation includes tenant-aware R36 schema repair, Final Bill SIGN DE v2 authority, canonical invoice gating/evidence, and the stage-first installer at `deploy/pmd-r36-final-safe-install.sh`.

Important Germany compliance boundary: SIGN DE is only one part of the Germany fiscal stack. DSFINVK DE and SUBMIT DE remain separate integrations and must not be represented as implemented by this R36 release.

The final release candidate must be deployed only from an exact SHA whose Task 2 validation and Task 3 release gate both pass. The installer itself re-verifies the live baseline, immutable release ancestry, protected feature markers, PHP syntax, fiscal smoke, full V2 `release:audit`, staged production build, PM2 owner/service/cwd, port 3002 health, tenant-aware `php artisan igniter:up --no-interaction`, backups, and rollback evidence before/after activation.
