// ============================================
// FIX PROFILE DROPDOWN GREEN HOVER - JavaScript override
// Removes green hover effect via JavaScript to ensure it works
// ============================================

(function() {
    'use strict';
    
    function enableScrolling() {
        const profileDropdown = document.querySelector('.profile-dropdown-menu');
        if (profileDropdown) {
            // Force scrolling to work
            profileDropdown.style.setProperty('max-height', '70vh', 'important');
            profileDropdown.style.setProperty('overflow-y', 'auto', 'important');
            profileDropdown.style.setProperty('overflow-x', 'hidden', 'important');
            profileDropdown.style.setProperty('height', 'auto', 'important');
        }
    }
    
    function styleActiveItems() {
        const profileDropdown = document.querySelector('.profile-dropdown-menu');
        if (!profileDropdown) {
            return;
        }
        
        const activeItems = profileDropdown.querySelectorAll('.dropdown-item.active');
        activeItems.forEach(function(item) {
            // Apply active state styling - gray-blue, not green
            item.style.setProperty('background', '#f3f4f6', 'important');
            item.style.setProperty('background-color', '#f3f4f6', 'important');
            item.style.setProperty('border-left', '3px solid #4a5568', 'important');
            item.style.setProperty('border-right', 'none', 'important');
            item.style.setProperty('border-top', 'none', 'important');
            item.style.setProperty('border-bottom', 'none', 'important');
            item.style.setProperty('color', '#1f2937', 'important');
            item.style.setProperty('font-weight', '600', 'important');
            
            // Style text and icon in active items
            const span = item.querySelector('span');
            const icon = item.querySelector('i');
            if (span) {
                span.style.setProperty('color', '#1f2937', 'important');
                span.style.setProperty('font-weight', '600', 'important');
            }
            if (icon) {
                icon.style.setProperty('color', '#1f2937', 'important');
            }
        });
    }
    
    function removeGreenHover() {
        const profileDropdown = document.querySelector('.profile-dropdown-menu');
        if (!profileDropdown) {
            return;
        }
        
        // Enable scrolling first
        enableScrolling();
        
        // Style active items
        styleActiveItems();
        
        const items = profileDropdown.querySelectorAll('.dropdown-item');
        items.forEach(function(item) {
            // First, remove any inline styles that block hover
            const span = item.querySelector('span');
            const icon = item.querySelector('i');
            
            // Remove inline transform styles that prevent hover
            if (span) {
                if (span.getAttribute('style') && span.getAttribute('style').includes('transform: scale(1)')) {
                    // Remove the transform from inline style
                    let style = span.getAttribute('style');
                    style = style.replace(/transform\s*:\s*scale\(1\)\s*!important/gi, '');
                    style = style.replace(/transform\s*:\s*scale\(1\)/gi, '');
                    style = style.replace(/;\s*;/g, ';').replace(/^\s*;\s*|\s*;\s*$/g, '');
                    if (style.trim()) {
                        span.setAttribute('style', style);
                    } else {
                        span.removeAttribute('style');
                    }
                }
            }
            
            if (icon) {
                if (icon.getAttribute('style') && icon.getAttribute('style').includes('transform: scale(1)')) {
                    // Remove the transform from inline style
                    let style = icon.getAttribute('style');
                    style = style.replace(/transform\s*:\s*scale\(1\)\s*!important/gi, '');
                    style = style.replace(/transform\s*:\s*scale\(1\)/gi, '');
                    style = style.replace(/;\s*;/g, ';').replace(/^\s*;\s*|\s*;\s*$/g, '');
                    if (style.trim()) {
                        icon.setAttribute('style', style);
                    } else {
                        icon.removeAttribute('style');
                    }
                }
            }
            
            // Remove ALL hover effects - only allow text scaling
            // BUT preserve active state styling if item is active
            item.addEventListener('mouseenter', function() {
                const isActive = this.classList.contains('active');
                
                // Remove all background/color effects (unless active)
                if (!isActive) {
                    this.style.setProperty('background', 'transparent', 'important');
                    this.style.setProperty('background-color', 'transparent', 'important');
                    this.style.setProperty('background-image', 'none', 'important');
                    this.style.setProperty('border', 'none', 'important');
                } else {
                    // Active item: preserve the left border and background
                    this.style.setProperty('background', '#f3f4f6', 'important');
                    this.style.setProperty('background-color', '#f3f4f6', 'important');
                    this.style.setProperty('border-left', '3px solid #4a5568', 'important');
                    this.style.setProperty('border-right', 'none', 'important');
                    this.style.setProperty('border-top', 'none', 'important');
                    this.style.setProperty('border-bottom', 'none', 'important');
                }
                
                this.style.setProperty('transform', 'none', 'important'); // NO transform on item
                this.style.setProperty('box-shadow', 'none', 'important');
                
                // Scale only the text/span elements - SMALLER and SMOOTHER
                const span = this.querySelector('span');
                const icon = this.querySelector('i');
                if (span) {
                    // Remove any existing transform from inline style first
                    let spanStyle = span.getAttribute('style') || '';
                    spanStyle = spanStyle.replace(/transform\s*:\s*[^;]+/gi, '');
                    spanStyle = spanStyle.replace(/;\s*;/g, ';').replace(/^\s*;\s*|\s*;\s*$/g, '');
                    
                    // Now set the hover transform
                    span.style.setProperty('transform', 'scale(1.05)', 'important'); // Smaller scale
                    span.style.setProperty('display', 'inline-block', 'important');
                    span.style.setProperty('transition', 'transform 0.3s ease-out', 'important'); // Smoother
                }
                if (icon) {
                    // Remove any existing transform from inline style first
                    let iconStyle = icon.getAttribute('style') || '';
                    iconStyle = iconStyle.replace(/transform\s*:\s*[^;]+/gi, '');
                    iconStyle = iconStyle.replace(/;\s*;/g, ';').replace(/^\s*;\s*|\s*;\s*$/g, '');
                    
                    // Now set the hover transform
                    icon.style.setProperty('transform', 'scale(1.05)', 'important'); // Smaller scale
                    icon.style.setProperty('display', 'inline-block', 'important');
                    icon.style.setProperty('transition', 'transform 0.3s ease-out', 'important'); // Smoother
                }
            });
            
            item.addEventListener('mouseleave', function() {
                const isActive = this.classList.contains('active');
                
                // Keep transparent on leave (unless active)
                if (!isActive) {
                    this.style.setProperty('background', 'transparent', 'important');
                    this.style.setProperty('background-color', 'transparent', 'important');
                    this.style.setProperty('border', 'none', 'important');
                } else {
                    // Active item: restore the active state styling
                    this.style.setProperty('background', '#f3f4f6', 'important');
                    this.style.setProperty('background-color', '#f3f4f6', 'important');
                    this.style.setProperty('border-left', '3px solid #4a5568', 'important');
                    this.style.setProperty('border-right', 'none', 'important');
                    this.style.setProperty('border-top', 'none', 'important');
                    this.style.setProperty('border-bottom', 'none', 'important');
                }
                
                this.style.setProperty('transform', 'none', 'important');
                
                // Reset text/icon scaling - but don't force scale(1) if it should be natural
                const span = this.querySelector('span');
                const icon = this.querySelector('i');
                if (span) {
                    // Remove the inline style to allow CSS to control it
                    span.style.removeProperty('transform');
                    span.style.removeProperty('display');
                    span.style.removeProperty('transition');
                }
                if (icon) {
                    // Remove the inline style to allow CSS to control it
                    icon.style.removeProperty('transform');
                    icon.style.removeProperty('display');
                    icon.style.removeProperty('transition');
                }
            });
            
            // Clean up inline styles that prevent hover - do this after a short delay
            setTimeout(function() {
                const span = item.querySelector('span');
                const icon = item.querySelector('i');
                
                if (span) {
                    let style = span.getAttribute('style') || '';
                    // Remove transform: scale(1) from inline style
                    if (style.includes('transform') && style.includes('scale(1)')) {
                        style = style.replace(/transform\s*:\s*scale\(1\)\s*!important/gi, '');
                        style = style.replace(/transform\s*:\s*scale\(1\)/gi, '');
                        style = style.replace(/;\s*;/g, ';').replace(/^\s*;\s*|\s*;\s*$/g, '');
                        if (style.trim()) {
                            span.setAttribute('style', style);
                        } else {
                            span.removeAttribute('style');
                        }
                    }
                }
                
                if (icon) {
                    let style = icon.getAttribute('style') || '';
                    // Remove transform: scale(1) from inline style
                    if (style.includes('transform') && style.includes('scale(1)')) {
                        style = style.replace(/transform\s*:\s*scale\(1\)\s*!important/gi, '');
                        style = style.replace(/transform\s*:\s*scale\(1\)/gi, '');
                        style = style.replace(/;\s*;/g, ';').replace(/^\s*;\s*|\s*;\s*$/g, '');
                        if (style.trim()) {
                            icon.setAttribute('style', style);
                        } else {
                            icon.removeAttribute('style');
                        }
                    }
                }
            }, 50);
        });
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            enableScrolling();
            removeGreenHover();
        });
    } else {
        enableScrolling();
        removeGreenHover();
    }
    
    // Also enable scrolling and style active items when dropdown is shown
    document.addEventListener('click', function(e) {
        if (e.target.closest('[data-bs-toggle="dropdown"]') || e.target.closest('.profile-dropdown-menu')) {
            setTimeout(function() {
                enableScrolling();
                styleActiveItems(); // Ensure active items are styled correctly
            }, 100);
        }
    });
    
    // Also watch for dynamically added dropdowns
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.classList && node.classList.contains('profile-dropdown-menu')) {
                            setTimeout(removeGreenHover, 10);
                        } else if (node.querySelector && node.querySelector('.profile-dropdown-menu')) {
                            setTimeout(removeGreenHover, 10);
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Clean up after 10 seconds
    setTimeout(function() {
        observer.disconnect();
    }, 10000);
})();
