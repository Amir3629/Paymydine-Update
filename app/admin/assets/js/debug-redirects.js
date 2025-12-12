/**
 * DEBUG REDIRECT ISSUES - Diagnostic Script
 * Add this to your admin panel to track redirect causes
 */

(function() {
    'use strict';
    
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
    
    // Monitor CSRF token changes - OPTIMIZED: Only check on page navigation, not continuously
    let lastCSRFToken = $('meta[name="csrf-token"]').attr('content');
    let csrfCheckInterval = null;
    
    // Only check CSRF token when page is visible and active
    function checkCSRFToken() {
        if (document.hidden) return; // Don't check when page is hidden
        const currentToken = $('meta[name="csrf-token"]').attr('content');
        if (currentToken !== lastCSRFToken) {
            console.log('🔄 CSRF TOKEN CHANGED');
            console.log('Old token:', lastCSRFToken);
            console.log('New token:', currentToken);
            lastCSRFToken = currentToken;
        }
    }
    
    // Check every 5 seconds instead of 1 second (reduced CPU by 80%)
    csrfCheckInterval = setInterval(checkCSRFToken, 5000);
    
    // Pause checking when page is hidden
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            if (csrfCheckInterval) clearInterval(csrfCheckInterval);
        } else {
            csrfCheckInterval = setInterval(checkCSRFToken, 5000);
        }
    });
    
    // Monitor session status - OPTIMIZED: Reduced frequency
    setInterval(function() {
        // Don't check if page is hidden
        if (document.hidden) return;
        
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
    }, 60000); // Check every 60 seconds instead of 30 (reduced by 50%)
    
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
    
})();
