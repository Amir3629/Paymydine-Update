/**
 * GLOBAL BUTTON WIDTH FIX
 * 
 * This script enforces consistent button dimensions (48x48px) across ALL pages,
 * matching the orders page style.
 * 
 * This will:
 * - Find all .btn-edit buttons
 * - Find all .bg-transparent buttons with star icons (default buttons)
 * - Find all filter and setup buttons (right side toolbar buttons)
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
        // Find edit buttons
        const editButtons = document.querySelectorAll('.btn-edit, a.btn-edit, button.btn-edit');
        
        // Find star/default buttons (bg-transparent with star icon or data-request="onSetDefault")
        const starButtons = document.querySelectorAll(
            '.btn.bg-transparent, ' +
            'a.btn.bg-transparent, ' +
            'button.btn.bg-transparent, ' +
            '[data-request="onSetDefault"]'
        );
        
        // Find filter and setup buttons (right side toolbar buttons)
        const filterSetupButtons = document.querySelectorAll(
            '[data-toggle="list-filter"], ' +
            '[data-bs-toggle="modal"][data-bs-target*="setup-modal"], ' +
            '[data-request*="onLoadSetup"], ' +
            'button[data-bs-toggle="modal"][data-bs-target*="setup-modal"]'
        );
        
        // Find theme action buttons (theme edit buttons)
        const themeActionButtons = document.querySelectorAll(
            '.theme-action-btn, ' +
            'a.theme-action-btn, ' +
            'button.theme-action-btn'
        );
        
        // Find impersonate buttons (btn-outline-secondary with user icon or data-request="onImpersonate")
        const impersonateButtons = document.querySelectorAll(
            '.btn-outline-secondary[data-request="onImpersonate"], ' +
            'a.btn-outline-secondary[data-request="onImpersonate"], ' +
            'button.btn-outline-secondary[data-request="onImpersonate"], ' +
            '[data-request="onImpersonate"]'
        );
        
        // Helper function to check if button should be excluded (regular action buttons)
        function shouldExcludeButton(button) {
            // EXCLUDE Choose button in media manager - it should be normal size
            if (button.getAttribute('data-control') === 'media-choose') {
                return true;
            }
            // EXCLUDE regular action buttons that should have width: auto
            // These buttons should NOT be forced to 48x48px
            if (button.classList.contains('btn-primary') && !button.classList.contains('btn-edit')) {
                return true; // Regular primary action buttons
            }
            if (button.classList.contains('btn-success')) {
                return true; // Success action buttons
            }
            // Exclude buttons in toolbar-action that aren't icon-only buttons
            if (button.closest('.toolbar-action') && !button.classList.contains('bg-transparent')) {
                // Only include if it's an icon-only button (no text or very short text)
                const textContent = button.textContent.trim();
                if (textContent.length > 3) {
                    return true; // Has text content, should be excluded
                }
            }
            // Exclude buttons with common action text
            const buttonText = button.textContent.trim().toLowerCase();
            const actionWords = ['new', 'create', 'add', 'save', 'cancel', 'delete', 'edit', 'update', 'submit'];
            if (actionWords.some(word => buttonText.includes(word) && buttonText.length > 3)) {
                // But allow if it's specifically a btn-edit
                if (!button.classList.contains('btn-edit')) {
                    return true;
                }
            }
            return false;
        }
        
        // Combine all buttons that need fixing, but exclude regular action buttons
        const allButtons = new Set();
        editButtons.forEach(btn => {
            if (!shouldExcludeButton(btn)) allButtons.add(btn);
        });
        starButtons.forEach(btn => {
            if (!shouldExcludeButton(btn)) allButtons.add(btn);
        });
        filterSetupButtons.forEach(btn => {
            if (!shouldExcludeButton(btn)) allButtons.add(btn);
        });
        themeActionButtons.forEach(btn => {
            if (!shouldExcludeButton(btn)) allButtons.add(btn);
        });
        impersonateButtons.forEach(btn => {
            if (!shouldExcludeButton(btn)) allButtons.add(btn);
        });
        
        // Also find buttons with star icons that might not have bg-transparent class
        // BUT exclude if they're regular action buttons
        const buttonsWithStarIcon = document.querySelectorAll('.btn, a.btn, button.btn');
        buttonsWithStarIcon.forEach(button => {
            const hasStarIcon = button.querySelector('.fa-star, i.fa-star, .fa.fa-star');
            if (hasStarIcon && button.classList.contains('btn') && !shouldExcludeButton(button)) {
                allButtons.add(button);
            }
        });
        
        // Find buttons with filter or sliders icons (filter/setup buttons)
        // BUT exclude if they're regular action buttons
        const buttonsWithFilterSetupIcons = document.querySelectorAll('.btn, a.btn, button.btn');
        buttonsWithFilterSetupIcons.forEach(button => {
            const hasFilterIcon = button.querySelector('.fa-filter, i.fa-filter, .fa.fa-filter');
            const hasSlidersIcon = button.querySelector('.fa-sliders, i.fa-sliders, .fa.fa-sliders');
            if ((hasFilterIcon || hasSlidersIcon) && button.classList.contains('btn') && !shouldExcludeButton(button)) {
                allButtons.add(button);
            }
        });
        
        // Find buttons with paint-brush icon (theme action buttons)
        // BUT exclude if they're regular action buttons
        const buttonsWithPaintBrushIcon = document.querySelectorAll('.btn, a.btn, button.btn');
        buttonsWithPaintBrushIcon.forEach(button => {
            const hasPaintBrushIcon = button.querySelector('.fa-paint-brush, i.fa-paint-brush, .fa.fa-paint-brush');
            if (hasPaintBrushIcon && button.classList.contains('btn') && !shouldExcludeButton(button)) {
                allButtons.add(button);
            }
        });
        
        // Find buttons with user icon (impersonate buttons)
        // BUT exclude if they're regular action buttons
        const buttonsWithUserIcon = document.querySelectorAll('.btn, a.btn, button.btn');
        buttonsWithUserIcon.forEach(button => {
            const hasUserIcon = button.querySelector('.fa-user, i.fa-user, .fa.fa-user');
            const hasImpersonateRequest = button.getAttribute('data-request') === 'onImpersonate';
            if ((hasUserIcon || hasImpersonateRequest) && button.classList.contains('btn') && !shouldExcludeButton(button)) {
                allButtons.add(button);
            }
        });
        
        if (allButtons.size === 0) {
            return;
        }
        
        allButtons.forEach(button => {
            // CRITICAL: Skip .btn-primary buttons entirely - they should have width: auto
            if (button.classList.contains('btn-primary') && !button.classList.contains('btn-edit')) {
                return; // Skip all regular action buttons
            }
            
            // Skip if button has width: auto explicitly set (should not be modified)
            const inlineWidth = button.style.width;
            if (inlineWidth && (inlineWidth.trim() === 'auto' || inlineWidth.toLowerCase().includes('auto'))) {
                return; // Skip this button - it should keep width: auto
            }
            
            // Check if styles are already correctly applied - avoid re-applying unnecessarily
            const currentWidth = window.getComputedStyle(button).width;
            const currentHeight = window.getComputedStyle(button).height;
            const currentMinWidth = window.getComputedStyle(button).minWidth;
            const currentMinHeight = window.getComputedStyle(button).minHeight;
            
            // If styles are already set to 48px, skip (unless there's an issue)
            if (currentWidth === '48px' && currentHeight === '48px' && 
                currentMinWidth === '48px' && currentMinHeight === '48px') {
                // Double-check that inline styles match - if so, skip to avoid unnecessary re-applications
                const inlineStyle = button.getAttribute('style') || '';
                if (inlineStyle.includes('width: 48px') && inlineStyle.includes('height: 48px') &&
                    inlineStyle.includes('min-width: 48px') && inlineStyle.includes('min-height: 48px')) {
                    return; // Already correctly styled, skip to avoid triggering other scripts
                }
            }
            
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
        
        if (allButtons.size > 0) {
            const editCount = editButtons.length;
            const starCount = Array.from(allButtons).filter(btn => 
                btn.classList.contains('bg-transparent') || 
                btn.querySelector('.fa-star') || 
                btn.getAttribute('data-request') === 'onSetDefault'
            ).length;
            const filterSetupCount = Array.from(allButtons).filter(btn => 
                btn.getAttribute('data-toggle') === 'list-filter' ||
                (btn.getAttribute('data-bs-toggle') === 'modal' && btn.getAttribute('data-bs-target') && btn.getAttribute('data-bs-target').includes('setup-modal')) ||
                btn.getAttribute('data-request') && btn.getAttribute('data-request').includes('onLoadSetup') ||
                btn.querySelector('.fa-filter') ||
                btn.querySelector('.fa-sliders')
            ).length;
            const themeActionCount = Array.from(allButtons).filter(btn => 
                btn.classList.contains('theme-action-btn') ||
                btn.querySelector('.fa-paint-brush')
            ).length;
            const impersonateCount = Array.from(allButtons).filter(btn => 
                btn.getAttribute('data-request') === 'onImpersonate' ||
                (btn.classList.contains('btn-outline-secondary') && btn.querySelector('.fa-user'))
            ).length;
            console.log(`✅ Applied consistent dimensions to ${allButtons.size} button(s) (${editCount} edit, ${starCount} star/default, ${filterSetupCount} filter/setup, ${themeActionCount} theme, ${impersonateCount} impersonate)`);
        }
    }
    
    /**
     * Initialize
     */
    let isRunning = false;
    let runTimeout = null;
    let lastRunTime = 0;
    const MIN_RUN_INTERVAL = 1000; // Don't run more than once per second
    
    function debouncedEnforce() {
        const now = Date.now();
        
        // Prevent running too frequently
        if (now - lastRunTime < MIN_RUN_INTERVAL) {
            return;
        }
        
        if (isRunning) return;
        isRunning = true;
        
        if (runTimeout) {
            clearTimeout(runTimeout);
        }
        
        runTimeout = setTimeout(function() {
            lastRunTime = Date.now();
            enforceButtonDimensions();
            isRunning = false;
            runTimeout = null;
        }, 100); // Increased debounce delay
    }
    
    function init() {
        // Run immediately on script load (only once)
        lastRunTime = Date.now();
        enforceButtonDimensions();
        
        // Run once on DOM ready (with slight delay to let other scripts initialize)
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(debouncedEnforce, 200);
            });
        } else {
            setTimeout(debouncedEnforce, 200);
        }
        
        // Run once on window load (to catch any late-loading content) - ONLY ONCE
        window.addEventListener('load', function() {
            setTimeout(debouncedEnforce, 300);
        }, { once: true });
        
        // Run on AJAX updates (TastyIgniter uses this event) - debounced
        document.addEventListener('ajaxUpdate', function() {
            debouncedEnforce();
        });
        
        // Watch for dynamically added buttons
        const observer = new MutationObserver(function(mutations) {
            let shouldUpdate = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) {
                            // Check if added node is a button or contains buttons
                            if (node.nodeType === 1 && node.classList) {
                                // Check for edit buttons
                                if (node.classList.contains('btn-edit') || 
                                    node.classList.contains('bg-transparent')) {
                                    shouldUpdate = true;
                                }
                                // Check for filter/setup buttons
                                if (node.getAttribute && (
                                    node.getAttribute('data-toggle') === 'list-filter' ||
                                    (node.getAttribute('data-bs-toggle') === 'modal' && node.getAttribute('data-bs-target') && node.getAttribute('data-bs-target').includes('setup-modal'))
                                )) {
                                    shouldUpdate = true;
                                }
                                // Check if contains buttons with icons
                                if (node.classList.contains('btn') && node.querySelector && (
                                    node.querySelector('.btn-edit') ||
                                    node.querySelector('.fa-star') ||
                                    node.querySelector('.fa-filter') ||
                                    node.querySelector('.fa-sliders') ||
                                    node.querySelector('.fa-paint-brush') ||
                                    node.querySelector('.fa-user')
                                )) {
                                    shouldUpdate = true;
                                }
                                // Check for theme action buttons
                                if (node.classList.contains('theme-action-btn')) {
                                    shouldUpdate = true;
                                }
                                // Check for impersonate buttons
                                if (node.getAttribute && node.getAttribute('data-request') === 'onImpersonate') {
                                    shouldUpdate = true;
                                }
                            }
                        }
                    });
                }
                
                // Also check for attribute changes (class changes only - not style to avoid loops)
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'class' || 
                     mutation.attributeName === 'data-toggle' || mutation.attributeName === 'data-bs-toggle')) {
                    const target = mutation.target;
                    // Skip if it's a regular action button (btn-primary, btn-success)
                    if (target.classList && target.classList.contains('btn-primary') && !target.classList.contains('btn-edit')) {
                        return; // Skip regular action buttons
                    }
                    if (target.classList && (
                        target.classList.contains('btn-edit') ||
                        (target.classList.contains('bg-transparent') && target.classList.contains('btn')) ||
                        target.getAttribute('data-toggle') === 'list-filter' ||
                        (target.getAttribute('data-bs-toggle') === 'modal' && target.getAttribute('data-bs-target') && target.getAttribute('data-bs-target').includes('setup-modal')) ||
                        target.classList.contains('theme-action-btn') ||
                        target.getAttribute('data-request') === 'onImpersonate' ||
                        (target.querySelector && (
                            target.querySelector('.fa-star') ||
                            target.querySelector('.fa-filter') ||
                            target.querySelector('.fa-sliders') ||
                            target.querySelector('.fa-paint-brush') ||
                            target.querySelector('.fa-user')
                        ))
                    )) {
                        shouldUpdate = true;
                    }
                }
            });
            
            if (shouldUpdate) {
                debouncedEnforce();
            }
        });
        
        // Start observing - only watch class changes, not style (to avoid loops)
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-toggle', 'data-bs-toggle', 'data-request']
        });
        
        // REMOVED: Periodic check was causing flickering - rely on mutation observer instead
    }
    
    // Start initialization
    init();
    
    // Export function for manual calls
    window.enforceButtonDimensions = enforceButtonDimensions;
    
    console.log('✅ Button width fix initialized');
})();
