#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-audit}"

echo "========================================"
echo " PayMyDine preview frontend guard"
echo " mode: $MODE"
echo "========================================"

echo
echo "== PM2 =="
pm2 list || true

echo
echo "== Process details =="
node - <<'NODE'
const { execSync } = require("child_process");
const list = JSON.parse(execSync("pm2 jlist", {encoding:"utf8"}));
for (const p of list) {
  const env = p.pm2_env || {};
  console.log("----");
  console.log("name:", p.name);
  console.log("id:", p.pm_id);
  console.log("status:", env.status);
  console.log("cwd:", env.pm_cwd);
  console.log("script:", env.pm_exec_path);
  console.log("args:", Array.isArray(env.args) ? env.args.join(" ") : env.args);
  console.log("PORT:", env.PORT || env.port || "");
}
NODE

echo
echo "== Nginx references to preview ports 3002 / 3012 =="
NGINX_REFS="$(sudo grep -RInE 'proxy_pass http://127\.0\.0\.1:(3002|3012)' /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null || true)"
if [ -n "$NGINX_REFS" ]; then
  echo "$NGINX_REFS"
else
  echo "No nginx references found for preview ports."
fi

if [ "$MODE" = "audit" ]; then
  echo
  echo "✅ Audit only. Nothing changed."
  exit 0
fi

if [ "$MODE" = "stop-preview" ]; then
  if [ -n "$NGINX_REFS" ] && [ "${FORCE_STOP_PREVIEWS:-0}" != "1" ]; then
    echo
    echo "❌ Refusing to stop preview processes because nginx still routes to 3002/3012."
    echo "Run again only after nginx cleanup, or force with:"
    echo "FORCE_STOP_PREVIEWS=1 bash scripts/pmd_preview_frontend_guard.sh stop-preview"
    exit 20
  fi

  echo
  echo "== Stopping preview PM2 processes =="
  pm2 stop pmd-botanical-v0-exact pmd-modern-green-preview || true
  pm2 save || true
  echo "✅ Preview processes stopped."
  exit 0
fi

if [ "$MODE" = "delete-preview" ]; then
  if [ "${FORCE_DELETE_PREVIEWS:-0}" != "1" ]; then
    echo "❌ Deleting PM2 processes requires FORCE_DELETE_PREVIEWS=1."
    exit 30
  fi

  if [ -n "$NGINX_REFS" ] && [ "${FORCE_STOP_PREVIEWS:-0}" != "1" ]; then
    echo
    echo "❌ Refusing to delete preview processes because nginx still routes to 3002/3012."
    echo "Use FORCE_STOP_PREVIEWS=1 only when you accept those preview routes may break."
    exit 31
  fi

  pm2 delete pmd-botanical-v0-exact pmd-modern-green-preview || true
  pm2 save || true
  echo "✅ Preview processes deleted from PM2."
  exit 0
fi

echo "Unknown mode: $MODE"
exit 2
