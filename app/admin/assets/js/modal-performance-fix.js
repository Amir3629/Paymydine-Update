// Modal Performance Fix - Global flag to skip expensive operations when modal is open
// This prevents the 13+ second freeze when media manager opens

(function() {
    'use strict';
    
    console.log('🚀 Modal Performance Fix: Initializing...');
    
    // Global flag - all observers should check this
    window.MODAL_IS_OPEN = false;
    window.SKIP_EXPENSIVE_OBSERVERS = false;
    
    // Function to check if we should skip processing
    window.shouldSkipObserver = function(mutation) {
        if (window.SKIP_EXPENSIVE_OBSERVERS) {
            return true;
        }
        if (window.MODAL_IS_OPEN) {
            // Only skip if mutation is inside a modal (not toolbar)
            if (mutation.target.closest) {
                const modal = mutation.target.closest('.modal');
                if (modal) {
                    const isToolbar = mutation.target.closest('.media-toolbar, #mediamanager-toolbar');
                    return !isToolbar; // Skip if inside modal but not toolbar
                }
            }
            // Check added nodes
            for (const node of mutation.addedNodes || []) {
                if (node.nodeType === 1 && node.closest) {
                    const modal = node.closest('.modal');
                    if (modal) {
                        const isToolbar = node.closest('.media-toolbar, #mediamanager-toolbar');
                        if (!isToolbar) {
                            return true; // Skip if inside modal but not toolbar
                        }
                    }
                }
            }
        }
        return false;
    };
    
    // Set flag when modal opens
    document.addEventListener('show.bs.modal', function(e) {
        const modal = e.target;
        if (modal.id === 'media-manager' || modal.classList.contains('media-modal')) {
            console.log('🚨 Media manager opening - setting SKIP flag');
            window.MODAL_IS_OPEN = true;
            window.SKIP_EXPENSIVE_OBSERVERS = true;
        }
    }, { passive: true });
    
    document.addEventListener('shown.bs.modal', function(e) {
        const modal = e.target;
        if (modal.id === 'media-manager' || modal.classList.contains('media-modal')) {
            console.log('✅ Media manager opened - SKIP flag active');
        }
    }, { passive: true });
    
    // Clear flag when modal closes
    document.addEventListener('hide.bs.modal', function(e) {
        const modal = e.target;
        if (modal.id === 'media-manager' || modal.classList.contains('media-modal')) {
            console.log('🚨 Media manager closing - clearing SKIP flag');
            setTimeout(() => {
                window.MODAL_IS_OPEN = false;
                window.SKIP_EXPENSIVE_OBSERVERS = false;
            }, 100);
        }
    }, { passive: true });
    
    document.addEventListener('hidden.bs.modal', function(e) {
        const modal = e.target;
        if (modal.id === 'media-manager' || modal.classList.contains('media-modal')) {
            console.log('✅ Media manager closed - SKIP flag cleared');
            window.MODAL_IS_OPEN = false;
            window.SKIP_EXPENSIVE_OBSERVERS = false;
        }
    }, { passive: true });
    
    // Also watch for modal-open class on body (backup)
    const bodyObserver = new MutationObserver(function(mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const hasModalOpen = document.body.classList.contains('modal-open');
                const modal = document.querySelector('.modal.show');
                const isMediaModal = modal && (modal.id === 'media-manager' || modal.classList.contains('media-modal'));
                
                if (hasModalOpen && isMediaModal) {
                    window.MODAL_IS_OPEN = true;
                    window.SKIP_EXPENSIVE_OBSERVERS = true;
                } else if (!hasModalOpen) {
                    window.MODAL_IS_OPEN = false;
                    window.SKIP_EXPENSIVE_OBSERVERS = false;
                }
            }
        }
    });
    
    bodyObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });
    
    console.log('✅ Modal Performance Fix: Active');
    console.log('   Use window.SKIP_EXPENSIVE_OBSERVERS in observer callbacks to skip processing');
})();
