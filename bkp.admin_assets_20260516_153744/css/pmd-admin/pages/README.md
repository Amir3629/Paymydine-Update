# Pages

Page CSS files provide safe wrapper scopes for future page-specific admin work.

Rules:

- Use page wrapper classes such as `.pmd-page--orders`.
- Do not style global framework selectors directly.
- Do not add real page-specific visual changes until the affected admin page is reviewed and smoke-tested.
- Keep payment, order, Fiskaly, tenant, database, and business logic out of CSS cleanup work.
