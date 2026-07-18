/*
 * PMD_SINGLE_LOGO_SKIP_RESERVATIONS2_V1
 * Reservations2 owns its logo independently through Side Menu 2.
 */
if (
  window.location.pathname === '/admin/reservations2' ||
  window.location.pathname.indexOf('/admin/reservations2/') === 0
) {
  console.info(
    '[PMD] Global admin logo skipped on Reservations2'
  );
} else {
// PMD_ADMIN_FINAL_SINGLE_LOGO_V20
(function () {
  "use strict";

  if (!/\/admin(\/|$)/i.test(window.location.pathname)) return;

  var VERSION = "v20-20260625_154925";
  var LOGO_URL = "/app/admin/assets/images/pmd-logo-final.png?v=" + encodeURIComponent(VERSION);

  function isLoginPage() {
    return /\/admin\/login/i.test(window.location.pathname) ||
      !!document.querySelector('form[action*="login"], input[name="username"], input[name="password"]');
  }

  function removeOldTestingUi() {
    document.querySelectorAll([
      "#pmd-admin-logo-switcher",
      ".pmd-admin-logo-switcher-label",
      ".pmd-admin-logo-choice",
      ".pmd-admin-logo-cycle-wrap-v19",
      ".pmd-logo-cycle-btn-v19",
      ".pmd-logo-cycle-btn-v38",
      "button.pmd-logo-cycle-btn-v38",
      "[class*='pmd-logo-cycle-btn-v']",
      "[class*='pmd-admin-logo-switcher']",
      "[class*='pmd-admin-logo-cycle-wrap']",
      ".pmd-admin-forced-logo-wrap-v19",
      ".pmd-admin-forced-logo-wrap-v18",
      ".pmd-admin-forced-logo-wrap-v17"
    ].join(",")).forEach(function (el) {
      el.remove();
    });
  }

  function looksLikeLogoImage(img) {
    if (!img) return false;
    var src = img.getAttribute("src") || "";
    var alt = img.getAttribute("alt") || "";
    var cls = String(img.className || "");
    var parentCls = img.parentElement ? String(img.parentElement.className || "") : "";
    var blob = [src, alt, cls, parentCls].join(" ");

    if (/pmd-logo-candidates|pmd-logo|paymydine|pay-my-dine|brand-logo|site-logo|logo-img|logo-dark|logo-light/i.test(blob)) {
      if (/avatar|profile|user|flag|icon-only/i.test(blob)) return false;
      return true;
    }
    return false;
  }

  function applyFinalToImage(img, mode) {
    img.src = LOGO_URL;
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
    img.alt = "PayMyDine";
    img.classList.remove("pmd-admin-logo-hidden-v19");
    img.removeAttribute("data-pmd-hidden-logo-v19");
    img.classList.add("pmd-final-admin-logo-v20");

    if (mode === "login") {
      img.classList.add("pmd-final-login-logo-img-v20");
    } else {
      img.classList.add("pmd-final-sidebar-logo-img-v20");
    }

    img.style.display = "block";
    img.style.visibility = "visible";
    img.style.opacity = "1";
  }

  function findLoginMount() {
    var form = document.querySelector('form[action*="login"], form:has(input[name="username"]), form:has(input[name="password"])');
    if (form) return form.parentElement || form;

    return document.querySelector(".login-box, .auth-wrapper, .card, .panel, .container") || document.body;
  }

  function findSidebarMount() {
    return document.querySelector(".sidebar, .main-sidebar, aside, [class*='sidebar']") || document.body;
  }

  function ensureLoginLogo() {
    var mount = findLoginMount();

    document.querySelectorAll(".pmd-final-sidebar-logo-v20").forEach(function (x) { x.remove(); });

    var logoImgs = Array.from(document.querySelectorAll("img")).filter(looksLikeLogoImage);
    if (logoImgs.length) {
      var first = logoImgs[0];
      logoImgs.slice(1).forEach(function (img) { img.remove(); });

      applyFinalToImage(first, "login");

      var wrap = first.closest(".pmd-final-login-logo-v20");
      if (!wrap) {
        wrap = document.createElement("div");
        wrap.className = "pmd-final-login-logo-v20";
        first.parentElement.insertBefore(wrap, first);
        wrap.appendChild(first);
      }

      return;
    }

    if (!document.querySelector(".pmd-final-login-logo-v20")) {
      var div = document.createElement("div");
      div.className = "pmd-final-login-logo-v20";
      div.innerHTML = '<img class="pmd-final-admin-logo-v20 pmd-final-login-logo-img-v20" src="' + LOGO_URL + '" alt="PayMyDine">';
      mount.insertBefore(div, mount.firstChild);
    }
  }

  function ensureSidebarLogo() {
    var sidebar = findSidebarMount();

    document.querySelectorAll(".pmd-final-login-logo-v20").forEach(function (x) {
      if (!isLoginPage()) x.remove();
    });

    var logoImgs = Array.from(sidebar.querySelectorAll("img")).filter(looksLikeLogoImage);

    if (logoImgs.length) {
      var first = logoImgs[0];
      logoImgs.slice(1).forEach(function (img) { img.remove(); });

      applyFinalToImage(first, "sidebar");

      var wrap = first.closest(".pmd-final-sidebar-logo-v20");
      if (!wrap) {
        wrap = document.createElement("div");
        wrap.className = "pmd-final-sidebar-logo-v20";
        first.parentElement.insertBefore(wrap, first);
        wrap.appendChild(first);
      }

      return;
    }

    if (!sidebar.querySelector(".pmd-final-sidebar-logo-v20")) {
      var div = document.createElement("div");
      div.className = "pmd-final-sidebar-logo-v20";
      div.innerHTML = '<img class="pmd-final-admin-logo-v20 pmd-final-sidebar-logo-img-v20" src="' + LOGO_URL + '" alt="PayMyDine">';
      sidebar.insertBefore(div, sidebar.firstChild);
    }
  }

  function run() {
    removeOldTestingUi();

    if (isLoginPage()) {
      ensureLoginLogo();
    } else {
      ensureSidebarLogo();
    }
  }

  function boot() {
    run();

    var ticks = 0;
    var timer = setInterval(function () {
      ticks += 1;
      run();
      if (ticks >= 8) clearInterval(timer);
    }, 350);

    window.PMDFinalAdminLogoV20 = { refresh: run };

    console.info("PMD_ADMIN_FINAL_SINGLE_LOGO_V20 active");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
}
