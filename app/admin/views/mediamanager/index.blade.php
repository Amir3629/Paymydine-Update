<div class="row-fluid">
    {!! $this->widgets['mediamanager']->render() !!}
</div>

{{-- Manually load MediaManager assets since get_script_tags() is commented out --}}
{{-- Wait for jQuery to be available first --}}
<script>
(function() {
    function waitForJQuery(callback, maxAttempts) {
        maxAttempts = maxAttempts || 50;
        var attempts = 0;
        
        function check() {
            attempts++;
            if (typeof jQuery !== 'undefined') {
                callback();
            } else if (attempts < maxAttempts) {
                setTimeout(check, 100);
            } else {
                console.error('❌ jQuery not found after 5 seconds');
            }
        }
        check();
    }
    
    function loadScriptWithError(src, callback) {
        // Check if already loaded
        if (document.querySelector('script[src="' + src + '"]')) {
            console.log('Script already loaded:', src);
            if (callback) setTimeout(callback, 50);
            return;
        }
        
        var script = document.createElement('script');
        script.src = src;
        script.onload = function() {
            console.log('✅ Loaded:', src.split('/').pop());
            if (callback) setTimeout(callback, 50);
        };
        script.onerror = function() {
            console.error('❌ Failed to load:', src);
            if (callback) setTimeout(callback, 50);
        };
        document.head.appendChild(script);
    }
    
    // Wait for jQuery, then load scripts
    waitForJQuery(function() {
        console.log('✅ jQuery is available, loading MediaManager scripts...');
        
        // Load scripts in order
        loadScriptWithError('{{ asset("app/main/widgets/mediamanager/assets/vendor/dropzone/dropzone.min.js") }}', function() {
            console.log('Dropzone check:', typeof Dropzone !== 'undefined' ? '✅ Available' : '❌ Missing');
            
            loadScriptWithError('{{ asset("app/main/widgets/mediamanager/assets/vendor/treeview/bootstrap-treeview.min.js") }}', function() {
                loadScriptWithError('{{ asset("app/main/widgets/mediamanager/assets/vendor/selectonic/selectonic.min.js") }}', function() {
                    loadScriptWithError('{{ asset("app/main/widgets/mediamanager/assets/js/mediamanager.js") }}', function() {
                        console.log('MediaManager.js loaded');
                        console.log('Plugin check:', typeof jQuery.fn.mediaManager !== 'undefined' ? '✅ Available' : '❌ Missing');
                        
                        loadScriptWithError('{{ asset("app/main/widgets/mediamanager/assets/js/mediamanager.modal.js") }}', function() {
                            console.log('✅ All MediaManager scripts loaded');
                            
                            // Final check
                            setTimeout(function() {
                                if (typeof jQuery !== 'undefined' && typeof jQuery.fn.mediaManager !== 'undefined') {
                                    console.log('✅✅✅ MediaManager plugin is AVAILABLE!');
                                } else {
                                    console.error('❌❌❌ MediaManager plugin still NOT available');
                                    console.log('jQuery available:', typeof jQuery !== 'undefined');
                                    console.log('jQuery.fn available:', typeof jQuery !== 'undefined' && typeof jQuery.fn !== 'undefined');
                                    if (typeof jQuery !== 'undefined' && typeof jQuery.fn !== 'undefined') {
                                        console.log('Available jQuery plugins:', Object.keys(jQuery.fn).filter(function(k) {
                                            return k.toLowerCase().indexOf('media') !== -1;
                                        }));
                                    }
                                }
                            }, 200);
                        });
                    });
                });
            });
        });
    });
})();
</script>

{{-- Ensure MediaManager initializes after scripts load --}}
<script>
(function() {
    var initAttempts = 0;
    var maxAttempts = 100; // 10 seconds max
    
    function initMediaManager() {
        initAttempts++;
        
        if (typeof jQuery === 'undefined') {
            if (initAttempts < maxAttempts) {
                setTimeout(initMediaManager, 100);
            } else {
                console.error('❌ jQuery not available after 10 seconds');
            }
            return;
        }
        
        if (typeof jQuery.fn.mediaManager === 'undefined') {
            if (initAttempts < maxAttempts) {
                // Only log every 10 attempts to reduce spam
                if (initAttempts % 10 === 0) {
                    console.log('⏳ Waiting for MediaManager plugin... (attempt ' + initAttempts + ')');
                }
                setTimeout(initMediaManager, 100);
            } else {
                console.error('❌ MediaManager plugin not available after 10 seconds');
                console.log('Available jQuery plugins:', Object.keys(jQuery.fn).filter(function(k) {
                    return k.toLowerCase().indexOf('media') !== -1 || k.toLowerCase().indexOf('drop') !== -1;
                }));
            }
            return;
        }
        
        if (typeof Dropzone === 'undefined') {
            if (initAttempts < maxAttempts) {
                console.log('⏳ Waiting for Dropzone...');
                setTimeout(initMediaManager, 100);
            } else {
                console.error('❌ Dropzone not available after 10 seconds');
            }
            return;
        }
        
        // All requirements met, initialize!
        console.log('✅ All requirements met, initializing MediaManager...');
        
        // Find all MediaManager elements and initialize them
        jQuery('[data-control="media-manager"]').each(function() {
            var $mm = jQuery(this);
            if (!$mm.data('ti.mediaManager')) {
                try {
                    $mm.mediaManager();
                    console.log('✅ MediaManager initialized on page');
                    
                    // Verify upload button and Dropzone
                    var instance = $mm.data('ti.mediaManager');
                    if (instance) {
                        setTimeout(function() {
                            if (instance.dropzone) {
                                console.log('✅✅✅ Dropzone initialized - upload button should work!');
                            } else {
                                console.warn('⚠️ Dropzone not initialized, trying to initialize manually...');
                                if (typeof instance.initUploader === 'function') {
                                    try {
                                        instance.initUploader();
                                        console.log('✅ Uploader manually initialized');
                                    } catch (e) {
                                        console.error('❌ Failed to manually initialize uploader:', e);
                                    }
                                } else {
                                    console.error('❌ initUploader method not found');
                                }
                            }
                        }, 500);
                    } else {
                        console.error('❌ MediaManager instance not found after initialization');
                    }
                } catch (e) {
                    console.error('❌ Failed to initialize MediaManager:', e);
                    console.error('Error stack:', e.stack);
                }
            } else {
                console.log('MediaManager already initialized');
            }
        });
    }
    
    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initMediaManager, 500); // Wait a bit for scripts to load
        });
    } else {
        setTimeout(initMediaManager, 500);
    }
})();
</script>
