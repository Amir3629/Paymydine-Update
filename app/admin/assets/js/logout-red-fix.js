/**
 * Logout Icon Red Color Fix
 * Directly sets the logout icon color to red
 */
(function() {
    'use strict';
    
    function makeLogoutRed() {
        // Find all logout items
        const logoutItems = document.querySelectorAll('a.dropdown-item.text-danger[href*="logout"], .dropdown-item.text-danger[href*="logout"]');
        
        logoutItems.forEach(function(item) {
            // Set the link color to red
            item.style.color = '#dc3545';
            
            // Find and set icon color to red
            const icons = item.querySelectorAll('i, .fa, .fa-power-off');
            icons.forEach(function(icon) {
                icon.style.color = '#dc3545';
            });
        });
    }
    
    // Run immediately
    makeLogoutRed();
    
    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', makeLogoutRed);
    }
    
    // Run after a short delay to catch dynamically loaded content
    setTimeout(makeLogoutRed, 500);
    setTimeout(makeLogoutRed, 1000);
    setTimeout(makeLogoutRed, 2000);
    
    // Watch for dropdown menu opens
    document.addEventListener('click', function(e) {
        if (e.target.closest('.dropdown-toggle') || e.target.closest('[data-bs-toggle="dropdown"]')) {
            setTimeout(makeLogoutRed, 100);
        }
    });
    
    // Use MutationObserver to watch for DOM changes
    const observer = new MutationObserver(function(mutations) {
        makeLogoutRed();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();

