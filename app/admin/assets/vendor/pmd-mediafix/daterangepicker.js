/*! PayMyDine fallback stub for daterangepicker.js. Replace with vendor build when available. */
(function(window, document, $){
'use strict';

if ($ && !$.fn.daterangepicker) {
  $.fn.daterangepicker = function(options, callback){
    return this.each(function(){
      var $el = $(this);
      var api = { element: $el, options: options || {}, container: $('<div class="daterangepicker"></div>').hide(), remove: function(){ this.container.remove(); } };
      $el.data('daterangepicker', api);
      if (typeof callback === 'function' && window.moment) callback(moment(), moment(), '');
    });
  };
}

})(window, document, window.jQuery);
