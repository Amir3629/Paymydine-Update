# Legacy CSS folder

This folder is intentionally still active through:

```text
app/layout.tsx -> app/globals.css -> styles/global/paymydine-legacy-globals.css -> legacy/*.css
```

Do not delete this folder in one step. The rules still carry production visual compatibility fixes.

Use:

```bash
npm run legacy-css:audit
npm run legacy-css:guard
```

For the full cleanup strategy, read:

```text
docs/LEGACY_CSS_COMPATIBILITY_LAYER.md
```
