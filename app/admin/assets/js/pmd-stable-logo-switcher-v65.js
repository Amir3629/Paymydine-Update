(function(){
  function bridge(){
    if (window.PMDLogoSwitcherV70) {
      window.PMDLogoSwitcherV68 = window.PMDLogoSwitcherV70;
      window.PMDLogoSwitcherV65 = window.PMDLogoSwitcherV70;
      window.PMDLogoSwitcherV38 = window.PMDLogoSwitcherV70;
      return true;
    }
    return false;
  }
  if (!bridge()) {
    document.addEventListener('DOMContentLoaded', function(){
      setTimeout(bridge, 50);
      setTimeout(bridge, 250);
      setTimeout(bridge, 700);
    }, { once: true });
  }
})();
