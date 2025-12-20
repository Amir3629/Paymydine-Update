// Fix modal blur by moving modals outside page-wrapper

(function() {
    'use strict';
    
    console.log('🔧 Modal Blur Fix initialized');
    
    // Function to move modal to body
    function moveModalToBody(modal) {
        if (modal && modal.parentElement && modal.parentElement.tagName !== 'BODY') {
            document.body.appendChild(modal);
            console.log('✅ Modal moved to body:', modal.id || modal.className);
            
            // Also ensure the modal has no blur applied
            modal.style.setProperty('filter', 'none', 'important');
            modal.style.setProperty('-webkit-filter', 'none', 'important');
            modal.style.setProperty('backdrop-filter', 'none', 'important');
            modal.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
        }
    }
    
    // Watch for modals being shown
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                // Check if it's a modal
                if (node.nodeType === 1 && node.classList && node.classList.contains('modal')) {
                    moveModalToBody(node);
                }
            });
            
            // Check if modal class changed to 'show'
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.classList.contains('modal') && target.classList.contains('show')) {
                    moveModalToBody(target);
                    // Also run it again after a short delay to ensure it sticks
                    setTimeout(() => moveModalToBody(target), 100);
                }
            }
        });
    });
    
    // Also watch for body class changes (modal-open)
    const bodyObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.classList.contains('modal-open')) {
                    // When modal opens, immediately move all modals to body
                    document.querySelectorAll('.modal.show').forEach(moveModalToBody);
                }
            }
        });
    });
    
    bodyObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });
    
    // Also move any existing modals
    document.querySelectorAll('.modal').forEach(function(modal) {
        moveModalToBody(modal);
    });
    
    console.log('✅ Modal Blur Fix active - modals will be moved to body');
})();

