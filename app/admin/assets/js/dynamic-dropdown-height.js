/**
 * Dynamic Dropdown Height Controller
 * Makes dropdown height adjust based on number of options
 */

document.addEventListener('DOMContentLoaded', function() {
    // Function to calculate and set dynamic height and width
    function setDynamicDimensions() {
        // Find all SlimSelect dropdowns
        const dropdowns = document.querySelectorAll('.ss-content');
        
        dropdowns.forEach(function(dropdown) {
            const options = dropdown.querySelectorAll('.ss-option');
            const optionCount = options.length;
            
            // Remove existing height classes
            const list = dropdown.querySelector('.ss-list');
            if (list) {
                list.classList.remove('ss-few-options', 'ss-many-options');
                
                // Add appropriate class based on option count
                if (optionCount <= 3) {
                    list.classList.add('ss-few-options');
                } else if (optionCount > 10) {
                    list.classList.add('ss-many-options');
                }
                
                // Calculate exact height for smooth animation
                const optionHeight = 48; // Approximate height per option (padding + margin)
                const maxHeight = Math.min(optionCount * optionHeight + 16, 300); // 16px for padding
                
                // Set the calculated height
                list.style.maxHeight = maxHeight + 'px';
            }
            
            // Find the correct main field - look for the actual SlimSelect main element
            let mainField = null;
            
            // Method 1: Look for sibling with class ss-main
            let sibling = dropdown.previousElementSibling;
            while (sibling) {
                if (sibling.classList.contains('ss-main')) {
                    mainField = sibling;
                    break;
                }
                sibling = sibling.previousElementSibling;
            }
            
            // Method 2: Look in parent container
            if (!mainField) {
                const parent = dropdown.parentElement;
                if (parent) {
                    mainField = parent.querySelector('.ss-main');
                }
            }
            
            // Method 3: Look for element with same data-id pattern
            if (!mainField) {
                const dropdownId = dropdown.getAttribute('data-id');
                if (dropdownId) {
                    const mainId = dropdownId.replace('ss-', '');
                    mainField = document.querySelector(`[data-id="${mainId}"]`);
                }
            }
            
            // Method 4: Look for the actual select element that SlimSelect replaced
            if (!mainField) {
                // Find the hidden select element that SlimSelect creates
                const hiddenSelect = document.querySelector('select[data-control="selectlist"]');
                if (hiddenSelect) {
                    // Find the SlimSelect wrapper
                    const wrapper = hiddenSelect.closest('.form-group') || hiddenSelect.parentElement;
                    if (wrapper) {
                        mainField = wrapper.querySelector('.ss-main');
                    }
                }
            }
            
            if (mainField) {
                const mainFieldRect = mainField.getBoundingClientRect();
                console.log(`🔧 Setting dropdown width to ${mainFieldRect.width}px (SlimSelect handles positioning)`);
                
                // ONLY SET WIDTH - Let SlimSelect handle left/top positioning
                dropdown.style.setProperty('width', mainFieldRect.width + 'px', 'important');
                dropdown.style.setProperty('max-width', mainFieldRect.width + 'px', 'important');
                dropdown.style.setProperty('min-width', mainFieldRect.width + 'px', 'important');
                
                // NUCLEAR OPTION: Use CSS custom properties for width only
                dropdown.style.setProperty('--dropdown-width', mainFieldRect.width + 'px', 'important');
                
                // Force the computed style to match
                const computedStyle = window.getComputedStyle(dropdown);
                console.log(`📊 Computed width after setting: ${computedStyle.width}`);
                console.log(`📍 SlimSelect positioning: left=${computedStyle.left}, top=${computedStyle.top}`);
                
            } else {
                console.warn('Could not find main field for dropdown:', dropdown);
            }
        });
    }
    
    // Run on initial load
    setDynamicDimensions();
    
    // Run when dropdowns are opened (SlimSelect events)
    document.addEventListener('click', function(e) {
        if (e.target.closest('.ss-main')) {
            console.log('🎯 Dropdown clicked - applying width fix');
            // Small delay to ensure DOM is updated
            setTimeout(setDynamicDimensions, 50);
            setTimeout(setDynamicDimensions, 100);
            setTimeout(setDynamicDimensions, 200);
            setTimeout(setDynamicDimensions, 500);
        }
    });
    
    // Run when window is resized
    window.addEventListener('resize', setDynamicDimensions);
    
    // Run when new content is loaded (for dynamic forms)
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                setTimeout(setDynamicDimensions, 100);
            }
        });
    });
    
    // Observe the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Watch for SlimSelect style changes and override them immediately
    const styleObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const target = mutation.target;
                if (target.classList.contains('ss-content')) {
                    console.log('🚨 SlimSelect changed styles - overriding immediately');
                    // Immediately override any width changes
                    const mainField = target.previousElementSibling?.classList.contains('ss-main') 
                        ? target.previousElementSibling 
                        : target.parentElement?.querySelector('.ss-main');
                    
                    if (mainField) {
                        const mainFieldRect = mainField.getBoundingClientRect();
                        // ONLY SET WIDTH - Don't interfere with SlimSelect's positioning
                        target.style.setProperty('width', mainFieldRect.width + 'px', 'important');
                        target.style.setProperty('max-width', mainFieldRect.width + 'px', 'important');
                        target.style.setProperty('min-width', mainFieldRect.width + 'px', 'important');
                    }
                }
            }
        });
    });
    
    // Observe all ss-content elements for style changes
    document.querySelectorAll('.ss-content').forEach(function(element) {
        styleObserver.observe(element, {
            attributes: true,
            attributeFilter: ['style']
        });
    });
    
    // NUCLEAR OPTION: Continuous monitoring every 100ms
    console.log('🚀 Starting continuous dropdown width monitoring...');
    setInterval(function() {
        const openDropdowns = document.querySelectorAll('.ss-content.ss-open-below, .ss-content.ss-open-above');
        if (openDropdowns.length > 0) {
            console.log(`🔄 Found ${openDropdowns.length} open dropdown(s) - forcing width...`);
            setDynamicDimensions();
        }
    }, 100);
});

/**
 * Enhanced Smooth Dropdown Animation
 * Adds extra smoothness to the dropdown opening/closing
 */
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth transition classes to all dropdowns
    const style = document.createElement('style');
    style.textContent = `
        .ss-content {
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                       transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                       opacity 0.3s ease-in-out,
                       max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                       width 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            z-index: 9999 !important;
            background-color: #ffffff !important;
        }
        
        .ss-content.ss-open-below,
        .ss-content.ss-open-above {
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                       transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                       opacity 0.3s ease-in-out,
                       max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                       width 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        .ss-content .ss-list {
            transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        /* Ensure dropdown stays above all other elements */
        .ss-content {
            position: absolute !important;
            z-index: 9999 !important;
        }
        
        /* Prevent background elements from showing through */
        .ss-content .ss-list {
            background-color: #ffffff !important;
            position: relative !important;
            z-index: 10000 !important;
        }
    `;
    document.head.appendChild(style);
});
