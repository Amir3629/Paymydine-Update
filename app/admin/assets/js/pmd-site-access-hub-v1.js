/* PMD_WORKPLACE_HUB_RUNTIME_V5 */
(function () {
    'use strict';

    var MARKER = 'pmd_site_hub_marker_v1=1';
    var path = String(window.location.pathname || '');
    var adminMatch = path.match(/^\/(?:[^/]+\/)?admin(?:\/|$)/) || path.match(/^\/admin(?:\/|$)/);
    if (!adminMatch) return;

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

    // Only successful server-side activation creates this non-secret marker.
    // The actual workplace credential remains HttpOnly and server-validated.
    if (!hasMarker()) return;

    var adminPrefix = path.indexOf('/admin/') >= 0
        ? path.slice(0, path.indexOf('/admin/') + '/admin'.length)
        : '/admin';
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
        link.title = 'Current restaurant workplace login code';
        container.appendChild(link);
        codeLink = link;
        return link;
    }

    function applyCode(payload) {
        if (!payload || !payload.ok) return;
        var link = mountCodeLink();
        if (!link) return;
        link.textContent = formatCode(payload.workplace_code);
        if (payload.code_expires_in) {
            link.title = 'Workplace code · changes in ' + String(payload.code_expires_in) + 's';
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
            heartbeat();
            refreshCode();
        }
    });
})();
