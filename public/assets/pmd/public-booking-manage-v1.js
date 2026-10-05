(function () {
  "use strict";

  var configNode = document.getElementById("pmd-booking-manage-config");
  if (!configNode) return;

  var config = {};
  try {
    config = JSON.parse(configNode.textContent || "{}");
  } catch (error) {
    return;
  }

  var labels = config.labels || {};
  var csrf = document.querySelector('meta[name="csrf-token"]');
  var languageNav = document.querySelector("[data-pmd-manage-language-nav]");
  var form = document.getElementById("pmd-booking-manage-form");
  var dateInput = document.getElementById("pmd-manage-date");
  var guestsInput = document.getElementById("pmd-manage-guests");
  var timeInput = document.getElementById("pmd-manage-time");
  var times = document.getElementById("pmd-manage-times");
  var saveButton = document.getElementById("pmd-manage-save");
  var cancelButton = document.getElementById("pmd-manage-cancel");
  var message = document.getElementById("pmd-manage-message");
  var currentDate = document.getElementById("pmd-manage-current-date");
  var currentTime = document.getElementById("pmd-manage-current-time");
  var currentParty = document.getElementById("pmd-manage-current-party");
  var statusNode = document.querySelector("[data-pmd-manage-status]");
  var availabilityAbort = null;

  var state = {
    date: config.reservation ? String(config.reservation.date || "") : "",
    guests: config.reservation ? Number(config.reservation.guests || 1) : 1,
    time: config.reservation ? String(config.reservation.time || "") : "",
    loading: false
  };

  function activeLanguageCode() {
    return String(config.locale || "en").toLowerCase().slice(0, 2);
  }

  function partyLabel(count) {
    return count + " " + (count === 1 ? (labels.guest || "guest") : (labels.guests || "guests"));
  }

  function setMessage(text, error) {
    if (!message) return;
    message.textContent = text || "";
    message.classList.toggle("is-visible", Boolean(text));
    message.classList.toggle("is-error", Boolean(error));
  }

  function translateStaticContent() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-pmd-manage-i18n]"), function (node) {
      var key = node.getAttribute("data-pmd-manage-i18n");
      if (key && Object.prototype.hasOwnProperty.call(labels, key)) {
        node.textContent = labels[key];
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-pmd-manage-placeholder]"), function (node) {
      var key = node.getAttribute("data-pmd-manage-placeholder");
      if (key && Object.prototype.hasOwnProperty.call(labels, key)) {
        node.setAttribute("placeholder", labels[key]);
      }
    });

    if (currentParty && config.reservation) {
      currentParty.textContent = partyLabel(Number(config.reservation.guests || state.guests));
    }

    if (statusNode) {
      statusNode.textContent = statusNode.classList.contains("is-canceled")
        ? (labels.status_canceled || "Canceled")
        : (labels.status_active || "Active");
    }

    document.title = (labels.manage_booking || "Manage booking") + " · " + (config.restaurantName || "");
  }

  function applyLanguage(code, updateUrl) {
    code = String(code || "").toLowerCase().slice(0, 2);
    var packs = config.labelsByLocale || {};
    if (!packs[code]) return false;

    config.locale = code;
    labels = packs[code];
    config.labels = labels;

    var tag = (config.localeTags && config.localeTags[code]) || code;
    var direction = (config.localeDirections && config.localeDirections[code]) || "ltr";
    document.documentElement.lang = tag;
    document.documentElement.dir = direction;

    Array.prototype.forEach.call(document.querySelectorAll("[data-pmd-manage-language]"), function (link) {
      var active = link.getAttribute("data-pmd-manage-language") === code;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    var hiddenLang = document.querySelector('input[name="lang"]');
    if (hiddenLang) hiddenLang.value = code;

    translateStaticContent();

    if (updateUrl !== false && window.history && window.history.replaceState) {
      var url = new URL(window.location.href);
      url.searchParams.set("lang", code);
      window.history.replaceState({ pmdManageLang: code }, "", url.pathname + url.search);
    }

    return true;
  }

  function responseMessages(payload) {
    var messages = [];
    if (payload && payload.errors) {
      Object.keys(payload.errors).forEach(function (key) {
        var value = payload.errors[key];
        if (Array.isArray(value)) messages = messages.concat(value);
        else if (value) messages.push(String(value));
      });
    }
    if (!messages.length && payload && payload.message) messages.push(String(payload.message));
    return messages;
  }

  function renderTimes(payload) {
    if (!times) return;

    state.loading = false;
    var slots = payload && Array.isArray(payload.slots) ? payload.slots : [];
    times.innerHTML = "";

    if (!slots.length) {
      state.time = "";
      if (timeInput) timeInput.value = "";
      var empty = document.createElement("p");
      empty.className = "pmd-booking-empty";
      empty.textContent = labels.no_times || "No available times.";
      times.appendChild(empty);
      return;
    }

    var selectedExists = slots.some(function (slot) { return String(slot.value) === state.time; });
    if (!selectedExists) {
      state.time = "";
      if (timeInput) timeInput.value = "";
    }

    slots.forEach(function (slot) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "pmd-booking-time-option";
      button.setAttribute("data-pmd-manage-time", String(slot.value));
      button.textContent = String(slot.label || slot.value);
      if (String(slot.value) === state.time) button.classList.add("is-active");
      times.appendChild(button);
    });
  }

  function loadingTimes() {
    if (!times) return;
    state.loading = true;
    times.innerHTML = "";
    var node = document.createElement("div");
    node.className = "pmd-booking-loading";
    node.textContent = labels.loading || "Checking tables…";
    times.appendChild(node);
  }

  function loadAvailability() {
    if (!config.availabilityUrl || !dateInput || !guestsInput) return;

    state.date = String(dateInput.value || "");
    state.guests = Math.max(1, Math.min(Number(config.maxGuests || 50), Number(guestsInput.value || 1)));
    guestsInput.value = String(state.guests);

    if (!state.date) return;

    if (availabilityAbort) availabilityAbort.abort();
    availabilityAbort = typeof AbortController !== "undefined" ? new AbortController() : null;

    loadingTimes();

    var url = new URL(config.availabilityUrl, window.location.origin);
    url.searchParams.set("date", state.date);
    url.searchParams.set("guests", String(state.guests));
    if (config.manageHash) url.searchParams.set("manage_hash", String(config.manageHash));

    fetch(url.toString(), {
      method: "GET",
      credentials: "same-origin",
      headers: { "Accept": "application/json" },
      signal: availabilityAbort ? availabilityAbort.signal : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok || !payload.success) {
          var messages = responseMessages(payload);
          throw new Error(messages[0] || "Availability could not be loaded.");
        }
        return payload;
      });
    }).then(renderTimes).catch(function (error) {
      if (error && error.name === "AbortError") return;
      state.loading = false;
      if (times) {
        times.innerHTML = "";
        var empty = document.createElement("p");
        empty.className = "pmd-booking-empty";
        empty.textContent = error && error.message ? error.message : (labels.no_times || "No available times.");
        times.appendChild(empty);
      }
    });
  }

  function formPayload() {
    var data = new FormData(form);
    var payload = {};
    data.forEach(function (value, key) { payload[key] = value; });
    payload.reserve_date = state.date;
    payload.reserve_time = state.time;
    payload.guest_num = state.guests;
    return payload;
  }

  function submitUpdate(event) {
    event.preventDefault();
    setMessage("", false);

    if (!state.time) {
      setMessage(labels.no_times || "Choose an available time.", true);
      return;
    }
    if (!form.reportValidity()) return;

    saveButton.disabled = true;
    var span = saveButton.querySelector("span");
    var previous = span ? span.textContent : "";
    if (span) span.textContent = labels.saving || "Saving changes…";

    fetch(config.updateUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrf ? csrf.getAttribute("content") : ""
      },
      body: JSON.stringify(formPayload())
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok || !payload.success) {
          var messages = responseMessages(payload);
          var err = new Error(messages[0] || "Update failed.");
          err.payload = payload;
          throw err;
        }
        return payload;
      });
    }).then(function (payload) {
      var reservation = payload.reservation || {};
      config.reservation = reservation;
      state.date = String(reservation.date || state.date);
      state.time = String(reservation.time || state.time);
      state.guests = Number(reservation.guests || state.guests);

      if (dateInput) dateInput.value = state.date;
      if (guestsInput) guestsInput.value = String(state.guests);
      if (timeInput) timeInput.value = state.time;
      if (currentDate) currentDate.textContent = state.date;
      if (currentTime) currentTime.textContent = state.time;
      if (currentParty) currentParty.textContent = partyLabel(state.guests);

      setMessage(labels.updated || payload.message || "Reservation updated.", false);
      loadAvailability();
    }).catch(function (error) {
      var messages = error && error.payload ? responseMessages(error.payload) : [error.message];
      setMessage(messages[0] || "Update failed.", true);
    }).finally(function () {
      saveButton.disabled = false;
      if (span) span.textContent = previous || (labels.save || "Save changes");
    });
  }

  function cancelReservation() {
    if (!config.cancelUrl || !cancelButton) return;
    if (!window.confirm(labels.cancel_confirm || "Cancel this reservation?")) return;

    setMessage("", false);
    cancelButton.disabled = true;
    var previous = cancelButton.textContent;
    cancelButton.textContent = labels.canceling || "Canceling…";

    fetch(config.cancelUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrf ? csrf.getAttribute("content") : ""
      },
      body: JSON.stringify({
        _pmd_manage_action: "cancel",
        _pmd_manage_hash: config.manageHash || ""
      })
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok || !payload.success) {
          var messages = responseMessages(payload);
          var err = new Error(messages[0] || "Cancellation failed.");
          err.payload = payload;
          throw err;
        }
        return payload;
      });
    }).then(function () {
      setMessage(labels.canceled || "Reservation canceled.", false);
      if (statusNode) {
        statusNode.textContent = labels.status_canceled || "Canceled";
        statusNode.classList.add("is-canceled");
      }
      Array.prototype.forEach.call(form.querySelectorAll("input, textarea, button"), function (node) {
        node.disabled = true;
      });
      cancelButton.hidden = true;
    }).catch(function (error) {
      var messages = error && error.payload ? responseMessages(error.payload) : [error.message];
      setMessage(messages[0] || "Cancellation failed.", true);
      cancelButton.disabled = false;
      cancelButton.textContent = previous || (labels.cancel || "Cancel reservation");
    });
  }

  if (languageNav) {
    languageNav.addEventListener("click", function (event) {
      var link = event.target.closest("[data-pmd-manage-language]");
      if (!link) return;
      event.preventDefault();
      applyLanguage(link.getAttribute("data-pmd-manage-language"), true);
    });
  }

  window.addEventListener("popstate", function () {
    var url = new URL(window.location.href);
    var lang = url.searchParams.get("lang");
    if (lang && lang !== activeLanguageCode()) applyLanguage(lang, false);
  });

  if (!form) {
    translateStaticContent();
    return;
  }

  if (times) {
    times.addEventListener("click", function (event) {
      var button = event.target.closest("[data-pmd-manage-time]");
      if (!button) return;
      state.time = String(button.getAttribute("data-pmd-manage-time") || "");
      if (timeInput) timeInput.value = state.time;
      Array.prototype.forEach.call(times.querySelectorAll("[data-pmd-manage-time]"), function (item) {
        item.classList.toggle("is-active", item === button);
      });
    });
  }

  if (dateInput) dateInput.addEventListener("change", function () {
    state.time = "";
    if (timeInput) timeInput.value = "";
    loadAvailability();
  });

  if (guestsInput) guestsInput.addEventListener("change", function () {
    state.time = "";
    if (timeInput) timeInput.value = "";
    loadAvailability();
  });

  form.addEventListener("submit", submitUpdate);
  if (cancelButton) cancelButton.addEventListener("click", cancelReservation);

  translateStaticContent();

  if (config.initialAvailability) {
    renderTimes(config.initialAvailability);
  } else {
    loadAvailability();
  }
})();
