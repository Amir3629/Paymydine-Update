#!/usr/bin/env bash
set -euo pipefail

# PayMyDine Admin Back Button Toolbar Fix
# Run from the repository root, for example:
#   bash scripts/fix_admin_back_buttons.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADMIN_JS="$ROOT/app/admin/assets/js/admin.js"
TOOLBAR_CSS="$ROOT/app/admin/assets/css/pmd-admin/components/toolbar-buttons.css"
STAMP="$(date +%Y%m%d_%H%M%S)"

if [[ ! -f "$ADMIN_JS" ]]; then
  echo "ERROR: admin.js not found at $ADMIN_JS" >&2
  exit 1
fi

if [[ ! -f "$TOOLBAR_CSS" ]]; then
  echo "ERROR: toolbar-buttons.css not found at $TOOLBAR_CSS" >&2
  exit 1
fi

cp -p "$ADMIN_JS" "$ADMIN_JS.back-button-fix.$STAMP.bak"
echo "Backed up admin.js to $ADMIN_JS.back-button-fix.$STAMP.bak"

if ! grep -q "PMD Admin Back Button Left Fix" "$ADMIN_JS"; then
  cat >> "$ADMIN_JS" <<'JS'

/* PMD Admin Back Button Left Fix: keep Back buttons before primary actions. */
(function () {
  'use strict';

  var pending = false;

  function isBackAction(node) {
    if (!node || node.nodeType !== 1) return false;
    if (node.matches && node.matches('[data-pmd-toolbar-back], .pmd-toolbar-back-action')) return true;

    var icon = node.querySelector && node.querySelector('.fa-arrow-left, .fa-arrow-circle-left, .fa-chevron-left, i[class*="fa-arrow-left"], i[class*="fa-chevron-left"]');
    if (!icon) return false;

    return (node.matches && node.matches('a.btn, button.btn, .btn, .btn-group, .pmd-toolbar-secondary-action')) ||
      (node.classList && node.classList.contains('pmd-toolbar-secondary-action'));
  }

  function styleBackAction(node) {
    node.classList.add('pmd-toolbar-back-action', 'pmd-toolbar-secondary-action');
    node.style.setProperty('background', '#f1f3f9', 'important');
    node.style.setProperty('background-color', '#f1f3f9', 'important');
    node.style.setProperty('border', '1px solid #c9d2e3', 'important');
    node.style.setProperty('color', '#364a63', 'important');
    node.style.setProperty('margin-left', '0', 'important');
    node.style.setProperty('margin-right', '8px', 'important');
    node.style.setProperty('box-shadow', 'none', 'important');

    Array.prototype.forEach.call(node.querySelectorAll ? node.querySelectorAll('i, .fa') : [], function (icon) {
      icon.style.setProperty('color', '#364a63', 'important');
    });
  }

  function findPrimary(container) {
    var children = Array.prototype.slice.call(container.children);
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.matches && child.matches('.pmd-toolbar-primary-action, [data-pmd-toolbar-primary], .btn-primary')) return child;
      if (child.querySelector && child.querySelector('.pmd-toolbar-primary-action, [data-pmd-toolbar-primary], .btn-primary')) return child;
    }
    return null;
  }

  function collectBackActions(container, rightButtons) {
    var found = [];
    [container, rightButtons].forEach(function (source) {
      if (!source) return;
      Array.prototype.forEach.call(source.children, function (child) {
        if (isBackAction(child) && found.indexOf(child) === -1) found.push(child);
      });
    });
    return found;
  }

  function fixToolbar(container) {
    if (!container || container.closest('.modal, .media-manager, .media-toolbar, [data-control="media-manager"]')) return;
    if (container.classList && container.classList.contains('right-buttons')) return;

    var rightButtons = container.querySelector(':scope > .right-buttons');
    var primary = findPrimary(container);
    var reference = primary || rightButtons || container.firstElementChild || null;
    var backs = collectBackActions(container, rightButtons);
    if (!backs.length) return;

    container.classList.add('pmd-toolbar-split');
    backs.slice().reverse().forEach(function (back) {
      styleBackAction(back);
      if (back.parentElement !== container || back.nextElementSibling !== reference) {
        container.insertBefore(back, reference);
      }
      reference = back;
    });
  }

  function fixAllToolbars() {
    document.querySelectorAll('.toolbar-action > .progress-indicator-container, .toolbar-action').forEach(fixToolbar);
  }

  function queueFix() {
    if (pending) return;
    pending = true;
    window.setTimeout(function () {
      pending = false;
      fixAllToolbars();
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixAllToolbars);
  }
  else {
    fixAllToolbars();
  }

  window.setTimeout(fixAllToolbars, 100);

  if (window.MutationObserver) {
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
          queueFix();
          return;
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
JS
  echo "Appended JS back-button fix to admin.js"
else
  echo "JS back-button fix already present in admin.js"
fi

if ! grep -q "PMD Admin Back Button Left Fix" "$TOOLBAR_CSS"; then
  cat >> "$TOOLBAR_CSS" <<'CSS'

/* PMD Admin Back Button Left Fix: Back buttons stay left of primary actions. */
html body.page .progress-indicator-container.pmd-toolbar-split > .pmd-toolbar-back-action,
html body.page .toolbar-action.pmd-toolbar-split > .pmd-toolbar-back-action,
html body.page .pmd-toolbar-back-action,
html body.page a.pmd-toolbar-secondary-action:has(.fa-arrow-left),
html body.page a.pmd-toolbar-secondary-action:has(.fa-chevron-left) {
  order: 0 !important;
  background: #f1f3f9 !important;
  background-color: #f1f3f9 !important;
  border: 1px solid #c9d2e3 !important;
  color: #364a63 !important;
  margin-left: 0 !important;
  margin-right: 8px !important;
  box-shadow: none !important;
}

html body.page .pmd-toolbar-back-action i,
html body.page .pmd-toolbar-back-action .fa,
html body.page a.pmd-toolbar-secondary-action:has(.fa-arrow-left) i,
html body.page a.pmd-toolbar-secondary-action:has(.fa-chevron-left) i {
  color: #364a63 !important;
}

html body.page .pmd-toolbar-back-action:hover,
html body.page .pmd-toolbar-back-action:focus,
html body.page a.pmd-toolbar-secondary-action:has(.fa-arrow-left):hover,
html body.page a.pmd-toolbar-secondary-action:has(.fa-arrow-left):focus,
html body.page a.pmd-toolbar-secondary-action:has(.fa-chevron-left):hover,
html body.page a.pmd-toolbar-secondary-action:has(.fa-chevron-left):focus {
  background: #e5ebf7 !important;
  background-color: #e5ebf7 !important;
  border-color: #b8c6dd !important;
  color: #364a63 !important;
  box-shadow: none !important;
}
CSS
  echo "Appended CSS back-button overrides to toolbar-buttons.css"
else
  echo "CSS back-button overrides already present in toolbar-buttons.css"
fi

# Optional PHP/Artisan cache clearing snippet. Commands are best-effort so this
# script remains safe on partially installed/staging copies.
if [[ -f "$ROOT/artisan" ]]; then
  (cd "$ROOT" && php artisan optimize:clear) || true
  (cd "$ROOT" && php artisan view:clear) || true
  (cd "$ROOT" && php artisan cache:clear) || true
  (cd "$ROOT" && php artisan config:clear) || true
else
  echo "artisan not found; skipped Laravel cache clearing"
fi

# Fix common readable/executable permissions for deployed admin assets.
chmod 0644 "$ADMIN_JS" "$TOOLBAR_CSS" || true
find "$ROOT/app/admin/assets" -type d -exec chmod 0755 {} \; || true
find "$ROOT/app/admin/assets" -type f -exec chmod 0644 {} \; || true

# If storage/bootstrap cache exist, make them writable by the current deploy user.
[[ -d "$ROOT/storage" ]] && chmod -R u+rwX "$ROOT/storage" || true
[[ -d "$ROOT/bootstrap/cache" ]] && chmod -R u+rwX "$ROOT/bootstrap/cache" || true

echo "Done. Hard refresh the browser (Ctrl+F5 / Cmd+Shift+R) or clear CDN/proxy cache if used."
