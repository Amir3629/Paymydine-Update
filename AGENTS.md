# PayMyDine Production Agent Rules

PayMyDine (PMD) is a Laravel/TastyIgniter-style admin project with custom PMD admin patches. Treat this repository as production code.

## Production safety first
- Be extremely conservative. Prefer small, additive, reversible changes.
- Never edit payment, tenant, checkout, or database logic unless the task explicitly asks for it.
- Do not modify database schema unless explicitly requested.
- Do not remove backup, hotfix, disabled, or legacy files without a separate cleanup task.
- Do not change frontend customer ordering flow unless explicitly requested.
- For every change, provide changed files, commands run, and rollback notes.

## Admin UI rules
- Keep admin language/text Persian where existing Persian exists.
- Prefer additive scoped CSS over global overrides.
- Use `pmd-` or `pmd-admin-` prefixed classes only for new admin UI.
- Do not refactor the admin panel globally.
- Do not edit existing admin CSS globally unless explicitly required.
- Do not add new global selectors such as `.btn`, `.card`, `.form-control`, `.dropdown`, `.modal`, `input`, `select`, or `textarea`.
- Avoid `!important`. If unavoidable, add a nearby comment documenting the PMD-specific reason.
- Do not hide elements with JavaScript unless no server-side or CSS-safe option exists.

## QA and evidence
- Never patch symptoms blindly; collect screenshot, trace, or console evidence first.
- For visual/admin tasks, always run Playwright visual QA before final response when credentials and environment allow it.
- Do not create, edit, save, delete, or submit real business data during QA unless explicitly requested.
