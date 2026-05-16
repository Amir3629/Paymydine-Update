/**
 * Folder Creation Dropdown Card
 * Replaces SweetAlert2 modal with a beautiful dropdown-style card
 */
(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Monitor for media manager toolbar
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            if (node.classList && (node.classList.contains('media-manager') || node.querySelector('.media-manager'))) {
                                setupFolderDropdown();
                            }
                        }
                    });
                }
            });
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also try immediately
        setupFolderDropdown();
    }

    function setupFolderDropdown() {
        // Find all new-folder and rename-folder buttons
        const folderButtons = document.querySelectorAll('[data-media-control="new-folder"], [data-media-control="rename-folder"]');
        
        folderButtons.forEach(function(button) {
            // Skip if already set up
            if (button.dataset.dropdownSetup === 'true') {
                return;
            }
            
            button.dataset.dropdownSetup = 'true';
            
            // Remove default click handler - intercept early
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                toggleFolderDropdown(button, e);
                return false;
            }, true); // Use capture phase to intercept early
            
            // Also prevent default on mousedown
            button.addEventListener('mousedown', function(e) {
                if (e.button === 0) { // Left click only
                    e.stopImmediatePropagation();
                }
            }, true);
        });
    }

    function toggleFolderDropdown(button, event) {
        // Close any existing dropdowns
        closeAllDropdowns();
        
        // Check if this dropdown is already open
        const existingDropdown = document.querySelector('.folder-create-dropdown.active');
        if (existingDropdown && existingDropdown.dataset.buttonId === button.id) {
            closeDropdown(existingDropdown);
            return;
        }

        // Create dropdown card
        const dropdown = createDropdownCard(button);
        
        // Position it below the button
        positionDropdown(dropdown, button);
        
        // Add to DOM
        document.body.appendChild(dropdown);
        
        // Show with animation
        requestAnimationFrame(function() {
            dropdown.classList.add('active');
            const input = dropdown.querySelector('.folder-create-input');
            if (input) {
                // Force focus and ensure it's editable
                setTimeout(function() {
                    input.focus();
                    input.click();
                    // Ensure cursor is in the input
                    if (input.setSelectionRange) {
                        input.setSelectionRange(0, 0);
                    }
                }, 50);
            }
        });

        // Close on outside click - but not when clicking inside the dropdown
        // Use a longer delay to ensure input handlers are set up first
        setTimeout(function() {
            document.addEventListener('click', function closeOnOutsideClick(e) {
                // Don't close if clicking inside dropdown or on the button
                const clickedInside = dropdown.contains(e.target);
                const clickedButton = e.target === button || button.contains(e.target);
                const clickedInput = e.target.closest && e.target.closest('.folder-create-input');
                const clickedDropdownBtn = e.target.closest && e.target.closest('.folder-create-btn, .folder-cancel-btn');
                
                if (!clickedInside && !clickedButton && !clickedInput && !clickedDropdownBtn) {
                    closeDropdown(dropdown);
                    document.removeEventListener('click', closeOnOutsideClick);
                }
            }, true); // Use capture phase
        }, 200); // Longer delay to ensure input is ready
    }

    function createDropdownCard(button) {
        const dropdown = document.createElement('div');
        dropdown.className = 'folder-create-dropdown';
        dropdown.dataset.buttonId = button.id || 'btn-' + Date.now();
        
        // Determine if this is create or rename
        const isRename = button.getAttribute('data-media-control') === 'rename-folder';
        const actionType = isRename ? 'rename' : 'create';
        dropdown.dataset.actionType = actionType;
        
        // Get current folder name for rename
        let currentFolderName = '';
        if (isRename) {
            const mediaManagerEl = findMediaManager(button);
            if (mediaManagerEl) {
                const $mediaManager = $(mediaManagerEl);
                const currentPath = $mediaManager.find('[data-media-type="current-folder"]').val() || '/';
                currentFolderName = currentPath === '/' ? '' : currentPath.split('/').pop();
            }
        }
        
        // Create simple dropdown menu (like Bootstrap dropdown)
        const menu = document.createElement('div');
        menu.className = 'folder-dropdown-menu';
        
        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'folder-input-container';
        
        // CRITICAL: Create input - make it fully editable
        const finalInput = document.createElement('input');
        finalInput.type = 'text';
        finalInput.className = 'folder-create-input';
        finalInput.placeholder = isRename ? 'New folder name...' : 'Folder name...';
        finalInput.value = currentFolderName; // Pre-fill for rename
        finalInput.autocomplete = 'off';
        finalInput.setAttribute('tabindex', '0');
        finalInput.disabled = false;
        finalInput.readOnly = false;
        finalInput.removeAttribute('disabled');
        finalInput.removeAttribute('readonly');
        
        // Apply styles directly
        finalInput.style.cssText = 'pointer-events: auto !important; user-select: text !important; -webkit-user-select: text !important; cursor: text !important; display: block !important; opacity: 1 !important; visibility: visible !important; z-index: 10000 !important; position: relative !important; background: #ffffff !important; color: #1f2b3a !important; width: 100% !important; padding: 8px 12px !important; border: 2px solid #e5e9f2 !important; border-radius: 8px !important; font-size: 0.9rem !important; box-sizing: border-box !important; margin: 0 !important;';
        
        inputContainer.appendChild(finalInput);
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'folder-button-container';
        
        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.className = 'folder-create-btn';
        actionBtn.textContent = isRename ? 'Rename' : 'Create';
        actionBtn.dataset.actionType = actionType;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'folder-cancel-btn';
        cancelBtn.textContent = 'Cancel';
        
        buttonContainer.appendChild(actionBtn);
        buttonContainer.appendChild(cancelBtn);
        
        menu.appendChild(inputContainer);
        menu.appendChild(buttonContainer);
        dropdown.appendChild(menu);
        
        // Handle action (create or rename)
        actionBtn.addEventListener('click', function() {
            const folderName = finalInput.value.trim();
            if (actionType === 'rename') {
                renameFolder(folderName, button, dropdown);
            } else {
                createFolder(folderName, button, dropdown);
            }
        });
        
        // Cancel
        cancelBtn.addEventListener('click', function() {
            closeDropdown(dropdown);
        });
        
        // CRITICAL: Add click and mousedown handlers to ensure input gets focus
        // Don't prevent default - let the browser handle it naturally
        finalInput.addEventListener('mousedown', function(e) {
            // Only stop propagation to parent, but allow default behavior
            e.stopPropagation();
            // Force focus after a tiny delay to ensure it works
            const self = this;
            setTimeout(function() {
                self.focus();
            }, 0);
        }, true);
        
        finalInput.addEventListener('click', function(e) {
            // Only stop propagation to parent, but allow default behavior
            e.stopPropagation();
            // Force focus
            this.focus();
            // Set cursor position
            const self = this;
            setTimeout(function() {
                if (self.setSelectionRange) {
                    self.setSelectionRange(self.value.length, self.value.length);
                }
            }, 0);
        }, true);
        
        // Also add focusin event (bubbles)
        finalInput.addEventListener('focusin', function(e) {
            e.stopPropagation();
        }, true);
        
        // Enter key to create/rename
        finalInput.addEventListener('keydown', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            if (e.key === 'Enter') {
                e.preventDefault();
                const folderName = finalInput.value.trim();
                const actionType = dropdown.dataset.actionType || 'create';
                if (actionType === 'rename') {
                    renameFolder(folderName, button, dropdown);
                } else {
                    createFolder(folderName, button, dropdown);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeDropdown(dropdown);
            }
        }, true);
        
        // Ensure input can receive all keyboard events - use capture phase
        finalInput.addEventListener('input', function(e) {
            e.stopPropagation();
        }, true);
        
        finalInput.addEventListener('keypress', function(e) {
            e.stopPropagation();
        }, true);
        
        finalInput.addEventListener('keyup', function(e) {
            e.stopPropagation();
        }, true);
        
        // Also handle text input events
        finalInput.addEventListener('textInput', function(e) {
            e.stopPropagation();
        }, true);
        
        // Focus event
        finalInput.addEventListener('focus', function(e) {
            e.stopPropagation();
        }, true);
        
        // For rename, select all text on focus
        if (isRename && currentFolderName) {
            setTimeout(function() {
                finalInput.focus();
                if (finalInput.setSelectionRange) {
                    finalInput.setSelectionRange(0, currentFolderName.length);
                }
            }, 200);
        }
        
        // Force focus and test - with multiple attempts
        setTimeout(function() {
            // Try multiple times to ensure focus works
            finalInput.focus();
            finalInput.click();
            
            setTimeout(function() {
                finalInput.focus();
                // Set cursor position
                if (finalInput.setSelectionRange) {
                    finalInput.setSelectionRange(0, 0);
                }
                // Test typing
                try {
                    finalInput.value = 'test';
                    if (finalInput.value === 'test') {
                        finalInput.value = '';
                        console.log('✅ Input field is ready and editable');
                    } else {
                        console.log('⚠️ Input value not set correctly');
                    }
                } catch (e) {
                    console.error('❌ Input field error:', e);
                }
            }, 100);
        }, 150);
        
        return dropdown;
    }

    function createFolder(folderName, button, dropdown) {
        if (!folderName) {
            // Show error
            const input = dropdown.querySelector('.folder-create-input');
            input.style.borderColor = '#dc3545';
            input.focus();
            setTimeout(function() {
                input.style.borderColor = '';
            }, 2000);
            return;
        }

        // Get the media manager instance
        const mediaManagerEl = findMediaManager(button);
        if (!mediaManagerEl) {
            console.error('Media manager not found');
            closeDropdown(dropdown);
            return;
        }

        // Find the jQuery media manager instance
        const $mediaManager = $(mediaManagerEl);
        const mediaManagerInstance = $mediaManager.data('ti.mediaManager');
        
        if (!mediaManagerInstance) {
            console.error('Media manager instance not found');
            closeDropdown(dropdown);
            return;
        }

        // Get current folder path
        const currentPath = $mediaManager.find('[data-media-type="current-folder"]').val() || '/';

        // Show loading state
        const actionBtn = dropdown.querySelector('.folder-create-btn');
        const originalText = actionBtn.textContent;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Creating...';

        // Use the same method as the original createFolder
        const data = {
            name: folderName,
            path: currentPath
        };

        // Show loading indicator
        if (window.$ && $.ti && $.ti.loadingIndicator) {
            $.ti.loadingIndicator.show();
        }

        // Use the same request method as media manager
        const $form = mediaManagerInstance.$form;
        const alias = mediaManagerInstance.options.alias;

        $form.request(alias + '::onCreateFolder', {
            data: data
        }).always(function() {
            if (window.$ && $.ti && $.ti.loadingIndicator) {
                $.ti.loadingIndicator.hide();
            }
            actionBtn.disabled = false;
            actionBtn.textContent = originalText;
        }).done(function() {
            // Success - close dropdown
            closeDropdown(dropdown);
            // Refresh is handled by afterNavigate callback
        }).fail(function(response) {
            // Show error message
            let errorMsg = 'Error creating folder. Please try again.';
            if (response && response.responseJSON && response.responseJSON.message) {
                errorMsg = response.responseJSON.message;
            }
            if (window.$ && $.ti && $.ti.flashMessage) {
                $.ti.flashMessage({text: errorMsg, class: 'danger'});
            } else {
                alert(errorMsg);
            }
        });
    }

    function renameFolder(folderName, button, dropdown) {
        if (!folderName) {
            // Show error
            const input = dropdown.querySelector('.folder-create-input');
            input.style.borderColor = '#dc3545';
            input.focus();
            setTimeout(function() {
                input.style.borderColor = '';
            }, 2000);
            return;
        }

        // Get the media manager instance
        const mediaManagerEl = findMediaManager(button);
        if (!mediaManagerEl) {
            console.error('Media manager not found');
            closeDropdown(dropdown);
            return;
        }

        // Check if trying to rename root folder
        const $mediaManager = $(mediaManagerEl);
        const currentPath = $mediaManager.find('[data-media-type="current-folder"]').val() || '/';
        if (currentPath === '/') {
            if (window.$ && $.ti && $.ti.flashMessage) {
                $.ti.flashMessage({text: 'Cannot rename root folder', class: 'warning'});
            } else {
                alert('Cannot rename root folder');
            }
            closeDropdown(dropdown);
            return;
        }

        // Find the jQuery media manager instance
        const mediaManagerInstance = $mediaManager.data('ti.mediaManager');
        
        if (!mediaManagerInstance) {
            console.error('Media manager instance not found');
            closeDropdown(dropdown);
            return;
        }

        // Show loading state
        const actionBtn = dropdown.querySelector('.folder-create-btn');
        const originalText = actionBtn.textContent;
        actionBtn.disabled = true;
        actionBtn.textContent = 'Renaming...';

        // Use the same method as the original renameFolder
        const data = {
            name: folderName,
            path: currentPath
        };

        // Show loading indicator
        if (window.$ && $.ti && $.ti.loadingIndicator) {
            $.ti.loadingIndicator.show();
        }

        // Use the same request method as media manager
        const $form = mediaManagerInstance.$form;
        const alias = mediaManagerInstance.options.alias;

        $form.request(alias + '::onRenameFolder', {
            data: data
        }).always(function() {
            if (window.$ && $.ti && $.ti.loadingIndicator) {
                $.ti.loadingIndicator.hide();
            }
            actionBtn.disabled = false;
            actionBtn.textContent = originalText;
        }).done(function() {
            // Success - close dropdown
            closeDropdown(dropdown);
            // Refresh is handled by afterNavigate callback
        }).fail(function(response) {
            // Show error message
            let errorMsg = 'Error renaming folder. Please try again.';
            if (response && response.responseJSON && response.responseJSON.message) {
                errorMsg = response.responseJSON.message;
            }
            if (window.$ && $.ti && $.ti.flashMessage) {
                $.ti.flashMessage({text: errorMsg, class: 'danger'});
            } else {
                alert(errorMsg);
            }
        });
    }

    function findMediaManager(button) {
        // Find the media manager container
        let element = button;
        while (element && !element.classList.contains('media-manager')) {
            element = element.parentElement;
        }
        return element || document.querySelector('.media-manager');
    }

    function positionDropdown(dropdown, button) {
        const rect = button.getBoundingClientRect();
        const dropdownMenu = dropdown.querySelector('.folder-dropdown-menu');
        
        // Position below button, aligned to left
        dropdown.style.position = 'fixed';
        dropdown.style.top = (rect.bottom + 8) + 'px';
        dropdown.style.left = rect.left + 'px';
        dropdown.style.zIndex = '10000';
    }

    function closeDropdown(dropdown) {
        dropdown.classList.remove('active');
        setTimeout(function() {
            if (dropdown.parentNode) {
                dropdown.parentNode.removeChild(dropdown);
            }
        }, 200);
    }

    function closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.folder-create-dropdown.active');
        dropdowns.forEach(closeDropdown);
    }
})();

