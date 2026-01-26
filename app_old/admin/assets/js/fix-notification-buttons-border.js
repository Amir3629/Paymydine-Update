// ============================================
// FIX NOTIFICATION BUTTONS BOTTOM BORDER
// Ensures both Note and History buttons show their bottom border
// ============================================

(function() {
    'use strict';
    
    function fixButtonBorders() {
        const noteButton = document.getElementById('notif-note-btn');
        const historyLink = document.getElementById('notif-history-link');
        
        [noteButton, historyLink].forEach(function(button) {
            if (!button) return;
            
            // Ensure bottom border is visible
            button.style.setProperty('border', '1px solid #c9d2e3', 'important');
            button.style.setProperty('border-bottom', '1px solid #c9d2e3', 'important');
            button.style.setProperty('border-bottom-width', '1px', 'important');
            button.style.setProperty('border-bottom-style', 'solid', 'important');
            button.style.setProperty('border-bottom-color', '#c9d2e3', 'important');
        });
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixButtonBorders);
    } else {
        fixButtonBorders();
    }
    
    // Run after a short delay to catch buttons after they're styled
    setTimeout(fixButtonBorders, 100);
    setTimeout(fixButtonBorders, 500);
})();
