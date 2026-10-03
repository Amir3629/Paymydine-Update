/* PMD_WORKPLACE_HUB_RUNTIME_V11 */
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
    var launcher = null;
    var sheet = null;
    var badge = null;
    var open = false;
    var expiresAt = 0;
    var lastPayload = null;

    function formatCode(value) {
        var clean = String(value || '').replace(/\D+/g, '').slice(0, 6);
        return clean.length === 6
            ? clean.slice(0, 3) + ' ' + clean.slice(3)
            : '--- ---';
    }

    function installStyle() {
        if (document.getElementById('pmd-workplace-v11-style')) return;
        var style = document.createElement('style');
        style.id = 'pmd-workplace-v11-style';
        style.textContent = ''
            + '.pmd-wa11-fab{position:fixed;right:18px;bottom:18px;z-index:1060;width:52px;height:52px;border:0;border-radius:16px;background:#063f36;color:#fff;box-shadow:0 14px 34px rgba(3,45,39,.27);display:grid;place-items:center;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease}.pmd-wa11-fab:hover{transform:translateY(-2px);box-shadow:0 18px 40px rgba(3,45,39,.32)}.pmd-wa11-fab svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}'
            + '.pmd-wa11-badge{position:absolute;right:-4px;top:-4px;min-width:21px;height:21px;padding:0 5px;border:3px solid #fff;border-radius:999px;background:#bd3d33;color:#fff;font:800 10px/15px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.pmd-wa11-badge[hidden]{display:none}'
            + '.pmd-wa11-sheet{position:fixed;right:18px;bottom:80px;z-index:1059;width:min(410px,calc(100vw - 28px));max-height:min(680px,calc(100vh - 105px));overflow:hidden;border:1px solid #dce7e4;border-radius:19px;background:#fff;box-shadow:0 24px 70px rgba(5,42,36,.22);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#152d28;opacity:0;transform:translateY(9px) scale(.985);pointer-events:none;transition:opacity .17s ease,transform .17s ease}.pmd-wa11-sheet.is-open{opacity:1;transform:none;pointer-events:auto}'
            + '.pmd-wa11-head{display:flex;align-items:center;justify-content:space-between;padding:13px 14px;border-bottom:1px solid #e7edeb}.pmd-wa11-title{font-size:13px;font-weight:900}.pmd-wa11-close{width:34px;height:34px;border:0;border-radius:10px;background:#f3f7f5;color:#50645f;font-size:20px;cursor:pointer}.pmd-wa11-body{max-height:600px;padding:13px 14px 15px;overflow:auto;overscroll-behavior:contain}'
            + '.pmd-wa11-code-card{display:grid;grid-template-columns:minmax(0,1fr) 94px;gap:12px;align-items:center;padding:12px;border:1px solid #cee3dc;border-radius:15px;background:linear-gradient(180deg,#f5fbf9,#eef8f4)}.pmd-wa11-code-label{color:#6b7b77;font-size:9px;font-weight:900;letter-spacing:.09em}.pmd-wa11-code{margin-top:4px;color:#063f36;font-size:31px;line-height:1;font-weight:950;letter-spacing:.14em;font-variant-numeric:tabular-nums}.pmd-wa11-time{margin-top:7px;color:#778681;font-size:9px}.pmd-wa11-qr{width:94px;height:94px;padding:3px;border:1px solid #d8e5e1;border-radius:11px;background:#fff;display:grid;place-items:center;overflow:hidden}.pmd-wa11-qr svg{display:block;width:100%!important;height:100%!important}.pmd-wa11-qr-empty{color:#85928e;font-size:9px;text-align:center}'
            + '.pmd-wa11-hint{margin:9px 2px 0;color:#71807c;font-size:10px;line-height:1.45}.pmd-wa11-label{display:flex;align-items:center;justify-content:space-between;margin:14px 1px 8px;font-size:11px;font-weight:900}.pmd-wa11-online{color:#17805c;font-size:9px;font-weight:850}.pmd-wa11-list{display:grid;gap:9px}.pmd-wa11-empty{padding:18px 8px;border:1px dashed #dce6e3;border-radius:13px;text-align:center;color:#788682;font-size:10px}'
            + '.pmd-wa11-request{padding:11px;border:1px solid #e0e9e6;border-radius:14px;background:#fbfcfc}.pmd-wa11-request strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pmd-wa11-request small{display:block;margin-top:3px;color:#7a8884;font-size:10px}.pmd-wa11-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.pmd-wa11-actions button{height:35px;border-radius:9px;font:850 10px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}.pmd-wa11-approve{border:1px solid #bee0d0;background:#edf8f3;color:#126847}.pmd-wa11-decline{border:1px solid #efcbc6;background:#fff3f2;color:#962f27}'
            + '@media(max-width:760px){.pmd-wa11-fab{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));width:50px;height:50px}.pmd-wa11-sheet{right:0;bottom:0;width:100%;max-height:min(76vh,690px);border-radius:20px 20px 0 0;padding-bottom:env(safe-area-inset-bottom);transform:translateY(22px)}.pmd-wa11-sheet.is-open{transform:none}.pmd-wa11-code{font-size:27px}.pmd-wa11-code-card{grid-template-columns:minmax(0,1fr) 86px}.pmd-wa11-qr{width:86px;height:86px}}';
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
        launcher.className = 'pmd-wa11-fab';
        launcher.setAttribute('aria-label', 'Team sign-in');
        launcher.setAttribute('aria-expanded', 'false');
        launcher.innerHTML = icon() + '<span class="pmd-wa11-badge" hidden>0</span>';
        badge = launcher.querySelector('.pmd-wa11-badge');

        sheet = document.createElement('section');
        sheet.className = 'pmd-wa11-sheet';
        sheet.setAttribute('aria-hidden', 'true');
        sheet.innerHTML = ''
            + '<div class="pmd-wa11-head"><div class="pmd-wa11-title">Team sign-in</div><button type="button" class="pmd-wa11-close" aria-label="Close">×</button></div>'
            + '<div class="pmd-wa11-body">'
            + '<div class="pmd-wa11-code-card"><div><div class="pmd-wa11-code-label">WORKPLACE CODE</div><div class="pmd-wa11-code" data-pmd-wa11-code>--- ---</div><div class="pmd-wa11-time" data-pmd-wa11-time></div></div><div class="pmd-wa11-qr" data-pmd-wa11-qr><span class="pmd-wa11-qr-empty">QR</span></div></div>'
            + '<div class="pmd-wa11-hint">Team members enter this code on their PayMyDine Login, scan this QR, or you can approve their request directly below.</div>'
            + '<div class="pmd-wa11-label"><span>Login requests</span><span class="pmd-wa11-online">● ready</span></div>'
            + '<div class="pmd-wa11-list" data-pmd-wa11-list><div class="pmd-wa11-empty">No one is waiting.</div></div>'
            + '</div>';

        document.body.appendChild(sheet);
        document.body.appendChild(launcher);

        launcher.addEventListener('click', function () {
            open = !open;
            launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
            sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
            sheet.classList.toggle('is-open', open);
            if (open) refresh();
        });

        sheet.querySelector('.pmd-wa11-close').addEventListener('click', function () {
            open = false;
            launcher.setAttribute('aria-expanded', 'false');
            sheet.setAttribute('aria-hidden', 'true');
            sheet.classList.remove('is-open');
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && open) {
                open = false;
                launcher.setAttribute('aria-expanded', 'false');
                sheet.setAttribute('aria-hidden', 'true');
                sheet.classList.remove('is-open');
            }
        });
    }

    function setBadge(count) {
        if (!badge) return;
        var value = Math.max(0, Number(count || 0));
        badge.hidden = value < 1;
        badge.textContent = value > 9 ? '9+' : String(value);
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
        lastPayload = data;
        mount();

        var codeNode = sheet.querySelector('[data-pmd-wa11-code]');
        var timeNode = sheet.querySelector('[data-pmd-wa11-time]');
        var qrNode = sheet.querySelector('[data-pmd-wa11-qr]');
        var list = sheet.querySelector('[data-pmd-wa11-list]');
        var items = Array.isArray(data.pending) ? data.pending : [];

        if (codeNode) codeNode.textContent = formatCode(data.workplace_code);
        expiresAt = Date.now() + (Math.max(1, Number(data.code_expires_in || 1)) * 1000);
        updateCountdown(timeNode);

        if (qrNode) {
            qrNode.innerHTML = typeof data.qr_svg === 'string' && data.qr_svg.indexOf('<svg') >= 0
                ? data.qr_svg
                : '<span class="pmd-wa11-qr-empty">QR unavailable</span>';
        }

        setBadge(items.length);
        while (list.firstChild) list.removeChild(list.firstChild);

        if (!items.length) {
            var empty = document.createElement('div');
            empty.className = 'pmd-wa11-empty';
            empty.textContent = 'No one is waiting.';
            list.appendChild(empty);
            return;
        }

        items.forEach(function (item) {
            var row = document.createElement('article');
            row.className = 'pmd-wa11-request';

            var name = document.createElement('strong');
            name.textContent = String(item.staff_name || 'Team member');
            var device = document.createElement('small');
            device.textContent = String(item.device_name || 'Browser device') + ' wants to sign in';
            row.appendChild(name);
            row.appendChild(device);

            var actions = document.createElement('div');
            actions.className = 'pmd-wa11-actions';

            var approve = document.createElement('button');
            approve.type = 'button';
            approve.className = 'pmd-wa11-approve';
            approve.textContent = 'Approve';
            approve.addEventListener('click', function () {
                decision(approveUrl, Number(item.id || 0), approve);
            });

            var decline = document.createElement('button');
            decline.type = 'button';
            decline.className = 'pmd-wa11-decline';
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
                if (launcher) launcher.remove();
                if (sheet) sheet.remove();
                return null;
            }
            return response.ok ? response.json() : null;
        }).then(function (data) {
            if (data && data.ok) render(data);
        }).catch(function () {});
    }

    refresh();
    window.setInterval(refresh, 2500);
    window.setInterval(function () {
        if (!sheet || !lastPayload) return;
        var node = sheet.querySelector('[data-pmd-wa11-time]');
        updateCountdown(node);
        if (expiresAt > 0 && Date.now() >= expiresAt) refresh();
    }, 1000);

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') refresh();
    });
})();
