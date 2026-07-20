/**
 * SlimSelect: render dropdown inside the select's parent so it scrolls with the page.
 * Must run after admin.js (get_script_tags). Patches $.fn.selectList so new instances
 * use contentPosition: 'relative' and contentLocation: select.parentNode.
 */
(function () {
    'use strict';
    if (typeof window.jQuery === 'undefined') return;
    var $ = window.jQuery;
    var orig = $.fn.selectList;
    if (typeof orig !== 'function') return;
    $.fn.selectList = function (option) {
        var args = Array.prototype.slice.call(arguments);
        return this.each(function () {
            var extra = {
                contentPosition: 'relative',
                contentLocation: this.parentNode
            };
            var newOption = (typeof option === 'object' && option !== null)
                ? $.extend({}, option, extra)
                : extra;
            orig.apply($(this), [newOption].concat(args.slice(1)));
        });
    };
})();
