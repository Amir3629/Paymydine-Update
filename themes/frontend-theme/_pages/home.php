---
title: Frontend Theme Home
permalink: "/"
layout: default
---

<?php
function onStart() {
    // Redirect root to Next.js app
    $nextUrl = env('NEXT_PUBLIC_FRONTEND_URL', 'https://217.154.78.123:3001');
    header('Location: '.$nextUrl);
    exit;
}
?>

---

<noscript>
  <meta http-equiv="refresh" content="0; url=https://217.154.78.123:3001" />
  <div style="padding:2rem; font-family: sans-serif;">
    If you are not redirected automatically, <a href="https://217.154.78.123:3001">click here</a> to open the frontend.
  </div>
  <script>window.location.replace('https://217.154.78.123:3001');</script>
</noscript>

