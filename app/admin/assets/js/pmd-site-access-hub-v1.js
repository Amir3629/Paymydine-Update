/* PMD_WORKPLACE_HUB_RUNTIME_V8 */
(function () {
    'use strict';

    var MARKER = 'pmd_site_hub_marker_v1=1';
    var path = String(window.location.pathname || '');
    var adminMatch = path.match(/^\/(?:[^/]+\/)?admin(?:\/|$)/) || path.match(/^\/admin(?:\/|$)/);
    if (!adminMatch) return;

    var adminPrefix = path.indexOf('/admin/') >= 0
        ? path.slice(0, path.indexOf('/admin/') + '/admin'.length)
        : '/admin';
    var sessionPingUrl = adminPrefix + '/siteaccess/session/ping';
    var isCashierPage = path === adminPrefix + '/orders' || path.indexOf(adminPrefix + '/orders/') === 0;

    // PMD_WORK_SESSION_KEEPALIVE_V1
    function sessionPing() {
        fetch(sessionPingUrl, {
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).catch(function () {});
    }

    sessionPing();
    window.setInterval(sessionPing, 300000);

    function hasMarker() {
        return String(document.cookie || '').split(';').some(function (part) {
            return part.trim() === MARKER;
        });
    }

    function clearMarker() {
        var cookie = 'pmd_site_hub_marker_v1=; Path=/; Max-Age=0; SameSite=Lax';
        if (window.location.protocol === 'https:') cookie += '; Secure';
        document.cookie = cookie;
    }

    if (!hasMarker()) return;

    var heartbeatUrl = adminPrefix + '/siteaccess/hub/heartbeat';
    var dataUrl = adminPrefix + '/siteaccess/hub/data';
    var hubUrl = adminPrefix + '/siteaccess/hub';
    var approveUrl = adminPrefix + '/siteaccess/hub/approve';
    var declineUrl = adminPrefix + '/siteaccess/hub/decline';
    var csrf = document.querySelector('meta[name="csrf-token"]');
    var token = csrf ? String(csrf.getAttribute('content') || '') : '';
    var stopped = false;
    var codeLink = null;
    var cashierPanel = null;
    var lastPayload = null;

    function formatCode(value) {
        var clean = String(value || '').replace(/\D+/g, '').slice(0, 6);
        if (clean.length !== 6) return '--- ---';
        return clean.slice(0, 3) + ' ' + clean.slice(3);
    }

    function findActionContainer() {
        return document.querySelector('.page-title-section .btn-toolbar')
            || document.querySelector('.page-title-section .page-actions')
            || document.querySelector('.page-title-section');
    }

    function injectCashierStyles() {
        if (!isCashierPage || document.getElementById('pmd-workplace-cashier-style')) return;
        var style = document.createElement('style');
        style.id = 'pmd-workplace-cashier-style';
        style.textContent = ''
            + '.pmd-workplace-cashier{margin:0 0 14px;padding:12px 14px;border:1px solid #d9e7e2;border-radius:14px;background:#fff;box-shadow:0 8px 24px rgba(7,53,46,.06);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}'
            + '.pmd-workplace-cashier-head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}'
            + '.pmd-workplace-cashier-label{font-size:11px;font-weight:850;color:#52645f}'
            + '.pmd-workplace-cashier-code{font-size:29px;line-height:1;font-weight:950;letter-spacing:.12em;color:#063f36;font-variant-numeric:tabular-nums}'
            + '.pmd-workplace-cashier-time{font-size:10px;color:#75827f;margin-left:7px}'
            + '.pmd-workplace-cashier-state{font-size:11px;font-weight:800;color:#157f5a}'
            + '.pmd-workplace-cashier-requests{display:grid;gap:8px;margin-top:10px}'
            + '.pmd-workplace-cashier-request{display:grid;grid-template-columns:minmax(0,1fr) 66px auto;gap:10px;align-items:center;padding:9px 10px;border:1px solid #e1e9e6;border-radius:11px;background:#f9fbfa}'
            + '.pmd-workplace-cashier-request strong{display:block;font-size:12px;color:#18332e}.pmd-workplace-cashier-request small{display:block;margin-top:2px;font-size:10px;color:#7b8885}'
            + '.pmd-workplace-cashier-qr{width:62px;height:62px;padding:3px;border:1px solid #dde7e4;border-radius:8px;background:#fff;overflow:hidden}.pmd-workplace-cashier-qr svg{display:block;width:100%!important;height:100%!important}'
            + '.pmd-workplace-cashier-actions{display:flex;gap:6px}.pmd-workplace-cashier-actions button{height:32px;padding:0 9px;border-radius:8px;font-size:10px;font-weight:850;cursor:pointer}'
            + '.pmd-workplace-cashier-approve{border:1px solid #c6e8d8;background:#eef9f4;color:#126847}.pmd-workplace-cashier-decline{border:1px solid #efcbc6;background:#fff4f2;color:#992d25}'
            + '.pmd-workplace-cashier-empty{margin-top:8px;font-size:10px;color:#7b8885}'
            + '@media(max-width:760px){.pmd-workplace-cashier-request{grid-template-columns:minmax(0,1fr) auto}.pmd-workplace-cashier-qr{display:none}.pmd-workplace-cashier-code{font-size:24px}.pmd-workplace-cashier-actions{grid-column:1/-1}.pmd-workplace-cashier-actions button{flex:1}}';
        document.head.appendChild(style);
    }

    function findCashierMount() {
        var title = document.querySelector('.page-title-section');
        if (title && title.parentNode) return {parent:title.parentNode, before:title.nextSibling};
        var content = document.querySelector('.content-wrapper') || document.querySelector('main') || document.body;
        return {parent:content, before:content.firstChild};
    }

    function mountCashierPanel() {
        if (!isCashierPage) return null;
        if (cashierPanel && document.documentElement.contains(cashierPanel)) return cashierPanel;
        var existing = document.querySelector('[data-pmd-workplace-cashier]');
        if (existing) {
            cashierPanel = existing;
            return cashierPanel;
        }

        injectCashierStyles();
        var panel = document.createElement('section');
        panel.className = 'pmd-workplace-cashier';
        panel.setAttribute('data-pmd-workplace-cashier', '1');
        panel.innerHTML = ''
            + '<div class="pmd-workplace-cashier-head">'
            + '<div><div class="pmd-workplace-cashier-label">Workplace Code</div><div><strong class="pmd-workplace-cashier-code" data-pmd-cashier-code>--- ---</strong><span class="pmd-workplace-cashier-time" data-pmd-cashier-time></span></div></div>'
            + '<div class="pmd-workplace-cashier-state" data-pmd-cashier-state>Restaurant device online</div>'
            + '</div>'
            + '<div class="pmd-workplace-cashier-requests" data-pmd-cashier-requests></div>';

        var mount = findCashierMount();
        mount.parent.insertBefore(panel, mount.before || null);
        cashierPanel = panel;
        return cashierPanel;
    }

    function mountCodeLink() {
        if (codeLink && document.documentElement.contains(codeLink)) return codeLink;
        var existing = document.querySelector('[data-pmd-workplace-code-link]');
        if (existing) {
            codeLink = existing;
            return codeLink;
        }
        var container = findActionContainer();
        if (!container) return null;

        var link = document.createElement('a');
        link.href = hubUrl;
        link.setAttribute('data-pmd-workplace-code-link', '1');
        link.className = 'btn btn-default';
        link.style.marginLeft = '8px';
        link.style.fontVariantNumeric = 'tabular-nums';
        link.style.fontWeight = '800';
        link.textContent = 'Workplace code';
        link.title = 'Current restaurant Workplace Code';
        if (isCashierPage) {
            link.addEventListener('click', function (event) {
                var panel = mountCashierPanel();
                if (!panel) return;
                event.preventDefault();
                panel.scrollIntoView({behavior:'smooth', block:'nearest'});
            });
        }
        container.appendChild(link);
        codeLink = link;
        return link;
    }

    function postDecision(url, id, button) {
        if (!token || !id) return;
        if (button) button.disabled = true;
        var body = 'challenge_id=' + encodeURIComponent(String(id));
        fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-CSRF-TOKEN': token,
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: body
        }).then(function (response) {
            return response.ok ? response.json() : Promise.reject(new Error('Request failed'));
        }).then(function () {
            refreshCode();
        }).catch(function () {
            if (button) button.disabled = false;
        });
    }

    function renderCashierPanel(payload) {
        var panel = mountCashierPanel();
        if (!panel || !payload || !payload.ok) return;

        var code = panel.querySelector('[data-pmd-cashier-code]');
        var time = panel.querySelector('[data-pmd-cashier-time]');
        var requests = panel.querySelector('[data-pmd-cashier-requests]');
        if (code) code.textContent = formatCode(payload.workplace_code);
        if (time) time.textContent = payload.code_expires_in ? 'changes in ' + String(payload.code_expires_in) + 's' : '';
        if (!requests) return;

        while (requests.firstChild) requests.removeChild(requests.firstChild);
        var items = Array.isArray(payload.pending) ? payload.pending : [];
        if (!items.length) {
            var empty = document.createElement('div');
            empty.className = 'pmd-workplace-cashier-empty';
            empty.textContent = 'No login requests waiting.';
            requests.appendChild(empty);
            return;
        }

        items.forEach(function (item) {
            var row = document.createElement('div');
            row.className = 'pmd-workplace-cashier-request';

            var copy = document.createElement('div');
            var name = document.createElement('strong');
            name.textContent = String(item.staff_name || 'Team member');
            var device = document.createElement('small');
            device.textContent = String(item.device_name || 'Browser device') + ' wants to sign in';
            copy.appendChild(name);
            copy.appendChild(device);
            row.appendChild(copy);

            var qr = document.createElement('div');
            qr.className = 'pmd-workplace-cashier-qr';
            if (typeof item.qr_svg === 'string' && item.qr_svg.indexOf('<svg') >= 0) {
                qr.innerHTML = item.qr_svg;
            } else {
                qr.textContent = 'QR';
            }
            row.appendChild(qr);

            var actions = document.createElement('div');
            actions.className = 'pmd-workplace-cashier-actions';
            var approve = document.createElement('button');
            approve.type = 'button';
            approve.className = 'pmd-workplace-cashier-approve';
            approve.textContent = 'Approve';
            approve.addEventListener('click', function () {
                postDecision(approveUrl, Number(item.id || 0), approve);
            });
            var decline = document.createElement('button');
            decline.type = 'button';
            decline.className = 'pmd-workplace-cashier-decline';
            decline.textContent = 'Decline';
            decline.addEventListener('click', function () {
                postDecision(declineUrl, Number(item.id || 0), decline);
            });
            actions.appendChild(approve);
            actions.appendChild(decline);
            row.appendChild(actions);
            requests.appendChild(row);
        });
    }

    function applyCode(payload) {
        if (!payload || !payload.ok) return;
        lastPayload = payload;
        var link = mountCodeLink();
        var waiting = Array.isArray(payload.pending) ? payload.pending.length : 0;
        if (link) {
            link.textContent = formatCode(payload.workplace_code) + (waiting ? ' · ' + waiting + ' waiting' : '');
            if (payload.code_expires_in) {
                link.title = 'Workplace Code · changes in ' + String(payload.code_expires_in) + 's';
            }
        }
        if (isCashierPage) renderCashierPanel(payload);
    }

    function heartbeat() {
        if (stopped || document.visibilityState === 'hidden' || !token) return;
        fetch(heartbeatUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-CSRF-TOKEN': token,
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).then(function (response) {
            if (response.status === 401 || response.status === 403) {
                stopped = true;
                clearMarker();
                return null;
            }
            return response.ok ? response.json() : null;
        }).then(function (payload) {
            if (!payload || !payload.ok) return;
            if (lastPayload) {
                lastPayload.workplace_code = payload.workplace_code;
                lastPayload.code_expires_in = payload.code_expires_in;
                applyCode(lastPayload);
            }
        }).catch(function () {});
    }

    function refreshCode() {
        if (stopped || document.visibilityState === 'hidden') return;
        fetch(dataUrl, {
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).then(function (response) {
            if (response.status === 401 || response.status === 403) {
                stopped = true;
                clearMarker();
                return null;
            }
            return response.ok ? response.json() : null;
        }).then(applyCode).catch(function () {});
    }

    mountCodeLink();
    if (isCashierPage) mountCashierPanel();
    heartbeat();
    refreshCode();

    window.setInterval(refreshCode, 4000);
    window.setInterval(heartbeat, 30000);

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            sessionPing();
            heartbeat();
            refreshCode();
        }
    });
})();
