<ul
    id="<?php echo e($this->getId()); ?>"
    class="navbar-nav"
    data-control="mainmenu"
    data-alias="<?php echo e($this->alias); ?>"
>
    <?php $__currentLoopData = $items; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <?php echo $this->renderItemElement($item); ?>

        <?php if($item->itemName === 'settings'): ?>
            <!-- Frontend Notifications Bell (positioned after settings gear) -->
            <li class="nav-item dropdown" id="notif-root" style="position: relative;">
              <a href="#" id="notifDropdown"
                 class="nav-link dropdown-toggle"
                 data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" role="button">
                <i class="fa fa-bell" id="bell-icon" style="color: #6c757d;"></i>
                <span id="notification-count" class="badge badge-danger d-none" style="position: absolute; top: 5px; right: 5px; font-size: 9px; padding: 1px 4px; border-radius: 8px;">0</span>
              </a>

              <div class="dropdown-menu dropdown-menu-right p-0 shadow"
                   id="notification-panel"
                   aria-labelledby="notifDropdown"
                   style="min-width:420px; max-height:70vh; overflow:auto; z-index:1051;">
                <div class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
                  <strong>Notifications</strong>
                  <a id="notif-history-link" class="btn btn-light btn-sm" href="<?php echo e(url('/admin/history')); ?>">
                    <?php echo e(__('History')); ?>

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
            </script>
        <?php endif; ?>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
</ul>
<?php /**PATH /Users/amir/Downloads/paymydine-main-22/app/admin/widgets/menu/top_menu.blade.php ENDPATH**/ ?>