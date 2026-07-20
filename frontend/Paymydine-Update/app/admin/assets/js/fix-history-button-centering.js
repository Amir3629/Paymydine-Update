// ============================================
// FIX HISTORY BUTTON TEXT CENTERING (OPTIMIZED)
// Removes inline styles that prevent flexbox centering
// Performance optimized - minimal overhead
// ============================================

(function() {
    'use strict';
    
    let isFixed = false;
    let debounceTimer = null;
    let observer = null;
    let checkInterval = null;
    
    function fixHistoryButton() {
        const historyLink = document.getElementById('notif-history-link');
        if (!historyLink) {
            return;
        }
        
        // Check if already correctly styled (avoid unnecessary work)
        const computedDisplay = window.getComputedStyle(historyLink).display;
        if (computedDisplay === 'inline-flex' && isFixed) {
            return;
        }
        
        // Batch all style changes to minimize reflows
        requestAnimationFrame(function() {
            // CRITICAL: Remove display: inline-block from the inline style string itself
            const currentStyle = historyLink.getAttribute('style') || '';
            if (currentStyle) {
                // Remove display: inline-block !important from the style string
                const cleanedStyle = currentStyle
                    .replace(/display\s*:\s*inline-block\s*!important/gi, '')
                    .replace(/display\s*:\s*inline-block/gi, '')
                    .replace(/;\s*;/g, ';') // Clean up double semicolons
                    .replace(/^\s*;\s*|\s*;\s*$/g, ''); // Remove leading/trailing semicolons
                
                // Set cleaned style first
                if (cleanedStyle.trim()) {
                    historyLink.setAttribute('style', cleanedStyle);
                } else {
                    historyLink.removeAttribute('style');
                }
            }
            
            // Now set our flexbox styles (these will override)
            historyLink.style.setProperty('display', 'inline-flex', 'important');
            historyLink.style.setProperty('align-items', 'center', 'important');
            historyLink.style.setProperty('justify-content', 'center', 'important');
            historyLink.style.setProperty('text-align', 'center', 'important');
            historyLink.style.setProperty('vertical-align', 'middle', 'important');
            historyLink.style.setProperty('line-height', '1', 'important');
            historyLink.style.setProperty('position', 'static', 'important');
            historyLink.style.setProperty('z-index', 'auto', 'important');
            historyLink.style.setProperty('height', '36px', 'important');
            historyLink.style.setProperty('padding', '8px 20px', 'important');
            historyLink.style.setProperty('box-sizing', 'border-box', 'important');
            historyLink.style.setProperty('text-indent', '0', 'important');
            historyLink.style.setProperty('letter-spacing', 'normal', 'important');
            historyLink.style.setProperty('margin', '0', 'important');
            
            // Ensure bottom border is visible
            historyLink.style.setProperty('border', '1px solid #c9d2e3', 'important');
            historyLink.style.setProperty('border-bottom', '1px solid #c9d2e3', 'important');
            historyLink.style.setProperty('border-bottom-width', '1px', 'important');
            historyLink.style.setProperty('border-bottom-style', 'solid', 'important');
            historyLink.style.setProperty('border-bottom-color', '#c9d2e3', 'important');
            
            isFixed = true;
        });
    }
    
    // Debounced version for observer
    function debouncedFix() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(function() {
            isFixed = false; // Reset flag to allow re-fix
            fixHistoryButton();
        }, 150); // Debounce to 150ms
    }
    
    // Optimized observer - only watch for style changes, debounced
    function setupObserver() {
        const historyLink = document.getElementById('notif-history-link');
        if (!historyLink || observer) {
            return;
        }
        
        observer = new MutationObserver(function(mutations) {
            // Only process if style attribute changed
            const hasStyleChange = mutations.some(function(mutation) {
                return mutation.type === 'attributes' && 
                       mutation.attributeName === 'style' &&
                       mutation.target.id === 'notif-history-link';
            });
            
            if (hasStyleChange) {
                isFixed = false; // Reset flag
                debouncedFix(); // Use debounced version
            }
        });
        
        observer.observe(historyLink, {
            attributes: true,
            attributeFilter: ['style'] // Only watch style attribute
        });
    }
    
    // Initial fix - run once when DOM is ready
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                fixHistoryButton();
                // Setup observer after a short delay
                setTimeout(setupObserver, 500);
            }, { once: true });
        } else {
            fixHistoryButton();
            setTimeout(setupObserver, 500);
        }
        
        // Clean up observer after 5 seconds (enough time for initial scripts)
        setTimeout(function() {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            if (checkInterval) {
                clearInterval(checkInterval);
                checkInterval = null;
            }
        }, 5000);
    }
    
    // Start initialization
    init();
})();
