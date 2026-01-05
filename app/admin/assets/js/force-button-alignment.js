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
    if (isHistoryPage) {
        console.log('🔧 Force Button Alignment: Fixing delete button position on history page');
        // Fix delete button position - CSS should handle it, but ensure it's at top: 63px
        function fixHistoryDeleteButton() {
            const deleteBtn = document.querySelector('.history-page-content button[data-control="bulk-action"].text-danger');
            if (deleteBtn) {
                const currentTop = deleteBtn.getBoundingClientRect().top;
                // Match position on other pages - moved down a bit from 63px
                const targetTop = 75;
                
                // Check if button is not at correct position (allow 2px tolerance)
                if (Math.abs(currentTop - targetTop) > 2) {
                    // Parent has transform/filter creating positioning context - need to break out
                    // Remove transforms from all parent containers that could affect fixed positioning
                    let parent = deleteBtn.parentElement;
                    let foundTransformContext = false;
                    
                    while (parent && parent !== document.body) {
                        const style = window.getComputedStyle(parent);
                        
                        // Check for properties that create new positioning context for fixed elements
                        if (style.transform !== 'none' || 
                            style.filter !== 'none' || 
                            style.perspective !== 'none' || 
                            style.willChange !== 'auto' ||
                            style.isolation === 'isolate') {
                            foundTransformContext = true;
                            // Remove transform to break the positioning context
                            if (style.transform !== 'none') {
                                parent.style.setProperty('transform', 'none', 'important');
                            }
                            if (style.filter !== 'none') {
                                parent.style.setProperty('filter', 'none', 'important');
                            }
                            if (style.perspective !== 'none') {
                                parent.style.setProperty('perspective', 'none', 'important');
                            }
                        }
                        parent = parent.parentElement;
                    }
                    
                    // Force button position with inline styles
                    deleteBtn.style.setProperty('position', 'fixed', 'important');
                    deleteBtn.style.setProperty('top', targetTop + 'px', 'important');
                    deleteBtn.style.setProperty('right', '20px', 'important');
                    deleteBtn.style.setProperty('left', 'auto', 'important');
                    deleteBtn.style.setProperty('bottom', 'auto', 'important');
                    deleteBtn.style.setProperty('z-index', '1051', 'important');
                    deleteBtn.style.setProperty('transform', 'none', 'important');
                    
                    // Verify after a frame - if still not correct, parent positioning context is the issue
                    requestAnimationFrame(() => {
                        const newTop = deleteBtn.getBoundingClientRect().top;
                        if (Math.abs(newTop - targetTop) > 2) {
                            console.log('🔧 Button still not at correct position after transform removal. Current:', newTop, 'Target:', targetTop);
                            // Parent TD is creating positioning context - calculate viewport-relative position
                            // Button is currently at 177px (parent TD at 114px + 63px offset)
                            // We want button at viewport 63px, so we need to account for parent's viewport position
                            const parentTD = deleteBtn.closest('td.w-100');
                            if (parentTD) {
                                const tdRect = parentTD.getBoundingClientRect();
                                const tdViewportTop = tdRect.top; // TD's position in viewport (114px)
                                // Calculate: button should be at viewport 63px
                                // If TD is at viewport 114px, button needs to be: 63px - 114px = -51px relative to TD
                                // But since button is fixed, we want it at viewport 63px
                                // The issue is that fixed is relative to transformed parent, so we need to break it
                                
                                // Move button to body to break positioning context
                                // If button is not already in body, move it there
                                if (deleteBtn.parentElement !== document.body) {
                                    const btnParent = deleteBtn.parentElement;
                                    const btnNextSibling = deleteBtn.nextSibling;
                                    
                                    // Store original parent for reference (but don't move back)
                                    deleteBtn.dataset.originalParent = 'moved';
                                    
                                    // Move to body - this breaks the positioning context
                                    document.body.appendChild(deleteBtn);
                                    console.log('🔧 Moved button to body to break positioning context');
                                }
                                
                                // Now apply fixed positioning relative to viewport
                                deleteBtn.style.setProperty('position', 'fixed', 'important');
                                deleteBtn.style.setProperty('top', targetTop + 'px', 'important');
                                deleteBtn.style.setProperty('right', '20px', 'important');
                                deleteBtn.style.setProperty('left', 'auto', 'important');
                                deleteBtn.style.setProperty('bottom', 'auto', 'important');
                                deleteBtn.style.setProperty('z-index', '1051', 'important');
                                deleteBtn.style.setProperty('transform', 'none', 'important');
                                
                                // Verify it's now correct
                                requestAnimationFrame(() => {
                                    const finalTop = deleteBtn.getBoundingClientRect().top;
                                    if (Math.abs(finalTop - targetTop) <= 2) {
                                        console.log('✅ Successfully positioned button at viewport', finalTop, 'px');
                                    } else {
                                        // If still not correct, calculate offset from parent TD position
                                        // Button should be at viewport 63px, parent TD is at viewport 114px
                                        // Offset = 63 - 114 = -51px from parent
                                        const offsetTop = targetTop - tdViewportTop;
                                        deleteBtn.style.setProperty('top', offsetTop + 'px', 'important');
                                        console.log('⚠️ Using offset calculation. Parent TD at viewport', tdViewportTop, 'px, offset:', offsetTop, 'px');
                                    }
                                });
                            }
                        } else {
                            console.log('✅ Successfully fixed delete button position to', newTop, 'px');
                        }
                    });
                    
                    console.log('🔧 Fixed delete button position from', currentTop, 'to', targetTop, 'px (transform context:', foundTransformContext, ')');
                }
            }
        }
        // Fix immediately and on mutations
        fixHistoryDeleteButton();
        // Also fix after DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fixHistoryDeleteButton);
        }
        setTimeout(fixHistoryDeleteButton, 100);
        setTimeout(fixHistoryDeleteButton, 500);
        const observer = new MutationObserver(() => {
            setTimeout(fixHistoryDeleteButton, 50);
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });
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
            // EXCLUDE Save/Back buttons from display override - they need inline-flex
            const isSaveOrBackButton = btn.matches('[data-request="onSave"]') ||
                                     (btn.closest('.progress-indicator-container') && 
                                      (btn.matches('.btn-primary[data-request="onSave"]') || 
                                       btn.matches('.btn-outline-secondary')));
            
            // FORCE buttons to work independently
            btn.style.setProperty('pointer-events', 'auto', 'important');
            
            // Only set display to inline-block if NOT a Save/Back button
            // Save/Back buttons should keep inline-flex to prevent text jumping
            if (!isSaveOrBackButton) {
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
    
    // Function to move bulk action buttons to toolbar
    function moveBulkButtons() {
        // Find the toolbar - try multiple selectors for different page types
        let toolbar = document.querySelector('#toolbar');
        if (!toolbar) {
            // Try alternative selectors for pages without #toolbar
            toolbar = document.querySelector('.toolbar');
            if (!toolbar) {
                toolbar = document.querySelector('.list-toolbar');
                if (!toolbar) {
                    toolbar = document.querySelector('.content-wrapper .container-fluid');
                    if (!toolbar) {
                        console.warn('No toolbar found with any selector');
                        return;
                    }
                }
            }
        }
        
        // Find the bulk actions row
        const bulkActionsRow = document.querySelector('tr.bulk-actions');
        if (!bulkActionsRow) {
            // No bulk actions row yet, wait for it to be created
            return;
        }
        
        // Check if bulk actions row is visible
        const isVisible = !bulkActionsRow.classList.contains('hide');
        
        // Find the cell with buttons
        const bulkActionsCell = bulkActionsRow.querySelector('td.w-100');
        if (!bulkActionsCell) {
            console.warn('Bulk actions cell not found');
            return;
        }
        
        // Find the button container
        const buttonContainer = bulkActionsCell.querySelector('div');
        if (!buttonContainer) {
            console.warn('Button container not found');
            return;
        }
        
        // Find the toolbar-action div inside the toolbar
        const toolbarAction = toolbar.querySelector('.toolbar-action');
        if (!toolbarAction) {
            console.warn('Toolbar action container not found');
            return;
        }
        
        // Find the progress-indicator-container inside toolbar-action
        const progressContainer = toolbarAction.querySelector('.progress-indicator-container');
        if (!progressContainer) {
            console.warn('Progress indicator container not found');
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
        
        // Update visibility based on bulk actions row
        toolbarBulkContainer.style.display = isVisible ? 'flex' : 'none';
        
        // If visible, move the buttons
        if (isVisible) {
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
        }, 100);
    });
    
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
