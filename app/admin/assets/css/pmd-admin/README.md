# PayMyDine Admin Modular CSS Foundation

This folder is a safe, unloaded foundation for future Laravel/TastyIgniter admin CSS cleanup.

## Rules

- Use `.pmd-` prefixed classes for new custom admin CSS.
- Do not style generic framework selectors such as `.btn`, `.btn-primary`, `.form-control`, `.modal`, `.table`, or `.dropdown-menu` here.
- Do not migrate this admin to Tailwind as part of this cleanup.
- Do not delete legacy admin CSS until equivalent scoped modules are implemented and visually tested.
- Do not change asset loading order without a dedicated review.

## Structure

- `00-variables.css`: passive design tokens.
- `01-base.css`: future scoped base styles.
- `02-layout.css`: future scoped layout helpers.
- `components/`: reusable `.pmd-` component classes.
- `pages/`: page wrapper scopes only until page-specific work is approved.
- `legacy/`: notes for existing global CSS that remains in place.
