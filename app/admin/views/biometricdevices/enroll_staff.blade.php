<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <!-- Header -->
            <div class="card mb-3">
                <div class="card-header">
                    <h3 class="mb-0">
                        <i class="fa fa-fingerprint"></i> Enroll Staff to Biometric Devices
                    </h3>
                </div>
            </div>

            <!-- Add New Employee + Assign Card Section -->
            <div class="card mb-3 border-primary">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">
                        <i class="fa fa-user-plus"></i> Add New Employee & Assign Card
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Employee Name *</label>
                                <input type="text" id="new-staff-name" class="form-control" placeholder="Enter employee name">
                            </div>
                            <div class="form-group">
                                <label>Employee Email</label>
                                <input type="email" id="new-staff-email" class="form-control" placeholder="email@example.com">
                            </div>
                            <div class="form-group">
                                <label>Employee Role</label>
                                <select id="new-staff-role" class="form-control">
                                    <option value="">Select Role</option>
                                    @php
                                        $roles = \Admin\Models\Staff_roles_model::all();
                                    @endphp
                                    @foreach($roles as $role)
                                        <option value="{{ $role->staff_role_id }}">{{ $role->name }}</option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>RFID Card Assignment</label>
                                <div class="input-group">
                                    <input type="text" id="new-card-uid" class="form-control" placeholder="Card UID will appear here..." readonly>
                                    <div class="input-group-append">
                                        <button type="button" class="btn btn-primary" id="scan-card-btn" onclick="startCardScan()">
                                            <i class="fa fa-credit-card"></i> Scan Card
                                        </button>
                                    </div>
                                </div>
                                <small class="form-text text-muted">
                                    <span id="scan-status">Click "Scan Card" and hold card near RFID reader</span>
                                </small>
                            </div>
                            <div id="card-scan-progress" style="display: none;" class="alert alert-info">
                                <i class="fa fa-spinner fa-spin"></i> Waiting for card scan... Hold card near reader.
                            </div>
                            <div class="form-group">
                                <label>Card Label (Optional)</label>
                                <input type="text" id="new-card-label" class="form-control" placeholder="e.g., 'John's Card', 'Main Entrance Card'">
                            </div>
                            <button type="button" class="btn btn-success btn-block" onclick="saveNewEmployeeWithCard()">
                                <i class="fa fa-save"></i> Save Employee + Assign Card
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Card Assignments Display -->
            <div class="card mb-3">
                <div class="card-header">
                    <h5 class="mb-0">
                        <i class="fa fa-credit-card"></i> Card Assignments
                        <button class="btn btn-sm btn-primary float-right" onclick="refreshCardAssignments()">
                            <i class="fa fa-refresh"></i> Refresh
                        </button>
                    </h5>
                </div>
                <div class="card-body">
                    <div id="card-assignments-list">
                        <div class="text-center text-muted p-3">
                            <i class="fa fa-spinner fa-spin"></i> Loading card assignments...
                        </div>
                    </div>
                </div>
            </div>

            <!-- Unassigned Cards -->
            <div class="card mb-3 border-warning">
                <div class="card-header bg-warning">
                    <h5 class="mb-0">
                        <i class="fa fa-exclamation-triangle"></i> Unassigned Cards
                        <span id="unassigned-count" class="badge badge-light">0</span>
                    </h5>
                </div>
                <div class="card-body">
                    <div id="unassigned-cards-list">
                        <div class="text-center text-muted p-3">No unassigned cards</div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- Staff Selection -->
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0">Select Staff Member</h5>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label>Search Staff</label>
                                <input type="text" id="staff-search" class="form-control" placeholder="Type to search...">
                            </div>
                            <div id="staff-list" class="list-group" style="max-height: 500px; overflow-y: auto;">
                                <div class="text-center text-muted p-3">
                                    <i class="fa fa-spinner fa-spin"></i> Loading staff...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Device Selection & Enrollment -->
                <div class="col-md-8">
                    <!-- Staff Info -->
                    <div id="staff-info" class="card mb-3" style="display: none;">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <img id="staff-avatar" src="" class="rounded-circle mr-3" width="60" height="60">
                                <div>
                                    <h4 id="staff-name" class="mb-0"></h4>
                                    <p id="staff-role" class="text-muted mb-0"></p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Device List -->
                    <div id="device-enrollment-panel" class="card" style="display: none;">
                        <div class="card-header bg-success text-white">
                            <h5 class="mb-0">Enroll to Devices</h5>
                        </div>
                        <div class="card-body">
                            <div id="devices-list">
                                <div class="text-center text-muted p-3">
                                    <p>Select a staff member to begin enrollment</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Enrollment Process -->
                    <div id="enrollment-process" class="card mt-3" style="display: none;">
                        <div class="card-header bg-info text-white">
                            <h5 class="mb-0">Enrollment in Progress</h5>
                        </div>
                        <div class="card-body text-center">
                            <div id="enrollment-device-name" class="mb-3">
                                <h4></h4>
                            </div>
                            
                            <div id="enrollment-instructions" class="alert alert-info">
                                <h5>Instructions:</h5>
                                <div id="instruction-text"></div>
                            </div>

                            <div id="enrollment-progress" class="mb-3">
                                <div class="spinner-border text-primary" role="status" style="width: 4rem; height: 4rem;">
                                    <span class="sr-only">Enrolling...</span>
                                </div>
                                <p class="mt-3" id="enrollment-status">Waiting for biometric data...</p>
                            </div>

                            <div id="enrollment-result" style="display: none;">
                                <div class="alert" id="result-alert"></div>
                                <button class="btn btn-success" onclick="closeEnrollment()">
                                    <i class="fa fa-check"></i> Done
                                </button>
                                <button class="btn btn-warning" onclick="retryEnrollment()">
                                    <i class="fa fa-refresh"></i> Retry
                                </button>
                            </div>

                            <button class="btn btn-danger" onclick="cancelEnrollment()">
                                <i class="fa fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>

                    <!-- Enrollment History -->
                    <div id="enrollment-history" class="card mt-3" style="display: none;">
                        <div class="card-header">
                            <h5 class="mb-0">Current Enrollments</h5>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Device</th>
                                        <th>Type</th>
                                        <th>Enrolled At</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="history-list">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
let selectedStaff = null;
let enrollmentData = null;
let enrollmentTimer = null;

// Load staff list on page load
document.addEventListener('DOMContentLoaded', function() {
    loadStaffList();
    loadCardAssignments();
    loadUnassignedCards();
    
    // Setup search
    document.getElementById('staff-search').addEventListener('input', function() {
        filterStaffList(this.value);
    });
    
    // Poll for card scans every 2 seconds
    setInterval(pollForCardScan, 2000);
});

// Load all staff
function loadStaffList() {
    fetch('/admin/api/biometric/staff')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayStaffList(data.data);
            }
        })
        .catch(error => console.error('Error loading staff:', error));
}

// Display staff list
function displayStaffList(staff) {
    const listDiv = document.getElementById('staff-list');
    
    if (staff.length === 0) {
        listDiv.innerHTML = '<div class="text-center text-muted p-3">No staff found</div>';
        return;
    }
    
    let html = '';
    staff.forEach(member => {
        const biometricBadge = member.biometric_enabled ? 
            '<span class="badge badge-success">Biometric Enabled</span>' :
            '<span class="badge badge-secondary">Not Enabled</span>';
        
        const enrolledCount = member.enrolled_devices || 0;
        const enrolledBadge = enrolledCount > 0 ?
            `<span class="badge badge-info">${enrolledCount} devices</span>` : '';
        
        html += `
            <a href="#" class="list-group-item list-group-item-action staff-item" data-staff-id="${member.staff_id}">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${member.staff_name}</h6>
                    ${biometricBadge}
                </div>
                <p class="mb-1 text-muted small">${member.staff_role || 'Staff'}</p>
                ${enrolledBadge}
            </a>
        `;
    });
    
    listDiv.innerHTML = html;
    
    // Add click handlers
    document.querySelectorAll('.staff-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            selectStaff(this.dataset.staffId);
        });
    });
}

// Filter staff list
function filterStaffList(query) {
    const items = document.querySelectorAll('.staff-item');
    const search = query.toLowerCase();
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(search) ? 'block' : 'none';
    });
}

// Select a staff member
function selectStaff(staffId) {
    // Highlight selected
    document.querySelectorAll('.staff-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.staff-item').classList.add('active');
    
    // Load staff details
    fetch(`/admin/api/biometric/staff/${staffId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                selectedStaff = data.data;
                displayStaffInfo(data.data);
                loadDevicesForEnrollment(staffId);
                loadEnrollmentHistory(staffId);
            }
        });
}

// Display staff info
function displayStaffInfo(staff) {
    document.getElementById('staff-info').style.display = 'block';
    document.getElementById('staff-avatar').src = staff.staff_avatar || '/assets/images/default-avatar.png';
    document.getElementById('staff-name').textContent = staff.staff_name;
    document.getElementById('staff-role').textContent = staff.staff_role || 'Staff';
}

// Load devices for enrollment
function loadDevicesForEnrollment(staffId) {
    fetch('/admin/api/biometric/devices')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayDevicesForEnrollment(data.data.devices, staffId);
            }
        });
}

// Display devices for enrollment
function displayDevicesForEnrollment(devices, staffId) {
    const panel = document.getElementById('device-enrollment-panel');
    const listDiv = document.getElementById('devices-list');
    
    panel.style.display = 'block';
    
    if (devices.length === 0) {
        listDiv.innerHTML = '<div class="alert alert-warning">No devices found. Please connect devices first.</div>';
        return;
    }
    
    // Filter online devices
    const onlineDevices = devices.filter(d => d.connection_status === 'online');
    
    if (onlineDevices.length === 0) {
        listDiv.innerHTML = '<div class="alert alert-warning">No online devices available for enrollment.</div>';
        return;
    }
    
    let html = '<div class="list-group">';
    onlineDevices.forEach(device => {
        const isEnrolled = device.is_staff_enrolled; // This should come from API
        const capabilities = device.capabilities || [];
        
        html += `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${device.name}</h6>
                        <small class="text-muted">${device.device_type} - ${device.connection_type}</small><br>
                        <small class="text-muted">Capabilities: ${capabilities.join(', ')}</small>
                    </div>
                    <div>
                        ${isEnrolled ? 
                            '<span class="badge badge-success mr-2">Enrolled</span>' : 
                            '<span class="badge badge-secondary mr-2">Not Enrolled</span>'
                        }
                        ${isEnrolled ?
                            `<button class="btn btn-sm btn-danger" onclick="unenrollFromDevice(${device.device_id}, ${staffId})">
                                <i class="fa fa-trash"></i> Remove
                            </button>` :
                            `<button class="btn btn-sm btn-primary" onclick="startEnrollment(${device.device_id}, '${device.name}', '${device.device_type}')">
                                <i class="fa fa-fingerprint"></i> Enroll
                            </button>`
                        }
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    listDiv.innerHTML = html;
}

// Start enrollment process
function startEnrollment(deviceId, deviceName, deviceType) {
    if (!selectedStaff) {
        alert('Please select a staff member first');
        return;
    }
    
    enrollmentData = {
        deviceId: deviceId,
        deviceName: deviceName,
        deviceType: deviceType,
        staffId: selectedStaff.staff_id
    };
    
    // Show enrollment panel
    document.getElementById('enrollment-process').style.display = 'block';
    document.getElementById('enrollment-device-name').querySelector('h4').textContent = 
        `Enrolling to ${deviceName}`;
    
    // Set instructions based on device type
    let instructions = '';
    if (deviceType.includes('fingerprint')) {
        instructions = `
            <ol class="text-left">
                <li>Clean your finger and ensure it's dry</li>
                <li>Place your finger on the scanner when prompted</li>
                <li>Lift and place your finger 3-4 times for best results</li>
                <li>Keep finger flat and centered on the scanner</li>
            </ol>
        `;
    } else if (deviceType.includes('rfid')) {
        instructions = `
            <ol class="text-left">
                <li>Have your RFID card ready</li>
                <li>Hold the card near the reader (within 2-3 cm)</li>
                <li>Keep card steady until you hear a beep</li>
                <li>Do not remove card until confirmation</li>
            </ol>
        `;
    } else if (deviceType.includes('face')) {
        instructions = `
            <ol class="text-left">
                <li>Stand in front of the camera</li>
                <li>Remove glasses if possible</li>
                <li>Look directly at the camera</li>
                <li>Keep face in the frame for 5 seconds</li>
            </ol>
        `;
    }
    
    document.getElementById('instruction-text').innerHTML = instructions;
    document.getElementById('enrollment-result').style.display = 'none';
    document.getElementById('enrollment-progress').style.display = 'block';
    
    // Start enrollment API call
    performEnrollment();
}

// Perform enrollment via API
function performEnrollment() {
    const statusDiv = document.getElementById('enrollment-status');
    
    fetch(`/admin/api/biometric/devices/${enrollmentData.deviceId}/enroll`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({
            staff_id: enrollmentData.staffId,
            enrollment_data: {} // Additional data if needed
        })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('enrollment-progress').style.display = 'none';
        document.getElementById('enrollment-result').style.display = 'block';
        
        const alertDiv = document.getElementById('result-alert');
        
        if (data.success) {
            alertDiv.className = 'alert alert-success';
            alertDiv.innerHTML = `
                <h5><i class="fa fa-check-circle"></i> Enrollment Successful!</h5>
                <p>${data.message || 'Biometric data enrolled successfully'}</p>
            `;
            
            // Reload enrollment list
            setTimeout(() => {
                loadDevicesForEnrollment(selectedStaff.staff_id);
                loadEnrollmentHistory(selectedStaff.staff_id);
            }, 2000);
        } else {
            alertDiv.className = 'alert alert-danger';
            alertDiv.innerHTML = `
                <h5><i class="fa fa-times-circle"></i> Enrollment Failed</h5>
                <p>${data.message || 'Failed to enroll biometric data'}</p>
                <hr>
                <h6>Troubleshooting:</h6>
                <ul class="text-left mb-0">
                    <li>Ensure device is online and connected</li>
                    <li>Check finger/card quality</li>
                    <li>Verify device has available capacity</li>
                    <li>Try again with a different finger/card</li>
                </ul>
            `;
        }
    })
    .catch(error => {
        document.getElementById('enrollment-progress').style.display = 'none';
        document.getElementById('enrollment-result').style.display = 'block';
        
        const alertDiv = document.getElementById('result-alert');
        alertDiv.className = 'alert alert-danger';
        alertDiv.innerHTML = `
            <h5><i class="fa fa-exclamation-triangle"></i> Connection Error</h5>
            <p>${error.message}</p>
            <p>Please check your connection and try again.</p>
        `;
    });
}

// Retry enrollment
function retryEnrollment() {
    document.getElementById('enrollment-result').style.display = 'none';
    document.getElementById('enrollment-progress').style.display = 'block';
    performEnrollment();
}

// Cancel enrollment
function cancelEnrollment() {
    document.getElementById('enrollment-process').style.display = 'none';
    enrollmentData = null;
}

// Close enrollment
function closeEnrollment() {
    document.getElementById('enrollment-process').style.display = 'none';
    enrollmentData = null;
}

// Unenroll from device
function unenrollFromDevice(deviceId, staffId) {
    if (!confirm('Are you sure you want to remove this enrollment?')) {
        return;
    }
    
    fetch(`/admin/api/biometric/devices/${deviceId}/unenroll/${staffId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        }
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            loadDevicesForEnrollment(staffId);
            loadEnrollmentHistory(staffId);
        }
    });
}

// Load enrollment history
function loadEnrollmentHistory(staffId) {
    fetch(`/admin/api/biometric/staff/${staffId}/enrollments`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data.length > 0) {
                document.getElementById('enrollment-history').style.display = 'block';
                displayEnrollmentHistory(data.data);
            }
        });
}

// Display enrollment history
function displayEnrollmentHistory(enrollments) {
    const tbody = document.getElementById('history-list');
    
    let html = '';
    enrollments.forEach(enrollment => {
        html += `
            <tr>
                <td>${enrollment.device_name}</td>
                <td><span class="badge badge-info">${enrollment.device_type}</span></td>
                <td>${new Date(enrollment.enrolled_at).toLocaleString()}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="unenrollFromDevice(${enrollment.device_id}, ${selectedStaff.staff_id})">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}
// ============================================
// NEW EMPLOYEE + CARD ASSIGNMENT FUNCTIONS
// ============================================

let cardScanActive = false;
let cardScanInterval = null;

// Start card scanning
function startCardScan() {
    cardScanActive = true;
    document.getElementById('scan-card-btn').disabled = true;
    document.getElementById('scan-card-btn').innerHTML = '<i class="fa fa-spinner fa-spin"></i> Scanning...';
    document.getElementById('card-scan-progress').style.display = 'block';
    document.getElementById('scan-status').textContent = 'Hold card near RFID reader...';
    
    // Poll for card scan
    cardScanInterval = setInterval(pollForCardScan, 1000);
    
    // Auto-stop after 30 seconds
    setTimeout(() => {
        if (cardScanActive) {
            stopCardScan();
            alert('Card scan timeout. Please try again.');
        }
    }, 30000);
}

// Poll for card scan from RFID device
function pollForCardScan() {
    if (!cardScanActive) return;
    
    // Check if any RFID device is connected and listening
    fetch('/admin/api/biometric/devices')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const rfidDevices = data.devices.filter(d => 
                    d.device_type && d.device_type.toLowerCase().includes('rfid') &&
                    d.connection_status === 'online'
                );
                
                if (rfidDevices.length > 0) {
                    // Try to get latest card scan from device
                    checkForNewCardScan(rfidDevices[0].device_id);
                }
            }
        })
        .catch(error => console.error('Error checking devices:', error));
}

// Check for new card scan
function checkForNewCardScan(deviceId) {
    fetch(`/admin/api/biometric/devices/${deviceId}/read-card`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.card_uid) {
            // Card detected!
            document.getElementById('new-card-uid').value = data.card_uid;
            stopCardScan();
            document.getElementById('scan-status').innerHTML = 
                '<span class="text-success"><i class="fa fa-check"></i> Card detected: ' + data.card_uid + '</span>';
        }
    })
    .catch(error => {
        // Device might not support real-time reading, that's OK
        // We'll handle it differently
    });
}

// Stop card scanning
function stopCardScan() {
    cardScanActive = false;
    if (cardScanInterval) {
        clearInterval(cardScanInterval);
        cardScanInterval = null;
    }
    document.getElementById('scan-card-btn').disabled = false;
    document.getElementById('scan-card-btn').innerHTML = '<i class="fa fa-credit-card"></i> Scan Card';
    document.getElementById('card-scan-progress').style.display = 'none';
}

// Save new employee with card assignment
function saveNewEmployeeWithCard() {
    const name = document.getElementById('new-staff-name').value.trim();
    const email = document.getElementById('new-staff-email').value.trim();
    const roleId = document.getElementById('new-staff-role').value;
    const cardUid = document.getElementById('new-card-uid').value.trim();
    const cardLabel = document.getElementById('new-card-label').value.trim();
    
    if (!name) {
        alert('Please enter employee name');
        return;
    }
    
    if (!cardUid) {
        alert('Please scan a card first');
        return;
    }
    
    // Show loading
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;
    
    // Save employee and assign card
    fetch('/admin/api/biometric/staff/create-with-card', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
        },
        body: JSON.stringify({
            name: name,
            email: email,
            role_id: roleId,
            card_uid: cardUid,
            card_label: cardLabel
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Employee created and card assigned successfully!');
            // Reset form
            document.getElementById('new-staff-name').value = '';
            document.getElementById('new-staff-email').value = '';
            document.getElementById('new-staff-role').value = '';
            document.getElementById('new-card-uid').value = '';
            document.getElementById('new-card-label').value = '';
            document.getElementById('scan-status').textContent = 'Click "Scan Card" and hold card near RFID reader';
            
            // Refresh lists
            loadStaffList();
            loadCardAssignments();
            loadUnassignedCards();
        } else {
            alert('Error: ' + (data.message || 'Failed to create employee'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to create employee: ' + error.message);
    })
    .finally(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

// Load card assignments
function loadCardAssignments() {
    fetch('/admin/api/biometric/cards/assignments')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayCardAssignments(data.data);
            }
        })
        .catch(error => {
            console.error('Error loading card assignments:', error);
            document.getElementById('card-assignments-list').innerHTML = 
                '<div class="alert alert-danger">Failed to load card assignments</div>';
        });
}

// Display card assignments
function displayCardAssignments(assignments) {
    const listDiv = document.getElementById('card-assignments-list');
    
    if (assignments.length === 0) {
        listDiv.innerHTML = '<div class="text-center text-muted p-3">No card assignments yet</div>';
        return;
    }
    
    let html = '<table class="table table-sm table-hover">';
    html += '<thead><tr><th>Card UID</th><th>Employee</th><th>Card Label</th><th>Device</th><th>Enrolled</th><th>Actions</th></tr></thead><tbody>';
    
    assignments.forEach(assignment => {
        html += `
            <tr>
                <td><code>${assignment.card_uid}</code></td>
                <td><strong>${assignment.staff_name}</strong></td>
                <td>${assignment.card_label || '-'}</td>
                <td>${assignment.device_name || 'All Devices'}</td>
                <td>${assignment.enrolled_at || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="removeCardAssignment(${assignment.mapping_id})">
                        <i class="fa fa-trash"></i> Remove
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    listDiv.innerHTML = html;
}

// Load unassigned cards
function loadUnassignedCards() {
    fetch('/admin/api/biometric/cards/unassigned')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayUnassignedCards(data.data);
                document.getElementById('unassigned-count').textContent = data.data.length;
            }
        })
        .catch(error => {
            console.error('Error loading unassigned cards:', error);
        });
}

// Display unassigned cards
function displayUnassignedCards(cards) {
    const listDiv = document.getElementById('unassigned-cards-list');
    
    if (cards.length === 0) {
        listDiv.innerHTML = '<div class="text-center text-muted p-3">No unassigned cards</div>';
        return;
    }
    
    let html = '<div class="list-group">';
    cards.forEach(card => {
        html += `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>Card UID:</strong> <code>${card.card_uid}</code><br>
                        <small class="text-muted">
                            First seen: ${card.first_seen_at || 'N/A'} | 
                            Scanned ${card.times_scanned || 0} time(s)
                        </small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-primary" onclick="assignCardToEmployee('${card.card_uid}')">
                            <i class="fa fa-user-plus"></i> Assign to Employee
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    listDiv.innerHTML = html;
}

// Assign card to employee
function assignCardToEmployee(cardUid) {
    // Show modal to select employee
    const staffId = prompt('Enter Staff ID or select from list:\n\n' + 
        'Note: You can also go to "Select Staff Member" section and enroll the card there.');
    
    if (!staffId) return;
    
    // Find staff by ID or name
    fetch(`/admin/api/biometric/staff`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const staff = data.data.find(s => 
                    s.staff_id == staffId || 
                    s.staff_name.toLowerCase().includes(staffId.toLowerCase())
                );
                
                if (staff) {
                    // Assign card
                    assignCardToStaff(cardUid, staff.staff_id);
                } else {
                    alert('Staff not found. Please use the "Add New Employee" section instead.');
                }
            }
        });
}

// Assign card to staff
function assignCardToStaff(cardUid, staffId) {
    fetch('/admin/api/biometric/cards/assign', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
        },
        body: JSON.stringify({
            card_uid: cardUid,
            staff_id: staffId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Card assigned successfully!');
            loadCardAssignments();
            loadUnassignedCards();
        } else {
            alert('Error: ' + (data.message || 'Failed to assign card'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to assign card: ' + error.message);
    });
}

// Remove card assignment
function removeCardAssignment(mappingId) {
    if (!confirm('Are you sure you want to remove this card assignment?')) return;
    
    fetch(`/admin/api/biometric/cards/unassign/${mappingId}`, {
        method: 'DELETE',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Card assignment removed');
            loadCardAssignments();
            loadUnassignedCards();
        } else {
            alert('Error: ' + (data.message || 'Failed to remove assignment'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to remove assignment: ' + error.message);
    });
}

// Refresh card assignments
function refreshCardAssignments() {
    loadCardAssignments();
    loadUnassignedCards();
}

</script>

<style>
.list-group-item.active {
    background-color: #007bff;
    border-color: #007bff;
    color: white;
}

.staff-item:hover {
    background-color: #f8f9fa;
}

#enrollment-progress {
    padding: 2rem;
}

#enrollment-result {
    padding: 1rem;
}

.badge {
    font-size: 0.85em;
}
</style>

