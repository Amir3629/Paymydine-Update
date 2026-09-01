#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${PMD_AI_BASE_REF:-origin/main}"
FEATURE_REF="${PMD_AI_FEATURE_REF:-origin/feature/pmd-intelligence-openai-v1-20260901}"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "RESULT: FAIL"
  echo "ERROR: run from the PayMyDine Git working tree"
  exit 2
fi

if ! git rev-parse --verify "$BASE_REF^{commit}" >/dev/null 2>&1; then
  echo "RESULT: FAIL"
  echo "ERROR: missing $BASE_REF; run git fetch origin --prune first"
  exit 2
fi

if ! git rev-parse --verify "$FEATURE_REF^{commit}" >/dev/null 2>&1; then
  echo "RESULT: FAIL"
  echo "ERROR: missing $FEATURE_REF; run git fetch origin --prune first"
  exit 2
fi

TMP_INDEX="$(mktemp /tmp/pmd-ai-origin-index.XXXXXX)"
DIFF_FILE="$(mktemp /tmp/pmd-ai-origin-diff.XXXXXX)"
EXTRA_FILE="$(mktemp /tmp/pmd-ai-origin-extra.XXXXXX)"
rm -f "$TMP_INDEX"
trap 'rm -f "$TMP_INDEX" "$DIFF_FILE" "$EXTRA_FILE"' EXIT

# Load origin/main into an isolated temporary index. The repository's real
# index, staged changes and working tree are never modified by this script.
GIT_INDEX_FILE="$TMP_INDEX" git read-tree "$BASE_REF"
GIT_INDEX_FILE="$TMP_INDEX" git diff-files --name-status > "$DIFF_FILE" || true
GIT_INDEX_FILE="$TMP_INDEX" git ls-files --others --exclude-standard > "$EXTRA_FILE" || true

echo "===== PMD AI VPS PREFLIGHT ====="
echo "LOCAL_HEAD: $(git rev-parse HEAD)"
echo "BASE_REF: $BASE_REF $(git rev-parse "$BASE_REF")"
echo "FEATURE_REF: $FEATURE_REF $(git rev-parse "$FEATURE_REF")"
echo

printf 'WORKTREE_TRACKED_DIFFS_VS_BASE: '
wc -l < "$DIFF_FILE" | tr -d ' '
printf 'WORKTREE_ONLY_PATHS_VS_BASE: '
wc -l < "$EXTRA_FILE" | tr -d ' '

echo
echo "===== AI DEPENDENCY BYTE CHECK vs $BASE_REF ====="
critical_paths=(
  "composer.json"
  "app/Http/Kernel.php"
  "app/Http/Middleware/TenantDatabaseMiddleware.php"
  "app/Http/Middleware/PmdAdminTenantAuthContext.php"
  "app/Http/Middleware/PmdAdminRetiredPagesR77.php"
  "app/Services/PmdKitchenWorkforceService.php"
  "app/admin/classes/AdminController.php"
  "app/admin/ServiceProvider.php"
  "app/admin/controllers/Reservations2.php"
  "app/admin/controllers/Dashboard2.php"
  "app/admin/controllers/Pmdreports.php"
  "app/admin/controllers/Dashboardlab.php"
  "app/admin/routes.php"
  "routes/admin-app-before.php"
)

critical_mismatches=0
for path in "${critical_paths[@]}"; do
  base_blob="$(git rev-parse "$BASE_REF:$path" 2>/dev/null || true)"
  if [[ -f "$path" ]]; then
    live_blob="$(git hash-object -- "$path" 2>/dev/null || true)"
  else
    live_blob=""
  fi

  if [[ -n "$base_blob" && "$live_blob" == "$base_blob" ]]; then
    printf 'MATCH  %s\n' "$path"
  else
    printf 'DIFF   %s\n' "$path"
    critical_mismatches=$((critical_mismatches + 1))
  fi
done

echo
echo "===== AI TARGET COLLISION CHECK vs $FEATURE_REF ====="
ai_paths=(
  "app/Services/AI/AiAuditLogger.php"
  "app/Services/AI/AiBudgetService.php"
  "app/Services/AI/AiContext.php"
  "app/Services/AI/AiOrchestrator.php"
  "app/Services/AI/AiRedactor.php"
  "app/Services/AI/OpenAiResponsesProvider.php"
  "app/Services/AI/PmdReadAuthority.php"
  "app/admin/assets/css/pmd-intelligence-v1.css"
  "app/admin/assets/js/pmd-intelligence-v1.js"
  "app/admin/controllers/Pmdintelligence.php"
  "app/admin/views/pmdintelligence/index.blade.php"
  "config/pmd_ai.php"
  "docs/PMD_INTELLIGENCE_V1.md"
  "scripts/pmd-ai-openai-smoke.php"
  "tests/Unit/PmdAiFoundationTest.php"
)

collision_mismatches=0
for path in "${ai_paths[@]}"; do
  feature_blob="$(git rev-parse "$FEATURE_REF:$path" 2>/dev/null || true)"
  if [[ ! -e "$path" ]]; then
    printf 'ABSENT_OK      %s\n' "$path"
    continue
  fi

  live_blob="$(git hash-object -- "$path" 2>/dev/null || true)"
  if [[ -n "$feature_blob" && "$live_blob" == "$feature_blob" ]]; then
    printf 'ALREADY_MATCH  %s\n' "$path"
  else
    printf 'COLLISION_DIFF %s\n' "$path"
    collision_mismatches=$((collision_mismatches + 1))
  fi
done

echo
echo "===== IMPORTANT ACTUAL MISMATCHES vs $BASE_REF ====="
awk -F '\t' '
  $2 ~ /^(composer\.json|app\/Http\/(Kernel\.php|Middleware\/)|app\/Services\/|app\/admin\/(classes\/AdminController\.php|ServiceProvider\.php|controllers\/|routes\.php)|routes\/)/ { print }
' "$DIFF_FILE" | head -200 || true

echo
echo "===== WORKTREE-ONLY SAMPLE vs $BASE_REF ====="
grep -Ev '(^|/)(storage|bootstrap/cache|node_modules|vendor)(/|$)|(^|/)\.env($|\.)' "$EXTRA_FILE" | head -80 || true

echo
echo "CRITICAL_DEPENDENCY_MISMATCHES: $critical_mismatches"
echo "AI_TARGET_COLLISION_MISMATCHES: $collision_mismatches"

if [[ "$critical_mismatches" -eq 0 && "$collision_mismatches" -eq 0 ]]; then
  echo "RESULT: PASS"
  echo "NOTE: AI dependencies match origin/main and AI target paths have no conflicting live content."
  exit 0
fi

echo "RESULT: BLOCKED"
echo "NOTE: Do not deploy PMD Intelligence until the DIFF/COLLISION paths are reconciled."
exit 3
