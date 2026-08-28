from pathlib import Path

css_path = Path('app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css')
js_path = Path('app/admin/assets/js/pmd-shifts-v1.js')
css = css_path.read_text()
js = js_path.read_text()

before_important = css.count('!important')


def replace_once(old: str, new: str) -> None:
    global css
    if old not in css:
        raise SystemExit('Missing CSS authority: ' + old[:120])
    css = css.replace(old, new, 1)

# Month calendar: enough room for a real five-line staff summary and actual clickable rows.
replace_once(
    'body.pmd-shifts-page #pmd-r2-calendar-surface-v160 .pmd-yc-month.is-month-view .pmd-yc-days{grid-auto-rows:132px!important}',
    'body.pmd-shifts-page #pmd-r2-calendar-surface-v160 .pmd-yc-month.is-month-view .pmd-yc-days{grid-auto-rows:152px!important}'
)
replace_once(
    '  height:132px!important;min-height:132px!important;max-height:132px!important;padding:10px!important;text-decoration:none!important;',
    '  height:152px!important;min-height:152px!important;max-height:152px!important;padding:10px!important;text-decoration:none!important;'
)
replace_once(
    'body.pmd-shifts-page #pmd-r2-calendar-surface-v160 .pmd-yc-day__operations{display:grid!important;gap:4px!important;margin-top:8px!important;min-width:0!important;pointer-events:none!important}',
    'body.pmd-shifts-page #pmd-r2-calendar-surface-v160 .pmd-yc-day__operations{display:grid!important;gap:4px!important;margin-top:8px!important;min-width:0!important;pointer-events:auto!important}'
)

# Day canvas: the scheduler owns the full workspace; the staff table is balanced inside it.
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-scroll{width:max-content;max-width:100%;overflow:auto;border:1px solid #d7e4ec;border-radius:18px;background:#fff;max-height:calc(100dvh - 190px)}',
    'body.pmd-shifts-page .pmd-shifts-resource-scroll{width:100%;max-width:100%;min-height:640px;box-sizing:border-box;overflow:auto;padding:18px;border:1px solid #d7e4ec;border-radius:18px;background:#f5f9fc;box-shadow:0 10px 28px rgba(31,65,88,.07);scrollbar-gutter:stable;max-height:calc(100dvh - 190px)}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-table{width:max-content;min-width:0;border-collapse:separate;border-spacing:0;table-layout:fixed;background:#fff;color:#102a43}',
    'body.pmd-shifts-page .pmd-shifts-resource-table{width:max-content;min-width:0;margin:0 auto;border:1px solid #dce7ee;border-collapse:separate;border-spacing:0;border-radius:16px;table-layout:fixed;background:#fff;color:#102a43;box-shadow:0 5px 18px rgba(25,57,79,.05);overflow:hidden}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-table thead th{position:sticky;top:0;z-index:8;height:76px;background:#f8fbfd}',
    'body.pmd-shifts-page .pmd-shifts-resource-table thead th{position:sticky;top:0;z-index:8;height:86px;background:#f8fbfd}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-corner{position:sticky;left:0;z-index:12;width:92px;padding:0 14px;text-align:left;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;color:#71849a}',
    'body.pmd-shifts-page .pmd-shifts-resource-corner{position:sticky;left:0;z-index:12;width:88px;padding:0 14px;text-align:left;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#71849a}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-time{position:sticky;left:0;z-index:6;width:92px;height:46px;padding:7px 12px;background:#f8fbfd;text-align:left;vertical-align:middle}',
    'body.pmd-shifts-page .pmd-shifts-resource-time{position:sticky;left:0;z-index:6;width:88px;height:52px;padding:8px 12px;background:#f8fbfd;text-align:left;vertical-align:middle}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-time strong{font-size:13px;font-weight:900;color:#102a43}',
    'body.pmd-shifts-page .pmd-shifts-resource-time strong{font-size:12px;font-weight:900;color:#102a43}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-time span{margin-top:2px;font-size:9px;font-weight:750;color:#9aabb8;text-transform:uppercase}',
    'body.pmd-shifts-page .pmd-shifts-resource-time span{display:none}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-person{width:210px;min-width:210px;max-width:210px;padding:10px 12px;text-align:left;vertical-align:middle}',
    'body.pmd-shifts-page .pmd-shifts-resource-person{width:248px;min-width:248px;max-width:248px;padding:12px 14px;text-align:left;vertical-align:middle}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-person__avatar{display:inline-grid;width:34px;height:34px;place-items:center;float:left;margin-right:9px;border:1px solid #cfe0ed;border-radius:11px;background:#eef7fd;color:#173752;font-size:11px;font-weight:900}',
    'body.pmd-shifts-page .pmd-shifts-resource-person__avatar{display:inline-grid;width:40px;height:40px;place-items:center;float:left;margin-right:10px;border:1px solid #cfe0ed;border-radius:12px;background:#eef7fd;color:#173752;font-size:12px;font-weight:900}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-person__copy strong{font-size:12px;font-weight:900;color:#102a43}',
    'body.pmd-shifts-page .pmd-shifts-resource-person__copy strong{font-size:13px;font-weight:900;color:#102a43}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-person__copy small{margin-top:2px;font-size:9.5px;font-weight:750;color:#71849a}',
    'body.pmd-shifts-page .pmd-shifts-resource-person__copy small{margin-top:2px;font-size:10px;font-weight:750;color:#71849a}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-cell{width:210px;min-width:210px;max-width:210px;height:46px;padding:0;background:#fff;vertical-align:top}',
    'body.pmd-shifts-page .pmd-shifts-resource-cell{position:relative;width:248px;min-width:248px;max-width:248px;height:52px;padding:0;background:#fff;vertical-align:top}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-empty{display:grid;width:100%;height:45px;place-items:center;border:0;background:transparent;color:#b0bec7;cursor:pointer}',
    'body.pmd-shifts-page .pmd-shifts-resource-empty{display:grid;width:100%;height:51px;place-items:center;border:0;background:transparent;color:#b0bec7;cursor:pointer}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-cell.is-scheduled{padding:4px;background:#f4f9ff}',
    'body.pmd-shifts-page .pmd-shifts-resource-cell.is-scheduled{padding:0;background:#f8fbff}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-cell__stack{display:grid;height:100%;gap:4px}',
    'body.pmd-shifts-page .pmd-shifts-resource-cell__stack{position:absolute;inset:6px;display:grid;min-height:0;gap:4px}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-shift{display:flex;width:100%;height:100%;min-height:38px;flex-direction:column;align-items:flex-start;justify-content:flex-start;padding:9px 10px;border:1px solid #9fc8e5;border-left:4px solid #2f80ed;border-radius:10px;background:#eaf3ff;color:#173752;text-align:left;cursor:pointer;overflow:hidden}',
    'body.pmd-shifts-page .pmd-shifts-resource-shift{display:flex;width:100%;height:100%;min-height:42px;box-sizing:border-box;flex-direction:column;align-items:flex-start;justify-content:flex-start;padding:11px 12px;border:1px solid #9fc8e5;border-left:4px solid #2f80ed;border-radius:12px;background:#edf5ff;color:#173752;box-shadow:0 5px 14px rgba(47,128,237,.10);text-align:left;cursor:pointer;overflow:hidden}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-shift__label{display:block;max-width:100%;overflow:hidden;font-size:9px;font-weight:900;text-overflow:ellipsis;text-transform:uppercase;letter-spacing:.035em;white-space:nowrap}',
    'body.pmd-shifts-page .pmd-shifts-resource-shift__label{display:inline-flex;max-width:100%;overflow:hidden;padding:3px 6px;border-radius:999px;background:rgba(255,255,255,.78);font-size:8.5px;font-weight:900;text-overflow:ellipsis;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-resource-shift strong{display:block;margin-top:4px;font-size:12px;font-weight:900}',
    'body.pmd-shifts-page .pmd-shifts-resource-shift strong{display:block;margin-top:7px;font-size:13px;font-weight:900;letter-spacing:-.01em}'
)
replace_once(
    '@media(max-width:900px){body.pmd-shifts-page .pmd-shifts-resource-person{min-width:165px}body.pmd-shifts-page .pmd-shifts-resource-scroll{max-height:calc(100dvh - 150px)}}',
    '@media(max-width:900px){body.pmd-shifts-page .pmd-shifts-resource-person,body.pmd-shifts-page .pmd-shifts-resource-cell{width:220px;min-width:220px;max-width:220px}body.pmd-shifts-page .pmd-shifts-resource-scroll{min-height:560px;max-height:calc(100dvh - 150px);padding:12px}}'
)

# Month cell hierarchy: compact single-line role rows instead of loose text.
replace_once(
    'body.pmd-shifts-page .pmd-shifts-yc-team-summary{display:grid!important;align-content:start!important;gap:3px!important;min-width:0!important;margin-top:4px!important}',
    'body.pmd-shifts-page .pmd-shifts-yc-team-summary{display:grid!important;align-content:start!important;gap:4px!important;min-width:0!important;margin-top:5px!important;pointer-events:auto!important}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-yc-context{display:block;min-width:0;overflow:hidden;color:#7b8b99;font-size:9px;font-weight:850;line-height:1.1;text-overflow:ellipsis;white-space:nowrap}',
    'body.pmd-shifts-page .pmd-shifts-yc-context{display:inline-flex;width:max-content;max-width:100%;min-height:18px;align-items:center;overflow:hidden;padding:0 7px;border-radius:999px;background:#eef4f8;color:#687f91;font-size:8.5px;font-weight:850;line-height:1;text-overflow:ellipsis;white-space:nowrap}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-yc-team-row{display:flex;width:100%;min-width:0;align-items:center;gap:4px;margin:0;padding:2px 4px;border:0;border-radius:6px;background:transparent;color:#173752;font:inherit;line-height:1.15;text-align:left;cursor:pointer}',
    'body.pmd-shifts-page .pmd-shifts-yc-team-row{display:grid;width:100%;min-width:0;min-height:20px;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:6px;margin:0;padding:3px 6px;border:1px solid #e3ebf0;border-radius:7px;background:#f9fbfc;color:#173752;font:inherit;line-height:1.1;text-align:left;cursor:pointer}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-yc-team-row:hover,body.pmd-shifts-page .pmd-shifts-yc-team-row:focus-visible{background:#eaf3ff;outline:none}',
    'body.pmd-shifts-page .pmd-shifts-yc-team-row:hover,body.pmd-shifts-page .pmd-shifts-yc-team-row:focus-visible{border-color:#b9d9cb;background:#eef9f4;outline:none}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-yc-team-row strong{flex:0 0 auto;font-size:9px;font-weight:900}',
    'body.pmd-shifts-page .pmd-shifts-yc-team-row strong{font-size:8.5px;font-weight:900;color:#5f746e;text-transform:uppercase;letter-spacing:.02em}'
)
replace_once(
    'body.pmd-shifts-page .pmd-shifts-yc-team-row span{display:block;min-width:0;overflow:hidden;font-size:9px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}',
    'body.pmd-shifts-page .pmd-shifts-yc-team-row span{display:block;min-width:0;overflow:hidden;color:#173752;font-size:9.5px;font-weight:800;text-overflow:ellipsis;white-space:nowrap}'
)

# A final scoped visual layer. No global selectors and no new !important debt.
css += '''\n\n/* PMD_SHIFTS_POLISHED_SCHEDULE_CANVAS_V9 */\nbody.pmd-shifts-page .pmd-shifts-resource-screen{width:100%;min-width:0}\nbody.pmd-shifts-page .pmd-shifts-resource-screen .pmd-r2-day-view__header{margin-top:18px;box-shadow:0 6px 18px rgba(30,65,88,.05)}\nbody.pmd-shifts-page .pmd-shifts-resource-table th:first-child,body.pmd-shifts-page .pmd-shifts-resource-table td:first-child{border-left:0}\nbody.pmd-shifts-page .pmd-shifts-resource-table tr:last-child>th,body.pmd-shifts-page .pmd-shifts-resource-table tr:last-child>td{border-bottom:0}\nbody.pmd-shifts-page .pmd-shifts-resource-shift:hover{transform:translateY(-1px);box-shadow:0 7px 18px rgba(47,128,237,.14)}\nbody.pmd-shifts-page .pmd-shifts-resource-shift.is-confirmed{box-shadow:0 5px 14px rgba(32,163,111,.10)}\nbody.pmd-shifts-page .pmd-shifts-resource-shift.is-absent{box-shadow:0 5px 14px rgba(214,66,75,.08)}\nbody.pmd-shifts-page #pmd-r2-calendar-surface-v160 .pmd-yc-month.is-month-view .pmd-yc-day__number{font-size:14px}\nbody.pmd-shifts-page #pmd-r2-calendar-surface-v160 .pmd-yc-day.is-today .pmd-yc-day__number{width:28px;height:28px}\nbody.pmd-shifts-page #pmd-r2-calendar-surface-v160 .pmd-yc-day:hover .pmd-shifts-yc-context{background:#e5eef4}\n@media(min-width:901px){body.pmd-shifts-page .pmd-shifts-resource-scroll{display:block}}\n'''

if css.count('!important') > before_important:
    raise SystemExit('Visual polish may not add new !important debt')

if 'PMD_SHIFTS_POLISHED_SCHEDULE_CANVAS_V9' not in css:
    raise SystemExit('Missing V9 marker')

css_path.write_text(css)

if 'data-pmd-shifts-exact-ui-v8' not in js or 'pmd-shifts-dashboard-reservations-v4.css?v=8' not in js:
    raise SystemExit('Expected V8 cache authority not found')
js = js.replace('data-pmd-shifts-exact-ui-v8', 'data-pmd-shifts-exact-ui-v9', 1)
js = js.replace('pmd-shifts-dashboard-reservations-v4.css?v=8', 'pmd-shifts-dashboard-reservations-v4.css?v=9', 2)
js_path.write_text(js)
