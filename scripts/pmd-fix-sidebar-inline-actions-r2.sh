#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-$(pwd)}"
MENU="$ROOT/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"
CSS="$ROOT/app/admin/assets/css/pmd-side-menu2-v1.css"

for file in "$MENU" "$CSS"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: Missing $file"
    echo "Run this from /var/www/paymydine or set PMD_ROOT=/var/www/paymydine"
    exit 1
  fi
done

# Re-run only the file-writing part with sudo when production files are not writable.
if [ ! -w "$MENU" ] || [ ! -w "$CSS" ]; then
  if [ "$(id -u)" -ne 0 ]; then
    echo "Production files are not writable by $(id -un). Re-running patch with sudo..."
    exec sudo env PMD_ROOT="$ROOT" bash "$0"
  fi
fi

cd "$ROOT"

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/storage/pmd-patch-backups/sidebar-inline-actions-r2-$TS"
mkdir -p "$BACKUP"
cp -a "$MENU" "$BACKUP/pmd_side_menu2_single_menu.blade.php"
cp -a "$CSS" "$BACKUP/pmd-side-menu2-v1.css"

echo "Backup created: $BACKUP"

python3 - <<'PY'
from pathlib import Path

menu_path = Path('app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php')
css_path = Path('app/admin/assets/css/pmd-side-menu2-v1.css')

menu = menu_path.read_text(encoding='utf-8')

# Language + Logout become ordinary items INSIDE the scrollable nav.
if 'PMD_SM2_INLINE_ACTIONS_R2_START' not in menu:
    footer_start_marker = '<!-- PMD_SM2_ACCOUNT_FOOTER_V11_START -->'
    footer_end_marker = '<!-- PMD_SM2_ACCOUNT_FOOTER_V11_END -->'

    footer_start = menu.find(footer_start_marker)
    footer_end = menu.find(footer_end_marker, footer_start if footer_start >= 0 else 0)

    if footer_start >= 0 and footer_end >= 0:
        footer_end += len(footer_end_marker)
        nav_close = menu.rfind('    </nav>', 0, footer_start)
        if nav_close < 0:
            raise SystemExit('ERROR: Could not find </nav> before old account footer.')

        inline_actions = r'''        <!-- PMD_SM2_INLINE_ACTIONS_R2_START -->
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
        <!-- PMD_SM2_INLINE_ACTIONS_R2_END -->
    </nav>'''

        menu = menu[:nav_close] + inline_actions + menu[footer_end:]
    elif 'PMD_SM2_INLINE_ACTIONS_R1_START' not in menu:
        raise SystemExit('ERROR: Could not find old account footer and no earlier inline patch was found.')

# Hide the old floating language visual. Its backend/runtime remains available
# as the authority that the new inline item calls.
if 'PMD_SM2_LEGACY_LANGUAGE_VISUAL_HIDE_R2' not in menu:
    aside_anchor = '<aside id="pmd-side-menu2"'
    aside_pos = menu.find(aside_anchor)
    if aside_pos < 0:
        raise SystemExit('ERROR: Could not find Side Menu <aside>.')

    hide_style = r'''{{-- PMD_SM2_LEGACY_LANGUAGE_VISUAL_HIDE_R2 --}}
<style id="pmd-sm2-legacy-language-visual-hide-r2">
html #pmd-sidebar-language[data-pmd-language-v13],
html #pmd-sidebar-language {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
}
</style>

'''
    menu = menu[:aside_pos] + hide_style + menu[aside_pos:]

# Bridge the inline button to the existing, market-aware language trigger.
if 'PMD_SM2_INLINE_LANGUAGE_BRIDGE_R2_START' not in menu:
    runtime_anchor = '<!-- PMD_SM2_ACCOUNT_RUNTIME_V11_START -->'
    if runtime_anchor not in menu:
        raise SystemExit('ERROR: Could not find account runtime anchor.')

    bridge = r'''<!-- PMD_SM2_INLINE_LANGUAGE_BRIDGE_R2_START -->
<script id="pmd-side-menu2-inline-language-bridge-r2">
(function () {
  'use strict';

  function boot() {
    var inlineButton = document.querySelector('#pmd-side-menu2 [data-pmd-sm2-language-inline]');
    var legacyRoot = document.getElementById('pmd-sidebar-language');
    var legacyTrigger = document.getElementById('pmd-language-trigger');

    if (!inlineButton || !legacyRoot || !legacyTrigger) return;

    var nextLocale = String(legacyRoot.getAttribute('data-next') || '').trim().toUpperCase();
    var legacyTitle = String(legacyTrigger.getAttribute('title') || '').trim();
    var friendlyLabel = legacyTitle.replace(/^Switch(?: language)? to\s+/i, '').trim();

    var codeNode = inlineButton.querySelector('.pmd-sm2__language-code');
    var labelNode = inlineButton.querySelector('[data-pmd-sm2-language-label]');

    if (codeNode) codeNode.textContent = nextLocale || 'LANG';
    if (labelNode) labelNode.textContent = friendlyLabel || nextLocale || 'Language';

    inlineButton.setAttribute('aria-label', legacyTitle || ('Switch language to ' + nextLocale));
    inlineButton.setAttribute('title', legacyTitle || ('Switch language to ' + nextLocale));
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
<!-- PMD_SM2_INLINE_LANGUAGE_BRIDGE_R2_END -->'''

    menu = menu.replace(runtime_anchor, bridge + '\n\n' + runtime_anchor, 1)

menu_path.write_text(menu, encoding='utf-8')

css = css_path.read_text(encoding='utf-8')
if 'PMD_SM2_SCROLLABLE_INLINE_ACTIONS_R2' not in css:
    css += r'''

/* ==========================================================
   PMD_SM2_SCROLLABLE_INLINE_ACTIONS_R2
   - Language + Logout are normal nav items.
   - Short viewports scroll naturally.
   - Items never shrink/overlap.
   - Scrollbar stays functional but visually hidden.
   ========================================================== */
#pmd-side-menu2 .pmd-sm2__nav {
  min-height: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  overscroll-behavior: contain;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

#pmd-side-menu2 .pmd-sm2__nav::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}

#pmd-side-menu2 .pmd-sm2__nav > .pmd-sm2__item,
#pmd-side-menu2 .pmd-sm2__nav > .pmd-sm2__dropdown {
  flex: 0 0 auto !important;
  flex-shrink: 0 !important;
}

#pmd-side-menu2 .pmd-sm2__language-code {
  display: grid;
  place-items: center;
  flex: 0 0 24px;
  width: 24px;
  min-width: 24px;
  height: 24px;
  min-height: 24px;
  margin: 0;
  padding: 0;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: .02em;
  color: currentColor;
}

html.pmd-sm2-collapsed #pmd-side-menu2 .pmd-sm2__language-item {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

html.pmd-sm2-collapsed #pmd-side-menu2 .pmd-sm2__language-code {
  margin: 0 auto !important;
}
'''
    css_path.write_text(css, encoding='utf-8')

print('PMD sidebar R2 patch applied successfully.')
PY

grep -q 'PMD_SM2_INLINE_ACTIONS_R2_START\|PMD_SM2_INLINE_ACTIONS_R1_START' "$MENU"
grep -q 'data-pmd-sm2-language-inline' "$MENU"
grep -q 'PMD_SM2_LEGACY_LANGUAGE_VISUAL_HIDE_R2' "$MENU"
grep -q 'PMD_SM2_SCROLLABLE_INLINE_ACTIONS_R2' "$CSS"

# Only compiled Blade views need clearing for this patch. Do not clear the
# whole production application cache.
php artisan view:clear >/dev/null 2>&1 || true

echo
echo "SUCCESS"
echo "Changed files:"
echo "  app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"
echo "  app/admin/assets/css/pmd-side-menu2-v1.css"
echo
echo "Backup: $BACKUP"
echo "Rollback:"
echo "  sudo cp -a '$BACKUP/pmd_side_menu2_single_menu.blade.php' '$MENU'"
echo "  sudo cp -a '$BACKUP/pmd-side-menu2-v1.css' '$CSS'"
echo "  cd '$ROOT' && sudo php artisan view:clear"
