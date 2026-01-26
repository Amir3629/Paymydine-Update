/**
 * PayMyDine Admin Panel Enhanced Guided Tour System
 * Provides comprehensive onboarding tour through all admin features
 * with smooth animations, beautiful styling, and complete feature coverage
 */

(function($) {
    'use strict';

    const EnhancedAdminTour = {
        init: function() {
            // Don't show welcome screen on login page
            const path = window.location.pathname;
            const isLoginPage = path.includes('/login') || path.includes('/auth/login') || document.body.classList.contains('page-login');
            
            if (isLoginPage) {
                return; // Don't initialize tour on login page
            }

            // Check if welcome screen has been shown
            if (!this.hasSeenWelcomeScreen()) {
                // Show welcome screen first, then start tour if user clicks "Start Tour"
                setTimeout(() => {
                    this.showWelcomeScreen();
                }, 1000);
            } else if (!this.hasSkippedTour()) {
                // Auto-start tour on page load only if user hasn't skipped
                setTimeout(() => {
                    this.startTour();
                }, 2000);
            }
        },

        hasSeenWelcomeScreen: function() {
            return localStorage.getItem('pymd_welcome_seen') === 'true';
        },

        markWelcomeScreenSeen: function() {
            localStorage.setItem('pymd_welcome_seen', 'true');
        },

        hasSkippedTour: function() {
            return localStorage.getItem('pymd_tour_skipped') === 'true';
        },

        markTourSkipped: function() {
            localStorage.setItem('pymd_tour_skipped', 'true');
        },

        clearTourSkipped: function() {
            localStorage.removeItem('pymd_tour_skipped');
        },

        hasCompletedTour: function() {
            return localStorage.getItem('pymd_tour_completed') === 'true';
        },

        hasSeenTour: function() {
            return localStorage.getItem('pymd_tour_seen') === 'true';
        },

        markTourSeen: function() {
            localStorage.setItem('pymd_tour_seen', 'true');
        },

        markTourCompleted: function() {
            localStorage.setItem('pymd_tour_completed', 'true');
        },

        resetTour: function() {
            localStorage.removeItem('pymd_tour_completed');
            localStorage.removeItem('pymd_tour_seen');
            localStorage.removeItem('pymd_welcome_seen');
            localStorage.removeItem('pymd_tour_skipped');
        },

        showWelcomeScreen: function() {
            // Prevent showing welcome screen if it's already shown
            if (document.getElementById('pymd-welcome-screen')) {
                return;
            }

            // Create welcome screen HTML
            const welcomeHTML = `
                <div id="pymd-welcome-screen" class="pymd-welcome-overlay">
                    <div class="pymd-welcome-card">
                        <div class="pymd-welcome-header">
                            <div class="pymd-welcome-logo">
                                <img src="/images/logo.png" alt="PayMyDine Logo" />
                            </div>
                            <h2>Welcome to PayMyDine!</h2>
                            <p class="pymd-welcome-subtitle">Your Restaurant Management Platform</p>
                        </div>
                        <div class="pymd-welcome-content">
                            <p>We're excited to have you here! To help you get started, we've created an interactive guide that will walk you through the panel and show you all the amazing features available.</p>
                            <div class="pymd-welcome-features">
                                <div class="pymd-feature-item">
                                    <i class="fa fa-check-circle"></i>
                                    <span>Discover key features quickly</span>
                                </div>
                                <div class="pymd-feature-item">
                                    <i class="fa fa-check-circle"></i>
                                    <span>Learn how to navigate efficiently</span>
                                </div>
                                <div class="pymd-feature-item">
                                    <i class="fa fa-check-circle"></i>
                                    <span>Master your dashboard</span>
                                </div>
                            </div>
                            <div class="pymd-welcome-note">
                                <i class="fa fa-info-circle"></i>
                                <p><strong>Remember:</strong> You can click the <i class="fa fa-info-circle"></i> icon in the header anytime to view the guide for any page you're on.</p>
                            </div>
                        </div>
                        <div class="pymd-welcome-buttons">
                            <button class="pymd-welcome-btn pymd-welcome-skip" id="pymd-welcome-skip">
                                <span>Skip for Now</span>
                            </button>
                            <button class="pymd-welcome-btn pymd-welcome-start" id="pymd-welcome-start">
                                <span>Start Guided Tour</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Add to body
            document.body.insertAdjacentHTML('beforeend', welcomeHTML);

            // Add event listeners
            const welcomeScreen = document.getElementById('pymd-welcome-screen');
            const skipBtn = document.getElementById('pymd-welcome-skip');
            const startBtn = document.getElementById('pymd-welcome-start');

            // Skip button - close welcome and mark as skipped
            skipBtn.addEventListener('click', () => {
                this.markWelcomeScreenSeen();
                this.markTourSkipped();
                this.hideWelcomeScreen();
            });

            // Start button - close welcome and start tour
            startBtn.addEventListener('click', () => {
                this.markWelcomeScreenSeen();
                this.clearTourSkipped(); // Clear skip flag so tour can run
                this.hideWelcomeScreen();
                setTimeout(() => {
                    this.startTour();
                }, 300);
            });

            // Close on overlay click
            welcomeScreen.addEventListener('click', (e) => {
                if (e.target === welcomeScreen) {
                    this.markWelcomeScreenSeen();
                    this.markTourSkipped();
                    this.hideWelcomeScreen();
                }
            });
        },

        hideWelcomeScreen: function() {
            const welcomeScreen = document.getElementById('pymd-welcome-screen');
            if (welcomeScreen) {
                welcomeScreen.style.opacity = '0';
                welcomeScreen.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    welcomeScreen.remove();
                }, 300);
            }
        },

        getTourSteps: function() {
            // Get current page context
            const path = window.location.pathname;
            
            // Dashboard tour
            if (path.includes('/admin/dashboard') || path === '/admin') {
                return this.getDashboardTour();
            }
            // Locations tour
            else if (path.includes('/admin/locations')) {
                return this.getLocationsTour();
            }
            // Menus tour
            else if (path.includes('/admin/menus')) {
                return this.getMenusTour();
            }
            // Categories tour
            else if (path.includes('/admin/categories')) {
                return this.getCategoriesTour();
            }
            // Orders tour
            else if (path.includes('/admin/orders')) {
                return this.getOrdersTour();
            }
            // Reservations tour
            else if (path.includes('/admin/reservations')) {
                return this.getReservationsTour();
            }
            // Settings tour - check for specific sub-pages first
            else if (path.includes('/admin/settings/edit/general')) {
                return this.getSettingsGeneralTour();
            }
            else if (path.includes('/admin/settings/edit/site')) {
                return this.getSettingsSiteTour();
            }
            else if (path.includes('/admin/settings/edit/restaurant')) {
                return this.getSettingsRestaurantTour();
            }
            else if (path.includes('/admin/settings/edit/mail')) {
                return this.getSettingsMailTour();
            }
            else if (path.includes('/admin/settings/edit/media')) {
                return this.getSettingsMediaTour();
            }
            else if (path.includes('/admin/settings/edit/tax')) {
                return this.getSettingsTaxTour();
            }
            else if (path.includes('/admin/settings/edit/advanced') || path.includes('/admin/settings/edit/server')) {
                return this.getSettingsAdvancedTour();
            }
            else if (path.includes('/admin/settings/edit/setup')) {
                return this.getSettingsSetupTour();
            }
            else if (path.includes('/admin/settings/edit/user')) {
                return this.getSettingsUserTour();
            }
            else if (path.includes('/admin/settings/edit/sales')) {
                return this.getSettingsSalesTour();
            }
            else if (path.includes('/admin/settings/edit/')) {
                // Generic settings edit page
                return this.getSettingsTour();
            }
            else if (path.includes('/admin/settings')) {
                // Main settings index page
                return this.getSettingsIndexTour();
            }
            // Staff tour
            else if (path.includes('/admin/staffs')) {
                return this.getStaffTour();
            }
            // Customers tour
            else if (path.includes('/admin/customers')) {
                return this.getCustomersTour();
            }
            // Payments tour
            else if (path.includes('/admin/payments')) {
                return this.getPaymentsTour();
            }
            // Themes tour
            else if (path.includes('/admin/themes')) {
                return this.getThemesTour();
            }
            // POS tour
            else if (path.includes('/admin/pos')) {
                return this.getPOSTour();
            }
            // Tables tour
            else if (path.includes('/admin/tables')) {
                return this.getTablesTour();
            }
            // Mealtimes tour
            else if (path.includes('/admin/mealtimes')) {
                return this.getMealtimesTour();
            }
            // Statuses tour
            else if (path.includes('/admin/statuses')) {
                return this.getStatusesTour();
            }
            // Media Manager tour
            else if (path.includes('/admin/media_manager')) {
                return this.getMediaManagerTour();
            }
            // Languages tour
            else if (path.includes('/admin/languages')) {
                return this.getLanguagesTour();
            }
            // Currencies tour
            else if (path.includes('/admin/currencies')) {
                return this.getCurrenciesTour();
            }
            // Countries tour
            else if (path.includes('/admin/countries')) {
                return this.getCountriesTour();
            }
            // Mail Templates tour
            else if (path.includes('/admin/mail_templates')) {
                return this.getMailTemplatesTour();
            }
            // System Logs tour
            else if (path.includes('/admin/system_logs')) {
                return this.getSystemLogsTour();
            }
            
            // Default intro tour for unknown pages
            return this.getGeneralIntroTour();
        },

        getGeneralIntroTour: function() {
            return [
                {
                    element: '.page-wrapper',
                    intro: '<h3>Welcome to PayMyDine Admin Panel</h3><p>This is your restaurant management system. Use the sidebar menu on the left to navigate between different sections.</p><p style="margin-top: 8px; color: #333333;">Click on any menu item to access its features. Each section helps you manage a different aspect of your restaurant business.</p>',
                    position: 'bottom'
                },
                {
                    element: '.navbar-top',
                    intro: '<h3>Top Navigation Bar</h3><p>Click these buttons in the header:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Logo</strong> - Click to return to dashboard</li><li><strong>Storefront icon</strong> - Click to open your customer website in a new tab</li><li><strong>Settings gear</strong> - Click to open system settings page</li><li><strong>Bell icon</strong> - Click to view notifications dropdown</li><li><strong>Your profile picture</strong> - Click to see account menu with logout option</li></ul>',
                    position: 'bottom'
                },
                {
                    element: '.nav-side, .sidebar',
                    intro: '<h3>Sidebar Menu</h3><p>Click these menu items to navigate:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Dashboard</strong> - Click to view overview and statistics</li><li><strong>Restaurant</strong> - Click to expand and access locations, menus, categories, tables</li><li><strong>Sales</strong> - Click to expand and access orders, reservations, payments, statuses</li><li><strong>Design</strong> - Click to customize themes and templates</li><li><strong>Tools</strong> - Click to expand and access media, languages, currencies</li><li><strong>System</strong> - Click to expand and access settings, staff, logs</li></ul>',
                    position: 'right'
                },
                {
                    element: '.page-content',
                    intro: '<h3>Page Content Area</h3><p>This is the main working area. The content changes based on which menu item you clicked. Each page has its own features and buttons.</p><p style="margin-top: 8px; color: #333333;">Look for action buttons like "Add", "Edit", "Delete", "Save", and "Filter" to perform tasks on each page.</p>',
                    position: 'top'
                }
            ];
        },

        getDashboardTour: function() {
            return [
                {
                    element: '.page-content, .page-wrapper',
                    intro: '<h3>Dashboard Overview</h3><p>This is your main dashboard where you can see an overview of your restaurant business at a glance.</p><p style="margin-top: 8px; color: #333333;">The dashboard shows statistics, charts, recent activities, and quick access to important features. You can customize which widgets appear here.</p>',
                    position: 'bottom'
                },
                {
                    element: '.navbar-top',
                    intro: '<h3>Top Navigation Bar</h3><p>The header contains important buttons you can click:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Logo</strong> - Click to return to this dashboard</li><li><strong>Storefront icon</strong> - Click to preview your customer-facing website</li><li><strong>Settings gear</strong> - Click to access system settings</li><li><strong>Bell icon</strong> - Click to view notifications and alerts</li><li><strong>Your profile picture</strong> - Click to access your account menu, where you can logout or change settings</li></ul>',
                    position: 'bottom'
                },
                {
                    element: '.sidebar, .nav-side, .nav-sidebar',
                    intro: '<h3>Sidebar Menu</h3><p>Click these menu items to navigate to different sections:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Dashboard</strong> - You are here. Click to return anytime.</li><li><strong>Restaurant</strong> - Click to manage locations, menus, categories, tables, and mealtimes</li><li><strong>Sales</strong> - Click to view orders, reservations, payments, and statuses</li><li><strong>Design</strong> - Click to customize themes and email templates</li><li><strong>Tools</strong> - Click to access media manager, languages, and currencies</li><li><strong>System</strong> - Click to manage settings, staff, and system logs</li></ul><p style="margin-top: 8px; color: #333333;">Some menu items have sub-items. Click the main item to expand and see sub-options.</p>',
                    position: 'right'
                },
                {
                    element: '.dashboard-widgets, .widget-container, [class*="widget"]',
                    intro: '<h3>Dashboard Widgets</h3><p>These boxes show important statistics about your business:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Statistics circles</strong> - Click to see detailed reports. Shows sales, orders, customers, reservations</li><li><strong>Charts</strong> - Hover over charts to see detailed numbers. Shows revenue trends and order volume</li><li><strong>Recent activities</strong> - Shows latest system events and actions</li><li><strong>Onboarding checklist</strong> - Click to complete setup steps</li></ul><p style="margin-top: 8px; color: #333333;">You can rearrange widgets by dragging them, or hide widgets you don\'t need.</p>',
                    position: 'bottom'
                }
            ];
        },

        getLocationsTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Manage Locations</h3><p>This page lets you set up and manage multiple restaurant locations. Each location can have its own address, phone number, email, menu items, operating hours, delivery zones, and settings.</p><p style="margin-top: 8px; color: #333333;">This is useful if you have multiple branches or want to manage delivery zones for different areas.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"], button:contains("Add"), a:contains("Add")',
                    intro: '<h3>Add New Location Button</h3><p>Click this button to create a new location. You will open a form where you can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Enter location name and address</li><li>Set contact information (phone, email)</li><li>Configure operating hours</li><li>Set up delivery zones and delivery fees</li><li>Upload location images</li><li>Enable or disable the location</li></ul>',
                    position: 'left'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Locations List</h3><p>This table shows all your restaurant locations. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any location row to edit its details</li><li>Click the edit icon/button to modify settings</li><li>Click delete to remove a location (be careful!)</li><li>See location status (active/inactive) at a glance</li><li>View basic info like address and phone number</li></ul>',
                    position: 'top'
                },
                {
                    element: '.filter-bar, .control-filter, input[type="search"], input[placeholder*="Search"]',
                    intro: '<h3>Search and Filter</h3><p>Use the search box to quickly find locations by name, address, or other criteria. Type in the search field and press Enter or click the search button.</p><p style="margin-top: 8px; color: #333333;">You can also use filters to show only active locations, inactive locations, or filter by other criteria if available.</p>',
                    position: 'bottom'
                }
            ];
        },

        getMenusTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Menu Management</h3><p>This page is where you create and manage all your menu items. You can add food descriptions, prices, images, dietary information (allergens, vegan options), and set when items are available.</p><p style="margin-top: 8px; color: #333333;">Your menu items will appear on your customer-facing website, so make sure to add appealing photos and clear descriptions.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"]',
                    intro: '<h3>Add Menu Item Button</h3><p>Click this button to create a new menu item. The form will let you:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Enter item name and description</li><li>Set the price</li><li>Upload photos (click "Choose File" or drag and drop)</li><li>Select which category it belongs to</li><li>Add variations (sizes, options) and modifiers</li><li>Set dietary information (allergens, vegetarian, etc.)</li><li>Control availability by mealtime or day</li><li>Enable or disable the item</li></ul>',
                    position: 'left'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Menu Items List</h3><p>This table displays all your menu items. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any item row to edit it</li><li>Click the edit button/icon to modify details</li><li>Click delete to remove items</li><li>Drag items up or down to reorder them (if drag handles are visible)</li><li>See item status (enabled/disabled)</li><li>View prices and categories at a glance</li></ul>',
                    position: 'top'
                },
                {
                    element: '.filter-bar, input[type="search"], select',
                    intro: '<h3>Filter Menu Items</h3><p>Use the search box to find items by name. Use dropdown filters to show items by category, status (enabled/disabled), or other criteria.</p><p style="margin-top: 8px; color: #333333;">This helps you quickly find and manage specific items when you have a large menu.</p>',
                    position: 'bottom'
                }
            ];
        },

        getCategoriesTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Menu Categories</h3><p>This page lets you organize your menu items into categories like Appetizers, Main Courses, Desserts, Beverages, and more.</p><p style="margin-top: 8px; color: #333333;">Categories help customers navigate your menu easily. Items appear under their assigned category on your customer website.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"]',
                    intro: '<h3>Add Category Button</h3><p>Click this button to create a new category. In the form, you can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Enter category name (e.g., "Appetizers", "Main Course")</li><li>Add a description for the category</li><li>Upload a category image</li><li>Set display order (position on menu)</li><li>Enable or disable the category</li></ul>',
                    position: 'left'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Categories List</h3><p>This table shows all your menu categories. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any category row to edit it</li><li>Click the edit button/icon to modify details</li><li>Click delete to remove categories (items in that category won\'t be deleted)</li><li>Drag categories up or down to change their order on the menu</li><li>See which categories are active or disabled</li></ul>',
                    position: 'top'
                }
            ];
        },

        getOrdersTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Orders Management</h3><p>This page shows all customer orders - both online orders and in-house orders. You can view order details, update order status, assign orders to staff members, print receipts, and track deliveries.</p><p style="margin-top: 8px; color: #333333;">Orders are displayed in a list format, with the most recent orders typically at the top.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"]',
                    intro: '<h3>Create Order Button</h3><p>Click this button to manually create a new order. This is useful for:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Walk-in customers who order at the counter</li><li>Phone orders taken over the phone</li><li>Testing the system</li></ul><p style="margin-top: 8px; color: #333333;">You will be able to select menu items, set quantities, add customer information, and process payment.</p>',
                    position: 'left'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Orders List</h3><p>This table shows all orders. For each order, you can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click an order row to view full details</li><li>Click the view/edit button to see order items and customer info</li><li>Click status buttons to update order status (Pending, Preparing, Ready, etc.)</li><li>Click print to generate receipts</li><li>Click delete to cancel/remove orders</li><li>See order number, customer name, total amount, and status</li></ul>',
                    position: 'top'
                },
                {
                    element: '.filter-bar, input[type="search"], select, input[type="date"]',
                    intro: '<h3>Filter and Search Orders</h3><p>Use these controls to find specific orders:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Search box - Type order number or customer name</li><li>Status dropdown - Filter by order status (All, Pending, Completed, etc.)</li><li>Date picker - Select date range to view orders from specific days</li><li>Location filter - If you have multiple locations, filter by location</li><li>Export button - Click to download orders as CSV/Excel for accounting</li></ul>',
                    position: 'bottom'
                }
            ];
        },

        getReservationsTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Reservations Management</h3><p>This page lets you manage table reservations for your restaurant. You can view all bookings, assign tables to reservations, track walk-in customers, and handle special requests.</p><p style="margin-top: 8px; color: #333333;">Reservations can be made by customers online or you can create them manually here.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"]',
                    intro: '<h3>New Reservation Button</h3><p>Click this button to create a new table reservation. You can enter:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Customer name and contact information</li><li>Date and time for the reservation</li><li>Number of guests</li><li>Table assignment (if tables are set up)</li><li>Special requests or notes</li><li>Reservation status</li></ul>',
                    position: 'left'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Reservations List</h3><p>This table shows all reservations. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any reservation to view full details</li><li>Click edit to modify reservation information</li><li>Click status buttons to change reservation status (Confirmed, Seated, Completed, Cancelled)</li><li>Click delete to cancel reservations</li><li>See date, time, guest count, and customer name</li><li>Switch to calendar view by clicking the calendar icon/button</li></ul>',
                    position: 'top'
                },
                {
                    element: '.filter-bar, input[type="search"], input[type="date"]',
                    intro: '<h3>Filter Reservations</h3><p>Use these controls to find specific reservations:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Search box - Type customer name or phone number</li><li>Date picker - Select a date to see reservations for that day</li><li>Status filter - Filter by reservation status</li><li>View options - Switch between list view and calendar view</li></ul>',
                    position: 'bottom'
                }
            ];
        },

        getSettingsIndexTour: function() {
            return [
                {
                    element: '.page-content, .nk-block, .card-inner',
                    intro: '<h3>Settings Overview</h3><p>This is the main settings page where you can access all configuration options for your restaurant system.</p><p style="margin-top: 8px; color: #333333;">Click on any settings card below to open and edit that specific category. Each card shows the category name, description, and an icon.</p>',
                    position: 'bottom'
                },
                {
                    element: '.control-card, .card, [class*="settings"]',
                    intro: '<h3>Settings Categories</h3><p>These cards represent different settings sections. Click any card to open and configure that category:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>General</strong> - Business name, logo, contact info, geolocation</li><li><strong>Site/Localization</strong> - Language, currency, timezone, country</li><li><strong>Restaurant</strong> - Operating hours, delivery zones</li><li><strong>Mail</strong> - Email server and notification settings</li><li><strong>Media</strong> - File upload limits and storage</li><li><strong>Tax</strong> - Tax rates and calculations</li><li><strong>Setup</strong> - Initial setup and order/reservation emails</li><li><strong>User</strong> - Customer registration settings</li><li><strong>Advanced</strong> - System maintenance and logs</li></ul>',
                    position: 'top'
                }
            ];
        },

        getSettingsGeneralTour: function() {
            return [
                {
                    element: '.page-content, .nk-block, .card-inner',
                    intro: '<h3>General Settings</h3><p>This page lets you configure basic restaurant information including business name, email address, logo, and geolocation settings.</p><p style="margin-top: 8px; color: #333333;">These settings are used throughout your system to identify your restaurant and determine location-based features.</p>',
                    position: 'bottom'
                },
                {
                    element: '.nav-tabs, .form-nav, [class*="nav-tabs"]',
                    intro: '<h3>Settings Tabs</h3><p>This page may have multiple tabs for different aspects of general settings. Click on tabs like "Geolocation" or "Date/Time" to access specific configuration options.</p>',
                    position: 'left'
                },
                {
                    element: '.form-fields, .tab-content, .tab-pane, form, input[name*="site_name"], input[name*="site_email"]',
                    intro: '<h3>General Settings Form</h3><p>Fill in these fields to configure your restaurant:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Restaurant Name</strong> - Enter your business name as it appears to customers</li><li><strong>Restaurant Email</strong> - Email address used for system notifications</li><li><strong>Logo</strong> - Upload your restaurant logo (click upload button to select image)</li><li><strong>Geolocation</strong> - Set your restaurant\'s address and coordinates for maps</li><li><strong>Timezone</strong> - Select your timezone for accurate time display</li><li><strong>Date Format</strong> - Choose how dates are displayed</li></ul>',
                    position: 'top'
                },
                {
                    element: '.toolbar, .page-toolbar, button[type="submit"], .btn-primary',
                    intro: '<h3>Save Button</h3><p>Click this "Save" button to save all your general settings changes. Your changes will not be saved until you click this button.</p>',
                    position: 'top'
                },
                {
                    element: 'button[type="button"].btn-outline-secondary, .btn-back',
                    intro: '<h3>Cancel/Back Button</h3><p>Click this button to cancel changes and return to the settings overview page. Any unsaved changes will be lost.</p>',
                    position: 'top'
                }
            ];
        },

        getSettingsSiteTour: function() {
            return [
                {
                    element: '.page-content, .nk-block, .card-inner',
                    intro: '<h3>Localization Settings</h3><p>This page lets you configure localization settings including default country, language, currency, and timezone for your restaurant.</p><p style="margin-top: 8px; color: #333333;">These settings determine how dates, times, currencies, and languages are displayed to customers on your website.</p>',
                    position: 'bottom'
                },
                {
                    element: '.form-fields, form, select[name*="country"], select[name*="language"], select[name*="currency"]',
                    intro: '<h3>Localization Form</h3><p>Configure these settings:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Default Country</strong> - Select your primary operating country (affects tax calculations and delivery zones)</li><li><strong>Default Language</strong> - Choose the main language for your website and admin panel</li><li><strong>Default Currency</strong> - Set the currency used for prices (USD, EUR, GBP, etc.)</li><li><strong>Currency Symbol</strong> - Choose where currency symbol appears (before or after amount)</li><li><strong>Timezone</strong> - Set your restaurant\'s timezone for accurate time display</li><li><strong>Date Format</strong> - Choose date display format (MM/DD/YYYY, DD/MM/YYYY, etc.)</li><li><strong>Time Format</strong> - Choose 12-hour or 24-hour time format</li></ul>',
                    position: 'top'
                },
                {
                    element: '.toolbar, .page-toolbar, button[type="submit"], .btn-primary',
                    intro: '<h3>Save Button</h3><p>Click "Save" to apply your localization settings. Changes will affect how information is displayed throughout your system.</p>',
                    position: 'top'
                }
            ];
        },

        getSettingsRestaurantTour: function() {
            return [
                {
                    element: '.page-content, .nk-block, .card-inner',
                    intro: '<h3>Restaurant Settings</h3><p>This page lets you configure restaurant-specific settings like operating hours, delivery zones, preparation times, and location details.</p><p style="margin-top: 8px; color: #333333;">These settings control when customers can place orders, delivery availability, and restaurant operations.</p>',
                    position: 'bottom'
                },
                {
                    element: '.form-fields, form, input[name*="hours"], input[name*="delivery"]',
                    intro: '<h3>Restaurant Configuration</h3><p>Configure these restaurant settings:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Operating Hours</strong> - Set when your restaurant is open (days and times)</li><li><strong>Delivery Hours</strong> - Set when delivery is available</li><li><strong>Pickup Hours</strong> - Set when customers can pick up orders</li><li><strong>Preparation Time</strong> - Set average time to prepare orders</li><li><strong>Delivery Zones</strong> - Configure areas where you deliver</li><li><strong>Minimum Order Amount</strong> - Set minimum order value for delivery</li><li><strong>Delivery Fee</strong> - Set delivery charges</li></ul>',
                    position: 'top'
                },
                {
                    element: '.toolbar, .page-toolbar, button[type="submit"], .btn-primary',
                    intro: '<h3>Save Button</h3><p>Click "Save" to save your restaurant settings. These affect when customers can place orders and delivery availability.</p>',
                    position: 'top'
                }
            ];
        },

        getSettingsMailTour: function() {
            return [
                {
                    element: '.page-content, .nk-block, .card-inner',
                    intro: '<h3>Mail Settings</h3><p>This page lets you configure email server settings for sending automated emails like order confirmations, receipts, and notifications.</p><p style="margin-top: 8px; color: #333333;">Configure your email server (SMTP) or use default mail settings to ensure customers receive important emails.</p>',
                    position: 'bottom'
                },
                {
                    element: '.form-fields, form, input[name*="smtp"], input[name*="email"], select[name*="protocol"]',
                    intro: '<h3>Mail Configuration</h3><p>Set up email settings:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Mail Protocol</strong> - Choose mail (default) or SMTP for sending emails</li><li><strong>SMTP Host</strong> - Enter your SMTP server address (e.g., smtp.gmail.com)</li><li><strong>SMTP Port</strong> - Enter SMTP port (usually 587 for TLS or 465 for SSL)</li><li><strong>SMTP User</strong> - Enter your email account username</li><li><strong>SMTP Password</strong> - Enter your email account password</li><li><strong>SMTP Encryption</strong> - Choose TLS, SSL, or None</li><li><strong>From Email</strong> - Email address that appears as sender</li><li><strong>From Name</strong> - Name that appears as sender</li></ul>',
                    position: 'top'
                },
                {
                    element: '.toolbar, .page-toolbar, button[type="submit"], .btn-primary',
                    intro: '<h3>Save Button</h3><p>Click "Save" to save your mail settings. Test your email configuration by sending a test email after saving.</p>',
                    position: 'top'
                }
            ];
        },

        getSettingsMediaTour: function() {
            return [
                {
                    element: '.page-content, .nk-block, .card-inner',
                    intro: '<h3>Media Settings</h3><p>This page lets you configure media upload settings including file size limits, allowed file types, and media storage options.</p><p style="margin-top: 8px; color: #333333;">These settings control how images and files are uploaded and stored in your system.</p>',
                    position: 'bottom'
                },
                {
                    element: '.form-fields, form, input[name*="max_size"], input[name*="upload"]',
                    intro: '<h3>Media Configuration</h3><p>Configure media settings:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Max Upload Size</strong> - Set maximum file size for uploads (in MB)</li><li><strong>Allowed File Types</strong> - Choose which file types can be uploaded (images, documents, etc.)</li><li><strong>Image Quality</strong> - Set compression quality for uploaded images</li><li><strong>Thumbnail Size</strong> - Configure thumbnail dimensions for images</li><li><strong>Storage Location</strong> - Choose where files are stored (local or cloud)</li></ul>',
                    position: 'top'
                },
                {
                    element: '.toolbar, .page-toolbar, button[type="submit"], .btn-primary',
                    intro: '<h3>Save Button</h3><p>Click "Save" to apply your media settings. These affect file uploads across your system.</p>',
                    position: 'top'
                }
            ];
        },

        getSettingsTaxTour: function() {
            return [
                {
                    element: '.page-content, .nk-block, .card-inner',
                    intro: '<h3>Tax Settings Page</h3><p>This page lets you configure tax settings for your restaurant. You can enable or disable taxes, set tax rates, configure how taxes are applied to menu prices, and decide whether delivery charges are taxed.</p><p style="margin-top: 8px; color: #333333;">Tax settings control how taxes are calculated and displayed on customer orders and invoices. Let\'s go through each setting one by one from top to bottom.</p>',
                    position: 'bottom'
                },
                {
                    element: 'input[name="tax_mode"], [name="tax_mode"], .form-group:has([name="tax_mode"]), .form-group:has(input[name="tax_mode"])',
                    intro: '<h3>Enable/Disable Tax Button</h3><p>This toggle switch controls whether tax calculation is enabled in your system.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click "Yes" or toggle ON to enable tax calculation - taxes will be calculated on all orders</li><li>Click "No" or toggle OFF to disable tax calculation - no taxes will be added to orders</li><li>When enabled, you must set a tax rate (see next step)</li><li>When disabled, all other tax settings are ignored</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'input[name="tax_percentage"], [name="tax_percentage"], input[type="number"][name*="tax_percentage"], .form-group:has([name="tax_percentage"])',
                    intro: '<h3>Tax Rate Field</h3><p>This number field lets you set the tax percentage rate.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Enter a number representing the tax percentage (e.g., enter "10" for 10% tax)</li><li>This rate will be applied to order subtotals</li><li>For example: If order total is $100 and tax rate is 10%, customer pays $110</li><li>This field is required when tax mode is enabled</li><li>You can enter decimals like "8.5" for 8.5% tax rate</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'select[name="tax_menu_price"], [name="tax_menu_price"], .form-group:has([name="tax_menu_price"])',
                    intro: '<h3>Tax Menu Price Dropdown</h3><p>This dropdown lets you choose how tax is applied to menu item prices.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click the dropdown to see options</li><li><strong>Option 1: Menu price includes tax</strong> - The prices shown on your menu already include tax. When customer orders, they pay the menu price (tax is already included).</li><li><strong>Option 2: Apply tax on menu price</strong> - The prices shown on your menu do NOT include tax. Tax is added on top of menu prices when customer orders.</li><li>Example: If menu shows $10 and tax is 10%, with "includes tax" customer pays $10, with "apply tax" customer pays $11</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'input[name="tax_delivery_charge"], [name="tax_delivery_charge"], .form-group:has([name="tax_delivery_charge"])',
                    intro: '<h3>Tax Delivery Charge Toggle</h3><p>This toggle switch controls whether tax is applied to delivery charges.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click "Yes" or toggle ON to apply tax to delivery charges - delivery fee will be taxed</li><li>Click "No" or toggle OFF to exclude delivery charges from tax - delivery fee won\'t be taxed</li><li>Example: If delivery is $5 and tax is 10%, with "Yes" customer pays $5.50 for delivery, with "No" customer pays $5 flat</li><li>This only applies if tax mode is enabled</li></ul>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar, .page-toolbar, button[type="submit"], .btn-primary, button.btn-primary',
                    intro: '<h3>Save Button</h3><p>Click this "Save" button to save all your tax settings changes. Your changes will not be saved until you click this button.</p><p style="margin-top: 8px; color: #333333;">After saving, the new tax settings will immediately apply to all future orders. Test your tax calculations by placing a test order to verify taxes are calculated correctly.</p>',
                    position: 'top'
                }
            ];
        },

        getSettingsAdvancedTour: function() {
            return [
                {
                    element: '.page-content, .nk-block, .card-inner',
                    intro: '<h3>Advanced Settings</h3><p>This page lets you configure advanced system settings including maintenance mode, logging, activity tracking, and system diagnostics.</p><p style="margin-top: 8px; color: #333333;">Use these settings carefully as they affect system operations and maintenance.</p>',
                    position: 'bottom'
                },
                {
                    element: '.nav-tabs, .form-nav, [class*="nav-tabs"]',
                    intro: '<h3>Settings Tabs</h3><p>This page has multiple tabs. Click tabs like "Maintenance", "Activity Log", or "System Log" to access specific advanced settings.</p>',
                    position: 'left'
                },
                {
                    element: '.form-fields, form, input[name*="maintenance"], input[name*="log"]',
                    intro: '<h3>Advanced Configuration</h3><p>Configure these advanced settings:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Maintenance Mode</strong> - Enable to temporarily take your site offline for maintenance</li><li><strong>Activity Logging</strong> - Enable to track user activities and system events</li><li><strong>System Logging</strong> - Configure error and debug logging</li><li><strong>Log Retention</strong> - Set how long logs are kept before deletion</li><li><strong>Error Reporting</strong> - Configure how errors are reported</li></ul>',
                    position: 'top'
                },
                {
                    element: '.toolbar, .page-toolbar, button[type="submit"], .btn-primary',
                    intro: '<h3>Save Button</h3><p>Click "Save" to apply advanced settings. Be careful with maintenance mode as it will take your site offline.</p>',
                    position: 'top'
                }
            ];
        },

        getSettingsSetupTour: function() {
            return [
                {
                    element: '.page-content, .nk-block, .card-inner',
                    intro: '<h3>Setup Settings</h3><p>This page lets you configure settings for orders, reservations, and invoicing. The page is organized into three tabs: Order, Reservation, and Invoicing.</p><p style="margin-top: 8px; color: #333333;">These settings control how orders are processed, how reservations are handled, and how invoices are generated.</p>',
                    position: 'bottom'
                },
                {
                    element: '.nav-tabs, .form-nav, [class*="nav-tabs"], ul.nav-tabs',
                    intro: '<h3>Settings Tabs</h3><p>Click these tabs to configure different aspects:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Order</strong> - Configure order processing settings, guest orders, email notifications, and order statuses</li><li><strong>Reservation</strong> - Configure reservation settings, email notifications, and reservation statuses</li><li><strong>Invoicing</strong> - Configure invoice prefix and invoice logo</li></ul>',
                    position: 'left'
                },
                {
                    element: 'input[name="guest_order"], [name="guest_order"], .form-group:has([name="guest_order"])',
                    intro: '<h3>Allow Guest Orders</h3><p>This toggle switch controls whether customers can place orders without creating an account.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click "Yes" to allow guest checkout - customers can order without registering</li><li>Click "No" to require customers to create an account before ordering</li><li>The description explains: "Allow customer to place an order without creating an account"</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'input[name="location_order"], [name="location_order"], .form-group:has([name="location_order"])',
                    intro: '<h3>Reject Orders Outside Delivery Area</h3><p>This toggle controls whether orders from outside your delivery area are rejected.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click "Yes" to reject orders from addresses outside your delivery zones</li><li>Click "No" to allow orders from anywhere</li><li>The description explains: "If disabled, the customer will be allowed to order without entering their postcode/address"</li></ul>',
                    position: 'bottom'
                },
                {
                    element: '[name="order_email"], [name*="order_email"], .form-group:has([name*="order_email"])',
                    intro: '<h3>Send Order Confirmation/Alert Email</h3><p>These buttons control who receives email notifications when a new order is created:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>To customer</strong> - Click this button to send confirmation email to the customer</li><li><strong>To restaurant</strong> - Click this button to send notification email to the restaurant admin</li><li><strong>To location</strong> - Click this button to send notification email to the specific location</li></ul><p style="margin-top: 8px; color: #333333;">You can enable multiple recipients by clicking multiple buttons. Green buttons are active, grey buttons are inactive. The description explains: "Send a confirmation mail to the customer, admin and/or location email after a new order has been created"</p>',
                    position: 'bottom'
                },
                {
                    element: 'select[name="default_order_status"], [name="default_order_status"]',
                    intro: '<h3>Default Order Status</h3><p>This dropdown selects the initial status when a new order is placed or received.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click the dropdown to see available statuses (Received, Pending, etc.)</li><li>Select the status you want as the default for all new orders</li><li>This status will be automatically assigned when orders come in</li><li>The description explains: "Select the default order status when a new order is placed/received"</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'input[name="processing_order_status"], [name="processing_order_status"], select[name="processing_order_status"]',
                    intro: '<h3>Processing Order Status</h3><p>This field lets you select which order statuses trigger stock reduction (when inventory is decreased).</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click in this field to see available statuses</li><li>Select one or more statuses (e.g., "Preparation", "Delivery")</li><li>Selected statuses appear as tags - click the X on any tag to remove it</li><li>When an order reaches any of these statuses, stock/inventory will start being reduced</li><li>The description explains: "Select the order status an order must reach before the order starts stock reduction"</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'input[name="completed_order_status"], [name="completed_order_status"], select[name="completed_order_status"]',
                    intro: '<h3>Completed Order Status</h3><p>This field lets you select the order status that marks an order as fully completed.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click in this field to select a status (usually "Completed")</li><li>Selected statuses appear as tags - click the X on any tag to remove it</li><li>When an order reaches this status, it means the order is finished</li><li>Only completed orders can have invoices created</li><li>Only completed orders allow customers to leave reviews</li><li>The description explains: "Select the order status to mark an order as completed before the order invoice is created and a customer can leave review"</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'select[name="canceled_order_status"], [name="canceled_order_status"]',
                    intro: '<h3>Cancellation Order Status</h3><p>This dropdown selects the status to use when an order is canceled or suspected of fraud.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click the dropdown to see available statuses</li><li>Select the status you want for canceled orders (usually "Canceled")</li><li>This status is automatically assigned when orders are cancelled</li><li>The description explains: "Select the order status when an order is marked as canceled or suspected of fraudulent activity"</li></ul>',
                    position: 'bottom'
                },
                {
                    element: '.nav-tabs a[href*="reservation"], .tab-pane:has([name*="reservation_email"])',
                    intro: '<h3>Reservation Tab</h3><p>Click this tab to configure reservation settings. The Reservation tab contains:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Send Reservation Confirmation/Alert Email</strong> - Three buttons (To customer, To restaurant, To location) to choose who gets reservation emails. Green buttons are active, grey are inactive. You can enable multiple recipients.</li><li><strong>Default Reservation Status</strong> - Dropdown to select the status assigned to new reservations. The description explains: "Select the default reservation status when new reservation received"</li><li><strong>Confirmed Reservation Status</strong> - Dropdown to select the status when a reservation is confirmed. The description explains: "Select the reservation status when a reservation is confirmed and table marked as reserved"</li><li><strong>Canceled Reservation Status</strong> - Dropdown to select the status when a reservation is cancelled. The description explains: "Select the reservation status when a reservation is marked as canceled or suspected of fraudulent activity"</li></ul>',
                    position: 'bottom'
                },
                {
                    element: '.nav-tabs a[href*="invoice"], .tab-pane:has([name*="invoice_prefix"])',
                    intro: '<h3>Invoicing Tab</h3><p>Click this tab to configure invoicing settings. The Invoicing tab contains:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Invoice Prefix</strong> - Text field to set prefix for invoice numbers (e.g., "INV-2025-001123")</li><li>You can use macros in the prefix: {year}, {month}, {day}, {hour}, {minute}, {second}</li><li>Leave blank to use no prefix</li><li>Example: "INV-{year}-{month}" would create "INV-2025-11"</li><li>The description explains: "Set the invoice prefix (e.g. INV-2015-001123). Leave blank to use no prefix. The following macros are available: {year} {month} {day} {hour} {minute} {second}"</li><li><strong>Invoice Logo</strong> - Upload or select a logo to display on invoices</li></ul>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar, .page-toolbar, button[type="submit"], .btn-primary',
                    intro: '<h3>Save Button</h3><p>Click this "Save" button to save all your setup settings changes. Your changes will not be saved until you click this button.</p><p style="margin-top: 8px; color: #333333;">After saving, the new settings will immediately apply to all future orders, reservations, and invoices.</p>',
                    position: 'top'
                }
            ];
        },

        getSettingsUserTour: function() {
            return [
                {
                    element: '.page-content, .nk-block, .card-inner',
                    intro: '<h3>User Registration Settings</h3><p>This page lets you configure customer registration settings including whether registration is required, email confirmation, and registration preferences.</p><p style="margin-top: 8px; color: #333333;">These settings control how customers can create accounts on your website.</p>',
                    position: 'bottom'
                },
                {
                    element: '.form-fields, form, input[name*="registration"], select[name*="registration"]',
                    intro: '<h3>Registration Configuration</h3><p>Configure these user settings:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Allow Registration</strong> - Enable or disable customer account registration</li><li><strong>Require Email Activation</strong> - Force customers to verify email before login</li><li><strong>Registration Email</strong> - Email address for registration confirmation emails</li><li><strong>Default Customer Group</strong> - Assign new customers to a default group</li><li><strong>Registration Terms</strong> - Show terms and conditions during registration</li></ul>',
                    position: 'top'
                },
                {
                    element: '.toolbar, .page-toolbar, button[type="submit"], .btn-primary',
                    intro: '<h3>Save Button</h3><p>Click "Save" to save your user registration settings. These affect how customers can sign up for accounts.</p>',
                    position: 'top'
                }
            ];
        },

        getSettingsSalesTour: function() {
            return [
                {
                    element: '.page-content, .nk-block, .card-inner',
                    intro: '<h3>Sales Settings</h3><p>This page lets you configure sales-related settings for orders, reservations, and invoicing. The page is organized into three tabs: Order, Reservation, and Invoicing.</p><p style="margin-top: 8px; color: #333333;">These settings control how orders are processed, how reservations are handled, and how invoices are generated.</p>',
                    position: 'bottom'
                },
                {
                    element: '.nav-tabs, .form-nav, [class*="nav-tabs"], ul.nav-tabs',
                    intro: '<h3>Settings Tabs</h3><p>Click these tabs to configure different aspects of sales:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Order</strong> - Configure order processing settings, guest orders, email notifications, and order statuses</li><li><strong>Reservation</strong> - Configure reservation settings, email notifications, and reservation statuses</li><li><strong>Invoicing</strong> - Configure invoice prefix and invoicing preferences</li></ul>',
                    position: 'left'
                },
                {
                    element: 'input[name*="guest_order"], [name*="guest_order"], .form-group:has([name*="guest_order"])',
                    intro: '<h3>Allow Guest Orders</h3><p>This toggle switch controls whether customers can place orders without creating an account.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click "Yes" to allow guest checkout - customers can order without registering</li><li>Click "No" to require customers to create an account before ordering</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'input[name*="delivery_area"], [name*="delivery_area"], .form-group:has([name*="delivery_area"])',
                    intro: '<h3>Reject Orders Outside Delivery Area</h3><p>This toggle controls whether orders from outside your delivery area are rejected.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click "Yes" to reject orders from addresses outside your delivery zones</li><li>Click "No" to allow orders from anywhere (customers won\'t need to enter postcode/address)</li></ul>',
                    position: 'bottom'
                },
                {
                    element: '[name*="order_email"], [name*="send_order_email"], .form-group:has([name*="order_email"])',
                    intro: '<h3>Send Order Confirmation/Alert Email</h3><p>These buttons control who receives email notifications when a new order is created:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>To customer</strong> - Click to send confirmation email to the customer</li><li><strong>To restaurant</strong> - Click to send notification email to the restaurant admin</li><li><strong>To location</strong> - Click to send notification email to the specific location</li></ul><p style="margin-top: 8px; color: #333333;">You can enable multiple recipients by clicking multiple buttons.</p>',
                    position: 'bottom'
                },
                {
                    element: 'select[name*="default_order_status"], [name*="default_order_status"]',
                    intro: '<h3>Default Order Status</h3><p>This dropdown selects the initial status when a new order is placed or received.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click the dropdown to see available statuses (Received, Pending, etc.)</li><li>Select the status you want as the default for all new orders</li><li>This status will be automatically assigned when orders come in</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'input[name*="processing_order_status"], [name*="processing_order_status"], select[name*="processing_order_status"]',
                    intro: '<h3>Processing Order Status</h3><p>This field lets you select which order statuses trigger stock reduction (when inventory is decreased).</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click in this field to see available statuses</li><li>Select one or more statuses (e.g., "Preparation", "Delivery")</li><li>When an order reaches any of these statuses, stock/inventory will start being reduced</li><li>Click the X on any selected status to remove it</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'input[name*="completed_order_status"], [name*="completed_order_status"], select[name*="completed_order_status"]',
                    intro: '<h3>Completed Order Status</h3><p>This field lets you select the order status that marks an order as fully completed.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click in this field to select a status (usually "Completed")</li><li>When an order reaches this status, it means the order is finished</li><li>Only completed orders can have invoices created</li><li>Only completed orders allow customers to leave reviews</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'select[name*="canceled_order_status"], [name*="canceled_order_status"], select[name*="cancellation"]',
                    intro: '<h3>Cancellation Order Status</h3><p>This dropdown selects the status to use when an order is canceled or suspected of fraud.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click the dropdown to see available statuses</li><li>Select the status you want for canceled orders (usually "Canceled")</li><li>This status is automatically assigned when orders are cancelled</li></ul>',
                    position: 'bottom'
                },
                {
                    element: '.nav-tabs a[href*="reservation"], .tab-pane:has([name*="reservation_email"])',
                    intro: '<h3>Reservation Tab</h3><p>Click this tab to configure reservation settings. The Reservation tab contains:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Send Reservation Confirmation/Alert Email</strong> - Buttons to choose who gets reservation emails (customer, restaurant, location)</li><li><strong>Default Reservation Status</strong> - Status assigned to new reservations</li><li><strong>Confirmed Reservation Status</strong> - Status when reservation is confirmed and table marked as reserved</li><li><strong>Canceled Reservation Status</strong> - Status when reservation is cancelled</li></ul>',
                    position: 'bottom'
                },
                {
                    element: '.nav-tabs a[href*="invoice"], .tab-pane:has([name*="invoice_prefix"])',
                    intro: '<h3>Invoicing Tab</h3><p>Click this tab to configure invoicing settings. The Invoicing tab contains:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Invoice Prefix</strong> - Set prefix for invoice numbers (e.g., "INV-2025-001123")</li><li>You can use macros like {year}, {month}, {day}, {hour}, {minute}, {second} in the prefix</li><li>Leave blank to use no prefix</li><li>Example: "INV-{year}-{month}" would create "INV-2025-11"</li></ul>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar, .page-toolbar, button[type="submit"], .btn-primary',
                    intro: '<h3>Save Button</h3><p>Click this "Save" button to save all your sales settings changes. Your changes will not be saved until you click this button.</p><p style="margin-top: 8px; color: #333333;">After saving, the new settings will immediately apply to all future orders, reservations, and invoices.</p>',
                    position: 'top'
                }
            ];
        },

        getSettingsTour: function() {
            return [
                {
                    element: '.page-content, .nk-block, .card-inner',
                    intro: '<h3>Settings Page</h3><p>This is a settings configuration page. Use the form fields below to configure the settings for this category.</p><p style="margin-top: 8px; color: #333333;">Click "Save" at the bottom to save your changes.</p>',
                    position: 'bottom'
                },
                {
                    element: '.form-fields, .tab-content, .tab-pane, .card-inner.pt-0, form',
                    intro: '<h3>Settings Form</h3><p>Fill in the form fields to configure settings. Click "Save" when finished.</p>',
                    position: 'top'
                },
                {
                    element: '.toolbar, .page-toolbar, button[type="submit"], .btn-primary',
                    intro: '<h3>Save Button</h3><p>Click "Save" to save your changes. Changes are not saved until you click this button.</p>',
                    position: 'top'
                }
            ];
        },

        getStaffTour: function() {
            return [
                {
                    element: '.page-content, .nk-block, .card-inner, form',
                    intro: '<h3>Staff Management Page</h3><p>This page lets you add and manage your restaurant staff members. You can set roles, permissions, working schedules, and control what each staff member can access in the system.</p><p style="margin-top: 8px; color: #333333;">Different roles have different permissions - managers can access more features than regular staff members. Let\'s go through each field one by one.</p>',
                    position: 'bottom'
                },
                {
                    element: 'input[name="staff_name"], [name="staff_name"], input[placeholder*="Name"], .form-group:has([name="staff_name"])',
                    intro: '<h3>Name Field</h3><p>This text field is where you enter the staff member\'s full name.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Type the first name and last name of the staff member</li><li>This name will be displayed in the admin panel</li><li>Example: "John Smith"</li><li>This field is required</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'input[name="staff_email"], [name="staff_email"], input[type="email"], .form-group:has([name="staff_email"])',
                    intro: '<h3>Email Field</h3><p>This email field is where you enter the staff member\'s email address.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Type a valid email address (e.g., staff@example.com)</li><li>This email will be used for login and notifications</li><li>Must be unique - each staff member needs a different email</li><li>This field is required</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'input[name="username"], [name="username"], input[placeholder*="Username"], .form-group:has([name="username"])',
                    intro: '<h3>Username Field</h3><p>This text field is where you enter the staff member\'s username for logging in.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Type a unique username (e.g., "jsmith")</li><li>This is what the staff member will use to log into the admin panel</li><li>Must be unique - no two staff members can have the same username</li><li>Use letters, numbers, or underscores only</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'select[name="language"], [name="language"], select[name*="language"], .form-group:has([name*="language"])',
                    intro: '<h3>Language Dropdown</h3><p>This dropdown lets you select the preferred language for this staff member.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click the dropdown to see available languages</li><li>Select the language this staff member is most comfortable with</li><li>The admin panel will be displayed in this language for them</li><li>Examples: English, Spanish, French, etc.</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'input[name="send_invite"], [name="send_invite"], input[type="checkbox"][name*="invite"], .form-group:has([name*="invite"])',
                    intro: '<h3>Send Invitation Email Checkbox</h3><p>This checkbox controls whether an invitation email is sent to the staff member.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click to check the box to send an invitation email</li><li>The email contains a link to set their password</li><li>Uncheck if you don\'t want to send an invitation (you\'ll need to manually provide access)</li><li>Description: "Sends an invitation message containing a link to set a password on their account"</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'select[name="location_id"], select[name*="location"], [name*="location"], .form-group:has([name*="location"])',
                    intro: '<h3>Locations Field</h3><p>This field lets you specify which locations the staff member should belong to.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click to select one or more locations</li><li>The staff can ONLY view menus, categories, orders, and reservations attached to the selected location(s)</li><li>This restriction does not apply to super admins</li><li>Multiple locations can be selected if the staff works at multiple branches</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'select[name="staff_group_id"], select[name*="group"], [name*="group"], .form-group:has([name*="group"])',
                    intro: '<h3>Groups Field</h3><p>This field lets you specify which groups the staff should belong to.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click to select one or more groups</li><li>Segmenting staff into groups lets you easily assign orders</li><li>Groups help organize staff by department, shift, or team</li><li>Example groups: "Morning Shift", "Delivery Team", "Kitchen Staff"</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'select[name="staff_role_id"], select[name*="role"], [name*="role"], .form-group:has([name*="role"])',
                    intro: '<h3>Role Dropdown</h3><p>This dropdown lets you select the staff member\'s role. Roles define staff permissions.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click the dropdown to see available roles</li><li><strong>Owner</strong> - Default role for restaurant owners</li><li><strong>Manager</strong> - Default role for restaurant managers</li><li><strong>Waiter</strong> - Default role for restaurant waiters</li><li><strong>Delivery</strong> - Default role for restaurant delivery drivers</li><li><strong>Custom roles</strong> - You may have custom roles defined (like "test")</li><li>Each role has different permissions and access levels</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'input[name="super_staff"], [name="super_staff"], input[type="checkbox"][name*="super"], .form-group:has([name*="super"])',
                    intro: '<h3>Super Admin Toggle</h3><p>This toggle switch controls whether this staff member is a Super Admin.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click "Enabled" to grant this staff unlimited access to all areas of the system</li><li>Click "Disabled" to give normal permissions based on their role</li><li>Super staff can add and manage other staff members</li><li>Super admins can access all locations and bypass location restrictions</li><li><strong>Warning:</strong> Only give super admin access to trusted staff</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'select[name="staff_status"], [name="staff_status"], input[name*="status"], .form-group:has([name*="status"])',
                    intro: '<h3>Status Toggle</h3><p>This toggle switch controls whether this staff member account is active.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click "Enabled" to activate the staff account - they can log in</li><li>Click "Disabled" to deactivate the account - they cannot log in</li><li>Use this to temporarily suspend access without deleting the account</li><li>Disabled accounts retain all their data but cannot access the system</li></ul>',
                    position: 'bottom'
                },
                {
                    element: 'select[name="sale_permission"], [name*="sale_permission"], [name*="order_permission"], .form-group:has([name*="sale_permission"])',
                    intro: '<h3>Order and Reservation Scope</h3><p>This field controls what orders and reservations this staff member can view.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li><strong>Global Access</strong> - Can view all Orders and Reservations in the Admin Panel (full visibility)</li><li><strong>Groups</strong> - Can view Orders and Reservations in their Group(s) and Orders/Reservations assigned to them (group-level visibility)</li><li><strong>Restricted Access</strong> - Can only view Orders and Reservations assigned to them (personal assignments only)</li><li>Choose the appropriate access level based on their role and responsibilities</li></ul>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar, .page-toolbar, button[type="submit"], .btn-primary, button.btn-primary',
                    intro: '<h3>Save Button</h3><p>Click this "Save" button to create the staff member account with all the settings you configured.</p><p style="margin-top: 8px; color: #333333;">After saving, the staff member will be created and, if you enabled "Send Invitation Email", they will receive an email to set up their password and access the system.</p>',
                    position: 'top'
                }
            ];
        },

        getCustomersTour: function() {
            // Check if we're on create/edit page or list page
            if (window.location.pathname.includes('create') || window.location.pathname.includes('edit')) {
                return [
                    {
                        element: '.page-content, .nk-block, .card-inner, form',
                        intro: '<h3>Customer Management Page</h3><p>This page lets you add or edit customer information. You can manage customer details, contact info, addresses, and preferences.</p><p style="margin-top: 8px; color: #333333;">Let\'s go through each field one by one.</p>',
                        position: 'bottom'
                    },
                    {
                        element: 'input[name="first_name"], [name="first_name"], input[placeholder*="First"], .form-group:has([name="first_name"])',
                        intro: '<h3>First Name Field</h3><p>This text field is where you enter the customer\'s first name.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Type the first name of the customer</li><li>Example: "John"</li><li>This field is required</li></ul>',
                        position: 'bottom'
                    },
                    {
                        element: 'input[name="last_name"], [name="last_name"], input[placeholder*="Last"], .form-group:has([name="last_name"])',
                        intro: '<h3>Last Name Field</h3><p>This text field is where you enter the customer\'s last name.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Type the last name of the customer</li><li>Example: "Smith"</li><li>This field is required</li></ul>',
                        position: 'bottom'
                    },
                    {
                        element: 'input[name="email"], [name="email"], input[type="email"], .form-group:has([name="email"])',
                        intro: '<h3>Email Field</h3><p>This email field is where you enter the customer\'s email address.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Type a valid email address (e.g., customer@example.com)</li><li>This email will be used for order notifications</li><li>Must be unique - each customer needs a different email</li><li>This field is required</li></ul>',
                        position: 'bottom'
                    },
                    {
                        element: 'input[name="telephone"], [name="telephone"], input[type="tel"], input[placeholder*="Phone"], .form-group:has([name="telephone"])',
                        intro: '<h3>Phone Number Field</h3><p>This field is where you enter the customer\'s phone number.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Type the phone number with area code</li><li>Used for order updates and delivery coordination</li><li>Example: "+1-555-123-4567"</li></ul>',
                        position: 'bottom'
                    },
                    {
                        element: 'select[name="customer_group_id"], [name*="customer_group"], .form-group:has([name*="customer_group"])',
                        intro: '<h3>Customer Group Dropdown</h3><p>This dropdown lets you assign the customer to a group.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click to see available customer groups</li><li>Groups can have special pricing or offers</li><li>Example groups: "VIP", "Regular", "New Customer"</li></ul>',
                        position: 'bottom'
                    },
                    {
                        element: 'textarea[name="address"], [name="address"], textarea[placeholder*="Address"], .form-group:has(textarea[name="address"])',
                        intro: '<h3>Address Field</h3><p>This text area is where you enter the customer\'s delivery address.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Type the full street address</li><li>Include street number, name, and apartment/suite if applicable</li><li>This will be used for deliveries</li><li>Example: "123 Main Street, Apt 4B"</li></ul>',
                        position: 'bottom'
                    },
                    {
                        element: 'input[name="city"], [name="city"], .form-group:has([name="city"])',
                        intro: '<h3>City Field</h3><p>This text field is where you enter the customer\'s city.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Type the city name</li><li>Example: "New York"</li></ul>',
                        position: 'bottom'
                    },
                    {
                        element: 'input[name="postcode"], [name="postcode"], input[name*="zip"], .form-group:has([name="postcode"])',
                        intro: '<h3>Postcode/ZIP Field</h3><p>This field is where you enter the customer\'s postcode or ZIP code.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Type the postal code</li><li>Used to calculate delivery zones and fees</li><li>Example: "10001" or "SW1A 1AA"</li></ul>',
                        position: 'bottom'
                    },
                    {
                        element: 'select[name="country_id"], [name*="country"], .form-group:has([name*="country"])',
                        intro: '<h3>Country Dropdown</h3><p>This dropdown lets you select the customer\'s country.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click to see available countries</li><li>Select the appropriate country</li></ul>',
                        position: 'bottom'
                    },
                    {
                        element: 'input[name="status"], [name="status"], .switch, .form-group:has([name="status"])',
                        intro: '<h3>Status Toggle</h3><p>This toggle switch controls whether the customer account is active.</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click "Enabled" to activate the account</li><li>Click "Disabled" to deactivate (customer cannot log in)</li></ul>',
                        position: 'bottom'
                    },
                    {
                        element: '.toolbar, .page-toolbar, button[type="submit"], .btn-primary',
                        intro: '<h3>Save Button</h3><p>Click this "Save" button to save the customer information.</p><p style="margin-top: 8px; color: #333333;">After saving, the customer will be created or updated in your system.</p>',
                        position: 'top'
                    }
                ];
            } else {
                // List page
            return [
                {
                    element: '.page-content',
                        intro: '<h3>Customer Management</h3><p>This page shows all your customers who have registered or placed orders. You can view their order history, preferences, and contact information.</p><p style="margin-top: 8px; color: #333333;">Customers can register themselves on your website, or you can add them manually here.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"]',
                        intro: '<h3>Add Customer Button</h3><p>Click this button to manually add a new customer.</p><p style="margin-top: 8px; color: #333333;">You\'ll be able to enter their name, email, phone, address, and assign them to customer groups.</p>',
                    position: 'left'
                },
                {
                        element: '.list-table, table, .control-list',
                        intro: '<h3>Customer List</h3><p>This table shows all your customers. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any customer to view their full profile</li><li>See order history and total spent</li><li>Filter by customer groups</li><li>Search by name, email, or phone</li></ul>',
                    position: 'top'
                    },
                    {
                        element: '.filter-bar, input[type="search"], select',
                        intro: '<h3>Search Customers</h3><p>Use the search box to find customers by name, email, or phone number. Use filters to find customers by customer group or other criteria.</p>',
                        position: 'bottom'
                }
            ];
            }
        },

        getPaymentsTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Payment Gateways</h3><p>This page lets you configure how customers can pay for orders. You can set up credit cards, digital wallets, cash payments, and other payment methods.</p><p style="margin-top: 8px; color: #333333;">Each payment method needs to be configured with your account credentials from the payment provider.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"]',
                    intro: '<h3>Add Payment Method Button</h3><p>Click this button to enable a new payment method. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Select payment type (Stripe, PayPal, Cash, etc.)</li><li>Enter API credentials and account information</li><li>Set processing fees</li><li>Choose which locations can use this payment method</li><li>Enable or disable the payment method</li></ul>',
                    position: 'left'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Payment Methods List</h3><p>This table shows all configured payment methods. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any payment method to edit its settings</li><li>Click edit to modify credentials or configuration</li><li>Click enable/disable toggle to activate or deactivate payment methods</li><li>See payment method status and which locations use it</li><li>View transaction fees for each method</li></ul>',
                    position: 'top'
                }
            ];
        },

        getThemesTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Theme Customization</h3><p>This page lets you choose and customize themes for your customer-facing website. Themes control the look, colors, fonts, and layout of your website.</p><p style="margin-top: 8px; color: #333333;">Selecting the right theme helps match your restaurant\'s brand identity.</p>',
                    position: 'bottom'
                },
                {
                    element: '.theme-list, .control-table, .list-table, [class*="theme"]',
                    intro: '<h3>Available Themes</h3><p>This section shows all available themes. For each theme, you can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click "Activate" or "Install" to use a theme</li><li>Click "Customize" to modify colors, fonts, and layouts</li><li>Click "Preview" to see how it looks before activating</li><li>See theme name, description, and preview images</li><li>Switch between themes anytime</li></ul>',
                    position: 'top'
                }
            ];
        },

        getPOSTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>POS Devices Configuration</h3><p>This page lets you configure Point of Sale devices for in-restaurant orders and table service. POS devices can be tablets or terminals used by your staff to take orders.</p><p style="margin-top: 8px; color: #333333;">Each device needs to be registered and connected to your system.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"]',
                    intro: '<h3>Add POS Device Button</h3><p>Click this button to register a new POS device. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Enter device name and identifier</li><li>Assign device to a specific location</li><li>Set device type (Tablet, Terminal, etc.)</li><li>Generate access codes for device authentication</li><li>Enable or disable the device</li></ul>',
                    position: 'left'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>POS Devices List</h3><p>This table shows all registered POS devices. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any device to view its details</li><li>Click edit to modify device settings</li><li>See connection status (online/offline)</li><li>See which location the device is assigned to</li><li>View recent activity from each device</li><li>Disable devices that are not in use</li></ul>',
                    position: 'top'
                }
            ];
        },

        getTablesTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Table Management</h3><p>This page lets you organize your restaurant seating. You can create tables for different capacities and dining sections, and track which tables are available or occupied.</p><p style="margin-top: 8px; color: #333333;">Tables can be assigned QR codes that customers can scan with their phones to view the menu and place orders.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"]',
                    intro: '<h3>Add Table Button</h3><p>Click this button to create a new table. You can set:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Table number or name</li><li>Capacity (how many guests can sit)</li><li>Section (Dining Room, Patio, etc.)</li><li>Minimum number of guests</li><li>Maximum number of guests</li><li>Generate QR code for contactless ordering</li><li>Enable or disable the table</li></ul>',
                    position: 'left'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Tables List</h3><p>This table shows all your restaurant tables. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any table to view its details</li><li>Click edit to modify table information</li><li>Click delete to remove tables</li><li>See table status (available, occupied, reserved)</li><li>View table capacity and section</li><li>Download or print QR codes for tables</li></ul>',
                    position: 'top'
                }
            ];
        },

        getMealtimesTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Mealtime Settings</h3><p>This page lets you define meal periods like breakfast, lunch, dinner, and special meal times. You can control when specific menu items are available to customers.</p><p style="margin-top: 8px; color: #333333;">For example, you can make breakfast items only available during breakfast hours, or brunch items available on weekends only.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"]',
                    intro: '<h3>Add Mealtime Button</h3><p>Click this button to create a new meal period. You can set:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Mealtime name (Breakfast, Lunch, Dinner, etc.)</li><li>Start time and end time</li><li>Which days of the week it applies</li><li>Start date and end date (for seasonal mealtimes)</li><li>Enable or disable the mealtime</li></ul>',
                    position: 'left'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Mealtime List</h3><p>This table shows all configured meal periods. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any mealtime to edit its schedule</li><li>Click edit to modify start/end times or days</li><li>Click delete to remove mealtimes</li><li>See the time range and days for each mealtime</li><li>See which menu items are linked to each mealtime</li></ul>',
                    position: 'top'
                }
            ];
        },

        getStatusesTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Order & Reservation Statuses</h3><p>This page lets you customize status workflows to track orders and reservations from creation to completion. You can set colors and notifications for each status.</p><p style="margin-top: 8px; color: #333333;">Statuses help you and your staff see at a glance what stage each order or reservation is at.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"]',
                    intro: '<h3>Add Status Button</h3><p>Click this button to create a custom status. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Enter status name (e.g., "Preparing", "On Route", "Ready for Pickup")</li><li>Set a status color for visual identification</li><li>Choose if it\'s for orders, reservations, or both</li><li>Configure email notifications when status changes</li><li>Set notification templates</li></ul>',
                    position: 'left'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Status List</h3><p>This table shows all order and reservation statuses. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any status to edit its settings</li><li>Click edit to modify name, color, or notifications</li><li>Click delete to remove statuses</li><li>See which statuses are assigned to orders or reservations</li><li>See status colors at a glance</li><li>Drag to reorder statuses in the workflow</li></ul>',
                    position: 'top'
                }
            ];
        },

        getMediaManagerTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Media Manager</h3><p>This page lets you upload and organize images, documents, and other media files. You can use these files for menu items, logos, galleries, and other content on your website.</p><p style="margin-top: 8px; color: #333333;">All your uploaded files are stored here and can be reused across different parts of your system.</p>',
                    position: 'bottom'
                },
                {
                    element: '[data-bs-toggle="upload"], .btn-upload, button:contains("Upload"), input[type="file"]',
                    intro: '<h3>Upload Files Button</h3><p>Click this button or the upload area to upload files. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click to browse and select files from your computer</li><li>Drag and drop multiple files at once</li><li>Upload images (JPG, PNG, WebP recommended, under 2MB)</li><li>Upload documents (PDF, DOC, etc.)</li><li>Upload videos or other media types</li></ul>',
                    position: 'left'
                },
                {
                    element: '.media-manager, .media-library, [class*="media"]',
                    intro: '<h3>File Library</h3><p>This area displays all your uploaded files. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any file to view or download it</li><li>Click on images to select them for use in menus or other areas</li><li>Right-click files to rename, delete, or get file URL</li><li>Use search box to find specific files by name</li><li>Filter by file type (images, documents, etc.)</li><li>Create folders to organize files</li><li>Move files between folders by dragging</li></ul>',
                    position: 'top'
                }
            ];
        },

        getLanguagesTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Language Settings</h3><p>This page lets you add multiple languages for your restaurant. You can translate menus and content to serve international customers.</p><p style="margin-top: 8px; color: #333333;">When multiple languages are enabled, customers can switch between languages on your website.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"]',
                    intro: '<h3>Add Language Button</h3><p>Click this button to install a new language. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Select from available languages</li><li>Install the language pack</li><li>Enable the language for customers</li><li>Enable the language for staff/admin panel</li><li>Set the language as default</li></ul>',
                    position: 'left'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Installed Languages List</h3><p>This table shows all installed languages. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any language to edit its settings</li><li>Click edit to change language name or status</li><li>Click delete to remove a language</li><li>See which languages are enabled for customers and staff</li><li>Set default language</li><li>Click translate to edit translations for menu items and content</li></ul>',
                    position: 'top'
                }
            ];
        },

        getCurrenciesTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Currency Management</h3><p>This page lets you configure currencies so customers can pay in different currencies. You can set exchange rates and choose which currencies to accept.</p><p style="margin-top: 8px; color: #333333;">Useful if you serve customers from different countries or want to display prices in local currency.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"]',
                    intro: '<h3>Add Currency Button</h3><p>Click this button to add a new currency. You can set:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Currency code (USD, EUR, GBP, etc.)</li><li>Currency symbol ($, €, £, etc.)</li><li>Exchange rate relative to your base currency</li><li>Number of decimal places</li><li>Currency name</li><li>Enable or disable the currency</li></ul>',
                    position: 'left'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Currency List</h3><p>This table shows all configured currencies. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any currency to edit its settings</li><li>Click edit to modify exchange rate or other settings</li><li>Click delete to remove currencies</li><li>Set one currency as default</li><li>See current exchange rates</li><li>Click refresh to update exchange rates automatically</li></ul>',
                    position: 'top'
                }
            ];
        },

        getCountriesTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Country Settings</h3><p>This page lets you configure which countries you serve. You can set up delivery zones, tax rates, and regional rules for different countries.</p><p style="margin-top: 8px; color: #333333;">This is important for international restaurants or if you deliver to multiple countries.</p>',
                    position: 'bottom'
                },
                {
                    element: '.toolbar .btn-create, .page-toolbar .btn-create, [data-bs-toggle="toolbar-btn-create"]',
                    intro: '<h3>Add Country Button</h3><p>Click this button to enable a new country. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Select a country from the list</li><li>Enable or disable the country</li><li>Set default tax rates for that country</li><li>Configure delivery zones for that country</li><li>Set regional regulations and compliance rules</li></ul>',
                    position: 'left'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Country List</h3><p>This table shows all enabled countries. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any country to edit its settings</li><li>Click edit to modify tax rates or delivery zones</li><li>Click delete to disable a country</li><li>See which countries are enabled</li><li>View tax rates for each country</li><li>See delivery zone configurations</li></ul>',
                    position: 'top'
                }
            ];
        },

        getMailTemplatesTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>Email Templates</h3><p>This page lets you customize the emails sent to customers. You can edit templates for order confirmations, receipts, reservation confirmations, newsletters, and other automated emails.</p><p style="margin-top: 8px; color: #333333;">Customizing templates allows you to add your branding, logo, and make emails match your restaurant\'s style.</p>',
                    position: 'bottom'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Email Templates List</h3><p>This table shows all available email templates. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any template row to view and edit it</li><li>Click edit or the template name to customize it</li><li>Preview how the email will look to customers</li><li>See which templates are active</li><li>Test send emails to see how they appear</li><li>Reset templates to default if needed</li></ul>',
                    position: 'top'
                },
                {
                    element: '.list-table tr:first-child, .list-table tbody tr',
                    intro: '<h3>Template Editor</h3><p>When you click on a template, you can edit:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Email subject line - what customers see in their inbox</li><li>Email body - the main message content</li><li>Add your logo and branding images</li><li>Customize colors and styling</li><li>Add variables like customer name, order number, etc.</li><li>Preview changes before saving</li></ul>',
                    position: 'bottom'
                }
            ];
        },

        getSystemLogsTour: function() {
            return [
                {
                    element: '.page-content',
                    intro: '<h3>System Logs</h3><p>This page shows system activity logs. You can monitor errors, track user actions, see login attempts, and view important system events.</p><p style="margin-top: 8px; color: #333333;">Logs help you debug issues, track who did what, and monitor system health.</p>',
                    position: 'bottom'
                },
                {
                    element: '.filter-bar, .toolbar, input[type="search"], select, input[type="date"]',
                    intro: '<h3>Filter and Search Logs</h3><p>Use these controls to find specific log entries:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Search box - Type to search for specific error messages or keywords</li><li>Date picker - Select date range to view logs from specific days</li><li>Severity filter - Filter by log level (Error, Warning, Info, etc.)</li><li>User filter - Filter logs by which user performed the action</li><li>Clear logs button - Click to delete old log entries</li></ul>',
                    position: 'bottom'
                },
                {
                    element: '.list-table, table, .control-list',
                    intro: '<h3>Log Entries List</h3><p>This table displays all log entries. You can:</p><ul style="text-align: left; margin: 8px 0; color: #333333;"><li>Click any log entry to view full details</li><li>See timestamp, user, action, and message</li><li>See log level (error, warning, info)</li><li>View stack traces for errors</li><li>Export logs for analysis</li><li>Clear old logs to free up space</li></ul>',
                    position: 'top'
                }
            ];
        },

        startTour: function(forceStart = false) {
            if (typeof introJs === 'undefined') {
                return;
            }

            // If tour was skipped, don't auto-start unless forced (manual click on (i) icon)
            if (!forceStart && this.hasSkippedTour()) {
                return;
            }

            const steps = this.getTourSteps();
            
            if (!steps || steps.length === 0) {
                return;
            }

            // Wait for IntroJS to be fully initialized
            setTimeout(() => {
                // Filter steps to only include those with existing elements
                // For string selectors, try multiple selectors (comma-separated)
                let validSteps = steps.filter(step => {
                    if (!step.element) return true; // Allow body/document level steps
                    if (typeof step.element === 'string') {
                        // Try each selector in comma-separated list
                        const selectors = step.element.split(',').map(s => s.trim());
                        for (let selector of selectors) {
                            const element = document.querySelector(selector);
                            if (element) {
                                // Update step element to the found selector for better positioning
                                step.element = selector;
                                return true;
                            }
                        }
                        return false;
                    }
                    return step.element && document.contains(step.element);
                });

                // IMPORTANT: Always try auto-generation if we have very few valid steps
                // This ensures EVERY page gets a comprehensive, detailed tour
                if (validSteps.length < 5) {
                    // Try to auto-generate comprehensive tour from page form fields
                    const autoSteps = this.generateAutoTourFromPage();
                    if (autoSteps.length > validSteps.length) {
                        // Use auto-generated steps if they're more comprehensive
                        validSteps = autoSteps;
                    } else if (validSteps.length === 0 && autoSteps.length === 0) {
                        // Add a simple fallback step only if nothing else worked
                        const pageTitle = document.title || 'Admin Panel';
                        validSteps.push({
                            element: document.body,
                            intro: `<h3>Welcome to ${pageTitle}</h3><p>This is your admin panel for managing your restaurant. Use the sidebar menu to navigate to different sections and explore all available features.</p>`,
                            position: 'bottom'
                        });
                    }
                }

                const intro = introJs();
                
                intro.setOptions({
                    steps: validSteps,
                    showBullets: true,
                    showProgress: true,
                    showStepNumbers: false,
                    exitOnOverlayClick: true,
                    exitOnEsc: true,
                    keyboardNavigation: true,
                    disableInteraction: false,
                    tooltipClass: '',
                    highlightClass: '',
                    overlayOpacity: 0.45,
                    nextLabel: 'Next',
                    prevLabel: 'Previous',
                    skipLabel: 'Skip',
                    doneLabel: 'Done',
                    // Disable IntroJS auto-scrolling - we'll handle it manually
                    scrollPadding: 150,
                    scrollToElement: false,
                    // FORCE left positioning for ALL tooltips
                    positionPrecedence: ['left', 'left', 'left', 'left'],
                    // Disable helper layer highlighting
                    helperElementPadding: 0,
                    // Force left positioning
                    tooltipPosition: 'left',
                    // Callbacks
                    oncomplete: () => {
                        // Remove effects from all elements when completing
                        document.querySelectorAll('.introjs-showElement').forEach(el => {
                            el.classList.remove('introjs-showElement');
                            el.style.transition = 'transform 0.4s ease';
                            el.style.transform = 'scale(1)';
                            el.style.boxShadow = 'none';
                        });
                        this.markTourCompleted();
                    },
                    onexit: () => {
                        // Remove effects from all elements when exiting
                        document.querySelectorAll('.introjs-showElement').forEach(el => {
                            el.classList.remove('introjs-showElement');
                            el.style.transition = 'transform 0.4s ease';
                            el.style.transform = 'scale(1)';
                            el.style.boxShadow = 'none';
                        });
                        this.markTourSeen();
                    },
                    onbeforechange: (targetElement) => {
                        // Smoothly hide old tooltip by sliding out
                        const oldTooltips = document.querySelectorAll('.introjs-tooltip');
                        oldTooltips.forEach(tooltip => {
                            if (tooltip) {
                                tooltip.classList.add('introjs-hide');
                                tooltip.style.transform = 'translateX(-30px)';
                                tooltip.style.opacity = '0';
                            }
                        });
                    },
                    onchange: (targetElement) => {
                        // Store reference to tour object
                        const tour = this;
                        
                        // Hide helper layer - no gray borders
                        const helperLayers = document.querySelectorAll('.introjs-helperLayer');
                        helperLayers.forEach(layer => {
                            layer.style.setProperty('display', 'none', 'important');
                            layer.style.setProperty('visibility', 'hidden', 'important');
                            layer.style.setProperty('opacity', '0', 'important');
                            layer.style.setProperty('pointer-events', 'none', 'important');
                        });
                        
                        // Add smooth scale effect to highlighted element
                        if (targetElement) {
                            // Remove effect from previous element
                            document.querySelectorAll('.introjs-showElement').forEach(el => {
                                if (el !== targetElement) {
                                    el.classList.remove('introjs-showElement');
                                    el.style.transition = 'transform 0.4s ease';
                                    el.style.transform = 'scale(1)';
                                    el.style.boxShadow = 'none';
                                }
                            });
                            
                            // Check if element is inside a tab and switch to that tab first
                            const tabElement = tour.findTabForElement(targetElement);
                            if (tabElement) {
                                tour.switchToTab(tabElement, () => {
                                    // After tab switch, add effect to element
                            setTimeout(() => {
                                        targetElement.classList.add('introjs-showElement');
                                        targetElement.style.transition = 'transform 0.5s ease';
                                        targetElement.style.transform = 'scale(1.02)';
                                    }, 200);
                                });
                            } else {
                                // Add effect to current element immediately
                                setTimeout(() => {
                                    targetElement.classList.add('introjs-showElement');
                                    targetElement.style.transition = 'transform 0.5s ease';
                                    targetElement.style.transform = 'scale(1.02)';
                            }, 100);
                        }
                    }
                        
                        // Ensure tooltip reference layer has highest z-index
                        setTimeout(() => {
                            const tooltipRefLayer = document.querySelector('.introjs-tooltipReferenceLayer');
                            if (tooltipRefLayer) {
                                tooltipRefLayer.style.setProperty('z-index', '2147483647', 'important');
                                tooltipRefLayer.style.setProperty('position', 'fixed', 'important');
                            }
                            
                            // Wait for IntroJS to finish positioning, then apply smooth animation
                            const newTooltips = document.querySelectorAll('.introjs-tooltip');
                            newTooltips.forEach(tooltip => {
                                if (tooltip && tooltip.classList.contains('introjs-hide')) {
                                    tooltip.classList.remove('introjs-hide');
                                }
                                
                                if (tooltip && !tooltip.classList.contains('introjs-hide')) {
                                    // Store current position before animation
                                    const rect = tooltip.getBoundingClientRect();
                                    const currentLeft = rect.left;
                                    
                                    // Lock position to prevent jumps - use fixed positioning temporarily
                                    tooltip.style.setProperty('z-index', '2147483647', 'important');
                                    tooltip.style.setProperty('will-change', 'opacity, transform', 'important');
                                    
                                    // Start from side (opacity 0, slightly off)
                                    tooltip.style.setProperty('opacity', '0', 'important');
                                    tooltip.style.setProperty('transform', 'translateX(-20px)', 'important');
                                    tooltip.style.setProperty('transition', 'opacity 0.25s ease-out, transform 0.25s ease-out', 'important');
                                    
                                    // Force a reflow to ensure styles are applied
                                    void tooltip.offsetWidth;
                                    
                                    // Animate in smoothly without position recalculation
                                    requestAnimationFrame(() => {
                                        requestAnimationFrame(() => {
                                            tooltip.style.setProperty('opacity', '1', 'important');
                                            tooltip.style.setProperty('transform', 'translateX(0)', 'important');
                            // ABSOLUTELY FORCE FIXED 230px width (sidebar width) - NEVER EVER changes
                            tooltip.style.setProperty('max-width', '230px', 'important');
                            tooltip.style.setProperty('min-width', '230px', 'important');
                            tooltip.style.setProperty('width', '230px', 'important');
                            tooltip.style.setProperty('flex-basis', '230px', 'important');
                            tooltip.style.setProperty('flex-grow', '0', 'important');
                            tooltip.style.setProperty('flex-shrink', '0', 'important');
                            // Allow height to grow
                            tooltip.style.setProperty('height', 'auto', 'important');
                            tooltip.style.setProperty('max-height', 'calc(100vh - 80px)', 'important');
                            tooltip.style.setProperty('overflow-y', 'auto', 'important');
                            tooltip.style.setProperty('overflow-x', 'hidden', 'important');
                                        });
                                    });
                                    
                                    // Remove will-change after animation completes
                                    setTimeout(() => {
                                        tooltip.style.removeProperty('will-change');
                                        tooltip.style.setProperty('transition', 'opacity 0.15s ease', 'important');
                                    }, 300);
                                }
                            });
                        }, 100); // Give IntroJS time to position first
                        
                        // Ensure tooltip is visible in viewport and doesn't overlap highlighted element
                        setTimeout(() => {
                            const tooltip = document.querySelector('.introjs-tooltip');
                            const tooltipRefLayer = document.querySelector('.introjs-tooltipReferenceLayer');
                            
                            if (tooltip && tooltipRefLayer && targetElement) {
                                const tooltipRect = tooltip.getBoundingClientRect();
                                const layerRect = tooltipRefLayer.getBoundingClientRect();
                                const elementRect = targetElement.getBoundingClientRect();
                                const viewportWidth = window.innerWidth;
                                const viewportHeight = window.innerHeight;
                                const padding = 20;
                                
                                let needsReposition = false;
                                let newLeft = null;
                                let newTop = null;
                                
                                // Check if tooltip overlaps with highlighted element
                                const overlapX = !(tooltipRect.right < elementRect.left || tooltipRect.left > elementRect.right);
                                const overlapY = !(tooltipRect.bottom < elementRect.top || tooltipRect.top > elementRect.bottom);
                                const overlapsElement = overlapX && overlapY;
                                
                                // If tooltip overlaps element, position it to the left of the element
                                if (overlapsElement) {
                                    const tooltipWidth = tooltipRect.width || 230;
                                    const gap = 15; // Gap between tooltip and element
                                    
                                    // Position to the left of element
                                    if (elementRect.left > tooltipWidth + padding + gap) {
                                        newLeft = elementRect.left - tooltipWidth - gap;
                                        newTop = elementRect.top + (elementRect.height / 2) - (tooltipRect.height / 2);
                                        needsReposition = true;
                                    } else {
                                        // If not enough space on left, position above or below
                                        if (elementRect.top > tooltipRect.height + padding + gap) {
                                            newTop = elementRect.top - tooltipRect.height - gap;
                                        } else if (elementRect.bottom + tooltipRect.height + gap < viewportHeight - padding) {
                                            newTop = elementRect.bottom + gap;
                                        }
                                        needsReposition = true;
                                    }
                                }
                                
                                // Get current position from styles
                                const currentStyle = window.getComputedStyle(tooltipRefLayer);
                                let currentLeft = parseInt(currentStyle.left) || layerRect.left;
                                let currentTop = parseInt(currentStyle.top) || layerRect.top;
                                
                                // Check horizontal bounds - ensure entire tooltip is visible
                                if (tooltipRect.left < padding) {
                                    needsReposition = true;
                                    newLeft = padding;
                                } else if (tooltipRect.right > viewportWidth - padding) {
                                    needsReposition = true;
                                    const tooltipWidth = tooltipRect.width || 230;
                                    newLeft = viewportWidth - tooltipWidth - padding;
                                }
                                
                                // Check vertical bounds - ensure entire tooltip is visible
                                if (tooltipRect.top < padding) {
                                    needsReposition = true;
                                    newTop = padding;
                                } else if (tooltipRect.bottom > viewportHeight - padding) {
                                    needsReposition = true;
                                    const tooltipHeight = tooltipRect.height || 200;
                                    newTop = viewportHeight - tooltipHeight - padding;
                                }
                                
                                // Reposition if needed
                                if (needsReposition) {
                                    // Calculate offset from layer to tooltip
                                    const offsetX = tooltipRect.left - layerRect.left;
                                    const offsetY = tooltipRect.top - layerRect.top;
                                    
                                    if (newLeft !== null) {
                                        tooltipRefLayer.style.setProperty('left', (newLeft - offsetX) + 'px', 'important');
                                    }
                                    if (newTop !== null) {
                                        tooltipRefLayer.style.setProperty('top', (newTop - offsetY) + 'px', 'important');
                                    }
                                    
                                    // Force tooltip to stay within viewport bounds but never exceed 230px (sidebar width)
                                    const maxAllowedWidth = Math.min(230, viewportWidth - (padding * 2));
                                    tooltip.style.setProperty('max-width', '230px', 'important');
                                    tooltip.style.setProperty('min-width', '230px', 'important');
                                    tooltip.style.setProperty('width', '230px', 'important');
                                    tooltip.style.setProperty('max-height', (viewportHeight - (padding * 2)) + 'px', 'important');
                                }
                            }
                        }, 300);
                        
                        // Custom smooth scroll to element - ALWAYS smooth, NEVER jump
                        if (targetElement) {
                            setTimeout(() => {
                                // Check if element is in viewport
                                const elementRect = targetElement.getBoundingClientRect();
                                const isInViewport = (
                                    elementRect.top >= 0 &&
                                    elementRect.bottom <= window.innerHeight
                                );
                                
                                // Only scroll if element is not fully visible
                                if (!isInViewport) {
                                    const absoluteElementTop = elementRect.top + window.pageYOffset;
                                    const middle = absoluteElementTop - (window.innerHeight / 2) + (elementRect.height / 2);
                                    
                                    // SMOOTH scroll with proper behavior
                                    window.scrollTo({
                                        top: middle,
                                        left: 0,
                                        behavior: 'smooth'
                                    });
                                }
                            }, 100);
                        }
                    },
                    onbeforeexit: () => {
                        // Ensure tooltip is removed when exiting
                        const tooltip = document.querySelector('.introjs-tooltip');
                        if (tooltip) {
                            tooltip.style.display = 'none';
                        }
                    }
                });

                intro.start();
                
                // Add viewport checker on window resize and continuous monitoring
                const checkViewport = () => {
                    setTimeout(() => {
                        const tooltip = document.querySelector('.introjs-tooltip');
                        const tooltipRefLayer = document.querySelector('.introjs-tooltipReferenceLayer');
                        
                        if (tooltip && tooltipRefLayer && !tooltip.classList.contains('introjs-hide')) {
                            const tooltipRect = tooltip.getBoundingClientRect();
                            const viewportWidth = window.innerWidth;
                            const viewportHeight = window.innerHeight;
                            const padding = 20;
                            
                            // Check if tooltip is outside viewport
                            if (tooltipRect.left < padding || 
                                tooltipRect.right > viewportWidth - padding ||
                                tooltipRect.top < padding || 
                                tooltipRect.bottom > viewportHeight - padding) {
                                
                                const layerRect = tooltipRefLayer.getBoundingClientRect();
                                const offsetX = tooltipRect.left - layerRect.left;
                                const offsetY = tooltipRect.top - layerRect.top;
                                
                                let newLeft = null;
                                let newTop = null;
                                
                                if (tooltipRect.left < padding) {
                                    newLeft = padding;
                                } else if (tooltipRect.right > viewportWidth - padding) {
                                    const tooltipWidth = tooltipRect.width || 230;
                                    newLeft = viewportWidth - tooltipWidth - padding;
                                }
                                
                                if (tooltipRect.top < padding) {
                                    newTop = padding;
                                } else if (tooltipRect.bottom > viewportHeight - padding) {
                                    const tooltipHeight = tooltipRect.height || 200;
                                    newTop = viewportHeight - tooltipHeight - padding;
                                }
                                
                                if (newLeft !== null) {
                                    tooltipRefLayer.style.setProperty('left', (newLeft - offsetX) + 'px', 'important');
                                }
                                if (newTop !== null) {
                                    tooltipRefLayer.style.setProperty('top', (newTop - offsetY) + 'px', 'important');
                                }
                                
                                // Always enforce max-width of 230px (sidebar width) - remove inline width overrides
                                const currentStyle = tooltip.getAttribute('style') || '';
                                if (currentStyle.includes('width:') && !currentStyle.includes('max-width: 230px')) {
                                    let newStyle = currentStyle.replace(/width:\s*[^;]+;?/gi, '');
                                    newStyle = newStyle.replace(/max-width:\s*[^;]+;?/gi, '');
                                    newStyle = newStyle.replace(/min-width:\s*[^;]+;?/gi, '');
                                    tooltip.setAttribute('style', newStyle);
                                }
                                tooltip.style.setProperty('max-width', '230px', 'important');
                                tooltip.style.setProperty('min-width', '230px', 'important');
                                tooltip.style.setProperty('width', '230px', 'important');
                            }
                        }
                    }, 50);
                };
                
                // Check viewport on resize
                const resizeHandler = () => checkViewport();
                window.addEventListener('resize', resizeHandler);
                
                // Continuous viewport checking
                const viewportInterval = setInterval(checkViewport, 300);
                
                // Cleanup listeners when tour ends
                const cleanup = () => {
                    window.removeEventListener('resize', resizeHandler);
                    clearInterval(viewportInterval);
                };
                
                intro.oncomplete(cleanup);
                intro.onexit(cleanup);
                
                // Hide helper layer immediately - no gray borders
                const hideHelperLayer = () => {
                    const helperLayers = document.querySelectorAll('.introjs-helperLayer');
                    helperLayers.forEach(layer => {
                        layer.style.setProperty('display', 'none', 'important');
                        layer.style.setProperty('visibility', 'hidden', 'important');
                        layer.style.setProperty('opacity', '0', 'important');
                        layer.style.setProperty('pointer-events', 'none', 'important');
                        layer.style.setProperty('box-shadow', 'none', 'important');
                        layer.style.setProperty('border', 'none', 'important');
                    });
                };
                
                // Hide helper layer immediately and on every change
                hideHelperLayer();
                setInterval(hideHelperLayer, 100);
                
                // Ensure tooltip appears smoothly on start with ultra high z-index and correct width
                setTimeout(() => {
                    const tooltip = document.querySelector('.introjs-tooltip');
                    const tooltipRefLayer = document.querySelector('.introjs-tooltipReferenceLayer');
                    if (tooltipRefLayer) {
                        tooltipRefLayer.style.setProperty('z-index', '2147483647', 'important');
                        tooltipRefLayer.style.setProperty('position', 'fixed', 'important');
                    }
                    if (tooltip) {
                        // Force width to never exceed 230px (sidebar width) - remove any inline width overrides
                        const currentStyle = tooltip.getAttribute('style') || '';
                        if (currentStyle.includes('width:') && !currentStyle.includes('max-width: 230px')) {
                            let newStyle = currentStyle.replace(/width:\s*[^;]+;?/gi, '');
                            newStyle = newStyle.replace(/max-width:\s*[^;]+;?/gi, '');
                            newStyle = newStyle.replace(/min-width:\s*[^;]+;?/gi, '');
                            tooltip.setAttribute('style', newStyle);
                        }
                        tooltip.style.setProperty('max-width', '230px', 'important');
                        tooltip.style.setProperty('min-width', '230px', 'important');
                        tooltip.style.setProperty('width', '230px', 'important');
                    }
                }, 350);
                
                // Function to enforce width on a tooltip
                const enforceTooltipWidth = (tooltip) => {
                    if (!tooltip || tooltip.classList.contains('introjs-hide')) return;
                    
                    // Remove any inline width styles that might override
                    const inlineStyle = tooltip.getAttribute('style') || '';
                    let needsStyleUpdate = false;
                    let newStyle = inlineStyle;
                    
                    // Remove width properties from inline style if they're not our enforced ones
                    if (inlineStyle.includes('width:') && !inlineStyle.includes('max-width: 230px')) {
                        newStyle = newStyle.replace(/width:\s*[^;]+;?/gi, '');
                        newStyle = newStyle.replace(/max-width:\s*[^;]+;?/gi, '');
                        newStyle = newStyle.replace(/min-width:\s*[^;]+;?/gi, '');
                        needsStyleUpdate = true;
                    }
                    
                    if (needsStyleUpdate && newStyle !== inlineStyle) {
                        tooltip.setAttribute('style', newStyle);
                    }
                    
                    // Always enforce width constraints via style.setProperty (higher priority)
                    // ABSOLUTELY FORCE FIXED 230px width (sidebar width) - NEVER changes
                    tooltip.style.setProperty('max-width', '230px', 'important');
                    tooltip.style.setProperty('min-width', '230px', 'important');
                    tooltip.style.setProperty('width', '230px', 'important');
                    tooltip.style.setProperty('flex-basis', '230px', 'important');
                    tooltip.style.setProperty('flex-grow', '0', 'important');
                    tooltip.style.setProperty('flex-shrink', '0', 'important');
                    
                    // Allow height to grow as needed
                    tooltip.style.setProperty('height', 'auto', 'important');
                    tooltip.style.setProperty('max-height', 'calc(100vh - 80px)', 'important');
                    tooltip.style.setProperty('overflow-y', 'auto', 'important');
                    tooltip.style.setProperty('overflow-x', 'hidden', 'important')
                };
                
                // Continuously enforce width - check every 100ms to prevent full-width cards
                const widthEnforcer = setInterval(() => {
                    const tooltips = document.querySelectorAll('.introjs-tooltip');
                    tooltips.forEach(enforceTooltipWidth);
                }, 100);
                
                // Also use MutationObserver to catch inline style changes immediately
                const tooltipObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                            const tooltip = mutation.target;
                            if (tooltip.classList.contains('introjs-tooltip')) {
                                // Delay slightly to let IntroJS finish, then enforce
                                setTimeout(() => enforceTooltipWidth(tooltip), 10);
                            }
                        }
                        });
                    });

                // Observe all tooltips for style changes
                const observeTooltips = () => {
                    const tooltips = document.querySelectorAll('.introjs-tooltip');
                    tooltips.forEach(tooltip => {
                        tooltipObserver.observe(tooltip, {
                            attributes: true,
                            attributeFilter: ['style']
                        });
                        enforceTooltipWidth(tooltip);
                    });
                };
                
                // Start observing immediately and continue as tooltips are added
                observeTooltips();
                const observeInterval = setInterval(observeTooltips, 200);
                
                // Cleanup width enforcer and observer
                const cleanupWidthEnforcer = () => {
                    clearInterval(widthEnforcer);
                    clearInterval(observeInterval);
                    tooltipObserver.disconnect();
                };
                intro.oncomplete(cleanupWidthEnforcer);
                intro.onexit(cleanupWidthEnforcer);
                
                // Initial width enforcement after tour starts
                setTimeout(() => {
                    // Wait for IntroJS to finish positioning before animating
                    const tooltips = document.querySelectorAll('.introjs-tooltip');
                    tooltips.forEach(tooltip => {
                        if (tooltip) {
                            tooltip.style.setProperty('z-index', '2147483647', 'important');
                            tooltip.style.setProperty('will-change', 'opacity, transform', 'important');
                            
                            // Let IntroJS position it first, then animate
                            setTimeout(() => {
                                const rect = tooltip.getBoundingClientRect();
                                
                                // Start animation from side
                                tooltip.style.setProperty('opacity', '0', 'important');
                                tooltip.style.setProperty('transform', 'translateX(-20px)', 'important');
                                tooltip.style.setProperty('transition', 'opacity 0.25s ease-out, transform 0.25s ease-out', 'important');
                                
                                // Force reflow
                                void tooltip.offsetWidth;
                                
                                // Animate in smoothly
                                requestAnimationFrame(() => {
                                    requestAnimationFrame(() => {
                                        tooltip.style.setProperty('opacity', '1', 'important');
                                        tooltip.style.setProperty('transform', 'translateX(0)', 'important');
                        });
                    });

                                // Clean up after animation
                                setTimeout(() => {
                                    tooltip.style.removeProperty('will-change');
                                    tooltip.style.setProperty('transition', 'opacity 0.15s ease', 'important');
                                }, 300);
                            }, 50);
                        }
                    });
                }, 250);
                
                // Fix single-click issue - intercept clicks on document level
                const handleTourButtonClick = (e) => {
                    const target = e.target;
                    if (target && (target.classList.contains('introjs-nextbutton') || 
                                   target.classList.contains('introjs-prevbutton') || 
                                   target.classList.contains('introjs-donebutton') ||
                                   target.closest('.introjs-nextbutton') ||
                                   target.closest('.introjs-prevbutton') ||
                                   target.closest('.introjs-donebutton'))) {
                        // Smoothly hide all tooltips by sliding out
                        const tooltips = document.querySelectorAll('.introjs-tooltip');
                        tooltips.forEach(tooltip => {
                            if (tooltip) {
                                tooltip.classList.add('introjs-hide');
                                tooltip.style.transform = 'translateX(-30px)';
                                tooltip.style.opacity = '0';
                            }
                        });
                    }
                };
                
                // Attach click handler to document with capture phase
                document.addEventListener('click', handleTourButtonClick, true);
                
                // Clean up on tour exit
                const originalOnexit = intro._options.onexit;
                intro._options.onexit = () => {
                    document.removeEventListener('click', handleTourButtonClick, true);
                    if (originalOnexit) originalOnexit();
                };
                
                const originalOncomplete = intro._options.oncomplete;
                intro._options.oncomplete = () => {
                    document.removeEventListener('click', handleTourButtonClick, true);
                    if (originalOncomplete) originalOncomplete();
                };
            }, 500);
        },


        addTourIndicator: function() {
            // Add a subtle indicator that tour is available
            if ($('#tour-indicator').length === 0 && !this.isFirstVisit()) {
                // Indicator already shown or doesn't need to be shown
                return;
            }
        },

        isFirstVisit: function() {
            return !this.hasSeenTour();
        },

        restartTour: function() {
            this.resetTour();
            setTimeout(() => {
                this.startTour();
            }, 300);
        },

        // Find if element is inside a tab and return the tab button/link
        findTabForElement: function(element) {
            if (!element) return null;
            
            // Check if element is inside a tab pane
            let current = element;
            let tabPane = null;
            
            while (current && current !== document.body) {
                // Check for Bootstrap tab pane
                if (current.classList && (
                    current.classList.contains('tab-pane') || 
                    current.classList.contains('tab-content') ||
                    current.getAttribute('role') === 'tabpanel'
                )) {
                    tabPane = current;
                    break;
                }
                current = current.parentElement;
            }
            
            if (!tabPane) return null;
            
            // Find the tab ID or data target
            let tabId = tabPane.id || tabPane.getAttribute('aria-labelledby') || tabPane.getAttribute('data-tab');
            
            // If no direct ID, try to find from parent tab-content
            if (!tabId) {
                const tabContent = tabPane.closest('.tab-content');
                if (tabContent) {
                    // Try to find tab by matching pane index or other attributes
                    const panes = Array.from(tabContent.querySelectorAll('.tab-pane, [role="tabpanel"]'));
                    const index = panes.indexOf(tabPane);
                    if (index >= 0) {
                        const tabs = document.querySelectorAll('.nav-tabs a, .nav-tabs button, [role="tablist"] [role="tab"]');
                        if (tabs[index]) {
                            return tabs[index];
                        }
                    }
                }
            }
            
            if (!tabId) return null;
            
            // Find the corresponding tab button/link - try multiple selectors
            let tabButton = document.querySelector(
                `a[href="#${tabId}"], a[data-bs-target="#${tabId}"], button[data-bs-target="#${tabId}"], [data-tab="${tabId}"], [aria-controls="${tabId}"]`
            );
            
            // If not found, try partial match
            if (!tabButton) {
                tabButton = document.querySelector(
                    `a[href*="${tabId}"], a[data-bs-target*="${tabId}"], button[data-bs-target*="${tabId}"]`
                );
            }
            
            // Last resort: find by text content if tabId contains recognizable text
            if (!tabButton && tabId.toLowerCase) {
                const lowerTabId = tabId.toLowerCase();
                document.querySelectorAll('.nav-tabs a, .nav-tabs button, [role="tab"]').forEach(tab => {
                    const tabText = (tab.textContent || '').trim().toLowerCase();
                    if (tabText.includes(lowerTabId) || lowerTabId.includes(tabText)) {
                        tabButton = tab;
                    }
                });
            }
            
            return tabButton;
        },

        // Switch to a tab and execute callback when done
        switchToTab: function(tabButton, callback) {
            if (!tabButton) {
                if (callback) callback();
                return;
            }
            
            // Check if tab is already active
            const isActive = tabButton.classList.contains('active') || 
                           tabButton.getAttribute('aria-selected') === 'true' ||
                           tabButton.classList.contains('show');
            
            if (isActive) {
                if (callback) setTimeout(callback, 100);
                return;
            }
            
            // Try Bootstrap 5 tab switching
            if (typeof bootstrap !== 'undefined' && bootstrap.Tab) {
                const tab = new bootstrap.Tab(tabButton);
                tab.show();
                // Wait for tab transition
                tabButton.addEventListener('shown.bs.tab', function handler() {
                    tabButton.removeEventListener('shown.bs.tab', handler);
                    if (callback) setTimeout(callback, 200);
                }, { once: true });
            } 
            // Try Bootstrap 4 tab switching
            else if (typeof $ !== 'undefined' && $.fn.tab) {
                $(tabButton).tab('show');
                tabButton.addEventListener('shown.bs.tab', function handler() {
                    tabButton.removeEventListener('shown.bs.tab', handler);
                    if (callback) setTimeout(callback, 200);
                }, { once: true });
            } 
            // Fallback: manual tab switching
            else {
                // Remove active from all tabs
                document.querySelectorAll('.nav-tabs .nav-link, .nav-tabs button, [role="tab"]').forEach(tab => {
                    tab.classList.remove('active', 'show');
                    tab.setAttribute('aria-selected', 'false');
                });
                
                // Remove active from all tab panes
                document.querySelectorAll('.tab-pane, [role="tabpanel"]').forEach(pane => {
                    pane.classList.remove('active', 'show');
                });
                
                // Activate target tab
                tabButton.classList.add('active', 'show');
                tabButton.setAttribute('aria-selected', 'true');
                
                // Activate corresponding pane
                const targetId = tabButton.getAttribute('href')?.replace('#', '') || 
                               tabButton.getAttribute('data-bs-target')?.replace('#', '');
                if (targetId) {
                    const targetPane = document.getElementById(targetId) || 
                                     document.querySelector(`[id*="${targetId}"]`);
                    if (targetPane) {
                        targetPane.classList.add('active', 'show');
                    }
                }
                
                if (callback) setTimeout(callback, 300);
            }
        },

        // Auto-generate comprehensive tour from all form fields on the page - EVERY SINGLE ELEMENT
        generateAutoTourFromPage: function() {
            const steps = [];
            const processedElements = new Set();
            
            // Start with page overview
            const pageContent = document.querySelector('.page-content, .nk-block, .card-inner, form');
            if (pageContent) {
                const pageTitle = document.title.split('|')[0].trim() || 'This Page';
                steps.push({
                    element: pageContent,
                    intro: `<h3>${pageTitle}</h3><p>This page contains various settings and configuration options. We'll guide you through EVERY element from top to bottom, one by one. Click "Next" to continue through all available options.</p>`,
                    position: 'bottom'
                });
            }
            
            // Find the main form or content area
            const form = document.querySelector('form') || document.querySelector('.page-content, .nk-block, .card-inner');
            if (!form) return steps;
            
            // Get ALL elements in order - be extremely thorough
            const allElements = [];
            
            // 1. Get all headings first (they structure the page)
            const headings = form.querySelectorAll('h1, h2, h3, h4, h5, h6, .page-title, .section-title, [class*="title"]');
            headings.forEach(h => {
                if (h.offsetParent !== null && !processedElements.has(h)) {
                    allElements.push({ element: h, type: 'heading', order: h.getBoundingClientRect().top });
                }
            });
            
            // 2. Get all tabs if they exist
            const tabs = form.querySelectorAll('.nav-tabs a, .nav-tabs button, [role="tab"], .tab-link, .form-nav a');
            tabs.forEach(tab => {
                if (tab.offsetParent !== null && !processedElements.has(tab)) {
                    allElements.push({ element: tab, type: 'tab', order: tab.getBoundingClientRect().top });
                }
            });
            
            // 3. Get ALL form groups and controls - be extremely detailed
            const formGroups = form.querySelectorAll(
                '.form-group, .control-group, .form-field, .field-group, ' +
                '[class*="form-field"], [class*="form-group"], [class*="control-group"], ' +
                '.form-row, .form-control-wrapper, .input-group, .form-section'
            );
            
            formGroups.forEach(group => {
                if (group.offsetParent === null) return;
                
                const top = group.getBoundingClientRect().top;
                
                // Get the label
                const label = group.querySelector('label, .control-label, .field-label, [class*="label"]:not([class*="switch"])');
                if (label && label.offsetParent !== null && !processedElements.has(label)) {
                    allElements.push({ element: label, type: 'label', order: label.getBoundingClientRect().top, group: group });
                }
                
                // Get the input/field itself
                const input = group.querySelector('input:not([type="hidden"]), select, textarea, .form-control, [class*="input"]');
                if (input && input.offsetParent !== null && !processedElements.has(input)) {
                    allElements.push({ element: input, type: 'input', order: input.getBoundingClientRect().top, group: group });
                }
                
                // Get switch/toggle if it exists separately
                const switchEl = group.querySelector('.switch, .toggle, input[type="checkbox"], input[type="radio"]');
                if (switchEl && switchEl.offsetParent !== null && !processedElements.has(switchEl) && switchEl !== input) {
                    allElements.push({ element: switchEl, type: 'switch', order: switchEl.getBoundingClientRect().top, group: group });
                }
                
                // Get help text/description
                const helpText = group.querySelector('.help-block, .help-text, .form-text, .field-comment, .comment, [class*="help"], [class*="comment"]');
                if (helpText && helpText.offsetParent !== null && !processedElements.has(helpText)) {
                    allElements.push({ element: helpText, type: 'help', order: helpText.getBoundingClientRect().top, group: group });
                }
                
                // Get any buttons inside the group
                const buttons = group.querySelectorAll('button:not([type="submit"]), .btn:not([type="submit"]), a.btn');
                buttons.forEach(btn => {
                    if (btn.offsetParent !== null && !processedElements.has(btn)) {
                        allElements.push({ element: btn, type: 'button', order: btn.getBoundingClientRect().top, group: group });
                    }
                });
            });
            
            // 4. Get standalone inputs/fields that might not be in form groups
            const standaloneInputs = form.querySelectorAll(
                'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), ' +
                'select, textarea, .form-control'
            );
            standaloneInputs.forEach(input => {
                if (input.offsetParent !== null && !processedElements.has(input)) {
                    // Check if it's already been added as part of a form group
                    const parentGroup = input.closest('.form-group, .control-group');
                    if (!parentGroup) {
                        allElements.push({ element: input, type: 'input', order: input.getBoundingClientRect().top });
                    }
                }
            });
            
            // 5. Get all buttons (including in toolbars)
            const allButtons = form.querySelectorAll(
                'button, .btn, a[class*="btn"], input[type="button"], input[type="submit"]'
            );
            allButtons.forEach(btn => {
                if (btn.offsetParent !== null && !processedElements.has(btn)) {
                    // Skip if already added
                    let alreadyAdded = false;
                    for (let item of allElements) {
                        if (item.element === btn) {
                            alreadyAdded = true;
                            break;
                        }
                    }
                    if (!alreadyAdded) {
                        allElements.push({ element: btn, type: 'button', order: btn.getBoundingClientRect().top });
                    }
                }
            });
            
            // 6. Get sections/divs with important content
            const sections = form.querySelectorAll(
                '.section, .card-section, .form-section, .field-section, [class*="section"]'
            );
            sections.forEach(section => {
                if (section.offsetParent !== null && !processedElements.has(section)) {
                    const hasContent = section.querySelector('input, select, textarea, button, label');
                    if (hasContent) {
                        allElements.push({ element: section, type: 'section', order: section.getBoundingClientRect().top });
                    }
                }
            });
            
            // Sort all elements by their position (top to bottom)
            allElements.sort((a, b) => a.order - b.order);
            
            // Create steps for each element
            allElements.forEach((item, index) => {
                const el = item.element;
                if (processedElements.has(el)) return;
                processedElements.add(el);
                
                let title = '';
                let description = '';
                
                // Get title/name based on element type
                if (item.type === 'heading') {
                    title = el.textContent.trim() || 'Section Heading';
                    description = `This is a section heading that organizes the page content. The section below this heading contains related settings and options.`;
                } else if (item.type === 'tab') {
                    title = el.textContent.trim() || 'Tab';
                    description = `Click this tab to access the "${el.textContent.trim()}" section. Each tab contains different configuration options for this page.`;
                } else if (item.type === 'label') {
                    title = el.textContent.trim() || 'Field Label';
                    description = `This is the label for a form field. It tells you what information should be entered in the field below.`;
                } else if (item.type === 'input') {
                    const label = item.group ? item.group.querySelector('label, .control-label') : null;
                    title = label ? label.textContent.trim() : el.getAttribute('placeholder') || el.getAttribute('name') || `Input Field ${index + 1}`;
                    
                    const fieldType = el.tagName.toLowerCase();
                    const inputType = el.type || '';
                    
                    if (inputType === 'checkbox' || fieldType === 'input' && el.type === 'checkbox') {
                        description = `This checkbox lets you select or deselect an option. Click the checkbox to toggle it on or off.`;
                    } else if (inputType === 'radio') {
                        description = `This radio button lets you select one option from a group. Only one radio button in the group can be selected at a time.`;
                    } else if (inputType === 'number') {
                        description = `This number field lets you enter numeric values. Type numbers here. You can use decimals if needed (e.g., 10.5).`;
                    } else if (inputType === 'email') {
                        description = `This email field lets you enter an email address. Make sure to enter a valid email format (e.g., example@email.com).`;
                    } else if (inputType === 'password') {
                        description = `This password field lets you enter a password. The characters will be hidden for security.`;
                    } else if (inputType === 'date' || inputType === 'datetime-local') {
                        description = `This date field lets you select a date. Click to open a date picker calendar and choose a date.`;
                    } else if (fieldType === 'textarea') {
                        description = `This text area lets you enter longer text content, multiple lines of text. Type your information here. You can press Enter to create new lines.`;
                    } else if (fieldType === 'select') {
                        description = `This dropdown menu lets you select from a list of available options. Click the dropdown to see all available choices, then click on one to select it.`;
                    } else {
                        description = `This text input field lets you enter information. Type your text here.`;
                    }
                } else if (item.type === 'switch') {
                    const label = item.group ? item.group.querySelector('label, .control-label') : null;
                    title = label ? label.textContent.trim() : 'Toggle Switch';
                    description = `This toggle switch lets you enable or disable this setting. Click the switch to toggle between "Yes" (enabled) and "No" (disabled). When enabled, the switch will be green or highlighted.`;
                } else if (item.type === 'help') {
                    title = 'Help Text';
                    description = `This is help text that provides additional information about the setting above. It explains what the field does and how to use it.`;
                } else if (item.type === 'button') {
                    title = el.textContent.trim() || el.getAttribute('title') || el.getAttribute('aria-label') || 'Button';
                    if (el.type === 'submit' || el.classList.contains('btn-primary')) {
                        description = `This is the Save button. Click this button to save all your changes on this page. Your changes will not be saved until you click this button.`;
                    } else if (el.classList.contains('btn-back') || el.textContent.toLowerCase().includes('back')) {
                        description = `This is the Back button. Click this button to go back to the previous page or settings overview without saving changes.`;
                    } else {
                        description = `This button performs an action. Click it to execute the button's function.`;
                    }
                } else if (item.type === 'section') {
                    title = el.querySelector('h1, h2, h3, h4, .section-title')?.textContent.trim() || 'Section';
                    description = `This is a section that groups related settings together. It contains multiple form fields and options related to this topic.`;
                }
                
                // Get help text from the group if available
                const helpText = item.group ? item.group.querySelector('.help-block, .help-text, .form-text, .comment, [class*="help"]') : null;
                if (helpText && helpText.textContent.trim() && item.type !== 'help') {
                    description += ` Additional information: ${helpText.textContent.trim()}`;
                }
                
                // Create step
                steps.push({
                    element: el,
                    intro: `<h3>${title}</h3><p>${description}</p>`,
                    position: 'bottom'
                });
            });
            
            return steps;
        }
    };

    // Initialize function - with guard to prevent multiple calls
    let tourInitialized = false;
    function initializeTour() {
        // Prevent multiple initializations
        if (tourInitialized) {
            return;
        }
        
        try {
            EnhancedAdminTour.init();
            tourInitialized = true;
        } catch (e) {
            // Silent fail
        }
    }

    // Initialize once - use the earliest reliable event
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initializeTour, 1000);
        });
    } else {
        // DOM already loaded
        setTimeout(initializeTour, 1000);
    }

    // Expose globally for manual triggering
    window.PayMyDineTour = EnhancedAdminTour;


})(typeof jQuery !== 'undefined' ? jQuery : function(fn) {
    // Fallback if jQuery not available
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        fn();
    }
});
