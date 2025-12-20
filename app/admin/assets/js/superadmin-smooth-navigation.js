/**
 * SUPERADMIN SMOOTH NAVIGATION
 * Adds fade-out effect before page navigation
 * Simple and lightweight - works with fixed positioning
 */

(function() {
    'use strict';
    
    // Wait for DOM to be ready
    function init() {
        // Get all internal navigation links
        const navLinks = document.querySelectorAll('a[href^="/superadmin/"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Skip if opening in new tab
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    return;
                }
                
                // Skip if it's a dropdown toggle or has special attributes
                if (link.hasAttribute('data-bs-toggle') || link.getAttribute('href') === '#') {
                    return;
                }
                
                const targetUrl = link.getAttribute('href');
                
                // Skip if same page
                if (targetUrl === window.location.pathname) {
                    return;
                }
                
                // Prevent default navigation
                e.preventDefault();
                
                // Add leaving class for fade-out animation
                document.body.classList.add('page-leaving');
                
                // Lock all fixed containers to prevent any movement
                const fixedElements = ['.nk-wrap', '.nk-header', '.nk-sidebar'];
                fixedElements.forEach(selector => {
                    const element = document.querySelector(selector);
                    if (element) {
                        element.style.transition = 'none';
                        element.style.animation = 'none';
                        element.style.transform = 'none';
                    }
                });
                
                // Navigate after fade-out (250ms - shorter for snappier feel)
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 250);
            });
        });
        
        console.log('✅ Smooth navigation initialized');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();

