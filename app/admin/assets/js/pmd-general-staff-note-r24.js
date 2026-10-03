/* PMD_GENERAL_STAFF_NOTE_R24
 * Removes legacy inline Bootstrap button styling after the Staff Note modal
 * opens so the scoped R24 design remains authoritative.
 */
(function () {
    'use strict';

    var SELECTOR = '#addGeneralStaffNoteModal';

    function normalize() {
        var modal = document.querySelector(SELECTOR);
        if (!modal) return false;

        modal.setAttribute('data-pmd-general-staff-note-r24', '1');

        var buttons = modal.querySelectorAll(
            '.modal-footer .btn-secondary, .modal-footer .btn-primary, #generalStaffNoteSubmitBtn'
        );

        buttons.forEach(function (button) {
            [
                'min-width',
                'width',
                'height',
                'min-height',
                'padding',
                'line-height',
                'color',
                'background',
                'background-color',
                'border',
                'border-radius',
                'box-shadow',
                'transform'
            ].forEach(function (property) {
                button.style.removeProperty(property);
            });
        });

        return true;
    }

    function normalizeAfterOpen() {
        normalize();
        window.requestAnimationFrame(function () {
            normalize();
        });
        window.setTimeout(normalize, 0);
    }

    function bind() {
        normalize();

        var $ = window.jQuery || window.$;
        if ($ && $.fn && $.fn.modal) {
            $(document)
                .off('shown.bs.modal.pmdGeneralStaffNoteR24', SELECTOR)
                .on('shown.bs.modal.pmdGeneralStaffNoteR24', SELECTOR, normalizeAfterOpen);
        }

        document.addEventListener('click', function (event) {
            var trigger = event.target.closest('#notif-note-btn');
            if (!trigger) return;
            window.setTimeout(normalizeAfterOpen, 0);
        }, true);

        window.PMDGeneralStaffNoteR24 = {
            version: '24.0.0',
            normalize: normalize
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind, { once: true });
    } else {
        bind();
    }
})();
