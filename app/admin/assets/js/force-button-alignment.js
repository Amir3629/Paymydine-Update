/**
 * FORCE BUTTON ALIGNMENT
 * This script physically moves the bulk action buttons to the toolbar
 */

(function() {
    'use strict';
    
    const isThemeEditPage = window.location.pathname.includes('/admin/themes/edit');
    const isHistoryPage = window.location.pathname.includes('/admin/history');
    if (isThemeEditPage) {
        console.log('🔧 Force Button Alignment skipped on theme edit page');
        return;
    }
    console.log('🔧 Force Button Alignment initialized');
    
    const BUTTON_PADDING = '0.55rem 1.75rem';
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

    function applyToolbarButtonPalette() {
        const toolbarButtons = document.querySelectorAll('.toolbar-action .btn');

        toolbarButtons.forEach(btn => {
            // SKIP media manager buttons - they have their own styling
            if (btn.closest('.media-toolbar') || btn.closest('#mediamanager-toolbar') || btn.closest('.media-manager')) {
                return;
            }
            // ALL buttons get width: auto - including Save button (same as other working buttons)
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
            
            // EXCLUDE Save/Back buttons AND filter/setup buttons from display override - they need inline-flex
            const isSaveOrBackButton = btn.matches('[data-request="onSave"]') ||
                                     (btn.closest('.progress-indicator-container') && 
                                      (btn.matches('.btn-primary[data-request="onSave"]') || 
                                       btn.matches('.btn-outline-secondary')));
            
            // EXCLUDE filter/setup buttons - they need inline-flex for icon centering
            const isFilterOrSetupButton = btn.matches('[data-toggle="list-filter"]') ||
                                        btn.matches('button[data-bs-toggle="modal"][data-bs-target*="setup-modal"]') ||
                                        (btn.closest('.list-setup') && btn.matches('.btn')) ||
                                        btn.matches('.btn-outline-default.btn-sm.border-none');
            
            // EXCLUDE History button in notification panel - needs inline-flex for text centering
            const isHistoryButton = btn.id === 'notif-history-link' || 
                                   (btn.matches('#notif-history-link') && btn.closest('#notification-panel'));
            
            // FORCE buttons to work independently
            btn.style.setProperty('pointer-events', 'auto', 'important');
            
            // Only set display to inline-block if NOT a Save/Back button AND NOT a filter/setup button AND NOT History button
            // Save/Back buttons, filter/setup buttons, and History button should keep inline-flex for proper text/icon centering
            if (!isSaveOrBackButton && !isFilterOrSetupButton && !isHistoryButton) {
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
                console.log('Button clicked (connection broken):', this.textContent.trim());
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

            console.log(`✅ Broke connection for button ${index + 1}: "${btn.textContent.trim()}"`);
        });
        
        // Also fix any parent containers that might be blocking
        const containers = document.querySelectorAll('.list-filter, .filter-toolbar, .toolbar, .content-wrapper');
        containers.forEach(container => {
            container.style.setProperty('pointer-events', 'auto', 'important');
            container.style.setProperty('position', 'relative', 'important');
            container.style.setProperty('z-index', '1', 'important');
        });
        
        // Override any JavaScript that might be disabling buttons
        window.addEventListener('click', function(e) {
            if (e.target.tagName === 'BUTTON' || e.target.classList.contains('btn')) {
                console.log('Click event captured - button should work');
                // Don't prevent the event
            }
        }, true);
        
        console.log('✅ Connection broken - buttons should work independently now!');

        applyToolbarButtonPalette();
    }
    
    // Function to group New and Combo buttons together on the left side (menus page)
    function groupComboAndAllergensButtons(progressContainer) {
        // Check if we're on the menus page
        const isMenusPage = window.location.pathname.includes('/admin/menus') && !window.location.pathname.includes('/admin/menus/create') && !window.location.pathname.includes('/admin/menus/edit');
        
        if (!isMenusPage) {
            return; // Only run on menus index page
        }
        
        // Check if grouping container already exists
        let newComboGroupContainer = document.getElementById('new-combo-group');
        if (newComboGroupContainer) {
            return; // Already grouped
        }
        
        // Find New button (btn-primary with href contains 'menus/create' or 'create')
        const newButton = progressContainer.querySelector('a[href*="menus/create"].btn-primary, a[href*="/create"].btn-primary, .btn-primary[href*="create"]');
        
        // Find Combo button (href contains 'combos')
        const comboButton = progressContainer.querySelector('a[href*="combos"].btn-default, a[href*="combos"]');
        
        if (!newButton || !comboButton) {
            return; // Buttons not found, skip grouping
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
        breakConnection(); // Break connection first
        setTimeout(function() {
            init();
            applyToolbarButtonPalette();
            fixSettingsCardLinks(); // Fix settings cards after reinit
        }, 100);
    });
    
    // Continuously monitor and fix settings card links
    setInterval(function() {
        fixSettingsCardLinks();
    }, 500);
    
    // Run once after a short delay to catch dynamically loaded content
    setTimeout(function() {
        breakConnection();
        applyToolbarButtonPalette();
    }, 100);

    setTimeout(function() {
        init();
        applyToolbarButtonPalette();
    }, 500);
})();
