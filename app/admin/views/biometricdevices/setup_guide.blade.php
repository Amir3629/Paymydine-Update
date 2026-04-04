<!-- Setup Guide Modal -->
<div class="modal fade" id="setupGuideModal" tabindex="-1" role="dialog" aria-labelledby="setupGuideModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document" style="margin-top: 50px;">
        <div class="modal-content">
            <div class="modal-header" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-bottom: 2px solid #90caf9;">
                <h5 class="modal-title" id="setupGuideModalLabel" style="color: #1976d2; font-weight: 600;">
                    <i class="fa fa-book"></i> Complete Setup Guide: Connecting Biometric Devices
                </h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close" style="color: #1976d2;">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <div class="setup-guide-content">
                    <!-- Introduction -->
                    <div class="alert alert-info">
                        <h6><i class="fa fa-info-circle"></i> Welcome to Biometric Attendance System</h6>
                        <p class="mb-0">This guide will walk you through connecting your ZKTeco fingerprint devices to track staff attendance automatically.</p>
                    </div>

                    <!-- Step 1: Hardware Requirements -->
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><span class="badge badge-primary mr-2">Step 1</span> Hardware Requirements</h6>
                        </div>
                        <div class="card-body">
                            <h6>What You Need:</h6>
                            <ul>
                                <li><strong>ZKTeco Biometric Device</strong> (e.g., ZKTeco K40, K50, or similar models)</li>
                                <li><strong>Ethernet Cable</strong> to connect device to your network</li>
                                <li><strong>Power Adapter</strong> for the device</li>
                                <li><strong>Network Access</strong> - Device must be on the same network as your server</li>
                            </ul>
                            <div class="alert alert-warning">
                                <strong>Important:</strong> Make sure your device supports TCP/IP communication and is ZKTeco compatible.
                            </div>
                        </div>
                    </div>

                    <!-- Step 2: Physical Setup -->
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><span class="badge badge-primary mr-2">Step 2</span> Physical Device Setup</h6>
                        </div>
                        <div class="card-body">
                            <h6>Installation Steps:</h6>
                            <ol>
                                <li><strong>Mount the Device:</strong> Install the device at your entrance or POS location</li>
                                <li><strong>Connect Power:</strong> Plug in the power adapter and wait for device to boot</li>
                                <li><strong>Connect Network:</strong> 
                                    <ul>
                                        <li>Connect Ethernet cable from device to your router/switch</li>
                                        <li>Wait for network connection (check device display for IP status)</li>
                                    </ul>
                                </li>
                                <li><strong>Configure Device IP:</strong>
                                    <ul>
                                        <li>Access device menu (usually by pressing OK or Menu button)</li>
                                        <li>Navigate to: <code>Communication → TCP/IP</code></li>
                                        <li>Set a <strong>static IP address</strong> (e.g., 192.168.1.100)</li>
                                        <li>Set <strong>Port: 4370</strong> (default ZKTeco port)</li>
                                        <li>Set <strong>Subnet Mask</strong> (usually 255.255.255.0)</li>
                                        <li>Set <strong>Gateway</strong> (your router IP, usually 192.168.1.1)</li>
                                        <li>Save settings and restart device</li>
                                    </ul>
                                </li>
                            </ol>
                            <div class="alert alert-info">
                                <strong>Tip:</strong> Write down the IP address you set - you'll need it in the next step!
                            </div>
                        </div>
                    </div>

                    <!-- Step 3: Add Device in System -->
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><span class="badge badge-primary mr-2">Step 3</span> Add Device in PayMyDine</h6>
                        </div>
                        <div class="card-body">
                            <h6>In This System:</h6>
                            <ol>
                                <li>Click <strong>"Create Device"</strong> button (top right)</li>
                                <li>Fill in the form:
                                    <ul>
                                        <li><strong>Device Name:</strong> Give it a friendly name (e.g., "Main Entrance Device")</li>
                                        <li><strong>IP Address:</strong> Enter the IP you set in Step 2 (e.g., 192.168.1.100)</li>
                                        <li><strong>Port:</strong> Enter 4370 (default)</li>
                                        <li><strong>Location:</strong> Select which restaurant location this device is at</li>
                                        <li><strong>Status:</strong> Enable the device</li>
                                    </ul>
                                </li>
                                <li>Click <strong>"Save"</strong></li>
                                <li>After saving, click <strong>"Test Connection"</strong> button</li>
                                <li>If successful, the system will automatically detect the device serial number</li>
                            </ol>
                            <div class="alert alert-success">
                                <strong>Success Indicator:</strong> When connection test succeeds, you'll see a success message with the device serial number.
                            </div>
                            <div class="alert alert-danger">
                                <strong>Troubleshooting:</strong> If connection fails, check:
                                <ul class="mb-0">
                                    <li>Device is powered on and connected to network</li>
                                    <li>IP address is correct</li>
                                    <li>Device and server are on the same network</li>
                                    <li>Firewall is not blocking port 4370</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Step 4: Assign Staff Cards -->
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><span class="badge badge-primary mr-2">Step 4</span> Assign Cards to Staff</h6>
                        </div>
                        <div class="card-body">
                            <h6>For Card-Based Authentication:</h6>
                            <ol>
                                <li>Go to <strong>Staff Management</strong> → Edit a staff member</li>
                                <li>Find the <strong>"Card ID"</strong> field</li>
                                <li>Enter the unique card ID (from the physical card)</li>
                                <li>Enable <strong>"Biometric Enabled"</strong> toggle</li>
                                <li>Save the staff record</li>
                            </ol>
                            <p><strong>Note:</strong> Each staff member needs a unique card ID that matches their physical card.</p>
                        </div>
                    </div>

                    <!-- Step 5: Sync Staff to Device -->
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><span class="badge badge-primary mr-2">Step 5</span> Sync Staff to Device</h6>
                        </div>
                        <div class="card-body">
                            <h6>Upload Staff Data:</h6>
                            <ol>
                                <li>Go to your device in the list</li>
                                <li>Click <strong>"Edit"</strong> on the device</li>
                                <li>Click <strong>"Sync Staff"</strong> button</li>
                                <li>Wait for confirmation - this uploads all staff with biometric enabled to the device</li>
                            </ol>
                            <div class="alert alert-info">
                                <strong>What This Does:</strong> This transfers all your staff information to the physical device so they can check in/out.
                            </div>
                        </div>
                    </div>

                    <!-- Step 6: Register Fingerprints (Optional) -->
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><span class="badge badge-primary mr-2">Step 6</span> Register Fingerprints (Optional)</h6>
                        </div>
                        <div class="card-body">
                            <h6>For Fingerprint Authentication:</h6>
                            <ol>
                                <li>On the physical device, access the menu</li>
                                <li>Navigate to: <code>User Management → Register Fingerprint</code></li>
                                <li>Enter the staff ID (must match staff ID in system)</li>
                                <li>Place finger on scanner when prompted</li>
                                <li>Lift and place finger again to confirm</li>
                                <li>Repeat for additional fingers if desired</li>
                            </ol>
                            <p><strong>Note:</strong> Fingerprint registration is done directly on the device, not through this system.</p>
                        </div>
                    </div>

                    <!-- Step 7: Sync Attendance -->
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><span class="badge badge-primary mr-2">Step 7</span> Sync Attendance Data</h6>
                        </div>
                        <div class="card-body">
                            <h6>Get Attendance Records:</h6>
                            <ol>
                                <li>Go to your device in the list</li>
                                <li>Click <strong>"Edit"</strong> on the device</li>
                                <li>Click <strong>"Sync Attendance"</strong> button</li>
                                <li>This downloads all check-in/check-out records from the device</li>
                            </ol>
                            <div class="alert" style="background-color: #e3f2fd; border-color: #90caf9; color: #1976d2;">
                                <strong>Automatic Sync:</strong> You can also set up automatic syncing by running the command:
                                <code>php artisan biometric:sync-attendance</code> as a scheduled task (cron job).
                            </div>
                        </div>
                    </div>

                    <!-- Step 8: View Attendance -->
                    <div class="card mb-3">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><span class="badge badge-primary mr-2">Step 8</span> View Attendance Records</h6>
                        </div>
                        <div class="card-body">
                            <h6>Access Attendance Data:</h6>
                            <ul>
                                <li>Click the <strong>"Staff Attendance"</strong> tab to see detailed records</li>
                                <li>Click the <strong>"Attendance Calendar"</strong> tab to see monthly overview</li>
                                <li>Use filters to find specific staff or dates</li>
                                <li>Export data for payroll or reporting</li>
                            </ul>
                        </div>
                    </div>

                    <!-- Troubleshooting Section -->
                    <div class="card mb-3 border-warning">
                        <div class="card-header bg-warning">
                            <h6 class="mb-0"><i class="fa fa-wrench"></i> Troubleshooting Common Issues</h6>
                        </div>
                        <div class="card-body">
                            <h6>Connection Problems:</h6>
                            <ul>
                                <li><strong>Can't connect to device:</strong>
                                    <ul>
                                        <li>Verify IP address is correct</li>
                                        <li>Ping the device IP from your server: <code>ping 192.168.1.100</code></li>
                                        <li>Check device is on same network</li>
                                        <li>Verify port 4370 is not blocked by firewall</li>
                                    </ul>
                                </li>
                                <li><strong>Serial number not detected:</strong>
                                    <ul>
                                        <li>Device may need firmware update</li>
                                        <li>Try disconnecting and reconnecting</li>
                                        <li>Check device model compatibility</li>
                                    </ul>
                                </li>
                                <li><strong>Staff can't check in:</strong>
                                    <ul>
                                        <li>Verify staff has "Biometric Enabled" turned on</li>
                                        <li>Check card ID matches physical card</li>
                                        <li>Ensure staff was synced to device (Step 5)</li>
                                    </ul>
                                </li>
                                <li><strong>Attendance not syncing:</strong>
                                    <ul>
                                        <li>Run manual sync from device edit page</li>
                                        <li>Check device has attendance records</li>
                                        <li>Verify network connection is stable</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <!-- Support Section -->
                    <div class="card mb-3 border-info">
                        <div class="card-header bg-info text-white">
                            <h6 class="mb-0"><i class="fa fa-life-ring"></i> Need More Help?</h6>
                        </div>
                        <div class="card-body">
                            <p>For additional support:</p>
                            <ul>
                                <li>Check device manufacturer documentation (ZKTeco)</li>
                                <li>Contact your system administrator</li>
                                <li>Review device settings and network configuration</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer" style="padding: 15px 20px; border-top: 1px solid #e0e0e0;">
                <button type="button" class="btn btn-ice-white" data-dismiss="modal">Close</button>
                <a href="{{ admin_url('biometric_devices/create') }}" class="btn btn-primary">
                    <i class="fa fa-plus"></i> Add Device Now
                </a>
            </div>
        </div>
    </div>
</div>

<style>
.setup-guide-content .card {
    border-left: 4px solid #007bff;
}
.setup-guide-content .card-header {
    font-weight: 600;
}
.setup-guide-content code {
    background-color: #f4f4f4;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.9em;
}
.setup-guide-content .badge {
    font-size: 0.9em;
    padding: 6px 10px;
}
</style>

