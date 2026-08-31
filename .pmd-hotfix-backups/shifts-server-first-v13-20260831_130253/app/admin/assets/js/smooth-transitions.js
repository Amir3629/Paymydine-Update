/**
 * SMOOTH PAGE TRANSITIONS
 * Creates SPA-like experience where only the content area changes
 * while header and sidebar remain fixed
 */

/*
 * PMD_DASHBOARD2_ZERO_BLINK_GUARD_RETIRED_V1
 *
 * The extra root-level Dashboard2 guard has been retired.
 *
 * Root visibility now has exactly ONE owner:
 *   PMDDashboard2FirstPaintLockV1413
 *
 * PMDR2ZeroShiftGuardV2 owns only Floor/table geometry on Dashboard2.
 * This avoids two independent !important visibility authorities racing
 * each other during the first paint.
 */
(function installDashboard2ZeroBlinkCompatibilityAudit() {
    const path = String(
        window.location.pathname || ''
    ).replace(/\/+$/, '');

    if (path !== '/admin/dashboard2') return;

    window.PMDDashboard2ZeroBlinkGuardV1 = {
        version: '1.2.0-retired-single-root-owner',
        retired: true,

        audit() {
            const html = document.documentElement;
            const page = document.getElementById(
                'pmd-reservations2'
            );

            const style = page
                ? window.getComputedStyle(page)
                : null;

            const hero = document.querySelector(
                '#pmd-reservations2 .pmd-r2__hero'
            );

            const waiterRoot =
                document.getElementById(
                    'pmd-r2-waiter-cards-v1'
                ) ||
                document.querySelector(
                    '#pmd-reservations2 .pmd-r2-waiter-boot'
                );

            const isVisible = function (node) {
                if (!node) return false;

                const s = window.getComputedStyle(node);
                const r = node.getBoundingClientRect();

                return (
                    !node.hidden &&
                    s.display !== 'none' &&
                    s.visibility !== 'hidden' &&
                    Number(s.opacity || 1) > 0 &&
                    r.width > 0 &&
                    r.height > 0
                );
            };

            let zeroShift = null;

            try {
                if (
                    window.PMDR2ZeroShiftGuardV2 &&
                    typeof window.PMDR2ZeroShiftGuardV2.audit ===
                        'function'
                ) {
                    zeroShift =
                        window.PMDR2ZeroShiftGuardV2.audit();
                }
            } catch (error) {}

            const firstPaintReady =
                html.classList.contains(
                    'pmd-dashboard2-v1413-ready'
                );

            return {
                version:
                    '1.2.0-retired-single-root-owner',

                retired: true,

                rootVisibilityOwner:
                    'PMDDashboard2FirstPaintLockV1413',

                zeroShiftGeometryOwner:
                    'PMDR2ZeroShiftGuardV2',

                firstPaintReady,

                pageFound: Boolean(page),

                pageOpacity:
                    style ? style.opacity : null,

                pageVisibility:
                    style ? style.visibility : null,

                legacyHeroVisible:
                    isVisible(hero),

                legacyWaiterVisible:
                    isVisible(waiterRoot),

                zeroShiftVersion:
                    zeroShift
                        ? zeroShift.version
                        : null,

                zeroShiftDone:
                    zeroShift
                        ? zeroShift.done
                        : null,

                ok:
                    Boolean(page) &&
                    firstPaintReady &&
                    Number(style?.opacity || 0) === 1 &&
                    !isVisible(hero) &&
                    !isVisible(waiterRoot)
            };
        }
    };

    console.info(
        '[PMD Dashboard2 Zero Blink Guard] retired; V1413 is sole root visibility owner'
    );
})();

class SmoothPageTransitions {
    constructor() {
        this.isTransitioning = false;
        this.contentArea = document.querySelector('.page-content');
        this.pageTitle = document.querySelector('.page-title'); // Direct child of navbar
        this.sidebarLinks = document.querySelectorAll('#navSidebar a:not([target="_blank"])'); // Fixed: navSidebar, not side-nav
        this.currentUrl = window.location.href;
        
        this.init();
    }
    
    init() {
        if (!this.contentArea) return;
        
        // Add transition styles to content area
        this.contentArea.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        // Add smooth transition styles to page title
        if (this.pageTitle) {
            // Very fast fade (0.15s)
            this.pageTitle.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
        }
        
        // Intercept all sidebar link clicks
        this.sidebarLinks.forEach(link => {
            // Don't intercept collapse toggles (parent menu items with children)
            if (link.hasAttribute('data-toggle') && link.getAttribute('data-toggle') === 'collapse') {
                return; // Skip these, let them toggle the submenu
            }
            link.addEventListener('click', this.handleLinkClick.bind(this));
        });
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', this.handlePopState.bind(this));
        
        console.log('✅ Smooth page transitions initialized');
    }
    
    handleLinkClick(e) {
        // Don't intercept if modifier keys are pressed (new tab, etc)
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        
        const link = e.currentTarget;
        const targetUrl = link.href;
        
        // Don't intercept external links or same-page links
        if (!targetUrl || targetUrl === this.currentUrl || targetUrl.indexOf(window.location.origin) !== 0) {
            return;
        }
        
        // SPECIAL: Don't intercept certain pages that need full reload
        const noAjaxPages = [
            '/admin/dashboard',
            '/admin',
            'dashboard',
            '/orders',
            '/menus',
            '/categories',
            '/reservations',
            '/customers',
            '/statuses',
            '/payments',
            '/locations',
            '/tables'
        ];
        
        if (noAjaxPages.some(page => targetUrl.includes(page))) {
            return; // Let these pages load normally without AJAX for proper functionality
        }
        
        // Prevent default navigation
        e.preventDefault();
        
        // Navigate with transition
        this.navigateTo(targetUrl);
    }
    
    handlePopState(e) {
        // Handle browser back/forward buttons
        this.navigateTo(window.location.href, false);
    }
    
    async navigateTo(url, pushState = true) {
        // Prevent multiple transitions at once
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        try {
            // Fade out current content AND page title (VERY FAST)
            this.contentArea.style.opacity = '0';
            this.contentArea.style.transform = 'translateY(10px)';
            
            if (this.pageTitle) {
                this.pageTitle.style.opacity = '0';
                this.pageTitle.style.transform = 'translateY(-3px)'; // Minimal movement
            }
            
            // Wait for fade out animation (0.15 seconds)
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Fetch new page content
            const response = await fetch(url);
            const html = await response.text();
            
            // Parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract just the content area
            const newContent = doc.querySelector('.page-content');
            
            if (newContent) {
                // Update browser title
                document.title = doc.title;
                
                // Update page title in header with new title
                if (this.pageTitle) {
                    const newPageTitle = doc.querySelector('.page-title'); // Direct element, not nested
                    if (newPageTitle) {
                        this.pageTitle.innerHTML = newPageTitle.innerHTML; // Use innerHTML to preserve formatting
                    }
                }
                
                // Replace content
                this.contentArea.innerHTML = newContent.innerHTML;
                
                // Update URL if needed
                if (pushState) {
                    window.history.pushState({}, doc.title, url);
                }
                
                // Update current URL
                this.currentUrl = url;
                
                // Highlight active sidebar item
                this.updateActiveSidebarItem(url);
                
                // Execute any scripts in the new content
                this.executeScripts(newContent);
            }
            
            // Fade in new content AND page title
            setTimeout(() => {
                this.contentArea.style.opacity = '1';
                this.contentArea.style.transform = 'translateY(0)';
                
                if (this.pageTitle) {
                    this.pageTitle.style.opacity = '1';
                    this.pageTitle.style.transform = 'translateY(0)';
                }
                
                // IMPORTANT: Reinitialize scripts after page load
                this.reinitializeScripts();
                
                this.isTransitioning = false;
            }, 50);
            
        } catch (error) {
            console.error('Error during page transition:', error);
            // Fallback to normal navigation on error
            window.location.href = url;
        }
    }
    
    updateActiveSidebarItem(url) {
        // Remove active class from all links
        this.sidebarLinks.forEach(link => {
            const menuItem = link.closest('li');
            if (menuItem) {
                menuItem.classList.remove('active');
            }
        });
        
        // Find and highlight the active link
        this.sidebarLinks.forEach(link => {
            if (url === link.href || url.startsWith(link.href + '?') || url.startsWith(link.href + '#')) {
                const menuItem = link.closest('li');
                if (menuItem) {
                    menuItem.classList.add('active');
                    
                    // If in a submenu, expand parent
                    const parentMenu = menuItem.closest('ul.submenu');
                    if (parentMenu) {
                        const parentItem = parentMenu.closest('li');
                        if (parentItem) {
                            parentItem.classList.add('active');
                        }
                    }
                }
            }
        });
    }
    
    executeScripts(content) {
        // Find and execute any scripts in the new content
        const scripts = content.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            
            // Copy all attributes
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            
            // Copy inline script content
            newScript.textContent = oldScript.textContent;
            
            // Replace old script with new one to execute it
            if (oldScript.parentNode) {
                oldScript.parentNode.replaceChild(newScript, oldScript);
            } else {
                (document.body||document.documentElement).appendChild(newScript);
            }
        });
    }
    
    reinitializeScripts() {
        // Trigger a custom event that other scripts can listen to
        const event = new CustomEvent('pageContentLoaded', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(event);
        
        // FORCE: Also trigger jQuery events that TastyIgniter uses
        if (window.$ && $.request) {
            $(document).trigger('ajaxUpdate');
            $(document).trigger('render');
        }
        
        // FORCE: Reinitialize checkbox handlers
        setTimeout(() => {
            const checkboxes = document.querySelectorAll('.list-container input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                // Clone and replace to remove old event listeners
                const newCheckbox = checkbox.cloneNode(true);
                checkbox.parentNode.replaceChild(newCheckbox, checkbox);
            });
        }, 100);
        
        console.log('🔄 Page content loaded - scripts should reinitialize');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.smoothTransitions = new SmoothPageTransitions();
});

/*
 * PMD_DASHBOARD2_REPORT_LINK_BOOTSTRAP_V1
 *
 * Dashboard2 does not render the Settings notification_bell partial, so the
 * report-link asset cannot rely on that partial for loading. This global file
 * is already present on Dashboard2. Load the tiny Dashboard2-only CSS/JS here;
 * the report-link JS contains its own strict /admin/dashboard2 route guard.
 */
(function bootstrapDashboard2ReportLinks() {
    const path = String(window.location.pathname || '').replace(/\/+$/, '');
    if (path !== '/admin/dashboard2') return;

    const cssId = 'pmd-dashboard2-report-links-css-v1';
    const jsId = 'pmd-dashboard2-report-links-js-v1';

    if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = '/app/admin/assets/css/pmd-dashboard2-detail-links-v1.css?v=20260811-dashboard-report-links-v1-6';
        (document.head || document.documentElement).appendChild(link);
    }

    if (!document.getElementById(jsId)) {
        const script = document.createElement('script');
        script.id = jsId;
        script.src = '/app/admin/assets/js/pmd-dashboard2-detail-links-v1.js?v=20260811-dashboard-report-links-v1-6';
        script.defer = true;
        script.onload = function () {
            console.info('[PMD Dashboard2 Report Link Bootstrap V1] loaded');
        };
        script.onerror = function () {
            console.error('[PMD Dashboard2 Report Link Bootstrap V1] failed to load report-link asset');
        };
        (document.head || document.documentElement).appendChild(script);
    }
})();
