<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --theme-color: {{ $themeColor ?? '#4CAF50' }};
            --theme-color-light: {{ $themeColor ?? '#4CAF50' }}33;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #ffffff;
            color: #1a1a1a;
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
            background: #f5f5f5;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border-left: 6px solid var(--theme-color);
        }
        
        .kds-header-left {
            display: flex;
            gap: 30px;
            align-items: center;
        }
        
        .kds-header-right {
            display: flex;
            gap: 15px;
            align-items: center;
        }

        .kds-station-name {
            font-size: 24px;
            font-weight: 700;
            color: var(--theme-color);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .kds-station-name i {
            font-size: 20px;
        }

        .kds-clock {
            font-size: 28px;
            font-weight: 600;
            color: #90CAF9;
            font-variant-numeric: tabular-nums;
        }

        .mute-btn-icon {
            background: #e0e0e0;
            color: #1a1a1a;
            border: none;
            padding: 8px;
            border-radius: 6px;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            transition: background 0.2s ease;
        }

        .mute-btn-icon:hover {
            background: #d0d0d0;
        }

        .mute-btn-icon.muted {
            background: #F44336;
        }

        .mute-btn-icon.muted:hover {
            background: #E53935;
        }

        .mute-btn-icon i {
            font-size: 18px;
        }

        .station-selector {
            background: #ffffff;
            color: #1a1a1a;
            border: 1px solid #d0d0d0;
            padding: 8px 15px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            min-width: 150px;
        }

        .station-selector:hover {
            background: #f5f5f5;
        }

        .kds-stats {
            display: flex;
            gap: 30px;
            font-size: 18px;
            color: #666666;
        }

        .kds-stat {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .kds-stat-value {
            font-size: 32px;
            font-weight: 700;
            color: #1a1a1a;
        }

        .orders-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
            gap: 25px;
            padding: 10px;
        }

        .order-card {
            background: #ffffff;
            border-radius: 16px;
            padding: 25px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
            border-left: 6px solid var(--theme-color);
            border-right: 1px solid #e0e0e0;
            border-top: 1px solid #e0e0e0;
            border-bottom: 1px solid #e0e0e0;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            position: relative;
        }

        .order-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
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
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
            }
            50% {
                box-shadow: 0 8px 32px rgba(244, 67, 54, 0.4);
            }
        }

        .order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e0e0e0;
        }

        .order-number {
            font-size: 42px;
            font-weight: 900;
            color: #1a1a1a;
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
            color: #666666;
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
            background: #f9f9f9;
            padding: 18px;
            border-radius: 10px;
            margin-bottom: 15px;
            border-left: 3px solid var(--theme-color);
            border-right: 1px solid #e8e8e8;
            border-top: 1px solid #e8e8e8;
            border-bottom: 1px solid #e8e8e8;
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
            color: #1a1a1a;
        }

        .item-quantity {
            font-size: 28px;
            font-weight: 900;
            color: var(--theme-color);
            background: var(--theme-color-light);
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
            color: #666666;
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
            background: #FFF3E0;
            color: #1a1a1a;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            font-style: italic;
            border: 1px solid #FFB74D;
        }

        .item-comment::before {
            content: '✏️ Note: ';
            font-weight: 700;
        }

        .order-notes {
            background: #E3F2FD;
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
            color: #1a1a1a;
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

        /* Cancel button should be smaller and less prominent */
        .status-btn.status-cancel,
        .status-btn.status-canceled {
            flex: 0 0 auto;
            min-width: 70px;
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 500;
            opacity: 0.75;
            border: 1px solid rgba(0, 0, 0, 0.2);
        }

        .status-btn.status-cancel:hover,
        .status-btn.status-canceled:hover {
            opacity: 1;
            transform: translateY(-1px);
        }

        .status-btn.status-cancel i,
        .status-btn.status-canceled i {
            font-size: 10px;
            margin-right: 4px;
        }

        .status-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .status-btn.status-preparing {
            background: #FFC107;
            color: #1a1a1a;
        }

        .status-btn.status-preparation {
            background: #FFC107;
            color: #1a1a1a;
        }

        .status-btn.status-cancel {
            background: #F44336;
            color: #ffffff;
            font-size: 12px;
            padding: 8px 12px;
            min-width: 80px;
            flex: 0 0 auto;
        }

        .status-btn.status-canceled {
            background: #F44336;
            color: #ffffff;
            font-size: 12px;
            padding: 8px 12px;
            min-width: 80px;
            flex: 0 0 auto;
        }

        .status-btn.status-completed {
            background: #2196F3;
            color: #ffffff;
        }

        .status-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .empty-state {
            text-align: center;
            padding: 100px 20px;
        }

        .empty-state i {
            font-size: 120px;
            color: #b0b0b0;
            margin-bottom: 30px;
        }

        .empty-state h2 {
            font-size: 36px;
            color: #666666;
            margin-bottom: 15px;
        }

        .empty-state p {
            font-size: 20px;
            color: #888888;
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
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
        }

        .loading-indicator.active {
            opacity: 1;
        }
        
        .loading-indicator i {
            font-size: 18px;
            color: #90CAF9;
        }

        /* Settings/Back button */
        .settings-btn {
            background: #ffffff;
            color: #1a1a1a;
            border: 1px solid #d0d0d0;
            padding: 8px 15px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .settings-btn:hover {
            background: #f5f5f5;
            color: #1a1a1a;
        }

    </style>
</head>
<body>

    <div class="kds-container">
        <!-- Header -->
        <div class="kds-header">
            <div class="kds-header-left">
                @if(isset($station) && $station)
                <div class="kds-station-name">
                    <i class="fas fa-tv"></i>
                    {{ $station->name }}
                </div>
                @else
                <div class="kds-station-name">
                    <i class="fas fa-utensils"></i>
                    Kitchen Display
                </div>
                @endif
                <div class="kds-stat">
                    <span>Orders:</span>
                    <span class="kds-stat-value" id="order-count">{{ count($orders) }}</span>
                </div>
                <div class="kds-stat">
                    <span>Reservations:</span>
                    <span class="kds-stat-value" id="reservations-count">{{ $reservationsCount }}</span>
                </div>
            </div>
            <div class="kds-header-right">
                @if(isset($allStations) && count($allStations) > 0)
                <select class="station-selector" id="station-selector" onchange="changeStation(this.value)">
                    <option value="">All Stations</option>
                    @foreach($allStations as $s)
                    <option value="{{ $s->slug }}" {{ (isset($station) && $station && $station->slug === $s->slug) ? 'selected' : '' }}>
                        {{ $s->name }}
                    </option>
                    @endforeach
                </select>
                @endif
                <div class="loading-indicator" id="loading-indicator">
                    <i class="fas fa-sync fa-spin"></i>
                </div>
                <button class="mute-btn-icon" id="mute-btn" onclick="toggleMute()" title="Toggle sound notifications">
                    <i class="fas fa-volume-up" id="mute-icon"></i>
                </button>
                <div class="kds-clock" id="clock">--:--:--</div>
                <a href="{{ admin_url('kds_stations') }}" class="settings-btn" title="Manage KDS Stations">
                    <i class="fas fa-cog"></i>
                </a>
            </div>
        </div>

        <!-- Orders Grid -->
        <div class="orders-grid" id="orders-grid">
            @if(count($orders) === 0)
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-check-circle"></i>
                    <h2>All Caught Up!</h2>
                    <p>No active orders {{ isset($station) && $station ? 'for ' . $station->name : 'in the kitchen' }}</p>
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
                        @if($canChangeStatus ?? true)
                        <div class="order-status-buttons">
                            @foreach($statuses as $status)
                                @if($status['status_id'] != $order['status_id'])
                                    <button 
                                        class="status-btn status-{{ strtolower($status['status_name']) }}"
                                        onclick="updateOrderStatus({{ $order['order_id'] }}, {{ $status['status_id'] }}, '{{ $status['status_name'] }}')">
                                        @if(strtolower($status['status_name']) === 'cancel')
                                            <i class="fas fa-times"></i> {{ $status['status_name'] }}
                                        @else
                                            {{ $status['status_name'] }}
                                        @endif
                                    </button>
                                @endif
                            @endforeach
                        </div>
                        @endif
                    </div>
                @endforeach
            @endif
        </div>
    </div>

    <script>
        // Station configuration
        const currentStationSlug = '{{ isset($station) && $station ? $station->slug : "" }}';
        const currentStationName = '{{ isset($station) && $station ? $station->name : "Kitchen" }}';
        const canChangeStatus = {{ ($canChangeStatus ?? true) ? 'true' : 'false' }};
        const refreshInterval = {{ $refreshInterval ?? 5 }} * 1000; // Convert to milliseconds

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

        // Sound notification management
        let isMuted = localStorage.getItem('kds-muted') === 'true';
        let previousOrderCount = {{ count($orders) }};
        let previousOrderIds = new Set([@foreach($orders as $order){{ $order['order_id'] }}{{ !$loop->last ? ',' : '' }}@endforeach]);
        let audioContext = null;
        let audioContextInitialized = false;
        const selectedSound = '{{ $kdsNotificationSound ?? "doorbell" }}';

        // Initialize sound using Web Audio API
        function initNotificationSound() {
            try {
                if (!audioContext) {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }
                audioContextInitialized = true;
                console.log('🔊 Audio context initialized');
            } catch (e) {
                console.warn('⚠️ Audio context initialization failed:', e);
                audioContextInitialized = false;
            }
        }

        // Resume audio context if suspended
        async function ensureAudioContext() {
            if (!audioContext) {
                initNotificationSound();
            }
            if (audioContext && audioContext.state === 'suspended') {
                try {
                    await audioContext.resume();
                    console.log('🔊 Audio context resumed');
                } catch (e) {
                    console.warn('⚠️ Failed to resume audio context:', e);
                }
            }
            return audioContext && audioContext.state === 'running';
        }

        // Helper function to play a tone
        function playTone(freq, startTime, duration, type = 'sine', volume = 0.5) {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.frequency.value = freq;
            osc.type = type;
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        }

        // Sound Library
        const soundLibrary = {
            'doorbell': function(now) {
                playTone(800, now, 0.2);
                playTone(600, now + 0.15, 0.3);
            },
            'chime': function(now) {
                playTone(523.25, now, 0.3);
                playTone(659.25, now + 0.2, 0.3);
                playTone(783.99, now + 0.4, 0.4);
            },
            'bell': function(now) {
                playTone(880, now, 0.4, 'sine', 0.6);
                playTone(1320, now + 0.1, 0.3, 'sine', 0.4);
            },
            'alert': function(now) {
                playTone(800, now, 0.1);
                playTone(800, now + 0.15, 0.1);
            },
            'notification': function(now) {
                playTone(800, now, 0.15);
                playTone(1000, now + 0.1, 0.2);
            },
            'ding': function(now) {
                playTone(800, now, 0.3);
            },
            'double-beep': function(now) {
                playTone(600, now, 0.1);
                playTone(600, now + 0.2, 0.1);
            },
            'triple-beep': function(now) {
                playTone(600, now, 0.1);
                playTone(600, now + 0.15, 0.1);
                playTone(600, now + 0.3, 0.1);
            },
            'whoosh': function(now) {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
                osc.connect(gain);
                gain.connect(audioContext.destination);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            },
            'pop': function(now) {
                playTone(400, now, 0.05, 'square', 0.3);
            },
            'success': function(now) {
                playTone(523.25, now, 0.15);
                playTone(659.25, now + 0.15, 0.15);
                playTone(783.99, now + 0.3, 0.2);
            },
            'warning': function(now) {
                playTone(783.99, now, 0.15);
                playTone(659.25, now + 0.15, 0.15);
                playTone(523.25, now + 0.3, 0.2);
            }
        };

        // Play notification sound
        async function playNotificationSound() {
            if (isMuted) return;
            
            const soundFunction = soundLibrary[selectedSound] || soundLibrary['doorbell'];
            
            const isReady = await ensureAudioContext();
            if (!audioContext || !audioContextInitialized) {
                initNotificationSound();
                if (!audioContext) return;
            }
            
            if (audioContext.state !== 'running') {
                try {
                    await audioContext.resume();
                } catch (e) {
                    return;
                }
            }
            
            try {
                const now = audioContext.currentTime;
                soundFunction(now);
            } catch (e) {
                console.error('❌ Sound notification failed:', e);
            }
        }

        // Toggle mute/unmute
        async function toggleMute() {
            isMuted = !isMuted;
            localStorage.setItem('kds-muted', isMuted);
            updateMuteButton();
            if (!isMuted) {
                const isReady = await ensureAudioContext();
                if (isReady) {
                    setTimeout(() => {
                        playNotificationSound().catch(e => {});
                    }, 100);
                }
            }
        }

        // Update mute button appearance
        function updateMuteButton() {
            const btn = document.getElementById('mute-btn');
            const icon = document.getElementById('mute-icon');
            
            if (isMuted) {
                btn.classList.add('muted');
                icon.className = 'fas fa-volume-mute';
                btn.title = 'Sound Off - Click to unmute';
            } else {
                btn.classList.remove('muted');
                icon.className = 'fas fa-volume-up';
                btn.title = 'Sound On - Click to mute';
            }
        }

        // Change station
        function changeStation(stationSlug) {
            if (stationSlug) {
                window.location.href = '{{ admin_url("kitchendisplay") }}/' + stationSlug;
            } else {
                window.location.href = '{{ admin_url("kitchendisplay") }}';
            }
        }

        // Auto-refresh orders from server
        async function refreshOrders() {
            const indicator = document.getElementById('loading-indicator');
            indicator.classList.add('active');

            try {
                const refreshUrl = '{{ admin_url("kitchendisplay/index") }}';
                
                const formData = new URLSearchParams();
                formData.append('_handler', 'onRefresh');
                if (currentStationSlug) {
                    formData.append('station_slug', currentStationSlug);
                }
                
                const response = await fetch(refreshUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: formData.toString()
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    throw new Error(`Expected JSON but got: ${contentType}. Response: ${text.substring(0, 100)}`);
                }

                const data = await response.json();
                
                if (data.orders && Array.isArray(data.orders)) {
                    const currentOrderCount = data.orders.length;
                    const currentOrderIds = new Set(data.orders.map(order => order.order_id));
                    
                    // Check if new orders arrived
                    let hasNewOrders = false;
                    currentOrderIds.forEach(orderId => {
                        if (!previousOrderIds.has(orderId)) {
                            hasNewOrders = true;
                            console.log(`🆕 New order detected: #${orderId}`);
                        }
                    });
                    
                    if (hasNewOrders) {
                        playNotificationSound().catch(e => {});
                    }
                    
                    previousOrderCount = currentOrderCount;
                    previousOrderIds = new Set(currentOrderIds);
                    
                    updateOrdersDisplay(data.orders);
                    document.getElementById('order-count').textContent = currentOrderCount;
                }
            } catch (error) {
                console.error('❌ Failed to refresh orders:', error);
            } finally {
                setTimeout(() => {
                    indicator.classList.remove('active');
                }, 500);
            }
        }

        // Parse date string to timestamp
        function parseDateToTimestamp(dateString) {
            if (typeof dateString === 'string') {
                return Math.floor(new Date(dateString).getTime() / 1000);
            }
            return dateString;
        }

        // Format elapsed time
        function formatElapsedTime(createdAtTimestamp) {
            const timestamp = parseDateToTimestamp(createdAtTimestamp);
            const now = Math.floor(Date.now() / 1000);
            const elapsed = now - timestamp;
            
            const hours = Math.floor(elapsed / 3600);
            const minutes = Math.floor((elapsed % 3600) / 60);
            const seconds = elapsed % 60;
            
            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            } else if (minutes > 0) {
                return `${minutes}m ${seconds}s`;
            } else {
                return `${seconds}s`;
            }
        }

        // Get age class for order card
        function getAgeClass(createdAtTimestamp) {
            const timestamp = parseDateToTimestamp(createdAtTimestamp);
            const now = Math.floor(Date.now() / 1000);
            const elapsed = now - timestamp;
            const minutes = Math.floor(elapsed / 60);
            
            if (minutes > 15) {
                return 'age-late';
            } else if (minutes > 5) {
                return 'age-normal';
            } else {
                return 'age-new';
            }
        }

        // Render order card HTML
        function renderOrderCard(order, statuses) {
            const createdAtTimestamp = parseDateToTimestamp(order.created_at);
            const elapsedTime = formatElapsedTime(createdAtTimestamp);
            const ageClass = getAgeClass(createdAtTimestamp);
            const now = Math.floor(Date.now() / 1000);
            const isLate = Math.floor((now - createdAtTimestamp) / 60) > 15;
            
            let itemsHtml = '';
            order.items.forEach(item => {
                let modifiersHtml = '';
                if (item.modifiers && item.modifiers.length > 0) {
                    modifiersHtml = '<div class="item-modifiers">';
                    item.modifiers.forEach(modifier => {
                        modifiersHtml += `
                            <div class="item-modifier">
                                <i class="fas fa-circle modifier-icon"></i>
                                ${modifier.quantity > 1 ? `<strong>${modifier.quantity}×</strong>` : ''}
                                ${modifier.name}
                                ${modifier.category ? `<span style="color: #707070; font-size: 14px;">(${modifier.category})</span>` : ''}
                            </div>
                        `;
                    });
                    modifiersHtml += '</div>';
                }
                
                const commentHtml = item.comment ? `
                    <div class="item-comment">${item.comment}</div>
                ` : '';
                
                itemsHtml += `
                    <div class="order-item">
                        <div class="item-header">
                            <div class="item-name">${item.name}</div>
                            <div class="item-quantity">${item.quantity}×</div>
                        </div>
                        ${modifiersHtml}
                        ${commentHtml}
                    </div>
                `;
            });
            
            let notesHtml = '';
            if (order.notes && order.notes.length > 0) {
                notesHtml = '<div class="order-notes"><div class="order-notes-title"><i class="fas fa-sticky-note"></i> Order Notes:</div>';
                order.notes.forEach(note => {
                    notesHtml += `<div class="order-note">${note.note}</div>`;
                });
                notesHtml += '</div>';
            }
            
            let statusButtonsHtml = '';
            if (canChangeStatus && statuses && Array.isArray(statuses)) {
                statuses.forEach(status => {
                    if (status.status_id != order.status_id) {
                        let displayName = status.status_name;
                        if (displayName === 'Canceled' || displayName === 'Cancelled') {
                            displayName = 'Cancel';
                        } else if (displayName === 'Preparation') {
                            displayName = 'Preparing';
                        }
                        
                        const statusClass = `status-${status.status_name.toLowerCase().replace(/\s+/g, '-')}`;
                        const buttonText = status.status_name === 'Canceled' || status.status_name === 'Cancelled' 
                            ? '<i class="fas fa-times"></i> Cancel' 
                            : status.status_name === 'Preparation' 
                            ? 'Preparing' 
                            : status.status_name;
                        statusButtonsHtml += `
                            <button 
                                class="status-btn ${statusClass}"
                                onclick="updateOrderStatus(${order.order_id}, ${status.status_id}, '${status.status_name}')">
                                ${buttonText}
                            </button>
                        `;
                    }
                });
            }
            
            return `
                <div class="order-card ${ageClass}" data-order-id="${order.order_id}">
                    <div class="order-header">
                        <div>
                            <div class="order-number">#${order.order_id}</div>
                            <div class="order-table">${order.order_type_name}</div>
                        </div>
                        <div class="order-time">
                            <span class="order-time-label">Time Elapsed</span>
                            <div class="order-elapsed ${isLate ? 'late' : ''}" data-created="${createdAtTimestamp}">
                                ${elapsedTime}
                            </div>
                        </div>
                    </div>
                    <div class="order-items">${itemsHtml}</div>
                    ${notesHtml}
                    ${statusButtonsHtml ? `<div class="order-status-buttons">${statusButtonsHtml}</div>` : ''}
                </div>
            `;
        }

        // Update orders display with new data
        function updateOrdersDisplay(orders) {
            const grid = document.getElementById('orders-grid');
            const orderCount = document.getElementById('order-count');
            
            if (!grid) return;
            
            orderCount.textContent = orders.length;

            if (orders.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <i class="fas fa-check-circle"></i>
                        <h2>All Caught Up!</h2>
                        <p>No active orders ${currentStationName ? 'for ' + currentStationName : 'in the kitchen'}</p>
                    </div>
                `;
                return;
            }

            const statuses = @json($statuses);
            
            grid.innerHTML = '';
            
            orders.forEach((order, index) => {
                try {
                    const cardHtml = renderOrderCard(order, statuses);
                    grid.insertAdjacentHTML('beforeend', cardHtml);
                } catch (error) {
                    console.error(`❌ Error rendering order ${order.order_id}:`, error);
                }
            });
            
            updateElapsedTimes();
        }

        // Update order status
        async function updateOrderStatus(orderId, statusId, statusName) {
            if (!confirm(`Update order #${orderId} to ${statusName}?`)) {
                return;
            }

            try {
                const updateUrl = '{{ admin_url("kitchendisplay/index") }}';
                
                const formData = new URLSearchParams();
                formData.append('_handler', 'onUpdateStatus');
                formData.append('order_id', orderId);
                formData.append('status_id', statusId);
                formData.append('station_slug', currentStationSlug);
                formData.append('station_name', currentStationName);
                
                const response = await fetch(updateUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': '{{ csrf_token() }}'
                    },
                    body: formData.toString()
                });

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
                    // Refresh orders to reflect changes
                    refreshOrders();
                } else {
                    alert('Failed to update status: ' + (data.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Failed to update status:', error);
                alert('Failed to update status: ' + error.message);
            }
        }


        // Initialize
        initNotificationSound();
        updateMuteButton();
        updateClock();
        updateElapsedTimes();
        
        // Set up intervals
        setInterval(updateClock, 1000);
        setInterval(updateElapsedTimes, 1000);
        
        // Start auto-refresh
        console.log('🔄 Starting auto-refresh...');
        refreshOrders();
        setInterval(refreshOrders, refreshInterval);

        // Enable audio on user interaction
        function enableAudioOnInteraction() {
            ensureAudioContext().then(isReady => {
                if (isReady) {
                    console.log('🔊 Audio enabled and ready');
                }
            });
        }
        
        ['click', 'touchstart', 'keydown'].forEach(eventType => {
            document.addEventListener(eventType, enableAudioOnInteraction, { once: true });
        });

        console.log('✅ Kitchen Display System initialized');
        console.log('📍 Station:', currentStationName || 'All Stations');
        console.log('🔄 Auto-refresh:', refreshInterval / 1000, 'seconds');
        console.log('🔔 Sound:', isMuted ? 'OFF' : 'ON');
    </script>
</body>
</html>
