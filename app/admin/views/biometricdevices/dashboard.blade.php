@extends('admin::layouts.default')

@section('content')
<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">
                        <i class="fa fa-fingerprint"></i> Biometric Devices Dashboard
                    </h3>
                    <div class="card-tools">
                        <button type="button" class="btn btn-sm btn-primary" onclick="refreshDashboard()">
                            <i class="fa fa-refresh"></i> Refresh
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <!-- Statistics Cards -->
                    <div class="row">
                        <!-- Devices Card -->
                        <div class="col-lg-3 col-6">
                            <div class="small-box bg-info">
                                <div class="inner">
                                    <h3 id="total-devices">-</h3>
                                    <p>Total Devices</p>
                                </div>
                                <div class="icon">
                                    <i class="fa fa-wifi"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Online Devices Card -->
                        <div class="col-lg-3 col-6">
                            <div class="small-box bg-success">
                                <div class="inner">
                                    <h3 id="online-devices">-</h3>
                                    <p>Online Devices</p>
                                </div>
                                <div class="icon">
                                    <i class="fa fa-check-circle"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Enrolled Staff Card -->
                        <div class="col-lg-3 col-6">
                            <div class="small-box bg-warning">
                                <div class="inner">
                                    <h3 id="enrolled-staff">-</h3>
                                    <p>Enrolled Staff</p>
                                </div>
                                <div class="icon">
                                    <i class="fa fa-users"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Today's Check-ins Card -->
                        <div class="col-lg-3 col-6">
                            <div class="small-box bg-danger">
                                <div class="inner">
                                    <h3 id="today-checkins">-</h3>
                                    <p>Today's Check-ins</p>
                                </div>
                                <div class="icon">
                                    <i class="fa fa-calendar-check-o"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Devices Status Table -->
                    <div class="row mt-4">
                        <div class="col-md-8">
                            <div class="card">
                                <div class="card-header">
                                    <h4 class="card-title">Device Status</h4>
                                </div>
                                <div class="card-body">
                                    <table class="table table-striped" id="devices-table">
                                        <thead>
                                            <tr>
                                                <th>Device Name</th>
                                                <th>Status</th>
                                                <th>Last Sync</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td colspan="4" class="text-center">
                                                    <i class="fa fa-spinner fa-spin"></i> Loading...
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <!-- Notifications Panel -->
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-header">
                                    <h4 class="card-title">
                                        Recent Notifications
                                        <span class="badge badge-danger" id="notification-count">0</span>
                                    </h4>
                                </div>
                                <div class="card-body" style="max-height: 400px; overflow-y: auto;">
                                    <div id="notifications-list">
                                        <p class="text-center text-muted">No notifications</p>
                                    </div>
                                </div>
                                <div class="card-footer">
                                    <button class="btn btn-sm btn-block btn-secondary" onclick="markAllNotificationsRead()">
                                        Mark All as Read
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Live Attendance Feed -->
                    <div class="row mt-4">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-header">
                                    <h4 class="card-title">
                                        <i class="fa fa-clock-o"></i> Live Attendance Feed
                                        <span class="badge badge-success">LIVE</span>
                                    </h4>
                                </div>
                                <div class="card-body">
                                    <div id="live-attendance-feed" style="max-height: 300px; overflow-y: auto;">
                                        <p class="text-center text-muted">No recent attendance</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
let refreshInterval;

// Load dashboard data
function loadDashboard() {
    fetch('/admin/api/biometric/dashboard')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateDashboardStats(data.data);
            }
        })
        .catch(error => console.error('Error loading dashboard:', error));

    loadDevices();
    loadNotifications();
}

// Update dashboard statistics
function updateDashboardStats(stats) {
    document.getElementById('total-devices').textContent = stats.devices.total;
    document.getElementById('online-devices').textContent = stats.devices.online;
    document.getElementById('enrolled-staff').textContent = stats.staff.enrolled + '/' + stats.staff.total;
    document.getElementById('today-checkins').textContent = stats.attendance.today_checkins;
}

// Load devices list
function loadDevices() {
    // This would typically fetch from an API endpoint
    // For now, we'll use a placeholder
    const tbody = document.querySelector('#devices-table tbody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fa fa-spinner fa-spin"></i> Loading...</td></tr>';
}

// Load notifications
function loadNotifications() {
    fetch('/admin/api/biometric/notifications?limit=10')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayNotifications(data.data);
                document.getElementById('notification-count').textContent = data.count;
            }
        })
        .catch(error => console.error('Error loading notifications:', error));
}

// Display notifications
function displayNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    
    if (notifications.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No notifications</p>';
        return;
    }

    let html = '';
    notifications.forEach(notif => {
        const severityClass = getSeverityClass(notif.severity);
        const icon = getSeverityIcon(notif.severity);
        
        html += `
            <div class="alert alert-${severityClass} alert-dismissible fade show" role="alert">
                <i class="fa ${icon}"></i>
                <strong>${notif.title}</strong>
                <p class="mb-0">${notif.message}</p>
                <small class="text-muted">${formatTime(notif.created_at)}</small>
                <button type="button" class="close" onclick="markNotificationRead(${notif.notification_id})">
                    <span>&times;</span>
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Mark notification as read
function markNotificationRead(id) {
    fetch(`/admin/api/biometric/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        }
    })
    .then(() => loadNotifications())
    .catch(error => console.error('Error marking notification:', error));
}

// Mark all notifications as read
function markAllNotificationsRead() {
    fetch('/admin/api/biometric/notifications/read-all', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        }
    })
    .then(() => {
        loadNotifications();
        alert('All notifications marked as read');
    })
    .catch(error => console.error('Error marking notifications:', error));
}

// Refresh dashboard
function refreshDashboard() {
    loadDashboard();
}

// Helper functions
function getSeverityClass(severity) {
    const classes = {
        'critical': 'danger',
        'error': 'danger',
        'warning': 'warning',
        'info': 'info'
    };
    return classes[severity] || 'secondary';
}

function getSeverityIcon(severity) {
    const icons = {
        'critical': 'fa-exclamation-triangle',
        'error': 'fa-times-circle',
        'warning': 'fa-exclamation-circle',
        'info': 'fa-info-circle'
    };
    return icons[severity] || 'fa-bell';
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' minutes ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
    return date.toLocaleDateString();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
    
    // Refresh every 30 seconds
    refreshInterval = setInterval(loadDashboard, 30000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
</script>

<style>
.small-box {
    border-radius: 0.25rem;
    box-shadow: 0 0 1px rgba(0,0,0,.125), 0 1px 3px rgba(0,0,0,.2);
    display: block;
    margin-bottom: 20px;
    position: relative;
}

.small-box>.inner {
    padding: 10px;
}

.small-box .icon {
    color: rgba(0,0,0,.15);
    z-index: 0;
}

.small-box .icon>i {
    font-size: 90px;
    position: absolute;
    right: 15px;
    top: 15px;
}

.small-box h3 {
    font-size: 2.2rem;
    font-weight: 700;
    margin: 0 0 10px 0;
    padding: 0;
    white-space: nowrap;
}
</style>
@stop

