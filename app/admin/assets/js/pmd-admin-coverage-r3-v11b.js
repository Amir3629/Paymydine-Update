/* PMD_ADMIN_COVERAGE_R3_CLEAN
 * Central catalogue-driven cleanup for remaining Admin copy.
 * No Turkish or German wording lives in this runtime.
 */
(function () {
    'use strict';

    if (window.PMDAdminCoverageR3 && window.PMDAdminCoverageR3.version) {
        window.PMDAdminCoverageR3.run();
        return;
    }

    var locale = String(window.PMD_ADMIN_LOCALE || document.documentElement.lang || 'en')
        .toLowerCase().split('-')[0];
    var messages = window.PMD_PLATFORM_MESSAGES || {};
    var busy = false;
    var observer = null;

    var sourceToKey = {"Floor guide":"r3.floor_guide","Occupied / open order":"r3.occupied_open_order","Enabled Admin accounts for this restaurant location. Open a person to review their Admin-session and time-clock history for the selected date range.":"r3.report_admin_accounts_help","Total VAT collected / this month":"r3.total_vat_month","Gross to net":"r3.gross_to_net","Total loss (voids + refunds)":"r3.total_loss","Cash percent / Total payments":"r3.cash_percent","Open bills / unpaid tables":"r3.open_bills","Average bill settlement time":"r3.avg_settlement","Failed / declined transactions":"r3.failed_declined","Restaurant profile":"r3.restaurant_profile","Manage your restaurant details.":"r3.manage_restaurant","Customer menu theme":"r3.customer_menu_theme","Choose your digital menu theme.":"r3.choose_menu_theme","Devices":"r3.devices","Manage your connected devices.":"r3.manage_devices","Payments & finance":"r3.payments_finance","Set payments, tax and invoices.":"r3.set_payments_tax","Web site & social links":"r3.website_social","Shown to guests on your digital menu.":"r3.shown_guests_menu","Google / Maps":"r3.google_maps","Save changes":"r3.save_changes","TABLE QR":"r3.table_qr","Choose your QR design":"r3.choose_qr_design","Choose QR design":"r3.choose_qr_design_aria","Pick one of 10 print-ready designs. Your table link stays exactly the same.":"r3.qr_pick_design","Preparing 10 designs…":"r3.preparing_designs","Download this design":"r3.download_design","Choose design & download":"r3.choose_design_download","Choose from 10 branded restaurant templates before downloading.":"r3.choose_templates_help","preview":"r3.preview","QR code":"r3.qr_code","QR Code for":"r3.qr_code_for","Classic White":"r3.qr_classic_white","Midnight":"r3.qr_midnight","Emerald":"r3.qr_emerald","Warm Bistro":"r3.qr_warm_bistro","Ocean Blue":"r3.qr_ocean_blue","Maximum Scan":"r3.qr_max_scan","Gold Dining":"r3.qr_gold_dining","Coral Welcome":"r3.qr_coral_welcome","Table Tent":"r3.qr_table_tent","Botanical":"r3.qr_botanical","Clean, bright and easy to print.":"r3.qr_desc_classic","Premium dark table card.":"r3.qr_desc_midnight","Fresh PayMyDine green style.":"r3.qr_desc_emerald","Warm restaurant table presentation.":"r3.qr_desc_bistro","Modern blue hospitality card.":"r3.qr_desc_ocean","Black and white, no center overlay.":"r3.qr_desc_mono","Elegant dark and gold finish.":"r3.qr_desc_gold","Friendly and colourful.":"r3.qr_desc_coral","Bold header for counter or table stands.":"r3.qr_desc_tent","Soft natural restaurant style.":"r3.qr_desc_botanical","SCAN • ORDER • ENJOY":"r3.scan_order_enjoy","SCAN TO VIEW MENU":"r3.scan_menu","Point your camera at the QR code to open the menu":"r3.point_camera","Powered by":"r3.powered_by","Shifts":"r3.shifts","Previous day":"r3.previous_day","Next day":"r3.next_day","Add team member":"r3.add_member","Edit team member":"r3.edit_member","Edit member":"r3.edit_member_short","Choose date":"r3.choose_date","No team members yet":"r3.no_team","Team member":"r3.team_member","All day":"r3.all_day","Edit shift":"r3.edit_shift","Add shift":"r3.add_shift","click to edit":"r3.click_edit","click to edit/remove":"r3.click_edit_remove","Connected coverage":"r3.connected_coverage","editable shifts":"r3.editable_shifts","Visible in this card":"r3.visible_card","Already visible":"r3.already_visible","Show in this card":"r3.show_card","required for new login":"r3.required_new_login","leave blank to keep current password":"r3.keep_password","Notifications":"r3.notifications","Break (minutes)":"r3.break_minutes","Save shift":"r3.save_shift","Delete shift":"r3.delete_shift","Main Floor":"r3.main_floor","+ Member":"r3.add_member_short","Back":"r3.back","Shift actions":"r3.shift_actions","Shift KPIs":"r3.shift_kpis","Kitchen Operations update is not active on this restaurant yet.":"r3.kitchen_update_inactive","Run the latest PMD migration once. Existing restaurant data is not changed.":"r3.run_latest_migration","Scheduled today":"r3.scheduled_today","people across today’s shifts":"r3.people_today_shifts","Present now":"r3.present_now","confirmed for the active shift":"r3.confirmed_active_shift","confirm from Dashboard at shift start":"r3.confirm_dashboard_start","Missing now":"r3.missing_now","only known after team confirmation":"r3.known_after_confirmation","Month shifts":"r3.month_shifts","Scheduled days":"r3.scheduled_days","days with at least one planned shift":"r3.days_planned_shift","Active team":"r3.active_team","people available for shift planning":"r3.people_shift_planning","Kitchen":"r3.kitchen","Waiters":"r3.waiters","Cashier":"r3.cashier","Bar":"r3.bar","Other":"r3.other","hours":"r3.hours","planned shifts in":"r3.planned_shifts_in","shifts":"r3.shifts_count_word","scheduled days":"r3.scheduled_days_word","No enabled menu categories":"r3.no_enabled_menu_categories","No tables match this view.":"r3.no_tables_match"};

    function tKey(key, fallback) {
        var value = messages[key];
        return typeof value === 'string' && value.trim() ? value : fallback;
    }

    function translate(source) {
        var clean = String(source == null ? '' : source).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        if (!clean || locale === 'en') return source;

        if (window.PMDAdminI18n && typeof window.PMDAdminI18n.translate === 'function') {
            var shared = window.PMDAdminI18n.translate(clean);
            if (shared && shared !== clean) return shared;
        }

        var qrCode = clean.match(/^(.+) QR code$/);
        if (qrCode) return qrCode[1] + ' ' + tKey('r3.qr_code', 'QR code');
        var qrFor = clean.match(/^QR Code for (.+)$/);
        if (qrFor) return tKey('r3.qr_code_for', 'QR Code for') + ' ' + qrFor[1];

        var key = sourceToKey[clean];
        return key ? tKey(key, clean) : source;
    }

    function translateTextNode(node) {
        if (!node || node.nodeType !== Node.TEXT_NODE) return;
        var parent = node.parentElement;
        if (!parent || parent.closest('script,style,textarea,code,pre,[contenteditable="true"]')) return;
        var original = node.nodeValue || '';
        var clean = original.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        if (!clean) return;
        var next = translate(clean);
        if (!next || next === clean) return;
        var leading = (original.match(/^\s*/) || [''])[0];
        var trailing = (original.match(/\s*$/) || [''])[0];
        node.nodeValue = leading + next + trailing;
    }

    function translateAttributes(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
        ['title','aria-label','placeholder','data-original-title','data-title'].forEach(function (attribute) {
            if (!element.hasAttribute(attribute)) return;
            var value = element.getAttribute(attribute) || '';
            var next = translate(value);
            if (next && next !== value) element.setAttribute(attribute, next);
        });
    }

    function walk(root) {
        if (!root || locale === 'en') return;
        if (root.nodeType === Node.TEXT_NODE) {
            translateTextNode(root);
            return;
        }
        if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        var node;
        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
            else translateAttributes(node);
        }
    }

    function normalizedPath() {
        var path = String(window.location.pathname || '').replace(/\/+$/, '');
        return path || '/';
    }

    function patchShifts() {
        var path = normalizedPath();
        if (path !== '/admin/shifts' && path !== '/admin/pmdshifts') return;

        var root = document.querySelector('[data-pmd-shifts-root], .pmd-shifts-final-screen');
        if (!root) return;

        var scoped = {
            'Today':'r3.today', '+ Member':'r3.add_member_short', 'Team':'r3.team',
            'Member':'r3.member', 'Shift':'r3.shift', 'Owner':'r3.owner',
            'Name':'r3.name', 'Role':'r3.role', 'Username':'r3.username',
            'Password':'r3.password', 'Notes':'r3.notes', 'Start':'r3.start',
            'End':'r3.end', 'Break (minutes)':'r3.break_minutes', 'Cancel':'r3.cancel',
            'Kitchen':'r3.kitchen', 'Waiters':'r3.waiters', 'Cashier':'r3.cashier',
            'Bar':'r3.bar', 'Other':'r3.other'
        };
        var scopedWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        var scopedNode;
        while ((scopedNode = scopedWalker.nextNode())) {
            var scopedValue = String(scopedNode.nodeValue || '').replace(/\s+/g,' ').trim();
            if (!scoped[scopedValue]) continue;
            var scopedNext = tKey(scoped[scopedValue], scopedValue);
            if (scopedNext === scopedValue) continue;
            var scopedOriginal = scopedNode.nodeValue || '';
            scopedNode.nodeValue = (scopedOriginal.match(/^\s*/) || [''])[0] + scopedNext + (scopedOriginal.match(/\s*$/) || [''])[0];
        }

        var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        var localeTag = locale === 'tr' ? 'tr-TR' : (locale === 'de' ? 'de-DE' : 'en-US');
        document.querySelectorAll('.pmd-r2-kpi-v2401-title,.pmd-r2-kpi-v2401-description').forEach(function (node) {
            var value = String(node.textContent || '').replace(/\s+/g,' ').trim();
            var monthHours = value.match(/^([A-Za-z]+) hours$/);
            if (monthHours && monthNames.indexOf(monthHours[1]) !== -1) {
                var monthIndex = monthNames.indexOf(monthHours[1]);
                var monthLabel = new Intl.DateTimeFormat(localeTag,{month:'long'}).format(new Date(2026,monthIndex,1));
                node.textContent = monthLabel + ' ' + tKey('r3.hours','hours');
                return;
            }
            var planned = value.match(/^planned shifts in ([A-Za-z]+)$/);
            if (planned && monthNames.indexOf(planned[1]) !== -1) {
                var plannedIndex = monthNames.indexOf(planned[1]);
                var plannedMonth = new Intl.DateTimeFormat(localeTag,{month:'long'}).format(new Date(2026,plannedIndex,1));
                node.textContent = tKey('r3.planned_shifts_in','planned shifts in') + ' ' + plannedMonth;
                return;
            }
            var counts = value.match(/^(\d+) shifts · (\d+) scheduled days$/);
            if (counts) {
                node.textContent = counts[1] + ' ' + tKey('r3.shifts_count_word','shifts') + ' · ' + counts[2] + ' ' + tKey('r3.scheduled_days_word','scheduled days');
            }
        });

        // PMD_R3_SHIFTS_DATE_AUTHORITY_V11B
        // Canonical Shifts owns selected-date locale/rendering.
        // Do NOT write .pmd-shifts-final-date h2 from this legacy coverage runtime.

        document.querySelectorAll('.pmd-shifts-final-person-copy small, [data-pmd-team-panel] [data-role-label], .pmd-report-table td').forEach(function (node) {
            var value = String(node.textContent || '').trim();
            var roles = {
                'Owner': 'r3.owner',
                'Team': 'r3.team',
                'Team member': 'r3.team_member',
                'Manager': 'nav.manager',
                'Cashier': 'nav.cashier',
                'Accountant': 'nav.accountant',
                'Reservations': 'nav.reservations',
                'Waiter': 'shared.waiter'
            };
            if (roles[value] && messages[roles[value]]) node.textContent = messages[roles[value]];
        });

        document.querySelectorAll('[title]').forEach(function (node) {
            var value = String(node.getAttribute('title') || '');
            if (value.indexOf(' · click to edit/remove') !== -1) {
                node.setAttribute('title', value.replace('click to edit/remove', tKey('r3.click_edit_remove', 'click to edit/remove')));
            } else if (value.indexOf(' · click to edit') !== -1) {
                node.setAttribute('title', value.replace('click to edit', tKey('r3.click_edit', 'click to edit')));
            }
            if (/^Connected coverage · \d+ editable shifts$/.test(value)) {
                var count = (value.match(/\d+/) || ['0'])[0];
                node.setAttribute('title', tKey('r3.connected_coverage','Connected coverage') + ' · ' + count + ' ' + tKey('r3.editable_shifts','editable shifts'));
            }
        });

        document.querySelectorAll('[aria-label]').forEach(function (node) {
            var value = String(node.getAttribute('aria-label') || '');
            var match = value.match(/^Add (.+) at ([0-2]\d:[0-5]\d)$/);
            if (match) {
                node.setAttribute('aria-label', tKey('r3.add','Add') + ' ' + match[1] + ' ' + tKey('r3.at','at') + ' ' + match[2]);
            }
        });
    }

    function patchReports() {
        var path = normalizedPath();
        if (path.indexOf('/admin/reports') === -1 && path.indexOf('/admin/pmdreports') === -1) return;
        document.querySelectorAll('td,span,small').forEach(function (node) {
            if (String(node.textContent || '').trim() === 'Owner') node.textContent = tKey('r3.owner', 'Owner');
        });
    }

    function patchAnalyticsButtons() {
        if (locale !== 'tr') return;
        var path = normalizedPath();
        if (!/^\/admin\/(dashboard|dashboardlab|manager|managerlab|cashier|cashierlab|accountant|accountantlab|reservations|reservationslab)/.test(path)) return;
        document.querySelectorAll('button,[role="button"]').forEach(function (node) {
            var text = String(node.textContent || '').trim();
            if (text === 'D') node.textContent = 'G';
            else if (text === 'W') node.textContent = 'H';
            else if (text === 'M') node.textContent = 'A';
            else if (text === 'L') node.textContent = 'Ç';
            else if (text === 'B') node.textContent = 'S';
        });
    }

    function patchMenuRecovery() {
        var path = normalizedPath();
        if (path !== '/admin/menu' && path !== '/admin/pmdmenus') return;
        var root = document.querySelector('[data-pmd-menu-manager]');
        if (!root) return;
        window.setTimeout(function () {
            var live = document.querySelector('[data-pmd-menu-manager]');
            if (!live) return;
            if (window.PMDMenuRuntimeStability && typeof window.PMDMenuRuntimeStability.releaseFirstPaint === 'function') {
                try { window.PMDMenuRuntimeStability.releaseFirstPaint(); } catch (error) {}
            }
            if (live.getAttribute('data-pmd-menu-runtime-ready-v1') !== '1') {
                live.setAttribute('data-pmd-menu-runtime-ready-v1', '1');
                live.setAttribute('data-pmd-menu-runtime-ready-reason-v1', 'r3-clean-fallback');
            }
        }, 900);
    }

    function run() {
        if (!document.body) return;
        if (busy) return;
        busy = true;
        try {
            walk(document.body);
            patchShifts();
            patchReports();
            patchAnalyticsButtons();
            patchMenuRecovery();
        } finally {
            busy = false;
        }
    }

    function startObserver() {
        if (!document.body || observer) return;
        observer = new MutationObserver(function () {
            if (busy) return;
            window.requestAnimationFrame(run);
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['title','aria-label','placeholder','data-original-title','data-title']
        });
    }

    // PMD_ADMIN_DYNAMIC_CATALOGUE_AUDIT_R4
    function audit() {
        var leftovers = [];
        var seen = Object.create(null);

        function translatedValue(source) {
            var clean = String(source == null ? '' : source).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
            if (!clean || locale === 'en') return clean;

            if (window.PMDAdminI18n && typeof window.PMDAdminI18n.translate === 'function') {
                var shared = window.PMDAdminI18n.translate(clean);
                if (shared && shared !== clean) return shared;
            }

            var local = translate(clean);
            return local && local !== clean ? local : clean;
        }

        function add(source, node, kind) {
            var clean = String(source == null ? '' : source).replace(/^['"]|['"]$/g, '').replace(/\s+/g, ' ').trim();
            if (!clean || clean === 'none' || clean === 'normal') return;
            var translated = translatedValue(clean);
            if (!translated || translated === clean) return;

            var key = kind + '|' + clean + '|' + (node && node.tagName || '');
            if (seen[key]) return;
            seen[key] = true;
            leftovers.push({source: clean, translated: translated, tag: node && node.tagName || null, kind: kind});
        }

        document.querySelectorAll('body *').forEach(function (node) {
            if (node.matches('script,style,textarea,code,pre')) return;
            if (node.children.length === 0) add(node.textContent || '', node, 'text');

            ['title','aria-label','placeholder','data-original-title','data-title'].forEach(function (attribute) {
                if (node.hasAttribute(attribute)) add(node.getAttribute(attribute) || '', node, attribute);
            });

            ['::before','::after'].forEach(function (pseudo) {
                try {
                    var content = window.getComputedStyle(node, pseudo).getPropertyValue('content');
                    if (content && content !== 'none' && content !== 'normal' && content !== '""') {
                        add(content, node, pseudo);
                    }
                } catch (error) {}
            });
        });

        return {version:'4.0.0-dynamic', locale:locale, count:leftovers.length, leftovers:leftovers};
    }

    window.PMDAdminCoverageR3 = {version:'3.1.0-clean', run:run, audit:audit};

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { run(); startObserver(); }, {once:true});
    } else {
        run(); startObserver();
    }
    window.addEventListener('load', run, {once:true});
    document.addEventListener('ajaxUpdateComplete', run, true);
    document.addEventListener('ajaxPromiseDone', run, true);
})();
