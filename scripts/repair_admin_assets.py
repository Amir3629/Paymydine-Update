#!/usr/bin/env python3
"""
Repair PayMyDine admin vendor assets and Staff toolbar alignment.

Run from the repository root on the server:

    python3 scripts/repair_admin_assets.py

What this does:
- Recreates the vendor directories used by the admin panel.
- Downloads known-good minimal versions of required JS/CSS libraries from public
  CDNs when network access is available.
- Writes safe fallback stubs if a CDN request fails, so missing files no longer
  generate 404s or hard JavaScript errors.
- Patches admin.js/src app.js and toolbar-buttons.css with the scoped Staff
  toolbar splitter if the current server copy does not already have it.
- Clears common Laravel/TastyIgniter caches when available.

After running, hard refresh the browser (Ctrl+F5 / Cmd+Shift+R) so stale cached
404 responses and old admin.js copies are replaced.
"""
from __future__ import annotations

import re
import subprocess
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TIMEOUT = 30
USER_AGENT = "PayMyDine-admin-asset-repair/1.0"

# Local source files are preferred over tiny stubs when this script is run in an
# environment where outbound CDN requests are blocked. Paths are repository-root
# relative so the repair stays self-contained when known vendor packages already
# exist elsewhere in the checkout.
LOCAL_ASSET_FALLBACKS = {
    "app/admin/assets/vendor/pmd-mediafix/jquery.min.js": [
        "themes/tastyigniter-orange1/node_modules/jquery/dist/jquery.min.js",
    ],
}


def log(message: str) -> None:
    print(f"[repair-admin-assets] {message}")


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore") if path.exists() else ""


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def strip_source_maps(content: bytes) -> bytes:
    text = content.decode("utf-8", errors="ignore")
    text = re.sub(r"\n?//# sourceMappingURL=.*", "", text)
    text = re.sub(r"\n?/\*# sourceMappingURL=.*?\*/", "", text, flags=re.S)
    return text.encode("utf-8")


def fetch(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
            if response.status >= 400:
                raise urllib.error.HTTPError(url, response.status, response.reason, response.headers, None)
            return strip_source_maps(response.read())
    except Exception as exc:  # noqa: BLE001 - script should keep repairing remaining files
        log(f"WARN: could not download {url}: {exc}")
        return None


def read_local_asset(rel_path: str) -> bytes | None:
    for candidate in LOCAL_ASSET_FALLBACKS.get(rel_path, []):
        path = ROOT / candidate
        if path.exists() and path.is_file():
            log(f"using local vendor copy {candidate} for {rel_path}")
            return strip_source_maps(path.read_bytes())

    return None


def ensure_asset(rel_path: str, urls: list[str], fallback: str) -> None:
    path = ROOT / rel_path
    path.parent.mkdir(parents=True, exist_ok=True)

    # First try CDNs so production receives complete vendor libraries.
    for url in urls:
        data = fetch(url)
        if data:
            path.write_bytes(data)
            log(f"wrote {rel_path} from {url}")
            return

    # If the network is blocked, reuse any checked-out vendor package before
    # falling back to a no-error compatibility shim.
    local_data = read_local_asset(rel_path)
    if local_data:
        path.write_bytes(local_data)
        log(f"wrote {rel_path} from local vendor copy")
        return

    # Last resort: write a safe shim so browser requests no longer 404 and
    # admin initialization does not crash when optional widgets are absent.
    path.write_text(fallback, encoding="utf-8")
    log(f"wrote fallback stub for {rel_path}")


def js_stub(name: str, body: str = "") -> str:
    return f"/*! PayMyDine fallback stub for {name}. Replace with vendor build when available. */\n(function(window, document, $){{\n'use strict';\n{body}\n}})(window, document, window.jQuery);\n"


def css_stub(name: str, body: str = "") -> str:
    return f"/*! PayMyDine fallback CSS for {name}. Replace with vendor build when available. */\n{body}\n"


MOMENT_STUB = js_stub(
    "moment.js",
    r"""
function Moment(date){ this._d = date ? new Date(date) : new Date(); }
Moment.prototype.clone = function(){ return new Moment(this._d); };
Moment.prototype.toDate = function(){ return new Date(this._d); };
Moment.prototype.valueOf = function(){ return this._d.getTime(); };
Moment.prototype.subtract = function(n, unit){
  var d = this._d;
  if (unit && unit.indexOf('day') === 0) d.setDate(d.getDate() - n);
  else if (unit && unit.indexOf('month') === 0) d.setMonth(d.getMonth() - n);
  else if (unit && unit.indexOf('year') === 0) d.setFullYear(d.getFullYear() - n);
  return this;
};
Moment.prototype.add = function(n, unit){ return this.subtract(-n, unit); };
Moment.prototype.startOf = function(unit){
  var d = this._d;
  if (unit === 'month') { d.setDate(1); d.setHours(0,0,0,0); }
  if (unit === 'day') d.setHours(0,0,0,0);
  return this;
};
Moment.prototype.endOf = function(unit){
  var d = this._d;
  if (unit === 'month') { d.setMonth(d.getMonth() + 1, 0); d.setHours(23,59,59,999); }
  if (unit === 'day') d.setHours(23,59,59,999);
  return this;
};
Moment.prototype.format = function(){
  var d = this._d;
  var y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return y + '-' + m + '-' + day;
};
function moment(date){ return new Moment(date); }
moment.isMoment = function(obj){ return obj instanceof Moment; };
moment.locale = function(){ return 'en'; };
window.moment = window.moment || moment;
""",
)

DATERANGEPICKER_STUB = js_stub(
    "daterangepicker.js",
    r"""
if ($ && !$.fn.daterangepicker) {
  $.fn.daterangepicker = function(options, callback){
    return this.each(function(){
      var $el = $(this);
      var api = { element: $el, options: options || {}, container: $('<div class="daterangepicker"></div>').hide(), remove: function(){ this.container.remove(); } };
      $el.data('daterangepicker', api);
      if (typeof callback === 'function' && window.moment) callback(moment(), moment(), '');
    });
  };
}
""",
)

SORTABLE_STUB = js_stub(
    "Sortable.js",
    r"""
function Sortable(el, options){ this.el = el; this.options = options || {}; }
Sortable.prototype.destroy = function(){};
Sortable.create = function(el, options){ return new Sortable(el, options); };
window.Sortable = window.Sortable || Sortable;
""",
)

JQUERY_SORTABLE_STUB = js_stub(
    "jquery-sortable.js",
    r"""
if ($ && !$.fn.sortable) {
  $.fn.sortable = function(options){
    return this.each(function(){
      if (window.Sortable) $(this).data('sortable', Sortable.create(this, options || {}));
    });
  };
}
""",
)

BOOTSTRAP_DATEPICKER_STUB = js_stub(
    "bootstrap-datepicker.js",
    r"""
if ($ && !$.fn.datepicker) {
  $.fn.datepicker = function(){ return this; };
}
""",
)

CLOCKPICKER_STUB = js_stub(
    "clockpicker.js",
    "if ($ && !$.fn.clockpicker) { $.fn.clockpicker = function(){ return this; }; }",
)

DATETIMEPICKER_STUB = js_stub(
    "datetimepicker.js",
    "if ($ && !$.fn.datetimepicker) { $.fn.datetimepicker = function(){ return this; }; }",
)

FULLCALENDAR_STUB = js_stub(
    "fullcalendar.js",
    r"""
window.FullCalendar = window.FullCalendar || { Calendar: function(el, options){ this.el = el; this.options = options || {}; this.render = function(){}; this.destroy = function(){}; } };
""",
)

BOOTSTRAP_TABLE_STUB = js_stub(
    "bootstrap-table.js",
    "if ($ && !$.fn.bootstrapTable) { $.fn.bootstrapTable = function(){ return this; }; }",
)

DROPZONE_STUB = js_stub(
    "dropzone.js",
    r"""
function Dropzone(el, options){ this.element = el; this.options = options || {}; }
Dropzone.autoDiscover = false;
window.Dropzone = window.Dropzone || Dropzone;
""",
)

CHART_STUB = js_stub(
    "Chart.js",
    r"""
function Chart(ctx, config){ this.ctx = ctx; this.config = config || {}; this.data = this.config.data || {}; }
Chart.prototype.update = function(){};
Chart.prototype.destroy = function(){};
window.Chart = window.Chart || Chart;
""",
)

INPUTMASK_STUB = js_stub(
    "jquery.inputmask.js",
    "if ($ && !$.fn.inputmask) { $.fn.inputmask = function(){ return this; }; }",
)

EASYMDE_STUB = js_stub(
    "easymde.js",
    "window.EasyMDE = window.EasyMDE || function(options){ this.options = options || {}; this.toTextArea = function(){}; };",
)

SUMMERNOTE_STUB = js_stub(
    "summernote.js",
    "if ($ && !$.fn.summernote) { $.fn.summernote = function(){ return this; }; }",
)

TREEVIEW_STUB = js_stub(
    "bootstrap-treeview.js",
    "if ($ && !$.fn.treeview) { $.fn.treeview = function(){ return this; }; }",
)

SELECTONIC_STUB = js_stub(
    "selectonic.js",
    "if ($ && !$.fn.selectonic) { $.fn.selectonic = function(){ return this; }; }",
)

FORCE_BLUE_BUTTONS = js_stub(
    "force-blue-buttons.js",
    r"""
// Intentionally small: color is owned by CSS. This file exists to satisfy legacy layouts.
document.documentElement.classList.add('pmd-blue-buttons-ready');
""",
)

JQUERY_STUB = js_stub(
    "jquery.js",
    r"""
if (!window.jQuery) {
  console.error('jQuery fallback stub loaded. Install the full jQuery vendor file for complete admin behavior.');
  var jq = function(){ return jq; };
  jq.fn = jq.prototype = { each:function(){return this;}, on:function(){return this;}, off:function(){return this;}, data:function(){return undefined;}, find:function(){return this;}, hide:function(){return this;}, show:function(){return this;} };
  window.jQuery = window.$ = jq;
}
""",
)

ASSETS = [
    # pmd-mediafix layout assets used by resources/views/layouts/*.blade.php and admin default layout.
    ("app/admin/assets/vendor/pmd-mediafix/jquery.min.js", ["https://code.jquery.com/jquery-3.6.4.min.js"], JQUERY_STUB),
    ("app/admin/assets/vendor/pmd-mediafix/moment.min.js", ["https://cdn.jsdelivr.net/npm/moment@2.29.4/min/moment.min.js", "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"], MOMENT_STUB),
    ("app/admin/assets/vendor/pmd-mediafix/daterangepicker.js", ["https://cdn.jsdelivr.net/npm/daterangepicker@3.1.0/daterangepicker.min.js", "https://cdnjs.cloudflare.com/ajax/libs/bootstrap-daterangepicker/3.1/daterangepicker.min.js"], DATERANGEPICKER_STUB),
    ("app/admin/assets/vendor/pmd-mediafix/daterangepicker.css", ["https://cdn.jsdelivr.net/npm/daterangepicker@3.1.0/daterangepicker.css", "https://cdnjs.cloudflare.com/ajax/libs/bootstrap-daterangepicker/3.1/daterangepicker.min.css"], css_stub("daterangepicker.css", ".daterangepicker{position:absolute;z-index:3000;background:#fff;border:1px solid #d9dee8;border-radius:8px;padding:8px;display:none}\n")),
    ("app/admin/assets/vendor/pmd-mediafix/jquery-clockpicker.min.css", ["https://cdnjs.cloudflare.com/ajax/libs/clockpicker/0.0.7/bootstrap-clockpicker.min.css"], css_stub("clockpicker.css")),
    ("app/admin/assets/vendor/pmd-mediafix/Sortable.min.js", ["https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"], SORTABLE_STUB),
    ("app/admin/assets/vendor/pmd-mediafix/jquery-sortable.js", ["https://cdn.jsdelivr.net/npm/jquery-sortablejs@1.0.1/jquery-sortable.js"], JQUERY_SORTABLE_STUB),
    ("app/admin/assets/vendor/pmd-mediafix/dropzone.min.js", ["https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/min/dropzone.min.js"], DROPZONE_STUB),
    ("app/admin/assets/vendor/pmd-mediafix/force-blue-buttons.js", [], FORCE_BLUE_BUTTONS),

    # Shared moment path used by admin widgets.
    ("app/admin/assets/src/js/vendor/moment.min.js", ["https://cdn.jsdelivr.net/npm/moment@2.29.4/min/moment.min.js", "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"], MOMENT_STUB),

    # Dashboard charts and date range widgets.
    ("app/admin/dashboardwidgets/charts/assets/vendor/daterange/daterangepicker.js", ["https://cdn.jsdelivr.net/npm/daterangepicker@3.1.0/daterangepicker.min.js", "https://cdnjs.cloudflare.com/ajax/libs/bootstrap-daterangepicker/3.1/daterangepicker.min.js"], DATERANGEPICKER_STUB),
    ("app/admin/dashboardwidgets/charts/assets/vendor/daterange/daterangepicker.css", ["https://cdn.jsdelivr.net/npm/daterangepicker@3.1.0/daterangepicker.css", "https://cdnjs.cloudflare.com/ajax/libs/bootstrap-daterangepicker/3.1/daterangepicker.min.css"], css_stub("daterangepicker.css", ".daterangepicker{position:absolute;z-index:3000;background:#fff;border:1px solid #d9dee8;border-radius:8px;padding:8px;display:none}\n")),
    ("app/admin/dashboardwidgets/charts/assets/vendor/chartjs/Chart.min.js", ["https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"], CHART_STUB),
    ("app/admin/dashboardwidgets/charts/assets/vendor/chartjs/chartjs-adapter-moment.min.js", ["https://cdn.jsdelivr.net/npm/chartjs-adapter-moment@1.0.1/dist/chartjs-adapter-moment.min.js"], js_stub("chartjs-adapter-moment.js")),

    # Date/time widgets.
    ("app/admin/formwidgets/datepicker/assets/vendor/datepicker/bootstrap-datepicker.min.css", ["https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/css/bootstrap-datepicker.min.css"], css_stub("bootstrap-datepicker.css")),
    ("app/admin/formwidgets/datepicker/assets/vendor/datepicker/bootstrap-datepicker.min.js", ["https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/js/bootstrap-datepicker.min.js"], BOOTSTRAP_DATEPICKER_STUB),
    ("app/admin/formwidgets/datepicker/assets/vendor/datepicker/locales/bootstrap-datepicker.en.min.js", ["https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/locales/bootstrap-datepicker.en.min.js"], js_stub("bootstrap-datepicker.en.js")),
    ("app/admin/formwidgets/datepicker/assets/vendor/clockpicker/bootstrap-clockpicker.min.css", ["https://cdnjs.cloudflare.com/ajax/libs/clockpicker/0.0.7/bootstrap-clockpicker.min.css"], css_stub("clockpicker.css")),
    ("app/admin/formwidgets/datepicker/assets/vendor/clockpicker/bootstrap-clockpicker.min.js", ["https://cdnjs.cloudflare.com/ajax/libs/clockpicker/0.0.7/bootstrap-clockpicker.min.js"], CLOCKPICKER_STUB),
    ("app/admin/formwidgets/datepicker/assets/vendor/datetimepicker/tempusdominus-bootstrap-4.min.css", ["https://cdnjs.cloudflare.com/ajax/libs/tempusdominus-bootstrap-4/5.39.0/css/tempusdominus-bootstrap-4.min.css"], css_stub("tempusdominus.css")),
    ("app/admin/formwidgets/datepicker/assets/vendor/datetimepicker/tempusdominus-bootstrap-4.min.js", ["https://cdnjs.cloudflare.com/ajax/libs/tempusdominus-bootstrap-4/5.39.0/js/tempusdominus-bootstrap-4.min.js"], DATETIMEPICKER_STUB),

    # Sortable/repeater widgets.
    ("app/admin/formwidgets/repeater/assets/vendor/sortablejs/Sortable.min.js", ["https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"], SORTABLE_STUB),
    ("app/admin/formwidgets/repeater/assets/vendor/sortablejs/jquery-sortable.js", ["https://cdn.jsdelivr.net/npm/jquery-sortablejs@1.0.1/jquery-sortable.js"], JQUERY_SORTABLE_STUB),

    # Calendar and table widgets.
    ("app/admin/widgets/calendar/assets/vendor/fullcalendar/main.min.css", ["https://cdn.jsdelivr.net/npm/fullcalendar@5.11.5/main.min.css"], css_stub("fullcalendar.css", ".fc{display:block}.fc .fc-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between}\n")),
    ("app/admin/widgets/calendar/assets/vendor/fullcalendar/main.min.js", ["https://cdn.jsdelivr.net/npm/fullcalendar@5.11.5/main.min.js"], FULLCALENDAR_STUB),
    ("app/admin/widgets/calendar/assets/vendor/fullcalendar/locales-all.min.js", ["https://cdn.jsdelivr.net/npm/fullcalendar@5.11.5/locales-all.min.js"], js_stub("fullcalendar-locales.js")),
    ("app/admin/widgets/table/assets/vendor/bootstrap-table/bootstrap-table.min.css", ["https://cdnjs.cloudflare.com/ajax/libs/bootstrap-table/1.22.1/bootstrap-table.min.css"], css_stub("bootstrap-table.css")),
    ("app/admin/widgets/table/assets/vendor/bootstrap-table/bootstrap-table.min.js", ["https://cdnjs.cloudflare.com/ajax/libs/bootstrap-table/1.22.1/bootstrap-table.min.js"], BOOTSTRAP_TABLE_STUB),
    ("app/admin/widgets/form/assets/vendor/inputmask/jquery.inputmask.min.js", ["https://cdn.jsdelivr.net/npm/inputmask@5.0.8/dist/jquery.inputmask.min.js"], INPUTMASK_STUB),

    # Editors.
    ("app/admin/formwidgets/markdowneditor/assets/vendor/easymde/easymde.min.css", ["https://cdn.jsdelivr.net/npm/easymde@2.18.0/dist/easymde.min.css"], css_stub("easymde.css")),
    ("app/admin/formwidgets/markdowneditor/assets/vendor/easymde/easymde.min.js", ["https://cdn.jsdelivr.net/npm/easymde@2.18.0/dist/easymde.min.js"], EASYMDE_STUB),
    ("app/admin/formwidgets/richeditor/assets/vendor/summernote/summernote-bs5.min.css", ["https://cdnjs.cloudflare.com/ajax/libs/summernote/0.8.20/summernote-bs5.min.css"], css_stub("summernote.css")),
    ("app/admin/formwidgets/richeditor/assets/vendor/summernote/summernote-bs5.min.js", ["https://cdnjs.cloudflare.com/ajax/libs/summernote/0.8.20/summernote-bs5.min.js"], SUMMERNOTE_STUB),
    ("app/admin/formwidgets/richeditor/assets/vendor/summernote/summernote-bs5.js.map", [], "{}\n"),

    # Media manager assets.
    ("app/main/widgets/mediamanager/assets/vendor/dropzone/dropzone.min.css", ["https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/min/dropzone.min.css"], css_stub("dropzone.css", ".dropzone{border:2px dashed #c9d2e3;border-radius:12px;padding:16px}\n")),
    ("app/main/widgets/mediamanager/assets/vendor/dropzone/dropzone.min.js", ["https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/min/dropzone.min.js"], DROPZONE_STUB),
    ("app/main/widgets/mediamanager/assets/vendor/treeview/bootstrap-treeview.min.js", ["https://cdn.jsdelivr.net/npm/bootstrap-treeview@1.2.0/dist/bootstrap-treeview.min.js"], TREEVIEW_STUB),
    ("app/main/widgets/mediamanager/assets/vendor/selectonic/selectonic.min.js", ["https://cdn.jsdelivr.net/npm/selectonic@1.1.0/dist/selectonic.min.js"], SELECTONIC_STUB),
]

TOOLBAR_JS = r'''
    /**
     * PayMyDine admin toolbar splitting.
     *
     * Keeps the first/primary toolbar action on the left and moves all other
     * direct toolbar actions into a right-aligned `.right-buttons` group. The
     * helper is intentionally defensive so it can run on DOMContentLoaded,
     * after AJAX refreshes, and on already-split toolbars without duplicating
     * wrappers or breaking modal/media-manager controls.
     */
    var PMD_TOOLBAR_SPLIT_STYLE_ID = 'pmd-toolbar-split-runtime-style';
    var PMD_TOOLBAR_SPLIT_PAGES = [
        {
            name: 'staffs-index',
            routePattern: /\/admin\/staffs$/,
            primarySelector: 'a.btn-primary[href*="staffs/create"], a[href*="staffs/create"]',
            splitClass: 'pmd-staff-toolbar-split',
            rightLabel: 'Secondary staff toolbar actions'
        },
        {
            name: 'payments-index',
            routePattern: /\/admin\/payments$/,
            primarySelector: '.pmd-toolbar-primary-action, [data-pmd-toolbar-primary]',
            secondarySelector: '.pmd-payments-mode-toggle, [data-pmd-toolbar-secondary]',
            splitClass: 'pmd-payments-toolbar-split',
            rightLabel: 'Payment view actions',
            allowRightOnly: true
        }
    ];

    function ensureToolbarSplitStyles() {
        if (document.getElementById(PMD_TOOLBAR_SPLIT_STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = PMD_TOOLBAR_SPLIT_STYLE_ID;
        style.textContent = [
            '.progress-indicator-container.pmd-toolbar-split,.toolbar-action.pmd-toolbar-split{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;width:100%!important;min-width:0!important;}',
            '.progress-indicator-container.pmd-toolbar-split>.right-buttons,.toolbar-action.pmd-toolbar-split>.right-buttons{display:inline-flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;margin-left:auto!important;flex:0 0 auto!important;}',
            '.progress-indicator-container.pmd-toolbar-split>.right-buttons>.btn,.progress-indicator-container.pmd-toolbar-split>.right-buttons>.btn-group,.toolbar-action.pmd-toolbar-split>.right-buttons>.btn,.toolbar-action.pmd-toolbar-split>.right-buttons>.btn-group{margin-left:0!important;margin-right:0!important;}',
            '.progress-indicator-container.pmd-toolbar-split>.right-buttons>.btn,.toolbar-action.pmd-toolbar-split>.right-buttons>.btn,.pmd-toolbar-right-buttons>.btn,.pmd-toolbar-secondary-action{background:#f1f3f9!important;background-color:#f1f3f9!important;border:1px solid #c9d2e3!important;color:#364a63!important;box-shadow:none!important;}',
            '.progress-indicator-container.pmd-toolbar-split>.right-buttons>.btn:hover,.progress-indicator-container.pmd-toolbar-split>.right-buttons>.btn:focus,.toolbar-action.pmd-toolbar-split>.right-buttons>.btn:hover,.toolbar-action.pmd-toolbar-split>.right-buttons>.btn:focus,.pmd-toolbar-right-buttons>.btn:hover,.pmd-toolbar-right-buttons>.btn:focus,.pmd-toolbar-secondary-action:hover,.pmd-toolbar-secondary-action:focus{background:#e5ebf7!important;background-color:#e5ebf7!important;border-color:#b8c6dd!important;color:#364a63!important;box-shadow:none!important;}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function getActiveToolbarSplitConfig() {
        var path = (window.location.pathname || '').replace(/\/+$/, '');

        for (var i = 0; i < PMD_TOOLBAR_SPLIT_PAGES.length; i++) {
            if (PMD_TOOLBAR_SPLIT_PAGES[i].routePattern.test(path)) {
                return PMD_TOOLBAR_SPLIT_PAGES[i];
            }
        }

        return {
            name: 'generic-admin-toolbar',
            routePattern: /\/admin(?:\/|$)/,
            primarySelector: '.btn-primary, [data-primary-action], [data-toolbar-primary]',
            splitClass: 'pmd-toolbar-split',
            rightLabel: 'Secondary toolbar actions'
        };
    }

    function toolbarChildContains(child, selector) {
        if (!child || !selector) return false;
        return (child.matches && child.matches(selector)) ||
            (child.querySelector && child.querySelector(selector));
    }

    function getOrCreateRightButtons(container, config) {
        var children = Array.prototype.slice.call(container.children);
        for (var i = 0; i < children.length; i++) {
            if (children[i].classList && children[i].classList.contains('right-buttons')) {
                children[i].classList.add('pmd-toolbar-right-buttons');
                children[i].setAttribute('aria-label', config.rightLabel || 'Secondary toolbar actions');
                return children[i];
            }
        }

        var rightButtons = document.createElement('div');
        rightButtons.className = 'right-buttons pmd-toolbar-right-buttons';
        rightButtons.setAttribute('aria-label', config.rightLabel || 'Secondary toolbar actions');
        return rightButtons;
    }

    function isToolbarActionChild(child) {
        if (!child || child.nodeType !== 1) return false;
        if (child.tagName === 'INPUT' || child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return false;
        if (child.classList && child.classList.contains('progress-indicator')) return false;
        if (child.classList && child.classList.contains('right-buttons')) return true;

        return (child.classList && (child.classList.contains('btn') || child.classList.contains('btn-group') || child.classList.contains('dropdown'))) ||
            (child.hasAttribute && (child.hasAttribute('data-pmd-toolbar-secondary') || child.hasAttribute('data-pmd-toolbar-primary'))) ||
            (child.querySelector && child.querySelector('.btn, .btn-group, [data-pmd-toolbar-secondary], [data-pmd-toolbar-primary]'));
    }

    function getToolbarContainers() {
        return document.querySelectorAll('.toolbar-action > .progress-indicator-container, .toolbar-action');
    }

    function shouldSkipToolbarContainer(container) {
        if (!container || container.closest('.modal, .media-manager, .media-toolbar, [data-control="media-manager"]')) return true;
        if (container.classList && container.classList.contains('right-buttons')) return true;
        if (container.closest('.right-buttons')) return true;
        return false;
    }

    function findPrimaryAction(children, config) {
        var primaryAction = null;

        children.forEach(function (child) {
            if (!primaryAction && toolbarChildContains(child, config.primarySelector)) {
                primaryAction = child;
            }
        });

        if (primaryAction) return primaryAction;

        if (config.allowRightOnly) return null;

        for (var i = 0; i < children.length; i++) {
            if (isToolbarActionChild(children[i]) && !(children[i].classList && children[i].classList.contains('right-buttons')) && !toolbarChildContains(children[i], config.secondarySelector)) {
                return children[i];
            }
        }

        return null;
    }

    function applyToolbarSplit(config) {
        ensureToolbarSplitStyles();

        Array.prototype.forEach.call(getToolbarContainers(), function (container) {
            if (shouldSkipToolbarContainer(container)) return;

            var children = Array.prototype.slice.call(container.children);
            var primaryAction = findPrimaryAction(children, config);
            if (!primaryAction && !config.allowRightOnly) return;

            var rightButtons = getOrCreateRightButtons(container, config);
            var secondaryActions = [];

            Array.prototype.slice.call(container.children).forEach(function (child) {
                if (!isToolbarActionChild(child) || child === rightButtons) return;
                if (child === primaryAction || toolbarChildContains(child, config.primarySelector)) return;
                if (config.secondarySelector && !primaryAction && !toolbarChildContains(child, config.secondarySelector)) return;
                secondaryActions.push(child);
            });

            if (!secondaryActions.length && rightButtons.parentElement !== container) return;

            container.classList.add('pmd-toolbar-split');
            if (config.splitClass) container.classList.add(config.splitClass);
            if (primaryAction) primaryAction.classList.add('pmd-toolbar-primary-action');

            if (rightButtons.parentElement !== container) {
                container.appendChild(rightButtons);
            }

            secondaryActions.forEach(function (button) {
                button.classList.add('pmd-toolbar-secondary-action');
                rightButtons.appendChild(button);
            });
        });
    }

    function applyScopedToolbarSplits() {
        var config = getActiveToolbarSplitConfig();
        if (!config || (config.routePattern && !config.routePattern.test((window.location.pathname || '').replace(/\/+$/, '')))) return;

        applyToolbarSplit(config);
    }

    function syncPaymentsModeToggleLabels() {
        var toggles = document.querySelectorAll('.pmd-payments-mode-toggle[data-methods-label][data-providers-label]');
        if (!toggles.length) return;

        var params = new URLSearchParams(window.location.search || '');
        var isProvidersMode = params.get('mode') === 'providers';

        Array.prototype.forEach.call(toggles, function (toggle) {
            var nextLabel = isProvidersMode ? toggle.getAttribute('data-methods-label') : toggle.getAttribute('data-providers-label');
            var nextHref = isProvidersMode ? toggle.getAttribute('data-methods-href') : toggle.getAttribute('data-providers-href');

            if (nextLabel) toggle.textContent = nextLabel;
            if (nextHref) toggle.setAttribute('href', nextHref);

            if (toggle.dataset.paymentsToggleBound === '1') return;
            toggle.dataset.paymentsToggleBound = '1';
            toggle.addEventListener('click', function () {
                var pendingLabel = isProvidersMode ? toggle.getAttribute('data-providers-label') : toggle.getAttribute('data-methods-label');
                if (pendingLabel) toggle.textContent = pendingLabel;
            });
        });
    }

    function scheduleToolbarSplit() {
        syncPaymentsModeToggleLabels();
        applyScopedToolbarSplits();
        window.setTimeout(function () {
            syncPaymentsModeToggleLabels();
            applyScopedToolbarSplits();
        }, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleToolbarSplit);
    }
    else {
        scheduleToolbarSplit();
    }
'''
TOOLBAR_CSS = r'''

/*
 * Staff list toolbar split.
 * The page-scoped JS adds `.pmd-staff-toolbar-split` only on the Staff index
 * toolbar and moves secondary actions into `.right-buttons`. Keeping the CSS
 * behind this scoped class prevents the split layout from affecting other
 * admin pages that also use `.toolbar-action` or `.progress-indicator-container`.
 */
html body.page .progress-indicator-container.pmd-staff-toolbar-split {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  gap: 8px !important;
  width: 100% !important;
  min-width: 0 !important;
}

html body.page .progress-indicator-container.pmd-staff-toolbar-split > .right-buttons {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 8px !important;
  margin-left: auto !important;
  flex: 0 0 auto !important;
}

html body.page .progress-indicator-container.pmd-staff-toolbar-split > .right-buttons > .btn,
html body.page .progress-indicator-container.pmd-staff-toolbar-split > .right-buttons > .btn-group {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* Optional development-only debugging: add `pmd-debug-toolbar` to <body>. */
html body.page.pmd-debug-toolbar .progress-indicator-container.pmd-staff-toolbar-split {
  outline: 1px dashed orange;
}

html body.page.pmd-debug-toolbar .progress-indicator-container.pmd-staff-toolbar-split .pmd-toolbar-primary-action {
  outline: 1px solid green;
}

html body.page.pmd-debug-toolbar .progress-indicator-container.pmd-staff-toolbar-split > .right-buttons {
  outline: 1px dashed blue;
}

html body.page.pmd-debug-toolbar .progress-indicator-container.pmd-staff-toolbar-split > .right-buttons .pmd-toolbar-secondary-action {
  outline: 1px solid red;
}


/* Generic admin toolbar split used by the runtime Toolbar Splitter. */
html body.page .progress-indicator-container.pmd-toolbar-split,
html body.page .toolbar-action.pmd-toolbar-split {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  gap: 8px !important;
  width: 100% !important;
  min-width: 0 !important;
}

html body.page .progress-indicator-container.pmd-toolbar-split > .right-buttons,
html body.page .toolbar-action.pmd-toolbar-split > .right-buttons {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 8px !important;
  margin-left: auto !important;
  flex: 0 0 auto !important;
}

html body.page .progress-indicator-container.pmd-toolbar-split > .right-buttons > .btn,
html body.page .progress-indicator-container.pmd-toolbar-split > .right-buttons > .btn-group,
html body.page .toolbar-action.pmd-toolbar-split > .right-buttons > .btn,
html body.page .toolbar-action.pmd-toolbar-split > .right-buttons > .btn-group {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

/* Secondary toolbar actions should match the Staff toolbar's ice button style on every admin page. */
html body.page .progress-indicator-container.pmd-toolbar-split > .right-buttons > .btn,
html body.page .toolbar-action.pmd-toolbar-split > .right-buttons > .btn,
html body.page .pmd-toolbar-right-buttons > .btn,
html body.page .pmd-toolbar-secondary-action {
  background: #f1f3f9 !important;
  background-color: #f1f3f9 !important;
  border: 1px solid #c9d2e3 !important;
  color: #364a63 !important;
  box-shadow: none !important;
}

html body.page .progress-indicator-container.pmd-toolbar-split > .right-buttons > .btn:hover,
html body.page .progress-indicator-container.pmd-toolbar-split > .right-buttons > .btn:focus,
html body.page .toolbar-action.pmd-toolbar-split > .right-buttons > .btn:hover,
html body.page .toolbar-action.pmd-toolbar-split > .right-buttons > .btn:focus,
html body.page .pmd-toolbar-right-buttons > .btn:hover,
html body.page .pmd-toolbar-right-buttons > .btn:focus,
html body.page .pmd-toolbar-secondary-action:hover,
html body.page .pmd-toolbar-secondary-action:focus {
  background: #e5ebf7 !important;
  background-color: #e5ebf7 !important;
  border-color: #b8c6dd !important;
  color: #364a63 !important;
  box-shadow: none !important;
}

'''


def replace_between_markers(text: str, start_markers: tuple[str, ...], end_markers: tuple[str, ...], replacement: str) -> tuple[str, bool]:
    start = -1
    for marker in start_markers:
        start = text.find(marker)
        if start >= 0:
            break

    if start < 0:
        return text, False

    end = -1
    for marker in end_markers:
        end = text.find(marker, start)
        if end >= 0:
            break

    if end < 0:
        return text, False

    return text[:start] + replacement + "\n" + text[end:], True


def patch_toolbar_js(rel_path: str) -> None:
    path = ROOT / rel_path
    text = read(path)
    if not text:
        log(f"WARN: {rel_path} not found; skipping toolbar JS patch")
        return

    # Replace the incomplete/older Toolbar Splitter block when present; if the
    # server copy never had the block, insert the complete implementation before
    # the existing button-color helpers.
    text, replaced = replace_between_markers(
        text,
        (
            "    /**\n     * PayMyDine admin toolbar splitting.",
            "    /**\n     * Page-scoped toolbar splitting.",
        ),
        (
            "    var REFERENCE_MODAL_GRADIENT",
            "    function applyGreenButtonBase",
        ),
        TOOLBAR_JS.rstrip("\n"),
    )

    if not replaced:
        marker = "    function applyGreenButtonBase(element)"
        alt_marker = "    var REFERENCE_MODAL_GRADIENT"
        insert_at = text.find(marker)
        if insert_at < 0:
            insert_at = text.find(alt_marker)
        if insert_at < 0:
            log(f"WARN: could not find insertion point in {rel_path}")
        else:
            text = text[:insert_at] + TOOLBAR_JS + "\n" + text[insert_at:]

    # Keep the helper wired into existing admin refresh paths. DOMContentLoaded
    # is handled inside TOOLBAR_JS; these calls cover TastyIgniter AJAX updates.
    if "applyScopedToolbarSplits();" not in text:
        text = text.replace(
            "        applyDeleteIconColor(context);\n",
            "        applyDeleteIconColor(context);\n        applyScopedToolbarSplits();\n",
            1,
        )
        text = text.replace(
            "        applyDeleteIconColor(scope || document);\n",
            "        applyDeleteIconColor(scope || document);\n        applyScopedToolbarSplits();\n",
            1,
        )
        text = text.replace(
            "    applyDeleteIconColor();\n",
            "    applyDeleteIconColor();\n    applyScopedToolbarSplits();\n",
            1,
        )

    write(path, text)
    log(f"patched toolbar splitter in {rel_path}")


def patch_toolbar_css() -> None:
    rel_path = "app/admin/assets/css/pmd-admin/components/toolbar-buttons.css"
    path = ROOT / rel_path
    text = read(path)
    if not text:
        log(f"WARN: {rel_path} not found; skipping toolbar CSS patch")
        return

    if ".pmd-staff-toolbar-split" not in text or ".toolbar-action.pmd-toolbar-split" not in text:
        text = text.rstrip() + "\n" + TOOLBAR_CSS
        write(path, text)
        log(f"patched Staff toolbar CSS in {rel_path}")
    else:
        log(f"toolbar split CSS already present in {rel_path}")


def is_git_tracked(path: Path) -> bool:
    try:
        rel = path.relative_to(ROOT)
    except ValueError:
        return False

    result = subprocess.run(
        ["git", "ls-files", "--error-unmatch", str(rel)],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return result.returncode == 0


def clear_caches() -> None:
    artisan = ROOT / "artisan"
    if artisan.exists():
        for command in (["php", "artisan", "optimize:clear"], ["php", "artisan", "view:clear"], ["php", "artisan", "cache:clear"]):
            try:
                subprocess.run(command, cwd=ROOT, check=False, timeout=60)
                log("ran " + " ".join(command))
            except Exception as exc:  # noqa: BLE001
                log(f"WARN: could not run {' '.join(command)}: {exc}")

    for rel in ("storage/framework/views", "bootstrap/cache"):
        directory = ROOT / rel
        if not directory.exists():
            continue
        removed = 0
        for child in directory.glob("*.php"):
            if is_git_tracked(child):
                continue
            try:
                child.unlink()
                removed += 1
            except OSError:
                pass
        log(f"cleared {removed} untracked compiled PHP files in {rel}")


def main() -> int:
    log(f"repo root: {ROOT}")

    for rel_path, urls, fallback in ASSETS:
        ensure_asset(rel_path, urls, fallback)

    patch_toolbar_js("app/admin/assets/src/js/app.js")
    patch_toolbar_js("app/admin/assets/js/admin.js")
    patch_toolbar_css()

    clear_caches()

    log("done. Hard refresh the browser (Ctrl+F5 / Cmd+Shift+R) and clear any CDN/proxy cache if used.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
