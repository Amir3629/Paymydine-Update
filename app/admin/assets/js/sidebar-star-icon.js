/**
 * Sidebar Star Icon
 * Creates a real DOM element for the star icon to avoid overflow/clipping issues
 * This runs on all SuperAdmin pages
 */

(function() {
    'use strict';
    
    // Wait for DOM to be fully loaded
    function createStarIcon() {
        // Remove old star if exists (in case script runs multiple times)
        const oldStar = document.getElementById('sidebar-star-icon');
        if (oldStar) {
            oldStar.remove();
        }
        
        // Create a real div element as the star
        const starElement = document.createElement('div');
        starElement.id = 'sidebar-star-icon';
        starElement.textContent = '✦';
        starElement.style.cssText = `
            position: fixed !important;
            top: 33px !important;
            left: 201px !important;
            font-size: 64px !important;
            color: rgb(32, 41, 56) !important;
            z-index: 999999 !important;
            line-height: 1 !important;
            pointer-events: none !important;
            text-shadow: 0 0 10px rgba(32, 41, 56, 0.5) !important;
            display: block !important;
            width: auto !important;
            height: auto !important;
        `;
        
        document.body.appendChild(starElement);
        
        console.log('✅ Sidebar star icon created');
    }
    
    // Create star when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createStarIcon);
    } else {
        // DOM is already ready
        createStarIcon();
    }
    
})();

