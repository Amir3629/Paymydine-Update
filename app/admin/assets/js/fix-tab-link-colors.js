/**
 * FIX TAB LINK COLORS - Force dark blue instead of green
 * This script ensures tab navigation links are always dark blue
 */

(function() {
    'use strict';
    
    const DARK_BLUE = '#364a63';
    const DARK_BLUE_RGB = 'rgb(54, 74, 99)';
    
    function fixTabLinkColors() {
        // Find all tab links
        const tabLinks = document.querySelectorAll('.form-nav.nav-tabs .nav-link, .nav-tabs .nav-link, a.nav-link[data-bs-toggle="tab"], a.nav-link[role="tab"]');
        
        tabLinks.forEach(link => {
            const isActive = link.classList.contains('active');
            
            // Force dark blue text color for active tabs
            if (isActive) {
                link.style.setProperty('color', DARK_BLUE_RGB, 'important');
            }
            
            // Force dark blue border-bottom color ONLY for active tabs
            if (isActive) {
                link.style.setProperty('border-bottom', `3px solid ${DARK_BLUE_RGB}`, 'important');
                link.style.setProperty('border-bottom-color', DARK_BLUE_RGB, 'important');
                link.style.setProperty('border-color', DARK_BLUE_RGB, 'important');
            } else {
                // Non-active tabs: transparent border
                link.style.setProperty('border-bottom', '3px solid transparent', 'important');
                link.style.setProperty('border-bottom-color', 'transparent', 'important');
                link.style.setProperty('border-color', 'transparent', 'important');
            }
            
            // Remove any green colors from computed styles
            const computedStyle = window.getComputedStyle(link);
            if (computedStyle.color.includes('rgb(8, 129, 94)') || 
                computedStyle.color.includes('#08815e') ||
                computedStyle.color.includes('rgb(11, 184, 122)') ||
                computedStyle.color.includes('#0bb87a')) {
                if (isActive) {
                    link.style.setProperty('color', DARK_BLUE_RGB, 'important');
                }
            }
            
            // Check border colors - only fix if active
            if (isActive) {
                if (computedStyle.borderBottomColor.includes('rgb(8, 129, 94)') || 
                    computedStyle.borderBottomColor.includes('#08815e') ||
                    computedStyle.borderColor.includes('rgb(8, 129, 94)') ||
                    computedStyle.borderColor.includes('#08815e')) {
                    link.style.setProperty('border-bottom-color', DARK_BLUE_RGB, 'important');
                    link.style.setProperty('border-color', DARK_BLUE_RGB, 'important');
                }
            }
        });
    }
    
    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixTabLinkColors);
    } else {
        fixTabLinkColors();
    }
    
    // Run after a short delay to catch dynamically loaded content
    setTimeout(fixTabLinkColors, 100);
    setTimeout(fixTabLinkColors, 500);
    setTimeout(fixTabLinkColors, 1000);
    
    // Watch for new tab links being added
    const observer = new MutationObserver(function(mutations) {
        let shouldFix = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && (node.classList.contains('nav-link') || node.querySelector('.nav-link'))) {
                            shouldFix = true;
                        }
                    }
                });
            }
        });
        if (shouldFix) {
            setTimeout(fixTabLinkColors, 50);
        }
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Also fix when tab is clicked
    document.addEventListener('click', function(e) {
        if (e.target && (e.target.classList.contains('nav-link') || e.target.closest('.nav-link'))) {
            setTimeout(fixTabLinkColors, 50);
            setTimeout(fixTabLinkColors, 150);
            setTimeout(fixTabLinkColors, 300);
        }
    });
    
    // Fix when Bootstrap tab is shown (after active class is added)
    document.addEventListener('shown.bs.tab', function(e) {
        setTimeout(fixTabLinkColors, 10);
        setTimeout(fixTabLinkColors, 50);
    });
    
    // Fix when Bootstrap tab is being shown (during transition)
    document.addEventListener('show.bs.tab', function(e) {
        setTimeout(fixTabLinkColors, 1);
        setTimeout(fixTabLinkColors, 50);
    });
    
    console.log('✅ Tab link color fix initialized - forcing dark blue (#364a63)');
})();
