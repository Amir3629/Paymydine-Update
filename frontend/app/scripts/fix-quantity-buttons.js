// Force fix for quantity selector buttons
(function() {
    'use strict';
    
    console.log('🔧 Loading quantity buttons fix...');
    
    function fixQuantityButtons() {
        // Find all quantity selector buttons
        const buttons = document.querySelectorAll('.quantity-btn, button[aria-label="Increase quantity"], button[aria-label="Decrease quantity"], button[aria-label="Add item"], button[aria-label="Add to cart"]');
        
        console.log('Found buttons:', buttons.length);
        
        buttons.forEach((button, index) => {
            // Check if this looks like a quantity selector button
            const aria = (button.getAttribute('aria-label') || '').toLowerCase();
            const isQuantityButton =
                button.classList.contains('quantity-btn') ||
                aria === 'increase quantity' ||
                aria === 'decrease quantity' ||
                aria === 'add item' ||
                aria === 'add to cart';
            
            if (isQuantityButton) {
                console.log(`Fixing button ${index}:`, button);
                
                // Force the styling
                button.style.backgroundColor = 'var(--theme-secondary)';
                button.style.color = 'var(--theme-background)';
                button.style.border = '1px solid var(--theme-border)';
                button.style.borderRadius = '50%';
                button.style.display = 'flex';
                button.style.alignItems = 'center';
                button.style.justifyContent = 'center';
                button.style.cursor = 'pointer';
                button.style.width = '48px';
                button.style.height = '48px';
                button.style.fontSize = '18px';
                button.style.fontWeight = 'bold';
                
                // Add hover effect
                button.addEventListener('mouseenter', function() {
                    this.style.opacity = '0.8';
                    this.style.transform = 'scale(1.05)';
                });
                
                button.addEventListener('mouseleave', function() {
                    this.style.opacity = '1';
                    this.style.transform = 'scale(1)';
                });
                
                // Fix any child elements (icons, text)
                const children = button.querySelectorAll('*');
                children.forEach(child => {
                    child.style.color = 'var(--theme-background)';
                });
            }
        });
        // PMD: cart badge is intentionally not touched here. Single owner is menu/page.tsx.
        console.log('✅ Quantity buttons fix applied!');
    }
    
    // Run immediately
    fixQuantityButtons();
    
    // Run again after a delay to catch dynamically loaded content
    setTimeout(fixQuantityButtons, 1000);
    setTimeout(fixQuantityButtons, 3000);
    
    // Run when new content is added
    const observer = new MutationObserver(function(mutations) {
        let shouldFix = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && (node.tagName === 'BUTTON' || node.querySelector('button'))) {
                        shouldFix = true;
                    }
                });
            }
        });
        if (shouldFix) {
            setTimeout(fixQuantityButtons, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
})();