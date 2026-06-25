/* PMD v152: legacy dashboard renderer disabled on clean waiter dashboard */
(function(){
  if (/\/admin\/dashboard\/?$/.test(location.pathname) && document.getElementById('pmd-waiter-dashboard-root')) {
    console.info('PMD v152: disabled legacy dashboard renderer: pmd-dashboard-waiter3-v12.js');
    return;
  }
})();
