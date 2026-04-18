// ============================================
// FIX MENU-GRID HOVER - Ensure Tax and Advanced buttons work
// Forces hover effect to work even if blocked by other elements
// CRITICAL: Makes menu-link cover entire menu-item and handles hover on both
// ============================================

(function() {
    'use strict';
    
    function fixMenuGridHover() {
        if (document.querySelector('.introjs-overlay') || document.querySelector('.introjs-tooltipReferenceLayer')) {
            return;
        }
        const menuGrids = document.querySelectorAll('.menu-grid, .dropdown-menu .menu-grid');
        
        menuGrids.forEach(function(menuGrid) {
            const menuItems = menuGrid.querySelectorAll('.menu-item');
            
            menuItems.forEach(function(menuItem) {
                const menuLink = menuItem.querySelector('.menu-link');
                if (!menuLink) return;
                if (menuItem.hasAttribute('data-menu-grid-fixed')) return;
                
                const icon = menuLink.querySelector('i');
                if (!icon) return;
                
                menuItem.setAttribute('data-menu-grid-fixed', '1');
                
                // CRITICAL: Ensure menu-link covers entire menu-item
                // Make menu-item a flex container so menu-link can fill it
                menuItem.style.setProperty('position', 'relative', 'important');
                menuItem.style.setProperty('display', 'flex', 'important');
                menuItem.style.setProperty('z-index', '100', 'important');
                menuItem.style.setProperty('pointer-events', 'auto', 'important');
                menuItem.style.setProperty('overflow', 'visible', 'important'); // Ensure text is not clipped
                menuItem.style.setProperty('min-height', '75px', 'important'); // Ensure minimum height
                menuItem.style.setProperty('height', 'auto', 'important'); // Allow height to grow
                
                // Make menu-link fill the entire menu-item - use relative positioning to prevent clipping
                menuLink.style.setProperty('display', 'flex', 'important');
                menuLink.style.setProperty('flex-direction', 'column', 'important');
                menuLink.style.setProperty('width', '100%', 'important');
                menuLink.style.setProperty('height', '100%', 'important');
                menuLink.style.setProperty('min-height', '75px', 'important');
                menuLink.style.setProperty('padding', '8px 4px', 'important'); // Add padding to prevent text clipping
                menuLink.style.setProperty('box-sizing', 'border-box', 'important');
                menuLink.style.setProperty('position', 'relative', 'important'); // Use relative, not absolute
                menuLink.style.setProperty('z-index', '100', 'important');
                menuLink.style.setProperty('pointer-events', 'auto', 'important');
                menuLink.style.setProperty('overflow', 'visible', 'important'); // Ensure text is not clipped
                
                // Ensure text span is visible and can wrap
                const textSpan = menuLink.querySelector('span');
                if (textSpan) {
                    textSpan.style.setProperty('overflow', 'visible', 'important');
                    textSpan.style.setProperty('white-space', 'normal', 'important');
                    textSpan.style.setProperty('word-wrap', 'break-word', 'important');
                    textSpan.style.setProperty('overflow-wrap', 'break-word', 'important');
                    textSpan.style.setProperty('line-height', '1.3', 'important');
                }
                
                // Set up icon transition - store direct reference
                icon.style.setProperty('transition', 'transform 0.3s ease-out', 'important');
                icon.style.setProperty('pointer-events', 'none', 'important');
                icon.style.setProperty('display', 'inline-block', 'important'); // Needed for transform
                
                // Function to scale icon - use direct reference and requestAnimationFrame
                function scaleIcon(scale, targetIcon) {
                    requestAnimationFrame(function() {
                        if (targetIcon) {
                            // Remove any conflicting inline styles first
                            const currentStyle = targetIcon.getAttribute('style') || '';
                            const cleanedStyle = currentStyle
                                .replace(/transform[^;]*!important/gi, '')
                                .replace(/transform[^;]*/gi, '')
                                .replace(/color[^;]*!important/gi, '')
                                .replace(/;\s*;/g, ';')
                                .replace(/^\s*;\s*|\s*;\s*$/g, '');
                            
                            if (cleanedStyle.trim()) {
                                targetIcon.setAttribute('style', cleanedStyle);
                            }
                            
                            // Now apply the transform with maximum force
                            targetIcon.style.setProperty('transform', 'scale(' + scale + ')', 'important');
                            targetIcon.style.setProperty('color', scale > 1 ? '#000000' : '#4b5563', 'important');
                            targetIcon.style.setProperty('display', 'inline-block', 'important');
                            targetIcon.style.setProperty('transition', 'transform 0.3s ease-out', 'important');
                        }
                    });
                }
                
                // Add hover handlers directly to menu-item (entire area)
                // Use capture phase to ensure we catch the event first
                menuItem.addEventListener('mouseenter', function(e) {
                    // Try multiple ways to find the icon
                    let currentIcon = this.querySelector('.menu-link i') || 
                                     this.querySelector('i') ||
                                     icon; // Fallback to stored reference
                    
                    if (currentIcon) {
                        scaleIcon(1.05, currentIcon);
                    }
                }, true); // Use capture phase
                
                menuItem.addEventListener('mouseleave', function(e) {
                    // Try multiple ways to find the icon
                    let currentIcon = this.querySelector('.menu-link i') || 
                                     this.querySelector('i') ||
                                     icon; // Fallback to stored reference
                    
                    if (currentIcon) {
                        scaleIcon(1, currentIcon);
                    }
                }, true); // Use capture phase
                
                // Also handle hover on menu-link directly (redundant but ensures it works)
                menuLink.addEventListener('mouseenter', function(e) {
                    // Try multiple ways to find the icon
                    let currentIcon = this.querySelector('i') || 
                                     icon; // Fallback to stored reference
                    
                    if (currentIcon) {
                        scaleIcon(1.05, currentIcon);
                    }
                }, true); // Use capture phase
                
                menuLink.addEventListener('mouseleave', function(e) {
                    // Try multiple ways to find the icon
                    let currentIcon = this.querySelector('i') || 
                                     icon; // Fallback to stored reference
                    
                    if (currentIcon) {
                        scaleIcon(1, currentIcon);
                    }
                }, true); // Use capture phase
            });
        });
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(fixMenuGridHover, 100); // Small delay to ensure other scripts have run
        });
    } else {
        setTimeout(fixMenuGridHover, 100);
    }
    
    var fixDebounceTimer;
    function scheduleFix() {
        clearTimeout(fixDebounceTimer);
        fixDebounceTimer = setTimeout(fixMenuGridHover, 150);
    }
    const observer = new MutationObserver(function(mutations) {
        let shouldFix = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.classList && (node.classList.contains('menu-grid') || node.querySelector('.menu-grid'))) {
                            shouldFix = true;
                        }
                    }
                });
            }
        });
        if (shouldFix) scheduleFix();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Keep observer running longer
    setTimeout(function() {
        // Don't disconnect, keep watching
    }, 30000);
    
    console.log('✅ Menu-grid hover fix initialized (aggressive mode)');
})();
