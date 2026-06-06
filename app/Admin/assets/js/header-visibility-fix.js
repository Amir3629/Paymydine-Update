/**
 * HEADER VISIBILITY FIX - SUPERADMIN
 * Ensures header never disappears when viewport height decreases
 * Runs continuously to prevent any CSS or JS from hiding the header
 */

(function() {
    'use strict';
    
    // Function to force header visibility
    function forceHeaderVisibility() {
        const header = document.querySelector('.nk-header, .nk-header.nk-header-fixed, .nk-header.is-light');
        if (!header) return;
        
        // Force visibility properties
        header.style.position = 'fixed';
        header.style.top = '0px';
        header.style.left = '230px';
        header.style.right = '0px';
        header.style.width = 'calc(100% - 230px)';
        header.style.height = '64px';
        header.style.minHeight = '64px';
        header.style.maxHeight = '64px';
        header.style.zIndex = '1031';
        header.style.display = 'flex';
        header.style.visibility = 'visible';
        header.style.opacity = '1';
        header.style.overflow = 'visible';
        header.style.clip = 'auto';
        header.style.clipPath = 'none';
        header.style.pointerEvents = 'auto';
        header.style.contain = 'none';
        header.style.isolation = 'auto';
        header.style.margin = '0';
        header.style.padding = '0';
        // CRITICAL: Force header background - never white
        header.style.background = 'linear-gradient(90deg, #516584 0%, #516584 30%, #2a3447 70%, #2a3447 100%)';
        header.style.backgroundColor = '#516584';
        header.style.backgroundImage = 'linear-gradient(90deg, #516584 0%, #516584 30%, #2a3447 70%, #2a3447 100%)';
        header.style.backgroundRepeat = 'no-repeat';
        header.style.backgroundSize = '100% 64px';
        header.style.backgroundPosition = '0 0';
        
        // Also fix header wrap
        const headerWrap = header.querySelector('.nk-header-wrap');
        if (headerWrap) {
            headerWrap.style.display = 'flex';
            headerWrap.style.visibility = 'visible';
            headerWrap.style.opacity = '1';
            headerWrap.style.height = '64px';
            headerWrap.style.minHeight = '64px';
            headerWrap.style.maxHeight = '64px';
            headerWrap.style.overflow = 'visible';
            // Force background on wrap too
            headerWrap.style.background = 'linear-gradient(90deg, #516584 0%, #516584 30%, #2a3447 70%, #2a3447 100%)';
            headerWrap.style.backgroundColor = '#516584';
        }
        
        // CRITICAL: Create backup layer to cover header area if header fails
        let backupLayer = document.getElementById('header-backup-layer');
        if (!backupLayer) {
            backupLayer = document.createElement('div');
            backupLayer.id = 'header-backup-layer';
            backupLayer.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 230px !important;
                right: 0 !important;
                width: calc(100% - 230px) !important;
                height: 64px !important;
                background: linear-gradient(90deg, #516584 0%, #516584 30%, #2a3447 70%, #2a3447 100%) !important;
                background-color: #516584 !important;
                z-index: 1030 !important;
                pointer-events: none !important;
                display: block !important;
            `;
            document.body.appendChild(backupLayer);
        } else {
            // Update backup layer position
            backupLayer.style.top = '0px';
            backupLayer.style.left = '230px';
            backupLayer.style.width = 'calc(100% - 230px)';
            backupLayer.style.height = '64px';
            backupLayer.style.background = 'linear-gradient(90deg, #516584 0%, #516584 30%, #2a3447 70%, #2a3447 100%)';
            backupLayer.style.backgroundColor = '#516584';
            backupLayer.style.zIndex = '1030';
            backupLayer.style.display = 'block';
        }
    }
    
    // Run immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', forceHeaderVisibility);
    } else {
        forceHeaderVisibility();
    }
    
    // Run on window resize (when viewport height changes)
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(forceHeaderVisibility, 50);
    });
    
    // Run periodically as a safety net (every 100ms - more frequent)
    setInterval(forceHeaderVisibility, 100);
    
    // Also run on scroll (in case scroll affects header)
    window.addEventListener('scroll', forceHeaderVisibility, true);
    
    // Run on any DOM changes that might affect header
    const headerObserver = new MutationObserver(function() {
        forceHeaderVisibility();
    });
    
    const header = document.querySelector('.nk-header, .nk-header.nk-header-fixed, .nk-header.is-light');
    if (header) {
        headerObserver.observe(header, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            childList: false,
            subtree: false
        });
    }
    
    // Run when DOM changes (MutationObserver)
    const observer = new MutationObserver(function(mutations) {
        let shouldFix = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes') {
                const target = mutation.target;
                if (target.classList.contains('nk-header') || 
                    target.closest('.nk-header')) {
                    // Check if header visibility was changed
                    const styles = window.getComputedStyle(target);
                    if (styles.display === 'none' || 
                        styles.visibility === 'hidden' || 
                        parseFloat(styles.opacity) === 0 ||
                        styles.position !== 'fixed' ||
                        parseFloat(styles.top) !== 0) {
                        shouldFix = true;
                    }
                }
            }
        });
        if (shouldFix) {
            forceHeaderVisibility();
        }
    });
    
    // Start observing
    const header = document.querySelector('.nk-header, .nk-header.nk-header-fixed, .nk-header.is-light');
    if (header) {
        observer.observe(header, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            subtree: true
        });
        
        // Also observe parent containers
        let parent = header.parentElement;
        while (parent && parent !== document.body) {
            observer.observe(parent, {
                attributes: true,
                attributeFilter: ['style', 'class']
            });
            parent = parent.parentElement;
        }
    }
    
    console.log('✅ Header visibility fix active - header will never disappear');
})();
