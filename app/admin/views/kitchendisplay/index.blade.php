<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kitchen Display System - {{ $title }}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #1a1a1a;
            color: #ffffff;
            overflow-x: hidden;
        }

        .kds-container {
            padding: 20px;
            max-width: 100%;
        }

        .kds-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 30px;
            background: #2d2d2d;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .kds-title {
            font-size: 36px;
            font-weight: 700;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .kds-title i {
            color: #4CAF50;
        }

        .kds-clock {
            font-size: 28px;
            font-weight: 600;
            color: #90CAF9;
            font-variant-numeric: tabular-nums;
        }

        .kds-stats {
            display: flex;
            gap: 30px;
            font-size: 18px;
            color: #b0b0b0;
        }

        .kds-stat {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .kds-stat-value {
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
        }

        .orders-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
            gap: 25px;
            padding: 10px;
        }

        .order-card {
            background: #2d2d2d;
            border-radius: 16px;
            padding: 25px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            border-left: 6px solid #4CAF50;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            position: relative;
        }

        .order-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
        }

        /* Color coding by order age */
        .order-card.age-new {
            border-left-color: #4CAF50; /* Green - fresh order */
        }

        .order-card.age-normal {
            border-left-color: #FFC107; /* Yellow - normal */
        }

        .order-card.age-late {
            border-left-color: #F44336; /* Red - late */
            animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
            0%, 100% {
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            }
            50% {
                box-shadow: 0 8px 32px rgba(244, 67, 54, 0.6);
            }
        }

        .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #404040;
        }

        .order-number {
            font-size: 42px;
            font-weight: 900;
            color: #ffffff;
            line-height: 1;
        }

        .order-table {
            font-size: 22px;
            color: #90CAF9;
            font-weight: 600;
        }

        .order-time {
            text-align: right;
        }

        .order-time-label {
            font-size: 14px;
            color: #808080;
            display: block;
            margin-bottom: 4px;
        }

        .order-elapsed {
            font-size: 32px;
            font-weight: 700;
            color: #FFC107;
            font-variant-numeric: tabular-nums;
        }

        .order-elapsed.late {
            color: #F44336;
            animation: pulse-text 1s ease-in-out infinite;
        }

        @keyframes pulse-text {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }

        .order-items {
            margin: 20px 0;
        }

        .order-item {
            background: #1a1a1a;
            padding: 18px;
            border-radius: 10px;
            margin-bottom: 15px;
            border-left: 3px solid #4CAF50;
        }

        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .item-name {
            font-size: 24px;
            font-weight: 700;
            color: #ffffff;
        }

        .item-quantity {
            font-size: 28px;
            font-weight: 900;
            color: #4CAF50;
            background: #1a3a1a;
            padding: 8px 20px;
            border-radius: 8px;
            min-width: 60px;
            text-align: center;
        }

        .item-modifiers {
            margin-top: 12px;
            padding-left: 15px;
        }

        .item-modifier {
            font-size: 18px;
            color: #b0b0b0;
            margin: 6px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .modifier-icon {
            color: #FFC107;
            font-size: 14px;
        }

        .item-comment {
            margin-top: 12px;
            padding: 12px;
            background: #FFB74D;
            color: #1a1a1a;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            font-style: italic;
        }

        .item-comment::before {
            content: '✏️ Note: ';
            font-weight: 700;
        }

        .order-notes {
            background: #1a3a5a;
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
            border-left: 3px solid #2196F3;
        }

        .order-notes-title {
            font-size: 16px;
            color: #90CAF9;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .order-note {
            font-size: 18px;
            color: #ffffff;
            margin: 8px 0;
        }

        .order-status-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            flex-wrap: wrap;
        }

        .status-btn {
            flex: 1;
            min-width: 120px;
            padding: 14px 20px;
            font-size: 16px;
            font-weight: 600;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-transform: uppercase;
        }

        .status-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        }

        .status-btn.status-preparation {
            background: #FFC107;
            color: #1a1a1a;
        }

        .status-btn.status-delivery {
            background: #4CAF50;
            color: #ffffff;
        }

        .status-btn.status-completed {
            background: #2196F3;
            color: #ffffff;
        }

        .empty-state {
            text-align: center;
            padding: 100px 20px;
        }

        .empty-state i {
            font-size: 120px;
            color: #404040;
            margin-bottom: 30px;
        }

        .empty-state h2 {
            font-size: 36px;
            color: #808080;
            margin-bottom: 15px;
        }

        .empty-state p {
            font-size: 20px;
            color: #606060;
        }

        /* Responsive design for smaller displays */
        @media (max-width: 1200px) {
            .orders-grid {
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            }
        }

        @media (max-width: 768px) {
            .orders-grid {
                grid-template-columns: 1fr;
            }
            
            .kds-header {
                flex-direction: column;
                gap: 15px;
            }
        }

        /* Loading indicator */
        .loading-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            display: none;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
        }

        .loading-indicator.active {
            display: block;
        }

        /* Fullscreen button */
        .fullscreen-btn {
            background: #424242;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: background 0.2s ease;
        }

        .fullscreen-btn:hover {
            background: #525252;
        }
    </style>
</head>
<body>
    <div class="loading-indicator" id="loading-indicator">
        <i class="fas fa-sync fa-spin"></i> Refreshing...
    </div>

    <div class="kds-container">
        <!-- Header -->
        <div class="kds-header">
            <div class="kds-title">
                <i class="fas fa-utensils"></i>
                Kitchen Display System
            </div>
            <div class="kds-stats">
                <div class="kds-stat">
                    <span>Active Orders:</span>
                    <span class="kds-stat-value" id="order-count">{{ count($orders) }}</span>
                </div>
            </div>
            <div>
                <button class="fullscreen-btn" onclick="toggleFullscreen()">
                    <i class="fas fa-expand"></i>
                    <span id="fullscreen-text">Fullscreen</span>
                </button>
            </div>
            <div class="kds-clock" id="clock">--:--:--</div>
        </div>

        <!-- Orders Grid -->
        <div class="orders-grid" id="orders-grid">
            @if(count($orders) === 0)
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-check-circle"></i>
                    <h2>All Caught Up!</h2>
                    <p>No active orders in the kitchen</p>
                </div>
            @else
                @foreach($orders as $order)
                    @php
                        // Determine order age class
                        $elapsedMinutes = $order['created_at']->diffInMinutes(now());
                        $ageClass = 'age-new';
                        if ($elapsedMinutes > 15) {
                            $ageClass = 'age-late';
                        } elseif ($elapsedMinutes > 5) {
                            $ageClass = 'age-normal';
                        }
                    @endphp
                    <div class="order-card {{ $ageClass }}" data-order-id="{{ $order['order_id'] }}">
                        <div class="order-header">
                            <div>
                                <div class="order-number">#{{ $order['order_id'] }}</div>
                                <div class="order-table">{{ $order['order_type_name'] }}</div>
                            </div>
                            <div class="order-time">
                                <span class="order-time-label">Time Elapsed</span>
                                <div class="order-elapsed {{ $elapsedMinutes > 15 ? 'late' : '' }}" 
                                     data-created="{{ $order['created_at']->timestamp }}">
                                    {{ $order['elapsed_time'] }}
                                </div>
                            </div>
                        </div>

                        <div class="order-items">
                            @foreach($order['items'] as $item)
                                <div class="order-item">
                                    <div class="item-header">
                                        <div class="item-name">{{ $item['name'] }}</div>
                                        <div class="item-quantity">{{ $item['quantity'] }}×</div>
                                    </div>

                                    @if(count($item['modifiers']) > 0)
                                        <div class="item-modifiers">
                                            @foreach($item['modifiers'] as $modifier)
                                                <div class="item-modifier">
                                                    <i class="fas fa-circle modifier-icon"></i>
                                                    @if($modifier['quantity'] > 1)
                                                        <strong>{{ $modifier['quantity'] }}×</strong>
                                                    @endif
                                                    {{ $modifier['name'] }}
                                                    @if($modifier['category'])
                                                        <span style="color: #707070; font-size: 14px;">({{ $modifier['category'] }})</span>
                                                    @endif
                                                </div>
                                            @endforeach
                                        </div>
                                    @endif

                                    @if(!empty($item['comment']))
                                        <div class="item-comment">
                                            {{ $item['comment'] }}
                                        </div>
                                    @endif
                                </div>
                            @endforeach
                        </div>

                        @if(count($order['notes']) > 0)
                            <div class="order-notes">
                                <div class="order-notes-title"><i class="fas fa-sticky-note"></i> Order Notes:</div>
                                @foreach($order['notes'] as $note)
                                    <div class="order-note">{{ $note['note'] }}</div>
                                @endforeach
                            </div>
                        @endif

                        <!-- Status Change Buttons -->
                        <div class="order-status-buttons">
                            @foreach($statuses as $status)
                                @if($status['status_id'] != $order['status_id'])
                                    <button 
                                        class="status-btn status-{{ strtolower($status['status_name']) }}"
                                        onclick="updateOrderStatus({{ $order['order_id'] }}, {{ $status['status_id'] }}, '{{ $status['status_name'] }}')">
                                        {{ $status['status_name'] }}
                                    </button>
                                @endif
                            @endforeach
                        </div>
                    </div>
                @endforeach
            @endif
        </div>
    </div>

    <script>
        // Update clock
        function updateClock() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            document.getElementById('clock').textContent = `${hours}:${minutes}:${seconds}`;
        }

        // Update elapsed times
        function updateElapsedTimes() {
            document.querySelectorAll('.order-elapsed').forEach(el => {
                const createdTimestamp = parseInt(el.dataset.created);
                const now = Math.floor(Date.now() / 1000);
                const elapsed = now - createdTimestamp;
                
                const hours = Math.floor(elapsed / 3600);
                const minutes = Math.floor((elapsed % 3600) / 60);
                const seconds = elapsed % 60;
                
                let timeString = '';
                if (hours > 0) {
                    timeString = `${hours}h ${minutes}m`;
                } else if (minutes > 0) {
                    timeString = `${minutes}m ${seconds}s`;
                } else {
                    timeString = `${seconds}s`;
                }
                
                el.textContent = timeString;
                
                // Add late class if over 15 minutes
                if (minutes > 15 || hours > 0) {
                    el.classList.add('late');
                    el.closest('.order-card').classList.remove('age-new', 'age-normal');
                    el.closest('.order-card').classList.add('age-late');
                } else if (minutes > 5) {
                    el.classList.remove('late');
                    el.closest('.order-card').classList.remove('age-new', 'age-late');
                    el.closest('.order-card').classList.add('age-normal');
                }
            });
        }

        // Auto-refresh orders from server
        async function refreshOrders() {
            const indicator = document.getElementById('loading-indicator');
            indicator.classList.add('active');

            try {
                // Use absolute URL from PHP helper (handler is passed in POST data, not URL)
                const refreshUrl = '{{ admin_url("kitchendisplay/index") }}';
                
                // Create form data with handler parameter
                const formData = new URLSearchParams();
                formData.append('_handler', 'onRefresh');
                
                const response = await fetch(refreshUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: formData.toString()
                });

                // Check if response is OK and is JSON
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    throw new Error(`Expected JSON but got: ${contentType}. Response: ${text.substring(0, 100)}`);
                }

                const data = await response.json();
                
                if (data.orders) {
                    updateOrdersDisplay(data.orders);
                }
            } catch (error) {
                console.error('Failed to refresh orders:', error);
                // Don't show alert on every refresh failure, just log it
            } finally {
                setTimeout(() => {
                    indicator.classList.remove('active');
                }, 500);
            }
        }

        // Update orders display with new data
        function updateOrdersDisplay(orders) {
            const grid = document.getElementById('orders-grid');
            const orderCount = document.getElementById('order-count');
            
            orderCount.textContent = orders.length;

            if (orders.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <i class="fas fa-check-circle"></i>
                        <h2>All Caught Up!</h2>
                        <p>No active orders in the kitchen</p>
                    </div>
                `;
                return;
            }

            // For simplicity, reload the entire page if order count changes significantly
            // In production, you'd want to do a smart diff update
            const currentCards = document.querySelectorAll('.order-card').length;
            if (Math.abs(currentCards - orders.length) > 0) {
                location.reload();
            }
        }

        // Update order status
        async function updateOrderStatus(orderId, statusId, statusName) {
            if (!confirm(`Update order #${orderId} to ${statusName}?`)) {
                return;
            }

            try {
                // Use absolute URL from PHP helper (handler is passed in POST data, not URL)
                const updateUrl = '{{ admin_url("kitchendisplay/index") }}';
                
                // Create form data with handler parameter and order data
                const formData = new URLSearchParams();
                formData.append('_handler', 'onUpdateStatus');
                formData.append('order_id', orderId);
                formData.append('status_id', statusId);
                
                const response = await fetch(updateUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: formData.toString()
                });

                // Check if response is OK and is JSON
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    throw new Error(`Expected JSON but got: ${contentType}. Response: ${text.substring(0, 100)}`);
                }

                const data = await response.json();
                
                if (data.success) {
                    // Reload orders to reflect changes
                    location.reload();
                } else {
                    alert('Failed to update status: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Failed to update status:', error);
                alert('Failed to update status: ' + error.message);
            }
        }

        // Toggle fullscreen
        function toggleFullscreen() {
            const elem = document.documentElement;
            const btn = document.getElementById('fullscreen-text');
            
            if (!document.fullscreenElement) {
                elem.requestFullscreen().then(() => {
                    btn.textContent = 'Exit Fullscreen';
                    btn.parentElement.querySelector('i').classList.remove('fa-expand');
                    btn.parentElement.querySelector('i').classList.add('fa-compress');
                }).catch(err => {
                    console.error('Failed to enter fullscreen:', err);
                });
            } else {
                document.exitFullscreen().then(() => {
                    btn.textContent = 'Fullscreen';
                    btn.parentElement.querySelector('i').classList.remove('fa-compress');
                    btn.parentElement.querySelector('i').classList.add('fa-expand');
                });
            }
        }

        // Initialize
        setInterval(updateClock, 1000);
        setInterval(updateElapsedTimes, 1000);
        setInterval(refreshOrders, 5000); // Refresh every 5 seconds

        updateClock();
        updateElapsedTimes();

        console.log('✅ Kitchen Display System initialized');
        console.log('🔄 Auto-refresh: Every 5 seconds');
        console.log('⏰ Clock and timers updating every second');
    </script>
</body>
</html>

