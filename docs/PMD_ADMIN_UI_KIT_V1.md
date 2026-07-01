# PMD Admin UI Kit v1

This document defines safe, additive admin UI conventions for future PMD admin work. Classes are intentionally prefixed and must not be loaded globally until a separate implementation task approves production integration.

## Global rules

- Scope new UI under `.pmd-admin-ui-v1`.
- Use only `pmd-` or `pmd-admin-` prefixed classes for new admin UI.
- Do not override global `.btn`, `.card`, `.form-control`, `.dropdown`, `.modal`, `input`, `select`, or `textarea` selectors.
- Keep existing Persian admin text Persian.
- Avoid `!important`; if unavoidable, document the PMD reason in a CSS comment.
- Mobile first breakpoint guidance: stack toolbar/header actions below 640px.

## Component standards

### Page shell
- Intended class names: `.pmd-admin-page-shell`.
- Spacing rules: 24px between major regions.
- Height rules: content-driven.
- Border radius rules: none on shell.
- Mobile behavior: one column only.
- What not to do: use global container overrides.
```html
<main class="pmd-admin-ui-v1 pmd-admin-page-shell">...</main>
```

### Page header
- Intended class names: `.pmd-admin-page-header`.
- Spacing rules: 16px between title and actions.
- Height rules: no fixed height.
- Border radius rules: none by default.
- Mobile behavior: stack title and toolbar.
- What not to do: hide title/actions with JavaScript.
```html
<header class="pmd-admin-page-header"><h1>عنوان</h1><div class="pmd-admin-toolbar">...</div></header>
```

### Toolbar
- Intended class names: `.pmd-admin-toolbar`.
- Spacing rules: 12px gap, wrap safely.
- Height rules: content-driven.
- Border radius rules: none by default.
- Mobile behavior: stack controls when narrow.
- What not to do: rely on global `.btn` spacing.
```html
<div class="pmd-admin-toolbar"><button class="pmd-admin-btn pmd-admin-btn-primary">ذخیره</button></div>
```

### Primary, secondary, danger, and back buttons
- Intended class names: `.pmd-admin-btn`, `.pmd-admin-btn-primary`, `.pmd-admin-btn-secondary`, `.pmd-admin-btn-danger`, `.pmd-admin-btn-back`.
- Spacing rules: 0 16px horizontal padding, 12px toolbar gap.
- Height rules: minimum 40px.
- Border radius rules: 8px.
- Mobile behavior: full-width in stacked toolbars when useful.
- What not to do: attach destructive actions without confirmation patterns.
```html
<button class="pmd-admin-btn pmd-admin-btn-primary" type="button">ذخیره</button>
<button class="pmd-admin-btn pmd-admin-btn-secondary" type="button">انصراف</button>
<button class="pmd-admin-btn pmd-admin-btn-danger" type="button">حذف</button>
<a class="pmd-admin-btn pmd-admin-btn-back" href="#">بازگشت</a>
```

### Input, select, and textarea
- Intended class names: `.pmd-admin-field`, `.pmd-admin-input`, `.pmd-admin-select`, `.pmd-admin-textarea`.
- Spacing rules: 8px label-to-control, 16px between fields.
- Height rules: input/select minimum 40px; textarea minimum 96px.
- Border radius rules: 8px.
- Mobile behavior: full container width.
- What not to do: style native controls globally.
```html
<label class="pmd-admin-field">نام<input class="pmd-admin-input" name="demo"></label>
<label class="pmd-admin-field">نوع<select class="pmd-admin-select"><option>نمونه</option></select></label>
<label class="pmd-admin-field">توضیح<textarea class="pmd-admin-textarea"></textarea></label>
```

### Checkbox
- Intended class names: `.pmd-admin-checkbox`.
- Spacing rules: 8px between box and label.
- Height rules: at least 32px hit area.
- Border radius rules: native control unless separately approved.
- Mobile behavior: keep label visible and tappable.
- What not to do: replace semantic checkbox without accessibility review.
```html
<label class="pmd-admin-checkbox"><input type="checkbox"> فعال</label>
```

### Toggle/switch
- Intended class names: `.pmd-admin-switch`.
- Spacing rules: 8px between control and label.
- Height rules: minimum 32px hit area.
- Border radius rules: rounded track only within scoped component.
- Mobile behavior: keep label visible.
- What not to do: use toggle for irreversible destructive state changes.
```html
<label class="pmd-admin-switch"><input type="checkbox"> نمایش در سایت</label>
```

### Card and section
- Intended class names: `.pmd-admin-card`, `.pmd-admin-section`.
- Spacing rules: 24px padding desktop, 16px mobile.
- Height rules: content-driven.
- Border radius rules: 12px.
- Mobile behavior: reduce padding, preserve readable spacing.
- What not to do: nest many cards without clear headings.
```html
<section class="pmd-admin-card"><h2>اطلاعات</h2>...</section>
```

### Table
- Intended class names: `.pmd-admin-table`, `.pmd-admin-table-wrap`.
- Spacing rules: 12px cell padding.
- Height rules: row height content-driven with comfortable tap targets.
- Border radius rules: apply to wrapper, not every cell.
- Mobile behavior: wrap in horizontal scroll container.
- What not to do: shrink text below readable size.
```html
<div class="pmd-admin-table-wrap"><table class="pmd-admin-table"><thead><tr><th>نام</th></tr></thead><tbody><tr><td>نمونه</td></tr></tbody></table></div>
```

### Modal
- Intended class names: `.pmd-admin-modal`, `.pmd-admin-modal-header`, `.pmd-admin-modal-body`, `.pmd-admin-modal-footer`.
- Spacing rules: 24px modal padding, 16px between regions.
- Height rules: max-height should allow scrollable body.
- Border radius rules: 12px.
- Mobile behavior: near full-width with safe margins.
- What not to do: create custom modal behavior without keyboard/focus testing.
```html
<div class="pmd-admin-modal" role="dialog" aria-modal="true"><div class="pmd-admin-modal-header">عنوان</div><div class="pmd-admin-modal-body">...</div></div>
```

### Media preview
- Intended class names: `.pmd-admin-media-preview`.
- Spacing rules: 16px padding.
- Height rules: content-driven with image max-width 100%.
- Border radius rules: 12px.
- Mobile behavior: images scale to container.
- What not to do: alter existing media manager behavior without visual QA.
```html
<div class="pmd-admin-media-preview"><img src="preview.jpg" alt="پیش‌نمایش"></div>
```

### Advanced section
- Intended class names: `.pmd-admin-advanced-section`, `.pmd-admin-advanced-toggle`.
- Spacing rules: 16px top border/padding.
- Height rules: content-driven.
- Border radius rules: inherit containing card rules.
- Mobile behavior: collapsed content must remain reachable.
- What not to do: hide critical required fields in advanced sections.
```html
<section class="pmd-admin-advanced-section"><button class="pmd-admin-advanced-toggle" type="button">تنظیمات پیشرفته</button></section>
```
