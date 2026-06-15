# PayMyDine Codex Theme Migration Context

Production frontend:
`frontend/`

Temporary source references:
`_codex_theme_sources/pmd-v0-botanical-exact`
`_codex_theme_sources/pmd-modern-green-standalone`

These two folders are reference sources only.
They must not remain as separate production frontends.

Goal:
Migrate Organic Botanical Paper and Modern Green into the single main PayMyDine frontend.

Final target folders:
`frontend/components/themes/modern-green`
`frontend/components/themes/organic-botanical-paper`

Rules:
- No iframe for Modern Green or Organic.
- No `/newfrontend`.
- No `/dev/botanical-v0-exact`.
- No postMessage/contentWindow bridge for rendering UI.
- UI must be isolated inside each theme folder.
- Shared files must contain only contracts, hooks, data mapping, and behavior.
