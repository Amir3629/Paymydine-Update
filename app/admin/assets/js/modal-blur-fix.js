// Fix modal blur by moving modals outside page-wrapper
// OPTIMIZED: Only use event listeners, no expensive MutationObservers

(function() {
    'use strict';
    
    console.log('🔧 Modal Blur Fix initialized (optimized)');
    
    // Track processed modals to avoid duplicate work
    const processedModals = new WeakSet();
    
    // Function to move modal to body and remove blur - only run once per modal
    function moveModalToBody(modal) {
        if (!modal || processedModals.has(modal)) {
            return; // Already processed
        }
        
        processedModals.add(modal);
        
        if (modal.parentElement && modal.parentElement.tagName !== 'BODY') {
            document.body.appendChild(modal);
        }
        
        // Remove blur from modal and its content only
        modal.style.setProperty('filter', 'none', 'important');
        modal.style.setProperty('-webkit-filter', 'none', 'important');
        modal.style.setProperty('backdrop-filter', 'none', 'important');
        modal.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        modal.style.setProperty('pointer-events', 'auto', 'important');
        
        // Remove blur from modal content only (not all children)
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.setProperty('filter', 'none', 'important');
            modalContent.style.setProperty('-webkit-filter', 'none', 'important');
            modalContent.style.setProperty('backdrop-filter', 'none', 'important');
            modalContent.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
            modalContent.style.setProperty('pointer-events', 'auto', 'important');
        }
        
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.style.setProperty('pointer-events', 'auto', 'important');
        }
    }
    
    // Use Bootstrap modal events instead of expensive MutationObservers
    document.addEventListener('show.bs.modal', function(e) {
        const modal = e.target;
        if (modal.classList.contains('modal')) {
            moveModalToBody(modal);
        }
    }, { passive: true });
    
    document.addEventListener('shown.bs.modal', function(e) {
        const modal = e.target;
        if (modal.classList.contains('modal')) {
            moveModalToBody(modal);
        }
    }, { passive: true });
    
    // Also check for modals when body gets modal-open class (lightweight check)
    let lastModalCheck = 0;
    const checkModals = () => {
        const now = Date.now();
        if (now - lastModalCheck < 100) return; // Throttle to max once per 100ms
        lastModalCheck = now;
        
        if (document.body.classList.contains('modal-open')) {
            const modals = document.querySelectorAll('.modal.show');
            modals.forEach(modal => {
                if (!processedModals.has(modal)) {
                    moveModalToBody(modal);
                }
            });
        }
    };
    
    // Lightweight observer only for body class changes (not subtree)
    const bodyObserver = new MutationObserver(function(mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                checkModals();
                break; // Only need to check once
            }
        }
    });
    
    bodyObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });
    
    // Process any existing modals on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.modal').forEach(moveModalToBody);
        });
    } else {
        document.querySelectorAll('.modal').forEach(moveModalToBody);
    }
    
    console.log('✅ Modal Blur Fix active (optimized - no expensive observers)');
})();

