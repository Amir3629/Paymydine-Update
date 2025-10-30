/**
 * Push Notification Toast System
 * Shows beautiful toast notifications that fly into the bell icon
 */

class PushNotificationManager {
    constructor() {
        this.container = null;
        this.bellIcon = null;
        this.highestSeenId = 0; // Track the HIGHEST notification ID we've ever seen
        this.shownNotificationIds = new Set(); // Track ALL notification IDs we've shown
        this.init();
    }

    init() {
        // Create toast container
        this.createContainer();
        
        // Find bell icon
        this.bellIcon = document.querySelector('#bell-icon, .fa-bell');
        
        // Listen for new notifications
        this.startListening();
    }

    createContainer() {
        if (!document.querySelector('.notification-toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'notification-toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.notification-toast-container');
        }
    }

    /**
     * Show a push notification toast
     * @param {Object} notification - Notification data
     * @param {string} notification.title - Main title (e.g., "TABLE 5")
     * @param {string} notification.message - Message text (e.g., "Order #446 • Preparation")
     * @param {string} notification.type - Type: 'order', 'waiter', 'reservation', 'alert'
     * @param {string} notification.icon - Font Awesome icon class (e.g., 'fa-utensils')
     * @param {string} notification.time - Timestamp (e.g., "02:33 PM")
     */
    show(notification) {
        const toast = this.createToast(notification);
        this.container.appendChild(toast);

        // Shake bell icon
        this.shakeBell();

        // Auto-dismiss after 5 seconds
        const dismissTimer = setTimeout(() => {
            this.flyToBell(toast);
        }, 5000);

        // Click to dismiss early
        toast.addEventListener('click', (e) => {
            if (!e.target.classList.contains('notification-toast-close')) {
                clearTimeout(dismissTimer);
                this.flyToBell(toast);
            }
        });

        // Close button
        const closeBtn = toast.querySelector('.notification-toast-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearTimeout(dismissTimer);
            this.flyToBell(toast);
        });

        // Play sound (optional)
        this.playNotificationSound();
    }

    createToast(notification) {
        const toast = document.createElement('div');
        toast.className = `notification-toast toast-${notification.type || 'order'}`;
        
        // Add status as data attribute for progress bar color
        if (notification.statusName) {
            toast.setAttribute('data-status', notification.statusName.toLowerCase());
        }
        
        // Format message with colored status if available
        let messageHtml = notification.message || '';
        if (notification.statusName && notification.statusColor) {
            // Replace the status text with colored version
            messageHtml = messageHtml.replace(
                notification.statusName, 
                `<span style="color: ${notification.statusColor}; font-weight: 600;">${notification.statusName}</span>`
            );
        }

        toast.innerHTML = `
            <div class="notification-toast-header">
                <div class="notification-toast-meta-line">
                    ${notification.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}${notification.title ? ' • ' + notification.title : ''}
                </div>
                <button class="notification-toast-close" aria-label="Close">
                    <i class="fa fa-times"></i>
                </button>
            </div>
            <div class="notification-toast-body">
                ${messageHtml}
            </div>
            <div class="notification-toast-progress"></div>
        `;

        return toast;
    }

    flyToBell(toast) {
        // Add flying animation class
        toast.classList.add('flying-to-bell');

        // Add glow effect to bell
        if (this.bellIcon) {
            const bellParent = this.bellIcon.closest('.nav-link, a');
            if (bellParent) {
                bellParent.classList.add('bell-glow');
                setTimeout(() => {
                    bellParent.classList.remove('bell-glow');
                }, 1000);
            }
        }

        // Remove toast after animation completes
        setTimeout(() => {
            toast.remove();
            // DO NOT update notification count - the backend handles it!
        }, 800);
    }

    shakeBell() {
        if (this.bellIcon) {
            const bellParent = this.bellIcon.closest('.nav-link, a');
            if (bellParent) {
                bellParent.classList.add('bell-shake');
                setTimeout(() => {
                    bellParent.classList.remove('bell-shake');
                }, 800);
            }
        }
    }
    
    // REMOVED updateNotificationCount() - backend handles the bell count!

    playNotificationSound() {
        // Optional: Play a subtle notification sound
        // You can add an audio file and play it here
        // const audio = new Audio('/path/to/notification.mp3');
        // audio.volume = 0.3;
        // audio.play().catch(() => {});
    }

    startListening() {
        // Poll for new notifications from the API every 2 seconds (faster response)
        this.pollInterval = setInterval(() => {
            this.checkForNewNotifications();
        }, 2000); // Check every 2 seconds for faster notification delivery
        
        // Check immediately on page load (but wait for initial setup)
        setTimeout(() => {
            this.checkForNewNotifications();
        }, 1000);
        
        console.log('✅ Push notification system active - polling API every 2 seconds');
        console.log('📌 Shows push for BRAND NEW notifications as they arrive!');
    }

    async checkForNewNotifications() {
        try {
            // Fetch the very latest notification from the API (regardless of status)
            // This ensures we catch it as soon as it arrives, before status changes
            // Add timestamp to prevent browser caching
            const timestamp = new Date().getTime();
            const response = await fetch(`/admin/notifications-api?limit=1&_=${timestamp}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            if (!response.ok) {
                console.debug('Notification API not available');
                return;
            }
            
            const data = await response.json();
            
            // Check if API returned successfully
            if (!data.ok || !Array.isArray(data.items) || data.items.length === 0) {
                return;
            }
            
            // Get ONLY the first (newest) notification
            const notif = data.items[0];
            const notifId = notif.id;
            
            console.log(`[${new Date().toLocaleTimeString()}] API check: ID=${notifId}, HighestSeen=${this.highestSeenId}`);
            
            // Update highest seen ID (always track the highest ID we've encountered)
            if (notifId > this.highestSeenId) {
                this.highestSeenId = notifId;
                
                // Only show push if we haven't already shown this specific notification
                if (!this.shownNotificationIds.has(notifId)) {
                    console.log('🎉 NEW NOTIFICATION!', notifId, '(highest was', (notifId - 1) + ')');
                    this.shownNotificationIds.add(notifId);
                    
                    // Continue to show the notification...
                } else {
                    console.log('⚠️ Already shown notification', notifId);
                    return;
                }
            } else {
                // This is an old notification (ID is lower than highest we've seen)
                console.log('⏪ Old notification', notifId, '(highest seen:', this.highestSeenId + ')');
                return;
            }
            
            // Extract EXACT data from notification
            // Parse the payload JSON to get order details
            let payload = {};
            try {
                if (notif.payload) {
                    payload = typeof notif.payload === 'string' ? JSON.parse(notif.payload) : notif.payload;
                }
            } catch (e) {
                console.error('Failed to parse notification payload:', e);
            }
            
            // Build table name
            let tableName = 'TABLE';
            if (notif.table_name && notif.table_name.trim()) {
                tableName = notif.table_name.trim();
            } else if (notif.table_id) {
                tableName = 'TABLE ' + notif.table_id;
            }
            
            // Build title and message based on notification type
            let title = '';
            let message = '';
            
            let statusName = null;
            let statusColor = null;
            
            if (notif.type === 'order_status') {
                // For order status: Title = "Order #X", Message = "TABLE Y • Status"
                const orderId = payload.order_id || notif.order_id;
                statusName = payload.status_name || payload.status || notif.order_status;
                
                // Status color mapping
                const statusColors = {
                    'Received': '#08815e',
                    'Preparation': '#f39c12',
                    'Ready': '#3498db',
                    'Delivered': '#27ae60',
                    'Completed': '#27ae60',
                    'Canceled': '#e74c3c',
                    'Cancelled': '#e74c3c'
                };
                statusColor = statusColors[statusName] || '#08815e';
                
                title = orderId ? `Order #${orderId}` : tableName;
                message = tableName;
                if (statusName) {
                    message += ' • ' + statusName;
                }
            } else if (notif.type === 'waiter_call') {
                // For waiter call: just show "Waiter Call" without custom message in push notification
                title = '';  // No title, just time
                message = tableName + ' • Waiter Call';
            } else if (notif.type === 'valet_request') {
                // For valet: Title = "TABLE X", Message = "Valet Request • Details"
                title = tableName;
                message = 'Valet Request';
                if (payload.name) message += ' • ' + payload.name;
            } else if (notif.type === 'table_note') {
                // For table note: just show "Note" without content in push notification
                title = '';  // No title, just time
                message = tableName + ' • Note';
            } else {
                // For other notification types
                title = tableName;
                message = notif.message || notif.type || 'New notification';
            }
            
            // Determine notification type for icon/color
            let type = 'order';
            const text = (title + ' ' + message + ' ' + notif.type).toLowerCase();
            
            if (text.includes('waiter') || text.includes('call')) {
                type = 'waiter';
            } else if (text.includes('reservation') || text.includes('reserved')) {
                type = 'reservation';
            } else if (text.includes('alert') || text.includes('urgent') || text.includes('canceled')) {
                type = 'alert';
            }
            
            // Show the push notification
            this.show({
                title: title,
                message: message || 'New notification',
                type: type,
                time: this.formatTime(notif.created_at),
                statusName: statusName,
                statusColor: statusColor
            });
            
            console.log('📬 NEW notification (ID:', notifId + '):', title, '|', message);
            
        } catch (error) {
            // Silent fail - don't spam console with errors
            console.debug('Could not fetch notifications:', error.message);
        }
    }
    
    formatTime(timestamp) {
        if (!timestamp) {
            return new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
        
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}

// Initialize the push notification manager
let pushNotificationManager;

document.addEventListener('DOMContentLoaded', () => {
    pushNotificationManager = new PushNotificationManager();
    
    // Make it globally accessible for manual testing and integration
    window.pushNotif = pushNotificationManager;
});

// Example usage (you can call this from your backend):
// window.pushNotif.show({
//     title: 'TABLE 5',
//     message: 'Order #446 • Preparation',
//     type: 'order',
//     time: '02:33 PM'
// });

// window.pushNotif.show({
//     title: 'TABLE 1',
//     message: 'Waiter Call',
//     type: 'waiter',
//     time: '01:15 PM'
// });

