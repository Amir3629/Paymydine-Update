(function () {
  'use strict';

  if (window.PMDWaiterV235Icons) return;
  window.PMDWaiterV235Icons = true;

  var SPRITE = '/app/admin/assets/icons/pmd-pos-icons-v1.svg';

  var serviceIcons = {
    mine: 'table',
    all: 'grid',
    open: 'open',
    call: 'bell',
    note: 'note'
  };

  var categoryRules = [
    ['bestseller|best seller|top seller|popular', 'star'],
    ['chef|recommend', 'chef'],
    ['recent|new', 'clock'],
    ['all', 'grid'],
    ['breakfast|brunch|صبحانه', 'breakfast'],
    ['appetizer|starter|vorspeise|پیش غذا', 'appetizer'],
    ['main course|hauptgericht|entree|غذای اصلی', 'main'],
    ['dessert|sweet|cake|دسر|کیک', 'dessert'],
    ['drink|beverage|نوشیدنی', 'drink'],
    ['coffee|kaffee|قهوه', 'coffee'],
    ['tea|tee|چای', 'tea'],
    ['beer|bier|آبجو', 'beer'],
    ['wine|wein|شراب', 'wine'],
    ['cocktail|aperitif|tonic|gin', 'cocktail'],
    ['soft drink|soda|cola', 'softdrink'],
    ['juice|smoothie|آبمیوه', 'juice'],
    ['water|wasser|آب', 'water'],
    ['soup|suppen|سوپ', 'soup'],
    ['salad|سالاد', 'salad'],
    ['pizza|پیتزا', 'pizza'],
    ['burger|برگر', 'burger'],
    ['sandwich|wrap|ساندویچ', 'sandwich'],
    ['pasta|spaghetti|پاستا', 'pasta'],
    ['noodle|ramen|نودل', 'noodles'],
    ['rice|برنج', 'rice'],
    ['meat|steak|beef|lamb|گوشت', 'meat'],
    ['chicken|poultry|مرغ', 'chicken'],
    ['fish|ماهی', 'fish'],
    ['seafood|shrimp|prawn|shellfish|دریایی', 'seafood'],
    ['vegan|vegetarian|plant|سبزی', 'vegan'],
    ['bakery|bread|pastry|croissant|نان', 'bakery'],
    ['ice cream|gelato|بستنی', 'icecream'],
    ['kids|children|child|کودک', 'kids'],
    ['halal|حلال', 'halal']
  ];

  function icon(name) {
    var span = document.createElement('span');
    span.className = 'pmd-v235-icon';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML =
      '<svg viewBox="0 0 24 24" focusable="false">' +
      '<use href="' + SPRITE + '#' + name + '"></use>' +
      '</svg>';
    return span;
  }

  function categoryIcon(label) {
    var value = String(label || '').toLowerCase().trim();
    for (var i = 0; i < categoryRules.length; i++) {
      if (new RegExp(categoryRules[i][0], 'i').test(value)) {
        return categoryRules[i][1];
      }
    }
    return 'menu';
  }

  function decorateService(root) {
    root.querySelectorAll('[data-v2-filter]').forEach(function (button) {
      if (button.querySelector('.pmd-v235-icon')) return;
      var key = button.getAttribute('data-v2-filter') || 'all';
      button.insertBefore(icon(serviceIcons[key] || 'menu'), button.firstChild);
    });
  }

  function decorateCategories(root) {
    root.querySelectorAll('.pmd-pos-category').forEach(function (button) {
      if (button.querySelector('.pmd-v235-icon')) return;

      var label = button.textContent.trim();
      var type =
        button.getAttribute('data-v23-owner-filter') ||
        button.getAttribute('data-v21-virtual') ||
        label;

      button.insertBefore(icon(categoryIcon(type + ' ' + label)), button.firstChild);
    });
  }

  function mount() {
    var root = document.querySelector('[data-pmd-waiter-v2-root]');
    if (!root) return;
    decorateService(root);
    decorateCategories(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, {once:true});
  } else {
    mount();
  }

  var observer = new MutationObserver(mount);
  observer.observe(document.documentElement, {childList:true, subtree:true});

  setTimeout(mount, 100);
  setTimeout(mount, 500);

  console.info('[PMD] V2.3.5 unified icon system active');
})();
