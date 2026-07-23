(function () {
  'use strict';

  var PANEL_ID = 'pmd-r2-reservation-panel-v330';
  var VERSION = '3.3.1';

  function bootData() {
    return window.PMD_RESERVATIONS2_BOOT || {};
  }

  function reservations() {
    return Array.isArray(bootData().reservations)
      ? bootData().reservations
      : [];
  }

  function reservationId(item) {
    return Number(item && (item.reservation_id || item.id)) || 0;
  }

  function reservationById(id) {
    return reservations().find(function (item) {
      return reservationId(item) === Number(id);
    }) || null;
  }

  function phoneOf(item) {
    return String(
      item && (
        item.telephone ||
        item.phone ||
        item.customer_telephone
      ) || ''
    ).trim();
  }

  function editUrl(item) {
    var base = bootData().editBaseUrl;
    var id = reservationId(item);

    return base && id
      ? String(base).replace(/\/$/, '') + '/' + encodeURIComponent(id)
      : '#';
  }

  function replaceReservation(updated) {
    if (!updated) return;

    var list = reservations();
    var id = reservationId(updated);
    var index = list.findIndex(function (item) {
      return reservationId(item) === id;
    });

    if (index === -1) list.push(updated);
    else list[index] = updated;
  }

  function showToast(message, danger) {
    var toast = document.createElement('div');
    toast.className = 'pmd-r2-toast-v330' + (danger ? ' is-danger' : '');
    toast.textContent = message;
    document.body.appendChild(toast);

    window.requestAnimationFrame(function () {
      toast.classList.add('is-visible');
    });

    window.setTimeout(function () {
      toast.classList.remove('is-visible');
      window.setTimeout(function () {
        toast.remove();
      }, 220);
    }, 2600);
  }

  function refreshAndOpen(id) {
    var api = window.PMDReservations2FloorToolbarV316;

    if (api && typeof api.renderReservations === 'function') {
      api.renderReservations();
    }

    if (api && typeof api.openReservation === 'function') {
      api.openReservation(id);
    }
  }

  function statusAction(action, item) {
    if (!item || !window.jQuery || typeof window.jQuery.request !== 'function') {
      showToast('Reservation action is unavailable.', true);
      return;
    }

    if (action === 'cancel' && !window.confirm('Cancel this reservation?')) {
      return;
    }

    document.documentElement.classList.add('pmd-r2-action-busy-v330');

    window.jQuery.request(
      bootData().actionHandler || 'index_onPmdReservationAction',
      {
        data: {
          recordId: reservationId(item),
          action: action
        },

        success: function (data) {
          document.documentElement.classList.remove('pmd-r2-action-busy-v330');

          if (data && data.reservation) {
            replaceReservation(data.reservation);
          }

          refreshAndOpen(reservationId(item));
          showToast((data && data.message) || 'Reservation updated.');
        },

        error: function (xhr) {
          document.documentElement.classList.remove('pmd-r2-action-busy-v330');

          var message = 'Could not update the reservation.';

          try {
            var json = xhr.responseJSON || JSON.parse(xhr.responseText || '{}');
            message = json.X_IGNITER_ERROR_MESSAGE || json.message || message;
          } catch (error) {}

          showToast(message, true);
        }
      }
    );
  }

  function handleAction(action, item) {
    if (!item) return;

    if (action === 'edit') {
      var url = editUrl(item);
      if (url !== '#') window.location.href = url;
      return;
    }

    if (action === 'call') {
      var phone = phoneOf(item);
      if (phone) window.location.href = 'tel:' + phone.replace(/[^+\d]/g, '');
      return;
    }

    if (action === 'arrive' || action === 'seat' || action === 'cancel') {
      statusAction(action, item);
    }
  }

  document.addEventListener('click', function (event) {
    var panel = event.target.closest('#' + PANEL_ID);
    if (!panel) return;

    var reservationRow = event.target.closest('[data-panel-reservation]');
    if (reservationRow) {
      event.preventDefault();
      event.stopPropagation();

      var api = window.PMDReservations2FloorToolbarV316;
      if (api && typeof api.openReservation === 'function') {
        api.openReservation(reservationRow.dataset.panelReservation);
      }
      return;
    }

    var actionButton = event.target.closest('[data-panel-action]');
    if (!actionButton || actionButton.disabled) return;

    event.preventDefault();
    event.stopPropagation();

    handleAction(
      actionButton.dataset.panelAction,
      reservationById(actionButton.dataset.reservationId)
    );
  }, true);

  console.info('[PMD Reservations2 Panel Actions V' + VERSION + '] Ready');
})();
