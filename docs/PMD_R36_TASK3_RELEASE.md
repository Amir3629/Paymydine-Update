# PayMyDine R36 — Task 3 Final Bill Fiscal + Release Gate

## Status

R36 Tasks 1–2 provide the Billing Group / Final Bill financial authority, atomic grouped payments, provider return reconciliation, canonical Final Bill invoice ownership, Admin visibility, and R45 manual table-free authority.

Task 3 adds the release/fiscal safety layer:

- Final Bill SIGN DE transaction authority in `pmd_billing_groups`.
- Current SIGN DE v2 `standard_v1.receipt` payloads.
- One TSS transaction per R36 Final Bill; R36 child kitchen orders are explicitly deferred and are not signed separately.
- Durable fiscal revision/attempt/error/policy/evidence fields.
- Merchant/tax-policy gates before a Final Bill is treated as fiscally configured.
- Canonical invoice merchant identity gate and TSE evidence output.
- Staff-only fiscal retry endpoint for closed Final Bills.
- Tenant-aware repair migration that guarantees the complete R36 schema on every active tenant database.
- Same-filesystem V2 safe-stage installer, immutable-source checks, backups, health verification, and application rollback.
- GitHub Actions Task 3 release gate, full V2 `release:audit`, and production build.

## SIGN DE schema authority

The implementation is based on the current fiskaly Germany SIGN DE v2 documentation and machine-readable OpenAPI specification:

- `https://workspace.fiskaly.com/countries/germany/quickstart/`
- `https://workspace.fiskaly.com/countries/germany/integration-guide/`
- `https://workspace.fiskaly.com/specs/sign-de-v2.json`

The R36 Final Bill uses the documented transaction lifecycle:

1. `ACTIVE`, revision 1.
2. `FINISHED`, revision 2.
3. `schema.standard_v1.receipt.receipt_type = RECEIPT`.
4. Gross amounts are grouped by the SIGN DE VAT enum.
5. Settled Billing Group payments are grouped as `CASH` and `NON_CASH`.
6. The same durable Billing Group Fiskaly transaction UUID is reused for retry/recovery.

Supported SIGN DE VAT mappings in the current R36 builder:

| Rate | SIGN DE enum |
| --- | --- |
| 19% | `NORMAL` |
| 7% | `REDUCED_1` |
| 10.7% | `SPECIAL_RATE_1` |
| 5.5% | `SPECIAL_RATE_2` |
| 0% | `NULL` |

An unsupported rate is refused rather than silently mapped.

## Important Germany compliance boundary

This release adds the R36 Final Bill integration to **SIGN DE**. It must not be described as the whole German fiscal/compliance stack.

Current fiskaly Germany documentation states that a complete Germany integration also includes:

- **DSFINVK DE** for audit-ready cash-point closings/exports.
- **SUBMIT DE** for the electronic ERS declaration/ELSTER workflow.
- Long-term archival such as SAFE is recommended separately.

Those products are separate integrations. Existing PayMyDine source did not contain a complete DSFINVK DE or SUBMIT DE implementation during this R36 audit. Production legal/compliance acceptance therefore still requires the merchant/tax advisor and the complete Germany fiscal stack to be reviewed independently.

## Merchant/tax policy gates

R36 intentionally does not guess tax treatment for service charge, tips, discounts, or legal invoice identity.

When an enabled `fiskaly_configs` row applies to the location, configure the following through PayMyDine settings or the corresponding environment fallbacks before confirming the fiscal policy.

### Fiscal policy

```dotenv
PMD_R36_FISCAL_POLICY_CONFIRMED=1
PMD_R36_SERVICE_CHARGE_VAT_RATE=inherit
PMD_R36_TIP_FISCAL_VAT_RATE=0
PMD_R36_DISCOUNT_FISCAL_MODE=child_gross
```

The values above are **examples, not tax advice**. `inherit`, `19`, `7`, `10.7`, `5.5`, and `0` are accepted for the service/tip VAT rate. Do not set `PMD_R36_FISCAL_POLICY_CONFIRMED=1` until the restaurant/tax policy has actually been approved.

If the Final Bill contains no service charge, no tip, or no discount, the corresponding conditional policy is not needed for that component.

### Canonical invoice identity

```dotenv
PMD_R36_INVOICE_IDENTITY_CONFIRMED=1
PMD_R36_INVOICE_LEGAL_NAME="Example Restaurant GmbH"
PMD_R36_INVOICE_LEGAL_ADDRESS="Example Street 1, 10115 Berlin, Germany"
PMD_R36_INVOICE_TAX_ID="DE123456789"
```

These values are examples. Use the restaurant's actual legal supplier identity and tax/VAT identifier. The customer Final Bill invoice remains blocked if identity confirmation or required identity values are absent.

## TSS failure behavior

A provider-confirmed payment is never rolled back because a later remote Fiskaly call fails.

The table-free flow is deliberately split:

1. Lock/verify Final Bill and payment state.
2. Commit the R45 table-free + Billing Group close + canonical invoice number locally.
3. Call SIGN DE after commit.
4. Persist `fiscalized`, `failed`, or `blocked` evidence on the Billing Group.

`blocked` means PayMyDine does not have an approved fiscal policy/configuration and the canonical invoice download remains gated.

`failed` means a remote signing attempt failed after the sale/payment was durably recorded. The invoice may still be issued with an explicit TSS failure notice and the Billing Group remains available for staff fiscal retry. The separate DSFinV-K process must account for unsigned/error transactions as required by that integration.

## Tenant database schema authority

`app/admin/database/migrations/2026_08_21_364000_ensure_pmd_billing_groups_on_tenants.php` is a non-destructive repair migration. It:

- ensures the complete R36 Billing Group / order-link / payment schema on the current connection;
- enumerates every `tenants.status = active` database from the main `mysql` connection;
- switches the configured `tenant` connection to each active tenant database and applies the same additive repair;
- fails the update if any active tenant cannot be updated, instead of silently activating a mixed schema fleet;
- never drops financial/fiscal evidence in `down()`.

The VPS installer therefore uses the application's real TastyIgniter update path, `php artisan igniter:up --no-interaction`, rather than relying on a generic Laravel migration path that may not load Admin module migrations.

## Safe VPS release

The installer is:

`deploy/pmd-r36-final-safe-install.sh`

It is intentionally stage-first.

### Invariants

- Never builds in the live V2 directory.
- Requires an immutable non-live Git checkout.
- Requires the live tracked worktree to exactly match `PMD_BASE_SHA`.
- Uses a same-filesystem stage under `/var/www/paymydine/storage`.
- Reuses the already-installed live V2 `node_modules` via hard links; it does not mutate production dependencies.
- Runs PHP syntax/fiscal smoke checks.
- Runs the full V2 `release:audit` and a production `next build` in stage.
- Verifies PM2 owner/service/cwd and port 3002.
- Does not activate unless `PMD_ACTIVATE=YES` is explicit.
- Backs up every overwritten runtime file and the previous `.next` build.
- Copies the additive R36 Admin migrations and runs tenant-aware `igniter:up` before activating code that requires the new schema.
- Restarts only `paymydine-frontend-v2` as the `ubuntu` PM2 owner.
- Verifies local port 3002 health and public health/preview.
- Auto-restores application files/build on an activation failure.
- Never drops R36 financial/fiscal DB tables or evidence during application rollback.

### Stage-only pattern

```bash
sudo -u ubuntu -H bash -lc '
set -Eeuo pipefail
ROOT=/var/www/paymydine
BASE_SHA=<exact-live-main-sha>
RELEASE_SHA=<exact-r36-release-sha>
SRC="$ROOT/storage/releases/r36-$RELEASE_SHA"

git clone --no-checkout https://github.com/Amir3629/Paymydine-Update.git "$SRC"
git -C "$SRC" fetch --depth=1 origin "$RELEASE_SHA"
git -C "$SRC" checkout --detach "$RELEASE_SHA"

PMD_SOURCE="$SRC" \
PMD_BASE_SHA="$BASE_SHA" \
PMD_RELEASE_SHA="$RELEASE_SHA" \
PMD_ACTIVATE=NO \
bash "$SRC/deploy/pmd-r36-final-safe-install.sh"
'
```

Only after the stage reports `STAGE PASS` should the exact same immutable release be run with `PMD_ACTIVATE=YES`.

## GitHub release-gate evidence

At release-candidate head `dab1ceaf5ebbece3577c4725d945852e68fd6767`, both automated gates passed:

- `R36 Task 2 validation` run `32520737806`: PASS.
- `R36 Task 3 release gate` run `32520737801`: PASS.

The Task 3 gate includes PHP syntax, deterministic fiscal payload smoke, R36 authority invariants, tenant-aware migration markers, installer syntax/protections, `npm ci`, full V2 `release:audit`, and a full Next.js production build.

A later documentation-only commit may move the branch SHA; re-run/check both gates on the exact deployment SHA before VPS activation.

## Post-activation evidence

A successful activation prints:

- exact release SHA;
- backup directory;
- generated rollback script path;
- local V2 health endpoint;
- public V2 preview endpoint.

Keep that output with the deployment record. The generated rollback script restores source/build only; it intentionally preserves additive R36 financial/fiscal DB evidence.
