/**
 * Sidebar Star Icon
 * Creates a real DOM element for the star icon to avoid overflow/clipping issues
 * Works for both Admin Panel and SuperAdmin Panel
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
        
        // Detect which panel we're in by checking for superadmin-specific elements
        const isSuperadmin = document.querySelector('.nk-sidebar') !== null || 
                            window.location.pathname.includes('/superadmin') ||
                            document.body.classList.contains('superadmin');
        
        let leftPosition, topPosition, starColor, shadowColor;
        
        if (isSuperadmin) {
            // Superadmin panel - minimal adjustment (slightly right and up)
            leftPosition = 203;
            topPosition = 31;
            starColor = 'transparent'; // Use transparent so CSS gradient can work
            shadowColor = 'rgba(80, 101, 132, 0.3)'; // Lighter shadow for gradient effect
        } else {
            // Admin panel - position at top right of 230px sidebar
            // Moved a bit to the right and up
            leftPosition = 210;
            topPosition = 25;
            starColor = '#516484'; // Admin panel color
            shadowColor = 'rgba(81, 100, 132, 0.5)'; // RGB equivalent of #516484
        }
        
        // Check if we're on mobile - hide star icon on mobile
        const isMobile = window.innerWidth <= 991;
        
        if (isMobile) {
            // Don't create star icon on mobile
            return;
        }
        
        // Create a real div element as the star
        const starElement = document.createElement('div');
        starElement.id = 'sidebar-star-icon';
        starElement.textContent = '✦';
        starElement.style.cssText = `
            position: fixed !important;
            top: ${topPosition}px !important;
            left: ${leftPosition}px !important;
            font-size: 64px !important;
            color: ${starColor} !important;
            z-index: 1030 !important;
            line-height: 1 !important;
            pointer-events: none !important;
            text-shadow: 0 0 10px ${shadowColor} !important;
            display: block !important;
            width: auto !important;
            height: auto !important;
        `;
        
        document.body.appendChild(starElement);
        
        // Hide star icon on window resize to mobile
        window.addEventListener('resize', function() {
            const star = document.getElementById('sidebar-star-icon');
            if (window.innerWidth <= 991) {
                if (star) {
                    star.style.display = 'none';
                }
            } else {
                if (star) {
                    star.style.display = 'block';
                }
            }
        });
        
        console.log('✅ Sidebar star icon created');
    }
    
    // Create star when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createStarIcon);
    } else {
        // DOM is already ready
        createStarIcon();
    }
    
    // Also retry after a short delay in case sidebar loads dynamically
    setTimeout(function() {
        const existingStar = document.getElementById('sidebar-star-icon');
        if (!existingStar) {
            createStarIcon();
        }
    }, 500);
    
    // Final retry after longer delay for slow-loading pages
    setTimeout(function() {
        const existingStar = document.getElementById('sidebar-star-icon');
        if (!existingStar) {
            createStarIcon();
        }
    }, 2000);
    
})();

