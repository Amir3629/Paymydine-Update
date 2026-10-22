/* PMD_KDS_SETTINGS_NOISE_GUARD_V54_debug-redirects_START */
if (/^\/admin\/kds_stations(?:\/|$)/.test(window.location.pathname)) {
  window.PMD_KDS_SETTINGS_NOISE_GUARD_V54 = window.PMD_KDS_SETTINGS_NOISE_GUARD_V54 || [];
  window.PMD_KDS_SETTINGS_NOISE_GUARD_V54.push("debug-redirects");
  console.info("[PMD] skipped debug-redirects on KDS settings page", {
    path: window.location.pathname
  });
} else {
/* PMD_KDS_SETTINGS_NOISE_GUARD_V54_debug-redirects_BODY_START */
/**
 * DEBUG REDIRECT ISSUES - Diagnostic Script
 * Add this to your admin panel to track redirect causes
 */

(function() {
    'use strict';
    
    // Wait for jQuery to be available
    var initDebugRedirects = function() {

        /*
         * PMD_R2_PERFORMANCE_SURGICAL_V2_DEBUG
         *
         * Diagnostic redirect polling is not required during normal
         * Reservations2 operation.
         */
        if (
            String(window.location.pathname || '')
                .replace(/\/+$/, '') === '/admin/reservations2'
        ) {
            console.info(
                '[PMD R2 Performance V2] Redirect debugger skipped.'
            );
            return;
        }

        // Check if jQuery is available
        var jQueryAvailable = typeof window.jQuery !== 'undefined' || typeof window.$ !== 'undefined';
        
        if (!jQueryAvailable) {
            // Wait a bit and try again
            setTimeout(initDebugRedirects, 100);
            return;
        }
        
        // Use jQuery or $ (whichever is available)
        var $ = window.jQuery || window.$;
        
        if (!$) {
            console.warn('🔍 REDIRECT DEBUGGER: jQuery not available, skipping initialization');
            return;
        }
        
        console.log('🔍 REDIRECT DEBUGGER INITIALIZED');
        
        // PMD_DEBUG_REDACTION_V2: diagnostics must never expose session or login secrets.
    function safePath(url) {
        try {
            return new URL(String(url || window.location.pathname), window.location.href).pathname;
        } catch (error) {
            return '[unknown path]';
        }
    }

    // Track all redirects and their causes
        let redirectCount = 0;
        let lastRedirectTime = null;
        let redirectCauses = [];
        
        // Monitor page redirects
        const originalLocation = window.location.href;
        
        // Track AJAX errors that cause redirects
        $(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
        const errorInfo = {
            timestamp: new Date().toISOString(),
            status: jqXHR.status,
            statusText: jqXHR.statusText,
            url: safePath(ajaxSettings && ajaxSettings.url),
            type: ajaxSettings.type
            // Never log raw AJAX response bodies: they may contain secrets.
        };
        
        console.error('🚨 AJAX ERROR DETECTED:', errorInfo);
        
        // Check for common redirect causes
        if (jqXHR.status === 401) {
            console.error('❌ CAUSE: Session expired (401 Unauthorized)');
            redirectCauses.push('Session expired');
        } else if (jqXHR.status === 403) {
            // PMD_DEVICE_DEBUG_AUTH_STATUS_V144
            // 403 is NOT proof of an expired CSRF token; it can mean access
            // denied or an unauthenticated admin user in the tenant session.
            console.error('Admin request forbidden (403): inspect login/session and permissions; CSRF is not proven.');
            redirectCauses.push('Admin request forbidden');
        } else if (jqXHR.status === 419) {
            console.error('❌ CAUSE: CSRF token mismatch (419)');
            redirectCauses.push('CSRF token mismatch');
        }
    });
    
    // Monitor page unload events
    window.addEventListener('beforeunload', function(e) {
        console.log('🔄 PAGE UNLOADING - Possible redirect detected');
        redirectCount++;
        lastRedirectTime = new Date().toISOString();
    });
    
    // Monitor page load events
    window.addEventListener('load', function() {
        if (redirectCount > 0) {
            console.log('📍 REDIRECT DETECTED!');
            console.log('Redirect count:', redirectCount);
            console.log('Last redirect time:', lastRedirectTime);
            console.log('Possible causes:', redirectCauses);
            
            // Show user-friendly message
            if (redirectCauses.length > 0) {
                const cause = redirectCauses[redirectCauses.length - 1];
                console.log('🎯 MOST LIKELY CAUSE:', cause);
                
                // Display notification to user
                if (typeof $.ti !== 'undefined' && $.ti.flashMessage) {
                    $.ti.flashMessage({
                        class: 'info',
                        text: 'Debug: Redirect caused by ' + cause,
                        allowDismiss: true
                    });
                }
            }
        }
    });
    
    // Monitor CSRF token changes
    let lastCSRFToken = $('meta[name="csrf-token"]').attr('content');
    setInterval(function() {
        const currentToken = $('meta[name="csrf-token"]').attr('content');
        if (currentToken !== lastCSRFToken) {
            console.log('🔄 CSRF TOKEN CHANGED');
            // Never print CSRF token values to the browser console.
            lastCSRFToken = currentToken;
        }
    }, 1000);
    
    // PMD_ADMIN_DEBUG_NO_BACKGROUND_AUTH_PROBE_V144
    // This diagnostic HEAD /admin/dashboard poll was triggering its own 403s
    // and misdiagnosing role/tenant denials as CSRF. Disabled by default for
    // all admin workspaces, including Devices. Opt-in for live debugging only.
    if (window.PMD_ENABLE_ADMIN_SESSION_POLL === true) {
        setInterval(function() {
            $.ajax({
                url: '/admin/dashboard',
                type: 'HEAD',
                success: function() {
                    console.info('[PayMyDine diagnostics] Admin HEAD probe succeeded.');
                },
                error: function(xhr) {
                    console.warn('[PayMyDine diagnostics] Admin HEAD probe failed:', Number(xhr.status || 0));
                }
            });
        }, 30000);
    }
    
    // Track form submissions that might cause redirects
    $('form').on('submit', function(e) {
        console.log('📝 FORM SUBMISSION:', safePath($(this).attr('action') || ''));
        console.log('Form field count (values redacted):', this.elements ? this.elements.length : 0);
    });
    
        // Track button clicks that might cause redirects
        $('button[type="submit"], input[type="submit"]').on('click', function(e) {
            console.log('🔘 SUBMIT BUTTON CLICKED:', $(this).attr('name') || 'Unknown button');
        });
        
        console.log('✅ Redirect debugger is now active. Watch the console for redirect causes.');
    }
    
    // Start initialization when DOM is ready or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDebugRedirects);
    } else {
        // DOM already loaded, but jQuery might not be
        initDebugRedirects();
    }
    
})();

/* PMD_KDS_SETTINGS_NOISE_GUARD_V54_debug-redirects_END */
}
