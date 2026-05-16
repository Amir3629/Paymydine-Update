(function () {
  'use strict';

  var BASE = '/app/admin/assets/vendor/pmd-mediafix/';
  var loaded = {};

  function log() {
    if (window.console) console.log.apply(console, arguments);
  }

  function warn() {
    if (window.console) console.warn.apply(console, arguments);
  }

  function loadScript(src, check, done) {
    if (check && check()) {
      done && done();
      return;
    }

    if (loaded[src]) {
      setTimeout(function () { done && done(); }, 100);
      return;
    }

    loaded[src] = true;

    var existing = document.querySelector('script[data-pmd-native-src="' + src + '"]');
    if (existing) {
      existing.addEventListener('load', function () { done && done(); });
      setTimeout(function () { done && done(); }, 200);
      return;
    }

    var s = document.createElement('script');
    s.src = src + '?v=' + Date.now();
    s.async = false;
    s.setAttribute('data-pmd-native-src', src);
    s.onload = function () {
      log('[PMD Native MediaFix] Loaded:', src);
      done && done();
    };
    s.onerror = function () {
      warn('[PMD Native MediaFix] Could not load:', src);
      done && done();
    };

    document.head.appendChild(s);
  }

  function installInputmaskNoop() {
    if (window.jQuery && !jQuery.fn.inputmask) {
      jQuery.fn.inputmask = function () {
        return this;
      };
      warn('[PMD Native MediaFix] inputmask missing - noop fallback installed');
    }
  }

  function installSafeSelectonicFallback() {
    if (!window.jQuery) return;

    if (jQuery.fn.selectonic) {
      return;
    }

    warn('[PMD Native MediaFix] selectonic missing - SAFE single-select fallback installed');

    jQuery.fn.selectonic = function (optionsOrMethod) {
      var args = Array.prototype.slice.call(arguments, 1);

      if (typeof optionsOrMethod === 'string') {
        if (optionsOrMethod === 'destroy') {
          return this.off('.pmdSelectonic').removeData('pmd.selectonic');
        }

        if (optionsOrMethod === 'refresh') {
          return this;
        }

        if (optionsOrMethod === 'select') {
          return this.each(function () {
            var $root = jQuery(this);
            var $item = args[0] ? jQuery(args[0]) : $root.find('.media-item, li, .list-group-item').first();
            $root.find('.selected, .active').removeClass('selected active').removeAttr('aria-selected');
            $item.addClass('selected active').attr('aria-selected', 'true');
            $root.trigger('selectonic-select', [$item.get(0)]);
            $root.trigger('change');
          });
        }

        return this;
      }

      var options = optionsOrMethod || {};

      return this.each(function () {
        var $root = jQuery(this);

        if ($root.data('pmd.selectonic')) {
          return;
        }

        $root.data('pmd.selectonic', {
          options: options
        });

        $root
          .attr('tabindex', $root.attr('tabindex') || '0')
          .off('click.pmdSelectonic')
          .on('click.pmdSelectonic', '.media-item, .list-group-item, li, a, .thumbnail, [data-media-id], [data-id], [data-path], [data-media-item]', function (e) {
            var $clicked = jQuery(this);

            if (
              $clicked.closest('.media-toolbar, .modal-footer, .breadcrumb, .dropdown-menu, .pagination').length ||
              $clicked.is('button, input, select, textarea') ||
              $clicked.closest('button, input, select, textarea').length
            ) {
              return;
            }

            var $item = $clicked.closest('.media-item, .list-group-item, li, [data-media-item]');
            if (!$item.length) {
              $item = $clicked;
            }

            // Ignore folder tree and breadcrumbs. We only want actual media-list items.
            if (!$item.closest('.media-list').length) {
              return;
            }

            e.preventDefault();
            e.stopPropagation();

            // Important: single select only.
            $root.find('.selected, .active').removeClass('selected active').removeAttr('aria-selected');
            $item.addClass('selected active').attr('aria-selected', 'true');

            $root.trigger('selectonic-select', [$item.get(0)]);
            $root.trigger('change');
          });
      });
    };
  }

  function loadLateDeps(done) {
    var files = [
      {
        src: BASE + 'moment.min.js',
        check: function () { return !!window.moment; }
      },
      {
        src: BASE + 'tempusdominus-bootstrap-4.min.js',
        check: function () { return window.jQuery && !!jQuery.fn.datetimepicker; }
      },
      {
        src: BASE + 'bootstrap-treeview.min.js',
        check: function () { return window.jQuery && !!jQuery.fn.treeview; }
      },
      {
        src: BASE + 'jquery-clockpicker.min.js',
        check: function () { return window.jQuery && !!jQuery.fn.clockpicker; }
      }
    ];

    var i = 0;

    function next() {
      if (i >= files.length) {
        done && done();
        return;
      }

      var f = files[i++];
      loadScript(f.src, f.check, next);
    }

    next();
  }

  function initNativeMediaFinder() {
    if (!window.jQuery || !jQuery.fn || !jQuery.fn.mediaFinder) return;

    jQuery('[data-control="mediafinder"]').each(function () {
      var $el = jQuery(this);

      if (!$el.data('ti.mediaFinder')) {
        try {
          $el.mediaFinder();
          log('[PMD Native MediaFix] mediaFinder initialized:', this.id || this);
        } catch (e) {
          warn('[PMD Native MediaFix] mediaFinder init failed:', e);
        }
      }
    });
  }

  function clearOldHiddenValuesAfterRemove() {
    if (!window.jQuery) return;

    jQuery(document)
      .off('click.pmdNativeClearRemove')
      .on('click.pmdNativeClearRemove', '.find-remove-button', function () {
        var $mf = jQuery(this).closest('[data-control="mediafinder"], .media-finder');

        setTimeout(function () {
          $mf.find('[data-find-value]').val('');
          $mf.find('[data-find-identifier]').val('');
        }, 300);
      });
  }

  function boot() {
    if (!window.jQuery) {
      setTimeout(boot, 200);
      return;
    }

    loadLateDeps(function () {
      installSafeSelectonicFallback();
      installInputmaskNoop();
      initNativeMediaFinder();
      clearOldHiddenValuesAfterRemove();

      log('[PMD Native MediaFix] v13 ready', {
        Dropzone: !!window.Dropzone,
        Sortable: !!window.Sortable,
        moment: !!window.moment,
        datetimepicker: !!jQuery.fn.datetimepicker,
        treeview: !!jQuery.fn.treeview,
        clockpicker: !!jQuery.fn.clockpicker,
        inputmask: !!jQuery.fn.inputmask,
        selectonic: !!jQuery.fn.selectonic,
        mediaFinder: jQuery('[data-control="mediafinder"]').first().data('ti.mediaFinder') ? true : false
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  if (window.jQuery) {
    jQuery(document).on('ajaxUpdateComplete render shown.bs.modal', function () {
      setTimeout(function () {
        installSafeSelectonicFallback();
        installInputmaskNoop();
        initNativeMediaFinder();
        clearOldHiddenValuesAfterRemove();
      }, 300);
    });
  }
})();
