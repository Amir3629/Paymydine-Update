# PMD Waiter Standard POS V2.2

This directory stores the validated selective-deployment payload for the isolated waiter POS preview.

Baseline: `agent/waiter-pos-standard-v212-tenant-schema-fix` at `a7733a200f89b4568a713522396cfe49d1527b5b`.

The deployment script reconstructs the payload in filename order and verifies both hashes before touching production:

- Base64 SHA-256: `94846cf5d5ca4e290ba21752707c18b386140f279a84137e251e67fb83b48034`
- Tar/Gzip SHA-256: `b11c8b6824f963b78c6d325cadbf4e59af56dbbb3f320c0c5ea026e62ec12785`

Payload files:

- `app/admin/controllers/PmdWaiterPosV1.php`
- `app/admin/controllers/concerns/PmdWaiterPosOperationsV22Concern.php`
- `app/admin/controllers/concerns/PmdWaiterPosPaymentAllocationConcern.php`
- `app/admin/views/waiter_dashboard_new.blade.php`
- `app/admin/assets/css/pmd-waiter-standard-v22.css`
- `app/admin/assets/js/pmd-waiter-standard-v22.js`
- `routes/pmd-waiter-pos-v22.php`

V2.2 adds frontend-parity split methods, payer progress, table transfer, check merging, selected-item movement, seat/course control, manager-protected void/cancel/reopen actions, print/reprint actions, and a responsive operations workspace. The deploy script creates a complete backup and automatically restores V2.1.2 if any post-install validation fails.
