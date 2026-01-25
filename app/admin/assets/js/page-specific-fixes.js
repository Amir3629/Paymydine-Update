/**
 * PAGE-SPECIFIC FIXES
 * Targeted fixes for specific pages that can't be handled with CSS alone
 */

document.addEventListener('DOMContentLoaded', function() {
    // Only run on the statuses page
    if (document.body.classList.contains('statuses') && 
        (window.location.href.includes('/admin/statuses') || 
         window.location.pathname.endsWith('/statuses'))) {
        
        console.log('🔥 Applying SUPER AGGRESSIVE Statuses page fixes');
        
        // Function to completely obliterate an element from existence
        function nukeElement(el) {
            if (!el) return;
            
            // Apply every possible hiding technique
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('height', '0px', 'important');
            el.style.setProperty('padding', '0px', 'important');
            el.style.setProperty('margin', '0px', 'important');
            el.style.setProperty('border', 'none', 'important');
            el.style.setProperty('overflow', 'hidden', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('opacity', '0', 'important');
            el.style.setProperty('position', 'absolute', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
            el.style.setProperty('clip', 'rect(0,0,0,0)', 'important');
            el.style.setProperty('max-height', '0px', 'important');
            el.style.setProperty('min-height', '0px', 'important');
            el.style.setProperty('transform', 'scale(0)', 'important');
        }

        // SUPER AGGRESSIVE: Target EVERYTHING that could possibly create a gap
        const selectors = [
            // All toolbar related elements
            '.toolbar', 
            '.toolbar-action', 
            '.progress-indicator-container',
            '.page-title-section',
            
            // All containers that might have padding/margin
            '.content-wrapper > .container-fluid > .toolbar',
            '.content-wrapper > .container-fluid > .toolbar-action',
            '.page-content > .container-fluid > .toolbar',
            '.page-content > .container-fluid > .toolbar-action',
            '.page-content > .row-fluid > .toolbar',
            '.page-content > .row-fluid > .toolbar-action',
            
            // Any empty containers
            '.page-content > .container-fluid > div:empty',
            '.page-content > .row-fluid > div:empty',
            '.list-container > div:empty',
            
            // Any element with "toolbar" in its class name
            '[class*="toolbar"]'
        ];
        
        // Nuke all matching elements
        document.querySelectorAll(selectors.join(', ')).forEach(nukeElement);
        
        // Remove all top margins and paddings from key containers
        const containers = [
            '.page-content > .container-fluid',
            '.page-content > .row-fluid',
            '.list-container',
            '.list-container > *',
            '.table-container',
            '.table-responsive'
        ];
        
        containers.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.setProperty('margin-top', '0', 'important');
                el.style.setProperty('padding-top', '0', 'important');
            });
        });
        
        // Force the list to start at the very top
        const listContainer = document.querySelector('.list-container');
        if (listContainer) {
            listContainer.style.setProperty('margin-top', '0', 'important');
            listContainer.style.setProperty('padding-top', '0', 'important');
            
            // Also fix any parent elements
            let parent = listContainer.parentElement;
            while (parent && !parent.classList.contains('page-content')) {
                parent.style.setProperty('margin-top', '0', 'important');
                parent.style.setProperty('padding-top', '0', 'important');
                parent = parent.parentElement;
            }
        }

        // Use a MutationObserver to catch any elements added dynamically
        const observer = new MutationObserver(function(mutations) {
            // Skip processing when modal is open to prevent freeze
            if (window.SKIP_EXPENSIVE_OBSERVERS || document.body.classList.contains('modal-open')) {
                return;
            }
            // Skip if any mutation is inside a modal
            for (const mutation of mutations) {
                if (window.shouldSkipObserver && window.shouldSkipObserver(mutation)) {
                    return;
                }
                if (mutation.target.closest && mutation.target.closest('.modal')) {
                    return;
                }
                // Also check added nodes
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1 && node.closest && node.closest('.modal')) {
                        return;
                    }
                }
            }
            
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            // Check if this is a toolbar-related element
                            if (node.classList) {
                                const classStr = Array.from(node.classList).join(' ');
                                if (classStr.includes('toolbar') || 
                                    classStr.includes('progress') || 
                                    node.tagName === 'DIV' && node.children.length === 0) {
                                    nukeElement(node);
                                }
                                
                                // Also check for newly added elements that match our selectors
                                selectors.forEach(selector => {
                                    if (node.matches && node.matches(selector)) {
                                        nukeElement(node);
                                    }
                                    
                                    // And check children
                                    if (node.querySelectorAll) {
                                        node.querySelectorAll(selector).forEach(nukeElement);
                                    }
                                });
                            }
                        }
                    });
                }
            });
        });

        // Observe the entire document body for changes
        observer.observe(document.body, { childList: true, subtree: true, attributes: true });

        // Run multiple delayed checks for elements that might render later
        [100, 300, 500, 1000, 2000].forEach(delay => {
            setTimeout(() => {
                // Re-run our selectors each time
                document.querySelectorAll(selectors.join(', ')).forEach(nukeElement);
                
                // Also check for any elements with minimal content
                document.querySelectorAll('.page-content *').forEach(el => {
                    if (el.children.length === 0 && el.textContent.trim() === '' && 
                        !el.matches('input, button, select, textarea, img, br, hr')) {
                        nukeElement(el);
                    }
                });
                
                // Force all containers to have no top spacing
                containers.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        el.style.setProperty('margin-top', '0', 'important');
                        el.style.setProperty('padding-top', '0', 'important');
                    });
                });
                
                console.log(`🔧 Delayed fixes for Statuses page executed (${delay}ms)`);
            }, delay);
        });
    }
    
    // ============================================
    // FIX: Dark Blue Buttons with Dark Text
    // Ensure all buttons with dark blue backgrounds have white text
    // ============================================
    
    function fixDarkBlueButtonText() {
        function getRGB(color) {
            if (!color) return null;
            const match = color.match(/\d+/g);
            if (match && match.length >= 3) {
                return {
                    r: parseInt(match[0]),
                    g: parseInt(match[1]),
                    b: parseInt(match[2])
                };
            }
            return null;
        }
        
        function isDarkBackground(color) {
            if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
                return false;
            }
            const rgb = getRGB(color);
            if (!rgb) {
                // Check for dark blue hex colors
                const lower = color.toLowerCase();
                if (lower.includes('#202938') || lower.includes('#364a63') || 
                    lower.includes('#526484') || lower.includes('#1f2937') ||
                    lower.includes('#1f2b3a')) {
                    return true;
                }
                return false;
            }
            // Calculate luminance
            const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
            return luminance < 0.5; // Dark if luminance < 50%
        }
        
        function isLightBackground(color) {
            if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
                return false;
            }
            const rgb = getRGB(color);
            if (!rgb) return false;
            // Calculate luminance
            const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
            return luminance >= 0.5; // Light if luminance >= 50%
        }
        
        function isWhiteText(color) {
            if (!color) return false;
            const rgb = getRGB(color);
            if (rgb) {
                return rgb.r > 240 && rgb.g > 240 && rgb.b > 240;
            }
            const lower = color.toLowerCase();
            return lower.includes('rgb(255') || lower.includes('rgba(255') || 
                   lower.includes('#fff') || lower.includes('white');
        }
        
        function isDarkText(color) {
            if (!color) return false;
            return !isWhiteText(color);
        }
        
        // Find all buttons and labels
        const buttons = document.querySelectorAll(
            '.btn, button, label.btn, label.btn-light, .btn-light, [class*="btn"]'
        );
        
        let fixedCount = 0;
        
        buttons.forEach((btn) => {
            const computedStyle = window.getComputedStyle(btn);
            const bgColor = computedStyle.backgroundColor;
            const textColor = computedStyle.color;
            
            const bgIsDark = isDarkBackground(bgColor);
            const bgIsLight = isLightBackground(bgColor);
            const textIsWhite = isWhiteText(textColor);
            const textIsDark = isDarkText(textColor);
            
            let needsFix = false;
            
            // Case 1: Dark background → should have WHITE text
            if (bgIsDark && textIsDark) {
                btn.style.setProperty('color', '#ffffff', 'important');
                // Also fix all children
                const children = btn.querySelectorAll('*');
                children.forEach(child => {
                    child.style.setProperty('color', '#ffffff', 'important');
                });
                needsFix = true;
            }
            
            // Case 2: Light background (unselected) → should have DARK BLUE text
            if (bgIsLight && textIsWhite) {
                // Only fix if it's a btn-light that's not selected
                const isSelected = btn.classList.contains('active') || 
                                 btn.getAttribute('aria-pressed') === 'true' ||
                                 (btn.tagName === 'INPUT' && btn.checked) ||
                                 (btn.tagName === 'LABEL' && btn.querySelector('input:checked'));
                
                if (!isSelected) {
                    btn.style.setProperty('color', '#202938', 'important');
                    // Also fix all children
                    const children = btn.querySelectorAll('*');
                    children.forEach(child => {
                        child.style.setProperty('color', '#202938', 'important');
                    });
                    needsFix = true;
                }
            }
            
            if (needsFix) {
                fixedCount++;
            }
        });
        
        if (fixedCount > 0) {
            console.log(`✅ Fixed ${fixedCount} buttons with incorrect text colors`);
        }
        
        return fixedCount;
    }
    
    // Run immediately
    fixDarkBlueButtonText();
    
    // Run after a short delay to catch dynamically added elements
    setTimeout(fixDarkBlueButtonText, 100);
    setTimeout(fixDarkBlueButtonText, 500);
    setTimeout(fixDarkBlueButtonText, 1000);
    
    // Watch for changes (e.g., when radio buttons are checked/unchecked)
    const observer = new MutationObserver(function(mutations) {
        // Skip processing when modal is open to prevent freeze
        if (window.SKIP_EXPENSIVE_OBSERVERS || document.body.classList.contains('modal-open')) {
            return;
        }
        // Skip if any mutation is inside a modal
        for (const mutation of mutations) {
            if (window.shouldSkipObserver && window.shouldSkipObserver(mutation)) {
                return;
            }
            if (mutation.target.closest && mutation.target.closest('.modal')) {
                return;
            }
        }
        
        let shouldFix = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && 
                (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                shouldFix = true;
            }
            if (mutation.addedNodes.length) {
                shouldFix = true;
            }
        });
        if (shouldFix) {
            setTimeout(fixDarkBlueButtonText, 50);
        }
    });
    
    // Observe the document for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });
    
    // Also watch for input changes (radio/checkbox checked state)
    document.addEventListener('change', function(e) {
        if (e.target.type === 'radio' || e.target.type === 'checkbox') {
            setTimeout(fixDarkBlueButtonText, 50);
        }
    });
    
    // Watch for click events on buttons (in case styles change on click)
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.btn, button, label.btn, label.btn-light, .btn-light');
        if (btn) {
            // Fix immediately and after a delay to catch state changes
            setTimeout(fixDarkBlueButtonText, 10);
            setTimeout(fixDarkBlueButtonText, 100);
            setTimeout(fixDarkBlueButtonText, 300);
            
            // Also fix related buttons in the same group
            const form = btn.closest('form');
            const btnGroup = btn.closest('.btn-group');
            if (form || btnGroup) {
                setTimeout(fixDarkBlueButtonText, 150);
            }
        }
    }, true);
    
    // ============================================
    // FIX: Image Upload Fields - Ice White Background + Dark Blue Plus Icon
    // ============================================
    
    function fixImageUploadFields() {
        // Find all blank-cover elements (empty image upload fields)
        const blankCovers = document.querySelectorAll(
            '.media-finder .grid .blank-cover, ' +
            '.media-finder .grid .find-button.blank-cover, ' +
            '.media-finder .grid a.blank-cover'
        );
        
        blankCovers.forEach((cover) => {
            // Set ice white background
            cover.style.setProperty('background', '#f1f4fb', 'important');
            cover.style.setProperty('background-color', '#f1f4fb', 'important');
            
            // Find plus icon inside
            const plusIcon = cover.querySelector('i.fa-plus, .fa-plus, i[class*="fa-plus"]');
            if (plusIcon) {
                // Set dark blue color (override inline styles)
                plusIcon.style.setProperty('color', '#202938', 'important');
            }
        });
        
        // Also fix on hover
        blankCovers.forEach((cover) => {
            cover.addEventListener('mouseenter', function() {
                this.style.setProperty('background', '#e5ebf7', 'important');
                this.style.setProperty('background-color', '#e5ebf7', 'important');
                const plusIcon = this.querySelector('i.fa-plus, .fa-plus, i[class*="fa-plus"]');
                if (plusIcon) {
                    plusIcon.style.setProperty('color', '#364a63', 'important');
                }
            });
            
            cover.addEventListener('mouseleave', function() {
                this.style.setProperty('background', '#f1f4fb', 'important');
                this.style.setProperty('background-color', '#f1f4fb', 'important');
                const plusIcon = this.querySelector('i.fa-plus, .fa-plus, i[class*="fa-plus"]');
                if (plusIcon) {
                    plusIcon.style.setProperty('color', '#202938', 'important');
                }
            });
        });
        
        // Fix image grid hover - remove green colors
        const imageGrids = document.querySelectorAll('.media-finder .grid');
        imageGrids.forEach((grid) => {
            // Remove green border and shadow on hover
            grid.addEventListener('mouseenter', function() {
                const computedStyle = window.getComputedStyle(this);
                // Check if border is green
                if (computedStyle.borderColor.includes('rgb(8, 129, 94)') || 
                    computedStyle.borderColor.includes('#08815e')) {
                    this.style.setProperty('border-color', '#364a63', 'important');
                }
                // Check if box-shadow has green
                if (computedStyle.boxShadow.includes('rgb(8, 129, 94)') || 
                    computedStyle.boxShadow.includes('rgba(8, 129, 94')) {
                    this.style.setProperty('box-shadow', '0 8px 24px rgba(54, 74, 99, 0.15)', 'important');
                }
            });
        });
    }
    
    // Run immediately
    fixImageUploadFields();
    
    // Run after delays to catch dynamically added elements
    setTimeout(fixImageUploadFields, 100);
    setTimeout(fixImageUploadFields, 500);
    setTimeout(fixImageUploadFields, 1000);
    
    // Watch for new image upload fields
    const imageFieldObserver = new MutationObserver(function(mutations) {
        // Skip processing when modal is open to prevent freeze
        if (window.SKIP_EXPENSIVE_OBSERVERS || document.body.classList.contains('modal-open')) {
            return;
        }
        // Skip if any mutation is inside a modal
        for (const mutation of mutations) {
            if (window.shouldSkipObserver && window.shouldSkipObserver(mutation)) {
                return;
            }
            if (mutation.target.closest && mutation.target.closest('.modal')) {
                return;
            }
        }
        
        let shouldFix = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && 
                        (node.classList && (node.classList.contains('blank-cover') || 
                         node.classList.contains('find-button') ||
                         node.querySelector && node.querySelector('.blank-cover')))) {
                        shouldFix = true;
                    }
                });
            }
        });
        if (shouldFix) {
            setTimeout(fixImageUploadFields, 50);
        }
    });
    
    imageFieldObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // ============================================
    // FIX: Remove ALL Green Colors - Replace with Dark Blue
    // ============================================
    
    function removeAllGreenColors() {
        const greenColors = [
            '#08815e', '#066b52', '#055a45', '#0bb87a', '#0f9d58', '#0c7d47', '#0aa868',
            'rgb(8, 129, 94)', 'rgb(6, 107, 82)', 'rgb(5, 90, 69)', 'rgb(11, 184, 122)',
            'rgb(15, 157, 88)', 'rgb(12, 125, 71)', 'rgb(10, 168, 104)',
            'rgba(8, 129, 94', 'rgba(6, 107, 82', 'rgba(15, 157, 88'
        ];
        
        const darkBlueColors = {
            '#08815e': '#364a63',
            '#066b52': '#526484',
            '#055a45': '#2a3a4e',
            '#0bb87a': '#526484',
            '#0f9d58': '#364a63',
            '#0c7d47': '#364a63',
            '#0aa868': '#526484',
            'rgb(8, 129, 94)': 'rgb(54, 74, 99)',
            'rgb(6, 107, 82)': 'rgb(82, 100, 132)',
            'rgb(5, 90, 69)': 'rgb(42, 58, 78)',
            'rgb(11, 184, 122)': 'rgb(82, 100, 132)',
            'rgb(15, 157, 88)': 'rgb(54, 74, 99)',
            'rgb(12, 125, 71)': 'rgb(54, 74, 99)',
            'rgb(10, 168, 104)': 'rgb(82, 100, 132)'
        };
        
        let fixedCount = 0;
        
        // FIRST: Specifically target .btn-secondary buttons and force dark blue
        const secondaryButtons = document.querySelectorAll('.btn-secondary, button.btn-secondary, a.btn-secondary');
        secondaryButtons.forEach((btn) => {
            const computedStyle = window.getComputedStyle(btn);
            const bgColor = computedStyle.backgroundColor;
            const borderColor = computedStyle.borderColor;
            const bg = computedStyle.background;
            
            let needsFix = false;
            
            // Check if background has green
            if (bgColor && greenColors.some(g => bgColor.includes(g))) {
                btn.style.setProperty('background-color', '#364a63', 'important');
                needsFix = true;
            }
            if (bg && greenColors.some(g => bg.includes(g))) {
                btn.style.setProperty('background', '#364a63', 'important');
                needsFix = true;
            }
            
            // Check if border has green
            if (borderColor && greenColors.some(g => borderColor.includes(g))) {
                btn.style.setProperty('border-color', '#364a63', 'important');
                needsFix = true;
            }
            
            // Force white text
            btn.style.setProperty('color', '#ffffff', 'important');
            
            if (needsFix) {
                fixedCount++;
            }
        });
        
        // SECOND: Fix all elements with green colors in inline styles
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach((el) => {
            const style = el.getAttribute('style');
            if (!style) return;
            
            let newStyle = style;
            let wasChanged = false;
            
            // Check for green colors in various CSS properties
            greenColors.forEach(green => {
                const darkBlue = darkBlueColors[green] || '#364a63';
                
                // Replace in border-color
                if (newStyle.includes('border') && newStyle.includes(green)) {
                    newStyle = newStyle.replace(
                        new RegExp(`border[^:]*:\\s*[^;]*${green.replace(/[()]/g, '\\$&')}[^;]*`, 'gi'),
                        (match) => match.replace(new RegExp(green.replace(/[()]/g, '\\$&'), 'gi'), darkBlue)
                    );
                    wasChanged = true;
                }
                
                // Replace in box-shadow
                if (newStyle.includes('box-shadow') && newStyle.includes(green)) {
                    newStyle = newStyle.replace(
                        new RegExp(`box-shadow[^:]*:\\s*[^;]*${green.replace(/[()]/g, '\\$&')}[^;]*`, 'gi'),
                        (match) => match.replace(new RegExp(green.replace(/[()]/g, '\\$&'), 'gi'), darkBlue)
                    );
                    wasChanged = true;
                }
                
                // Replace in background
                if (newStyle.includes('background') && newStyle.includes(green)) {
                    newStyle = newStyle.replace(
                        new RegExp(`background[^:]*:\\s*[^;]*${green.replace(/[()]/g, '\\$&')}[^;]*`, 'gi'),
                        (match) => match.replace(new RegExp(green.replace(/[()]/g, '\\$&'), 'gi'), darkBlue)
                    );
                    wasChanged = true;
                }
            });
            
            if (wasChanged) {
                el.setAttribute('style', newStyle);
                fixedCount++;
            }
        });
        
        // Also fix image upload field hover effects
        const imageGrids = document.querySelectorAll('.media-finder .grid');
        imageGrids.forEach((grid) => {
            // Remove green border on hover
            grid.addEventListener('mouseenter', function() {
                const computedStyle = window.getComputedStyle(this);
                if (computedStyle.borderColor.includes('rgb(8, 129, 94)') || 
                    computedStyle.borderColor.includes('#08815e')) {
                    this.style.setProperty('border-color', '#364a63', 'important');
                }
                if (computedStyle.boxShadow.includes('rgb(8, 129, 94)') || 
                    computedStyle.boxShadow.includes('rgba(8, 129, 94')) {
                    this.style.setProperty('box-shadow', '0 8px 24px rgba(54, 74, 99, 0.15)', 'important');
                }
            });
        });
        
        if (fixedCount > 0) {
            console.log(`✅ Removed ${fixedCount} green colors, replaced with dark blue`);
        }
        
        return fixedCount;
    }
    
    // Run immediately
    removeAllGreenColors();
    
    // Run after delays
    setTimeout(removeAllGreenColors, 100);
    setTimeout(removeAllGreenColors, 500);
    setTimeout(removeAllGreenColors, 1000);
    
    // Watch for style changes AND new elements being added
    const greenColorObserver = new MutationObserver(function(mutations) {
        // Skip processing when modal is open to prevent freeze
        if (window.SKIP_EXPENSIVE_OBSERVERS || document.body.classList.contains('modal-open')) {
            return;
        }
        // Skip if any mutation is inside a modal
        for (const mutation of mutations) {
            if (window.shouldSkipObserver && window.shouldSkipObserver(mutation)) {
                return;
            }
            if (mutation.target.closest && mutation.target.closest('.modal')) {
                return;
            }
        }
        
        let shouldFix = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                shouldFix = true;
            }
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if any added nodes are buttons
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && (node.classList.contains('btn-secondary') || node.querySelector('.btn-secondary'))) {
                            shouldFix = true;
                        }
                    }
                });
            }
        });
        if (shouldFix) {
            setTimeout(removeAllGreenColors, 50);
        }
    });
    
    greenColorObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        childList: true,
        subtree: true
    });
    
    // Also run periodically to catch any missed cases
    setInterval(removeAllGreenColors, 2000);
    
    // ============================================
    // FIX: Hide Green Progress Indicator Text
    // Remove green text that appears behind save button
    // ============================================
    
    function hideProgressIndicatorText() {
        // Find all progress indicators
        const progressIndicators = document.querySelectorAll('.progress-indicator');
        
        progressIndicators.forEach((indicator) => {
            // Hide the text div inside progress indicator
            const textDiv = indicator.querySelector('div');
            if (textDiv) {
                textDiv.style.setProperty('display', 'none', 'important');
                textDiv.style.setProperty('visibility', 'hidden', 'important');
                textDiv.style.setProperty('opacity', '0', 'important');
                textDiv.style.setProperty('color', 'transparent', 'important');
            }
            
            // Also hide the entire text content
            indicator.style.setProperty('color', 'transparent', 'important');
        });
    }
    
    // Run immediately
    hideProgressIndicatorText();
    
    // Run after delays to catch dynamically added indicators
    setTimeout(hideProgressIndicatorText, 100);
    setTimeout(hideProgressIndicatorText, 500);
    setTimeout(hideProgressIndicatorText, 1000);
    
    // Watch for new progress indicators being added
    const progressObserver = new MutationObserver(function(mutations) {
        // Skip processing when modal is open to prevent freeze
        if (window.SKIP_EXPENSIVE_OBSERVERS || document.body.classList.contains('modal-open')) {
            return;
        }
        // Skip if any mutation is inside a modal
        for (const mutation of mutations) {
            if (window.shouldSkipObserver && window.shouldSkipObserver(mutation)) {
                return;
            }
            if (mutation.target.closest && mutation.target.closest('.modal')) {
                return;
            }
        }
        
        let shouldHide = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && (node.classList.contains('progress-indicator') || 
                            node.querySelector && node.querySelector('.progress-indicator'))) {
                            shouldHide = true;
                        }
                    }
                });
            }
        });
        if (shouldHide) {
            setTimeout(hideProgressIndicatorText, 10);
        }
    });
    
    progressObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Also run periodically to catch any missed cases
    setInterval(hideProgressIndicatorText, 500);
    
    // ============================================
    // FIX: Instant color change for toggle button groups
    // Remove all transitions when buttons are checked
    // ============================================
    function forceInstantToggleButtonColors() {
        // Find all toggle button groups
        const toggleGroups = document.querySelectorAll('.btn-group-toggle');
        
        toggleGroups.forEach(group => {
            const radioInputs = group.querySelectorAll('input[type="radio"]');
            
            radioInputs.forEach(radio => {
                const label = group.querySelector(`label[for="${radio.id}"]`);
                if (!label) return;
                
                // Remove all transitions from label
                label.style.setProperty('transition', 'none', 'important');
                label.style.setProperty('transition-property', 'none', 'important');
                label.style.setProperty('transition-duration', '0s', 'important');
                label.style.setProperty('transition-delay', '0s', 'important');
                label.style.setProperty('-webkit-transition', 'none', 'important');
                label.style.setProperty('-moz-transition', 'none', 'important');
                label.style.setProperty('-o-transition', 'none', 'important');
                
                // Force instant color change on click
                radio.addEventListener('change', function() {
                    if (this.checked) {
                        // Instantly change color - no delay
                        label.style.setProperty('color', 'rgb(255, 255, 255)', 'important');
                        label.style.setProperty('transition', 'none', 'important');
                        
                        // Also change all child elements instantly
                        const children = label.querySelectorAll('*');
                        children.forEach(child => {
                            child.style.setProperty('color', 'rgb(255, 255, 255)', 'important');
                            child.style.setProperty('transition', 'none', 'important');
                        });
                    }
                }, { passive: true });
                
                // Also handle on click for immediate feedback
                label.addEventListener('click', function() {
                    if (radio.checked) {
                        // Force instant color change
                        this.style.setProperty('color', 'rgb(255, 255, 255)', 'important');
                        this.style.setProperty('transition', 'none', 'important');
                        
                        const children = this.querySelectorAll('*');
                        children.forEach(child => {
                            child.style.setProperty('color', 'rgb(255, 255, 255)', 'important');
                            child.style.setProperty('transition', 'none', 'important');
                        });
                    }
                }, { passive: true });
            });
        });
    }
    
    // Run immediately and on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', forceInstantToggleButtonColors);
    } else {
        forceInstantToggleButtonColors();
    }
    
    // Also run after a delay to catch dynamically loaded content
    setTimeout(forceInstantToggleButtonColors, 100);
    setTimeout(forceInstantToggleButtonColors, 500);
    
    // ============================================
    // FIX: Lock Save Button Width - Prevent Size Changes
    // Keep save button at fixed 90px width
    // ============================================
    
    // Freeze button styles - EXACTLY like other buttons in progress-indicator-container
    function protectButtonStyles(button) {
        if (!button || button.dataset.styleLocked) return;
        
        button.dataset.styleLocked = 'true';
        const isSaveOrBack = button.matches('[data-request="onSave"]') || 
                             (button.closest('.progress-indicator-container') && button.matches('.btn-outline-secondary'));
        
        if (!isSaveOrBack) return; // Only protect Save and Back buttons
        
        // EXACT same styles as other working buttons - width: auto, padding: 0.55rem 1.75rem
        const criticalStyles = 'display:inline-flex!important;width:auto!important;padding:0.55rem 1.75rem!important;';
        const baseStyles = 'align-items:center!important;justify-content:center!important;text-align:center!important;line-height:1.3!important;white-space:nowrap!important;height:40px!important;min-height:40px!important;box-sizing:border-box!important;vertical-align:middle!important;';
        
        // Store current non-critical styles (colors, borders, etc) before locking
        const currentStyle = button.getAttribute('style') || '';
        
        // Set all styles at once - critical styles first, then existing styles
        button.style.cssText = criticalStyles + baseStyles + currentStyle;
        
        // Intercept setAttribute to prevent style changes to critical properties
        const originalSetAttribute = button.setAttribute.bind(button);
        button.setAttribute = function(name, value) {
            if (name === 'style') {
                // Allow style to be set, but immediately restore critical properties
                originalSetAttribute(name, value);
                // Force critical styles back IMMEDIATELY - SAME as other working buttons
                this.style.setProperty('display', 'inline-flex', 'important');
                this.style.setProperty('width', 'auto', 'important');
                this.style.setProperty('padding', '0.55rem 1.75rem', 'important');
                this.style.setProperty('align-items', 'center', 'important');
                this.style.setProperty('justify-content', 'center', 'important');
                this.style.setProperty('height', '40px', 'important');
                this.style.setProperty('min-height', '40px', 'important');
                this.style.setProperty('line-height', '1.3', 'important');
                this.style.setProperty('white-space', 'nowrap', 'important');
                this.style.setProperty('box-sizing', 'border-box', 'important');
            } else {
                originalSetAttribute(name, value);
            }
        };
        
        // Intercept style.setProperty to ONLY block display: inline-block
        const originalSetProperty = button.style.setProperty.bind(button.style);
        button.style.setProperty = function(property, value, priority) {
            // ONLY block display: inline-block - let everything else through
            if (property === 'display' && (value === 'inline-block' || value === 'block')) {
                return originalSetProperty('display', 'inline-flex', 'important');
            }
            return originalSetProperty(property, value, priority);
        };
    }
    
    function lockSaveButtonWidth() {
        // Find all save buttons AND back buttons
        const saveButtons = document.querySelectorAll(
            '[data-request="onSave"], .btn-primary[data-request="onSave"], ' +
            '.toolbar .btn-primary[data-request="onSave"], .toolbar-action .btn-primary[data-request="onSave"], ' +
            '.progress-indicator-container .btn-primary[data-request="onSave"]'
        );
        
        const backButtons = document.querySelectorAll(
            '.progress-indicator-container .btn-outline-secondary'
        );
        
        const allButtons = [...saveButtons, ...backButtons];
        
        allButtons.forEach((btn) => {
            // Protect button FIRST - this locks styles EXACTLY like other buttons
            protectButtonStyles(btn);
            
            // protectButtonStyles already sets all the critical styles
            // No need to modify styles again - that causes re-renders!
        });
    }
    
    // INJECT CSS RULES to lock button styles at CSS level (can't be overridden easily)
    (function() {
        const styleId = 'save-back-button-lock-styles';
        if (document.getElementById(styleId)) return; // Already injected
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* LOCK Save and Back buttons - SAME as other buttons in progress-indicator-container */
            /* Prevent Save buttons from stretching in btn-group (like system_logs page buttons) */
            .btn-group [data-request="onSave"],
            .btn-group .btn-primary[data-request="onSave"],
            .btn-group .btn[data-request="onSave"],
            .progress-indicator-container [data-request="onSave"],
            .progress-indicator-container .btn-primary[data-request="onSave"],
            [data-request="onSave"].btn-primary,
            .progress-indicator-container .btn-outline-secondary {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                text-align: center !important;
                width: auto !important;
                flex: 0 0 auto !important;
                flex-grow: 0 !important;
                flex-shrink: 0 !important;
                flex-basis: auto !important;
                height: 40px !important;
                min-height: 40px !important;
                padding: 0.55rem 1.75rem !important;
                line-height: 1.3 !important;
                vertical-align: middle !important;
                white-space: nowrap !important;
                box-sizing: border-box !important;
            }
            
            /* Fix btn-group to be inline inside progress-indicator-container - prevents new line */
            div.progress-indicator-container > div.btn-group,
            div.progress-indicator-container div.btn-group,
            .progress-indicator-container > .btn-group,
            .progress-indicator-container .btn-group {
                display: inline-flex !important;
                vertical-align: middle !important;
                margin: 0 !important;
                margin-left: 0 !important;
                margin-right: 10px !important;
                width: auto !important;
                flex: 0 0 auto !important;
                flex-shrink: 0 !important;
                float: none !important;
                clear: none !important;
            }
        `;
        document.head.appendChild(style);
    })();
    
    // Run immediately to protect buttons
    lockSaveButtonWidth();
    
    // Run a few times to catch dynamically added buttons, then STOP
    setTimeout(lockSaveButtonWidth, 50);
    setTimeout(lockSaveButtonWidth, 200);
    setTimeout(lockSaveButtonWidth, 500);
    // Stop calling it after 500ms - protectButtonStyles will handle ongoing protection
    
    // Watch for style changes on save buttons and IMMEDIATELY fix them
    const widthObserver = new MutationObserver(function(mutations) {
        // Skip processing when modal is open to prevent freeze (except for modal buttons)
        const isModalMutation = mutations.some(mutation => {
            if (mutation.target.closest && mutation.target.closest('.modal')) {
                return true;
            }
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.closest && node.closest('.modal')) {
                    return true;
                }
            }
            return false;
        });
        
        // Only skip if it's NOT a modal button we care about
        if (document.body.classList.contains('modal-open') && !isModalMutation) {
            // Check if mutation is for a button we care about
            let isImportantButton = false;
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const btn = mutation.target;
                    const isSaveButton = btn.matches && (
                        btn.matches('[data-request="onSave"]') ||
                        btn.matches('.btn-primary[data-request="onSave"]')
                    );
                    if (isSaveButton) {
                        isImportantButton = true;
                        break;
                    }
                }
            }
            if (!isImportantButton) {
                return;
            }
        }
        
        let shouldLock = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const btn = mutation.target;
                const isSaveButton = btn.matches && (
                    btn.matches('[data-request="onSave"]') ||
                    btn.matches('.btn-primary[data-request="onSave"]') ||
                    (btn.closest('.progress-indicator-container') && btn.matches('.btn-primary[data-request="onSave"]'))
                );
                
                const isBackButton = btn.matches && (
                    btn.closest('.progress-indicator-container') && btn.matches('.btn-outline-secondary')
                );
                
                if (isSaveButton || isBackButton) {
                    // Protect the button - locks styles EXACTLY like other buttons
                    protectButtonStyles(btn);
                    
                    // Force correct styles immediately - SAME as other buttons
                    btn.style.setProperty('display', 'inline-flex', 'important');
                    btn.style.setProperty('width', 'auto', 'important');
                    btn.style.setProperty('padding', '0.55rem 1.75rem', 'important');
                }
            }
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.matches && (
                            node.matches('[data-request="onSave"]') ||
                            node.matches('.btn-primary[data-request="onSave"]')
                        )) {
                            protectButtonStyles(node);
                            shouldLock = true;
                        }
                    }
                });
            }
        });
        if (shouldLock) {
            // Run immediately, no timeout
            lockSaveButtonWidth();
        }
    });
    
    widthObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['style'],
        childList: true,
        subtree: true
    });
    
    // Protect buttons immediately when found
    setTimeout(function() {
        const saveButtons = document.querySelectorAll('[data-request="onSave"], .progress-indicator-container .btn-primary[data-request="onSave"]');
        const backButtons = document.querySelectorAll('.progress-indicator-container .btn-outline-secondary');
        [...saveButtons, ...backButtons].forEach(protectButtonStyles);
    }, 0);
    
    // DON'T run periodically - protectButtonStyles handles everything
    // Running this causes constant re-renders and jumping
});
