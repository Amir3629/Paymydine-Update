/* PMD_NO_HOVER_TITLES_GLOBAL_R4
 * Shared PayMyDine browser behaviour (Admin / Owner / Manager / Reservations /
 * Staff standalone workspaces / classic customer themes).
 * Suppresses *hover hints* only, never functional dropdowns, popovers, dialogs
 * or guided tours. Keep accessible names for icon-only controls.
 */
(function () {
  'use strict';
  if (window.PMDNoHoverTitlesR4) return;

  var TITLE_SELECTOR = '[title], [data-bs-title], [data-bs-original-title], [data-original-title], [data-toggle="tooltip"], [data-bs-toggle="tooltip"], [data-bs-tooltip="tooltip"]';
  var TITLE_ATTRIBUTES = ['title', 'data-bs-title', 'data-bs-original-title', 'data-original-title'];
  var removed = 0;

  function addStyle() {
    if (document.getElementById('pmd-no-hover-titles-global-r4')) return;
    var style = document.createElement('style');
    style.id = 'pmd-no-hover-titles-global-r4';
    style.textContent = [
      '/* Never expose Bootstrap, tippy or ARIA tooltip bubbles. */',
      'html body [role="tooltip"],',
      'html body .tooltip[role="tooltip"],',
      'html body .tooltip.show,',
      'html body .tooltip.in,',
      'html body .tooltip-inner,',
      'html body .tippy-box,',
      'html body [data-tippy-root] {',
      '  display:none !important; visibility:hidden !important;',
      '  opacity:0 !important; pointer-events:none !important;',
      '}',
      '/* Header labels are CSS ::before/::after bubbles, not native titles. */',
      'html body.page.pmd-admin-theme-v1 .navbar-top [data-pmd-tooltip-label][data-pmd-tooltip-label]::before,',
      'html body.page.pmd-admin-theme-v1 .navbar-top [data-pmd-tooltip-label][data-pmd-tooltip-label]::after,',
      'html body .pmd-header-tooltip-target[data-pmd-tooltip-label][data-pmd-tooltip-label]::before,',
      'html body .pmd-header-tooltip-target[data-pmd-tooltip-label][data-pmd-tooltip-label]::after {',
      '  content:none !important; display:none !important;',
      '  opacity:0 !important; visibility:hidden !important;',
      '  pointer-events:none !important; animation:none !important;',
      '}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  function isInteractive(element) {
    return element.matches && element.matches(
      'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="tab"]'
    );
  }

  function preserveAccessibleName(element, hint) {
    if (!hint || !isInteractive(element)) return;
    if (element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby')) return;
    var visible = (element.textContent || '').replace(/\s+/g, ' ').trim();
    var inputValue = /^(INPUT)$/i.test(element.tagName) ? (element.value || '') : '';
    if ((!visible && !inputValue) || visible === hint) {
      element.setAttribute('aria-label', hint);
    }
  }

  function destroyTooltip(element) {
    try {
      if (window.bootstrap && window.bootstrap.Tooltip
          && typeof window.bootstrap.Tooltip.getInstance === 'function') {
        var instance = window.bootstrap.Tooltip.getInstance(element);
        if (instance && typeof instance.dispose === 'function') instance.dispose();
      }
    } catch (ignoreBootstrap) {}
    try {
      if (window.jQuery && window.jQuery.fn && window.jQuery.fn.tooltip) {
        var jq = window.jQuery(element);
        if (jq.data('bs.tooltip')) jq.tooltip('dispose');
      }
    } catch (ignoreJquery) {}
  }

  function stripOne(element) {
    if (!element || element.nodeType !== 1 || !element.getAttribute) return;
    // iframe/title is a required accessible name, not a redundant UI hint.
    if (element.tagName === 'IFRAME') return;
    var hasTitle = TITLE_ATTRIBUTES.some(function (name) {
      return element.hasAttribute(name);
    });
    var bsTrigger = element.getAttribute('data-bs-toggle') === 'tooltip'
      || element.getAttribute('data-toggle') === 'tooltip'
      || element.getAttribute('data-bs-tooltip') === 'tooltip';
    if (!hasTitle && !bsTrigger) return;

    var hint = '';
    for (var i = 0; i < TITLE_ATTRIBUTES.length; i++) {
      hint = hint || (element.getAttribute(TITLE_ATTRIBUTES[i]) || '').trim();
    }
    preserveAccessibleName(element, hint);
    destroyTooltip(element);
    TITLE_ATTRIBUTES.forEach(function (name) {
      if (element.hasAttribute(name)) {
        element.removeAttribute(name);
        removed += 1;
      }
    });
    // Only disable actual tooltip triggers; preserve dropdown/modal/popover.
    if (element.getAttribute('data-bs-toggle') === 'tooltip') element.removeAttribute('data-bs-toggle');
    if (element.getAttribute('data-toggle') === 'tooltip') element.removeAttribute('data-toggle');
    if (element.getAttribute('data-bs-tooltip') === 'tooltip') element.removeAttribute('data-bs-tooltip');
  }

  function stripSvgIconTitle(node) {
    // SVG <title> nodes are native hover hints even without title="...".
    // Preserve their text as aria-label on the SVG before removing the hint.
    if (!node || node.namespaceURI !== 'http://www.w3.org/2000/svg'
        || (node.localName || '').toLowerCase() !== 'title') return;
    var svg = node.parentElement;
    if (!svg || (svg.localName || '').toLowerCase() !== 'svg') return;
    var interactive = svg.closest && svg.closest('button, a, [role="button"], [role="link"]');
    if (!interactive) return;
    var label = (node.textContent || '').trim();
    if (label && !svg.hasAttribute('aria-label') && !svg.hasAttribute('aria-labelledby')) {
      svg.setAttribute('aria-label', label);
    }
    if (label) preserveAccessibleName(interactive, label);
    node.remove();
    removed += 1;
  }

  function scan(scope) {
    if (!scope || scope.nodeType !== 1) return;
    stripOne(scope);
    stripSvgIconTitle(scope);
    if (!scope.querySelectorAll) return;
    scope.querySelectorAll(TITLE_SELECTOR).forEach(stripOne);
    scope.querySelectorAll('svg > title').forEach(stripSvgIconTitle);
  }

  function preventPopup(event) {
    if (event && event.preventDefault) event.preventDefault();
  }

  // Bootstrap 5 native events and Bootstrap 4 jQuery events.
  document.addEventListener('show.bs.tooltip', preventPopup, true);
  function bindJquery() {
    if (window.jQuery && window.jQuery.fn && !window.PMDNoHoverTitlesR4.jqueryBound) {
      window.PMDNoHoverTitlesR4.jqueryBound = true;
      window.jQuery(document).on('show.bs.tooltip', preventPopup);
    }
  }

  function init() {
    addStyle();
    scan(document.documentElement);
    bindJquery();
    document.addEventListener('pointerover', function (event) {
      var node = event.target && event.target.nodeType === 1 ? event.target : null;
      while (node && node !== document.documentElement) {
        stripOne(node);
        node = node.parentElement;
      }
    }, true);

    if (window.MutationObserver) {
      var observer = new MutationObserver(function (records) {
        records.forEach(function (record) {
          if (record.type === 'attributes') {
            stripOne(record.target);
            return;
          }
          record.addedNodes.forEach(scan);
        });
      });
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['title', 'data-bs-title', 'data-bs-original-title',
          'data-original-title', 'data-toggle', 'data-bs-toggle', 'data-bs-tooltip']
      });
    }

    // Some Bootstrap builds attach the jQuery adapter after DOMContentLoaded.
    if (!window.PMDNoHoverTitlesR4.jqueryBound) {
      window.addEventListener('load', bindJquery, { once: true });
    }
  }

  window.PMDNoHoverTitlesR4 = {
    version: '20261026-r4',
    jqueryBound: false,
    audit: function () {
      return {
        loaded: true,
        remainingNativeTitles: document.querySelectorAll('[title]:not(iframe)').length,
        visibleBootstrapTooltips: document.querySelectorAll('.tooltip.show, [role="tooltip"]').length,
        strippedAttributes: removed
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

/* PMD_NO_HOVER_TITLES_R5 */
(function(){
if(window.PMDHoverR5)return;
window.PMDHoverR5={active:true};

var css='html body .tooltip,html body [role="tooltip"],html body .tippy-box,html body [data-tippy-root],html body .tooltipster-base,html body .pmd-floor-tooltip{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important} html body [data-tooltip]::before,html body [data-tooltip]::after,html body [data-pmd-tooltip-label]::before,html body [data-pmd-tooltip-label]::after,html body [data-pmd-no-hover-pseudo]::before,html body [data-pmd-no-hover-pseudo]::after{content:none!important;display:none!important;visibility:hidden!important}';

function init(){
var s=document.createElement('style');
s.textContent=css;
(document.head||document.documentElement).appendChild(s);

function chk(el){
if(!el||!el.getAttribute||!window.getComputedStyle)return;
var label=String(el.getAttribute('aria-label')||el.getAttribute('data-tooltip')||el.textContent||'').replace(/\s+/g,' ').trim();
if(!label||label.length>100)return;
['::after','::before'].some(function(p){
try{
var c=String(getComputedStyle(el,p).content||'').replace(/^['"]|['"]$/g,'').trim();
if(c&&c.toLowerCase()===label.toLowerCase()){
el.setAttribute('data-pmd-no-hover-pseudo','1');
return true;
}
}catch(e){}
return false;
});
}
document.addEventListener('mouseover',function(e){
var x=e.target;
for(var i=0;x&&i<5;i++,x=x.parentElement)chk(x);
},true);
}

if(document.readyState==='loading')
document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
