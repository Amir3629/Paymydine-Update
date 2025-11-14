@php
    use App\Helpers\SettingsHelper;
    $orderNotificationsEnabled = SettingsHelper::areOrderNotificationsEnabled();
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
                <div class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom gap-2 flex-wrap">
                  <div class="d-flex align-items-center gap-2 flex-wrap">
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
                  <a id="notif-history-link" class="btn btn-light btn-sm" href="{{ url('/admin/history') }}">
                    {{ __('History') }}
                  </a>
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
            </script>
        @endif
    @endforeach
</ul>
