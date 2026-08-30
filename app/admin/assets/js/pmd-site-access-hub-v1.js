/* PMD_SITE_ACCESS_HUB_RUNTIME_V4 */
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

    // Only a successful server-side Hub activation creates this non-secret
    // marker. Ordinary Admin browsers therefore make zero Site Access probes.
    if (!hasMarker()) return;

    var adminPrefix = path.indexOf('/admin/') >= 0
        ? path.slice(0, path.indexOf('/admin/') + '/admin'.length)
        : '/admin';
    var heartbeatUrl = adminPrefix + '/siteaccess/hub/heartbeat';
    var hubUrl = adminPrefix + '/siteaccess/hub';
    var csrf = document.querySelector('meta[name="csrf-token"]');
    var token = csrf ? String(csrf.getAttribute('content') || '') : '';
    var stopped = false;
    var shortcutMounted = false;

    function mountOrdersShortcut() {
        if (shortcutMounted) return;
        if (!/^\/[^/]*admin\/orders(?:\/|$)/.test(path) && !/^\/admin\/orders(?:\/|$)/.test(path)) return;
        if (document.querySelector('[data-pmd-site-access-orders-link]')) {
            shortcutMounted = true;
            return;
        }

        var container = document.querySelector('.page-title-section .btn-toolbar')
            || document.querySelector('.page-title-section .page-actions')
            || document.querySelector('.page-title-section');
        if (!container) return;

        var link = document.createElement('a');
        link.href = hubUrl;
        link.setAttribute('data-pmd-site-access-orders-link', '1');
        link.className = 'btn btn-default';
        link.style.marginLeft = '8px';
        link.textContent = 'Site Access';
        container.appendChild(link);
        shortcutMounted = true;
    }

    function heartbeat() {
        if (stopped || document.visibilityState === 'hidden') return;
        if (!token) return;

        fetch(heartbeatUrl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-CSRF-TOKEN': token,
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).then(function (response) {
            if (response.ok) return;
            if (response.status === 401 || response.status === 403) {
                stopped = true;
                clearMarker();
            }
        }).catch(function () {});
    }

    mountOrdersShortcut();
    heartbeat();
    window.setInterval(heartbeat, 30000);
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') heartbeat();
    });
})();
