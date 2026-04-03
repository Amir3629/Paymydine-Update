/**
 * Use only the Bootstrap confirm modal (Cancel + Delete). No SweetAlert2 for confirmations.
 * 1) Listens for ajaxConfirmMessage → show #adminConfirmModal.
 * 2) Wraps Swal.fire: when showCancelButton/cancelButtonText, show #adminConfirmModal instead of Swal.
 * Close: we intercept ALL hide() calls and run a 250ms opacity fade first so the card never jumps.
 */
(function() {
    'use strict';

    var FADE_MS = 250;

    /** Get or create confirm modal instance. Backdrop static + no keyboard so only X/Cancel/Delete close it. */
    function getConfirmModalInstance(modalEl) {
        if (!modalEl) return null;
        if (modalEl._confirmModalInstance) return modalEl._confirmModalInstance;
        if (!window.bootstrap || !window.bootstrap.Modal) return null;
        modalEl._confirmModalInstance = new window.bootstrap.Modal(modalEl, {
            backdrop: 'static',
            keyboard: false
        });
        return modalEl._confirmModalInstance;
    }

    function applyFadeThenHide(modalEl, bsModal, callback) {
        if (!modalEl) { if (callback) callback(); return; }
        var dialog = modalEl.querySelector('.modal-dialog');
        modalEl.classList.add('modal-closing');
        if (dialog) {
            dialog.classList.add('confirm-dialog-closing');
            dialog.style.setProperty('transform', 'translate(0, 0)');
            dialog.style.setProperty('transition', 'opacity 0.25s ease-out');
        }
        function removeClosingState() {
            modalEl.classList.remove('modal-closing');
            if (dialog) {
                dialog.classList.remove('confirm-dialog-closing');
                dialog.style.removeProperty('transform');
                dialog.style.removeProperty('transition');
            }
        }
        modalEl.addEventListener('hidden.bs.modal', function onHidden() {
            modalEl.removeEventListener('hidden.bs.modal', onHidden);
            removeClosingState();
        }, { once: true });
        setTimeout(function() {
            modalEl._allowHideNow = true;
            if (bsModal) bsModal.hide();
            if (callback) callback();
        }, FADE_MS);
    }

    function showAdminConfirmModal(opts, onConfirm) {
        var message = opts.html || opts.text || '';
        var $modal = window.jQuery && window.jQuery('#adminConfirmModal');
        var $msg = window.jQuery && window.jQuery('#adminConfirmModalMessage');
        if (!$modal || !$modal.length || !$msg || !$msg.length) return null;

        $msg.html(message || '');

        var modalEl = document.getElementById('adminConfirmModal');
        var bsModal = getConfirmModalInstance(modalEl);

        function closeWithFade(callback) {
            applyFadeThenHide(modalEl, bsModal, callback);
        }

        return new Promise(function(resolve) {
            function cleanup() {
                $modal.off('click', '.admin-confirm-delete');
                $modal.off('click', '.admin-confirm-cancel, .btn-close');
                $modal.off('hidden.bs.modal', onHidden);
            }
            function onHidden() {
                cleanup();
            }

            $modal.one('click', '.admin-confirm-delete', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                var preConfirm = opts.preConfirm;
                function done(value) {
                    closeWithFade(function() {
                        resolve(value != null ? { value: value } : { value: true });
                    });
                }
                if (typeof preConfirm === 'function') {
                    try {
                        var result = preConfirm();
                        if (result && typeof result.then === 'function') {
                            result.then(done).catch(function() { done(false); });
                        } else {
                            done(result);
                        }
                    } catch (err) {
                        done(false);
                    }
                } else {
                    done(true);
                }
            });

            $modal.one('click', '.admin-confirm-cancel, .btn-close', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                closeWithFade(function() {
                    resolve({ dismiss: 'cancel' });
                });
            });

            $modal.one('hidden.bs.modal', onHidden);

            if (bsModal) bsModal.show();
        });
    }

    function init() {
        var $ = window.jQuery;
        if (!$) return;

        /* Intercept ALL hide() on our modal: run 250ms opacity fade first, then real hide (no jump) */
        var BootstrapModal = window.bootstrap && window.bootstrap.Modal;
        if (BootstrapModal && !BootstrapModal._confirmFadePatched) {
            BootstrapModal._confirmFadePatched = true;
            var origHide = BootstrapModal.prototype.hide;
            BootstrapModal.prototype.hide = function() {
                var el = this._element;
                if (el && el.id === 'adminConfirmModal') {
                    if (el._allowHideNow) {
                        el._allowHideNow = false;
                        return origHide.call(this);
                    }
                    var self = this;
                    applyFadeThenHide(el, self, function() {
                        el._allowHideNow = true;
                        origHide.call(self);
                    });
                    return;
                }
                return origHide.call(this);
            };
        }

        /* 1) data-request-confirm → our modal */
        $(window).on('ajaxConfirmMessage', function(event, message) {
            if (!message) return;
            var $modal = $('#adminConfirmModal');
            var $msg = $('#adminConfirmModalMessage');
            if (!$modal.length || !$msg.length) return;

            $msg.text(message);
            var modalEl = $modal[0];
            var bsModal = getConfirmModalInstance(modalEl);

            function cleanup() {
                $modal.off('click', '.admin-confirm-delete');
                $modal.off('click', '.admin-confirm-cancel, .btn-close');
                $modal.off('hidden.bs.modal', onHidden);
            }
            function onHidden() { cleanup(); }

            $modal.one('click', '.admin-confirm-delete', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                var el = document.getElementById('adminConfirmModal');
                function afterFade() {
                    if (event.promise) event.promise.resolve();
                }
                applyFadeThenHide(el, bsModal, afterFade);
            });
            $modal.one('click', '.admin-confirm-cancel, .btn-close', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                var el = document.getElementById('adminConfirmModal');
                applyFadeThenHide(el, bsModal, function() {});
            });
            $modal.one('hidden.bs.modal', onHidden);
            if (bsModal) bsModal.show();
            return true;
        });

        /* 2) Swal.fire confirm → our modal (no more SweetAlert2 for confirm) */
        if (typeof window.Swal !== 'undefined') {
            var originalFire = window.Swal.fire.bind(window.Swal);
            window.Swal.fire = function(opts) {
                var o = opts && typeof opts === 'object' ? opts : { title: opts };
                if (o.showCancelButton || o.cancelButtonText) {
                    return showAdminConfirmModal(o);
                }
                return originalFire(opts);
            };
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
