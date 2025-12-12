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

// Logout icon red color fix - Only the icon, not the text
(function() {
    function makeLogoutRed() {
        // Target the exact structure from the HTML
        const logoutLinks = document.querySelectorAll('a.dropdown-item.text-danger[href*="logout"], .profile-dropdown-menu a.dropdown-item.text-danger[href*="logout"]');
        logoutLinks.forEach(function(link) {
            // Find and set icon color - specifically fa-power-off - ONLY THE ICON
            const powerOffIcon = link.querySelector('i.fa-power-off, i.fa.fa-power-off, .fa-power-off');
            if (powerOffIcon) {
                powerOffIcon.style.color = '#dc3545';
                powerOffIcon.style.setProperty('color', '#dc3545', 'important');
            }
            
            // Also set all icons inside - ONLY ICONS
            const allIcons = link.querySelectorAll('i');
            allIcons.forEach(function(icon) {
                icon.style.color = '#dc3545';
                icon.style.setProperty('color', '#dc3545', 'important');
            });
        });
    }
    
    // Run immediately
    makeLogoutRed();
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', makeLogoutRed);
    } else {
        makeLogoutRed();
    }
    
    // Run multiple times to catch dynamically loaded content
    setTimeout(makeLogoutRed, 100);
    setTimeout(makeLogoutRed, 500);
    setTimeout(makeLogoutRed, 1000);
    setTimeout(makeLogoutRed, 2000);
    
    // Watch for dropdown opens
    document.addEventListener('click', function(e) {
        const target = e.target;
        if (target.closest('.dropdown-toggle') || target.closest('[data-bs-toggle="dropdown"]') || target.closest('.profile-dropdown-menu')) {
            setTimeout(makeLogoutRed, 50);
            setTimeout(makeLogoutRed, 200);
            setTimeout(makeLogoutRed, 500);
        }
    });
    
    // Use MutationObserver to watch for DOM changes
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(function(mutations) {
            makeLogoutRed();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }
})();

// Profile dropdown scroll fix - Force max-height and overflow
(function() {
    function fixProfileDropdownScroll() {
        const profileDropdowns = document.querySelectorAll('.profile-dropdown-menu, .dropdown-menu.profile-dropdown-menu');
        profileDropdowns.forEach(function(dropdown) {
            dropdown.style.setProperty('max-height', '500px', 'important');
            dropdown.style.setProperty('overflow-y', 'auto', 'important');
            dropdown.style.setProperty('overflow-x', 'hidden', 'important');
        });
    }
    
    // Flag to prevent infinite loops
    let isFixingLocationItems = false;
    
    function fixLocationItemsAlignment() {
        // Prevent infinite loops
        if (isFixingLocationItems) {
            console.log('🔒 fixLocationItemsAlignment: Already running, skipping...');
            return;
        }
        
        console.log('🔧 fixLocationItemsAlignment: Starting...');
        
        // Try to find dropdown - check both visible and hidden
        let dropdown = document.querySelector('.profile-dropdown-menu.show, .dropdown-menu.profile-dropdown-menu.show');
        if (!dropdown) {
            dropdown = document.querySelector('.profile-dropdown-menu, .dropdown-menu.profile-dropdown-menu');
        }
        
        if (!dropdown) {
            console.log('❌ fixLocationItemsAlignment: Dropdown not found!');
            return;
        }
        console.log('✓ Dropdown found, visible:', dropdown.classList.contains('show'));
        
        // FIX: Remove parent padding that's blocking movement
        const parentPadding = window.getComputedStyle(dropdown).paddingLeft;
        console.log('Parent padding:', parentPadding);
        if (parentPadding && parseFloat(parentPadding) > 0) {
            dropdown.style.setProperty('padding-left', '0', 'important');
            dropdown.style.setProperty('padding-right', '0', 'important');
            console.log('✓ Removed parent padding');
        }
        
        // Find the "Locations" link (now it's a dropdown-item, not dropdown-header)
        const locationsHeader = Array.from(dropdown.querySelectorAll('.dropdown-item')).find(function(item) {
            const icon = item.querySelector('i.fa-location-dot');
            const span = item.querySelector('span');
            return icon && span && (span.textContent.includes('Location') || item.href && item.href.includes('locations/settings'));
        });
        
        if (!locationsHeader) {
            console.log('❌ fixLocationItemsAlignment: Locations header/link not found!');
            return;
        }
        console.log('✓ Locations header/link found');
        
        // Set flag to prevent re-entry
        isFixingLocationItems = true;
        
        // Get regular items to check their padding (items before the Locations link)
        const allItems = Array.from(dropdown.querySelectorAll('.dropdown-item'));
        const regularItems = allItems.filter(function(item) {
            return !(locationsHeader.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING);
        });
        
        // Get padding from first regular item to match it
        let regularPaddingLeft = '16px';
        if (regularItems.length > 0) {
            const firstRegular = regularItems[0];
            const computedStyle = window.getComputedStyle(firstRegular);
            regularPaddingLeft = computedStyle.paddingLeft || '16px';
        }
        
        // Move location items A LOT MORE to the left (reduce padding significantly)
        const locationPaddingLeft = '0px'; // Moved from 8px to 0px to move items much more left
        console.log('📍 Location padding left set to:', locationPaddingLeft);
        
        // Locations header is now a dropdown-item, so it uses same padding as regular items
        // No special header styling needed
        
        // Find locations header position
        const headerParent = locationsHeader.parentElement;
        const headerIndex = Array.from(headerParent.children).indexOf(locationsHeader);
        
        // Get location items (items after the Locations link)
        const locationItems = Array.from(allItems).filter(function(item) {
            return locationsHeader.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING;
        });
        
        console.log('📍 Found', locationItems.length, 'location items');
        
        // Fix all location items that come after the header
        locationItems.forEach(function(item, index) {
            console.log(`  Processing location ${index + 1}...`);
            // AGGRESSIVE APPROACH: Use position relative + left to force movement
            item.style.setProperty('position', 'relative', 'important');
            item.style.setProperty('left', '-8px', 'important'); // Force move 8px left
            item.style.setProperty('margin-left', '-8px', 'important');
            item.style.setProperty('transform', 'translateX(-8px)', 'important');
            item.style.setProperty('padding-left', '16px', 'important');
            item.style.setProperty('padding-right', '16px', 'important');
            item.style.setProperty('padding-top', '10px', 'important');
            item.style.setProperty('padding-bottom', '10px', 'important');
            
            // Direct style manipulation as final backup
            item.style.position = 'relative';
            item.style.left = '-8px';
            
            console.log(`    Applied position:relative + left:-8px to force movement`);
            
            // Get the location name text (remove any existing number)
            let locationName = '';
            const existingTextSpan = item.querySelector('span');
            if (existingTextSpan) {
                locationName = existingTextSpan.textContent.trim().replace(/^\d+\.\s*/, '');
            } else {
                locationName = item.textContent.trim().replace(/^\d+\.\s*/, '');
            }
            
            // MATCH EXACT STRUCTURE OF REGULAR ITEMS: <i></i><span></span>
            // Regular items have: <i class="icon"></i><span>Text</span>
            // Location items will have: <i class="location-number">1.</i><span>Location Name</span>
            item.innerHTML = '';
            
            // Add number as <i> element (same position as icon in regular items)
            const numberIcon = document.createElement('i');
            numberIcon.className = 'location-number';
            numberIcon.textContent = (index + 1) + '.';
            // NO extra styles - let it match regular icon styling exactly
            item.appendChild(numberIcon);
            
            // Add text span (EXACT same as regular items)
            const textSpan = document.createElement('span');
            textSpan.textContent = locationName;
            // NO extra styles - let it match regular span styling exactly
            item.appendChild(textSpan);
            
            // REMOVE ALL CUSTOM STYLES - use default dropdown-item styles only (matches regular items)
            item.removeAttribute('style');
            
            console.log(`    ✓ Location ${index + 1} processed - structure matches regular items`);
        });
        
        console.log('✅ fixLocationItemsAlignment: Completed processing', locationItems.length, 'items');
        
        // No need to fix items in DOM order - they're already processed above
        
        // OPTIMIZED: Reset flag after longer delay to prevent rapid re-execution
        setTimeout(function() {
            isFixingLocationItems = false;
            console.log('🔓 fixLocationItemsAlignment: Flag reset, ready for next run');
        }, 1000); // Increased from 100ms to 1000ms to prevent rapid successive calls
    }
    
    // Make function available globally for manual testing
    window.fixLocationItemsAlignment = fixLocationItemsAlignment;
    console.log('🌐 fixLocationItemsAlignment is now available globally. Call it manually with: fixLocationItemsAlignment()');
    
    // OPTIMIZED: Only run on initial load, not repeatedly
    fixProfileDropdownScroll();
    fixLocationItemsAlignment();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            fixProfileDropdownScroll();
            fixLocationItemsAlignment();
        });
    }
    
    // OPTIMIZED: Only run once after short delay, removed redundant calls
    setTimeout(function() {
        fixProfileDropdownScroll();
        fixLocationItemsAlignment();
    }, 500);
    
    // Watch for dropdown opens - OPTIMIZED: Only when dropdown actually shows
    document.addEventListener('click', function(e) {
        if (e.target.closest('.dropdown-toggle') || e.target.closest('[data-bs-toggle="dropdown"]')) {
            // OPTIMIZED: Only call when dropdown is actually shown
            setTimeout(function() {
                const dropdown = document.querySelector('.profile-dropdown-menu.show');
                if (dropdown) {
                    fixProfileDropdownScroll();
                    fixLocationItemsAlignment();
                }
            }, 150); // Wait for dropdown to show
        }
    });
    
    // Also watch for Bootstrap dropdown show event - OPTIMIZED: Only for profile dropdown
    if (typeof bootstrap !== 'undefined' && bootstrap.Dropdown) {
        document.addEventListener('shown.bs.dropdown', function(e) {
            // OPTIMIZED: Only run if it's actually the profile dropdown
            const dropdown = e.target.closest('.dropdown');
            if (dropdown && dropdown.querySelector('.profile-dropdown-menu')) {
                setTimeout(function() {
                    fixLocationItemsAlignment();
                }, 100);
            }
        });
    }
    
    // Use MutationObserver with debouncing to prevent infinite loops - OPTIMIZED: Only watch dropdown element directly
    if (typeof MutationObserver !== 'undefined') {
        let mutationTimeout;
        let lastDropdownState = false;
        let observer = null;
        
        // OPTIMIZED: Find dropdown and observe only that element
        function setupDropdownObserver() {
            const dropdown = document.querySelector('.profile-dropdown-menu, .dropdown-menu.profile-dropdown-menu');
            if (!dropdown) {
                // Try again after a delay if dropdown not found yet
                setTimeout(setupDropdownObserver, 1000);
                return;
            }
            
            // Disconnect previous observer if exists
            if (observer) {
                observer.disconnect();
            }
            
            observer = new MutationObserver(function(mutations) {
                // Debounce: only process if not already processing
                if (isFixingLocationItems) return;
                
                // OPTIMIZED: Only run if dropdown just became visible
                const isCurrentlyShown = dropdown.classList.contains('show');
                
                if (isCurrentlyShown && !lastDropdownState) {
                    lastDropdownState = true;
                    clearTimeout(mutationTimeout);
                    mutationTimeout = setTimeout(function() {
                        if (!isFixingLocationItems && dropdown.classList.contains('show')) {
                            fixProfileDropdownScroll();
                            fixLocationItemsAlignment();
                        }
                    }, 200);
                } else if (!isCurrentlyShown) {
                    lastDropdownState = false;
                }
            });
            
            // OPTIMIZED: Only observe the dropdown element itself, not entire container
            observer.observe(dropdown, {
                attributes: true,
                attributeFilter: ['class'] // Only watch class changes (show/hide)
            });
        }
        
        // Setup observer when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupDropdownObserver);
        } else {
            setupDropdownObserver();
        }
    }
})();
