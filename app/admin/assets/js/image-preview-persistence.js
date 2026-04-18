/**
 * 🔧 Image Preview Persistence Fix
 * 
 * Fixes the issue where image previews disappear after page refresh.
 * Since the Blade template doesn't populate inputs after refresh,
 * this script stores values in localStorage when saved and restores them.
 * 
 * @author Auto (Cursor AI)
 * @version 1.0
 */

(function() {
    'use strict';
    
    // Only run on settings pages with MediaFinder widgets
    if (window.location.pathname.indexOf('/admin/settings/edit/general') === -1) {
        return;
    }
    
    console.log('%c🔧 IMAGE PREVIEW PERSISTENCE FIX', 'background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 10px; font-size: 14px; font-weight: bold; border-radius: 5px;');
    
    function getBaseUrl() {
        return window.location.protocol + '//' + window.location.host;
    }
    
    function buildImageUrl(path) {
        if (!path) return '';
        if (path.indexOf('http') === 0) {
            path = path.replace(/http:\/\/127\.0\.0\.1:8000/g, getBaseUrl());
            path = path.replace(/http:\/\/localhost:8000/g, getBaseUrl());
            return path;
        }
        if (path.indexOf('/') === 0) {
            path = path.substring(1);
        }
        return getBaseUrl() + '/assets/media/uploads/' + path;
    }
    
    // Save values to localStorage when form is submitted
    function saveValuesToStorage() {
        var values = {};
        var fields = ['site_logo', 'dashboard_logo', 'favicon_logo'];
        var stored = getValuesFromStorage();
        var hasChanges = false;
        
        fields.forEach(function(field) {
            var inputs = document.querySelectorAll('[name="setting[' + field + ']"]');
            var fieldValue = null;
            
            for (var i = 0; i < inputs.length; i++) {
                var value = (inputs[i].value || '').trim();
                if (value !== '') {
                    fieldValue = value;
                    break;
                }
            }
            
            // Check if there's a preview showing (visual check)
            var mediaFinder = document.querySelector('[id*="mediafinder"][id*="' + field.replace(/_/g, '-') + '"]');
            if (!mediaFinder) {
                var allMediaFinders = document.querySelectorAll('[data-control="mediafinder"]');
                for (var j = 0; j < allMediaFinders.length; j++) {
                    var mfId = (allMediaFinders[j].id || '').toLowerCase();
                    if (mfId.indexOf(field.toLowerCase().replace(/_/g, '-')) !== -1) {
                        mediaFinder = allMediaFinders[j];
                        break;
                    }
                }
            }
            
            var hasPreview = false;
            if (mediaFinder) {
                var previewImg = mediaFinder.querySelector('[data-find-image]');
                hasPreview = previewImg && previewImg.src && previewImg.src.indexOf('http') === 0;
            }
            
            // CRITICAL: Only save if there's a preview showing (visual confirmation)
            // If there's no preview, the image was removed, even if the input has a value
            if (fieldValue && hasPreview) {
                // Image is selected and preview is showing - save it
                values[field] = fieldValue;
                if (!stored[field] || stored[field] !== fieldValue) {
                    hasChanges = true;
                }
            } else {
                // No preview showing OR no value - remove from localStorage
                if (stored[field]) {
                    delete stored[field];
                    hasChanges = true;
                    console.log('🗑️ Removed', field, 'from localStorage (no preview showing)');
                }
            }
        });
        
        if (hasChanges) {
            if (Object.keys(values).length > 0) {
                localStorage.setItem('paymydine_logo_settings', JSON.stringify(values));
                console.log('💾 Saved values to localStorage:', values);
            } else {
                // If all values are empty, clear localStorage entirely
                localStorage.removeItem('paymydine_logo_settings');
                console.log('🗑️ Cleared all values from localStorage (all empty)');
            }
        }
    }
    
    // Get values from localStorage
    function getValuesFromStorage() {
        try {
            var stored = localStorage.getItem('paymydine_logo_settings');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to parse localStorage:', e);
        }
        return {};
    }
    
    // Restore preview
    function restorePreview(mediaFinder, savedValue) {
        if (!mediaFinder || !savedValue) return false;
        
        var grid = mediaFinder.querySelector('.grid');
        if (!grid) return false;
        
        // Check if there's already a valid preview showing
        var existingPreview = grid.querySelector('[data-find-image]');
        if (existingPreview && existingPreview.src && existingPreview.src.indexOf('http') === 0) {
            return true;
        }
        
        // CRITICAL: After page refresh, Blade template creates blank buttons but doesn't populate inputs
        // The savedValue parameter comes from localStorage, which means it was saved
        // So we should restore it, regardless of blank button or empty input
        // The only reason to skip restore is if there's already a valid preview showing
        
        console.log('🔧 Restoring preview for', mediaFinder.id, '- Value:', savedValue);
        
        console.log('🔧 Restoring preview for', mediaFinder.id, '- Value:', savedValue);
        
        var imageUrl = buildImageUrl(savedValue);
        var mediaFinderId = mediaFinder.id || '';
        var fieldName = '';
        if (mediaFinderId.indexOf('mediafinder-') === 0) {
            var parts = mediaFinderId.split('-');
            if (parts.length >= 3) {
                fieldName = parts.slice(2).join('_');
            }
        }
        
        var findValue = mediaFinder.querySelector('[data-find-value]');
        if (findValue) {
            findValue.value = savedValue;
            if (fieldName && !findValue.getAttribute('name')) {
                findValue.setAttribute('name', 'setting[' + fieldName + ']');
            }
        }
        
        var filename = savedValue.split('/').pop() || savedValue;
        var blankButton = grid.querySelector('.find-button.blank-cover');
        if (blankButton) blankButton.remove();
        
        var existingElements = grid.querySelectorAll('.find-remove-button, .icon-container, .find-config-button');
        var hasValidPreview = false;
        existingElements.forEach(function(el) {
            var img = el.querySelector('[data-find-image]');
            if (img && img.src && img.src.indexOf('http') === 0) {
                hasValidPreview = true;
            }
        });
        
        if (!hasValidPreview) {
            existingElements.forEach(function(el) { el.remove(); });
        } else {
            var existingImg = grid.querySelector('[data-find-image]');
            if (existingImg) existingImg.src = imageUrl;
            return true;
        }
        
        var removeIcon = document.createElement('i');
        removeIcon.className = 'find-remove-button fa fa-times-circle';
        removeIcon.setAttribute('title', 'Remove');
        removeIcon.style.cssText = 'position: absolute; top: 8px; right: 8px; z-index: 9999; cursor: pointer; background: rgba(255,255,255,0.9); border-radius: 50%; padding: 2px;';
        
        var iconDiv = document.createElement('div');
        iconDiv.className = 'icon-container';
        var nameSpan = document.createElement('span');
        nameSpan.setAttribute('data-find-name', '');
        nameSpan.setAttribute('title', filename);
        nameSpan.textContent = filename;
        iconDiv.appendChild(nameSpan);
        
        var configLink = document.createElement('a');
        configLink.className = 'find-config-button';
        configLink.style.cssText = 'position: relative; z-index: 1;';
        
        var coverDiv = document.createElement('div');
        coverDiv.className = 'img-cover';
        
        var img = document.createElement('img');
        img.setAttribute('data-find-image', '');
        img.className = 'img-responsive';
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        img.src = imageUrl;
        img.alt = filename;
        
        img.onload = function() {
            console.log('   ✅ Image loaded:', imageUrl);
        };
        
        img.onerror = function() {
            console.warn('   ⚠️ Image failed:', imageUrl);
            var altUrl = getBaseUrl() + '/' + savedValue;
            if (altUrl !== imageUrl) this.src = altUrl;
        };
        
        coverDiv.appendChild(img);
        configLink.appendChild(coverDiv);
        
        if (findValue && findValue.parentNode) {
            grid.insertBefore(removeIcon, findValue);
            grid.insertBefore(iconDiv, findValue);
            grid.insertBefore(configLink, findValue);
        } else {
            grid.appendChild(removeIcon);
            grid.appendChild(iconDiv);
            grid.appendChild(configLink);
        }
        
        var findId = mediaFinder.querySelector('[data-find-identifier]');
        if (!findId) {
            findId = document.createElement('input');
            findId.type = 'hidden';
            findId.setAttribute('data-find-identifier', '');
            if (findValue && findValue.parentNode) {
                grid.insertBefore(findId, findValue);
            } else {
                grid.appendChild(findId);
            }
        }
        
        console.log('   ✅ Preview restored');
        return true;
    }
    
    // Restore all previews
    function restoreAllPreviews() {
        var values = getValuesFromStorage();
        console.log('🔧 Restoring previews with values from localStorage:', values);
        
        // Also check current page inputs - but prioritize form inputs over localStorage
        var fields = ['site_logo', 'dashboard_logo', 'favicon_logo'];
        var formValues = {};
        
        fields.forEach(function(field) {
            var inputs = document.querySelectorAll('[name="setting[' + field + ']"]');
            for (var i = 0; i < inputs.length; i++) {
                var value = inputs[i].value || '';
                // If form input has a value, use it (it's the source of truth)
                if (value && value.trim() !== '') {
                    formValues[field] = value;
                }
            }
        });
        
        // Use form values if available, otherwise use localStorage
        // CRITICAL: After page refresh, Blade template creates blank buttons but doesn't populate inputs
        // So we need to restore from localStorage if there's a value, regardless of blank button
        var valuesToUse = {};
        fields.forEach(function(field) {
            if (formValues[field]) {
                // Form has a value - use it
                valuesToUse[field] = formValues[field];
                console.log('✅ Using form value for', field, ':', formValues[field]);
            } else if (values[field]) {
                // Form input is empty but localStorage has a value - check if preview exists
                var mediaFinder = document.querySelector('[id*="mediafinder"][id*="' + field.replace(/_/g, '-') + '"]');
                if (!mediaFinder) {
                    var allMediaFinders = document.querySelectorAll('[data-control="mediafinder"]');
                    for (var i = 0; i < allMediaFinders.length; i++) {
                        var mfId = (allMediaFinders[i].id || '').toLowerCase();
                        if (mfId.indexOf(field.toLowerCase().replace(/_/g, '-')) !== -1) {
                            mediaFinder = allMediaFinders[i];
                            break;
                        }
                    }
                }
                
                if (mediaFinder) {
                    var existingPreview = mediaFinder.querySelector('[data-find-image]');
                    var hasPreview = existingPreview && existingPreview.src && existingPreview.src.indexOf('http') === 0;
                    
                    // If there's already a preview showing, don't restore
                    if (hasPreview) {
                        console.log('✅', field, 'already has preview - skipping restore');
                    } else {
                        // No preview but localStorage has value - restore it
                        // This handles the case where:
                        // 1. Image was just saved (Blade template didn't populate input)
                        // 2. Page was refreshed (Blade template created blank button but didn't populate input)
                        valuesToUse[field] = values[field];
                        console.log('✅ Will restore', field, 'from localStorage (value exists, no preview)');
                    }
                } else {
                    // MediaFinder not found, but we have a value - restore it anyway
                    valuesToUse[field] = values[field];
                    console.log('✅ Will restore', field, 'from localStorage (MediaFinder not found yet)');
                }
            }
        });
        
        var mediaFinders = document.querySelectorAll('[data-control="mediafinder"]');
        var restored = 0;
        
        mediaFinders.forEach(function(mediaFinder) {
            var mediaFinderId = mediaFinder.id || '';
            var fieldName = '';
            
            if (mediaFinderId.indexOf('mediafinder-') === 0) {
                var parts = mediaFinderId.split('-');
                if (parts.length >= 3) {
                    fieldName = parts.slice(2).join('_');
                }
            }
            
            if (fieldName && valuesToUse[fieldName]) {
                // CRITICAL: Don't check if input is empty - after page refresh, Blade template
                // doesn't populate inputs, but we still need to restore from localStorage
                // The fact that valuesToUse[fieldName] exists means it's in localStorage, so restore it
                if (restorePreview(mediaFinder, valuesToUse[fieldName])) {
                    restored++;
                    console.log('✅ Successfully restored preview for', fieldName);
                } else {
                    console.warn('⚠️ Failed to restore preview for', fieldName);
                }
            }
        });
        
        if (restored > 0) {
            console.log('✅ Restored', restored, 'previews');
        }
        initPlusButtons();
        initRemoveButtons();
    }
    
    // Initialize plus buttons to open media manager
    function initPlusButtons() {
        document.querySelectorAll('.find-button.blank-cover, .blank-cover').forEach(function(btn) {
            // Skip if already has our handler
            if (btn.hasAttribute('data-plus-handler-initialized')) {
                return;
            }
            
            // If button already has data-plus-handler, it means existing handlers from image_grid.blade.php
            // should handle it - don't interfere
            if (btn.hasAttribute('data-plus-handler')) {
                console.log('✅ Plus button already has handler from page - skipping');
                return;
            }
            
            btn.setAttribute('data-plus-handler-initialized', 'true');
            
            // Use jQuery to trigger the MediaFinder widget's click handler if available
            if (typeof jQuery !== 'undefined') {
                var $btn = jQuery(btn);
                var $mediaFinder = $btn.closest('[data-control="mediafinder"]');
                
                // Check if MediaFinder widget is initialized
                if ($mediaFinder.length && $mediaFinder.data('ti.mediaFinder')) {
                    // Use the widget's existing onClickFindButton method
                    $btn.off('click.mediafinder').on('click.mediafinder', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        var mediaFinderInstance = $mediaFinder.data('ti.mediaFinder');
                        if (mediaFinderInstance && typeof mediaFinderInstance.onClickFindButton === 'function') {
                            mediaFinderInstance.onClickFindButton(e);
                            return;
                        }
                    });
                    return;
                }
            }
            
            // Fallback: Manual handler using TastyIgniter media manager
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🔵 Plus button clicked to open media manager');
                
                var mediaFinder = this.closest('[data-control="mediafinder"]');
                if (!mediaFinder) {
                    mediaFinder = this.closest('.media-finder');
                }
                
                if (!mediaFinder) {
                    console.error('MediaFinder container not found');
                    return;
                }
                
                // First, try to use existing handlers from the page (image_grid.blade.php)
                // These handlers use data-plus-handler attribute
                if (typeof jQuery !== 'undefined') {
                    var $btn = jQuery(this);
                    var $mf = jQuery(mediaFinder);
                    
                    // Check if there's an existing handler attached via data-plus-handler
                    // The image_grid.blade.php script should handle this, but if it doesn't,
                    // we'll use our fallback
                    
                    // Try to trigger the MediaFinder widget's click handler
                    var instance = $mf.data('ti.mediaFinder');
                    if (instance && typeof instance.onClickFindButton === 'function') {
                        try {
                            instance.onClickFindButton(e);
                            return;
                        } catch (err) {
                            console.warn('MediaFinder widget handler failed:', err);
                        }
                    }
                }
                
                // Get options from data attributes
                var alias = mediaFinder.getAttribute('data-alias') || 'mediamanager';
                var useAttachmentAttr = mediaFinder.getAttribute('data-use-attachment');
                var useAttachment = useAttachmentAttr === 'true' || useAttachmentAttr === '1';
                var chooseButtonText = mediaFinder.getAttribute('data-choose-button-text') || 'Choose';
                var findValue = mediaFinder.querySelector('[data-find-value]');
                var currentValue = findValue ? findValue.value : null;
                
                // Use TastyIgniter's media manager
                if (typeof jQuery !== 'undefined' && jQuery.ti && jQuery.ti.mediaManager && jQuery.ti.mediaManager.modal) {
                    try {
                        new jQuery.ti.mediaManager.modal({
                            alias: 'mediamanager',
                            selectMode: 'single',
                            chooseButton: true,
                            chooseButtonText: chooseButtonText,
                            goToItem: !useAttachment ? currentValue : null,
                            onInsert: function(items) {
                                if (!items || !items.length) {
                                    console.warn('No items selected');
                                    return;
                                }
                                
                                var item = items[0];
                                var itemData = {
                                    identifier: item.identifier || item.id || '',
                                    path: item.path || item.publicUrl || '',
                                    publicUrl: item.publicUrl || item.path || '',
                                    fileType: item.fileType || 'image',
                                    name: item.name || ''
                                };
                                
                                // Fix localhost URLs
                                if (itemData.publicUrl) {
                                    itemData.publicUrl = itemData.publicUrl.replace(/http:\/\/127\.0\.0\.1:8000/g, getBaseUrl());
                                    itemData.publicUrl = itemData.publicUrl.replace(/http:\/\/localhost:8000/g, getBaseUrl());
                                }
                                
                                // Update the MediaFinder using existing function if available
                                if (typeof updateMediaFinder === 'function') {
                                    updateMediaFinder(mediaFinder, itemData);
                                } else if (typeof jQuery !== 'undefined') {
                                    // Fallback: Use jQuery to update
                                    var $mf = jQuery(mediaFinder);
                                    if ($mf.data('ti.mediaFinder')) {
                                        var instance = $mf.data('ti.mediaFinder');
                                        if (instance.updateFinder) {
                                            instance.updateFinder(jQuery(btn), [itemData]);
                                        }
                                    }
                                }
                                
                                // CRITICAL: Ensure the input has a proper name attribute after update
                                setTimeout(function() {
                                    var findValue = mediaFinder.querySelector('[data-find-value]');
                                    if (findValue) {
                                        var currentName = findValue.getAttribute('name');
                                        var mediaFinderId = mediaFinder.id || '';
                                        var fieldName = '';
                                        
                                        if (mediaFinderId.indexOf('mediafinder-') === 0) {
                                            var parts = mediaFinderId.split('-');
                                            if (parts.length >= 3) {
                                                fieldName = parts.slice(2).join('_');
                                            }
                                        }
                                        
                                        if (fieldName && (!currentName || currentName.indexOf('setting[') !== 0)) {
                                            findValue.setAttribute('name', 'setting[' + fieldName + ']');
                                            console.log('✅ Set name attribute for', fieldName, ':', 'setting[' + fieldName + ']');
                                        }
                                        
                                        // Verify value is set
                                        if (!findValue.value && itemData.path) {
                                            findValue.value = itemData.path;
                                            console.log('✅ Set value for', fieldName, ':', itemData.path);
                                        }
                                    }
                                }, 200);
                                
                                // Save to localStorage
                                saveValuesToStorage();
                            }
                        });
                        return;
                    } catch (e) {
                        console.warn('MediaManager.modal failed:', e);
                    }
                }
                
                // Last resort: try to find and trigger existing handlers from image_grid.blade.php
                // Those handlers should be listening for clicks on .find-button elements
                console.warn('⚠️ Could not open media manager - trying to trigger existing page handlers');
                // The existing handlers in image_grid.blade.php should catch this click
                // If they don't, it means they're not initialized, which is a separate issue
            }, true);
        });
    }
    
    function initRemoveButtons() {
        document.querySelectorAll('.find-remove-button').forEach(function(btn) {
            if (btn.hasAttribute('data-preview-persistence-handler')) return;
            btn.setAttribute('data-preview-persistence-handler', 'true');
            
            var newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var mediaFinder = this.closest('[data-control="mediafinder"]');
                if (!mediaFinder) return;
                
                var findValue = mediaFinder.querySelector('[data-find-value]');
                if (findValue) {
                    findValue.value = '';
                    findValue.removeAttribute('name');
                }
                
                var findId = mediaFinder.querySelector('[data-find-identifier]');
                if (findId) {
                    findId.value = '';
                }
                
                // Get field name to clear from localStorage
                var mediaFinderId = mediaFinder.id || '';
                var fieldName = '';
                if (mediaFinderId.indexOf('mediafinder-') === 0) {
                    var parts = mediaFinderId.split('-');
                    if (parts.length >= 3) {
                        fieldName = parts.slice(2).join('_');
                    }
                }
                
                var grid = mediaFinder.querySelector('.grid');
                if (grid) {
                    var previewElements = grid.querySelectorAll('.find-remove-button, .icon-container, .find-config-button');
                    previewElements.forEach(function(el) { el.remove(); });
                    
                    // Create new blank button
                    var blankButton = document.createElement('a');
                    blankButton.className = 'find-button blank-cover';
                    blankButton.innerHTML = '<i class="fa fa-plus"></i>';
                    // Add data-plus-handler so existing handlers from image_grid.blade.php can work
                    blankButton.setAttribute('data-plus-handler', 'true');
                    if (findValue && findValue.parentNode) {
                        grid.insertBefore(blankButton, findValue);
                    } else {
                        grid.appendChild(blankButton);
                    }
                    
                    // CRITICAL: Re-initialize plus button handler immediately
                    // Use a small delay to ensure DOM is updated and existing handlers are ready
                    setTimeout(function() {
                        // Try to use existing MediaFinder widget handlers first
                        if (typeof jQuery !== 'undefined') {
                            var $mf = jQuery(mediaFinder);
                            var $btn = jQuery(blankButton);
                            
                            // Check if MediaFinder widget exists
                            var instance = $mf.data('ti.mediaFinder');
                            if (instance && typeof instance.onClickFindButton === 'function') {
                                // Use widget's existing handler
                                $btn.off('click.mediafinder').on('click.mediafinder', function(e) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    instance.onClickFindButton(e);
                                });
                                console.log('✅ Attached MediaFinder widget handler to new plus button');
                                return;
                            }
                            
                            // Try to initialize widget if not initialized
                            if (typeof jQuery.fn.mediaFinder !== 'undefined' && !instance) {
                                try {
                                    $mf.mediaFinder();
                                    instance = $mf.data('ti.mediaFinder');
                                    if (instance && typeof instance.onClickFindButton === 'function') {
                                        $btn.off('click.mediafinder').on('click.mediafinder', function(e) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            instance.onClickFindButton(e);
                                        });
                                        console.log('✅ Initialized and attached MediaFinder widget handler');
                                        return;
                                    }
                                } catch (e) {
                                    console.warn('Could not initialize MediaFinder widget:', e);
                                }
                            }
                        }
                        
                        // The existing handlers from image_grid.blade.php should handle clicks
                        // on buttons with data-plus-handler attribute. If they don't work,
                        // our fallback handler in initPlusButtons will catch it
                        // Remove our initialization flag so initPlusButtons can add its handler if needed
                        blankButton.removeAttribute('data-plus-handler-initialized');
                        initPlusButtons();
                    }, 200);
                }
                
                // CRITICAL: Clear this specific field from localStorage immediately
                if (fieldName) {
                    var storedValues = getValuesFromStorage();
                    if (storedValues[fieldName]) {
                        delete storedValues[fieldName];
                        if (Object.keys(storedValues).length > 0) {
                            localStorage.setItem('paymydine_logo_settings', JSON.stringify(storedValues));
                        } else {
                            localStorage.removeItem('paymydine_logo_settings');
                        }
                        console.log('🗑️ Cleared', fieldName, 'from localStorage');
                    }
                }
                
                // Don't call saveValuesToStorage() here - it would read the empty input
                // and potentially save it back. The form submission will handle saving.
            });
        });
    }
    
    // Ensure all MediaFinder inputs have proper name attributes and values before form submission
    function ensureAllMediaFinderInputsReady() {
        var fields = ['site_logo', 'dashboard_logo', 'favicon_logo'];
        var allReady = true;
        var fixed = 0;
        
        fields.forEach(function(field) {
            var fieldName = 'setting[' + field + ']';
            
            // First, try to find input by name attribute (most reliable)
            var findValue = document.querySelector('[name="' + fieldName + '"]');
            
            // If not found by name, try to find by MediaFinder ID pattern
            if (!findValue) {
                var mediaFinder = null;
                
                // Try multiple ID patterns
                var patterns = [
                    '[id*="mediafinder"][id*="' + field.replace(/_/g, '-') + '"]',
                    '[id*="mediafinder"][id*="' + field + '"]',
                    '[id*="' + field.replace(/_/g, '-') + '"]',
                    '[id*="' + field + '"]'
                ];
                
                for (var p = 0; p < patterns.length && !mediaFinder; p++) {
                    mediaFinder = document.querySelector(patterns[p]);
                }
                
                // If still not found, search all MediaFinders
                if (!mediaFinder) {
                    var allMediaFinders = document.querySelectorAll('[data-control="mediafinder"]');
                    for (var i = 0; i < allMediaFinders.length; i++) {
                        var mfId = (allMediaFinders[i].id || '').toLowerCase();
                        var fieldLower = field.toLowerCase();
                        if (mfId.indexOf(fieldLower.replace(/_/g, '-')) !== -1 || 
                            mfId.indexOf(fieldLower) !== -1 ||
                            mfId.indexOf(field.replace(/_/g, '')) !== -1) {
                            mediaFinder = allMediaFinders[i];
                            break;
                        }
                    }
                }
                
                if (mediaFinder) {
                    findValue = mediaFinder.querySelector('[data-find-value]');
                }
            }
            
            if (findValue) {
                var currentName = findValue.getAttribute('name');
                var currentValue = findValue.value || '';
                
                // If missing name, set it
                if (!currentName || currentName.indexOf('setting[') !== 0) {
                    findValue.setAttribute('name', fieldName);
                    fixed++;
                    console.log('🔧 Fixed name for', field, ':', fieldName);
                }
                
                // Verify the input is in the form
                var form = findValue.closest('form');
                if (!form) {
                    // Find the form and move the input into it
                    form = document.querySelector('form[action*="settings/edit/general"]');
                    if (form) {
                        form.appendChild(findValue);
                        console.log('🔧 Moved input for', field, 'into form');
                    }
                }
                
                // Check if value exists (even if empty, the input should be present)
                if (!currentValue) {
                    console.warn('⚠️', field, 'has no value');
                } else {
                    console.log('✅', field, 'ready:', currentValue.substring(0, 50));
                }
            } else {
                // Input doesn't exist - check if we need to create it from localStorage
                var storedValues = getValuesFromStorage();
                if (storedValues[field]) {
                    console.warn('⚠️', field, 'input not found, but value exists in localStorage:', storedValues[field]);
                    // Try to find MediaFinder and create input
                    var mediaFinder = document.querySelector('[id*="' + field.replace(/_/g, '-') + '"]');
                    if (!mediaFinder) {
                        var allMediaFinders = document.querySelectorAll('[data-control="mediafinder"]');
                        for (var i = 0; i < allMediaFinders.length; i++) {
                            var mfId = (allMediaFinders[i].id || '').toLowerCase();
                            if (mfId.indexOf(field.toLowerCase().replace(/_/g, '-')) !== -1) {
                                mediaFinder = allMediaFinders[i];
                                break;
                            }
                        }
                    }
                    
                    if (mediaFinder) {
                        var grid = mediaFinder.querySelector('.grid');
                        if (grid) {
                            // Create the input
                            var newInput = document.createElement('input');
                            newInput.type = 'hidden';
                            newInput.setAttribute('data-find-value', '');
                            newInput.setAttribute('name', fieldName);
                            newInput.value = storedValues[field];
                            grid.appendChild(newInput);
                            console.log('🔧 Created missing input for', field, 'from localStorage');
                            fixed++;
                        }
                    }
                } else {
                    console.warn('⚠️ MediaFinder and input not found for', field, '- field may be empty');
                }
            }
        });
        
        if (fixed > 0) {
            console.log('🔧 Fixed', fixed, 'MediaFinder input(s) before submission');
        }
        
        return allReady;
    }
    
    // Intercept form submission to save values and ensure all inputs are ready
    function interceptFormSubmit() {
        if (typeof jQuery === 'undefined') return;
        
        // Remove any existing handlers to avoid duplicates
        jQuery(document).off('submit.preview-persistence ajaxSend.preview-persistence');
        
        // Intercept regular form submission
        jQuery(document).on('submit.preview-persistence', 'form', function(e) {
            var $form = jQuery(this);
            if ($form.attr('action') && $form.attr('action').indexOf('settings/edit/general') !== -1) {
                console.log('🔧 Intercepting form submit - ensuring all MediaFinder inputs are ready...');
                
                // CRITICAL: Ensure all inputs have names and values before submission
                ensureAllMediaFinderInputsReady();
                
                // Also save to localStorage
                saveValuesToStorage();
            }
        });
        
        // Intercept ajaxSetup event (fires before form serialization in TastyIgniter)
        jQuery(document).on('ajaxSetup.preview-persistence', 'form', function(event, options) {
            var $form = jQuery(this);
            if ($form.attr('action') && $form.attr('action').indexOf('settings/edit/general') !== -1) {
                console.log('🔧 Intercepting ajaxSetup - ensuring all MediaFinder inputs are ready...');
                
                // CRITICAL: Ensure all inputs have names and values before form serialization
                ensureAllMediaFinderInputsReady();
                
                // Store reference to form for later use in ajaxSend
                options._previewPersistenceForm = $form;
            }
        });
        
        // Intercept AJAX form submissions (this is the main one used by TastyIgniter)
        jQuery(document).on('ajaxSend.preview-persistence', function(event, xhr, settings) {
            if (settings.type === 'POST' && settings.url && settings.url.indexOf('settings/edit/general') !== -1) {
                console.log('🔧 Intercepting AJAX form submission - ensuring all MediaFinder inputs are ready...');
                
                // CRITICAL: Ensure all inputs have names and values before AJAX serialization
                ensureAllMediaFinderInputsReady();
                
                // Fields to check
                var fields = ['site_logo', 'dashboard_logo', 'favicon_logo'];
                
                // Intercept the actual data being sent
                if (settings.data) {
                    var formData = settings.data;
                    
                    // Get values from localStorage as backup
                    var storedValues = getValuesFromStorage();
                    
                    // If data is a string (form serialized), parse it and add missing fields
                    if (typeof formData === 'string') {
                        var params = new URLSearchParams(formData);
                        var added = 0;
                        
                        fields.forEach(function(field) {
                            var fieldName = 'setting[' + field + ']';
                            var input = document.querySelector('[name="' + fieldName + '"]');
                            var value = null;
                            
                            // Get value from input if available
                            if (input && input.value) {
                                value = input.value;
                            } else if (storedValues[field]) {
                                // Fallback to localStorage
                                value = storedValues[field];
                                console.log('📦 Using localStorage value for', field, ':', value.substring(0, 50));
                            }
                            
                            if (value) {
                                // Check if already present
                                if (!params.has(fieldName)) {
                                    params.set(fieldName, value);
                                    added++;
                                    console.log('✅ Added missing', field, 'to form data:', value.substring(0, 50));
                                } else {
                                    // Update if value changed
                                    var currentValue = params.get(fieldName);
                                    if (currentValue !== value) {
                                        params.set(fieldName, value);
                                        console.log('✅ Updated', field, 'in form data');
                                    }
                                }
                            }
                        });
                        
                        if (added > 0) {
                            settings.data = params.toString();
                            console.log('🔧 Added', added, 'missing field(s) to form data');
                        }
                    } else if (typeof formData === 'object') {
                        // If data is an object, ensure all fields are present
                        var added = 0;
                        fields.forEach(function(field) {
                            var fieldName = 'setting[' + field + ']';
                            var input = document.querySelector('[name="' + fieldName + '"]');
                            var value = null;
                            
                            // Get value from input if available
                            if (input && input.value) {
                                value = input.value;
                            } else if (storedValues[field]) {
                                // Fallback to localStorage
                                value = storedValues[field];
                                console.log('📦 Using localStorage value for', field, ':', value.substring(0, 50));
                            }
                            
                            if (value) {
                                if (!formData[fieldName]) {
                                    formData[fieldName] = value;
                                    added++;
                                    console.log('✅ Added missing', field, 'to form data object:', value.substring(0, 50));
                                } else if (formData[fieldName] !== value) {
                                    formData[fieldName] = value;
                                    console.log('✅ Updated', field, 'in form data object');
                                }
                            }
                        });
                        
                        if (added > 0) {
                            console.log('🔧 Added', added, 'missing field(s) to form data object');
                        }
                    }
                } else {
                    // If no data yet, it will be serialized from the form
                    // Ensure all inputs are ready and add them manually if needed
                    var $form = jQuery('form[action*="settings/edit/general"]');
                    if ($form.length) {
                        // Get current serialized data
                        var serialized = $form.serialize();
                        var missing = [];
                        
                        fields.forEach(function(field) {
                            var fieldName = 'setting[' + field + ']';
                            var input = document.querySelector('[name="' + fieldName + '"]');
                            
                            if (input && input.value) {
                                // Check if field is in serialized data
                                if (serialized.indexOf(fieldName + '=') === -1) {
                                    missing.push(fieldName + '=' + encodeURIComponent(input.value));
                                    console.log('✅ Will add missing', field, 'to form data');
                                }
                            }
                        });
                        
                        if (missing.length > 0) {
                            // Add missing fields to the request
                            if (!settings.data) {
                                settings.data = {};
                            }
                            if (typeof settings.data === 'string') {
                                settings.data += '&' + missing.join('&');
                            } else {
                                missing.forEach(function(param) {
                                    var parts = param.split('=');
                                    if (parts.length === 2) {
                                        settings.data[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
                                    }
                                });
                            }
                            console.log('🔧 Added', missing.length, 'missing field(s) to request data');
                        }
                    }
                }
                
                // Save to localStorage
                saveValuesToStorage();
            }
        });
    }
    
    function init() {
        interceptFormSubmit();
        restoreAllPreviews();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 500);
        });
    } else {
        setTimeout(init, 500);
    }
    
    if (typeof jQuery !== 'undefined') {
        jQuery(document).on('ajaxUpdateComplete', function() {
            setTimeout(function() {
                restoreAllPreviews();
                initPlusButtons();
            }, 500);
        });
    }
    
    // Watch for dynamically added plus buttons
    var observer = new MutationObserver(function(mutations) {
        var shouldInit = false;
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.matches && (node.matches('.find-button.blank-cover') || node.matches('.blank-cover'))) {
                        shouldInit = true;
                    } else if (node.querySelector && node.querySelector('.find-button.blank-cover, .blank-cover')) {
                        shouldInit = true;
                    }
                }
            });
        });
        
        if (shouldInit) {
            setTimeout(initPlusButtons, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    window.restoreImagePreviews = restoreAllPreviews;
    
})();
