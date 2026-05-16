/*! PayMyDine fallback stub for jquery-sortable.js. Replace with vendor build when available. */
(function(window, document, $){
'use strict';

if ($ && !$.fn.sortable) {
  $.fn.sortable = function(options){
    return this.each(function(){
      if (window.Sortable) $(this).data('sortable', Sortable.create(this, options || {}));
    });
  };
}

})(window, document, window.jQuery);
