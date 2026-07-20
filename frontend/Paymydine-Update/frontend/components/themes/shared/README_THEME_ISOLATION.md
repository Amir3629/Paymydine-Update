# PayMyDine Theme Isolation Rules

This folder is for **contracts and shared behavior only**.

Allowed here:
- action contracts
- action factories
- theme registry helpers
- non-visual utility logic

Not allowed here:
- final theme-specific button/card/menu/checkout UI
- theme-specific colors
- theme-specific border radius
- theme-specific shadows
- theme-specific typography

Theme UI must live in:
- `components/themes/kazen-japanese`
- `components/themes/modern-green`
- `components/themes/organic-botanical-paper`
- `components/themes/gold-luxury`

Rule:
Changing a file inside one theme folder should only visually affect that theme.
Changing shared files can affect all themes, so shared files must stay functional/contract-only.
