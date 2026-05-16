# Legacy Admin CSS Notes

Existing global admin CSS remains in place. Do not delete or reorder legacy files during the modular foundation phase.

Legacy files called out by the quick audit include, but are not limited to:

- `app/admin/assets/css/admin.css`
- `app/admin/assets/css/dashboard.css`
- `app/admin/assets/css/custom-fixes.css`
- `app/admin/assets/css/admin-settings-modern.css`
- `app/admin/assets/css/blue-buttons-override.css`
- `app/admin/assets/css/no-green-toolbar-buttons.css`
- `app/admin/assets/css/fix-green-buttons-and-text.css`
- `app/admin/assets/css/header-dropdowns.css`

Future PRs should migrate small, well-understood pieces into scoped `.pmd-` modules only after visual smoke checks.
