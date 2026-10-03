<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>{{ $groupName }} Pickup | PayMyDine</title>
    <style>
        :root{color-scheme:dark;--bg:#071510;--card:#10251d;--line:#25483b;--ink:#f2fff9;--muted:#a6c8ba;--ready:#68f0aa}
        *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif;min-height:100vh}
        header{padding:28px 34px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:20px;align-items:center}
        h1{margin:0;font-size:clamp(26px,4vw,48px)}header p{margin:7px 0 0;color:var(--muted)}
        .clock{font-variant-numeric:tabular-nums;font-size:22px;font-weight:800;color:var(--muted)}
        main{display:grid;grid-template-columns:1fr 1fr;gap:22px;padding:26px}
        section{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:22px;min-height:65vh}
        h2{margin:0 0 18px;font-size:24px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
        .order{border:1px solid var(--line);border-radius:16px;padding:16px}.order strong{display:block;font-size:34px;letter-spacing:-.03em}
        .order span{display:block;color:var(--muted);margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ready .order{border-color:#2b8e62;background:#0d3022}.ready .order strong{color:var(--ready)}
        .empty{color:var(--muted);padding:18px 0}footer{padding:0 28px 28px;color:var(--muted);font-size:13px}
        @media(max-width:760px){main{grid-template-columns:1fr;padding:14px}header{padding:20px}.clock{display:none}section{min-height:0}}
    </style>
</head>
<body>
<header>
    <div>
        <h1>{{ $groupName }}</h1>
        <p>Pickup board</p>
    </div>
    <div class="clock" data-clock></div>
</header>
<main>
    <section>
        <h2>Preparing</h2>
        <div class="grid" data-preparing></div>
    </section>
    <section class="ready">
        <h2>Ready for pickup</h2>
        <div class="grid" data-ready></div>
    </section>
</main>
<footer>Order numbers only. No customer details are shown.</footer>
<script>
(function () {
    var preparing = document.querySelector('[data-preparing]');
    var ready = document.querySelector('[data-ready]');
    var clock = document.querySelector('[data-clock]');
    var feed = @json(url('/pmd-foodcourt/'.$token.'/feed'));

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
        });
    }

    function render(target, rows) {
        if (!rows.length) {
            target.innerHTML = '<div class="empty">No orders here.</div>';
            return;
        }
        target.innerHTML = rows.map(function (row) {
            return '<div class="order"><strong>'+esc(row.order)+'</strong><span>'+esc(row.restaurant)+'</span></div>';
        }).join('');
    }

    function refresh() {
        fetch(feed, {credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}})
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP '+response.status);
                return response.json();
            })
            .then(function (data) {
                var rows = Array.isArray(data.orders) ? data.orders : [];
                render(preparing, rows.filter(function (row) { return row.status !== 'ready'; }));
                render(ready, rows.filter(function (row) { return row.status === 'ready'; }));
            })
            .catch(function () {});
    }

    function tick() {
        clock.textContent = new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());
    }

    tick();
    refresh();
    setInterval(tick, 1000);
    setInterval(refresh, 8000);
})();
</script>
</body>
</html>
