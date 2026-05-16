/**
 * TOOLBAR BUTTONS REPORT – Run on any admin page
 *
 * Run this SAME script in the Console on BOTH pages:
 * 1. http://127.0.0.1:8000/admin/locations/create
 * 2. http://127.0.0.1:8000/admin/locations
 *
 * Copy the full console output from each run and share both so we can see the differences.
 */
(function() {
  'use strict';

  var url = window.location.href;
  var isCreatePage = /\/create\/?$/.test(url) || url.indexOf('/create?') !== -1;
  var pageType = isCreatePage ? 'CREATE/FORM page (e.g. locations/create)' : 'LIST/INDEX page (e.g. locations)';
  var containers = document.querySelectorAll('.progress-indicator-container');
  var out = [];
  out.push('========== TOOLBAR BUTTONS REPORT ==========');
  out.push('Page: ' + url);
  out.push('Page type: ' + pageType);
  out.push('');

  if (!containers.length) {
    out.push('No .progress-indicator-container found on this page.');
    console.log(out.join('\n'));
    return;
  }

  containers.forEach(function(cont, idx) {
    out.push('--- Container #' + (idx + 1) + ' ---');
    var parent = cont.closest('.toolbar-action') || cont.parentElement;
    out.push('Parent: ' + (parent ? parent.className : 'none'));

    var direct = [];
    for (var i = 0; i < cont.children.length; i++) {
      var el = cont.children[i];
      if (el.classList && el.classList.contains('btn-group')) {
        direct.push(el);
        var groupBtns = el.querySelectorAll('.btn');
        for (var j = 0; j < groupBtns.length; j++) direct.push(groupBtns[j]);
      } else if (el.classList && el.classList.contains('btn')) {
        direct.push(el);
      }
    }

    direct.forEach(function(btn, i) {
      var cs = window.getComputedStyle(btn);
      var label = (btn.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
      out.push('');
      out.push('  Button #' + (i + 1) + ': "' + label + '"');
      out.push('    Tag: ' + btn.tagName + '  Classes: ' + (btn.className || ''));
      if (btn.href) out.push('    href: ' + btn.href);
      out.push('    width: ' + cs.width + '  min-width: ' + cs.minWidth + '  max-width: ' + cs.maxWidth);
      out.push('    height: ' + cs.height + '  min-height: ' + cs.minHeight);
      out.push('    padding: ' + cs.padding);
      out.push('    border-radius: ' + cs.borderRadius);
      out.push('    background: ' + (cs.background || cs.backgroundColor).toString().slice(0, 60) + '...');
      out.push('    border: ' + cs.borderWidth + ' ' + cs.borderStyle + ' ' + cs.borderColor);
      out.push('    box-shadow: ' + (cs.boxShadow || 'none').toString().slice(0, 50));
      out.push('    font-size: ' + cs.fontSize);
      out.push('    inline style length: ' + (btn.getAttribute('style') || '').length + ' chars');
    });

    out.push('');
  });

  out.push('========== END REPORT ==========');
  console.log(out.join('\n'));
})();
