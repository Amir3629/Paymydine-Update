/**
 * BACK BUTTON HOVER FIX - Run in browser Console
 *
 * 1. Open a page with the Back button (e.g. /admin/locations/create)
 * 2. DevTools -> Console
 * 3. Paste this ENTIRE script and press Enter
 *
 * This forces the toolbar Back button to have the same hover effect as the Save button.
 */
(function() {
  'use strict';

  const BACK = document.querySelector('.progress-indicator-container > .btn-outline-secondary, .progress-indicator-container > a.btn-outline-secondary');
  if (!BACK) {
    console.warn('[BACK-HOVER] Back button not found. Open a page with the toolbar (e.g. /admin/locations/create).');
    return;
  }

  const DEFAULT = {
    background: 'linear-gradient(135deg, #1f2b3a 0%, #364a63 100%)',
    backgroundColor: '#1f2b3a',
    border: '1px solid #364a63',
    borderColor: '#364a63',
    boxShadow: '0 4px 15px rgba(31, 43, 58, 0.3)',
    color: '#ffffff'
  };
  const HOVER = {
    background: 'linear-gradient(135deg, #364a63 0%, #526484 100%)',
    backgroundColor: '#526484',
    border: '1px solid #526484',
    borderColor: '#526484',
    boxShadow: '0 6px 16px rgba(31, 43, 58, 0.4)',
    color: '#ffffff'
  };
  const ACTIVE = {
    background: 'linear-gradient(135deg, #2a3a4e 0%, #364a63 100%)',
    backgroundColor: '#364a63',
    border: '1px solid #364a63',
    borderColor: '#364a63',
    boxShadow: '0 4px 15px rgba(31, 43, 58, 0.35)',
    color: '#ffffff'
  };

  function apply(styles) {
    Object.keys(styles).forEach(function(k) {
      BACK.style.setProperty(k.replace(/([A-Z])/g, '-$1').toLowerCase(), styles[k], 'important');
    });
    var icon = BACK.querySelector('i');
    if (icon) icon.style.setProperty('color', '#ffffff', 'important');
  }

  BACK.addEventListener('mouseenter', function() { apply(HOVER); });
  BACK.addEventListener('mouseleave', function() { apply(DEFAULT); });
  BACK.addEventListener('mousedown', function() { apply(ACTIVE); });
  BACK.addEventListener('mouseup', function() { apply(BACK.matches(':hover') ? HOVER : DEFAULT); });
  BACK.addEventListener('focus', function() { apply(HOVER); });
  BACK.addEventListener('blur', function() { apply(DEFAULT); });

  console.log('[BACK-HOVER] Back button hover fix applied. Hover it to see the effect.');
})();
