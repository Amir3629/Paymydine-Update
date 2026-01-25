@php
    // Get the current value from the form widget
    $fieldValue = $field->value ?? 'doorbell';
    $fieldName = $field->getName();
    
    // Available sounds with descriptions
    $sounds = [
        'doorbell' => 'Doorbell (Ding-Dong)',
        'chime' => 'Gentle Chime',
        'bell' => 'Classic Bell',
        'alert' => 'Alert Beep',
        'notification' => 'Modern Notification',
        'ding' => 'Single Ding',
        'double-beep' => 'Double Beep',
        'triple-beep' => 'Triple Beep',
        'whoosh' => 'Whoosh',
        'pop' => 'Pop',
        'success' => 'Success (Ascending)',
        'warning' => 'Warning (Descending)',
    ];
@endphp

@once
<style>
    .kds-sound-selector {
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
    }
    
    .sound-select-wrapper {
        display: flex;
        gap: 15px;
        align-items: flex-start;
        margin-top: 10px;
    }
    
    .sound-select-wrapper select {
        flex: 1;
        padding: 10px 15px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        background: #fff;
    }
    
    .test-sound-btn {
        padding: 12px 20px;
        background: rgb(241, 244, 251) !important;
        color: rgb(32, 41, 56) !important;
        border: 1px solid rgb(201, 210, 227) !important;
        border-radius: 12px !important;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
        white-space: nowrap;
        box-shadow: none !important;
        height: 48px !important;
        min-height: 48px !important;
        line-height: 1.5 !important;
    }
    
    .test-sound-btn:hover {
        background: rgb(233, 236, 243) !important;
        border-color: rgb(201, 210, 227) !important;
        color: rgb(32, 41, 56) !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
    }
    
    .test-sound-btn:active {
        background: rgb(225, 230, 240) !important;
        transform: translateY(0);
    }
    
    .test-sound-btn i {
        font-size: 16px;
        color: rgb(32, 41, 56) !important;
    }
    
    .sound-description {
        margin-top: 8px;
        font-size: 12px;
        color: #666;
        font-style: italic;
    }
</style>
@endonce

<div class="kds-sound-selector">
    <label class="control-label">
        Notification Sound
        <span class="help-block">Select the sound that will play when new orders arrive in the Kitchen Display System.</span>
    </label>
    
    <div class="sound-select-wrapper">
        <select 
            name="{{ $fieldName }}" 
            id="kds-sound-select"
            class="form-control"
        >
            @foreach($sounds as $key => $label)
                <option value="{{ $key }}" {{ $fieldValue === $key ? 'selected' : '' }}>
                    {{ $label }}
                </option>
            @endforeach
        </select>
        
        <button type="button" class="test-sound-btn" id="test-kds-sound-btn" onclick="testKDSSound()">
            <i class="fas fa-volume-up"></i>
            <span>Test Sound</span>
        </button>
    </div>
    
    <div class="sound-description" id="sound-description">
        Preview the selected sound before saving.
    </div>
</div>

@once
<script>
    let kdsAudioContext = null;
    let kdsAudioContextInitialized = false;
    
    // Initialize audio context
    function initKDSAudio() {
        try {
            if (!kdsAudioContext) {
                kdsAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            kdsAudioContextInitialized = true;
        } catch (e) {
            console.warn('Audio context initialization failed:', e);
            kdsAudioContextInitialized = false;
        }
    }
    
    // Ensure audio context is ready
    async function ensureKDSAudio() {
        if (!kdsAudioContext) {
            initKDSAudio();
        }
        if (kdsAudioContext && kdsAudioContext.state === 'suspended') {
            try {
                await kdsAudioContext.resume();
            } catch (e) {
                console.warn('Failed to resume audio context:', e);
            }
        }
        return kdsAudioContext && kdsAudioContext.state === 'running';
    }
    
    // Helper function to play a tone
    function playTone(freq, startTime, duration, type = 'sine', volume = 0.5) {
        if (!kdsAudioContext) return;
        
        const osc = kdsAudioContext.createOscillator();
        const gain = kdsAudioContext.createGain();
        osc.frequency.value = freq;
        osc.type = type;
        osc.connect(gain);
        gain.connect(kdsAudioContext.destination);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
    }
    
    // Sound Library - All available notification sounds
    const kdsSoundLibrary = {
        'doorbell': function(now) {
            // Doorbell: ding-dong pattern
            playTone(800, now, 0.2);      // Ding (higher)
            playTone(600, now + 0.15, 0.3); // Dong (lower)
        },
        'chime': function(now) {
            // Gentle chime
            playTone(523.25, now, 0.3);      // C5
            playTone(659.25, now + 0.2, 0.3); // E5
            playTone(783.99, now + 0.4, 0.4); // G5
        },
        'bell': function(now) {
            // Classic bell sound
            playTone(880, now, 0.4, 'sine', 0.6);
            playTone(1320, now + 0.1, 0.3, 'sine', 0.4);
        },
        'alert': function(now) {
            // Alert beep
            playTone(800, now, 0.1);
            playTone(800, now + 0.15, 0.1);
        },
        'notification': function(now) {
            // Modern notification
            playTone(800, now, 0.15);
            playTone(1000, now + 0.1, 0.2);
        },
        'ding': function(now) {
            // Single ding
            playTone(800, now, 0.3);
        },
        'double-beep': function(now) {
            // Double beep
            playTone(600, now, 0.1);
            playTone(600, now + 0.2, 0.1);
        },
        'triple-beep': function(now) {
            // Triple beep
            playTone(600, now, 0.1);
            playTone(600, now + 0.15, 0.1);
            playTone(600, now + 0.3, 0.1);
        },
        'whoosh': function(now) {
            // Whoosh sound (frequency sweep)
            const osc = kdsAudioContext.createOscillator();
            const gain = kdsAudioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
            osc.connect(gain);
            gain.connect(kdsAudioContext.destination);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        },
        'pop': function(now) {
            // Pop sound
            playTone(400, now, 0.05, 'square', 0.3);
        },
        'success': function(now) {
            // Success sound (ascending)
            playTone(523.25, now, 0.15);      // C5
            playTone(659.25, now + 0.15, 0.15); // E5
            playTone(783.99, now + 0.3, 0.2); // G5
        },
        'warning': function(now) {
            // Warning sound (descending)
            playTone(783.99, now, 0.15);      // G5
            playTone(659.25, now + 0.15, 0.15); // E5
            playTone(523.25, now + 0.3, 0.2); // C5
        }
    };
    
    // Play the selected sound
    async function testKDSSound() {
        const select = document.getElementById('kds-sound-select');
        const selectedSound = select.value;
        
        console.log('🔔 Testing sound:', selectedSound);
        
        // Ensure audio context is ready
        const isReady = await ensureKDSAudio();
        
        if (!kdsAudioContext || !kdsAudioContextInitialized) {
            alert('Audio is not available. Please click anywhere on the page first to enable audio, then try again.');
            return;
        }
        
        if (kdsAudioContext.state !== 'running') {
            try {
                await kdsAudioContext.resume();
            } catch (e) {
                console.error('Failed to resume audio context:', e);
                alert('Audio is not ready. Please try clicking the button again.');
                return;
            }
        }
        
        try {
            const now = kdsAudioContext.currentTime;
            const soundFunction = kdsSoundLibrary[selectedSound];
            
            if (soundFunction) {
                soundFunction(now);
                console.log('✅ Sound played successfully');
            } else {
                console.error('Sound function not found:', selectedSound);
            }
        } catch (e) {
            console.error('Sound playback failed:', e);
            alert('Failed to play sound. Please check the browser console for details.');
        }
    }
    
    // Initialize audio on page load
    initKDSAudio();
    
    // Enable audio on any user interaction
    ['click', 'touchstart', 'keydown'].forEach(eventType => {
        document.addEventListener(eventType, function enableAudio() {
            ensureKDSAudio();
            document.removeEventListener(eventType, enableAudio);
        }, { once: true });
    });
    
    // Update description when sound changes
    document.getElementById('kds-sound-select').addEventListener('change', function() {
        const descriptions = {
            'doorbell': 'Classic doorbell ding-dong sound',
            'chime': 'Gentle three-tone chime',
            'bell': 'Traditional bell ring',
            'alert': 'Quick double beep alert',
            'notification': 'Modern two-tone notification',
            'ding': 'Simple single ding',
            'double-beep': 'Two quick beeps',
            'triple-beep': 'Three quick beeps',
            'whoosh': 'Swooshing sound effect',
            'pop': 'Quick pop sound',
            'success': 'Ascending success melody',
            'warning': 'Descending warning melody'
        };
        
        const desc = descriptions[this.value] || 'Preview the selected sound before saving.';
        document.getElementById('sound-description').textContent = desc;
    });
</script>
@endonce

