@php
    use App\Helpers\SettingsHelper;
    use Admin\Facades\AdminAuth;
    $user = AdminAuth::getUser();
    $orderNotificationsEnabled = SettingsHelper::areOrderNotificationsEnabledForUser($user);
@endphp

<ul
    id="{{ $this->getId() }}"
    class="navbar-nav"
    data-control="mainmenu"
    data-alias="{{ $this->alias }}"
>
    @foreach ($items as $item)
        {!! $this->renderItemElement($item) !!}
        @if ($item->itemName === 'settings')
            <!-- Frontend Notifications Bell (positioned after settings gear) -->
            <li class="nav-item dropdown" id="notif-root">
              <a href="#" id="notifDropdown"
                 class="nav-link dropdown-toggle"
                 data-toggle="dropdown" 
                 aria-haspopup="true" 
                 aria-expanded="false" 
                 role="button">
                <i class="fa fa-bell" id="bell-icon" style="color: #6c757d;"></i>
                <span id="notification-count" class="badge badge-danger d-none" style="position: absolute; top: 5px; right: 5px; font-size: 9px; padding: 1px 4px; border-radius: 8px;">0</span>
              </a>

              <div class="dropdown-menu dropdown-menu-right p-0 shadow"
                   id="notification-panel"
                   aria-labelledby="notifDropdown">
                <div class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom gap-2" style="flex-wrap: nowrap;">
                  <div class="d-flex align-items-center gap-2" style="flex-shrink: 0;">
                    <strong class="mb-0">Statuses</strong>
                    <div class="form-check form-switch mb-0 notification-toggle">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="header-notification-toggle"
                        {{ $orderNotificationsEnabled ? 'checked' : '' }}
                      >
                    </div>
                  </div>
                  <div class="d-flex align-items-center gap-2" style="flex-shrink: 0; margin-left: auto;">
                    <button id="notif-note-btn" class="btn btn-light btn-sm" type="button" title="Add General Staff Note">
                      {{ __('Note') }}
                    </button>
                  <a id="notif-history-link" class="btn btn-light btn-sm" href="{{ url('/admin/history') }}">
                    {{ __('History') }}
                  </a>
                  </div>
                </div>

                <div id="notification-loading" class="px-3 py-4 text-muted d-none">Loading…</div>
                <div id="notification-error"   class="px-3 py-4 text-danger d-none">Failed to load.</div>
                <div id="notification-empty"   class="px-3 py-4 text-muted d-none">No notifications.</div>

                <div id="notification-list" class="list-group list-group-flush"></div>
              </div>
            </li>
            
            <script>
            // Make bell turn red when there are notifications
            function updateBellColor() {
                const bellIcon = document.getElementById('bell-icon');
                const countBadge = document.getElementById('notification-count');
                
                if (countBadge && bellIcon) {
                    const count = parseInt(countBadge.textContent) || 0;
                    if (count > 0) {
                        bellIcon.style.color = '#dc3545'; // Red color
                    } else {
                        bellIcon.style.color = '#6c757d'; // Gray color
                    }
                }
            }
            
            // Update bell color when page loads
            document.addEventListener('DOMContentLoaded', updateBellColor);
            
            // Update bell color when notification count changes
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        updateBellColor();
                    }
                });
            });
            
            // Start observing the notification count element
            const countElement = document.getElementById('notification-count');
            if (countElement) {
                observer.observe(countElement, { 
                    childList: true, 
                    characterData: true, 
                    subtree: true 
                });
            }

            const notifToggle = document.getElementById('header-notification-toggle');
            const notifToggleLabel = document.getElementById('header-notification-toggle-label');
            const updateToggleLabel = (enabled) => {
                if (notifToggleLabel) {
                    notifToggleLabel.textContent = enabled ? '{{ __('On') }}' : '{{ __('Off') }}';
                }
            };
            if (notifToggle) {
                updateToggleLabel(notifToggle.checked);
                notifToggle.addEventListener('change', function () {
                    const enabled = this.checked ? 1 : 0;
                    const formData = new FormData();
                    formData.append('_token', '{{ csrf_token() }}');
                    formData.append('_handler', 'onSaveOrderNotificationSettings');
                    formData.append('order_notifications_enabled', enabled);
                    this.disabled = true;
                    fetch('{{ admin_url('statuses') }}', {
                        method: 'POST',
                        headers: {'X-Requested-With': 'XMLHttpRequest'},
                        body: formData,
                        credentials: 'same-origin',
                    })
                    .then(response => {
                        if (!response.ok) throw new Error('Request failed');
                        try {
                            return response.json();
                        } catch (err) {
                            return {};
                        }
                    })
                    .then(() => {
                        updateToggleLabel(enabled === 1);
                    })
                    .catch(() => {
                        this.checked = !this.checked;
                        updateToggleLabel(this.checked);
                        alert('Unable to update notification setting. Please try again.');
                    })
                    .finally(() => {
                        this.disabled = false;
                    });
                });
            }

            // Handle general staff note button click
            const notifNoteBtn = document.getElementById('notif-note-btn');
            if (notifNoteBtn) {
                notifNoteBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const $ = window.jQuery || window.$;
                    if ($) {
                        $('#addGeneralStaffNoteModal').modal('show');
                    }
                });
            }
            </script>

            <!-- General Staff Note Modal -->
            <div class="modal fade" id="addGeneralStaffNoteModal" tabindex="-1" role="dialog" aria-labelledby="addGeneralStaffNoteModalLabel" aria-hidden="true">
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="addGeneralStaffNoteModalLabel">
                                <i class="fa fa-sticky-note"></i> Add General Staff Note
                            </h5>
                            <button type="button" class="close" data-bs-dismiss="modal" aria-label="Close" onclick="$('#addGeneralStaffNoteModal').modal('hide');">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <form id="addGeneralStaffNoteForm" onsubmit="return false;">
                            <div class="modal-body">
                                <div class="form-group">
                                    <label for="generalStaffNoteText">Note <span class="text-danger">*</span></label>
                                    <textarea 
                                        class="form-control" 
                                        id="generalStaffNoteText" 
                                        name="note" 
                                        rows="4" 
                                        required 
                                        placeholder="Enter your general note here..."
                                    ></textarea>
                                    <small class="form-text text-muted">
                                        This note will be visible to all staff members and shown as a push notification.
                                    </small>
                                </div>
                                
                                <!-- Suggestion Buttons Container -->
                                <div class="form-group" id="note-suggestions-container" style="display: none;">
                                    <label class="mb-2" style="font-size: 13px; color: #6c757d; font-weight: 500;">Quick Suggestions:</label>
                                    <div id="note-suggestions-buttons" class="d-flex flex-wrap gap-2" style="margin-top: 8px;">
                                        <!-- Suggestion buttons will be dynamically inserted here -->
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" onclick="$('#addGeneralStaffNoteModal').modal('hide');">Cancel</button>
                                <button 
                                    type="button" 
                                    id="generalStaffNoteSubmitBtn"
                                    class="btn btn-primary"
                                    data-request="onAddGeneralStaffNote"
                                >
                                    <i class="fa fa-save"></i> Save Note
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <script>
            // Initialize general staff note modal
            (function() {
                function initGeneralStaffNoteModal() {
                    var $ = window.jQuery || window.$;
                    if (!$) {
                        setTimeout(initGeneralStaffNoteModal, 100);
                        return;
                    }
                    
                    // Initialize modal properly
                    $('#addGeneralStaffNoteModal').on('shown.bs.modal', function() {
                        $('#generalStaffNoteText').focus();
                        
                        // Load and display suggestion sentences
                        loadNoteSuggestions();
                    });
                    
                    // Clear form when modal is hidden
                    $('#addGeneralStaffNoteModal').on('hidden.bs.modal', function() {
                        $('#generalStaffNoteText').val('');
                        $('#note-suggestions-container').hide();
                    });
                    
                    // Function to load note suggestions from API
                    function loadNoteSuggestions() {
                        fetch('/admin/notifications-api/note-suggestions', {
                            method: 'GET',
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest',
                                'X-CSRF-TOKEN': '{{ csrf_token() }}'
                            },
                            credentials: 'same-origin'
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Failed to load suggestions');
                            }
                            return response.json();
                        })
                        .then(data => {
                            if (data.ok && data.suggestions && data.suggestions.length > 0) {
                                displayNoteSuggestions(data.suggestions);
                            } else {
                                $('#note-suggestions-container').hide();
                            }
                        })
                        .catch(error => {
                            console.error('Error loading note suggestions:', error);
                            $('#note-suggestions-container').hide();
                        });
                    }
                    
                    // Function to display suggestion buttons
                    function displayNoteSuggestions(suggestions) {
                        var $container = $('#note-suggestions-buttons');
                        $container.empty();
                        
                        if (suggestions.length === 0) {
                            $('#note-suggestions-container').hide();
                            return;
                        }
                        
                        suggestions.forEach(function(suggestion) {
                            if (suggestion && suggestion.trim()) {
                                var $btn = $('<button>')
                                    .attr('type', 'button')
                                    .addClass('btn btn-sm suggestion-btn')
                                    .text(suggestion.trim())
                                    .css({
                                        'background-color': '#f8f9fa',
                                        'border': '1px solid #dee2e6',
                                        'color': '#495057',
                                        'font-size': '12px',
                                        'padding': '6px 12px',
                                        'border-radius': '6px',
                                        'white-space': 'nowrap',
                                        'transition': 'all 0.2s ease',
                                        'cursor': 'pointer'
                                    })
                                    .hover(
                                        function() {
                                            $(this).css({
                                                'background-color': '#e9ecef',
                                                'border-color': '#adb5bd',
                                                'transform': 'translateY(-1px)',
                                                'box-shadow': '0 2px 4px rgba(0,0,0,0.1)'
                                            });
                                        },
                                        function() {
                                            $(this).css({
                                                'background-color': '#f8f9fa',
                                                'border-color': '#dee2e6',
                                                'transform': 'translateY(0)',
                                                'box-shadow': 'none'
                                            });
                                        }
                                    )
                                    .on('click', function(e) {
                                        e.preventDefault();
                                        var currentText = $('#generalStaffNoteText').val().trim();
                                        var newText = suggestion.trim();
                                        
                                        // If there's existing text, add a space before the suggestion
                                        if (currentText && !currentText.endsWith('.')) {
                                            newText = ' ' + newText;
                                        }
                                        
                                        // Append suggestion to textarea
                                        $('#generalStaffNoteText').val(currentText + newText);
                                        
                                        // Focus back to textarea
                                        $('#generalStaffNoteText').focus();
                                        
                                        // Move cursor to end
                                        var textarea = document.getElementById('generalStaffNoteText');
                                        if (textarea) {
                                            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                                        }
                                    });
                                
                                $container.append($btn);
                            }
                        });
                        
                        // Show the container
                        $('#note-suggestions-container').show();
                    }
                    
                    // Handle save note button click
                    $('#generalStaffNoteSubmitBtn').off('click.saveGeneralNote').on('click.saveGeneralNote', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        var $btn = $(this);
                        var noteText = $('#generalStaffNoteText').val().trim();
                        
                        if (!noteText) {
                            alert('Please enter a note');
                            $('#generalStaffNoteText').focus();
                            return false;
                        }
                        
                        // Disable button and show loading
                        $btn.prop('disabled', true);
                        var originalText = $btn.html();
                        $btn.html('<i class="fa fa-spinner fa-spin"></i> Saving...');
                        
                        // Make direct AJAX call to the notifications API
                        fetch('/admin/notifications-api/general-staff-note', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                                'X-CSRF-TOKEN': '{{ csrf_token() }}'
                            },
                            body: JSON.stringify({ note: noteText }),
                            credentials: 'same-origin'
                        })
                        .then(response => {
                            if (!response.ok) {
                                return response.json().then(err => { throw err; });
                            }
                            return response.json();
                        })
                        .then(data => {
                            if (!data.ok) {
                                throw new Error(data.error || 'Failed to save note');
                            }
                            
                            // Close modal
                            $('#addGeneralStaffNoteModal').modal('hide');
                            
                            // Clear form
                            $('#generalStaffNoteText').val('');
                            
                            // Show platform flash message (slides from top) - use window.jQuery to ensure it's available
                            var jQuery = window.jQuery || window.$;
                            if (jQuery && jQuery.ti && jQuery.ti.flashMessage) {
                                jQuery.ti.flashMessage({
                                    class: 'success',
                                    text: data.message || 'Note added successfully!',
                                    interval: 5,
                                    allowDismiss: true
                                });
                            } else {
                                // Fallback: alert
                                alert(data.message || 'Note added successfully!');
                            }
                            
                            // Refresh notification count and list
                            setTimeout(function() {
                                if (typeof refreshCount === 'function') {
                                    refreshCount();
                                }
                                // Also reload the notification list if dropdown is open
                                if (typeof loadList === 'function') {
                                    loadList();
                                }
                            }, 500);
                        })
                        .catch(error => {
                            console.error('Error saving general staff note:', error);
                            var errorMsg = (error && error.error) ? error.error : ((error && error.message) ? error.message : 'Failed to save note. Please try again.');
                            
                            // Show error flash message
                            var jQuery = window.jQuery || window.$;
                            if (jQuery && jQuery.ti && jQuery.ti.flashMessage) {
                                jQuery.ti.flashMessage({
                                    class: 'danger',
                                    text: errorMsg,
                                    interval: 5,
                                    allowDismiss: true
                                });
                            } else {
                                alert(errorMsg);
                            }
                        })
                        .finally(() => {
                            // Re-enable button
                            $btn.prop('disabled', false);
                            $btn.html(originalText);
                        });
                        
                        return false;
                    });
                }
                
                // Initialize when DOM is ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', initGeneralStaffNoteModal);
                } else {
                    initGeneralStaffNoteModal();
                }
                
                // Also try after delays
                setTimeout(initGeneralStaffNoteModal, 500);
                setTimeout(initGeneralStaffNoteModal, 1000);
            })();
            </script>

            <style>
            /* General Staff Note Modal styling - matches order note modal */
            #addGeneralStaffNoteModal .modal-dialog {
                max-width: 600px;
            }

            #addGeneralStaffNoteModal .modal-header {
                background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                border-bottom: 2px solid #e5e9f2;
            }

            #addGeneralStaffNoteModal .modal-title {
                color: #364a63;
                font-weight: 600;
            }

            #addGeneralStaffNoteModal .modal-title i {
                color: #08815e;
                margin-right: 8px;
            }

            #addGeneralStaffNoteModal textarea {
                border: 2px solid #e5e9f2;
                border-radius: 8px;
                font-size: 14px;
                transition: border-color 0.3s ease;
            }

            #addGeneralStaffNoteModal textarea:focus {
                border-color: #08815e;
                box-shadow: 0 0 0 0.2rem rgba(8, 129, 94, 0.1);
            }

            #addGeneralStaffNoteModal .btn-primary {
                background: #08815e;
                border-color: #08815e;
                color: #ffffff;
            }

            #addGeneralStaffNoteModal .btn-primary:hover {
                background: #066d4f;
                border-color: #066d4f;
            }

            /* Note and History buttons styling - EXACTLY the same, match Note button */
            #notification-panel #notif-note-btn,
            #notification-panel #notif-history-link {
                background: #f1f4fb !important;
                border: 1px solid #c9d2e3 !important;
                color: #202938 !important;
                font-weight: 600 !important;
                padding: 8px 20px !important; /* Same padding as Note button */
                border-radius: 20px !important;
                transition: all 0.2s ease !important;
                font-size: 13px !important;
                text-transform: uppercase !important;
                width: 90px !important;
                height: 36px !important;
                text-align: center !important;
                text-decoration: none !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                line-height: 1 !important;
                box-sizing: border-box !important;
                margin: 0 !important;
                vertical-align: middle !important;
            }
            
            /* History button - consistent padding with Note button */
            #notification-panel #notif-history-link {
                padding: 8px 20px !important; /* Consistent padding with Note button */
            }

            #notification-panel #notif-note-btn:hover,
            #notification-panel #notif-note-btn:focus,
            #notification-panel #notif-history-link:hover,
            #notification-panel #notif-history-link:focus {
                background: #f3f4f6 !important; /* Subtle gray instead of light blue */
                border-color: #d1d5db !important; /* Darker gray border */
                color: #202938 !important;
                transform: scale(1.02) !important; /* Subtle scale */
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important; /* Subtle shadow */
                text-decoration: none !important;
            }

            /* Force header to stay on one line - override any other styles with maximum specificity */
            #notification-panel .border-bottom.d-flex.justify-content-between {
                flex-wrap: nowrap !important;
                display: flex !important;
                align-items: center !important;
                overflow: visible !important;
            }
            
            /* Override any flex-wrap from other CSS */
            #notification-panel .border-bottom[style*="flex-wrap"] {
                flex-wrap: nowrap !important;
            }
            
            /* Ensure the buttons container is properly positioned and aligned */
            #notification-panel .d-flex.justify-content-between {
                align-items: center !important;
            }
            
            /* Target the actual buttons container (last direct child div) - proper spacing */
            #notification-panel .border-bottom > div:last-child.d-flex {
                margin-left: 0 !important; /* Remove negative margin to prevent overlap */
                margin-right: 0 !important;
                display: flex !important;
                align-items: center !important;
                flex-shrink: 0 !important;
                white-space: nowrap !important;
                min-width: 0 !important;
            }
            
            /* Reduce gap between statuses and buttons to minimum */
            #notification-panel .border-bottom {
                gap: 4px !important; /* Very small gap in the flex container */
            }
            
            /* Ensure left div doesn't shrink */
            #notification-panel .border-bottom > div:first-child.d-flex {
                flex-shrink: 0 !important;
                white-space: nowrap !important;
                min-width: 0 !important;
            }
            
            /* CRITICAL: Maximum specificity to force nowrap - must be last to override everything */
            #notification-panel .dropdown-menu .border-bottom.d-flex.justify-content-between.px-3.py-2 {
                flex-wrap: nowrap !important;
            }
            
            /* Fix double scrollbar - remove overflow from notification-list, only keep on panel */
            #notification-panel {
                overflow-y: auto !important;
                overflow-x: hidden !important;
            }
            
            #notification-panel #notification-list {
                overflow: visible !important;
                max-height: none !important;
            }
            
            #notification-panel #notification-loading,
            #notification-panel #notification-error,
            #notification-panel #notification-empty {
                overflow: visible !important;
            }
            
            /* Make scrollbar smaller and tighter */
            #notification-panel::-webkit-scrollbar {
                width: 4px !important; /* Smaller scrollbar */
            }
            
            #notification-panel::-webkit-scrollbar-track {
                background: transparent !important;
                border-radius: 2px !important;
            }
            
            #notification-panel::-webkit-scrollbar-thumb {
                background: #c9d2e3 !important;
                border-radius: 2px !important;
            }
            
            #notification-panel::-webkit-scrollbar-thumb:hover {
                background: #b8c6dd !important;
            }
            
            /* Firefox scrollbar */
            #notification-panel {
                scrollbar-width: thin !important;
                scrollbar-color: #c9d2e3 transparent !important;
            }
            
            /* Note Suggestion Buttons Styling */
            #addGeneralStaffNoteModal .suggestion-btn {
                background-color: #f0f4f8 !important; /* Ice/white color */
                border: 1px solid #d1d9e6 !important;
                color: #2d3748 !important;
                font-size: 12px !important;
                padding: 6px 14px !important;
                border-radius: 8px !important;
                white-space: nowrap !important;
                transition: all 0.2s ease !important;
                cursor: pointer !important;
                font-weight: 500 !important;
                margin: 2px !important;
            }
            
            #addGeneralStaffNoteModal .suggestion-btn:hover {
                background-color: #e2e8f0 !important;
                border-color: #a0aec0 !important;
                color: #1a202c !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
            }
            
            #addGeneralStaffNoteModal .suggestion-btn:active {
                transform: translateY(0) !important;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
            }
            
            #addGeneralStaffNoteModal #note-suggestions-container {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #e5e9f2;
            }
            
            #addGeneralStaffNoteModal #note-suggestions-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            </style>
        @endif
    @endforeach
</ul>
