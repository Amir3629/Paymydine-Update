// Global Media Manager Search Icon Fix
// This script adds a search icon to the media manager search input
// It works regardless of how the modal is opened

(function() {
    'use strict';
    
    function addSearchIcon() {
        // Find search input - try multiple selectors
        var searchInput = document.querySelector('.media-toolbar input[data-media-control="search"]') ||
                         document.querySelector('.media-modal input[data-media-control="search"]') ||
                         document.querySelector('input[data-media-control="search"]');
        
        if (!searchInput) {
            return false;
        }
        
        // Check if icon already exists
        var parent = searchInput.parentElement;
        if (parent.querySelector('.search-icon-fa')) {
            return true; // Already added
        }
        
        // Wrap input in its own container for proper icon positioning
        var wrapper = searchInput.parentElement.querySelector('.search-input-inner-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'search-input-inner-wrapper';
            wrapper.style.cssText = 'position:relative;display:inline-block;vertical-align:middle;';
            
            // Insert wrapper before input
            parent.insertBefore(wrapper, searchInput);
            // Move input into wrapper
            wrapper.appendChild(searchInput);
        }
        
        // Ensure wrapper has position relative
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.verticalAlign = 'middle';
        
        // Create icon with SVG (works without Font Awesome)
        var icon = document.createElement('span');
        icon.className = 'search-icon-fa';
        icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04 2.092 2.092 2.092 2.092l3.262 3.261a1 1 0 0 0 1.415-1.415l-3.261-3.261a6.471 6.471 0 0 0 .001-.001zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" fill="#364a63"/></svg>';
        
        // Apply styles - icon stays centered in button, moves to left when expanded
        // Position relative to wrapper (which is same size as input)
        icon.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#364a63;font-size:16px;pointer-events:none;z-index:10;display:block;visibility:visible;opacity:1;line-height:1;width:16px;height:16px;text-align:center;margin:0;padding:0;border:none;box-shadow:none;background:transparent;transition:left 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);';
        
        // Insert icon into wrapper (before input)
        wrapper.insertBefore(icon, searchInput);
        
        // Function to update icon position and wrapper width based on state
        function updateIconPosition() {
            var isExpanded = searchInput.classList.contains('expanded') || searchInput === document.activeElement || searchInput.value;
            
            if (isExpanded) {
                // Expanded state - icon stays on left at 14px, wrapper expands
                icon.style.left = '14px';
                icon.style.transform = 'translateY(-50%)';
                wrapper.style.width = '200px';
            } else {
                // Collapsed state - icon centered, wrapper small
                icon.style.left = '50%';
                icon.style.transform = 'translate(-50%, -50%)';
                wrapper.style.width = '42px';
            }
        }
        
        // Set initial wrapper size (collapsed)
        wrapper.style.width = '42px';
        wrapper.style.height = '42px';
        
        // Ensure icon starts centered
        icon.style.left = '50%';
        icon.style.transform = 'translate(-50%, -50%)';
        
        // Force icon to stay at 14px when expanded - use !important via setProperty
        function setIconLeft() {
            icon.style.setProperty('left', '14px', 'important');
            icon.style.setProperty('transform', 'translateY(-50%)', 'important');
        }
        
        function setIconCenter() {
            icon.style.setProperty('left', '50%', 'important');
            icon.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
        }
        
        // Add click handler to expand
        searchInput.addEventListener('click', function(e) {
            if (!this.classList.contains('expanded') && this !== document.activeElement) {
                this.classList.add('expanded');
                // Immediately move icon to left before expansion animation
                setIconLeft();
                wrapper.style.width = '200px';
                setTimeout(function() {
                    searchInput.focus();
                    // Force again after focus
                    setIconLeft();
                }, 50);
            } else {
                // Already expanded, ensure icon is on left
                setIconLeft();
            }
        });
        
        // Add focus handler
        searchInput.addEventListener('focus', function() {
            this.classList.add('expanded');
            // Immediately move icon to left
            setIconLeft();
            wrapper.style.width = '200px';
        });
        
        // Add blur handler
        searchInput.addEventListener('blur', function() {
            if (!this.value) {
                this.classList.remove('expanded');
                // Move icon back to center when collapsed
                setIconCenter();
                wrapper.style.width = '42px';
            } else {
                // Keep icon on left if there's text
                setIconLeft();
            }
        });
        
        // Add input handler
        searchInput.addEventListener('input', function() {
            if (this.value) {
                if (!this.classList.contains('expanded')) {
                    this.classList.add('expanded');
                }
                // Keep icon on left when typing
                setIconLeft();
                wrapper.style.width = '200px';
            } else {
                // If text is cleared, icon goes back to center
                setIconCenter();
            }
        });
        
        // Also check on any state change
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (searchInput.classList.contains('expanded') || searchInput.value) {
                        setIconLeft();
                    } else {
                        setIconCenter();
                    }
                }
            });
        });
        observer.observe(searchInput, { attributes: true, attributeFilter: ['class'] });
        
        // Periodic check to ensure icon stays on left when expanded
        setInterval(function() {
            if (searchInput.classList.contains('expanded') || searchInput === document.activeElement || searchInput.value) {
                var currentLeft = window.getComputedStyle(icon).left;
                if (currentLeft !== '14px' && currentLeft !== '13.5938px' && currentLeft !== '14.4062px') {
                    setIconLeft();
                }
            }
        }, 100);
        
        console.log('✅ Search icon added to media manager');
        return true;
    }
    
    // Try to add icon immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(addSearchIcon, 100);
        });
    } else {
        setTimeout(addSearchIcon, 100);
    }
    
    // Listen for modal shown event
    document.addEventListener('shown.bs.modal', function(e) {
        if (e.target && (e.target.classList.contains('media-modal') || e.target.querySelector('.media-toolbar'))) {
            setTimeout(addSearchIcon, 200);
        }
    });
    
    // Also use MutationObserver to catch when modal content is added
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.classList && (node.classList.contains('media-modal') || node.querySelector('.media-toolbar'))) {
                            setTimeout(addSearchIcon, 300);
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Periodic check as fallback
    setInterval(function() {
        var input = document.querySelector('.media-toolbar input[data-media-control="search"]');
        if (input && !input.parentElement.querySelector('.search-icon-fa')) {
            addSearchIcon();
        }
    }, 1000);
})();

