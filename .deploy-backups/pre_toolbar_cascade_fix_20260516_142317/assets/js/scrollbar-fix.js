/**
 * CLEAN SCROLLBAR ARROW FIX
 * Simple solution to hide scrollbar arrows - no excessive logging
 */

(function() {
    'use strict';
    
    // Inject CSS to hide all scrollbar arrows globally
    function hideScrollbarArrows() {
        // Remove any existing fix styles
        const existingStyle = document.getElementById('clean-scrollbar-fix');
        if (existingStyle) {
            return; // Already applied
        }
        
        const style = document.createElement('style');
        style.id = 'clean-scrollbar-fix';
        style.textContent = `
            /* Hide all scrollbar buttons/arrows globally */
            *::-webkit-scrollbar-button {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }
            
            /* Hide scrollbars completely */
            *::-webkit-scrollbar {
                width: 0 !important;
                height: 0 !important;
            }
            
            /* Firefox and other browsers */
            * {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Run immediately
    hideScrollbarArrows();
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideScrollbarArrows);
    }
    
})();
