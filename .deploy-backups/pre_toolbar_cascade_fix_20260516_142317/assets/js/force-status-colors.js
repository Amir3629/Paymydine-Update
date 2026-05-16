/**
 * FORCE STATUS DROPDOWN COLORS - Pure JavaScript Solution
 * This bypasses ALL CSS by directly manipulating the DOM after page load
 */

(function() {
    'use strict';
    
    console.log('🎨 Force Status Colors - Initializing...');
    
    // Function to extract RGB from any color format
    function extractRGB(colorString) {
        if (!colorString) return null;
        
        // Match rgb/rgba
        const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            return {
                r: parseInt(match[1]),
                g: parseInt(match[2]),
                b: parseInt(match[3])
            };
        }
        
        // Match hex
        if (colorString.startsWith('#')) {
            const hex = colorString.replace('#', '');
            if (hex.length === 3) {
                return {
                    r: parseInt(hex[0] + hex[0], 16),
                    g: parseInt(hex[1] + hex[1], 16),
                    b: parseInt(hex[2] + hex[2], 16)
                };
            } else if (hex.length === 6) {
                return {
                    r: parseInt(hex.substr(0, 2), 16),
                    g: parseInt(hex.substr(2, 2), 16),
                    b: parseInt(hex.substr(4, 2), 16)
                };
            }
        }
        
        return null;
    }
    
    // Main function to apply colors
    function applyColors() {
        const dropdowns = document.querySelectorAll('.list-table .dropdown-menu');
        let appliedCount = 0;
        
        dropdowns.forEach(dropdown => {
            // CRITICAL FIX: Make dropdown container SOLID WHITE to block table text behind
            dropdown.style.setProperty('background', '#ffffff', 'important');
            dropdown.style.setProperty('background-color', '#ffffff', 'important');
            dropdown.style.setProperty('z-index', '9999', 'important');
            dropdown.style.setProperty('box-shadow', '0 4px 12px rgba(0,0,0,0.2)', 'important');
            
            const items = dropdown.querySelectorAll('a[data-request="onUpdateStatus"]');
            
            items.forEach(item => {
                // Get color from border-left
                const styles = window.getComputedStyle(item);
                const borderColor = styles.borderLeftColor;
                
                const rgb = extractRGB(borderColor);
                if (!rgb) return;
                
                // Create colors with FULL opacity (no transparency)
                const normalBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
                const hoverBg = `rgba(${Math.max(rgb.r - 20, 0)}, ${Math.max(rgb.g - 20, 0)}, ${Math.max(rgb.b - 20, 0)}, 1)`;
                
                // FORCE via setProperty with important flag
                item.style.setProperty('background', normalBg, 'important');
                item.style.setProperty('background-color', normalBg, 'important');
                
                // Remove old handlers
                item.onmouseover = null;
                item.onmouseout = null;
                
                // Add new event listeners
                item.addEventListener('mouseenter', function(e) {
                    e.stopPropagation();
                    this.style.setProperty('background', hoverBg, 'important');
                    this.style.setProperty('background-color', hoverBg, 'important');
                }, true);
                
                item.addEventListener('mouseleave', function(e) {
                    e.stopPropagation();
                    this.style.setProperty('background', normalBg, 'important');
                    this.style.setProperty('background-color', normalBg, 'important');
                }, true);
                
                appliedCount++;
            });
        });
        
        if (appliedCount > 0) {
            console.log(`✅ Applied SOLID colors to ${appliedCount} status items + white dropdown background`);
        }
        
        return appliedCount;
    }
    
    // Apply immediately on load
    function init() {
        setTimeout(() => applyColors(), 100);
        setTimeout(() => applyColors(), 500);
        setTimeout(() => applyColors(), 1000);
        setTimeout(() => applyColors(), 2000);
    }
    
    // Watch for DOM changes
    function watchForChanges() {
        const observer = new MutationObserver((mutations) => {
            let shouldApply = false;
            
            for (const mutation of mutations) {
                // Check if dropdown was added or class changed
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            if (node.classList?.contains('dropdown-menu') ||
                                node.querySelector?.('.dropdown-menu')) {
                                shouldApply = true;
                                break;
                            }
                        }
                    }
                } else if (mutation.type === 'attributes' && 
                           mutation.attributeName === 'class' &&
                           mutation.target.classList.contains('show')) {
                    shouldApply = true;
                }
                
                if (shouldApply) break;
            }
            
            if (shouldApply) {
                setTimeout(() => applyColors(), 50);
                setTimeout(() => applyColors(), 200);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
        
        console.log('👁️ Watching for dropdown changes...');
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            watchForChanges();
        });
    } else {
        init();
        watchForChanges();
    }
    
    console.log('✅ Force Status Colors - Active');
})();
