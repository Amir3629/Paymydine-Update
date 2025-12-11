/**
 * FORCE BLUE BUTTONS OVERRIDE
 * This script removes inline green styles and forces blue button styles
 * Runs after all other scripts to ensure buttons are blue
 */

(function() {
    'use strict';
    
    console.log('🎨 Force Blue Buttons: Initializing...');
    
    // Blue color constants (matching login button)
    const BLUE_GRADIENT = 'linear-gradient(135deg, #1f2b3a 0%, #364a63 100%)';
    const BLUE_SOLID = '#1f2b3a';
    const BLUE_BORDER = '#364a63';
    const BLUE_SHADOW = '0 4px 15px rgba(31, 43, 58, 0.3)';
    const BLUE_HOVER_GRADIENT = 'linear-gradient(135deg, #364a63 0%, #526484 100%)';
    const BLUE_HOVER_SHADOW = '0 6px 20px rgba(31, 43, 58, 0.4)';
    
    // Green colors to detect and replace
    const GREEN_COLORS = [
        '#08815e',
        '#0bb87a',
        '#06ab6e',
        '#08d087',
        '#0f9d58',
        'rgb(8, 129, 94)',
        'rgb(11, 184, 122)',
        'rgba(8, 129, 94',
        'rgba(11, 184, 122'
    ];
    
    function hasGreenColor(styleValue) {
        if (!styleValue) return false;
        const lowerStyle = styleValue.toLowerCase();
        return GREEN_COLORS.some(green => lowerStyle.includes(green.toLowerCase()));
    }
    
    function forceBlueButton(button) {
        // Get current inline styles
        const currentBackground = button.style.background || button.style.backgroundColor;
        const currentBorder = button.style.border || button.style.borderColor;
        
        // Check if button has green colors
        if (hasGreenColor(currentBackground) || hasGreenColor(currentBorder)) {
            // Force blue colors
            button.style.setProperty('background', BLUE_GRADIENT, 'important');
            button.style.setProperty('background-color', BLUE_SOLID, 'important');
            button.style.setProperty('border', `2px solid ${BLUE_BORDER}`, 'important');
            button.style.setProperty('border-color', BLUE_BORDER, 'important');
            button.style.setProperty('box-shadow', BLUE_SHADOW, 'important');
            button.style.setProperty('color', '#ffffff', 'important');
            
            // Add hover effect
            button.addEventListener('mouseenter', function() {
                this.style.setProperty('background', BLUE_HOVER_GRADIENT, 'important');
                this.style.setProperty('background-color', '#364a63', 'important');
                this.style.setProperty('box-shadow', BLUE_HOVER_SHADOW, 'important');
                this.style.setProperty('transform', 'translateY(-2px)', 'important');
            });
            
            button.addEventListener('mouseleave', function() {
                this.style.setProperty('background', BLUE_GRADIENT, 'important');
                this.style.setProperty('background-color', BLUE_SOLID, 'important');
                this.style.setProperty('box-shadow', BLUE_SHADOW, 'important');
                this.style.setProperty('transform', 'translateY(0)', 'important');
            });
            
            return true;
        }
        
        // Also check for btn-primary or btn-success classes
        if (button.classList.contains('btn-primary') || button.classList.contains('btn-success')) {
            button.style.setProperty('background', BLUE_GRADIENT, 'important');
            button.style.setProperty('background-color', BLUE_SOLID, 'important');
            button.style.setProperty('border', `2px solid ${BLUE_BORDER}`, 'important');
            button.style.setProperty('border-color', BLUE_BORDER, 'important');
            button.style.setProperty('box-shadow', BLUE_SHADOW, 'important');
            button.style.setProperty('color', '#ffffff', 'important');
            
            // Add hover effect
            button.addEventListener('mouseenter', function() {
                this.style.setProperty('background', BLUE_HOVER_GRADIENT, 'important');
                this.style.setProperty('background-color', '#364a63', 'important');
                this.style.setProperty('box-shadow', BLUE_HOVER_SHADOW, 'important');
                this.style.setProperty('transform', 'translateY(-2px)', 'important');
            });
            
            button.addEventListener('mouseleave', function() {
                this.style.setProperty('background', BLUE_GRADIENT, 'important');
                this.style.setProperty('background-color', BLUE_SOLID, 'important');
                this.style.setProperty('box-shadow', BLUE_SHADOW, 'important');
                this.style.setProperty('transform', 'translateY(0)', 'important');
            });
            
            return true;
        }
        
        return false;
    }
    
    function scanAndForceBlueButtons() {
        // Get all buttons and links that might be styled as buttons
        const buttons = document.querySelectorAll('button, .btn, a.btn-primary, a.btn-success, [class*="btn-primary"], [class*="btn-success"]');
        
        let count = 0;
        buttons.forEach(button => {
            if (forceBlueButton(button)) {
                count++;
            }
        });
        
        if (count > 0) {
            console.log(`🎨 Force Blue Buttons: Converted ${count} green buttons to blue`);
        }
    }
    
    // Run immediately
    scanAndForceBlueButtons();
    
    // Run when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scanAndForceBlueButtons);
    }
    
    // Run after a short delay to catch dynamically loaded buttons
    setTimeout(scanAndForceBlueButtons, 100);
    setTimeout(scanAndForceBlueButtons, 500);
    setTimeout(scanAndForceBlueButtons, 1000);
    setTimeout(scanAndForceBlueButtons, 2000);
    
    // Observe DOM changes to catch new buttons
    const observer = new MutationObserver(function(mutations) {
        let shouldScan = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the added node is a button or contains buttons
                        if (node.matches && (node.matches('button, .btn, a.btn-primary, a.btn-success') || 
                            node.querySelector('button, .btn, a.btn-primary, a.btn-success'))) {
                            shouldScan = true;
                        }
                    }
                });
            }
            
            // Also check for style attribute changes
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const target = mutation.target;
                if (target.matches && target.matches('button, .btn, a.btn-primary, a.btn-success')) {
                    const currentBackground = target.style.background || target.style.backgroundColor;
                    if (hasGreenColor(currentBackground)) {
                        forceBlueButton(target);
                    }
                }
            }
        });
        
        if (shouldScan) {
            setTimeout(scanAndForceBlueButtons, 50);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });
    
    // Listen for page transitions
    document.addEventListener('pageContentLoaded', function() {
        console.log('🎨 Force Blue Buttons: Rescanning after page transition');
        setTimeout(scanAndForceBlueButtons, 100);
    });
    
    console.log('✅ Force Blue Buttons: Initialized and monitoring for green buttons');
})();
