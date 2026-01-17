/**
 * GLOBAL BUTTON WIDTH FIX
 * 
 * This script enforces consistent button dimensions (48x48px) across ALL pages,
 * matching the orders page style.
 * 
 * This will:
 * - Find all .btn-edit buttons
 * - Force them to 48x48px with proper padding
 * - Apply styles with !important to override any CSS
 * - Watch for dynamically added buttons
 */

(function() {
    'use strict';
    
    /**
     * Apply consistent button styles
     */
    function enforceButtonDimensions() {
        const editButtons = document.querySelectorAll('.btn-edit, a.btn-edit, button.btn-edit');
        
        if (editButtons.length === 0) {
            return;
        }
        
        editButtons.forEach(button => {
            // Apply all required styles with !important
            button.style.setProperty('min-height', '48px', 'important');
            button.style.setProperty('min-width', '48px', 'important');
            button.style.setProperty('height', '48px', 'important');
            button.style.setProperty('width', '48px', 'important');
            button.style.setProperty('padding', '12px 16px', 'important');
            button.style.setProperty('display', 'inline-flex', 'important');
            button.style.setProperty('align-items', 'center', 'important');
            button.style.setProperty('justify-content', 'center', 'important');
            button.style.setProperty('pointer-events', 'auto', 'important');
            button.style.setProperty('visibility', 'visible', 'important');
            button.style.setProperty('opacity', '1', 'important');
            button.style.setProperty('position', 'relative', 'important');
            button.style.setProperty('z-index', '99999', 'important');
            button.style.setProperty('background', 'rgb(241, 244, 251)', 'important');
            button.style.setProperty('background-color', 'rgb(241, 244, 251)', 'important');
            button.style.setProperty('border', '1px solid rgb(201, 210, 227)', 'important');
            button.style.setProperty('border-radius', '10px', 'important');
            button.style.setProperty('color', 'rgb(32, 41, 56)', 'important');
            button.style.setProperty('box-shadow', 'none', 'important');
            
            // Style icons inside buttons
            const icons = button.querySelectorAll('i, svg, span.fa, .fa');
            icons.forEach(icon => {
                icon.style.setProperty('font-size', '20px', 'important');
                icon.style.setProperty('margin', '0', 'important');
                icon.style.setProperty('color', 'rgb(32, 41, 56)', 'important');
            });
        });
        
        if (editButtons.length > 0) {
            console.log(`✅ Applied consistent dimensions to ${editButtons.length} button(s)`);
        }
    }
    
    /**
     * Initialize
     */
    function init() {
        // Run immediately
        enforceButtonDimensions();
        
        // Run on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(enforceButtonDimensions, 100);
            });
        } else {
            setTimeout(enforceButtonDimensions, 100);
        }
        
        // Run on window load
        window.addEventListener('load', function() {
            setTimeout(enforceButtonDimensions, 200);
        });
        
        // Run on AJAX updates (TastyIgniter uses this event)
        document.addEventListener('ajaxUpdate', function() {
            setTimeout(enforceButtonDimensions, 100);
        });
        
        // Watch for dynamically added buttons
        const observer = new MutationObserver(function(mutations) {
            let shouldUpdate = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) {
                            // Check if added node is a button or contains buttons
                            if (node.classList && (
                                node.classList.contains('btn-edit') ||
                                node.classList.contains('btn') ||
                                node.querySelector && node.querySelector('.btn-edit')
                            )) {
                                shouldUpdate = true;
                            }
                        }
                    });
                }
                
                // Also check for attribute changes (like class changes)
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('btn-edit')) {
                        shouldUpdate = true;
                    }
                }
            });
            
            if (shouldUpdate) {
                setTimeout(enforceButtonDimensions, 50);
            }
        });
        
        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        // Periodic check (every 2 seconds) as fallback
        setInterval(enforceButtonDimensions, 2000);
    }
    
    // Start initialization
    init();
    
    // Export function for manual calls
    window.enforceButtonDimensions = enforceButtonDimensions;
    
    console.log('✅ Button width fix initialized');
})();
