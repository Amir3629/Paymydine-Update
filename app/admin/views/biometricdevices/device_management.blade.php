<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <!-- Header -->
            <div class="card mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="mb-0">
                        <i class="fa fa-wifi"></i> Device Management
                    </h3>
                    <div>
                        <button class="btn btn-primary" onclick="autoDetectDevices()">
                            <i class="fa fa-search"></i> Auto-Detect Devices
                        </button>
                        <button class="btn btn-success" onclick="syncAllDevices()">
                            <i class="fa fa-refresh"></i> Sync All
                        </button>
                        <a href="{{ admin_url('biometric_devices/create') }}" class="btn btn-info">
                            <i class="fa fa-plus"></i> Add Manual Device
                        </a>
                    </div>
                </div>
            </div>

            <!-- Detection Progress -->
            <div id="detection-progress" class="alert alert-info" style="display: none;">
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm mr-2" role="status"></div>
                    <span id="detection-message">Scanning for devices...</span>
                </div>
                <div class="progress mt-2" style="height: 20px;">
                    <div id="detection-progress-bar" class="progress-bar progress-bar-striped progress-bar-animated" 
                         role="progressbar" style="width: 0%">0%</div>
                </div>
            </div>

            <!-- Connection Statistics -->
            <div class="row mb-3">
                <div class="col-md-3">
                    <div class="card bg-success text-white">
                        <div class="card-body">
                            <h5>Online Devices</h5>
                            <h2 id="online-count">0</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-danger text-white">
                        <div class="card-body">
                            <h5>Offline Devices</h5>
                            <h2 id="offline-count">0</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-warning text-white">
                        <div class="card-body">
                            <h5>Sync Pending</h5>
                            <h2 id="pending-count">0</h2>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-info text-white">
                        <div class="card-body">
                            <h5>Enrolled Staff</h5>
                            <h2 id="enrolled-count">0</h2>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Device List -->
            <div class="card">
                <div class="card-header">
                    <h4 class="mb-0">Connected Devices</h4>
                </div>
                <div class="card-body">
                    <table class="table table-hover" id="devices-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Device Name</th>
                                <th>Type</th>
                                <th>Connection</th>
                                <th>Location</th>
                                <th>Last Sync</th>
                                <th>Enrolled Staff</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="devices-list">
                            <tr>
                                <td colspan="8" class="text-center">
                                    <i class="fa fa-spinner fa-spin"></i> Loading devices...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Troubleshooting Panel -->
            <div class="card mt-3">
                <div class="card-header">
                    <h4 class="mb-0">
                        <i class="fa fa-wrench"></i> Troubleshooting
                    </h4>
                </div>
                <div class="card-body">
                    <div class="accordion" id="troubleshootingAccordion">
                        <!-- Device Not Detected -->
                        <div class="card">
                            <div class="card-header" id="headingOne">
                                <h5 class="mb-0">
                                    <button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapseOne">
                                        Device Not Detected
                                    </button>
                                </h5>
                            </div>
                            <div id="collapseOne" class="collapse" data-parent="#troubleshootingAccordion">
                                <div class="card-body">
                                    <h6>Troubleshooting Steps:</h6>
                                    <ol>
                                        <li><strong>USB Devices:</strong>
                                            <ul>
                                                <li>Check USB cable connection</li>
                                                <li>Try a different USB port</li>
                                                <li>Verify device power LED is on</li>
                                                <li>Linux: Run <code>ls -la /dev/ttyUSB* /dev/hidraw*</code></li>
                                                <li>Windows: Check Device Manager</li>
                                            </ul>
                                        </li>
                                        <li><strong>WiFi/Ethernet Devices:</strong>
                                            <ul>
                                                <li>Verify device is on same network</li>
                                                <li>Check IP address configuration</li>
                                                <li>Ping device: <code>ping device-ip</code></li>
                                                <li>Verify firewall allows port (usually 4370)</li>
                                                <li>Check WiFi signal strength</li>
                                            </ul>
                                        </li>
                                        <li><strong>Manual Detection:</strong>
                                            <button class="btn btn-sm btn-primary" onclick="autoDetectDevices()">
                                                <i class="fa fa-refresh"></i> Retry Detection
                                            </button>
                                        </li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        <!-- Device Offline -->
                        <div class="card">
                            <div class="card-header" id="headingTwo">
                                <h5 class="mb-0">
                                    <button class="btn btn-link collapsed" type="button" data-toggle="collapse" data-target="#collapseTwo">
                                        Device Showing Offline
                                    </button>
                                </h5>
                            </div>
                            <div id="collapseTwo" class="collapse" data-parent="#troubleshootingAccordion">
                                <div class="card-body">
                                    <h6>Solutions:</h6>
                                    <ol>
                                        <li>Check device power supply</li>
                                        <li>Verify network cable (for Ethernet)</li>
                                        <li>Check WiFi connection (for WiFi devices)</li>
                                        <li>Restart device</li>
                                        <li>Test connection in device list</li>
                                    </ol>
                                    <button class="btn btn-sm btn-warning" onclick="testAllDevices()">
                                        <i class="fa fa-stethoscope"></i> Test All Connections
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Enrollment Failed -->
                        <div class="card">
                            <div class="card-header" id="headingThree">
                                <h5 class="mb-0">
                                    <button class="btn btn-link collapsed" type="button" data-toggle="collapse" data-target="#collapseThree">
                                        Enrollment Failed
                                    </button>
                                </h5>
                            </div>
                            <div id="collapseThree" class="collapse" data-parent="#troubleshootingAccordion">
                                <div class="card-body">
                                    <h6>Common Issues:</h6>
                                    <ol>
                                        <li><strong>Fingerprint Quality:</strong> Ensure finger is clean and dry</li>
                                        <li><strong>Device Capacity:</strong> Check if device is at max users</li>
                                        <li><strong>Connection:</strong> Verify device is online</li>
                                        <li><strong>RFID Card:</strong> Ensure card is compatible (EM4100, Mifare)</li>
                                    </ol>
                                    <p class="text-muted">Retry enrollment from Staff → Edit → Enroll to Devices</p>
                                </div>
                            </div>
                        </div>

                        <!-- Sync Not Working -->
                        <div class="card">
                            <div class="card-header" id="headingFour">
                                <h5 class="mb-0">
                                    <button class="btn btn-link collapsed" type="button" data-toggle="collapse" data-target="#collapseFour">
                                        Sync Not Working
                                    </button>
                                </h5>
                            </div>
                            <div id="collapseFour" class="collapse" data-parent="#troubleshootingAccordion">
                                <div class="card-body">
                                    <h6>Checks:</h6>
                                    <ol>
                                        <li>Verify cron jobs are running</li>
                                        <li>Check device is online</li>
                                        <li>Review sync logs for errors</li>
                                        <li>Try manual sync</li>
                                    </ol>
                                    <button class="btn btn-sm btn-success" onclick="forceSyncAll()">
                                        <i class="fa fa-refresh"></i> Force Sync All
                                    </button>
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
// Auto-refresh every 30 seconds
let refreshInterval;

// Load devices on page load
document.addEventListener('DOMContentLoaded', function() {
    loadDevices();
    loadStatistics();
    
    // Refresh every 30 seconds
    refreshInterval = setInterval(() => {
        loadDevices();
        loadStatistics();
    }, 30000);
});

// Auto-detect devices
function autoDetectDevices() {
    const progress = document.getElementById('detection-progress');
    const progressBar = document.getElementById('detection-progress-bar');
    const message = document.getElementById('detection-message');
    
    progress.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    message.textContent = 'Scanning USB ports...';
    
    // Simulate progress
    let percent = 0;
    const progressTimer = setInterval(() => {
        percent += 10;
        progressBar.style.width = percent + '%';
        progressBar.textContent = percent + '%';
        
        if (percent === 30) message.textContent = 'Scanning network (WiFi/Ethernet)...';
        if (percent === 60) message.textContent = 'Identifying devices...';
        if (percent === 90) message.textContent = 'Registering devices...';
        
        if (percent >= 100) {
            clearInterval(progressTimer);
        }
    }, 500);
    
    // Actual detection
    fetch('/admin/api/biometric/devices/detect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        clearInterval(progressTimer);
        progressBar.style.width = '100%';
        progressBar.textContent = '100%';
        
        if (data.success) {
            message.textContent = `Detection complete! Found ${data.data.found} devices, registered ${data.data.registered}`;
            progress.classList.remove('alert-info');
            progress.classList.add('alert-success');
            
            setTimeout(() => {
                progress.style.display = 'none';
                loadDevices();
                loadStatistics();
            }, 3000);
        } else {
            message.textContent = 'Detection failed: ' + data.message;
            progress.classList.remove('alert-info');
            progress.classList.add('alert-danger');
        }
    })
    .catch(error => {
        clearInterval(progressTimer);
        message.textContent = 'Detection error: ' + error.message;
        progress.classList.remove('alert-info');
        progress.classList.add('alert-danger');
    });
}

// Load devices list
function loadDevices() {
    fetch('/admin/api/biometric/devices')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success !== false) {
                displayDevices(data.devices || data.data || []);
            } else {
                console.error('API Error:', data.message || 'Unknown error');
                displayDevices([]);
            }
        })
        .catch(error => {
            console.error('Error loading devices:', error);
            // Show user-friendly message
            const tbody = document.getElementById('devices-list');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Unable to load devices. Please refresh the page.</td></tr>';
            }
        });
}

// Load statistics
function loadStatistics() {
    fetch('/admin/api/biometric/dashboard')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                document.getElementById('online-count').textContent = data.data.devices.online || 0;
                document.getElementById('offline-count').textContent = data.data.devices.offline || 0;
                document.getElementById('enrolled-count').textContent = data.data.staff.enrolled || 0;
                document.getElementById('pending-count').textContent = data.data.notifications.unread || 0;
            } else {
                // Use default values if API fails
                document.getElementById('online-count').textContent = '0';
                document.getElementById('offline-count').textContent = '0';
                document.getElementById('enrolled-count').textContent = '0';
                document.getElementById('pending-count').textContent = '0';
            }
        })
        .catch(error => {
            console.error('Error loading statistics:', error);
            // Use default values on error
            const onlineEl = document.getElementById('online-count');
            const offlineEl = document.getElementById('offline-count');
            const enrolledEl = document.getElementById('enrolled-count');
            const pendingEl = document.getElementById('pending-count');
            if (onlineEl) onlineEl.textContent = '0';
            if (offlineEl) offlineEl.textContent = '0';
            if (enrolledEl) enrolledEl.textContent = '0';
            if (pendingEl) pendingEl.textContent = '0';
        });
}

// Display devices in table
function displayDevices(devices) {
    const tbody = document.getElementById('devices-list');
    
    if (devices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No devices found. Click "Auto-Detect Devices" to scan.</td></tr>';
        return;
    }
    
    let html = '';
    devices.forEach(device => {
        const statusIcon = device.connection_status === 'online' ? 
            '<span class="badge badge-success"><i class="fa fa-check-circle"></i> Online</span>' :
            '<span class="badge badge-danger"><i class="fa fa-times-circle"></i> Offline</span>';
        
        const lastSync = device.last_sync_at ? 
            formatTime(device.last_sync_at) : 
            '<span class="text-muted">Never</span>';
        
        html += `
            <tr>
                <td>${statusIcon}</td>
                <td><strong>${device.name}</strong><br><small class="text-muted">${device.ip}:${device.port}</small></td>
                <td><span class="badge badge-info">${device.device_type}</span></td>
                <td><span class="badge badge-secondary">${device.connection_type}</span></td>
                <td>${device.location_name || '-'}</td>
                <td>${lastSync}</td>
                <td><span class="badge badge-primary">${device.enrolled_staff || 0}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-primary" onclick="testDevice(${device.device_id})" title="Test Connection">
                            <i class="fa fa-stethoscope"></i>
                        </button>
                        <button class="btn btn-success" onclick="syncDevice(${device.device_id})" title="Sync Now">
                            <i class="fa fa-refresh"></i>
                        </button>
                        <a href="/admin/biometric_devices/edit/${device.device_id}" class="btn btn-info" title="Edit">
                            <i class="fa fa-edit"></i>
                        </a>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Test device connection
function testDevice(deviceId) {
    fetch(`/admin/api/biometric/devices/${deviceId}/test`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('✓ Connection successful!\n\n' + JSON.stringify(data.data, null, 2));
        } else {
            alert('✗ Connection failed:\n' + data.message);
        }
        loadDevices();
    });
}

// Sync device
function syncDevice(deviceId) {
    fetch(`/admin/api/biometric/devices/${deviceId}/sync/attendance`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        }
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        loadDevices();
    });
}

// Sync all devices
function syncAllDevices() {
    if (!confirm('Sync attendance from all devices?')) return;
    
    // Call sync for each device or use batch endpoint
    alert('Syncing all devices...');
    // Implementation would call API for all devices
}

// Force sync all
function forceSyncAll() {
    syncAllDevices();
}

// Test all devices
function testAllDevices() {
    if (!confirm('Test connection to all devices?')) return;
    alert('Testing all device connections...');
    // Implementation would test each device
}

// Format timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hrs ago';
    return date.toLocaleDateString();
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
</script>

<style>
.badge {
    font-size: 0.9em;
    padding: 0.4em 0.6em;
}

.btn-group-sm .btn {
    padding: 0.25rem 0.5rem;
}

.card-body h2 {
    margin: 0;
    font-size: 2.5rem;
    font-weight: bold;
}

.accordion .card {
    margin-bottom: 5px;
}

.accordion .btn-link {
    color: #333;
    text-decoration: none;
    font-weight: 500;
}

.accordion .btn-link:hover {
    color: #007bff;
}
</style>

