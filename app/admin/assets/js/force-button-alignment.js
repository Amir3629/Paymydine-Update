/**
 * FORCE BUTTON ALIGNMENT
 * This script physically moves the bulk action buttons to the toolbar
 */

(function() {
    'use strict';
    
    const isThemeEditPage = window.location.pathname.includes('/admin/themes/edit');
    const isHistoryPage = window.location.pathname.includes('/admin/history');
    const isMediaManagerPage = window.location.pathname.includes('/admin/media_manager');
    if (isThemeEditPage) {
        console.log('🔧 Force Button Alignment skipped on theme edit page');
        return;
    }
    if (isMediaManagerPage) {
        console.log('🔧 Force Button Alignment skipped on media manager page (prevents upload button from breaking)');
        return;
    }
    console.log('🔧 Force Button Alignment initialized');
    
    const BUTTON_PADDING = '0.55rem 1.75rem';
    const PRIMARY_BUTTON_PADDING = '0.55rem 1.75rem';
    const PRIMARY_MIN_WIDTH = '110px';
    const BUTTON_BORDER_RADIUS = '12px';
    const BUTTON_FONT_WEIGHT = '600';
    const BUTTON_MIN_HEIGHT = '40px';
    const PRIMARY_BACKGROUND = 'linear-gradient(135deg, #1f2b3a 0%, #364a63 100%)';
    const PRIMARY_SOLID_BACKGROUND = '#1f2b3a';
    const PRIMARY_BORDER = '#364a63';
    const PRIMARY_TEXT_COLOR = '#ffffff';
    const ICE_BACKGROUND = '#f1f4fb';
    const ICE_BORDER = '#c9d2e3';
    const ICE_TEXT_COLOR = '#202938';
    const DANGER_BACKGROUND = '#dc3545';
    const DANGER_BORDER = '#dc3545';
    const DANGER_TEXT_COLOR = '#ffffff';

    function restyleIceActionButton(btn) {
        btn.classList.remove('btn-secondary', 'btn-primary', 'btn-dark', 'text-white', 'btn-outline-warning');
        btn.style.setProperty('background', ICE_BACKGROUND, 'important');
        btn.style.setProperty('background-color', ICE_BACKGROUND, 'important');
        btn.style.setProperty('border', `1px solid ${ICE_BORDER}`, 'important');
        btn.style.setProperty('border-radius', '10px', 'important');
        btn.style.setProperty('padding', '6px 10px', 'important');
        btn.style.setProperty('display', 'inline-flex', 'important');
        btn.style.setProperty('align-items', 'center', 'important');
        btn.style.setProperty('justify-content', 'center', 'important');
        btn.style.setProperty('color', ICE_TEXT_COLOR, 'important');
        btn.style.setProperty('box-shadow', 'none', 'important');

        const icon = btn.querySelector('i');
        if (icon) {
            icon.style.setProperty('color', ICE_TEXT_COLOR, 'important');
        }
    }

    function restylePrimaryActionButton(btn) {
        btn.classList.remove('btn-secondary', 'btn-dark', 'text-white', 'btn-outline-warning');
        btn.style.setProperty('background', PRIMARY_BACKGROUND, 'important');
        btn.style.setProperty('background-color', PRIMARY_SOLID_BACKGROUND, 'important');
        btn.style.setProperty('border', `1px solid ${PRIMARY_BORDER}`, 'important');
        btn.style.setProperty('border-radius', '12px', 'important');
        btn.style.setProperty('padding', '0.55rem 1.75rem', 'important');
        btn.style.setProperty('display', 'inline-flex', 'important');
        btn.style.setProperty('align-items', 'center', 'important');
        btn.style.setProperty('justify-content', 'center', 'important');
        btn.style.setProperty('color', PRIMARY_TEXT_COLOR, 'important');
        btn.style.setProperty('box-shadow', '0 4px 15px rgba(31, 43, 58, 0.3)', 'important');
        btn.style.setProperty('min-height', '40px', 'important');

        const icon = btn.querySelector('i');
        if (icon) {
            icon.style.setProperty('color', PRIMARY_TEXT_COLOR, 'important');
        }
    }

    /** Back button: same hover/focus/active effect as Save button (JS-driven so it is not overwritten). */
    function applyBackButtonHoverFix() {
        const backButtons = document.querySelectorAll('.progress-indicator-container > .btn-outline-secondary, .progress-indicator-container > a.btn-outline-secondary');
        backButtons.forEach(function(back) {
            if (back.dataset.backHoverBound === '1') return;
            back.dataset.backHoverBound = '1';

            const DEFAULT_STYLE = {
                background: 'linear-gradient(135deg, #1f2b3a 0%, #364a63 100%)',
                backgroundColor: '#1f2b3a',
                border: '1px solid #364a63',
                borderColor: '#364a63',
                boxShadow: '0 4px 15px rgba(31, 43, 58, 0.3)',
                color: '#ffffff'
            };
            const HOVER_STYLE = {
                background: 'linear-gradient(135deg, #364a63 0%, #526484 100%)',
                backgroundColor: '#526484',
                border: '1px solid #526484',
                borderColor: '#526484',
                boxShadow: '0 6px 16px rgba(31, 43, 58, 0.4)',
                color: '#ffffff'
            };
            const ACTIVE_STYLE = {
                background: 'linear-gradient(135deg, #2a3a4e 0%, #364a63 100%)',
                backgroundColor: '#364a63',
                border: '1px solid #364a63',
                borderColor: '#364a63',
                boxShadow: '0 4px 15px rgba(31, 43, 58, 0.35)',
                color: '#ffffff'
            };

            function applyStyle(styles) {
                Object.keys(styles).forEach(function(k) {
                    back.style.setProperty(k.replace(/([A-Z])/g, '-$1').toLowerCase(), styles[k], 'important');
                });
                const icon = back.querySelector('i');
                if (icon) icon.style.setProperty('color', '#ffffff', 'important');
            }

            back.addEventListener('mouseenter', function() { applyStyle(HOVER_STYLE); });
            back.addEventListener('mouseleave', function() { applyStyle(DEFAULT_STYLE); });
            back.addEventListener('mousedown', function() { applyStyle(ACTIVE_STYLE); });
            back.addEventListener('mouseup', function() { applyStyle(back.matches(':hover') ? HOVER_STYLE : DEFAULT_STYLE); });
            back.addEventListener('focus', function() { applyStyle(HOVER_STYLE); });
            back.addEventListener('blur', function() { applyStyle(DEFAULT_STYLE); });
        });
    }

    /** Toolbar primary (Save, New, etc.): same hover/focus/active via JS so it always matches and nothing overrides it. */
    function applyToolbarPrimaryHoverFix() {
        const primaryBtns = document.querySelectorAll('.progress-indicator-container .btn-primary, .progress-indicator-container .btn-group .btn-primary');
        primaryBtns.forEach(function(btn) {
            if (btn.closest('.media-toolbar') || btn.closest('.media-manager')) return;
            if (btn.closest('.toolbar-languages-edit-right')) return;
            if (btn.dataset.primaryHoverBound === '1') return;
            btn.dataset.primaryHoverBound = '1';

            const DEFAULT_STYLE = {
                background: 'linear-gradient(135deg, #1f2b3a 0%, #364a63 100%)',
                backgroundColor: '#1f2b3a',
                border: '2px solid #364a63',
                borderColor: '#364a63',
                boxShadow: '0 4px 15px rgba(31, 43, 58, 0.35)',
                color: '#ffffff',
                transform: 'translateY(0)'
            };
            const HOVER_STYLE = {
                background: 'linear-gradient(135deg, #364a63 0%, #526484 100%)',
                backgroundColor: '#526484',
                border: '2px solid #526484',
                borderColor: '#526484',
                boxShadow: '0 6px 16px rgba(31, 43, 58, 0.4)',
                color: '#ffffff',
                transform: 'translateY(-1px)'
            };
            const ACTIVE_STYLE = {
                background: 'linear-gradient(135deg, #2a3a4e 0%, #364a63 100%)',
                backgroundColor: '#364a63',
                border: '2px solid #364a63',
                borderColor: '#364a63',
                boxShadow: '0 4px 15px rgba(31, 43, 58, 0.35)',
                color: '#ffffff',
                transform: 'translateY(0)'
            };

            function applyStyle(styles) {
                Object.keys(styles).forEach(function(k) {
                    btn.style.setProperty(k.replace(/([A-Z])/g, '-$1').toLowerCase(), styles[k], 'important');
                });
                const icon = btn.querySelector('i');
                if (icon) icon.style.setProperty('color', '#ffffff', 'important');
            }

            btn.addEventListener('mouseenter', function() { applyStyle(HOVER_STYLE); });
            btn.addEventListener('mouseleave', function() { applyStyle(DEFAULT_STYLE); });
            btn.addEventListener('mousedown', function() { applyStyle(ACTIVE_STYLE); });
            btn.addEventListener('mouseup', function() { applyStyle(btn.matches(':hover') ? HOVER_STYLE : DEFAULT_STYLE); });
            btn.addEventListener('focus', function() { applyStyle(HOVER_STYLE); });
            btn.addEventListener('blur', function() { applyStyle(DEFAULT_STYLE); });
        });
    }

    /** Force toolbar/progress-indicator .btn-primary to blue only (no green). Skip when hovered/focused so hover effect is not killed. */
    function forceToolbarPrimaryBlue() {
        const primaryBtns = document.querySelectorAll('.toolbar-action .btn-primary, .toolbar-action .progress-indicator-container .btn-primary, .progress-indicator-container .btn-primary');
        primaryBtns.forEach(btn => {
            if (btn.closest('.media-toolbar') || btn.closest('.media-manager')) return;
            if (btn.matches(':hover') || document.activeElement === btn) return;
            btn.style.setProperty('background', PRIMARY_BACKGROUND, 'important');
            btn.style.setProperty('background-color', PRIMARY_SOLID_BACKGROUND, 'important');
            btn.style.setProperty('border-color', PRIMARY_BORDER, 'important');
            btn.style.setProperty('box-shadow', '0 4px 15px rgba(31, 43, 58, 0.4)', 'important');
        });
    }

    function applyToolbarButtonPalette() {
        const toolbarButtons = document.querySelectorAll('.toolbar-action .btn');

        toolbarButtons.forEach(btn => {
            // SKIP media manager buttons - they have their own styling
            if (btn.closest('.media-toolbar') || btn.closest('#mediamanager-toolbar') || btn.closest('.media-manager')) {
                return;
            }
            // SKIP Back button - it stays square (icon-only) via CSS; don't overwrite with width: auto / normal padding
            const isBackButton = btn.closest('.progress-indicator-container') && btn.matches('.btn-outline-secondary') && btn.parentElement && btn.parentElement.classList.contains('progress-indicator-container');
            if (isBackButton) {
                if (btn.matches(':hover') || document.activeElement === btn) return;
                btn.style.setProperty('width', '40px', 'important');
                btn.style.setProperty('min-width', '40px', 'important');
                btn.style.setProperty('padding', '0', 'important');
                btn.style.setProperty('border-radius', BUTTON_BORDER_RADIUS, 'important');
                btn.style.setProperty('font-weight', BUTTON_FONT_WEIGHT, 'important');
                btn.style.setProperty('display', 'inline-flex', 'important');
                btn.style.setProperty('align-items', 'center', 'important');
                btn.style.setProperty('justify-content', 'center', 'important');
                btn.style.setProperty('min-height', BUTTON_MIN_HEIGHT, 'important');
                btn.style.setProperty('height', BUTTON_MIN_HEIGHT, 'important');
                btn.style.setProperty('line-height', '1.3', 'important');
                btn.style.setProperty('background', PRIMARY_BACKGROUND, 'important');
                btn.style.setProperty('background-color', PRIMARY_SOLID_BACKGROUND, 'important');
                btn.style.setProperty('border', `1px solid ${PRIMARY_BORDER}`, 'important');
                btn.style.setProperty('color', PRIMARY_TEXT_COLOR, 'important');
                btn.style.setProperty('box-shadow', '0 4px 15px rgba(31, 43, 58, 0.3)', 'important');
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.style.setProperty('color', PRIMARY_TEXT_COLOR, 'important');
                }
                return;
            }
            // Languages edit: Check for updates + Delete must stay ice/white (btn-success is overridden elsewhere)
            const isLanguagesEditIce = btn.matches('[data-handler="onCheckUpdates"]') || btn.closest('.toolbar-languages-edit-right');
            if (isLanguagesEditIce) {
                if (btn.matches(':hover') || document.activeElement === btn) return;
                btn.dataset.toolbarDefaultSized = '1';
                const existing = btn.getAttribute('style') || '';
                btn.style.cssText = (
                    'display:inline-flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;' +
                    'padding:' + PRIMARY_BUTTON_PADDING + '!important;min-width:' + PRIMARY_MIN_WIDTH + '!important;width:auto!important;' +
                    'height:' + BUTTON_MIN_HEIGHT + '!important;min-height:' + BUTTON_MIN_HEIGHT + '!important;line-height:1.3!important;' +
                    'border-radius:' + BUTTON_BORDER_RADIUS + '!important;font-weight:' + BUTTON_FONT_WEIGHT + '!important;' +
                    'background:' + ICE_BACKGROUND + '!important;background-color:' + ICE_BACKGROUND + '!important;' +
                    'border:2px solid ' + ICE_BORDER + '!important;color:' + ICE_TEXT_COLOR + '!important;' +
                    'box-shadow:none!important;box-sizing:border-box!important;transition:transform 0.2s ease,box-shadow 0.2s ease!important;'
                ) + existing;
                var icon = btn.querySelector('i');
                if (icon) icon.style.setProperty('color', ICE_TEXT_COLOR, 'important');
                return;
            }
            // Toolbar Delete button: ice/white button like others, ONLY the icon is red. Skip on languages edit where Delete is full ice.
            const isToolbarDelete = btn.closest('.progress-indicator-container') && btn.matches('[data-request="onDelete"]') && !btn.closest('.toolbar-languages-edit-right');
            if (isToolbarDelete) {
                if (btn.matches(':hover') || document.activeElement === btn) return;
                btn.dataset.toolbarDefaultSized = '1';
                btn.classList.remove('btn-danger');
                btn.classList.add('btn-default');
                const existing = btn.getAttribute('style') || '';
                btn.style.cssText = (
                    'display:inline-flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;' +
                    'padding:' + PRIMARY_BUTTON_PADDING + '!important;min-width:' + PRIMARY_MIN_WIDTH + '!important;width:auto!important;' +
                    'height:' + BUTTON_MIN_HEIGHT + '!important;min-height:' + BUTTON_MIN_HEIGHT + '!important;line-height:1.3!important;' +
                    'border-radius:' + BUTTON_BORDER_RADIUS + '!important;font-weight:' + BUTTON_FONT_WEIGHT + '!important;' +
                    'background:' + ICE_BACKGROUND + '!important;background-color:' + ICE_BACKGROUND + '!important;' +
                    'border:2px solid ' + ICE_BORDER + '!important;color:' + ICE_TEXT_COLOR + '!important;' +
                    'box-shadow:none!important;box-sizing:border-box!important;transition:transform 0.2s ease,box-shadow 0.2s ease!important;'
                ) + existing;
                var icon = btn.querySelector('i');
                if (icon) icon.style.setProperty('color', DANGER_BACKGROUND, 'important');
                return;
            }
            // Save button: same size as reference (90px min-width, 0.4rem 0.9rem, 2px border). Skip when hovered/focused.
            const isSaveButton = btn.closest('.progress-indicator-container') && btn.matches('[data-request="onSave"]');
            if (isSaveButton) {
                if (btn.matches(':hover') || document.activeElement === btn) return;
                if (btn.dataset.saveButtonSized) return;
                btn.dataset.saveButtonSized = '1';
                const existing = btn.getAttribute('style') || '';
                btn.style.cssText = (
                    'display:inline-flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;' +
                    'padding:' + PRIMARY_BUTTON_PADDING + '!important;min-width:' + PRIMARY_MIN_WIDTH + '!important;width:auto!important;' +
                    'height:' + BUTTON_MIN_HEIGHT + '!important;min-height:' + BUTTON_MIN_HEIGHT + '!important;line-height:1.3!important;' +
                    'border-radius:' + BUTTON_BORDER_RADIUS + '!important;font-weight:' + BUTTON_FONT_WEIGHT + '!important;' +
                    'background:' + PRIMARY_BACKGROUND + '!important;background-color:' + PRIMARY_SOLID_BACKGROUND + '!important;' +
                    'border:2px solid ' + PRIMARY_BORDER + '!important;color:' + PRIMARY_TEXT_COLOR + '!important;' +
                    'box-shadow:0 4px 15px rgba(31, 43, 58, 0.35)!important;box-sizing:border-box!important;'
                ) + existing;
                return;
            }
            // Toolbar primary (e.g. "New" on list pages): same size and style as Save (90px, 0.4rem 0.9rem, 2px border).
            const isToolbarPrimary = btn.closest('.progress-indicator-container') && btn.matches('.btn-primary') && !btn.matches('[data-request="onSave"]');
            if (isToolbarPrimary) {
                if (btn.matches(':hover') || document.activeElement === btn) return;
                if (btn.dataset.toolbarPrimarySized) return;
                btn.dataset.toolbarPrimarySized = '1';
                const existing = btn.getAttribute('style') || '';
                btn.style.cssText = (
                    'display:inline-flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;' +
                    'padding:' + PRIMARY_BUTTON_PADDING + '!important;min-width:' + PRIMARY_MIN_WIDTH + '!important;width:auto!important;' +
                    'height:' + BUTTON_MIN_HEIGHT + '!important;min-height:' + BUTTON_MIN_HEIGHT + '!important;line-height:1.3!important;' +
                    'border-radius:' + BUTTON_BORDER_RADIUS + '!important;font-weight:' + BUTTON_FONT_WEIGHT + '!important;' +
                    'background:' + PRIMARY_BACKGROUND + '!important;background-color:' + PRIMARY_SOLID_BACKGROUND + '!important;' +
                    'border:2px solid ' + PRIMARY_BORDER + '!important;color:' + PRIMARY_TEXT_COLOR + '!important;' +
                    'box-shadow:0 4px 15px rgba(31, 43, 58, 0.35)!important;box-sizing:border-box!important;' +
                    'transition:transform 0.2s ease,box-shadow 0.2s ease!important;'
                ) + existing;
                return;
            }
            // Toolbar default/ice (e.g. Combo, POS Devices List): same size as primary (90px, 0.4rem 0.9rem), ice style. Exclude Delete (handled above).
            const isToolbarDefault = btn.closest('.progress-indicator-container') && !btn.matches('[data-request="onDelete"]') && (btn.matches('.btn-default') || (btn.matches('.btn') && !btn.matches('.btn-primary') && !btn.matches('.btn-outline-secondary')));
            if (isToolbarDefault) {
                if (btn.matches(':hover') || document.activeElement === btn) return;
                if (btn.dataset.toolbarDefaultSized) return;
                btn.dataset.toolbarDefaultSized = '1';
                const existing = btn.getAttribute('style') || '';
                btn.style.cssText = (
                    'display:inline-flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;' +
                    'padding:' + PRIMARY_BUTTON_PADDING + '!important;min-width:' + PRIMARY_MIN_WIDTH + '!important;width:auto!important;' +
                    'height:' + BUTTON_MIN_HEIGHT + '!important;min-height:' + BUTTON_MIN_HEIGHT + '!important;line-height:1.3!important;' +
                    'border-radius:' + BUTTON_BORDER_RADIUS + '!important;font-weight:' + BUTTON_FONT_WEIGHT + '!important;' +
                    'background:' + ICE_BACKGROUND + '!important;background-color:' + ICE_BACKGROUND + '!important;' +
                    'border:2px solid ' + ICE_BORDER + '!important;color:' + ICE_TEXT_COLOR + '!important;' +
                    'box-shadow:none!important;box-sizing:border-box!important;transition:transform 0.2s ease,box-shadow 0.2s ease!important;'
                ) + existing;
                return;
            }
            // ALL other buttons get full palette including dimensions
            btn.style.setProperty('padding', BUTTON_PADDING, 'important');
            btn.style.setProperty('border-radius', BUTTON_BORDER_RADIUS, 'important');
            btn.style.setProperty('font-weight', BUTTON_FONT_WEIGHT, 'important');
            btn.style.setProperty('display', 'inline-flex', 'important');
            btn.style.setProperty('align-items', 'center', 'important');
            btn.style.setProperty('justify-content', 'center', 'important');
            btn.style.setProperty('min-height', BUTTON_MIN_HEIGHT, 'important');
            btn.style.setProperty('height', BUTTON_MIN_HEIGHT, 'important');
            btn.style.setProperty('line-height', '1.3', 'important');
            btn.style.setProperty('width', 'auto', 'important');

            if (btn.matches(':not(:first-child)')) {
                btn.style.setProperty('background', ICE_BACKGROUND, 'important');
                btn.style.setProperty('background-color', ICE_BACKGROUND, 'important');
                btn.style.setProperty('color', ICE_TEXT_COLOR, 'important');
                btn.style.setProperty('border', `1px solid ${ICE_BORDER}`, 'important');
                btn.style.setProperty('box-shadow', 'none', 'important');
            } else {
                btn.style.setProperty('background', PRIMARY_BACKGROUND, 'important');
                btn.style.setProperty('background-color', PRIMARY_SOLID_BACKGROUND, 'important');
                btn.style.setProperty('border', `1px solid ${PRIMARY_BORDER}`, 'important');
                btn.style.setProperty('color', PRIMARY_TEXT_COLOR, 'important');
                btn.style.setProperty('box-shadow', '0 4px 15px rgba(31, 43, 58, 0.3)', 'important');
            }
        });
    }

    // Function to break the connection between buttons and select boxes
    function breakConnection() {
        // Find all buttons that might be connected to select functionality
        const allButtons = document.querySelectorAll('button, .btn, a[role="button"]');
        
        console.log(`Found ${allButtons.length} total buttons to fix`);
        
        allButtons.forEach((btn, index) => {
            // EXCLUDE ALL media manager buttons - they have their own styling
            const isMediaManagerButton = btn.closest('.media-toolbar') || 
                                        btn.closest('#mediamanager-toolbar') || 
                                        btn.closest('.media-manager');
            if (isMediaManagerButton) {
                return; // Skip media manager buttons completely
            }
            // EXCLUDE rich editor toolbar - dropdowns need Bootstrap structure, z-index can break them
            if (btn.closest('.note-toolbar') || btn.closest('.note-editor')) {
                return;
            }
            
            // EXCLUDE settings card links - they need block display for proper card layout
            const isSettingsCardLink = btn.matches('.settings-card-link') || 
                                      btn.closest('.settings-card-link') ||
                                      btn.classList.contains('settings-card-link') ||
                                      (btn.tagName === 'A' && btn.href && (btn.href.includes('/admin/settings/edit/') || btn.href.includes('/admin/settings'))) ||
                                      (btn.tagName === 'A' && btn.classList.contains('text-reset') && btn.querySelector('.card'));
            if (isSettingsCardLink) {
                // Ensure it stays block display
                btn.style.setProperty('display', 'block', 'important');
                return; // Skip settings card links - they need block display
            }
            
            // EXCLUDE Save/Back and all toolbar buttons (primary + default) - they need inline-flex for text/icon centering
            const isSaveOrBackButton = btn.matches('[data-request="onSave"]') ||
                                     (btn.closest('.progress-indicator-container') && 
                                      (btn.matches('.btn-primary[data-request="onSave"]') || 
                                       btn.matches('.btn-outline-secondary') ||
                                       btn.matches('.btn-primary') ||
                                       btn.matches('.btn-default')));
            
            // EXCLUDE filter/setup buttons - they need inline-flex for icon centering
            const isFilterOrSetupButton = btn.matches('[data-toggle="list-filter"]') ||
                                        btn.matches('button[data-bs-toggle="modal"][data-bs-target*="setup-modal"]') ||
                                        (btn.closest('.list-setup') && btn.matches('.btn')) ||
                                        btn.matches('.btn-outline-default.btn-sm.border-none');
            
            // EXCLUDE History button in notification panel - needs inline-flex for text centering
            const isHistoryButton = btn.id === 'notif-history-link' || 
                                   (btn.matches('#notif-history-link') && btn.closest('#notification-panel'));
            
            // Kitchendisplay/KDS open button: center the icon (inline-flex + align center)
            const isKitchendisplayButton = btn.tagName === 'A' && btn.href && btn.href.indexOf('kitchendisplay') !== -1;
            if (isKitchendisplayButton) {
                btn.style.setProperty('display', 'inline-flex', 'important');
                btn.style.setProperty('align-items', 'center', 'important');
                btn.style.setProperty('justify-content', 'center', 'important');
                btn.style.setProperty('text-align', 'center', 'important');
            }
            
            // FORCE buttons to work independently
            btn.style.setProperty('pointer-events', 'auto', 'important');
            
            // Only set display to inline-block if NOT a Save/Back button AND NOT a filter/setup button AND NOT History button AND NOT kitchendisplay
            // Save/Back buttons, filter/setup buttons, and History button should keep inline-flex for proper text/icon centering
            if (!isSaveOrBackButton && !isFilterOrSetupButton && !isHistoryButton && !isKitchendisplayButton) {
                btn.style.setProperty('display', 'inline-block', 'important');
            }
            
            btn.style.setProperty('visibility', 'visible', 'important');
            btn.style.setProperty('opacity', '1', 'important');
            btn.style.setProperty('position', 'relative', 'important');
            btn.style.setProperty('z-index', '99999', 'important');
            
            // Remove any classes that might disable buttons
            btn.classList.remove('disabled', 'disabled', 'hide');
            
            // Override any disabled attributes
            btn.removeAttribute('disabled');
            btn.disabled = false;
            
            // Add click handler that ALWAYS works
            btn.addEventListener('click', function(e) {
                // Don't prevent default - let original functionality work
            }, true); // Use capture phase to override other handlers
            
            if (
                btn.classList.contains('btn-edit') ||
                btn.classList.contains('btn-outline-warning') ||
                btn.classList.contains('theme-action-btn') ||
                btn.matches('[data-request*="SetDefault"], [data-request*="onSetDefault"]')
            ) {
                restyleIceActionButton(btn);
            }

        });
        console.log('✅ Connection broken for', allButtons.length, 'buttons - they should work independently now');
        
        // Also fix any parent containers that might be blocking
        const containers = document.querySelectorAll('.list-filter, .filter-toolbar, .toolbar, .content-wrapper');
        containers.forEach(container => {
            container.style.setProperty('pointer-events', 'auto', 'important');
            container.style.setProperty('position', 'relative', 'important');
            container.style.setProperty('z-index', '1', 'important');
        });
        
        // Override any JavaScript that might be disabling buttons (no per-click log to reduce console spam)
        window.addEventListener('click', function(e) {
            if (e.target.tagName === 'BUTTON' || e.target.classList.contains('btn')) {
                // Don't prevent the event
            }
        }, true);

        applyToolbarButtonPalette();
    }
    
    /** Ensure toolbar order: left = 1 Back, 2 New, 3 Save; right = all other buttons. */
    function sortToolbarLeftRight() {
        const containers = document.querySelectorAll('.toolbar-action .progress-indicator-container, .progress-indicator-container');
        containers.forEach(function(cont) {
            if (cont.closest('.media-toolbar') || cont.closest('.media-manager')) return;
            const children = Array.from(cont.children);
            if (children.length === 0) return;

            function isBack(el) {
                return el.classList && el.classList.contains('btn-outline-secondary');
            }
            function isSave(el) {
                if (el.getAttribute && el.getAttribute('data-request') === 'onSave') return true;
                if (el.querySelector && el.querySelector('[data-request="onSave"]')) return true;
                return false;
            }
            function isNew(el) {
                if (el.tagName === 'A' && el.classList && el.classList.contains('btn-primary') && el.getAttribute('href') && el.getAttribute('href').indexOf('create') !== -1) return true;
                if (el.querySelector && el.querySelector('a.btn-primary[href*="create"]')) return true;
                return false;
            }

            const back = [], newBtn = [], save = [], right = [];
            children.forEach(function(c) {
                if (isBack(c)) back.push(c);
                else if (isNew(c)) newBtn.push(c);
                else if (isSave(c)) save.push(c);
                else right.push(c);
            });

            const desiredOrder = back.concat(newBtn).concat(save).concat(right);
            let same = true;
            for (let i = 0; i < children.length; i++) {
                if (children[i] !== desiredOrder[i]) { same = false; break; }
            }
            if (same) return;

            desiredOrder.forEach(function(node) {
                cont.appendChild(node);
            });
        });
    }

    // Function to group New and Combo buttons together on the left side (other pages that need it). NOT used on menus page – menus use New left, Combo right.
    function groupComboAndAllergensButtons(progressContainer) {
        // Menus page: do NOT group both on the left; applyMenusToolbarLayout will put New left, Combo right.
        const isMenusPage = window.location.pathname.includes('/admin/menus') && !window.location.pathname.includes('/admin/menus/create') && !window.location.pathname.includes('/admin/menus/edit');
        if (isMenusPage) {
            return;
        }
        // Combos list page: only has Back + New; do not group (would match same button as both "New" and "Combo" and put New before Back).
        const isCombosListPage = window.location.pathname.includes('/admin/combos') && !window.location.pathname.includes('/admin/combos/create') && !window.location.pathname.includes('/admin/combos/edit');
        if (isCombosListPage) {
            return;
        }
        
        // Check if grouping container already exists
        let newComboGroupContainer = document.getElementById('new-combo-group');
        if (newComboGroupContainer) {
            return; // Already grouped
        }
        
        // Find New button (btn-primary with href contains 'menus/create' or 'create')
        const newButton = progressContainer.querySelector('a[href*="menus/create"].btn-primary, a[href*="/create"].btn-primary, .btn-primary[href*="create"]');
        
        // Find Combo button (href contains 'combos') - must be a different button (e.g. "Combos" link on menus page)
        const comboButton = progressContainer.querySelector('a[href*="combos"].btn-default, a[href*="combos"]');
        
        if (!newButton || !comboButton) {
            return; // Buttons not found, skip grouping
        }
        // Same element (e.g. combos list has one "New" link with href combos/create) – do not group or we put New before Back.
        if (newButton === comboButton) {
            return;
        }
        
        // Check if buttons are already grouped
        const newParent = newButton.parentElement;
        const comboParent = comboButton.parentElement;
        if (newParent === comboParent && newParent.id === 'new-combo-group') {
            return; // Already grouped
        }
        
        // Create container for New and Combo buttons (left side)
        newComboGroupContainer = document.createElement('div');
        newComboGroupContainer.id = 'new-combo-group';
        newComboGroupContainer.style.display = 'flex';
        newComboGroupContainer.style.alignItems = 'center';
        newComboGroupContainer.style.gap = '10px';
        newComboGroupContainer.style.marginLeft = '0';
        newComboGroupContainer.style.marginRight = 'auto';
        
        // Move New button into the container (only if not already in the group)
        if (newButton.parentElement !== newComboGroupContainer) {
            newComboGroupContainer.appendChild(newButton);
        }
        
        // Move Combo button into the container (only if not already in the group)
        if (comboButton.parentElement !== newComboGroupContainer) {
            newComboGroupContainer.appendChild(comboButton);
        }
        
        // Insert the container at the beginning of progress container (left side)
        progressContainer.insertBefore(newComboGroupContainer, progressContainer.firstChild);
        
        console.log('✅ Grouped New and Combo buttons together on the left side');
    }
    
    /** Combos list page: Back left, then New in btn-group (same layout as locations/create). */
    function applyCombosToolbarLayout() {
        const path = window.location.pathname || '';
        if (path.indexOf('/admin/combos') === -1 || path.indexOf('/admin/combos/create') !== -1 || path.indexOf('/admin/combos/edit') !== -1) return;
        const toolbar = document.querySelector('#toolbar') || document.querySelector('.toolbar') || document.querySelector('.list-toolbar');
        if (!toolbar) return;
        const progressContainer = toolbar.querySelector('.toolbar-action .progress-indicator-container');
        if (!progressContainer) return;
        if (progressContainer.dataset.combosLayoutApplied === '1') return;
        const backBtn = progressContainer.querySelector('a.btn-outline-secondary[href*="menus"]');
        const newBtn = progressContainer.querySelector('a.btn-primary[href*="combos/create"]');
        if (!backBtn || !newBtn) return;
        // Ensure order: Back first, then New
        if (progressContainer.firstChild !== backBtn) {
            progressContainer.insertBefore(backBtn, progressContainer.firstChild);
        }
        // Wrap New button in .btn-group to match locations/create (Save in btn-group)
        if (!newBtn.closest('.btn-group')) {
            const btnGroup = document.createElement('div');
            btnGroup.className = 'btn-group';
            newBtn.parentNode.insertBefore(btnGroup, newBtn);
            btnGroup.appendChild(newBtn);
        }
        progressContainer.style.display = 'flex';
        progressContainer.style.flexDirection = 'row';
        progressContainer.style.alignItems = 'center';
        progressContainer.style.gap = '10px';
        progressContainer.style.width = '100%';
        progressContainer.dataset.combosLayoutApplied = '1';
    }

    /** Menus page: New on the left, Combo on the right (like other list pages). Works with or without #new-combo-group. */
    function applyMenusToolbarLayout() {
        if (!window.location.pathname.includes('/admin/menus') || window.location.pathname.includes('/admin/menus/create') || window.location.pathname.includes('/admin/menus/edit')) return;
        const toolbar = document.querySelector('#toolbar') || document.querySelector('.toolbar') || document.querySelector('.list-toolbar');
        if (!toolbar) return;
        const progressContainer = toolbar.querySelector('.toolbar-action .progress-indicator-container');
        if (!progressContainer) return;
        if (progressContainer.dataset.menusLayoutApplied === '1') return;
        var newBtn = progressContainer.querySelector('a[href*="menus/create"]');
        var comboBtn = progressContainer.querySelector('a[href*="combos"]');
        if (!newBtn || !comboBtn) return;
        var newComboGroup = document.getElementById('new-combo-group');
        if (newComboGroup) {
            newComboGroup.remove();
        }
        progressContainer.insertBefore(newBtn, progressContainer.firstChild);
        var rightGroup = document.createElement('div');
        rightGroup.className = 'toolbar-menus-right';
        rightGroup.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-left: auto;';
        progressContainer.insertBefore(rightGroup, newBtn.nextSibling);
        rightGroup.appendChild(comboBtn);
        progressContainer.style.justifyContent = 'flex-start';
        progressContainer.style.display = 'flex';
        progressContainer.style.flexDirection = 'row';
        progressContainer.style.width = '100%';
        progressContainer.style.alignItems = 'center';
        progressContainer.classList.add('toolbar-menus-layout');
        progressContainer.dataset.menusLayoutApplied = '1';
    }
    
    /** Mail templates / partials / layouts: one button left (New), other two section links grouped on the right. Works on all three pages. */
    function applyMailTemplatesToolbarLayout() {
        const path = window.location.pathname || '';
        if (path.indexOf('mail_templates') === -1 && path.indexOf('mail_partials') === -1 && path.indexOf('mail_layouts') === -1) return;
        const toolbar = document.querySelector('#toolbar') || document.querySelector('.toolbar') || document.querySelector('.list-toolbar');
        if (!toolbar) return;
        const progressContainer = toolbar.querySelector('.toolbar-action .progress-indicator-container');
        if (!progressContainer) return;
        if (progressContainer.dataset.mailTemplatesLayoutApplied === '1') return;
        const newBtn = progressContainer.querySelector('a[href*="mail_templates/create"], a[href*="mail_partials/create"], a[href*="mail_layouts/create"]');
        const sectionLinks = progressContainer.querySelectorAll('a.btn[href*="mail_templates"], a.btn[href*="mail_partials"], a.btn[href*="mail_layouts"]');
        const rightBtns = [];
        sectionLinks.forEach(function(a) {
            if (a === newBtn) return;
            if (a.href && (a.href.indexOf('/create') !== -1)) return;
            rightBtns.push(a);
        });
        if (!newBtn || rightBtns.length !== 2) return;
        var rightGroup = document.createElement('div');
        rightGroup.className = 'toolbar-mail-templates-right';
        rightGroup.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-left: auto;';
        progressContainer.insertBefore(rightGroup, rightBtns[0]);
        rightGroup.appendChild(rightBtns[0]);
        rightGroup.appendChild(rightBtns[1]);
        progressContainer.style.justifyContent = 'flex-start';
        progressContainer.classList.add('toolbar-mail-templates-layout');
        progressContainer.dataset.mailTemplatesLayoutApplied = '1';
    }
    
    /** Staffs page: one button left (New), Groups + Roles grouped on the right. Runs on init so it applies even when there is no bulk row. */
    function applyStaffsToolbarLayout() {
        const toolbar = document.querySelector('#toolbar') || document.querySelector('.toolbar') || document.querySelector('.list-toolbar');
        if (!toolbar) return;
        const progressContainer = toolbar.querySelector('.toolbar-action .progress-indicator-container');
        if (!progressContainer) return;
        const newBtn = progressContainer.querySelector('a[href*="staffs/create"]');
        const groupsBtn = progressContainer.querySelector('a[href*="staff_groups"]');
        const rolesBtn = progressContainer.querySelector('a[href*="staff_roles"]');
        if (!newBtn || !groupsBtn || !rolesBtn) return;
        if (progressContainer.dataset.staffsLayoutApplied === '1') return;
        var rightGroup = document.createElement('div');
        rightGroup.className = 'toolbar-staffs-right';
        rightGroup.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-left: auto;';
        progressContainer.insertBefore(rightGroup, groupsBtn);
        rightGroup.appendChild(groupsBtn);
        rightGroup.appendChild(rolesBtn);
        progressContainer.style.justifyContent = 'flex-start';
        progressContainer.classList.add('toolbar-staffs-layout');
        progressContainer.dataset.staffsLayoutApplied = '1';
    }
    
    /** System Logs page: Refresh on left, Empty Logs + Request Logs grouped on the right. Runs on init. */
    function applySystemLogsToolbarLayout() {
        const toolbar = document.querySelector('#toolbar') || document.querySelector('.toolbar') || document.querySelector('.list-toolbar');
        if (!toolbar) return;
        const progressContainer = toolbar.querySelector('.toolbar-action .progress-indicator-container');
        if (!progressContainer) return;
        const refreshBtn = progressContainer.querySelector('a[href*="system_logs"]');
        const emptyBtn = progressContainer.querySelector('[data-request="onEmptyLog"], [data-request*="onEmptyLog"]');
        const requestLogsBtn = progressContainer.querySelector('a[href*="request_logs"]');
        if (!refreshBtn || !emptyBtn || !requestLogsBtn) return;
        if (progressContainer.dataset.systemLogsLayoutApplied === '1') return;
        if (progressContainer.firstChild !== refreshBtn) {
            progressContainer.insertBefore(refreshBtn, progressContainer.firstChild);
        }
        var rightGroup = document.createElement('div');
        rightGroup.className = 'toolbar-system-logs-right';
        rightGroup.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-left: auto;';
        progressContainer.insertBefore(rightGroup, emptyBtn);
        rightGroup.appendChild(emptyBtn);
        rightGroup.appendChild(requestLogsBtn);
        progressContainer.style.justifyContent = 'flex-start';
        progressContainer.style.display = 'flex';
        progressContainer.style.width = '100%';
        progressContainer.style.alignItems = 'center';
        progressContainer.classList.add('toolbar-system-logs-layout');
        progressContainer.dataset.systemLogsLayoutApplied = '1';
        refreshBtn.style.setProperty('margin-left', '0', 'important');
        refreshBtn.style.setProperty('margin-right', '0', 'important');
    }
    
    /** Languages edit page: Check for updates + Delete on the right, both styled ice/white. Runs on init. */
    function applyLanguagesEditToolbarLayout() {
        const toolbar = document.querySelector('#toolbar') || document.querySelector('.toolbar') || document.querySelector('.list-toolbar');
        if (!toolbar) return;
        const progressContainer = toolbar.querySelector('.toolbar-action .progress-indicator-container');
        if (!progressContainer) return;
        const checkBtn = progressContainer.querySelector('[data-handler="onCheckUpdates"]');
        const deleteBtn = progressContainer.querySelector('[data-request="onDelete"]');
        if (!checkBtn || !deleteBtn) return;
        if (progressContainer.dataset.languagesEditLayoutApplied === '1') return;
        var rightGroup = document.createElement('div');
        rightGroup.className = 'toolbar-languages-edit-right';
        rightGroup.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-left: auto;';
        progressContainer.insertBefore(rightGroup, checkBtn);
        rightGroup.appendChild(checkBtn);
        rightGroup.appendChild(deleteBtn);
        progressContainer.style.justifyContent = 'flex-start';
        progressContainer.classList.add('toolbar-languages-edit-layout');
        progressContainer.dataset.languagesEditLayoutApplied = '1';
        restyleIceActionButton(checkBtn);
        restyleIceActionButton(deleteBtn);
        [checkBtn, deleteBtn].forEach(function(btn) {
            btn.style.setProperty('padding', BUTTON_PADDING, 'important');
            btn.style.setProperty('min-height', BUTTON_MIN_HEIGHT, 'important');
            btn.style.setProperty('border-radius', BUTTON_BORDER_RADIUS, 'important');
            btn.classList.add('btn-default');
        });
        checkBtn.classList.remove('btn-success');
        deleteBtn.classList.remove('btn-danger', 'text-danger');
        function applyIceNoHoverChange(btn) {
            btn.style.setProperty('padding', BUTTON_PADDING, 'important');
            btn.style.setProperty('min-height', BUTTON_MIN_HEIGHT, 'important');
            btn.style.setProperty('border-radius', BUTTON_BORDER_RADIUS, 'important');
            btn.style.setProperty('background', ICE_BACKGROUND, 'important');
            btn.style.setProperty('background-color', ICE_BACKGROUND, 'important');
            btn.style.setProperty('border', '2px solid ' + ICE_BORDER, 'important');
            btn.style.setProperty('color', ICE_TEXT_COLOR, 'important');
            btn.style.setProperty('box-shadow', 'none', 'important');
            btn.style.setProperty('transform', 'none', 'important');
            var icon = btn.querySelector('i');
            if (icon) icon.style.setProperty('color', ICE_TEXT_COLOR, 'important');
        }
        [checkBtn, deleteBtn].forEach(function(btn) {
            btn.addEventListener('mouseenter', function() { applyIceNoHoverChange(btn); });
            btn.addEventListener('mouseleave', function() { applyIceNoHoverChange(btn); });
            btn.addEventListener('focus', function() { applyIceNoHoverChange(btn); });
            btn.addEventListener('blur', function() { applyIceNoHoverChange(btn); });
        });
        setTimeout(function() {
            restyleIceActionButton(checkBtn);
            restyleIceActionButton(deleteBtn);
            [checkBtn, deleteBtn].forEach(function(btn) {
                applyIceNoHoverChange(btn);
            });
        }, 200);
    }
    
    /** Mail templates edit page: Send test message + Delete grouped on the right. Runs on init. */
    function applyMailTemplatesEditToolbarLayout() {
        if (!window.location.pathname.includes('mail_templates/edit')) return;
        const toolbar = document.querySelector('#toolbar') || document.querySelector('.toolbar') || document.querySelector('.list-toolbar');
        if (!toolbar) return;
        const progressContainer = toolbar.querySelector('.toolbar-action .progress-indicator-container');
        if (!progressContainer) return;
        const testMessageBtn = progressContainer.querySelector('[data-request="onTestTemplate"]');
        const deleteBtn = progressContainer.querySelector('[data-request="onDelete"]');
        if (!testMessageBtn && !deleteBtn) return;
        if (progressContainer.dataset.mailTemplatesEditLayoutApplied === '1') return;
        var rightGroup = document.createElement('div');
        rightGroup.className = 'toolbar-mail-templates-edit-right';
        rightGroup.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-left: auto;';
        var firstRight = testMessageBtn || deleteBtn;
        progressContainer.insertBefore(rightGroup, firstRight);
        if (testMessageBtn) rightGroup.appendChild(testMessageBtn);
        if (deleteBtn) rightGroup.appendChild(deleteBtn);
        progressContainer.style.justifyContent = 'flex-start';
        progressContainer.style.display = 'flex';
        progressContainer.style.width = '100%';
        progressContainer.style.alignItems = 'center';
        progressContainer.classList.add('toolbar-mail-templates-edit-layout');
        progressContainer.dataset.mailTemplatesEditLayoutApplied = '1';
    }
    
    /** Staffs edit page: Delete (and Impersonate if present) on the right. Runs on init. */
    function applyStaffsEditToolbarLayout() {
        if (!window.location.pathname.includes('staffs/edit')) return;
        const toolbar = document.querySelector('#toolbar') || document.querySelector('.toolbar') || document.querySelector('.list-toolbar');
        if (!toolbar) return;
        const progressContainer = toolbar.querySelector('.toolbar-action .progress-indicator-container');
        if (!progressContainer) return;
        const deleteBtn = progressContainer.querySelector('[data-request="onDelete"]');
        const impersonateBtn = progressContainer.querySelector('[data-request="onImpersonate"]');
        if (!deleteBtn && !impersonateBtn) return;
        if (progressContainer.dataset.staffsEditLayoutApplied === '1') return;
        var rightGroup = document.createElement('div');
        rightGroup.className = 'toolbar-staffs-edit-right';
        rightGroup.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-left: auto;';
        var firstRight = progressContainer.querySelector('[data-request="onImpersonate"], [data-request="onDelete"]');
        progressContainer.insertBefore(rightGroup, firstRight);
        if (impersonateBtn) rightGroup.appendChild(impersonateBtn);
        if (deleteBtn) rightGroup.appendChild(deleteBtn);
        progressContainer.style.justifyContent = 'flex-start';
        progressContainer.style.display = 'flex';
        progressContainer.style.width = '100%';
        progressContainer.style.alignItems = 'center';
        progressContainer.classList.add('toolbar-staffs-edit-layout');
        progressContainer.dataset.staffsEditLayoutApplied = '1';
    }
    
    /** POS configs edit page: Back + Save on the left, all other buttons (Delete, Test Integration, Sync Menu, Register Webhook) on the right. */
    function applyPosConfigsEditToolbarLayout() {
        if (!window.location.pathname.includes('pos_configs/edit')) return;
        const toolbar = document.querySelector('#toolbar') || document.querySelector('.toolbar') || document.querySelector('.list-toolbar');
        if (!toolbar) return;
        const progressContainer = toolbar.querySelector('.toolbar-action .progress-indicator-container');
        if (!progressContainer) return;
        const children = Array.from(progressContainer.children);
        if (children.length < 3) return;
        if (progressContainer.dataset.posConfigsEditLayoutApplied === '1') return;
        var rightGroup = document.createElement('div');
        rightGroup.className = 'toolbar-pos-configs-edit-right';
        rightGroup.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-left: auto; flex-wrap: wrap;';
        var toMove = [];
        for (var i = 2; i < children.length; i++) {
            var el = children[i];
            if (el.tagName === 'INPUT' && el.type === 'hidden') continue;
            if (el.tagName === 'SCRIPT') continue;
            if (el.nodeType !== 1) continue;
            toMove.push(el);
        }
        if (toMove.length === 0) return;
        progressContainer.insertBefore(rightGroup, toMove[0]);
        toMove.forEach(function(el) { rightGroup.appendChild(el); });
        progressContainer.style.justifyContent = 'flex-start';
        progressContainer.style.display = 'flex';
        progressContainer.style.width = '100%';
        progressContainer.style.alignItems = 'center';
        progressContainer.style.flexWrap = 'wrap';
        progressContainer.classList.add('toolbar-pos-configs-edit-layout');
        progressContainer.dataset.posConfigsEditLayoutApplied = '1';
    }
    
    // Function to move bulk action buttons to toolbar
function moveBulkButtons() {
        // Find the bulk actions row first (needed for both normal and history synthetic toolbar)
        const bulkActionsRow = document.querySelector('tr.bulk-actions');
        if (!bulkActionsRow) {
            return;
        }
        
        const isVisible = !bulkActionsRow.classList.contains('hide');
        const bulkActionsCell = bulkActionsRow.querySelector('td.w-100');
        if (!bulkActionsCell) {
            return;
        }
        const buttonContainer = bulkActionsCell.querySelector('div');
        if (!buttonContainer) {
            return;
        }
        
        // Find the toolbar -> toolbar-action -> progress-indicator-container (like locations, etc.)
        let toolbar = document.querySelector('#toolbar') || document.querySelector('.toolbar') || document.querySelector('.list-toolbar') || document.querySelector('.content-wrapper .container-fluid');
        let toolbarAction = toolbar ? toolbar.querySelector('.toolbar-action') : null;
        let progressContainer = toolbarAction ? toolbarAction.querySelector('.progress-indicator-container') : null;
        
        // History page has no toolbar config: create synthetic one (same structure as platform list pages)
        if (!progressContainer && isHistoryPage) {
            const historyContent = document.querySelector('.history-page-content');
            if (!historyContent) {
                return;
            }
            let syn = document.getElementById('history-toolbar-synthetic');
            if (!syn) {
                syn = document.createElement('div');
                syn.id = 'history-toolbar-synthetic';
                syn.className = 'toolbar list-toolbar btn-toolbar';
                syn.style.cssText = 'padding-top: 0.75rem; padding-bottom: 0.5rem;';
                const ta = document.createElement('div');
                ta.className = 'toolbar-action';
                const pic = document.createElement('div');
                pic.className = 'progress-indicator-container';
                pic.style.cssText = 'display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%;';
                ta.appendChild(pic);
                syn.appendChild(ta);
                historyContent.insertBefore(syn, historyContent.firstChild);
            }
            toolbar = syn;
            toolbarAction = syn.querySelector('.toolbar-action');
            progressContainer = syn.querySelector('.progress-indicator-container');
        }
        
        if (!toolbar || !toolbarAction || !progressContainer) {
            return;
        }
        
        // Check if we already created our toolbar container
        let toolbarBulkContainer = document.getElementById('toolbar-bulk-container');
        
        if (!toolbarBulkContainer) {
            // Create a container for bulk buttons
            toolbarBulkContainer = document.createElement('div');
            toolbarBulkContainer.id = 'toolbar-bulk-container';
            toolbarBulkContainer.style.marginLeft = 'auto';
            toolbarBulkContainer.style.display = 'flex';
            toolbarBulkContainer.style.alignItems = 'center';
            toolbarBulkContainer.style.gap = '10px';
            
            // Insert it into the progress-indicator-container (not the toolbar)
            progressContainer.appendChild(toolbarBulkContainer);
            
            // Make the progress container use flexbox with space-between
            progressContainer.style.display = 'flex';
            progressContainer.style.flexDirection = 'row';
            progressContainer.style.justifyContent = 'space-between';
            progressContainer.style.alignItems = 'center';
            progressContainer.style.width = '100%';
            
            console.log('✅ Created toolbar bulk container');
        }
        
        // Group Combo and Allergens buttons together on the right side
        groupComboAndAllergensButtons(progressContainer);
        
        // History: always show Delete in toolbar. Other pages: only when bulk row visible (items selected).
        const alwaysShowBulk = isHistoryPage;
        const showBulk = alwaysShowBulk || isVisible;
        toolbarBulkContainer.style.display = showBulk ? 'flex' : 'none';
        
        // Menus page: when bulk actions are visible (row selected), hide the Combo button so only New + bulk buttons show.
        const isMenusListPage = window.location.pathname.includes('/admin/menus') && !window.location.pathname.includes('/admin/menus/create') && !window.location.pathname.includes('/admin/menus/edit');
        if (isMenusListPage) {
            // Hide wrapper if present (from applyMenusToolbarLayout)
            const menusRight = progressContainer.querySelector('.toolbar-menus-right');
            if (menusRight) {
                menusRight.style.setProperty('display', showBulk ? 'none' : 'flex', 'important');
            }
            // Also hide the Combo link directly (in case DOM order differs or wrapper is recreated)
            const comboLink = progressContainer.querySelector('a[href*="combos"]:not([href*="create"])');
            if (comboLink) {
                comboLink.style.setProperty('display', showBulk ? 'none' : 'inline-flex', 'important');
            }
        }
        
        // If visible (or history), move the buttons
        if (showBulk) {
            // Move all buttons to our toolbar container, but only show specific ones
            while (buttonContainer.firstChild) {
                const button = buttonContainer.firstChild;
                
                // Check if this is the "Select all" button we want to HIDE
                const isSelectAll = button.classList && button.classList.contains('btn-select-all');
                const isCounterSpan = button.nodeType === Node.TEXT_NODE || (button.tagName === 'SPAN' && !button.classList.length);
                const isCounter = button.classList && button.classList.contains('btn-counter');
                const isDropdownWrapper = button.classList && button.classList.contains('dropdown');
                
                // HIDE only the "Select all" button
                if (isSelectAll || isCounter || isCounterSpan) {
                    button.remove();
                    continue;
                } else if (isDropdownWrapper) {
                    const menuItems = Array.from(button.querySelectorAll('.dropdown-menu .dropdown-item'));
                    menuItems.forEach((menuButton, index) => {
                        const clonedButton = menuButton.cloneNode(true);
                        clonedButton.classList.remove('dropdown-item', 'text-danger');
                        clonedButton.classList.add('btn');
                        clonedButton.setAttribute('type', 'button');
                        clonedButton.style.removeProperty('display');
                        clonedButton.style.removeProperty('visibility');
                        clonedButton.style.removeProperty('opacity');
                        clonedButton.style.removeProperty('position');
                        clonedButton.style.removeProperty('pointer-events');
                        clonedButton.style.marginLeft = index > 0 ? '8px' : '0';

                        restyleIceActionButton(clonedButton);

                        toolbarBulkContainer.appendChild(clonedButton);
                    });

                    button.remove();
                    continue;
                } else {
                    // Show all other buttons and style them
                    const isDeleteButton = button.textContent && button.textContent.toLowerCase().includes('delete') && 
                                          button.classList && button.classList.contains('text-danger') &&
                                          !button.classList.contains('dropdown-item');
                    const isEnableDisable = button.classList && button.classList.contains('dropdown-toggle');
                    
                    // Style the delete button
                    if (isDeleteButton) {
                        button.style.height = '38px';
                        button.style.display = 'flex';
                        button.style.alignItems = 'center';
                        button.style.padding = '0 15px';
                    }
                    
                    // Style the enable/disable dropdown button
                    if (isEnableDisable) {
                        // Remove the btn-light class that causes white background
                        button.classList.remove('btn-light');
                        
                        // Apply our custom styles
                        button.style.setProperty('height', '38px', 'important');
                        button.style.setProperty('display', 'flex', 'important');
                        button.style.setProperty('align-items', 'center', 'important');
                        button.style.setProperty('padding', '0 15px', 'important');
                        button.style.setProperty('background', 'linear-gradient(135deg, #1f2b3a 0%, #364a63 100%)', 'important'); // Same as New button
                        button.style.setProperty('background-color', '#1f2b3a', 'important');
                        button.style.setProperty('border', '2px solid #364a63', 'important');
                        button.style.setProperty('color', '#fff', 'important'); // White text
                        button.style.setProperty('border-radius', '12px', 'important');
                        button.style.setProperty('opacity', '1', 'important');
                        button.style.setProperty('visibility', 'visible', 'important');
                        button.style.setProperty('box-shadow', '0 4px 15px rgba(31, 43, 58, 0.3)', 'important');
                        
                        // Force remove any hover styles
                        button.addEventListener('mouseenter', function() {
                            this.style.setProperty('background', 'linear-gradient(135deg, #364a63 0%, #526484 100%)', 'important');
                            this.style.setProperty('background-color', '#364a63', 'important');
                            this.style.setProperty('color', '#fff', 'important');
                        });
                    }
                    
                    if (
                        button.classList.contains('btn-edit') ||
                        button.classList.contains('btn-outline-warning') ||
                        button.classList.contains('theme-action-btn') ||
                        button.matches('[data-request*="SetDefault"], [data-request*="onSetDefault"]')
                    ) {
                        restyleIceActionButton(button);
                    }

                    toolbarBulkContainer.appendChild(button);
                }
            }
            
            console.log('✅ Moved bulk buttons to toolbar (showing only counter and delete)');
        } else {
            // Move buttons back to original container
            while (toolbarBulkContainer.firstChild) {
                buttonContainer.appendChild(toolbarBulkContainer.firstChild);
            }
            
            console.log('✅ Moved bulk buttons back to original container');
        }

        applyToolbarButtonPalette();
    }
    
    // Run on page load
    function init() {
        // First break the connection between buttons and select boxes
        breakConnection();
        
        // Group Combo and Allergens buttons together (run independently)
        const toolbar = document.querySelector('.toolbar, #toolbar, .list-toolbar');
        if (toolbar) {
            const toolbarAction = toolbar.querySelector('.toolbar-action');
            if (toolbarAction) {
                const progressContainer = toolbarAction.querySelector('.progress-indicator-container');
                if (progressContainer) {
                    groupComboAndAllergensButtons(progressContainer);
                }
            }
        }
        
        moveBulkButtons();
        
        // Watch for changes to the bulk actions row
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    moveBulkButtons();
                }
            });
        });
        
        // Find the bulk actions row and observe it
        const bulkActionsRow = document.querySelector('tr.bulk-actions');
        if (bulkActionsRow) {
            observer.observe(bulkActionsRow, {
                attributes: true,
                attributeFilter: ['class']
            });
            
            console.log('✅ Observing bulk actions row for changes');
        }
        
        // Also observe the body for new bulk actions rows
        const bodyObserver = new MutationObserver(function(mutations) {
            // Skip processing if modal is open (prevents freeze)
            if (window.SKIP_EXPENSIVE_OBSERVERS || document.body.classList.contains('modal-open')) {
                return;
            }
            // Skip if mutation is inside a modal
            for (const mutation of mutations) {
                if (window.shouldSkipObserver && window.shouldSkipObserver(mutation)) {
                    return;
                }
                if (mutation.target.closest && mutation.target.closest('.modal')) {
                    return;
                }
            }
            const bulkActionsRow = document.querySelector('tr.bulk-actions');
            if (bulkActionsRow) {
                moveBulkButtons();
            }
        });
        
        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('✅ Observing body for new bulk actions rows');

        applyToolbarButtonPalette();
        forceToolbarPrimaryBlue();
        applyBackButtonHoverFix();
        applyToolbarPrimaryHoverFix();
        sortToolbarLeftRight();
        applyMailTemplatesToolbarLayout();
        applyStaffsToolbarLayout();
        applySystemLogsToolbarLayout();
        applyMenusToolbarLayout();
        applyCombosToolbarLayout();
        applyLanguagesEditToolbarLayout();
        applyMailTemplatesEditToolbarLayout();
        applyStaffsEditToolbarLayout();
        applyPosConfigsEditToolbarLayout();
        
        // Fix settings card links - ensure they stay block display
        fixSettingsCardLinks();
    }
    
    // Function to fix settings card links - remove inline display styles
    function fixSettingsCardLinks() {
        const settingsCardLinks = document.querySelectorAll('.settings-card-link, a[href*="/admin/settings/edit/"], a[href*="/admin/settings"][class*="text-reset"]');
        settingsCardLinks.forEach(link => {
            // Remove inline display style and force block
            link.style.removeProperty('display');
            link.style.setProperty('display', 'block', 'important');
            // Remove other problematic inline styles
            link.style.removeProperty('width');
            link.style.removeProperty('height');
            link.style.setProperty('width', '100%', 'important');
            link.style.setProperty('height', '100%', 'important');
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // IMPORTANT: Reinitialize when page content changes (after smooth transitions)
    document.addEventListener('pageContentLoaded', function() {
        console.log('🔄 Reinitializing bulk button alignment after page transition');
        breakConnection();
        setTimeout(function() {
            init();
            applyToolbarButtonPalette();
            forceToolbarPrimaryBlue();
            applyBackButtonHoverFix();
            applyToolbarPrimaryHoverFix();
            sortToolbarLeftRight();
            applyMailTemplatesToolbarLayout();
            applyStaffsToolbarLayout();
            applySystemLogsToolbarLayout();
            applyMenusToolbarLayout();
            applyCombosToolbarLayout();
            applyLanguagesEditToolbarLayout();
            applyMailTemplatesEditToolbarLayout();
            applyStaffsEditToolbarLayout();
            applyPosConfigsEditToolbarLayout();
            fixSettingsCardLinks();
        }, 100);
    });
    
    // Continuously monitor and fix settings card links
    setInterval(function() {
        fixSettingsCardLinks();
    }, 500);
    
    // Run once after short delay to catch dynamically loaded content (no extra applyToolbarButtonPalette - caused Save button vibration)
    setTimeout(function() {
        breakConnection();
        init();
        forceToolbarPrimaryBlue();
        applyBackButtonHoverFix();
        applyToolbarPrimaryHoverFix();
        sortToolbarLeftRight();
        applyMailTemplatesToolbarLayout();
        applyStaffsToolbarLayout();
        applySystemLogsToolbarLayout();
        applyMenusToolbarLayout();
        applyCombosToolbarLayout();
        applyLanguagesEditToolbarLayout();
        applyMailTemplatesEditToolbarLayout();
        applyStaffsEditToolbarLayout();
        applyPosConfigsEditToolbarLayout();
    }, 100);
})();
