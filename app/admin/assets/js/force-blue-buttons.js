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
        // SKIP ALL media manager buttons - they should stay ice white/consistent
        if (button.closest && (button.closest('.media-toolbar') || button.closest('.media-manager') || button.closest('#mediamanager-toolbar'))) {
            return false; // Don't style any media manager buttons
        }
        
        // SKIP Open Drawer button - it should stay ice white (same as Test Connection)
        if (button.getAttribute('data-request') === 'onOpenDrawer') {
            return false; // Don't style Open Drawer button
        }
        
        // SKIP Test Sound button - it should stay ice white
        if (button.classList && (button.classList.contains('test-sound-btn') || button.id === 'test-kds-sound-btn')) {
            return false; // Don't style Test Sound button
        }
        
        // SKIP Register Webhook button - it should stay ice white
        if (button.id === 'btn-register-webhook' || button.getAttribute('data-request') === 'onRegisterWebhook') {
            return false; // Don't style Register Webhook button
        }
        
        // SKIP Test Integration button - it should stay ice white
        if (button.id === 'btn-test-integration' || button.getAttribute('data-request') === 'onTestIntegration') {
            return false; // Don't style Test Integration button
        }
        
        // SKIP Sync Menu button - it should stay ice white
        if (button.getAttribute('data-request') === 'onSyncMenu') {
            return false; // Don't style Sync Menu button
        }
        
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
        
        // Also check for btn-primary or btn-success classes (but skip Open Drawer button)
        if ((button.classList.contains('btn-primary') || button.classList.contains('btn-success')) 
            && button.getAttribute('data-request') !== 'onOpenDrawer') {
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
    
    function removeDarkBlueFromUploadButton() {
        // Remove dark blue styles from media manager upload button
        const uploadButton = document.querySelector('.media-toolbar button[data-media-control="upload"], .media-manager button[data-media-control="upload"], .media-toolbar .btn-primary.dz-clickable');
        if (uploadButton) {
            const style = uploadButton.getAttribute('style');
            if (style && (style.includes('54, 74, 99') || style.includes('31, 43, 58') || style.includes('linear-gradient') || style.includes('rgb(54') || style.includes('rgb(31'))) {
                uploadButton.removeAttribute('style');
            }
        }
    }
    
    function forceIceWhiteForOpenDrawer() {
        // Force ice white style for Open Drawer button (same as Test Connection)
        const openDrawerButton = document.querySelector('a[data-request="onOpenDrawer"], button[data-request="onOpenDrawer"]');
        if (openDrawerButton) {
            openDrawerButton.style.setProperty('background', 'rgb(241, 244, 251)', 'important');
            openDrawerButton.style.setProperty('background-color', 'rgb(241, 244, 251)', 'important');
            openDrawerButton.style.setProperty('color', 'rgb(32, 41, 56)', 'important');
            openDrawerButton.style.setProperty('border', '1px solid rgb(201, 210, 227)', 'important');
            openDrawerButton.style.setProperty('box-shadow', 'none', 'important');
            
            // Remove hover effects from forceBlueButton
            openDrawerButton.addEventListener('mouseenter', function() {
                this.style.setProperty('background', 'rgb(233, 236, 243)', 'important');
                this.style.setProperty('background-color', 'rgb(233, 236, 243)', 'important');
                this.style.setProperty('border-color', 'rgb(201, 210, 227)', 'important');
                this.style.setProperty('color', 'rgb(32, 41, 56)', 'important');
            }, { once: false });
            
            openDrawerButton.addEventListener('mouseleave', function() {
                this.style.setProperty('background', 'rgb(241, 244, 251)', 'important');
                this.style.setProperty('background-color', 'rgb(241, 244, 251)', 'important');
                this.style.setProperty('border-color', 'rgb(201, 210, 227)', 'important');
                this.style.setProperty('color', 'rgb(32, 41, 56)', 'important');
            }, { once: false });
        }
    }
    
    function forceIceWhiteForPosConfigButtons() {
        // Force ice white style for POS Configs right-side buttons
        const buttons = [
            document.getElementById('btn-register-webhook'),
            document.getElementById('btn-test-integration'),
            document.querySelector('button[data-request="onSyncMenu"]')
        ].filter(Boolean);
        
        buttons.forEach(button => {
            button.style.setProperty('background', 'rgb(241, 244, 251)', 'important');
            button.style.setProperty('background-color', 'rgb(241, 244, 251)', 'important');
            button.style.setProperty('background-image', 'none', 'important');
            button.style.setProperty('color', 'rgb(32, 41, 56)', 'important');
            button.style.setProperty('border', '1px solid rgb(201, 210, 227)', 'important');
            button.style.setProperty('border-color', 'rgb(201, 210, 227)', 'important');
            button.style.setProperty('box-shadow', 'none', 'important');
            button.style.setProperty('transform', 'translateY(0)', 'important');
            
            // Set icon color
            const icon = button.querySelector('i.fa');
            if (icon) {
                icon.style.setProperty('color', 'rgb(32, 41, 56)', 'important');
            }
            
            // Add hover effects
            button.addEventListener('mouseenter', function() {
                this.style.setProperty('background', 'rgb(233, 236, 243)', 'important');
                this.style.setProperty('background-color', 'rgb(233, 236, 243)', 'important');
                this.style.setProperty('background-image', 'none', 'important');
                this.style.setProperty('border-color', 'rgb(201, 210, 227)', 'important');
                this.style.setProperty('color', 'rgb(32, 41, 56)', 'important');
                this.style.setProperty('transform', 'translateY(-1px)', 'important');
            }, { once: false });
            
            button.addEventListener('mouseleave', function() {
                this.style.setProperty('background', 'rgb(241, 244, 251)', 'important');
                this.style.setProperty('background-color', 'rgb(241, 244, 251)', 'important');
                this.style.setProperty('background-image', 'none', 'important');
                this.style.setProperty('border-color', 'rgb(201, 210, 227)', 'important');
                this.style.setProperty('color', 'rgb(32, 41, 56)', 'important');
                this.style.setProperty('transform', 'translateY(0)', 'important');
            }, { once: false });
        });
    }
    
    function forceMediaManagerButtonsWhite() {
        // Force all media manager buttons to stay ICE WHITE (ALWAYS override any other styles)
        const mediaToolbar = document.querySelector('.media-toolbar, #mediamanager-toolbar, .media-manager');
        if (mediaToolbar) {
            const mediaButtons = mediaToolbar.querySelectorAll('button, .btn, a.btn, button.btn, a[class*="btn"]');
            mediaButtons.forEach(button => {
                // SKIP Choose button - it should be normal size
                if (button.getAttribute('data-control') === 'media-choose' || 
                    button.classList.contains('btn-primary') && button.getAttribute('data-control') === 'media-choose') {
                    return; // Skip Choose button
                }
                
                // ALWAYS apply ice white - override everything, even if already processed
                
                // Force consistent size - 42x42 for all buttons (except Choose)
                button.style.setProperty('width', '42px', 'important');
                button.style.setProperty('height', '42px', 'important');
                button.style.setProperty('min-width', '42px', 'important');
                button.style.setProperty('min-height', '42px', 'important');
                button.style.setProperty('max-width', '42px', 'important');
                button.style.setProperty('max-height', '42px', 'important');
                button.style.setProperty('padding', '0', 'important');
                button.style.setProperty('margin', '0', 'important');
                button.style.setProperty('display', 'inline-flex', 'important');
                button.style.setProperty('align-items', 'center', 'important');
                button.style.setProperty('justify-content', 'center', 'important');
                button.style.setProperty('border-radius', '10px', 'important');
                
                // FORCE ICE WHITE - override any blue/gradient/white colors
                button.style.setProperty('background', 'rgb(241, 244, 251)', 'important');
                button.style.setProperty('background-color', 'rgb(241, 244, 251)', 'important');
                button.style.setProperty('background-image', 'none', 'important');
                button.style.setProperty('border', '1px solid rgb(201, 210, 227)', 'important');
                button.style.setProperty('border-color', 'rgb(201, 210, 227)', 'important');
                button.style.setProperty('border-width', '1px', 'important');
                button.style.setProperty('box-shadow', 'none', 'important');
                button.style.setProperty('color', 'rgb(32, 41, 56)', 'important');
                button.style.setProperty('transform', 'none', 'important');
                button.style.setProperty('transition', 'all 0.2s ease', 'important');
                
                // Mark as processed
                button.setAttribute('data-media-button-styled', 'true');
                
                // Remove any existing hover listeners and add new ones
                const newHoverEnter = function() {
                    this.style.setProperty('background', 'rgb(233, 236, 243)', 'important');
                    this.style.setProperty('background-color', 'rgb(233, 236, 243)', 'important');
                    this.style.setProperty('border-color', 'rgb(201, 210, 227)', 'important');
                    this.style.setProperty('color', 'rgb(32, 41, 56)', 'important');
                    this.style.setProperty('box-shadow', '0 2px 8px rgba(0, 0, 0, 0.1)', 'important');
                    this.style.setProperty('transform', 'translateY(-1px)', 'important');
                };
                
                const newHoverLeave = function() {
                    this.style.setProperty('background', 'rgb(241, 244, 251)', 'important');
                    this.style.setProperty('background-color', 'rgb(241, 244, 251)', 'important');
                    this.style.setProperty('border-color', 'rgb(201, 210, 227)', 'important');
                    this.style.setProperty('color', 'rgb(32, 41, 56)', 'important');
                    this.style.setProperty('box-shadow', 'none', 'important');
                    this.style.setProperty('transform', 'none', 'important');
                };
                
                // Clone node to remove all event listeners, then re-add
                button.removeEventListener('mouseenter', newHoverEnter);
                button.removeEventListener('mouseleave', newHoverLeave);
                button.addEventListener('mouseenter', newHoverEnter, { once: false });
                button.addEventListener('mouseleave', newHoverLeave, { once: false });
                
                // Fix icon colors
                const icons = button.querySelectorAll('i, .fa, [class*="fa-"]');
                icons.forEach(icon => {
                    icon.style.setProperty('color', 'rgb(32, 41, 56)', 'important');
                });
            });
            
            // Fix spacing between button groups
            const btnGroups = mediaToolbar.querySelectorAll('.btn-group, .dropdown, .input-group');
            btnGroups.forEach((group, index) => {
                if (index < btnGroups.length - 1) {
                    group.style.setProperty('margin-right', '10px', 'important');
                }
            });
        }
    }
    
    function scanAndForceBlueButtons() {
        // First, remove dark blue from upload button
        removeDarkBlueFromUploadButton();
        
        // Get all buttons and links that might be styled as buttons
        const buttons = document.querySelectorAll('button, .btn, a.btn-primary, a.btn-success, [class*="btn-primary"], [class*="btn-success"]');
        
        let count = 0;
        buttons.forEach(button => {
            if (forceBlueButton(button)) {
                count++;
            }
        });
        
        // Force ice white for Open Drawer button after processing other buttons
        forceIceWhiteForOpenDrawer();
        
        // Force ice white for POS Configs buttons after processing other buttons
        forceIceWhiteForPosConfigButtons();
        
        // Force all media manager buttons to stay white
        forceMediaManagerButtonsWhite();
        
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
    
    // Force ice white for POS Configs buttons AFTER all blue button processing
    setTimeout(forceIceWhiteForPosConfigButtons, 150);
    setTimeout(forceIceWhiteForPosConfigButtons, 550);
    setTimeout(forceIceWhiteForPosConfigButtons, 1050);
    setTimeout(forceIceWhiteForPosConfigButtons, 2050);
    
    // Force media manager buttons white AFTER all blue button processing
    setTimeout(forceMediaManagerButtonsWhite, 150);
    setTimeout(forceMediaManagerButtonsWhite, 550);
    setTimeout(forceMediaManagerButtonsWhite, 1050);
    setTimeout(forceMediaManagerButtonsWhite, 2050);
    
    // Also remove dark blue from upload button frequently
    setInterval(removeDarkBlueFromUploadButton, 100);
    
    // Observe DOM changes to catch new buttons
    const observer = new MutationObserver(function(mutations) {
        // Skip processing when modal is open to prevent freeze (except for modal toolbar buttons)
        if (window.SKIP_EXPENSIVE_OBSERVERS || document.body.classList.contains('modal-open')) {
            // Only process if it's a modal toolbar button
            let shouldProcess = false;
            for (const mutation of mutations) {
                if (window.shouldSkipObserver && window.shouldSkipObserver(mutation)) {
                    continue;
                }
                const target = mutation.target;
                if (target.closest && (target.closest('.media-toolbar') || target.closest('#mediamanager-toolbar'))) {
                    shouldProcess = true;
                    break;
                }
                // Check added nodes
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE && node.closest && 
                        (node.closest('.media-toolbar') || node.closest('#mediamanager-toolbar'))) {
                        shouldProcess = true;
                        break;
                    }
                }
            }
            if (!shouldProcess) {
                return;
            }
        }
        
        let shouldScan = false;
        mutations.forEach(function(mutation) {
            // Skip if mutation is inside a modal (except toolbar)
            if (mutation.target.closest && mutation.target.closest('.modal')) {
                const isToolbar = mutation.target.closest('.media-toolbar, #mediamanager-toolbar');
                if (!isToolbar) {
                    return;
                }
            }
            
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Skip if node is inside a modal (except toolbar)
                        if (node.closest && node.closest('.modal')) {
                            const isToolbar = node.closest('.media-toolbar, #mediamanager-toolbar');
                            if (!isToolbar) {
                                return;
                            }
                        }
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
                // Skip ALL media manager buttons - force ice white instead
                if (target.closest && (target.closest('.media-toolbar') || target.closest('#mediamanager-toolbar') || target.closest('.media-manager'))) {
                    // Force ice white for this button
                    setTimeout(() => forceMediaManagerButtonsWhite(), 10);
                    return;
                }
                // Skip if inside modal (except toolbar)
                if (target.closest && target.closest('.modal')) {
                    const isToolbar = target.closest('.media-toolbar, #mediamanager-toolbar');
                    if (!isToolbar) {
                        return;
                    }
                }
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
            setTimeout(forceIceWhiteForPosConfigButtons, 100);
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
        setTimeout(forceIceWhiteForPosConfigButtons, 150);
        setTimeout(forceMediaManagerButtonsWhite, 200);
    });
    
    // Continuously monitor and fix media manager buttons
    setInterval(function() {
        const mediaToolbar = document.querySelector('.media-toolbar, #mediamanager-toolbar, .media-manager');
        if (mediaToolbar) {
            forceMediaManagerButtonsWhite();
        }
    }, 500); // Check every 500ms
    
    console.log('✅ Force Blue Buttons: Initialized and monitoring for green buttons');
})();
