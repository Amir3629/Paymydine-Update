#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

CONTROLLER="app/admin/controllers/Shifts.php"
NAV_JS="app/admin/assets/js/pmd-shifts-inpage-day-nav-v13.js"
CAL_JS="app/admin/assets/js/pmd-shifts-big-calendar-v14.js"
CAL_CSS="app/admin/assets/css/pmd-shifts-big-calendar-v14.css"
CSS_REF="app/admin/assets/css/pmd-shifts-endpoint-labels-v12c.css"
BACKUP="/tmp/pmd-shifts-kpi-calendar-v14-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-kpi-calendar-v14.XXXXXX)"
APPLY_STARTED=0
CAL_JS_EXISTED=0
CAL_CSS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V14"
        set +e

        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        sudo cp -a "$BACKUP/$NAV_JS" "$NAV_JS"

        if [ "$CAL_JS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$CAL_JS" "$CAL_JS"
        else
            sudo rm -f "$CAL_JS"
        fi

        if [ "$CAL_CSS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$CAL_CSS" "$CAL_CSS"
        else
            sudo rm -f "$CAL_CSS"
        fi

        echo "ROLLBACK COMPLETE"
        echo "Backup kept at: $BACKUP"
    fi

    rm -rf "$TMPROOT"
    exit "$rc"
}
trap cleanup EXIT

echo "========================================"
echo "1. PRE-FLIGHT"
echo "========================================"

test -f "$CONTROLLER" || { echo "STOP: missing $CONTROLLER"; exit 20; }
test -f "$NAV_JS" || { echo "STOP: missing V13 navigation JS"; exit 21; }
test -f "$CSS_REF" || { echo "STOP: missing CSS reference file $CSS_REF"; exit 22; }

grep -Fq "PMD_SHIFTS_INPAGE_DAY_NAV_V13" "$CONTROLLER" || {
    echo "STOP: V13 controller marker missing"
    exit 23
}

grep -Fq "PMD_SHIFTS_INPAGE_DAY_NAV_V13" "$NAV_JS" || {
    echo "STOP: V13 JS marker missing"
    exit 24
}

grep -Fq "refreshVisibleKpis();" "$NAV_JS" || {
    if ! grep -Fq "PMD_SHIFTS_KPI_REFRESH_V13B" "$NAV_JS"; then
        echo "STOP: expected KPI refresh call/marker missing"
        exit 25
    fi
}

if ! grep -Fq "pmd-shifts-inpage-day-nav-v13.js" "$CONTROLLER"; then
    echo "STOP: controller no longer loads V13 JS"
    exit 26
fi

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p \
  "$TMPROOT/$(dirname "$CONTROLLER")" \
  "$TMPROOT/$(dirname "$NAV_JS")" \
  "$TMPROOT/$(dirname "$CAL_JS")" \
  "$TMPROOT/$(dirname "$CAL_CSS")"

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$NAV_JS" "$TMPROOT/$NAV_JS"

python3 - "$TMPROOT/$NAV_JS" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SHIFTS_KPI_REFRESH_V13B'

if marker not in s:
    anchor = "  function parseDateKey(key) {"
    if s.count(anchor) != 1:
        raise SystemExit(f'STOP: parseDateKey anchor count={s.count(anchor)}')

    block = r'''  // PMD_SHIFTS_KPI_REFRESH_V13B
  // V13 calls refreshVisibleKpis() after fetching a day, but the active
  // production authority did not define it. Reuse the existing KPI APIs so
  // month/day navigation can finish without throwing and visible cards update
  // from the freshly fetched kpiCards payload.
  function refreshVisibleKpis() {
    visibleKpiCards().forEach(function (card) {
      var key = card.getAttribute('data-pmd-shifts-kpi-key') || '';
      if (!key || !kpiCards || !kpiCards[key]) return;
      applyKpi(card, key);
    });
    syncKpiMenus();
  }

'''
    s = s.replace(anchor, block + anchor, 1)

if 'function refreshVisibleKpis()' not in s:
    raise SystemExit('STOP: KPI refresh function missing after patch')
if 'refreshVisibleKpis();' not in s:
    raise SystemExit('STOP: KPI refresh call missing after patch')

p.write_text(s)
print('V13 JS: missing KPI refresh function restored')
PY

cat > "$TMPROOT/$CAL_JS" <<'JS'
/* PMD_SHIFTS_BIG_CALENDAR_V14 */
(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-shifts-root]');
  if (!root) return;

  var card = null;
  var grid = null;
  var title = null;
  var activeInput = null;
  var cursor = null;
  var observer = null;

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function dateKey(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function parseKey(value) {
    var match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
    if (
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() !== Number(match[2]) - 1 ||
      date.getDate() !== Number(match[3])
    ) return null;
    return date;
  }

  function locale() {
    return document.documentElement.lang || navigator.language || 'de-DE';
  }

  function labelText() {
    var lang = String(locale()).toLowerCase();
    if (lang.indexOf('de') === 0) return 'Datum auswählen';
    if (lang.indexOf('fa') === 0) return 'انتخاب تاریخ';
    return 'Choose date';
  }

  function todayText() {
    var lang = String(locale()).toLowerCase();
    if (lang.indexOf('de') === 0) return 'Heute';
    if (lang.indexOf('fa') === 0) return 'امروز';
    return 'Today';
  }

  function monthTitle(date) {
    try {
      return new Intl.DateTimeFormat(locale(), {month:'long', year:'numeric'}).format(date);
    } catch (error) {
      return date.getFullYear() + '-' + pad(date.getMonth() + 1);
    }
  }

  function weekdayLabels() {
    var monday = new Date(2024, 0, 1, 12, 0, 0, 0);
    var labels = [];
    for (var i = 0; i < 7; i += 1) {
      var day = new Date(monday);
      day.setDate(monday.getDate() + i);
      try {
        labels.push(new Intl.DateTimeFormat(locale(), {weekday:'short'}).format(day));
      } catch (error) {
        labels.push(['Mo','Tu','We','Th','Fr','Sa','Su'][i]);
      }
    }
    return labels;
  }

  function ensureCard() {
    if (card) return card;

    card = document.createElement('section');
    card.id = 'pmd-shifts-big-calendar-v14';
    card.hidden = true;
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'false');
    card.setAttribute('aria-label', labelText());
    card.innerHTML = '' +
      '<div class="pmd-shifts-big-calendar-v14__header">' +
        '<button type="button" class="pmd-shifts-big-calendar-v14__nav" data-pmd-cal-v14-prev aria-label="Previous month">‹</button>' +
        '<strong data-pmd-cal-v14-title></strong>' +
        '<button type="button" class="pmd-shifts-big-calendar-v14__nav" data-pmd-cal-v14-next aria-label="Next month">›</button>' +
      '</div>' +
      '<div class="pmd-shifts-big-calendar-v14__weekdays" data-pmd-cal-v14-weekdays></div>' +
      '<div class="pmd-shifts-big-calendar-v14__grid" data-pmd-cal-v14-grid></div>' +
      '<div class="pmd-shifts-big-calendar-v14__footer">' +
        '<button type="button" data-pmd-cal-v14-today></button>' +
      '</div>';

    document.body.appendChild(card);
    grid = card.querySelector('[data-pmd-cal-v14-grid]');
    title = card.querySelector('[data-pmd-cal-v14-title]');

    var weekdays = card.querySelector('[data-pmd-cal-v14-weekdays]');
    weekdays.innerHTML = weekdayLabels().map(function (value) {
      return '<span>' + String(value).replace(/[&<>"']/g, function (ch) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
      }) + '</span>';
    }).join('');

    card.querySelector('[data-pmd-cal-v14-today]').textContent = todayText();
    return card;
  }

  function selectedKey() {
    if (activeInput && /^\d{4}-\d{2}-\d{2}$/.test(String(activeInput.value || ''))) {
      return String(activeInput.value);
    }
    try {
      var url = new URL(window.location.href);
      var fromUrl = String(url.searchParams.get('day') || '');
      if (/^\d{4}-\d{2}-\d{2}$/.test(fromUrl)) return fromUrl;
    } catch (error) {}
    return dateKey(new Date());
  }

  function render() {
    ensureCard();
    if (!cursor) cursor = parseKey(selectedKey()) || new Date();

    var year = cursor.getFullYear();
    var month = cursor.getMonth();
    var first = new Date(year, month, 1, 12, 0, 0, 0);
    var startOffset = (first.getDay() + 6) % 7;
    var start = new Date(year, month, 1 - startOffset, 12, 0, 0, 0);
    var selected = selectedKey();
    var today = dateKey(new Date());

    title.textContent = monthTitle(first);

    var html = '';
    for (var i = 0; i < 42; i += 1) {
      var day = new Date(start);
      day.setDate(start.getDate() + i);
      var key = dateKey(day);
      var outside = day.getMonth() !== month;
      var classes = 'pmd-shifts-big-calendar-v14__day';
      if (outside) classes += ' is-outside';
      if (key === today) classes += ' is-today';
      if (key === selected) classes += ' is-selected';
      html += '<button type="button" class="' + classes + '" data-pmd-cal-v14-day="' + key + '" aria-label="' + key + '">' + day.getDate() + '</button>';
    }
    grid.innerHTML = html;
  }

  function positionCard(trigger) {
    if (!card || card.hidden || !trigger) return;
    var rect = trigger.getBoundingClientRect();
    var margin = 16;
    var width = Math.min(540, Math.max(320, window.innerWidth - margin * 2));
    card.style.width = width + 'px';

    var measured = card.getBoundingClientRect();
    var left = rect.right - width;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    var top = rect.bottom + 12;
    var height = measured.height || 520;
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - height - 12);
    }

    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
  }

  function openCalendar(input, trigger) {
    activeInput = input;
    cursor = parseKey(String(input && input.value || '')) || parseKey(selectedKey()) || new Date();
    ensureCard();
    render();
    card.hidden = false;
    card.setAttribute('aria-hidden', 'false');
    window.requestAnimationFrame(function () {
      positionCard(trigger || (input && input.closest('.pmd-shifts-date-picker')) || input);
    });
  }

  function closeCalendar() {
    if (!card) return;
    card.hidden = true;
    card.setAttribute('aria-hidden', 'true');
    activeInput = null;
  }

  function choose(key) {
    if (!activeInput || !/^\d{4}-\d{2}-\d{2}$/.test(String(key || ''))) return;
    activeInput.value = key;
    activeInput.dispatchEvent(new Event('change', {bubbles:true}));
    closeCalendar();
  }

  function normalizePickers() {
    root.querySelectorAll('.pmd-shifts-date-picker').forEach(function (picker) {
      var input = picker.querySelector('[data-pmd-shifts-date-input]');
      if (!input) return;
      picker.setAttribute('data-pmd-big-calendar-trigger-v14', '1');
      picker.setAttribute('role', 'button');
      picker.setAttribute('tabindex', '0');
      picker.setAttribute('aria-label', labelText());
      picker.removeAttribute('title');
      input.readOnly = true;
      input.setAttribute('tabindex', '-1');
      input.setAttribute('aria-hidden', 'true');
      input.style.pointerEvents = 'none';
    });
  }

  normalizePickers();
  observer = new MutationObserver(function () {
    normalizePickers();
  });
  observer.observe(root, {childList:true, subtree:true});

  document.addEventListener('pointerdown', function (event) {
    var picker = event.target && event.target.closest
      ? event.target.closest('[data-pmd-big-calendar-trigger-v14]')
      : null;
    if (picker && root.contains(picker)) event.preventDefault();
  }, true);

  document.addEventListener('click', function (event) {
    var picker = event.target && event.target.closest
      ? event.target.closest('[data-pmd-big-calendar-trigger-v14]')
      : null;
    if (picker && root.contains(picker)) {
      event.preventDefault();
      var input = picker.querySelector('[data-pmd-shifts-date-input]');
      if (input) openCalendar(input, picker);
      return;
    }

    var day = event.target && event.target.closest
      ? event.target.closest('[data-pmd-cal-v14-day]')
      : null;
    if (day && card && card.contains(day)) {
      event.preventDefault();
      choose(day.getAttribute('data-pmd-cal-v14-day'));
      return;
    }

    var prev = event.target && event.target.closest
      ? event.target.closest('[data-pmd-cal-v14-prev]')
      : null;
    if (prev && card && card.contains(prev)) {
      event.preventDefault();
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1, 12, 0, 0, 0);
      render();
      return;
    }

    var next = event.target && event.target.closest
      ? event.target.closest('[data-pmd-cal-v14-next]')
      : null;
    if (next && card && card.contains(next)) {
      event.preventDefault();
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12, 0, 0, 0);
      render();
      return;
    }

    var today = event.target && event.target.closest
      ? event.target.closest('[data-pmd-cal-v14-today]')
      : null;
    if (today && card && card.contains(today)) {
      event.preventDefault();
      choose(dateKey(new Date()));
      return;
    }

    if (card && !card.hidden && !card.contains(event.target)) closeCalendar();
  }, true);

  document.addEventListener('keydown', function (event) {
    var picker = event.target && event.target.closest
      ? event.target.closest('[data-pmd-big-calendar-trigger-v14]')
      : null;
    if (picker && root.contains(picker) && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      var input = picker.querySelector('[data-pmd-shifts-date-input]');
      if (input) openCalendar(input, picker);
      return;
    }
    if (event.key === 'Escape') closeCalendar();
  }, true);

  window.addEventListener('resize', function () {
    if (!card || card.hidden || !activeInput) return;
    positionCard(activeInput.closest('.pmd-shifts-date-picker') || activeInput);
  });

  window.addEventListener('scroll', function () {
    if (!card || card.hidden || !activeInput) return;
    positionCard(activeInput.closest('.pmd-shifts-date-picker') || activeInput);
  }, true);

  window.addEventListener('pagehide', function () {
    if (observer) observer.disconnect();
  }, {once:true});
})();
JS

cat > "$TMPROOT/$CAL_CSS" <<'CSS'
/* PMD_SHIFTS_BIG_CALENDAR_V14 */
#pmd-shifts-big-calendar-v14 {
  position: fixed !important;
  z-index: 2147482500 !important;
  box-sizing: border-box !important;
  width: min(540px, calc(100vw - 32px));
  padding: 22px !important;
  border: 1px solid #d7e3ec !important;
  border-radius: 26px !important;
  background: #ffffff !important;
  box-shadow: 0 24px 70px rgba(24, 50, 72, .24) !important;
  color: #17324d !important;
  font-family: inherit !important;
}

#pmd-shifts-big-calendar-v14[hidden] {
  display: none !important;
}

.pmd-shifts-big-calendar-v14__header {
  display: grid !important;
  grid-template-columns: 52px minmax(0, 1fr) 52px !important;
  align-items: center !important;
  gap: 12px !important;
  margin-bottom: 18px !important;
}

.pmd-shifts-big-calendar-v14__header strong {
  display: block !important;
  text-align: center !important;
  font-size: 24px !important;
  font-weight: 800 !important;
  line-height: 1.15 !important;
  text-transform: capitalize !important;
}

.pmd-shifts-big-calendar-v14__nav {
  width: 52px !important;
  height: 52px !important;
  border: 1px solid #d7e3ec !important;
  border-radius: 16px !important;
  background: #f8fbfd !important;
  color: #17324d !important;
  font-size: 30px !important;
  line-height: 1 !important;
  cursor: pointer !important;
}

.pmd-shifts-big-calendar-v14__weekdays,
.pmd-shifts-big-calendar-v14__grid {
  display: grid !important;
  grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
  gap: 8px !important;
}

.pmd-shifts-big-calendar-v14__weekdays {
  margin-bottom: 8px !important;
}

.pmd-shifts-big-calendar-v14__weekdays span {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 34px !important;
  color: #71849a !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
}

.pmd-shifts-big-calendar-v14__day {
  min-width: 0 !important;
  height: 56px !important;
  border: 1px solid transparent !important;
  border-radius: 15px !important;
  background: #f7fafc !important;
  color: #17324d !important;
  font-size: 17px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
}

.pmd-shifts-big-calendar-v14__day:hover,
.pmd-shifts-big-calendar-v14__day:focus-visible {
  border-color: #9bc8de !important;
  background: #eaf6fb !important;
  outline: none !important;
}

.pmd-shifts-big-calendar-v14__day.is-outside {
  opacity: .38 !important;
}

.pmd-shifts-big-calendar-v14__day.is-today {
  border-color: #39a9ca !important;
}

.pmd-shifts-big-calendar-v14__day.is-selected {
  border-color: #17324d !important;
  background: #17324d !important;
  color: #ffffff !important;
  box-shadow: 0 7px 18px rgba(23, 50, 77, .2) !important;
}

.pmd-shifts-big-calendar-v14__footer {
  display: flex !important;
  justify-content: flex-end !important;
  margin-top: 18px !important;
  padding-top: 16px !important;
  border-top: 1px solid #e4edf3 !important;
}

.pmd-shifts-big-calendar-v14__footer button {
  min-width: 112px !important;
  min-height: 46px !important;
  padding: 0 20px !important;
  border: 1px solid #cbdbe6 !important;
  border-radius: 14px !important;
  background: #ffffff !important;
  color: #17324d !important;
  font-size: 15px !important;
  font-weight: 800 !important;
  cursor: pointer !important;
}

body.pmd-shifts-page .pmd-shifts-date-picker[data-pmd-big-calendar-trigger-v14] {
  cursor: pointer !important;
}

@media (max-width: 700px) {
  #pmd-shifts-big-calendar-v14 {
    width: calc(100vw - 24px) !important;
    padding: 16px !important;
    border-radius: 20px !important;
  }

  .pmd-shifts-big-calendar-v14__header {
    grid-template-columns: 46px minmax(0, 1fr) 46px !important;
  }

  .pmd-shifts-big-calendar-v14__header strong {
    font-size: 20px !important;
  }

  .pmd-shifts-big-calendar-v14__nav {
    width: 46px !important;
    height: 46px !important;
  }

  .pmd-shifts-big-calendar-v14__day {
    height: 46px !important;
    border-radius: 12px !important;
    font-size: 15px !important;
  }
}
CSS

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
nav = "        $this->addJs('js/pmd-shifts-inpage-day-nav-v13.js');"
css = "        $this->addCss('css/pmd-shifts-big-calendar-v14.css');"
js = "        $this->addJs('js/pmd-shifts-big-calendar-v14.js');"
marker = "        // PMD_SHIFTS_BIG_CALENDAR_V14"

if css not in s or js not in s:
    if s.count(nav) != 1:
        raise SystemExit(f'STOP: V13 registration count={s.count(nav)}')
    replacement = css + "\n" + nav + "\n" + marker + "\n" + js
    s = s.replace(nav, replacement, 1)

p.write_text(s)
print('Shifts.php: V14 calendar assets registered after V13 authority')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
node --check "$TMPROOT/$NAV_JS"
node --check "$TMPROOT/$CAL_JS"

grep -Fq "PMD_SHIFTS_KPI_REFRESH_V13B" "$TMPROOT/$NAV_JS"
grep -Fq "function refreshVisibleKpis()" "$TMPROOT/$NAV_JS"
grep -Fq "pmd-shifts-big-calendar-v14.css" "$TMPROOT/$CONTROLLER"
grep -Fq "pmd-shifts-big-calendar-v14.js" "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_BIG_CALENDAR_V14" "$TMPROOT/$CAL_JS"
grep -Fq "PMD_SHIFTS_BIG_CALENDAR_V14" "$TMPROOT/$CAL_CSS"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY 4 TARGETS"
echo "========================================"

mkdir -p \
  "$BACKUP/$(dirname "$CONTROLLER")" \
  "$BACKUP/$(dirname "$NAV_JS")" \
  "$BACKUP/$(dirname "$CAL_JS")" \
  "$BACKUP/$(dirname "$CAL_CSS")"

sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"
sudo cp -a "$NAV_JS" "$BACKUP/$NAV_JS"

if [ -e "$CAL_JS" ]; then
    CAL_JS_EXISTED=1
    sudo cp -a "$CAL_JS" "$BACKUP/$CAL_JS"
fi

if [ -e "$CAL_CSS" ]; then
    CAL_CSS_EXISTED=1
    sudo cp -a "$CAL_CSS" "$BACKUP/$CAL_CSS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY 4 TARGETS"
echo "========================================"

APPLY_STARTED=1

sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$NAV_JS" >/dev/null < "$TMPROOT/$NAV_JS"
sudo tee "$CAL_JS" >/dev/null < "$TMPROOT/$CAL_JS"
sudo tee "$CAL_CSS" >/dev/null < "$TMPROOT/$CAL_CSS"

sudo chown --reference="$NAV_JS" "$CAL_JS"
sudo chmod --reference="$NAV_JS" "$CAL_JS"
sudo chown --reference="$CSS_REF" "$CAL_CSS"
sudo chmod --reference="$CSS_REF" "$CAL_CSS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
node --check "$NAV_JS"
node --check "$CAL_JS"

grep -nF "PMD_SHIFTS_KPI_REFRESH_V13B" "$NAV_JS"
grep -nF "function refreshVisibleKpis()" "$NAV_JS"
grep -nF "pmd-shifts-big-calendar-v14" "$CONTROLLER"
grep -nF "PMD_SHIFTS_BIG_CALENDAR_V14" "$CAL_JS"
grep -nF "PMD_SHIFTS_BIG_CALENDAR_V14" "$CAL_CSS"

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"
sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS KPI + BIG CALENDAR V14 INSTALLED"
echo "========================================"
echo "Fixes:"
echo "  - V13 day fetch no longer dies on undefined refreshVisibleKpis()"
echo "  - visible KPI cards refresh from the fetched day/month payload"
echo "  - previous/next/date/today remain in-page"
echo "  - native tiny browser date popup is replaced by a large custom calendar card"
echo "  - calendar stays inside the viewport and supports month navigation"
echo "  - no Shift save/remove, Member, OTP, Portal MFA, or notification logic changed"
echo "Backup: $BACKUP"
