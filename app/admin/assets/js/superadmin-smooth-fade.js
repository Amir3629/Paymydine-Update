/**
 * SUPERADMIN SMOOTH FADE - NO JUMPING
 * Simple fade effect that doesn't affect layout
 */

(function() {
    'use strict';
    
    // Add page-loaded class after DOM is ready (for fade-in effect)
    function addLoadedClass() {
        // Small delay to ensure page is fully rendered
        setTimeout(() => {
            document.body.classList.add('page-loaded');
        }, 50);
    }
    
    // Handle navigation with fade-out
    function initNavigation() {
        // Get all SuperAdmin navigation links
        const navLinks = document.querySelectorAll('a[href^="/superadmin/"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Skip if modifier keys (open in new tab)
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    return;
                }
                
                // Skip dropdown toggles and hash links
                if (link.hasAttribute('data-bs-toggle') || link.getAttribute('href') === '#') {
                    return;
                }
                
                const targetUrl = link.getAttribute('href');
                
                // Skip if same page
                if (targetUrl === window.location.pathname) {
                    e.preventDefault();
                    return;
                }
                
                // Prevent default
                e.preventDefault();
                
                // Add leaving class for fade-out
                document.body.classList.add('page-leaving');
                document.body.classList.remove('page-loaded');
                
                // Navigate after fade-out
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 300);
            });
        });
    }
    
    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addLoadedClass();
            initNavigation();
        });
    } else {
        addLoadedClass();
        initNavigation();
    }
    
})();

