/**
 * Fix Media Finder Inline Styles
 * Removes problematic inline styles that override our beautiful CSS
 */

(function() {
    'use strict';

    function fixMediaFinderStyles() {
        // Find all media finder inline mode instances
        const mediaFinders = document.querySelectorAll('.mediafinder.inline-mode, .mediafinder[data-mode="inline"]');
        
        mediaFinders.forEach(function(mediaFinder) {
            const inputGroup = mediaFinder.querySelector('.media-finder .input-group');
            const inputGroupText = mediaFinder.querySelector('.media-finder .input-group-text');
            const formControl = mediaFinder.querySelector('.media-finder .form-control[data-find-name]');
            const findButton = mediaFinder.querySelector('.media-finder .find-button');
            const removeButton = mediaFinder.querySelector('.media-finder .find-remove-button');
            
            // Fix input-group alignment - ensure everything is in one line
            if (inputGroup) {
                inputGroup.style.display = 'flex';
                inputGroup.style.flexDirection = 'row';
                inputGroup.style.alignItems = 'stretch';
                inputGroup.style.flexWrap = 'nowrap';
            }
            
            // Fix input-group-text - remove inline width, ensure proper display
            if (inputGroupText) {
                // Remove inline width styles (keep our CSS width)
                if (inputGroupText.style.width && inputGroupText.style.width === '50px') {
                    inputGroupText.style.removeProperty('width');
                }
                
                // Ensure proper display - Fix for vertical centering
                inputGroupText.style.display = 'flex';
                inputGroupText.style.alignItems = 'center';
                inputGroupText.style.justifyContent = 'center';
                inputGroupText.style.textAlign = 'center';
                inputGroupText.style.padding = '0';
                inputGroupText.style.height = '48px';
                inputGroupText.style.lineHeight = '0';
                inputGroupText.style.boxSizing = 'border-box';
                
                // Add placeholder icon if empty (using FontAwesome icon)
                const hasContent = inputGroupText.innerHTML.trim().length > 0 || 
                                 inputGroupText.querySelector('img') || 
                                 inputGroupText.querySelector('.media-icon') ||
                                 inputGroupText.querySelector('i');
                
                if (!hasContent) {
                    // Check if placeholder already exists
                    let placeholder = inputGroupText.querySelector('.placeholder-icon');
                    if (!placeholder) {
                        placeholder = document.createElement('i');
                        placeholder.className = 'fa fa-image placeholder-icon';
                        placeholder.style.fontSize = '24px';
                        placeholder.style.color = '#9ca3af';
                        placeholder.style.display = 'inline-flex';
                        placeholder.style.alignItems = 'center';
                        placeholder.style.justifyContent = 'center';
                        placeholder.style.width = '24px';
                        placeholder.style.height = '24px';
                        placeholder.style.lineHeight = '1';
                        placeholder.style.margin = '0';
                        placeholder.style.padding = '0';
                        placeholder.style.verticalAlign = 'middle';
                        placeholder.style.boxSizing = 'content-box';
                        placeholder.style.flexShrink = '0';
                        inputGroupText.appendChild(placeholder);
                    } else {
                        // Ensure existing placeholder has correct styles
                        placeholder.style.display = 'inline-flex';
                        placeholder.style.alignItems = 'center';
                        placeholder.style.justifyContent = 'center';
                        placeholder.style.width = '24px';
                        placeholder.style.height = '24px';
                        placeholder.style.lineHeight = '1';
                        placeholder.style.margin = '0';
                        placeholder.style.padding = '0';
                    }
                } else {
                    // Remove placeholder if content exists
                    const placeholder = inputGroupText.querySelector('.placeholder-icon');
                    if (placeholder) {
                        placeholder.remove();
                    }
                }
                
                // Ensure images are centered
                const img = inputGroupText.querySelector('img');
                if (img) {
                    img.style.display = 'block';
                    img.style.margin = '0 auto';
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                }
                
                // Ensure icons are centered - Fix FontAwesome icon alignment
                const allIcons = inputGroupText.querySelectorAll('.media-icon i, i:not(.placeholder-icon), .placeholder-icon');
                allIcons.forEach(function(icon) {
                    icon.style.display = 'inline-flex';
                    icon.style.alignItems = 'center';
                    icon.style.justifyContent = 'center';
                    icon.style.lineHeight = '1';
                    icon.style.verticalAlign = 'middle';
                    icon.style.margin = '0';
                    icon.style.padding = '0';
                    icon.style.boxSizing = 'content-box';
                    
                    // Set explicit dimensions for FontAwesome icons
                    if (!icon.style.width || icon.style.width === '100%') {
                        icon.style.width = '24px';
                    }
                    if (!icon.style.height || icon.style.height === '100%') {
                        icon.style.height = '24px';
                    }
                });
            }
            
            // Fix form-control alignment
            if (formControl) {
                formControl.style.display = 'flex';
                formControl.style.alignItems = 'center';
                formControl.style.verticalAlign = 'middle';
            }
            
            // Fix buttons - ensure proper alignment
            if (findButton) {
                findButton.style.display = 'inline-flex';
                findButton.style.alignItems = 'center';
                findButton.style.justifyContent = 'center';
                findButton.style.verticalAlign = 'middle';
                
                // Remove any green color references
                if (findButton.style.backgroundColor && (
                    findButton.style.backgroundColor.includes('green') ||
                    findButton.style.backgroundColor.includes('#08815e') ||
                    findButton.style.backgroundColor.includes('#0bb87a')
                )) {
                    findButton.style.removeProperty('background-color');
                    findButton.style.removeProperty('background');
                }
                
                // Ensure button icon is centered
                const buttonIcon = findButton.querySelector('i');
                if (buttonIcon) {
                    buttonIcon.style.display = 'inline-flex';
                    buttonIcon.style.alignItems = 'center';
                    buttonIcon.style.justifyContent = 'center';
                    buttonIcon.style.lineHeight = '1';
                    buttonIcon.style.verticalAlign = 'middle';
                    buttonIcon.style.margin = '0';
                    buttonIcon.style.padding = '0';
                }
            }
            
            if (removeButton) {
                removeButton.style.display = 'inline-flex';
                removeButton.style.alignItems = 'center';
                removeButton.style.justifyContent = 'center';
                removeButton.style.verticalAlign = 'middle';
                
                // Remove any green color references
                if (removeButton.style.backgroundColor && (
                    removeButton.style.backgroundColor.includes('green') ||
                    removeButton.style.backgroundColor.includes('#08815e') ||
                    removeButton.style.backgroundColor.includes('#0bb87a')
                )) {
                    removeButton.style.removeProperty('background-color');
                    removeButton.style.removeProperty('background');
                }
                
                // Ensure button icon is centered
                const buttonIcon = removeButton.querySelector('i');
                if (buttonIcon) {
                    buttonIcon.style.display = 'inline-flex';
                    buttonIcon.style.alignItems = 'center';
                    buttonIcon.style.justifyContent = 'center';
                    buttonIcon.style.lineHeight = '1';
                    buttonIcon.style.verticalAlign = 'middle';
                    buttonIcon.style.margin = '0';
                    buttonIcon.style.padding = '0';
                }
            }
        });
    }

    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixMediaFinderStyles);
    } else {
        fixMediaFinderStyles();
    }

    // Run after AJAX content loads (for dynamic forms)
    document.addEventListener('ajax:complete', function() {
        setTimeout(fixMediaFinderStyles, 100);
    });

    // Run when media finder is initialized (if there's a custom event)
    document.addEventListener('mediafinder:initialized', fixMediaFinderStyles);

    // Use MutationObserver to watch for new media finders added dynamically
    const observer = new MutationObserver(function(mutations) {
        let shouldFix = false;
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    if (node.classList && (
                        node.classList.contains('mediafinder') ||
                        node.querySelector && node.querySelector('.mediafinder')
                    )) {
                        shouldFix = true;
                    }
                }
            });
        });
        
        if (shouldFix) {
            setTimeout(fixMediaFinderStyles, 100);
        }
    });

    // Start observing
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
})();
