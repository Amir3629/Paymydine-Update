<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>PMD Counter Dashboard</title>

  {{-- Reuse existing PMD floor styles if present --}}
  <link rel="stylesheet" href="/app/admin/assets/css/pmd-owner-dashboard-clean-v23.css?v=23">
  <link rel="stylesheet" href="/app/admin/assets/css/pmd-counter-dashboard-v1.css?v=1">
</head>
<body class="pmd-counter-page-v1">
  <div class="pmd-counter-shell-v1">
    <aside class="pmd-counter-sidebar-v1">
      <div class="pmd-counter-sidebar-inner-v1">
        <div class="pmd-counter-logo-v1">P</div>
        <a href="/admin/dashboard" title="Dashboard">⌂</a>
        <a href="/admin/reservations" class="is-active" title="Reservations">📅</a>
        <a href="/admin/orders" title="Orders">🧾</a>
        <a href="/admin/tables" title="Tables">▦</a>
        <a href="/admin/settings" title="Settings">⚙</a>
        <span class="pmd-counter-spacer-v1"></span>
        <a href="/admin/logout" title="Logout">⏻</a>
      </div>
    </aside>

    <main class="pmd-counter-main-v1">
      <header class="pmd-counter-topbar-v1">
        <div class="pmd-counter-title-v1">
          <a class="pmd-counter-back-v1" href="/admin/dashboard">←</a>
          <div>
            <h1>Counter Dashboard</h1>
            <p>Reservation desk · floor view · today bookings</p>
          </div>
        </div>

        <div class="pmd-counter-actions-v1">
          <a href="/admin/reservations/create" class="pmd-counter-btn-v1 is-primary">New Reservation</a>
          <a href="/admin/reservations" class="pmd-counter-btn-v1">All Reservations</a>
          <button type="button" class="pmd-counter-btn-v1 is-icon" data-pmd-counter-refresh>⟳</button>
        </div>
      </header>

      <section class="pmd-counter-kpi-grid-v1" data-pmd-counter-kpis>
        <article><small>Today Reservations</small><strong>—</strong><span>Loading</span></article>
        <article><small>Upcoming Next</small><strong>—</strong><span>Loading</span></article>
        <article><small>Free Tables</small><strong>—</strong><span>Loading</span></article>
        <article><small>Attention</small><strong>—</strong><span>Loading</span></article>
      </section>

      <section class="pmd-counter-card-v1 pmd-counter-floor-card-v1">
        <header class="pmd-counter-card-head-v1">
          <div>
            <span>Live Floor</span>
            <h2>Table Map for Booking Decisions</h2>
            <p>Same dashboard data source. Free, busy, unpaid and reserved tables are visible before creating a booking.</p>
          </div>
          <div class="pmd-counter-card-actions-v1">
            <button type="button" data-pmd-counter-refresh>Refresh</button>
            <a href="/admin/tables">Tables</a>
          </div>
        </header>

        <div data-pmd-counter-floor>
          <div class="pmd-counter-empty-v1">Loading floor plan…</div>
        </div>
      </section>

      <section class="pmd-counter-split-v1">
        <div class="pmd-counter-card-v1">
          <header class="pmd-counter-card-head-v1">
            <div>
              <span>Reservations</span>
              <h2>Today / Upcoming Cards</h2>
              <p>Quick reception view for arrivals, delays, cancellations and table decisions.</p>
            </div>
            <a href="/admin/reservations/create">Walk-in / Phone booking</a>
          </header>

          <div class="pmd-counter-reservations-v1" data-pmd-counter-reservations>
            <div class="pmd-counter-empty-v1">Loading reservations…</div>
          </div>
        </div>

        <aside class="pmd-counter-card-v1">
          <header class="pmd-counter-card-head-v1">
            <div>
              <span>Counter Rules</span>
              <h2>Team Attention</h2>
              <p>What the counter person should watch.</p>
            </div>
          </header>

          <div class="pmd-counter-rule-list-v1">
            <article>
              <b>2h before</b>
              <span>Show booking on floor map and reservation list.</span>
            </article>
            <article>
              <b>60m before</b>
              <span>Soft-hold table if the restaurant uses assigned tables.</span>
            </article>
            <article>
              <b>30m before</b>
              <span>Alert staff: table should be prepared soon.</span>
            </article>
            <article>
              <b>15m after</b>
              <span>If guest is late, mark delayed / call guest / no-show after manager rule.</span>
            </article>
            <article>
              <b>Pre-order</b>
              <span>For now use reservation comment; later connect a draft order to reservation.</span>
            </article>
          </div>
        </aside>
      </section>
    </main>
  </div>

  <script src="/app/admin/assets/js/pmd-counter-dashboard-v1.js?v=1" defer></script>
</body>
</html>
