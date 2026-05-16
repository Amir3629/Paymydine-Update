/**
 * SMOOTH PAGE TRANSITIONS
 * Creates SPA-like experience where only the content area changes
 * while header and sidebar remain fixed
 */

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
                document.body.appendChild(newScript);
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
