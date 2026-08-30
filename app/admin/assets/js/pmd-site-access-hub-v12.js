/* PMD_WORKPLACE_HUB_RUNTIME_V12 */
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
        || path.indexOf(adminPrefix + '/ownerdashboard/') === 0
        || path === adminPrefix + '/managerdashboard'
        || path.indexOf(adminPrefix + '/managerdashboard/') === 0;

    if (!authorityPage) return;

    var dataUrl = adminPrefix + '/cashierlab/_pmd/signin/data';
    var approveUrl = adminPrefix + '/cashierlab/_pmd/signin/approve';
    var declineUrl = adminPrefix + '/cashierlab/_pmd/signin/decline';
    var csrfNode = document.querySelector('meta[name="csrf-token"]');
    var csrf = csrfNode ? String(csrfNode.getAttribute('content') || '') : '';

    var stopped = false;
    var host = null;
    var root = null;
    var launcher = null;
    var sheet = null;
    var open = false;
    var expiresAt = 0;
    var lastPayload = null;

    function formatCode(value) {
        var clean = String(value || '').replace(/\D+/g, '').slice(0, 6);
        return clean.length === 6
            ? clean.slice(0, 3) + ' ' + clean.slice(3)
            : '--- ---';
    }

    function icon() {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M19 8v6M16 11h6"/></svg>';
    }

    function mount() {
        if (host && document.documentElement.contains(host)) return;

        host = document.createElement('div');
        host.id = 'pmd-team-signin-v12-host';
        host.style.setProperty('all', 'initial', 'important');
        host.style.setProperty('position', 'fixed', 'important');
        host.style.setProperty('right', '0', 'important');
        host.style.setProperty('bottom', '0', 'important');
        host.style.setProperty('width', '0', 'important');
        host.style.setProperty('height', '0', 'important');
        host.style.setProperty('z-index', '2147483000', 'important');

        root = host.attachShadow({mode: 'open'});
        root.innerHTML = ''
            + '<style>'
            + ':host{all:initial}'
            + '*{box-sizing:border-box}'
            + '.launcher{position:fixed;right:18px;bottom:18px;width:54px;height:54px;padding:0;border:0;border-radius:999px;background:#063f36;color:#fff;box-shadow:0 15px 34px rgba(3,45,39,.30);display:grid;place-items:center;cursor:pointer;pointer-events:auto;transition:transform .16s ease,box-shadow .16s ease}'
            + '.launcher:hover{transform:translateY(-2px);box-shadow:0 19px 40px rgba(3,45,39,.34)}.launcher:focus-visible{outline:3px solid rgba(200,155,74,.55);outline-offset:3px}.launcher svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}'
            + '.badge{position:absolute;right:-3px;top:-3px;min-width:20px;height:20px;padding:0 5px;border:3px solid #fff;border-radius:999px;background:#bd3d33;color:#fff;font:800 10px/14px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}'
            + '.sheet{position:fixed;right:18px;bottom:84px;width:min(390px,calc(100vw - 28px));max-height:min(650px,calc(100vh - 108px));overflow:hidden;border:1px solid #dce7e4;border-radius:20px;background:#fff;box-shadow:0 25px 70px rgba(5,42,36,.24);color:#152d28;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;opacity:0;transform:translateY(10px) scale(.985);pointer-events:none;transition:opacity .16s ease,transform .16s ease}'
            + '.sheet.open{opacity:1;transform:none;pointer-events:auto}.head{display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-bottom:1px solid #e7edeb}.title{font-size:13px;font-weight:900}.close{width:34px;height:34px;border:0;border-radius:11px;background:#f2f6f4;color:#536761;font:700 20px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}'
            + '.body{max-height:585px;padding:13px 14px 15px;overflow:auto;overscroll-behavior:contain}.codecard{display:grid;grid-template-columns:minmax(0,1fr) 92px;gap:12px;align-items:center;padding:13px;border:1px solid #cee3dc;border-radius:16px;background:linear-gradient(180deg,#f5fbf9,#eef8f4)}.code{color:#063f36;font-size:32px;line-height:1;font-weight:950;letter-spacing:.14em;font-variant-numeric:tabular-nums}.time{margin-top:7px;color:#7b8985;font-size:9px}.qr{width:92px;height:92px;padding:3px;border:1px solid #d8e5e1;border-radius:12px;background:#fff;display:grid;place-items:center;overflow:hidden}.qr svg{display:block;width:100%!important;height:100%!important}.qr-empty{color:#85928e;font-size:9px;text-align:center}'
            + '.hint{margin:9px 2px 13px;color:#71807c;font-size:10px;line-height:1.4}.section{margin:0 1px 8px;font-size:11px;font-weight:900}.list{display:grid;gap:9px}.request{padding:11px;border:1px solid #e0e9e6;border-radius:14px;background:#fbfcfc}.request strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.request small{display:block;margin-top:3px;color:#7a8884;font-size:10px}.actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.actions button{height:36px;border-radius:10px;font:850 10px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}.approve{border:1px solid #bee0d0;background:#edf8f3;color:#126847}.decline{border:1px solid #efcbc6;background:#fff3f2;color:#962f27}'
            + '@media(max-width:760px){.launcher{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));width:52px;height:52px}.sheet{right:0;bottom:0;width:100%;max-height:min(76vh,680px);border-radius:21px 21px 0 0;padding-bottom:env(safe-area-inset-bottom);transform:translateY(22px)}.sheet.open{transform:none}.code{font-size:28px}.codecard{grid-template-columns:minmax(0,1fr) 86px}.qr{width:86px;height:86px}}'
            + '</style>'
            + '<button type="button" class="launcher" aria-label="Team sign-in" aria-expanded="false">' + icon() + '<span class="badge">1</span></button>'
            + '<section class="sheet" aria-hidden="true">'
            + '<div class="head"><div class="title">Team sign-in</div><button type="button" class="close" aria-label="Close">×</button></div>'
            + '<div class="body">'
            + '<div class="codecard"><div><div class="code" data-code>--- ---</div><div class="time" data-time></div></div><div class="qr" data-qr><span class="qr-empty">QR</span></div></div>'
            + '<div class="hint">Use the code, scan QR, or approve below.</div>'
            + '<div class="section">Login requests</div>'
            + '<div class="list" data-list></div>'
            + '</div></section>';

        document.body.appendChild(host);
        launcher = root.querySelector('.launcher');
        sheet = root.querySelector('.sheet');

        launcher.addEventListener('click', function () {
            open = !open;
            launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
            sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
            sheet.classList.toggle('open', open);
            if (open) refresh();
        });

        root.querySelector('.close').addEventListener('click', function () {
            setOpen(false);
        });

        document.addEventListener('keydown', onKeydown);
    }

    function onKeydown(event) {
        if (event.key === 'Escape' && open) setOpen(false);
    }

    function setOpen(next) {
        open = !!next;
        if (!launcher || !sheet) return;
        launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
        sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
        sheet.classList.toggle('open', open);
    }

    function destroy() {
        document.removeEventListener('keydown', onKeydown);
        if (host) host.remove();
        host = null;
        root = null;
        launcher = null;
        sheet = null;
        open = false;
        expiresAt = 0;
        lastPayload = null;
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
            return refresh();
        }).catch(function () {
            if (button) button.disabled = false;
        });
    }

    function render(data) {
        if (!data || !data.ok) return;
        var items = Array.isArray(data.pending) ? data.pending : [];

        if (!items.length) {
            destroy();
            return;
        }

        mount();
        lastPayload = data;

        var badge = root.querySelector('.badge');
        var codeNode = root.querySelector('[data-code]');
        var timeNode = root.querySelector('[data-time]');
        var qrNode = root.querySelector('[data-qr]');
        var list = root.querySelector('[data-list]');

        badge.textContent = items.length > 9 ? '9+' : String(items.length);
        codeNode.textContent = formatCode(data.workplace_code);
        expiresAt = Date.now() + (Math.max(1, Number(data.code_expires_in || 1)) * 1000);
        updateCountdown(timeNode);

        qrNode.innerHTML = typeof data.qr_svg === 'string' && data.qr_svg.indexOf('<svg') >= 0
            ? data.qr_svg
            : '<span class="qr-empty">QR unavailable</span>';

        while (list.firstChild) list.removeChild(list.firstChild);

        items.forEach(function (item) {
            var row = document.createElement('article');
            row.className = 'request';

            var name = document.createElement('strong');
            name.textContent = String(item.staff_name || 'Team member');
            var device = document.createElement('small');
            device.textContent = String(item.device_name || 'Browser device');
            row.appendChild(name);
            row.appendChild(device);

            var actions = document.createElement('div');
            actions.className = 'actions';

            var approve = document.createElement('button');
            approve.type = 'button';
            approve.className = 'approve';
            approve.textContent = 'Approve';
            approve.addEventListener('click', function () {
                decision(approveUrl, Number(item.id || 0), approve);
            });

            var decline = document.createElement('button');
            decline.type = 'button';
            decline.className = 'decline';
            decline.textContent = 'Decline';
            decline.addEventListener('click', function () {
                decision(declineUrl, Number(item.id || 0), decline);
            });

            actions.appendChild(approve);
            actions.appendChild(decline);
            row.appendChild(actions);
            list.appendChild(row);
        });
    }

    function updateCountdown(node) {
        if (!node) return;
        var seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        node.textContent = seconds > 0 ? 'changes in ' + seconds + 's' : 'updating…';
    }

    function refresh() {
        if (stopped || document.visibilityState === 'hidden') return Promise.resolve();

        return fetch(dataUrl, {
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).then(function (response) {
            if (response.status === 401 || response.status === 403) {
                stopped = true;
                destroy();
                return null;
            }
            return response.ok ? response.json() : null;
        }).then(function (data) {
            if (data && data.ok) render(data);
        }).catch(function () {});
    }

    refresh();
    window.setInterval(refresh, 2000);
    window.setInterval(function () {
        if (!root || !lastPayload) return;
        var node = root.querySelector('[data-time]');
        updateCountdown(node);
        if (expiresAt > 0 && Date.now() >= expiresAt) refresh();
    }, 1000);

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') refresh();
    });
})();
