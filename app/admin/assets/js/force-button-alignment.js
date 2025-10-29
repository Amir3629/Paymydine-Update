/**
 * FORCE BUTTON ALIGNMENT
 * This script physically moves the bulk action buttons to the toolbar
 */

(function() {
    'use strict';
    
    console.log('🔧 Force Button Alignment initialized');
    
    // Function to break the connection between buttons and select boxes
    function breakConnection() {
        // Find all buttons that might be connected to select functionality
        const allButtons = document.querySelectorAll('button, .btn, a[role="button"]');
        
        console.log(`Found ${allButtons.length} total buttons to fix`);
        
        allButtons.forEach((btn, index) => {
            // FORCE buttons to work independently
            btn.style.setProperty('pointer-events', 'auto', 'important');
            btn.style.setProperty('display', 'inline-block', 'important');
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
                
                // HIDE only the "Select all" button
                if (isSelectAll) {
                    button.style.setProperty('display', 'none', 'important');
                    button.style.setProperty('visibility', 'hidden', 'important');
                    button.style.setProperty('opacity', '0', 'important');
                    button.style.setProperty('position', 'absolute', 'important');
                    button.style.setProperty('pointer-events', 'none', 'important');
                    toolbarBulkContainer.appendChild(button);
                } else {
                    // Show all other buttons and style them
                    const isCounter = button.classList && button.classList.contains('btn-counter');
                    const isDeleteButton = button.textContent && button.textContent.toLowerCase().includes('delete') && 
                                          button.classList && button.classList.contains('text-danger') &&
                                          !button.classList.contains('dropdown-item');
                    const isEnableDisable = button.classList && button.classList.contains('dropdown-toggle');
                    
                    // Style the counter button
                    if (isCounter) {
                        button.style.height = '38px';
                        button.style.display = 'flex';
                        button.style.alignItems = 'center';
                        button.style.background = '#08815e';
                        button.style.color = '#fff';
                        button.style.borderRadius = '4px';
                        button.style.padding = '0 15px';
                    }
                    
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
                        button.style.setProperty('background', '#08815e', 'important'); // Same as New button
                        button.style.setProperty('background-color', '#08815e', 'important');
                        button.style.setProperty('border', '1px solid #08815e', 'important');
                        button.style.setProperty('color', '#fff', 'important'); // White text
                        button.style.setProperty('border-radius', '4px', 'important');
                        button.style.setProperty('opacity', '1', 'important');
                        button.style.setProperty('visibility', 'visible', 'important');
                        
                        // Force remove any hover styles
                        button.addEventListener('mouseenter', function() {
                            this.style.setProperty('background', '#08815e', 'important');
                            this.style.setProperty('background-color', '#08815e', 'important');
                            this.style.setProperty('color', '#fff', 'important');
                        });
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
        setTimeout(init, 100);
    });
    
    // Run once after a short delay to catch dynamically loaded content
    setTimeout(breakConnection, 100);
    setTimeout(init, 500);
})();
