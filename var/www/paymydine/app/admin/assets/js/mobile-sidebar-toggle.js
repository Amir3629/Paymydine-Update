/* ============================================
   MOBILE SIDEBAR TOGGLE HANDLER
   Ensures sidebar starts hidden on mobile
   Handles menu toggle click to show/hide sidebar
   Shows logo when sidebar is open
   ============================================ */

(function() {
    'use strict';

    function initMobileSidebar() {
        // Check if we're on mobile/tablet
        const isMobile = window.innerWidth <= 1199;
        
        if (!isMobile) {
            // Desktop: sidebar should be visible, logo should be visible
            return;
        }

        // Find sidebar elements
        const superadminSidebar = document.querySelector('.nk-sidebar');
        const adminSidebar = document.querySelector('.sidebar, .nav-sidebar, #navSidebar');
        const sidebar = superadminSidebar || adminSidebar;
        
        if (!sidebar) {
            return;
        }

        // Find menu toggle buttons
        // For superadmin, there are TWO toggles:
        // 1. One in sidebar (hidden when sidebar is closed)
        // 2. One in header (always visible) - THIS IS THE ONE THAT WORKS
        // The actual clickable element is the <a> tag with class "nk-nav-toggle"
        const superadminToggleLink = document.querySelector('.nk-header .nk-menu-trigger a.nk-nav-toggle, .nk-sidebar .nk-menu-trigger a.nk-nav-toggle.d-xl-none, .nk-sidebar .nk-menu-trigger a[data-target="sidebarMenu"]');
        const superadminToggle = document.querySelector('.nk-header .nk-menu-trigger, .nk-header .nk-nav-toggle, .nk-sidebar .nk-menu-trigger, .nk-sidebar .nk-nav-toggle');
        const adminToggle = document.querySelector('.navbar-top .navbar-toggler, .navbar-toggler[data-bs-toggle="collapse"]');
        // Prefer header toggle (always visible), then sidebar toggle, then admin toggle
        const menuToggle = superadminToggleLink || superadminToggle || adminToggle;

        // Ensure sidebar starts hidden on mobile
        if (sidebar && !sidebar.classList.contains('show') && !sidebar.classList.contains('nk-sidebar-active')) {
            sidebar.style.transform = 'translateX(-100%)';
        }
        
        // CRITICAL: Force header to be full width on mobile/tablet
        const header = document.querySelector('.nk-header, .nk-header.nk-header-fixed, .nk-header.is-light');
        if (header && isMobile) {
            // Force header to full width immediately
            header.style.width = '100%';
            header.style.left = '0';
            header.style.right = '0';
            header.style.marginLeft = '0';
            
            // Also check periodically to ensure it stays (in case other scripts override it)
            const enforceHeaderPosition = function() {
                if (!header) return;
                const rect = header.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                if (rect.left !== 0 || Math.abs(rect.width - viewportWidth) > 5) {
                    header.style.width = '100%';
                    header.style.left = '0';
                    header.style.right = '0';
                    header.style.marginLeft = '0';
                }
            };
            
            // Check immediately and then periodically
            setTimeout(enforceHeaderPosition, 50);
            setTimeout(enforceHeaderPosition, 200);
            setTimeout(enforceHeaderPosition, 500);
            
            // Check every 500ms for the first 3 seconds (in case other scripts are setting it)
            let checkCount = 0;
            const checkInterval = setInterval(function() {
                enforceHeaderPosition();
                checkCount++;
                if (checkCount >= 6) { // 6 * 500ms = 3 seconds
                    clearInterval(checkInterval);
                }
            }, 500);
            
            // Also check on any style changes
            try {
                const observer = new MutationObserver(function(mutations) {
                    enforceHeaderPosition();
                });
                observer.observe(header, { attributes: true, attributeFilter: ['style'] });
            } catch (e) {
                // MutationObserver not supported, that's okay
            }
        }

        // NO OVERLAY - don't create dark overlay
        // Just let the sidebar slide in without darkening the page
        let overlay = document.querySelector('.sidebar-overlay, .nk-sidebar-overlay');
        if (overlay) {
            // Remove existing overlay
            overlay.remove();
        }
        overlay = null; // Don't use overlay

        // Function to open sidebar
        function openSidebar() {
            if (sidebar) {
                sidebar.classList.add('show');
                sidebar.classList.add('nk-sidebar-active');
                sidebar.style.transform = 'translateX(0)';
                document.body.classList.add('sidebar-open');
                
                // NO OVERLAY - don't darken the page
                // Hide toggle buttons when sidebar is open
                const allToggles = document.querySelectorAll('.nk-header .nk-menu-trigger, .nk-sidebar .nk-menu-trigger, .nk-header .nk-nav-toggle, .nk-sidebar .nk-nav-toggle');
                allToggles.forEach(function(toggle) {
                    if (toggle) {
                        toggle.style.display = 'none';
                        toggle.style.visibility = 'hidden';
                        toggle.style.opacity = '0';
                        toggle.style.pointerEvents = 'none';
                    }
                });
            }
        }

        // Function to close sidebar
        function closeSidebar() {
            if (sidebar) {
                sidebar.classList.remove('show');
                sidebar.classList.remove('nk-sidebar-active');
                sidebar.style.transform = 'translateX(-100%)';
                document.body.classList.remove('sidebar-open');
                
                // Show toggle buttons again when sidebar is closed
                const allToggles = document.querySelectorAll('.nk-header .nk-menu-trigger, .nk-sidebar .nk-menu-trigger, .nk-header .nk-nav-toggle, .nk-sidebar .nk-nav-toggle');
                allToggles.forEach(function(toggle) {
                    if (toggle) {
                        toggle.style.display = '';
                        toggle.style.visibility = '';
                        toggle.style.opacity = '';
                        toggle.style.pointerEvents = '';
                    }
                });
            }
        }

        // Function to toggle sidebar
        function toggleSidebar() {
            if (sidebar.classList.contains('show') || sidebar.classList.contains('nk-sidebar-active')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        }

        // Handle menu toggle click - DIRECT APPROACH
        // Find ALL toggle links and handle them
        const toggleSelectors = [
            '.nk-header .nk-menu-trigger a.nk-nav-toggle',
            '.nk-sidebar .nk-menu-trigger a.nk-nav-toggle.d-xl-none',
            '.nk-sidebar .nk-menu-trigger a[data-target="sidebarMenu"]',
            'a.nk-nav-toggle[data-target="sidebarMenu"]'
        ];
        
        let foundToggles = [];
        toggleSelectors.forEach(function(selector) {
            const toggles = document.querySelectorAll(selector);
            toggles.forEach(function(toggle) {
                if (!foundToggles.includes(toggle)) {
                    foundToggles.push(toggle);
                }
            });
        });
        
        // If no toggles found with selectors, use menuToggle
        if (foundToggles.length === 0 && menuToggle) {
            foundToggles.push(menuToggle);
        }
        
        // Set up click handlers for all found toggles
        foundToggles.forEach(function(toggle) {
            if (!toggle) return;
            
            // Click handler - ensure sidebar toggles
            // Don't prevent default - let framework work too, but ensure our function runs
            const clickHandler = function(e) {
                // Always call our toggle function
                toggleSidebar();
            };
            
            // Add in capture phase (runs early)
            toggle.addEventListener('click', clickHandler, true);
            
            // Add in bubbling phase (runs after framework, ensures it works)
            toggle.addEventListener('click', function(e) {
                // Double-check: if sidebar didn't toggle, force it
                setTimeout(function() {
                    const wasClosed = !sidebar.classList.contains('show') && !sidebar.classList.contains('nk-sidebar-active');
                    const isNowOpen = sidebar.classList.contains('show') || sidebar.classList.contains('nk-sidebar-active');
                    
                    // If it was closed and is still closed, open it
                    if (wasClosed && !isNowOpen) {
                        openSidebar();
                    }
                }, 100);
            }, false);
            
            // Handle clicks on icon inside
            const icon = toggle.querySelector('em.icon, .icon');
            if (icon) {
                icon.addEventListener('click', clickHandler, true);
                icon.addEventListener('click', clickHandler, false);
            }
            
            // Handle clicks on parent container
            if (toggle.parentElement) {
                toggle.parentElement.addEventListener('click', function(e) {
                    if (e.target === toggle || toggle.contains(e.target)) {
                        clickHandler(e);
                    }
                }, true);
            }
        });

        // NO OVERLAY - close sidebar when clicking outside of it
        // This is handled in the document click handler below

        // Handle window resize
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                const isNowMobile = window.innerWidth <= 1199;
                
                if (!isNowMobile) {
                    // Desktop: show sidebar and logo
                    if (sidebar) {
                        sidebar.classList.add('show');
                        sidebar.classList.add('nk-sidebar-active');
                        sidebar.style.transform = 'translateX(0)';
                    }
                    if (overlay) {
                        overlay.style.opacity = '0';
                        overlay.style.pointerEvents = 'none';
                    }
                    // Desktop: header positioned after sidebar
                    const header = document.querySelector('.nk-header, .nk-header.nk-header-fixed, .nk-header.is-light');
                    if (header) {
                        header.style.width = 'calc(100% - 230px)';
                        header.style.left = '230px';
                    }
                } else {
                    // Mobile: ensure sidebar is hidden if not explicitly opened
                    if (sidebar && !sidebar.classList.contains('show') && !sidebar.classList.contains('nk-sidebar-active')) {
                        sidebar.style.transform = 'translateX(-100%)';
                    }
                    // Mobile: header full width
                    const header = document.querySelector('.nk-header, .nk-header.nk-header-fixed, .nk-header.is-light');
                    if (header) {
                        header.style.width = '100%';
                        header.style.left = '0';
                        header.style.right = '0';
                        header.style.marginLeft = '0';
                    }
                }
            }, 250);
        });

        // Close sidebar when clicking outside (on mobile)
        document.addEventListener('click', function(e) {
            if (isMobile && sidebar && (sidebar.classList.contains('show') || sidebar.classList.contains('nk-sidebar-active'))) {
                // Check if click is outside sidebar
                // Don't close if clicking on toggle (toggle is hidden anyway when sidebar is open)
                if (!sidebar.contains(e.target)) {
                    // Click is outside sidebar - close it
                    closeSidebar();
                }
            }
        });
    }

    // Prevent multiple initializations
    let initialized = false;
    
    function safeInit() {
        if (initialized) return;
        initialized = true;
        initMobileSidebar();
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeInit);
    } else {
        safeInit();
    }

    // Re-initialize after elements are loaded (for dynamically loaded content)
    setTimeout(function() {
        if (!initialized) {
            safeInit();
        }
        // Re-run init to catch any new elements
        initMobileSidebar();
        
        // Also force header position on mobile after a delay (in case CSS hasn't loaded yet)
        const checkHeader = function() {
            const isMobile = window.innerWidth <= 1199;
            if (isMobile) {
                const header = document.querySelector('.nk-header, .nk-header.nk-header-fixed, .nk-header.is-light');
                if (header) {
                    const rect = header.getBoundingClientRect();
                    if (rect.left !== 0) {
                        header.style.width = '100%';
                        header.style.left = '0';
                        header.style.right = '0';
                        header.style.marginLeft = '0';
                    }
                }
            }
        };
        
        // Check multiple times to ensure it sticks
        checkHeader();
        setTimeout(checkHeader, 100);
        setTimeout(checkHeader, 500);
    }, 1000);
})();
