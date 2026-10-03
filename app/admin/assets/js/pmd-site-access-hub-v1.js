/* PMD_WORKPLACE_HUB_RUNTIME_V7 */
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

    // PMD_WORK_SESSION_KEEPALIVE_V1
    // Laravel's generic session has a 9h idle envelope. Active Admin browsers
    // ping only the tenant Site Access endpoint so shift/day absolute deadlines
    // remain the authority. The server gate logs out before this route once the
    // verified deadline has passed, so the ping can never extend that deadline.
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
    var csrf = document.querySelector('meta[name="csrf-token"]');
    var token = csrf ? String(csrf.getAttribute('content') || '') : '';
    var stopped = false;
    var codeLink = null;

    function formatCode(value) {
        var clean = String(value || '').replace(/\D+/g, '').slice(0, 6);
        if (clean.length !== 6) return 'Workplace code';
        return clean.slice(0, 3) + ' ' + clean.slice(3);
    }

    function findActionContainer() {
        return document.querySelector('.page-title-section .btn-toolbar')
            || document.querySelector('.page-title-section .page-actions')
            || document.querySelector('.page-title-section');
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
        container.appendChild(link);
        codeLink = link;
        return link;
    }

    function applyCode(payload) {
        if (!payload || !payload.ok) return;
        var link = mountCodeLink();
        if (!link) return;
        var waiting = Array.isArray(payload.pending) ? payload.pending.length : 0;
        link.textContent = formatCode(payload.workplace_code) + (waiting ? ' · ' + waiting + ' login waiting' : '');
        if (payload.code_expires_in) {
            link.title = 'Workplace Code · changes in ' + String(payload.code_expires_in) + 's'
                + (waiting ? ' · open to see QR / approve' : '');
        }
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
        }).then(applyCode).catch(function () {});
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
    heartbeat();
    refreshCode();

    window.setInterval(refreshCode, 5000);
    window.setInterval(heartbeat, 30000);

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            sessionPing();
            heartbeat();
            refreshCode();
        }
    });
})();
