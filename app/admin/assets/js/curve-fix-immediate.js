/**
 * CURVE FIX - IMMEDIATE INJECTION
 * This script runs IMMEDIATELY (before DOMContentLoaded) to ensure
 * the curve fix element is always present and visible from the start
 */

(function() {
    'use strict';
    
    // Function to create and inject the curve fix element
    function injectCurveFix() {
        // Remove any existing element first
        const existing = document.querySelector('.sidebar-curve-fix');
        if (existing) {
            existing.remove();
        }
        
        // Create the element
        const curveFix = document.createElement('div');
        curveFix.className = 'sidebar-curve-fix';
        
        // Apply ALL styles inline for maximum priority
        curveFix.style.cssText = `
            position: fixed !important;
            left: 190px !important;
            top: 24px !important;
            width: 80px !important;
            height: 80px !important;
            background: #516584 !important;
            background-color: #516584 !important;
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            z-index: 1031 !important;
            pointer-events: none !important;
            transition: none !important;
            animation: none !important;
            transform: none !important;
            clip-path: polygon(0% 0%, 100% 0%, 100% 10%, 90% 20%, 80% 30%, 70% 40%, 60% 50%, 50% 60%, 40% 70%, 30% 80%, 20% 90%, 10% 100%, 0% 100%) !important;
            -webkit-clip-path: polygon(0% 0%, 100% 0%, 100% 10%, 90% 20%, 80% 30%, 70% 40%, 60% 50%, 50% 60%, 40% 70%, 30% 80%, 20% 90%, 10% 100%, 0% 100%) !important;
            will-change: auto !important;
            animation-delay: 0s !important;
            transition-delay: 0s !important;
        `;
        
        // Try to append to body immediately if it exists
        if (document.body) {
            document.body.appendChild(curveFix);
        } else {
            // If body doesn't exist yet, wait for it
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    if (document.body) {
                        document.body.appendChild(curveFix);
                    }
                }, { once: true });
            } else {
                // Fallback: try to append anyway
                setTimeout(function() {
                    if (document.body) {
                        document.body.appendChild(curveFix);
                    }
                }, 0);
            }
        }
    }
    
    // Run IMMEDIATELY - don't wait for anything
    injectCurveFix();
    
    // Also run when DOM is ready (in case body wasn't available)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectCurveFix, { once: true });
    } else {
        // DOM already ready, run again to ensure it's there
        injectCurveFix();
    }
    
    // Also run after a tiny delay to catch any edge cases
    setTimeout(injectCurveFix, 0);
    
    // Watch for any attempts to hide or modify the element
    const observer = new MutationObserver(function(mutations) {
        const curveFix = document.querySelector('.sidebar-curve-fix');
        if (curveFix) {
            // Force visibility if anything tries to hide it
            if (curveFix.style.display === 'none' || 
                curveFix.style.opacity === '0' || 
                curveFix.style.visibility === 'hidden') {
                curveFix.style.setProperty('display', 'block', 'important');
                curveFix.style.setProperty('opacity', '1', 'important');
                curveFix.style.setProperty('visibility', 'visible', 'important');
            }
        }
    });
    
    // Start observing when body is available
    function startObserving() {
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                attributes: true,
                attributeFilter: ['style', 'class'],
                subtree: true
            });
        } else {
            setTimeout(startObserving, 10);
        }
    }
    
    if (document.body) {
        startObserving();
    } else {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserving, { once: true });
        } else {
            setTimeout(startObserving, 0);
        }
    }
    
})();
