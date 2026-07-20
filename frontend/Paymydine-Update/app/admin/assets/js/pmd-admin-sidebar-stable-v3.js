(function () {
  'use strict';

  function keepOpenItemVisible(link) {
    setTimeout(function () {
      var item = link.closest('.nav-item');
      if (!item) return;
      item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, 220);
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest('#side-nav-menu a.nav-link[data-toggle="collapse"]');
    if (!link) return;
    keepOpenItemVisible(link);
  }, true);
})();
