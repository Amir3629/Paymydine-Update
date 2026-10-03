#!/usr/bin/env bash
set -eu

# PMD frontend live-authority audit (READ ONLY)
# Usage:
#   PMD_TENANT_HOST=tomo.paymydine.com bash scripts/pmd-frontend-live-authority-audit.sh
#
# This script never edits Nginx, PM2, env files, or application data.

HOST="${PMD_TENANT_HOST:-}"
V1_PORT="${PMD_FRONTEND_V1_PORT:-3001}"
V2_PORT="${PMD_FRONTEND_V2_PORT:-3002}"

say() { printf '%s\n' "$*"; }
section() { printf '\n== %s ==\n' "$*"; }

section "Repository routing intent"
say "Expected customer-tenant authority: Frontend V2 on 127.0.0.1:${V2_PORT}"
say "Legacy/local fallback: 127.0.0.1:${V1_PORT}"

section "PM2 processes"
if command -v pm2 >/dev/null 2>&1; then
  pm2 jlist 2>/dev/null | node -e '
    let s=""; process.stdin.on("data",d=>s+=d); process.stdin.on("end",()=>{
      try {
        const rows=JSON.parse(s);
        for (const p of rows) {
          const env=p.pm2_env||{};
          const port=env.PORT||env.port||"";
          console.log(`${p.name}\tstatus=${env.status||"unknown"}\tpid=${p.pid||""}\tport=${port}`)
        }
      } catch (e) { process.exit(2) }
    })
  ' || say "WARN: could not parse pm2 jlist"
else
  say "WARN: pm2 not found"
fi

section "Local health fingerprints"
for port in "$V1_PORT" "$V2_PORT"; do
  say "-- http://127.0.0.1:${port}/api/health"
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 5 "http://127.0.0.1:${port}/api/health" 2>/dev/null || say "UNREACHABLE"
    printf '\n'
  else
    say "WARN: curl not found"
  fi
done

section "Nginx routing evidence"
if command -v nginx >/dev/null 2>&1; then
  if [ -n "$HOST" ]; then
    say "Looking for host: $HOST"
    nginx -T 2>/dev/null | grep -n -E "server_name[[:space:]].*${HOST//./\\.}|proxy_pass[[:space:]].*(3001|3002)" | head -n 120 || true
  else
    say "PMD_TENANT_HOST not set; showing 3001/3002 proxy lines only"
    nginx -T 2>/dev/null | grep -n -E "proxy_pass[[:space:]].*(3001|3002)" | head -n 120 || true
  fi
else
  say "WARN: nginx binary not found"
fi

if [ -n "$HOST" ]; then
  section "Public host fingerprints"
  if command -v curl >/dev/null 2>&1; then
    say "-- https://${HOST}/api/health"
    curl -fsS --max-time 8 "https://${HOST}/api/health" 2>/dev/null || say "UNREACHABLE"
    printf '\n'
    say "-- https://${HOST}/ (headers)"
    curl -fsSI --max-time 8 "https://${HOST}/" 2>/dev/null | sed -n '1,30p' || say "UNREACHABLE"
  fi
fi

section "Interpretation"
say "PASS authority when all three agree:"
say "1) tenant route targets 3002,"
say "2) paymydine-frontend-v2 is online,"
say "3) 3002 /api/health identifies service=paymydine-frontend-v2."
say "If any disagree, do not enable Guest AI; fix frontend routing first."
