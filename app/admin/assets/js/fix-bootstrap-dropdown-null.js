/**
 * FIX BOOTSTRAP DROPDOWN _menu NULL ERROR
 * Bootstrap Dropdown's _isShown() throws when _menu is null (e.g. after DOM refresh).
 * This patches the Dropdown to guard against null _menu.
 */
(function() {
    'use strict';

    function patchBootstrap5() {
        if (typeof bootstrap === 'undefined' || !bootstrap.Dropdown) return false;
        var D = bootstrap.Dropdown;
        if (D._patchedDropdownNull) return true;
        var p = D.prototype;
        if (p._isShown) {
            var orig = p._isShown;
            p._isShown = function() {
                if (!this._menu) return false;
                try { return orig.call(this); } catch (e) { return false; }
            };
        }
        if (p.hide) {
            var origHide = p.hide;
            p.hide = function() {
                if (!this._menu) return;
                try { origHide.call(this); } catch (e) {}
            };
        }
        if (p.toggle) {
            var origToggle = p.toggle;
            p.toggle = function(r) {
                if (!this._menu) {
                    var d = this._element.closest && this._element.closest('.dropdown');
                    this._menu = (d && d.querySelector('.dropdown-menu')) || this._element.nextElementSibling;
                }
                try { origToggle.call(this, r); } catch (e) {}
            };
        }
        D._patchedDropdownNull = true;
        return true;
    }

    function run() {
        if (patchBootstrap5()) return;
        setTimeout(run, 50);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
