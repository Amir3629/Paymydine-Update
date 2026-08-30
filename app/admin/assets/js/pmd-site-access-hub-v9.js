/* PMD_WORKPLACE_HUB_RUNTIME_V9 */
(function () {
    'use strict';

    var MARKER = 'pmd_site_hub_marker_v1=1';
    var path = String(window.location.pathname || '');
    var adminMatch = path.match(/^\/(?:[^/]+\/)?admin(?:\/|$)/) || path.match(/^\/admin(?:\/|$)/);
    if (!adminMatch) return;

    var adminPrefix = path.indexOf('/admin/') >= 0
        ? path.slice(0, path.indexOf('/admin/') + '/admin'.length)
        : '/admin';
    var isCashier = path === adminPrefix + '/orders' || path.indexOf(adminPrefix + '/orders/') === 0;
    var sessionPingUrl = adminPrefix + '/siteaccess/session/ping';

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
    var approveUrl = adminPrefix + '/siteaccess/hub/approve';
    var declineUrl = adminPrefix + '/siteaccess/hub/decline';
    var csrfNode = document.querySelector('meta[name="csrf-token"]');
    var csrf = csrfNode ? String(csrfNode.getAttribute('content') || '') : '';
    var stopped = false;
    var payload = null;
    var launcher = null;
    var sheet = null;
    var badge = null;
    var open = false;

    function formatCode(value) {
        var clean = String(value || '').replace(/\D+/g, '').slice(0, 6);
        return clean.length === 6 ? clean.slice(0, 3) + ' ' + clean.slice(3) : '--- ---';
    }

    function style() {
        if (!isCashier || document.getElementById('pmd-workplace-float-v9-style')) return;
        var node = document.createElement('style');
        node.id = 'pmd-workplace-float-v9-style';
        node.textContent = ''
            + '.pmd-wa-fab{position:fixed;right:20px;bottom:20px;z-index:1045;width:54px;height:54px;border:0;border-radius:17px;background:#063f36;color:#fff;box-shadow:0 15px 36px rgba(2,45,39,.26);display:grid;place-items:center;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}'
            + '.pmd-wa-fab:hover{transform:translateY(-2px);box-shadow:0 18px 40px rgba(2,45,39,.32)}.pmd-wa-fab svg{width:25px;height:25px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}'
            + '.pmd-wa-fab-badge{position:absolute;right:-4px;top:-4px;min-width:21px;height:21px;padding:0 5px;border:3px solid #fff;border-radius:999px;background:#c7483b;color:#fff;font:800 10px/15px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center}.pmd-wa-fab-badge[hidden]{display:none}'
            + '.pmd-wa-float{position:fixed;right:20px;bottom:84px;z-index:1044;width:min(390px,calc(100vw - 28px));max-height:min(620px,calc(100vh - 112px));display:flex;flex-direction:column;border:1px solid #dbe7e3;border-radius:20px;background:#fff;box-shadow:0 24px 70px rgba(5,42,36,.22);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#142b27;opacity:0;transform:translateY(10px) scale(.985);pointer-events:none;transition:opacity .18s ease,transform .18s ease;overflow:hidden}'
            + '.pmd-wa-float.is-open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}.pmd-wa-float-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px;border-bottom:1px solid #e5ecea}.pmd-wa-float-title{font-size:13px;font-weight:900;color:#15362f}.pmd-wa-float-close{width:34px;height:34px;border:0;border-radius:10px;background:#f4f8f6;color:#586b66;font-size:20px;line-height:1;cursor:pointer}'
            + '.pmd-wa-float-body{padding:14px 15px 15px;overflow:auto;overscroll-behavior:contain}.pmd-wa-code-card{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 13px;border:1px solid #cfe2dc;border-radius:14px;background:#f3faf7}.pmd-wa-code-caption{font-size:10px;font-weight:850;color:#677873}.pmd-wa-code-number{margin-top:3px;font-size:27px;line-height:1;font-weight:950;letter-spacing:.12em;color:#063f36;font-variant-numeric:tabular-nums}.pmd-wa-code-time{font-size:10px;color:#74837f;text-align:right}'
            + '.pmd-wa-requests-label{display:flex;align-items:center;justify-content:space-between;margin:14px 1px 8px;font-size:11px;font-weight:900}.pmd-wa-online{color:#16815b;font-size:10px;font-weight:800}.pmd-wa-request-list{display:grid;gap:8px}.pmd-wa-request{display:grid;grid-template-columns:minmax(0,1fr) 64px;gap:9px;padding:10px;border:1px solid #e1e9e6;border-radius:13px;background:#fbfcfc}.pmd-wa-request strong{display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pmd-wa-request small{display:block;margin-top:3px;color:#788682;font-size:10px}.pmd-wa-request-qr{grid-column:2;grid-row:1/3;width:62px;height:62px;padding:3px;border:1px solid #e1e9e6;border-radius:9px;background:#fff;overflow:hidden}.pmd-wa-request-qr svg{display:block;width:100%!important;height:100%!important}.pmd-wa-request-actions{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:7px}.pmd-wa-request-actions button{height:34px;border-radius:9px;font:850 10px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}.pmd-wa-approve{border:1px solid #c5e5d6;background:#eef9f4;color:#126847}.pmd-wa-decline{border:1px solid #efcbc6;background:#fff4f2;color:#992d25}.pmd-wa-empty{padding:18px 8px;text-align:center;color:#788682;font-size:10px}'
            + '@media(max-width:760px){.pmd-wa-fab{right:max(13px,env(safe-area-inset-right));bottom:max(13px,env(safe-area-inset-bottom));width:52px;height:52px;border-radius:16px}.pmd-wa-float{right:0;bottom:0;width:100%;max-height:min(72vh,650px);border-radius:20px 20px 0 0;transform:translateY(24px);padding-bottom:env(safe-area-inset-bottom)}.pmd-wa-float.is-open{transform:translateY(0)}.pmd-wa-request{grid-template-columns:minmax(0,1fr) 58px}.pmd-wa-request-qr{width:56px;height:56px}.pmd-wa-code-number{font-size:24px}}';
        document.head.appendChild(node);
    }

    function iconSvg() {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M19 8v6M16 11h6"/></svg>';
    }

    function mount() {
        if (!isCashier) return;
        if (launcher && document.documentElement.contains(launcher)) return;
        style();

        launcher = document.createElement('button');
        launcher.type = 'button';
        launcher.className = 'pmd-wa-fab';
        launcher.setAttribute('aria-label', 'Team login approvals');
        launcher.setAttribute('aria-expanded', 'false');
        launcher.innerHTML = iconSvg() + '<span class="pmd-wa-fab-badge" hidden>0</span>';
        badge = launcher.querySelector('.pmd-wa-fab-badge');

        sheet = document.createElement('section');
        sheet.className = 'pmd-wa-float';
        sheet.setAttribute('aria-hidden', 'true');
        sheet.innerHTML = ''
            + '<div class="pmd-wa-float-head"><div class="pmd-wa-float-title">Team sign-in</div><button type="button" class="pmd-wa-float-close" aria-label="Close">×</button></div>'
            + '<div class="pmd-wa-float-body">'
            + '<div class="pmd-wa-code-card"><div><div class="pmd-wa-code-caption">WORKPLACE CODE</div><div class="pmd-wa-code-number" data-pmd-wa-code>--- ---</div></div><div class="pmd-wa-code-time" data-pmd-wa-time></div></div>'
            + '<div class="pmd-wa-requests-label"><span>Login requests</span><span class="pmd-wa-online">● online</span></div>'
            + '<div class="pmd-wa-request-list" data-pmd-wa-list><div class="pmd-wa-empty">No one is waiting.</div></div>'
            + '</div>';

        document.body.appendChild(sheet);
        document.body.appendChild(launcher);

        launcher.addEventListener('click', function () { setOpen(!open); });
        sheet.querySelector('.pmd-wa-float-close').addEventListener('click', function () { setOpen(false); });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && open) setOpen(false);
        });
    }

    function setOpen(value) {
        open = !!value;
        if (!launcher || !sheet) return;
        launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
        sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
        sheet.classList.toggle('is-open', open);
        if (open) refresh();
    }

    function setBadge(count) {
        if (!badge) return;
        count = Math.max(0, Number(count || 0));
        badge.hidden = count < 1;
        badge.textContent = count > 9 ? '9+' : String(count);
    }

    function decision(url, id, button) {
        if (!csrf || !id) return;
        if (button) button.disabled = true;
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
        }).then(function () {
            refresh();
        }).catch(function () {
            if (button) button.disabled = false;
        });
    }

    function render(data) {
        if (!data || !data.ok) return;
        payload = data;
        mount();
        if (!sheet) return;

        var code = sheet.querySelector('[data-pmd-wa-code]');
        var time = sheet.querySelector('[data-pmd-wa-time]');
        var list = sheet.querySelector('[data-pmd-wa-list]');
        var items = Array.isArray(data.pending) ? data.pending : [];

        if (code) code.textContent = formatCode(data.workplace_code);
        if (time) time.textContent = data.code_expires_in ? 'changes in\n' + String(data.code_expires_in) + 's' : '';
        setBadge(items.length);
        if (!list) return;

        while (list.firstChild) list.removeChild(list.firstChild);
        if (!items.length) {
            var empty = document.createElement('div');
            empty.className = 'pmd-wa-empty';
            empty.textContent = 'No one is waiting.';
            list.appendChild(empty);
            return;
        }

        items.forEach(function (item) {
            var row = document.createElement('article');
            row.className = 'pmd-wa-request';

            var copy = document.createElement('div');
            var name = document.createElement('strong');
            name.textContent = String(item.staff_name || 'Team member');
            var device = document.createElement('small');
            device.textContent = String(item.device_name || 'Browser device') + ' wants to sign in';
            copy.appendChild(name);
            copy.appendChild(device);
            row.appendChild(copy);

            var qr = document.createElement('div');
            qr.className = 'pmd-wa-request-qr';
            if (typeof item.qr_svg === 'string' && item.qr_svg.indexOf('<svg') >= 0) qr.innerHTML = item.qr_svg;
            else qr.textContent = 'QR';
            row.appendChild(qr);

            var actions = document.createElement('div');
            actions.className = 'pmd-wa-request-actions';
            var approve = document.createElement('button');
            approve.type = 'button';
            approve.className = 'pmd-wa-approve';
            approve.textContent = 'Approve';
            approve.addEventListener('click', function () { decision(approveUrl, Number(item.id || 0), approve); });
            var decline = document.createElement('button');
            decline.type = 'button';
            decline.className = 'pmd-wa-decline';
            decline.textContent = 'Decline';
            decline.addEventListener('click', function () { decision(declineUrl, Number(item.id || 0), decline); });
            actions.appendChild(approve);
            actions.appendChild(decline);
            row.appendChild(actions);
            list.appendChild(row);
        });
    }

    function heartbeat() {
        if (stopped || document.visibilityState === 'hidden' || !csrf) return;
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
                return null;
            }
            return response.ok ? response.json() : null;
        }).then(function (data) {
            if (!data || !data.ok || !payload) return;
            payload.workplace_code = data.workplace_code;
            payload.code_expires_in = data.code_expires_in;
            render(payload);
        }).catch(function () {});
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
                return null;
            }
            return response.ok ? response.json() : null;
        }).then(render).catch(function () {});
    }

    if (isCashier) mount();
    heartbeat();
    refresh();
    window.setInterval(refresh, 4000);
    window.setInterval(heartbeat, 30000);

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            sessionPing();
            heartbeat();
            refresh();
        }
    });
})();
