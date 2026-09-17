#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$ROOT" ]; then
  echo "ERROR: Run this from inside the PayMyDine Git repository."
  exit 1
fi
cd "$ROOT"

MENU="app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"
CSS="app/admin/assets/css/pmd-side-menu2-v1.css"

for file in "$MENU" "$CSS"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: Missing $file"
    exit 1
  fi
done

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="storage/pmd-patch-backups/sidebar-inline-actions-$TS"
mkdir -p "$BACKUP"
cp "$MENU" "$BACKUP/pmd_side_menu2_single_menu.blade.php"
cp "$CSS" "$BACKUP/pmd-side-menu2-v1.css"

echo "Backup created: $BACKUP"

python3 - <<'PY'
from pathlib import Path

menu_path = Path('app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php')
css_path = Path('app/admin/assets/css/pmd-side-menu2-v1.css')

menu = menu_path.read_text(encoding='utf-8')

# 1) Language + Logout become normal items at the end of the scrollable nav.
if 'PMD_SM2_INLINE_ACTIONS_R1_START' not in menu:
    footer_start_marker = '<!-- PMD_SM2_ACCOUNT_FOOTER_V11_START -->'
    footer_end_marker = '<!-- PMD_SM2_ACCOUNT_FOOTER_V11_END -->'

    footer_start = menu.find(footer_start_marker)
    if footer_start < 0:
        raise SystemExit('ERROR: Could not find Side Menu account footer start marker.')

    footer_end = menu.find(footer_end_marker, footer_start)
    if footer_end < 0:
        raise SystemExit('ERROR: Could not find Side Menu account footer end marker.')
    footer_end += len(footer_end_marker)

    nav_close = menu.rfind('    </nav>', 0, footer_start)
    if nav_close < 0:
        raise SystemExit('ERROR: Could not find </nav> before the account footer.')

    inline_actions = r'''        <!-- PMD_SM2_INLINE_ACTIONS_R1_START -->
        <button
            type="button"
            class="pmd-sm2__item pmd-sm2__language-item"
            data-pmd-sm2-language-inline
            aria-label="Switch language"
            title="Switch language"
            hidden
        >
            <span class="pmd-sm2__language-code" aria-hidden="true">--</span>
            <span class="pmd-sm2__label" data-pmd-sm2-language-label>Language</span>
        </button>

        <button
            type="button"
            class="pmd-sm2__item pmd-sm2__logout-action"
            data-pmd-sm2-logout
            aria-label="{{ $pmdSm2T('nav.logout', 'Logout') }}"
            title="{{ $pmdSm2T('nav.logout', 'Logout') }}"
        >
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 8l4 4l-4 4"/>
                <path d="M18 12h-10"/>
                <path d="M8 5v-1a1 1 0 0 0 -1 -1h-3a1 1 0 0 0 -1 1v16a1 1 0 0 0 1 1h3a1 1 0 0 0 1 -1v-1"/>
            </svg>
            <span class="pmd-sm2__label">{{ $pmdSm2T('nav.logout', 'Logout') }}</span>
        </button>
        <!-- PMD_SM2_INLINE_ACTIONS_R1_END -->
    </nav>'''

    menu = menu[:nav_close] + inline_actions + menu[footer_end:]

# 2) On pages with Side Menu 2, hide the old floating language control.
#    It remains in the DOM because its existing market-aware runtime is reused.
if 'PMD_SM2_LEGACY_LANGUAGE_VISUAL_HIDE_R1' not in menu:
    aside_anchor = '<aside id="pmd-side-menu2"'
    aside_pos = menu.find(aside_anchor)
    if aside_pos < 0:
        raise SystemExit('ERROR: Could not find Side Menu <aside>.')

    hide_style = r'''{{-- PMD_SM2_LEGACY_LANGUAGE_VISUAL_HIDE_R1 --}}
<style id="pmd-sm2-legacy-language-visual-hide-r1">
html #pmd-sidebar-language[data-pmd-language-v13],
html #pmd-sidebar-language {
    display: none !important;
}
</style>

'''
    menu = menu[:aside_pos] + hide_style + menu[aside_pos:]

# 3) Bridge the new inline item to the already-working market-aware language
#    control. No language backend/settings logic is duplicated here.
if 'PMD_SM2_INLINE_LANGUAGE_BRIDGE_R1_START' not in menu:
    runtime_anchor = '<!-- PMD_SM2_ACCOUNT_RUNTIME_V11_START -->'
    if runtime_anchor not in menu:
        raise SystemExit('ERROR: Could not find Side Menu account runtime anchor.')

    bridge = r'''<!-- PMD_SM2_INLINE_LANGUAGE_BRIDGE_R1_START -->
<script id="pmd-side-menu2-inline-language-bridge-r1">
(function () {
  'use strict';

  function boot() {
    var inlineButton = document.querySelector(
      '#pmd-side-menu2 [data-pmd-sm2-language-inline]'
    );
    var legacyRoot = document.getElementById('pmd-sidebar-language');
    var legacyTrigger = document.getElementById('pmd-language-trigger');

    if (!inlineButton || !legacyRoot || !legacyTrigger) {
      return;
    }

    var nextLocale = String(
      legacyRoot.getAttribute('data-next') || ''
    ).trim().toUpperCase();

    var legacyTitle = String(
      legacyTrigger.getAttribute('title') || ''
    ).trim();

    var friendlyLabel = legacyTitle
      .replace(/^Switch(?: language)? to\s+/i, '')
      .trim();

    var codeNode = inlineButton.querySelector('.pmd-sm2__language-code');
    var labelNode = inlineButton.querySelector('[data-pmd-sm2-language-label]');

    if (codeNode) {
      codeNode.textContent = nextLocale || 'LANG';
    }

    if (labelNode) {
      labelNode.textContent = friendlyLabel || nextLocale || 'Language';
    }

    inlineButton.setAttribute(
      'aria-label',
      legacyTitle || ('Switch language to ' + nextLocale)
    );
    inlineButton.setAttribute(
      'title',
      legacyTitle || ('Switch language to ' + nextLocale)
    );

    inlineButton.hidden = false;

    inlineButton.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      legacyTrigger.click();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
</script>
<!-- PMD_SM2_INLINE_LANGUAGE_BRIDGE_R1_END -->'''

    menu = menu.replace(runtime_anchor, bridge + '\n\n' + runtime_anchor, 1)

menu_path.write_text(menu, encoding='utf-8')

# 4) Preserve button sizes and make the list scroll instead of compress/overlap.
css = css_path.read_text(encoding='utf-8')
if 'PMD_SM2_SCROLLABLE_INLINE_ACTIONS_R1' not in css:
    css += r'''

/* ==========================================================
   PMD_SM2_SCROLLABLE_INLINE_ACTIONS_R1
   Language + Logout are normal Side Menu items. On short
   viewports the nav scrolls; its children never compress.
   ========================================================== */
#pmd-side-menu2 .pmd-sm2__nav {
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

#pmd-side-menu2 .pmd-sm2__nav > .pmd-sm2__item,
#pmd-side-menu2 .pmd-sm2__nav > .pmd-sm2__dropdown {
  flex-shrink: 0;
}

#pmd-side-menu2 .pmd-sm2__language-code {
  display: grid;
  place-items: center;
  flex: 0 0 24px;
  width: 24px;
  min-width: 24px;
  height: 24px;
  margin: 0;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: .02em;
  color: currentColor;
}

html.pmd-sm2-collapsed
#pmd-side-menu2 .pmd-sm2__language-code {
  margin: 0 auto;
}
'''
    css_path.write_text(css, encoding='utf-8')

print('PMD sidebar inline-actions patch applied.')
PY

# Safety checks.
grep -q 'PMD_SM2_INLINE_ACTIONS_R1_START' "$MENU"
grep -q 'data-pmd-sm2-language-inline' "$MENU"
grep -q 'PMD_SM2_LEGACY_LANGUAGE_VISUAL_HIDE_R1' "$MENU"
grep -q 'PMD_SM2_SCROLLABLE_INLINE_ACTIONS_R1' "$CSS"

if ! git diff --check -- "$MENU" "$CSS"; then
  echo "ERROR: git diff --check failed. Restoring backup."
  cp "$BACKUP/pmd_side_menu2_single_menu.blade.php" "$MENU"
  cp "$BACKUP/pmd-side-menu2-v1.css" "$CSS"
  exit 1
fi

if [ -f artisan ]; then
  php artisan view:clear >/dev/null 2>&1 || true
fi

echo
echo "Changed files:"
echo "  $MENU"
echo "  $CSS"
echo
echo "Diff summary:"
git diff --stat -- "$MENU" "$CSS"
echo
echo "Backup for rollback: $BACKUP"
echo "Rollback command:"
echo "cp '$BACKUP/pmd_side_menu2_single_menu.blade.php' '$MENU' && cp '$BACKUP/pmd-side-menu2-v1.css' '$CSS' && php artisan view:clear"
