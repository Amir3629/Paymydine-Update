/**
 * SMOOTH PAGE TRANSITIONS
 * Creates SPA-like experience where only the content area changes
 * while header and sidebar remain fixed
 */

/*
 * PMD_DASHBOARD2_ZERO_BLINK_GUARD_V1
 *
 * Dashboard2 is assembled from the Reservations2 shell. A separate legacy
 * Zero Shift authority intentionally writes visibility:visible !important on
 * #pmd-reservations2 while Floor geometry settles. A stylesheet-only guard
 * therefore cannot win: inline !important beats stylesheet !important.
 *
 * This revision cooperates with that legacy authority instead of racing it:
 * while Dashboard2 is booting, every root style mutation is corrected back to
 * hidden in the same microtask turn. The page is released only after the
 * legacy Zero Shift guard is done, Analytics V1.4.1.5 reports ready, four KPI
 * cards exist, the final Floor is settled and the source Reservations/Floor UI
 * is no longer visible. No polling or network request is added.
 */
(function installDashboard2ZeroBlinkGuardV1() {
    const path = String(window.location.pathname || '').replace(/\/+$/, '');
    if (path !== '/admin/dashboard2') return;
    if (window.PMDDashboard2ZeroBlinkGuardV1) return;

    const html = document.documentElement;
    const GUARD_CLASS = 'pmd-dashboard2-zero-blink-v1';
    const READY_CLASS = 'pmd-dashboard2-zero-blink-ready-v1';
    const STYLE_ID = 'pmd-dashboard2-zero-blink-style-v1';
    const VERSION = '1.1.0-zero-shift-cooperative';

    let observer = null;
    let released = false;
    let stableFrames = 0;
    let lastGeometry = null;
    let safetyTimer = null;

    html.classList.add(GUARD_CLASS);

    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            html.${GUARD_CLASS}:not(.${READY_CLASS}) body #pmd-reservations2,
            html.${GUARD_CLASS}:not(.${READY_CLASS}) body #pmd-dashboard2-analytics-v1 {
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                transition: none !important;
                animation: none !important;
            }

            html.${GUARD_CLASS}.${READY_CLASS} body #pmd-reservations2,
            html.${GUARD_CLASS}.${READY_CLASS} body #pmd-dashboard2-analytics-v1 {
                transition: none !important;
                animation: none !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function forceRootHidden() {
        if (released) return false;
        const page = document.getElementById('pmd-reservations2');
        if (!page) return false;

        const desired = {
            visibility: 'hidden',
            opacity: '0',
            'pointer-events': 'none',
            transition: 'none',
            animation: 'none'
        };

        let changed = false;
        Object.keys(desired).forEach(function (name) {
            if (
                page.style.getPropertyValue(name) !== desired[name] ||
                page.style.getPropertyPriority(name) !== 'important'
            ) {
                page.style.setProperty(name, desired[name], 'important');
                changed = true;
            }
        });

        return changed;
    }

    function forceRootVisible() {
        const page = document.getElementById('pmd-reservations2');
        if (!page) return false;

        page.style.setProperty('visibility', 'visible', 'important');
        page.style.setProperty('opacity', '1', 'important');
        page.style.setProperty('pointer-events', 'auto', 'important');
        page.style.setProperty('transition', 'none', 'important');
        page.style.setProperty('animation', 'none', 'important');
        return true;
    }

    function visible(node) {
        if (!node) return false;
        const style = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();

        return !node.hidden &&
            style.display !== 'none' &&
            rect.width > 0 &&
            rect.height > 0;
    }

    function floorTableCount(floor) {
        if (!floor) return 0;
        return floor.querySelectorAll(
            '[data-floor-canvas] [data-table], ' +
            '[data-floor-canvas] .pmd-floor-v1__table, ' +
            '[data-floor-canvas] [data-pmd-floor-table], ' +
            '[data-floor-table]'
        ).length;
    }

    function zeroShiftState() {
        try {
            if (
                window.PMDR2ZeroShiftGuardV2 &&
                typeof window.PMDR2ZeroShiftGuardV2.audit === 'function'
            ) {
                return window.PMDR2ZeroShiftGuardV2.audit();
            }
        } catch (error) {}
        return null;
    }

    function snapshot() {
        const page = document.getElementById('pmd-reservations2');
        const analytics = document.getElementById('pmd-dashboard2-analytics-v1');
        const header = document.getElementById('pmd-r2-clean-header');
        const kpis = document.getElementById('pmd-r2-reservation-kpis-v307');
        const floor = document.getElementById('pmd-r2-shared-floor-canvas-v310');
        const loading = floor && floor.querySelector('[data-floor-loading]');
        const empty = floor && floor.querySelector('[data-floor-empty]');
        const zeroShift = zeroShiftState();

        const kpiCount = kpis
            ? kpis.querySelectorAll('[data-pmd-dashboard2-kpi]').length
            : 0;

        const tables = floorTableCount(floor);
        const floorSettled = !!floor &&
            floor.getAttribute('aria-busy') !== 'true' &&
            (!loading || loading.hidden || window.getComputedStyle(loading).display === 'none') &&
            (tables > 0 || (empty && !empty.hidden));

        const analyticsHydrated = !!analytics &&
            analytics.classList.contains('pmd-dashboard2-v1415-ready') &&
            analytics.getAttribute('aria-busy') === 'false' &&
            html.classList.contains('pmd-dashboard2-v1415-analytics-ready');

        const zeroShiftDone = !!zeroShift &&
            zeroShift.done === true &&
            html.classList.contains('pmd-r2-zero-shift-ready-v2');

        const legacyVisible = [
            document.querySelector('#pmd-reservations2 .pmd-r2__hero'),
            document.querySelector('#pmd-reservations2 .pmd-r2-waiter-boot'),
            document.getElementById('pmd-r2-waiter-cards-v1'),
            floor && floor.querySelector(':scope > .pmd-floor-v1__header'),
            floor && floor.querySelector(':scope > .pmd-floor-v1__statusbar')
        ].filter(Boolean).some(visible);

        const pageRect = page ? page.getBoundingClientRect() : null;
        const floorRect = floor ? floor.getBoundingClientRect() : null;
        const analyticsRect = analytics ? analytics.getBoundingClientRect() : null;

        return {
            page,
            analytics,
            header,
            kpis,
            floor,
            kpiCount,
            tables,
            floorSettled,
            analyticsHydrated,
            zeroShift,
            zeroShiftDone,
            legacyVisible,
            geometry: pageRect && floorRect && analyticsRect ? {
                pageHeight: Math.round(pageRect.height),
                floorHeight: Math.round(floorRect.height),
                floorTop: Math.round(floorRect.top),
                analyticsTop: Math.round(analyticsRect.top),
                analyticsHeight: Math.round(analyticsRect.height)
            } : null
        };
    }

    function structurallyReady(state) {
        return !!(
            state.page &&
            state.analytics &&
            state.analyticsHydrated &&
            state.header &&
            state.kpis &&
            state.kpiCount === 4 &&
            state.floor &&
            state.floorSettled &&
            state.zeroShiftDone &&
            !state.legacyVisible &&
            state.geometry
        );
    }

    function sameGeometry(a, b) {
        if (!a || !b) return false;
        return Math.abs(a.pageHeight - b.pageHeight) <= 1 &&
            Math.abs(a.floorHeight - b.floorHeight) <= 1 &&
            Math.abs(a.floorTop - b.floorTop) <= 1 &&
            Math.abs(a.analyticsTop - b.analyticsTop) <= 1 &&
            Math.abs(a.analyticsHeight - b.analyticsHeight) <= 1;
    }

    function release(reason, state) {
        if (released) return true;
        released = true;

        if (observer) {
            observer.disconnect();
            observer = null;
        }
        if (safetyTimer) {
            window.clearTimeout(safetyTimer);
            safetyTimer = null;
        }

        html.classList.add(READY_CLASS);
        forceRootVisible();

        console.info('[PMD Dashboard2 Zero Blink Guard V1.1] released', {
            reason,
            kpiCount: state ? state.kpiCount : null,
            tables: state ? state.tables : null,
            floorSettled: state ? state.floorSettled : null,
            analyticsHydrated: state ? state.analyticsHydrated : null,
            zeroShiftDone: state ? state.zeroShiftDone : null,
            zeroShiftReason: state && state.zeroShift ? state.zeroShift.reason : null,
            legacyVisible: state ? state.legacyVisible : null,
            stableFrames
        });

        return true;
    }

    function verifyStable() {
        if (released) return;
        forceRootHidden();
        const state = snapshot();

        if (!structurallyReady(state)) {
            stableFrames = 0;
            lastGeometry = null;
            return;
        }

        if (sameGeometry(lastGeometry, state.geometry)) {
            stableFrames += 1;
        } else {
            stableFrames = 1;
            lastGeometry = state.geometry;
        }

        if (stableFrames >= 3) {
            release('stable-after-zero-shift-and-hydration', state);
            return;
        }

        window.requestAnimationFrame(verifyStable);
    }

    function check() {
        if (released) return;

        /*
         * Critical: the legacy Zero Shift script writes inline visible styles
         * every frame. Re-applying hidden from this MutationObserver happens in
         * the same microtask checkpoint before the browser paints that frame.
         */
        forceRootHidden();

        const state = snapshot();
        if (!structurallyReady(state)) {
            stableFrames = 0;
            lastGeometry = null;
            return;
        }
        window.requestAnimationFrame(verifyStable);
    }

    observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'hidden', 'aria-busy', 'style', 'data-pmd-zero-shift-ready']
    });

    document.addEventListener('DOMContentLoaded', check, {once: true});
    window.addEventListener('load', check, {once: true});
    check();

    safetyTimer = window.setTimeout(function () {
        const state = snapshot();
        release('safety-timeout-6500', state);
    }, 6500);

    window.PMDDashboard2ZeroBlinkGuardV1 = {
        version: VERSION,
        check,
        audit() {
            const state = snapshot();
            const page = state.page;
            return {
                version: VERSION,
                released,
                guardClass: html.classList.contains(GUARD_CLASS),
                readyClass: html.classList.contains(READY_CLASS),
                header: !!state.header,
                kpiCount: state.kpiCount,
                floor: !!state.floor,
                floorSettled: state.floorSettled,
                tables: state.tables,
                analyticsHydrated: state.analyticsHydrated,
                zeroShiftDone: state.zeroShiftDone,
                zeroShiftReason: state.zeroShift ? state.zeroShift.reason : null,
                legacyVisible: state.legacyVisible,
                stableFrames,
                rootInlineVisibility: page ? page.style.getPropertyValue('visibility') : null,
                rootInlineOpacity: page ? page.style.getPropertyValue('opacity') : null,
                geometry: state.geometry,
                ok: released &&
                    html.classList.contains(READY_CLASS) &&
                    !!state.header &&
                    state.kpiCount === 4 &&
                    !!state.floor &&
                    state.floorSettled &&
                    state.analyticsHydrated &&
                    state.zeroShiftDone &&
                    !state.legacyVisible
            };
        }
    };
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
        link.href = '/app/admin/assets/css/pmd-dashboard2-detail-links-v1.css?v=20260811-dashboard-report-links-v1-7';
        (document.head || document.documentElement).appendChild(link);
    }

    if (!document.getElementById(jsId)) {
        const script = document.createElement('script');
        script.id = jsId;
        script.src = '/app/admin/assets/js/pmd-dashboard2-detail-links-v1.js?v=20260811-dashboard-report-links-v1-7';
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