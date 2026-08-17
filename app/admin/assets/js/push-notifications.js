/* PMD_PUSH_NOTIFICATION_CURSOR_V1 */
(function () {
  'use strict';

  if (/^\/admin\/kds_stations(?:\/|$)/.test(window.location.pathname)) return;
  if (window.PushNotificationManagerInitialized === true || window.PushNotificationManagerInitialized === 'claiming') return;
  window.PushNotificationManagerInitialized = 'claiming';

  class PushNotificationManager {
    constructor() {
      this.container = null;
      this.bellIcon = null;
      this.pollInterval = null;
      this.cursorStorageKey = 'pmd.push.highestSeenId.v1';
      this.cursorStorage = this.getCursorStorage();
      const cursor = this.readCursor();
      this.highestSeenId = cursor.value;
      this.baselineReady = cursor.exists;
      this.shownNotificationIds = new Set();
      this.createContainer();
      this.bellIcon = document.querySelector('#bell-icon, .fa-bell');
      this.startListening();
    }

    getCursorStorage() {
      try {
        const storage = window.sessionStorage;
        const probe = '__pmd_push_cursor_probe__';
        storage.setItem(probe, '1');
        storage.removeItem(probe);
        return storage;
      } catch (_) {
        return null;
      }
    }

    readCursor() {
      if (!this.cursorStorage) return {exists: false, value: 0};
      try {
        const raw = this.cursorStorage.getItem(this.cursorStorageKey);
        if (raw === null) return {exists: false, value: 0};
        const value = Number.parseInt(raw, 10);
        return {exists: true, value: Number.isFinite(value) && value > 0 ? value : 0};
      } catch (_) {
        return {exists: false, value: 0};
      }
    }

    persistCursor(id) {
      const value = Math.max(0, Number(id) || 0);
      this.highestSeenId = value;
      this.baselineReady = true;
      try {
        if (this.cursorStorage) this.cursorStorage.setItem(this.cursorStorageKey, String(value));
      } catch (_) {}
    }

    createContainer() {
      this.container = document.querySelector('.notification-toast-container');
      if (this.container) return;
      this.container = document.createElement('div');
      this.container.className = 'notification-toast-container';
      (document.body || document.documentElement).appendChild(this.container);
    }

    show(notification) {
      if (!this.container) this.createContainer();
      const toast = this.createToast(notification);
      this.container.appendChild(toast);
      if (notification._flash !== true) this.shakeBell();
      const timer = setTimeout(() => this.flyToBell(toast), 5000);
      toast.addEventListener('click', (event) => {
        if (event.target.closest('.notification-toast-close')) return;
        clearTimeout(timer);
        this.flyToBell(toast);
      });
      const close = toast.querySelector('.notification-toast-close');
      if (close) close.addEventListener('click', (event) => {
        event.stopPropagation();
        clearTimeout(timer);
        this.flyToBell(toast);
      });
    }

    showFlash(message, level) {
      const statusMap = {success: 'completed', danger: 'cancelled', warning: 'preparation', info: 'ready'};
      this.show({
        message: message,
        type: level || 'success',
        time: new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'}),
        statusName: statusMap[level] || 'completed',
        _flash: true
      });
    }

    createToast(notification) {
      const toast = document.createElement('div');
      toast.className = 'notification-toast toast-' + (notification.type || 'order');
      if (notification.statusName) toast.setAttribute('data-status', String(notification.statusName).toLowerCase());

      let messageHtml = notification.message || '';
      if (notification.statusName && notification.statusColor) {
        messageHtml = messageHtml.replace(
          notification.statusName,
          '<span style="color:' + notification.statusColor + ';font-weight:600;">' + notification.statusName + '</span>'
        );
      }

      const time = notification.time || new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
      const title = notification.title ? ' • ' + notification.title : '';
      toast.innerHTML = '<div class="notification-toast-header">' +
        '<div class="notification-toast-meta-line">' + time + title + '</div>' +
        '<button class="notification-toast-close" aria-label="Close"><i class="fa fa-times"></i></button>' +
        '</div><div class="notification-toast-body">' + messageHtml + '</div>' +
        '<div class="notification-toast-progress"></div>';
      return toast;
    }

    flyToBell(toast) {
      if (!toast || !toast.isConnected) return;
      toast.classList.add('flying-to-bell');
      const bellParent = this.bellIcon && this.bellIcon.closest('.nav-link, a');
      if (bellParent) {
        bellParent.classList.add('bell-glow');
        setTimeout(() => bellParent.classList.remove('bell-glow'), 1000);
      }
      setTimeout(() => toast.remove(), 800);
    }

    shakeBell() {
      const bellParent = this.bellIcon && this.bellIcon.closest('.nav-link, a');
      if (!bellParent) return;
      bellParent.classList.add('bell-shake');
      setTimeout(() => bellParent.classList.remove('bell-shake'), 800);
    }

    startListening() {
      if (this.pollInterval) return;
      this.pollInterval = setInterval(() => this.checkForNewNotifications(), 15000);
      setTimeout(() => this.checkForNewNotifications(), 1000);

      this._beforeUnloadHandler = () => this.stopListening();
      window.addEventListener('beforeunload', this._beforeUnloadHandler);

      this._visibilityHandler = () => {
        if (document.hidden) {
          if (this.pollInterval) clearInterval(this.pollInterval);
          this.pollInterval = null;
          return;
        }
        if (!this.pollInterval) {
          this.pollInterval = setInterval(() => this.checkForNewNotifications(), 15000);
          this.checkForNewNotifications();
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);
    }

    stopListening() {
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.pollInterval = null;
      if (this._visibilityHandler) document.removeEventListener('visibilitychange', this._visibilityHandler);
      if (this._beforeUnloadHandler) window.removeEventListener('beforeunload', this._beforeUnloadHandler);
      this._visibilityHandler = null;
      this._beforeUnloadHandler = null;
    }

    async checkForNewNotifications() {
      try {
        const response = await fetch('/admin/notifications-api?limit=1&_=' + Date.now(), {
          cache: 'no-cache',
          headers: {'Cache-Control': 'no-cache', 'Pragma': 'no-cache'}
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!data.ok || !Array.isArray(data.items)) return;

        if (data.items.length === 0) {
          if (!this.baselineReady) this.persistCursor(0);
          return;
        }

        const notif = data.items[0];
        const notifId = Number(notif.id) || 0;
        if (notifId < 1) return;

        // Fresh page/tab: establish current state silently. Never replay history.
        if (!this.baselineReady) {
          this.persistCursor(notifId);
          return;
        }

        if (notifId <= this.highestSeenId || this.shownNotificationIds.has(notifId)) return;

        // Persist BEFORE rendering. A refresh/navigation during the toast cannot replay it.
        this.persistCursor(notifId);
        this.shownNotificationIds.add(notifId);

        const payload = this.payloadOf(notif);
        const presentation = this.presentationFor(notif, payload);
        this.show(presentation);

        // Preserve the existing shared-floor event contract without a second poller.
        try {
          window.dispatchEvent(new CustomEvent('pmd:notification:new', {
            detail: {notification: notif, payload: payload, statusName: presentation.statusName || null}
          }));
        } catch (_) {}
      } catch (_) {}
    }

    payloadOf(notif) {
      try {
        if (!notif.payload) return {};
        return typeof notif.payload === 'string' ? JSON.parse(notif.payload) : notif.payload;
      } catch (_) {
        return {};
      }
    }

    presentationFor(notif, payload) {
      let tableName = 'TABLE';
      if (notif.table_name && String(notif.table_name).trim()) tableName = String(notif.table_name).trim();
      else if (notif.table_id) tableName = 'TABLE ' + notif.table_id;

      let title = '';
      let message = '';
      let statusName = null;
      let statusColor = null;

      if (notif.type === 'order_status') {
        const orderId = payload.order_id || notif.order_id;
        statusName = payload.status_name || payload.status || notif.order_status;
        const colors = {
          Received: '#08815e', Preparation: '#f39c12', Ready: '#3498db',
          Delivered: '#27ae60', Completed: '#27ae60', Canceled: '#e74c3c', Cancelled: '#e74c3c'
        };
        statusColor = colors[statusName] || '#08815e';
        title = orderId ? 'Order #' + orderId : tableName;
        message = tableName + (statusName ? ' • ' + statusName : '');
      } else if (notif.type === 'waiter_call') {
        message = tableName + ' • Waiter Call';
      } else if (notif.type === 'valet_request') {
        title = tableName;
        message = 'Valet Request' + (payload.name ? ' • ' + payload.name : '');
      } else if (notif.type === 'table_note') {
        message = tableName + ' • Note';
      } else if (notif.type === 'staff_note') {
        const orderId = payload.order_id || notif.order_id;
        title = orderId ? 'Order #' + orderId : '';
        message = tableName + ' • Staff Note';
      } else if (notif.type === 'general_staff_note') {
        const staffName = payload.staff_name || 'Staff';
        const note = payload.note || 'Note';
        title = 'Note';
        message = staffName + ' • ' + (note.length > 50 ? note.substring(0, 50) + '...' : note);
      } else if (notif.type === 'table_move') {
        message = payload.source_table_name && payload.dest_table_name
          ? payload.source_table_name + ' move to ' + payload.dest_table_name
          : (notif.title || 'Table Move');
      } else if (notif.type === 'stock_out') {
        message = notif.title || 'Item stock status changed';
      } else {
        title = tableName;
        message = notif.message || notif.type || 'New notification';
      }

      const text = (title + ' ' + message + ' ' + (notif.type || '')).toLowerCase();
      let type = 'order';
      if (text.includes('waiter') || text.includes('call')) type = 'waiter';
      else if (text.includes('reservation') || text.includes('reserved')) type = 'reservation';
      else if (text.includes('alert') || text.includes('urgent') || text.includes('canceled')) type = 'alert';

      return {
        title: title,
        message: message || 'New notification',
        type: type,
        time: this.formatTime(notif.created_at),
        statusName: statusName,
        statusColor: statusColor
      };
    }

    formatTime(timestamp) {
      const date = timestamp ? new Date(timestamp) : new Date();
      return date.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
    }
  }

  function initialize() {
    const path = location.pathname || '';
    if (/\/admin\/(login|logout)(?:$|[/?#])/i.test(path) || path === '/admin/login') {
      window.PushNotificationManagerInitialized = false;
      return;
    }
    const manager = new PushNotificationManager();
    window.pushNotif = manager;
    window.PushNotificationManagerInitialized = true;
    window.PMDPushNotificationCursorV1 = {
      version: '1.0.0',
      storage: manager.cursorStorage ? 'sessionStorage' : 'memory-fallback',
      highestSeenId: () => manager.highestSeenId,
      baselineReady: () => manager.baselineReady
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, {once: true});
  } else {
    initialize();
  }
})();
