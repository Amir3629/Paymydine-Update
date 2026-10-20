/* PMD_RESERVATIONS_SEARCH_HEADER_R1
 * One header button focuses the server-powered cross-date booking search.
 * No network requests, timers, or alternate reservation list ownership. */
(function () {
  "use strict";
  if (window.PMDReservationsSearchHeaderR1) return;
  function init() {
    var root = document.getElementById("pmd-reservations-cards-v2-1");
    var input = root && root.querySelector("[data-pmd-reservations-search-input]");
    var actions = document.querySelector("#pmd-r2-clean-header .pmd-r2-clean-actions");
    if (!root || !input || !actions) return;
    if (actions.querySelector("[data-pmd-reservations-search-header]")) return;
    var de = String(document.documentElement.lang || "en").toLowerCase().indexOf("de") === 0;
    var label = de ? "Reservierung suchen" : "Search reservations";
    var button = document.createElement("button");
    button.type = "button";
    button.className = "pmd-reservations-search-header-r1";
    button.setAttribute("data-pmd-reservations-search-header", "1");
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg>';
    button.addEventListener("click", function () {
      input.scrollIntoView({behavior:"smooth",block:"center"});
      input.focus({preventScroll:true});
      if (input.value) input.select();
    });
    actions.insertBefore(button, actions.firstChild);
    window.PMDReservationsSearchHeaderR1 = {
      version:"1.0",
      focus:function () { button.click(); }
    };
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {once:true});
  } else init();
})();
