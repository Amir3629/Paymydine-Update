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
            url: ajaxSettings.url,
            type: ajaxSettings.type,
            responseText: jqXHR.responseText
        };
        
        console.error('🚨 AJAX ERROR DETECTED:', errorInfo);
        
        // Check for common redirect causes
        if (jqXHR.status === 401) {
            console.error('❌ CAUSE: Session expired (401 Unauthorized)');
            redirectCauses.push('Session expired');
        } else if (jqXHR.status === 403) {
            console.error('❌ CAUSE: CSRF token expired (403 Forbidden)');
            redirectCauses.push('CSRF token expired');
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
            console.log('Old token:', lastCSRFToken);
            console.log('New token:', currentToken);
            lastCSRFToken = currentToken;
        }
    }, 1000);
    
    // Monitor session status
    setInterval(function() {
        // Check if we're still authenticated
        $.ajax({
            url: '/admin/dashboard',
            type: 'HEAD',
            success: function() {
                console.log('✅ Session still valid');
            },
            error: function(xhr) {
                if (xhr.status === 401) {
                    console.error('❌ SESSION EXPIRED - This will cause redirect!');
                }
            }
        });
    }, 30000); // Check every 30 seconds
    
    // Track form submissions that might cause redirects
    $('form').on('submit', function(e) {
        console.log('📝 FORM SUBMISSION:', $(this).attr('action') || 'Unknown action');
        console.log('Form data:', $(this).serialize());
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
