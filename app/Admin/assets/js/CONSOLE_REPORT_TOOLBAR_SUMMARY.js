/**
 * TOOLBAR BUTTONS SUMMARY (compact) – Run on any admin page
 *
 * Run on create page, then on list page. Copy both outputs to compare widths/sizes.
 */
(function() {
  'use strict';

  var url = window.location.href;
  var cont = document.querySelector('.progress-indicator-container');
  if (!cont) {
    console.log('Page: ' + url + '\nNo .progress-indicator-container found.');
    return;
  }

  var direct = [];
  for (var i = 0; i < cont.children.length; i++) {
    var el = cont.children[i];
    if (el.classList && el.classList.contains('btn-group')) {
      var groupBtns = el.querySelectorAll('.btn');
      for (var j = 0; j < groupBtns.length; j++) direct.push(groupBtns[j]);
    } else if (el.classList && el.classList.contains('btn')) {
      direct.push(el);
    }
  }

  var lines = ['Page: ' + url, ''];
  direct.forEach(function(btn, i) {
    var cs = window.getComputedStyle(btn);
    var label = (btn.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 25);
    lines.push('  ' + (i + 1) + '. "' + label + '"  →  width: ' + cs.width + '  min-width: ' + cs.minWidth + '  padding: ' + cs.padding);
  });
  console.log(lines.join('\n'));
})();
