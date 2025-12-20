/**
 * PAGE-SPECIFIC FIXES
 * Targeted fixes for specific pages that can't be handled with CSS alone
 */

document.addEventListener('DOMContentLoaded', function() {
    // Only run on the statuses page
    if (document.body.classList.contains('statuses') && 
        (window.location.href.includes('/admin/statuses') || 
         window.location.pathname.endsWith('/statuses'))) {
        
        console.log('🔥 Applying SUPER AGGRESSIVE Statuses page fixes');
        
        // Function to completely obliterate an element from existence
        function nukeElement(el) {
            if (!el) return;
            
            // Apply every possible hiding technique
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('height', '0px', 'important');
            el.style.setProperty('padding', '0px', 'important');
            el.style.setProperty('margin', '0px', 'important');
            el.style.setProperty('border', 'none', 'important');
            el.style.setProperty('overflow', 'hidden', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('opacity', '0', 'important');
            el.style.setProperty('position', 'absolute', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
            el.style.setProperty('clip', 'rect(0,0,0,0)', 'important');
            el.style.setProperty('max-height', '0px', 'important');
            el.style.setProperty('min-height', '0px', 'important');
            el.style.setProperty('transform', 'scale(0)', 'important');
        }

        // SUPER AGGRESSIVE: Target EVERYTHING that could possibly create a gap
        const selectors = [
            // All toolbar related elements
            '.toolbar', 
            '.toolbar-action', 
            '.progress-indicator-container',
            '.page-title-section',
            
            // All containers that might have padding/margin
            '.content-wrapper > .container-fluid > .toolbar',
            '.content-wrapper > .container-fluid > .toolbar-action',
            '.page-content > .container-fluid > .toolbar',
            '.page-content > .container-fluid > .toolbar-action',
            '.page-content > .row-fluid > .toolbar',
            '.page-content > .row-fluid > .toolbar-action',
            
            // Any empty containers
            '.page-content > .container-fluid > div:empty',
            '.page-content > .row-fluid > div:empty',
            '.list-container > div:empty',
            
            // Any element with "toolbar" in its class name
            '[class*="toolbar"]'
        ];
        
        // Nuke all matching elements
        document.querySelectorAll(selectors.join(', ')).forEach(nukeElement);
        
        // Remove all top margins and paddings from key containers
        const containers = [
            '.page-content > .container-fluid',
            '.page-content > .row-fluid',
            '.list-container',
            '.list-container > *',
            '.table-container',
            '.table-responsive'
        ];
        
        containers.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.setProperty('margin-top', '0', 'important');
                el.style.setProperty('padding-top', '0', 'important');
            });
        });
        
        // Force the list to start at the very top
        const listContainer = document.querySelector('.list-container');
        if (listContainer) {
            listContainer.style.setProperty('margin-top', '0', 'important');
            listContainer.style.setProperty('padding-top', '0', 'important');
            
            // Also fix any parent elements
            let parent = listContainer.parentElement;
            while (parent && !parent.classList.contains('page-content')) {
                parent.style.setProperty('margin-top', '0', 'important');
                parent.style.setProperty('padding-top', '0', 'important');
                parent = parent.parentElement;
            }
        }

        // Use a MutationObserver to catch any elements added dynamically
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            // Check if this is a toolbar-related element
                            if (node.classList) {
                                const classStr = Array.from(node.classList).join(' ');
                                if (classStr.includes('toolbar') || 
                                    classStr.includes('progress') || 
                                    node.tagName === 'DIV' && node.children.length === 0) {
                                    nukeElement(node);
                                }
                                
                                // Also check for newly added elements that match our selectors
                                selectors.forEach(selector => {
                                    if (node.matches && node.matches(selector)) {
                                        nukeElement(node);
                                    }
                                    
                                    // And check children
                                    if (node.querySelectorAll) {
                                        node.querySelectorAll(selector).forEach(nukeElement);
                                    }
                                });
                            }
                        }
                    });
                }
            });
        });

        // Observe the entire document body for changes
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });

        // Run multiple delayed checks for elements that might render later
        [100, 300, 500, 1000, 2000].forEach(delay => {
            setTimeout(() => {
                // Re-run our selectors each time
                document.querySelectorAll(selectors.join(', ')).forEach(nukeElement);
                
                // Also check for any elements with minimal content
                document.querySelectorAll('.page-content *').forEach(el => {
                    if (el.children.length === 0 && el.textContent.trim() === '' && 
                        !el.matches('input, button, select, textarea, img, br, hr')) {
                        nukeElement(el);
                    }
                });
                
                // Force all containers to have no top spacing
                containers.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        el.style.setProperty('margin-top', '0', 'important');
                        el.style.setProperty('padding-top', '0', 'important');
                    });
                });
                
                console.log(`🔧 Delayed fixes for Statuses page executed (${delay}ms)`);
            }, delay);
        });
    }
});
