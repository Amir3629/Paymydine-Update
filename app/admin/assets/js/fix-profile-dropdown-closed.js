/**
 * CRITICAL FIX: Ensure profile dropdown items are completely disabled when dropdown is CLOSED
 * This prevents buttons from being clickable when the dropdown is not visible
 */
(function() {
    'use strict';
    
    function disableProfileDropdownWhenClosed() {
        var profileDropdown = document.querySelector('.profile-dropdown-menu');
        if (!profileDropdown) return;
        
        // Check if dropdown is open (has .show class)
        var isOpen = profileDropdown.classList.contains('show');
        
        if (!isOpen) {
            // Dropdown is CLOSED - aggressively disable all interactions
            profileDropdown.style.setProperty('pointer-events', 'none', 'important');
            profileDropdown.style.setProperty('display', 'none', 'important');
            profileDropdown.style.setProperty('visibility', 'hidden', 'important');
            profileDropdown.style.setProperty('opacity', '0', 'important');
            profileDropdown.style.setProperty('z-index', '-1', 'important');
            
            // Disable all interactive elements inside
            var interactiveElements = profileDropdown.querySelectorAll('a, button, .dropdown-item, [href], [data-request], [data-bs-toggle]');
            interactiveElements.forEach(function(el) {
                el.style.setProperty('pointer-events', 'none', 'important');
                el.style.setProperty('cursor', 'default', 'important');
                el.style.setProperty('z-index', '-1', 'important');
                
                // Remove click handlers temporarily
                el.setAttribute('data-original-href', el.getAttribute('href') || '');
                el.setAttribute('href', 'javascript:void(0)');
            });
        } else {
            // Dropdown is OPEN - restore functionality
            profileDropdown.style.removeProperty('pointer-events');
            profileDropdown.style.removeProperty('display');
            profileDropdown.style.removeProperty('visibility');
            profileDropdown.style.removeProperty('opacity');
            profileDropdown.style.removeProperty('z-index');
            
            // Restore interactive elements
            var interactiveElements = profileDropdown.querySelectorAll('a, button, .dropdown-item, [href], [data-request], [data-bs-toggle]');
            interactiveElements.forEach(function(el) {
                el.style.removeProperty('pointer-events');
                el.style.removeProperty('cursor');
                el.style.removeProperty('z-index');
                
                // Restore original href
                var originalHref = el.getAttribute('data-original-href');
                if (originalHref) {
                    el.setAttribute('href', originalHref);
                    el.removeAttribute('data-original-href');
                }
            });
        }
    }
    
    // Monitor dropdown state continuously
    function startMonitoring() {
        // Check immediately
        disableProfileDropdownWhenClosed();
        
        // Monitor for class changes on the dropdown
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    disableProfileDropdownWhenClosed();
                }
            });
        });
        
        var profileDropdown = document.querySelector('.profile-dropdown-menu');
        if (profileDropdown) {
            observer.observe(profileDropdown, {
                attributes: true,
                attributeFilter: ['class']
            });
        }
        
        // Also check periodically as backup
        setInterval(disableProfileDropdownWhenClosed, 200);
    }
    
    // Start monitoring when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
        startMonitoring();
    }
    
    // Also monitor for dynamically added dropdowns
    var bodyObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.classList && node.classList.contains('profile-dropdown-menu')) {
                        setTimeout(disableProfileDropdownWhenClosed, 10);
                    } else if (node.querySelector && node.querySelector('.profile-dropdown-menu')) {
                        setTimeout(disableProfileDropdownWhenClosed, 10);
                    }
                }
            });
        });
    });
    
    bodyObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
