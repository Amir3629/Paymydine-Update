/* PMD_WORKPLACE_HUB_RUNTIME_V10 */
(function () {
    'use strict';

    var path = String(window.location.pathname || '');
    if (path.indexOf('/admin') < 0) return;

    var adminPrefix = path.indexOf('/admin/') >= 0
        ? path.slice(0, path.indexOf('/admin/') + '/admin'.length)
        : '/admin';

    var authorityPage = path === adminPrefix + '/orders'
        || path.indexOf(adminPrefix + '/orders/') === 0
        || path === adminPrefix + '/ownerdashboard'
        || path.indexOf(adminPrefix + '/ownerdashboard/') === 0;

    var sessionPingUrl = adminPrefix + '/siteaccess/session/ping';
    var heartbeatUrl = adminPrefix + '/siteaccess/hub/heartbeat';
    var dataUrl = adminPrefix + '/siteaccess/hub/data';
    var approveUrl = adminPrefix + '/siteaccess/hub/approve';
    var declineUrl = adminPrefix + '/siteaccess/hub/decline';
    var markerName = 'pmd_site_hub_marker_v1';
    var csrfNode = document.querySelector('meta[name="csrf-token"]');
    var csrf = csrfNode ? String(csrfNode.getAttribute('content') || '') : '';
    var stopped = false;
    var launcher = null;
    var sheet = null;
    var badge = null;
    var open = false;

    function hasMarker() {
        return String(document.cookie || '').split(';').some(function (entry) {
            return entry.trim().indexOf(markerName + '=1') === 0;
        });
    }

    function clearMarker() {
        var cookie = markerName + '=; Path=/; Max-Age=0; SameSite=Lax';
        if (window.location.protocol === 'https:') cookie += '; Secure';
        document.cookie = cookie;
    }

    function pingSession() {
        fetch(sessionPingUrl, {
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).catch(function () {});
    }

    pingSession();
    window.setInterval(pingSession, 300000);

    if (!authorityPage || !hasMarker()) return;

    function formatCode(value) {
        var clean = String(value || '').replace(/\D+/g, '').slice(0, 6);
        return clean.length === 6
            ? clean.slice(0, 3) + ' ' + clean.slice(3)
            : '--- ---';
    }

    function installStyle() {
        if (document.getElementById('pmd-workplace-v10-style')) return;
        var style = document.createElement('style');
        style.id = 'pmd-workplace-v10-style';
        style.textContent = ''
            + '.pmd-wa10-fab{position:fixed;right:18px;bottom:18px;z-index:1060;width:52px;height:52px;border:0;border-radius:16px;background:#063f36;color:#fff;box-shadow:0 14px 34px rgba(3,45,39,.27);display:grid;place-items:center;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease}.pmd-wa10-fab:hover{transform:translateY(-2px);box-shadow:0 18px 40px rgba(3,45,39,.32)}.pmd-wa10-fab svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}'
            + '.pmd-wa10-badge{position:absolute;right:-4px;top:-4px;min-width:21px;height:21px;padding:0 5px;border:3px solid #fff;border-radius:999px;background:#bd3d33;color:#fff;font:800 10px/15px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.pmd-wa10-badge[hidden]{display:none}'
            + '.pmd-wa10-sheet{position:fixed;right:18px;bottom:80px;z-index:1059;width:min(390px,calc(100vw - 28px));max-height:min(620px,calc(100vh - 105px));overflow:hidden;border:1px solid #dce7e4;border-radius:19px;background:#fff;box-shadow:0 24px 70px rgba(5,42,36,.22);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#152d28;opacity:0;transform:translateY(9px) scale(.985);pointer-events:none;transition:opacity .17s ease,transform .17s ease}.pmd-wa10-sheet.is-open{opacity:1;transform:none;pointer-events:auto}'
            + '.pmd-wa10-head{display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-bottom:1px solid #e7edeb}.pmd-wa10-title{font-size:13px;font-weight:900}.pmd-wa10-close{width:34px;height:34px;border:0;border-radius:10px;background:#f3f7f5;color:#50645f;font-size:20px;cursor:pointer}.pmd-wa10-body{max-height:540px;padding:13px 14px 15px;overflow:auto}.pmd-wa10-hint{margin-bottom:10px;color:#71807c;font-size:10px;line-height:1.45}.pmd-wa10-list{display:grid;gap:9px}.pmd-wa10-empty{padding:22px 8px;text-align:center;color:#788682;font-size:11px}'
            + '.pmd-wa10-request{padding:11px;border:1px solid #e0e9e6;border-radius:14px;background:#fbfcfc}.pmd-wa10-request-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.pmd-wa10-name{min-width:0}.pmd-wa10-name strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pmd-wa10-name small{display:block;margin-top:3px;color:#7a8884;font-size:10px}.pmd-wa10-code-label{margin-top:10px;color:#74817e;font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.08em}.pmd-wa10-code{margin-top:2px;color:#063f36;font-size:28px;line-height:1.05;font-weight:950;letter-spacing:.13em;font-variant-numeric:tabular-nums}.pmd-wa10-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.pmd-wa10-actions button{height:35px;border-radius:9px;font:850 10px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}.pmd-wa10-approve{border:1px solid #bee0d0;background:#edf8f3;color:#126847}.pmd-wa10-decline{border:1px solid #efcbc6;background:#fff3f2;color:#962f27}'
            + '@media(max-width:760px){.pmd-wa10-fab{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));width:50px;height:50px}.pmd-wa10-sheet{right:0;bottom:0;width:100%;max-height:min(72vh,650px);border-radius:20px 20px 0 0;padding-bottom:env(safe-area-inset-bottom);transform:translateY(22px)}.pmd-wa10-sheet.is-open{transform:none}.pmd-wa10-code{font-size:25px}}';
        document.head.appendChild(style);
    }

    function icon() {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M19 8v6M16 11h6"/></svg>';
    }

    function mount() {
        if (launcher && document.documentElement.contains(launcher)) return;
        installStyle();

        launcher = document.createElement('button');
        launcher.type = 'button';
        launcher.className = 'pmd-wa10-fab';
        launcher.setAttribute('aria-label', 'Team sign-in approvals');
        launcher.setAttribute('aria-expanded', 'false');
        launcher.innerHTML = icon() + '<span class="pmd-wa10-badge" hidden>0</span>';
        badge = launcher.querySelector('.pmd-wa10-badge');

        sheet = document.createElement('section');
        sheet.className = 'pmd-wa10-sheet';
        sheet.setAttribute('aria-hidden', 'true');
        sheet.innerHTML = ''
            + '<div class="pmd-wa10-head"><div class="pmd-wa10-title">Team sign-in</div><button type="button" class="pmd-wa10-close" aria-label="Close">×</button></div>'
            + '<div class="pmd-wa10-body"><div class="pmd-wa10-hint">The team member sees the same 6-digit number on their login screen. Match it, then approve.</div><div class="pmd-wa10-list" data-pmd-wa10-list><div class="pmd-wa10-empty">No one is waiting.</div></div></div>';

        document.body.appendChild(sheet);
        document.body.appendChild(launcher);

        launcher.addEventListener('click', function () {
            open = !open;
            launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
            sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
            sheet.classList.toggle('is-open', open);
            if (open) refresh();
        });
        sheet.querySelector('.pmd-wa10-close').addEventListener('click', function () {
            open = false;
            launcher.setAttribute('aria-expanded', 'false');
            sheet.setAttribute('aria-hidden', 'true');
            sheet.classList.remove('is-open');
        });
    }

    function setBadge(count) {
        if (!badge) return;
        var value = Math.max(0, Number(count || 0));
        badge.hidden = value < 1;
        badge.textContent = value > 9 ? '9+' : String(value);
    }

    function decide(url, id, button) {
        if (!csrf || !id) return;
        button.disabled = true;
        fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-CSRF-TOKEN': csrf,
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: 'challenge_id=' + encodeURIComponent(String(id))
        }).then(function (response) {
            if (!response.ok) throw new Error('Request failed');
            return response.json();
        }).then(refresh).catch(function () {
            button.disabled = false;
        });
    }

    function render(data) {
        if (!data || !data.ok) return;
        mount();
        var list = sheet ? sheet.querySelector('[data-pmd-wa10-list]') : null;
        var items = Array.isArray(data.pending) ? data.pending : [];
        setBadge(items.length);
        if (!list) return;

        while (list.firstChild) list.removeChild(list.firstChild);
        if (!items.length) {
            var empty = document.createElement('div');
            empty.className = 'pmd-wa10-empty';
            empty.textContent = 'No one is waiting.';
            list.appendChild(empty);
            return;
        }

        items.forEach(function (item) {
            var row = document.createElement('article');
            row.className = 'pmd-wa10-request';

            var top = document.createElement('div');
            top.className = 'pmd-wa10-request-top';
            var nameWrap = document.createElement('div');
            nameWrap.className = 'pmd-wa10-name';
            var name = document.createElement('strong');
            name.textContent = String(item.staff_name || 'Team member');
            var device = document.createElement('small');
            device.textContent = String(item.device_name || 'Browser device') + ' wants to sign in';
            nameWrap.appendChild(name);
            nameWrap.appendChild(device);
            top.appendChild(nameWrap);
            row.appendChild(top);

            var label = document.createElement('div');
            label.className = 'pmd-wa10-code-label';
            label.textContent = 'MATCH LOGIN CODE';
            row.appendChild(label);

            var code = document.createElement('div');
            code.className = 'pmd-wa10-code';
            code.textContent = formatCode(item.request_code);
            row.appendChild(code);

            var actions = document.createElement('div');
            actions.className = 'pmd-wa10-actions';

            var approve = document.createElement('button');
            approve.type = 'button';
            approve.className = 'pmd-wa10-approve';
            approve.textContent = 'Approve';
            approve.addEventListener('click', function () {
                decide(approveUrl, Number(item.id || 0), approve);
            });

            var decline = document.createElement('button');
            decline.type = 'button';
            decline.className = 'pmd-wa10-decline';
            decline.textContent = 'Decline';
            decline.addEventListener('click', function () {
                decide(declineUrl, Number(item.id || 0), decline);
            });

            actions.appendChild(approve);
            actions.appendChild(decline);
            row.appendChild(actions);
            list.appendChild(row);
        });
    }

    function refresh() {
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
                if (launcher) launcher.remove();
                if (sheet) sheet.remove();
                return null;
            }
            return response.ok ? response.json() : null;
        }).then(function (data) {
            if (data && data.ok) render(data);
        }).catch(function () {});
    }

    function heartbeat() {
        if (stopped || !csrf || document.visibilityState === 'hidden') return;
        fetch(heartbeatUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-CSRF-TOKEN': csrf,
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).then(function (response) {
            if (response.status === 401 || response.status === 403) {
                stopped = true;
                clearMarker();
                if (launcher) launcher.remove();
                if (sheet) sheet.remove();
            }
        }).catch(function () {});
    }

    mount();
    refresh();
    heartbeat();
    window.setInterval(refresh, 2500);
    window.setInterval(heartbeat, 30000);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            refresh();
            heartbeat();
        }
    });
})();
