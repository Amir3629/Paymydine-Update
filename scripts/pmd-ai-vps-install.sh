#!/usr/bin/env bash
set -euo pipefail

FEATURE_REF="${PMD_AI_FEATURE_REF:-origin/feature/pmd-intelligence-openai-v1-20260901}"
USE_SUDO="${PMD_AI_USE_SUDO:-0}"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "RESULT: FAIL"
  echo "ERROR: run from the PayMyDine Git working tree"
  exit 2
fi

if ! git rev-parse --verify "$FEATURE_REF^{commit}" >/dev/null 2>&1; then
  echo "RESULT: FAIL"
  echo "ERROR: missing $FEATURE_REF; run git fetch origin --prune first"
  exit 2
fi

PRECHECK="$(mktemp /tmp/pmd-ai-preflight.XXXXXX)"
STAGE="$(mktemp -d /tmp/pmd-ai-install.XXXXXX)"
trap 'rm -f "$PRECHECK"; rm -rf "$STAGE"' EXIT

git show "$FEATURE_REF:scripts/pmd-ai-vps-preflight.sh" > "$PRECHECK"
chmod 700 "$PRECHECK"

if ! bash "$PRECHECK"; then
  echo "INSTALL_RESULT: BLOCKED_BY_PREFLIGHT"
  exit 3
fi

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

echo "===== STAGING PMD INTELLIGENCE FROM $FEATURE_REF ====="
git archive "$FEATURE_REF" -- "${ai_paths[@]}" | tar -x -C "$STAGE"

echo "===== PHP SYNTAX CHECK IN ISOLATED STAGE ====="
while IFS= read -r -d '' file; do
  php -l "$file" >/dev/null
  echo "LINT_OK ${file#$STAGE/}"
done < <(find "$STAGE" -type f -name '*.php' ! -name '*.blade.php' -print0)

echo "===== TARGET PERMISSION PRECHECK ====="
permission_blockers=0
for path in "${ai_paths[@]}"; do
  if [[ -e "$path" ]]; then
    continue
  fi

  ancestor="$(dirname "$path")"
  while [[ ! -d "$ancestor" && "$ancestor" != "." && "$ancestor" != "/" ]]; do
    ancestor="$(dirname "$ancestor")"
  done

  if [[ ! -d "$ancestor" || ! -w "$ancestor" ]]; then
    owner="unknown"
    group="unknown"
    mode="unknown"
    if [[ -e "$ancestor" ]]; then
      owner="$(stat -c '%U' "$ancestor" 2>/dev/null || echo unknown)"
      group="$(stat -c '%G' "$ancestor" 2>/dev/null || echo unknown)"
      mode="$(stat -c '%a' "$ancestor" 2>/dev/null || echo unknown)"
    fi
    printf 'PERMISSION_BLOCK path=%s ancestor=%s owner=%s group=%s mode=%s\n' "$path" "$ancestor" "$owner" "$group" "$mode"
    permission_blockers=$((permission_blockers + 1))
  else
    printf 'WRITABLE_OK      %s via %s\n' "$path" "$ancestor"
  fi
done

if [[ "$permission_blockers" -gt 0 && "$USE_SUDO" != "1" ]]; then
  echo "INSTALL_RESULT: BLOCKED_BY_PERMISSIONS"
  echo "PERMISSION_BLOCKERS: $permission_blockers"
  echo "No AI target files were written by this installer run."
  echo "If the ownership audit is expected, rerun with PMD_AI_USE_SUDO=1; only new AI paths will use sudo install."
  exit 6
fi

if [[ "$permission_blockers" -gt 0 && "$USE_SUDO" == "1" ]]; then
  if ! command -v sudo >/dev/null 2>&1; then
    echo "INSTALL_RESULT: BLOCKED_BY_PERMISSIONS"
    echo "ERROR: PMD_AI_USE_SUDO=1 requested but sudo is unavailable"
    exit 6
  fi
  echo "Requesting sudo authorization for new AI target paths only."
  sudo -v
fi

nearest_existing_dir() {
  local path="$1"
  local ancestor
  ancestor="$(dirname "$path")"
  while [[ ! -d "$ancestor" && "$ancestor" != "." && "$ancestor" != "/" ]]; do
    ancestor="$(dirname "$ancestor")"
  done
  printf '%s\n' "$ancestor"
}

ensure_parent_dir() {
  local path="$1"
  local parent ancestor owner group mode
  parent="$(dirname "$path")"
  [[ -d "$parent" ]] && return 0

  ancestor="$(nearest_existing_dir "$path")"
  owner="$(stat -c '%U' "$ancestor")"
  group="$(stat -c '%G' "$ancestor")"
  mode="$(stat -c '%a' "$ancestor")"

  if [[ "$USE_SUDO" == "1" ]]; then
    sudo install -d -o "$owner" -g "$group" -m "$mode" "$parent"
  else
    install -d -m "$mode" "$parent"
  fi
}

install_new_file() {
  local src="$1"
  local path="$2"
  local parent owner group
  parent="$(dirname "$path")"
  owner="$(stat -c '%U' "$parent")"
  group="$(stat -c '%G' "$parent")"

  if [[ "$USE_SUDO" == "1" ]]; then
    sudo install -o "$owner" -g "$group" -m 0644 "$src" "$path"
  else
    install -m 0644 "$src" "$path"
  fi
}

echo "===== INSTALLING NEW AI FILES ONLY ====="
for path in "${ai_paths[@]}"; do
  src="$STAGE/$path"
  if [[ ! -f "$src" ]]; then
    echo "RESULT: FAIL"
    echo "ERROR: staged feature file missing: $path"
    exit 4
  fi

  feature_blob="$(git rev-parse "$FEATURE_REF:$path")"
  if [[ -f "$path" ]]; then
    live_blob="$(git hash-object -- "$path")"
    if [[ "$live_blob" == "$feature_blob" ]]; then
      echo "ALREADY_PRESENT $path"
      continue
    fi
    echo "RESULT: FAIL"
    echo "ERROR: target changed after preflight: $path"
    exit 5
  fi

  ensure_parent_dir "$path"
  install_new_file "$src" "$path"

  live_blob="$(git hash-object -- "$path")"
  if [[ "$live_blob" != "$feature_blob" ]]; then
    echo "RESULT: FAIL"
    echo "ERROR: installed hash mismatch: $path"
    exit 7
  fi
  echo "INSTALLED $path"
done

echo "===== POST-INSTALL PHP SYNTAX CHECK ====="
for path in "${ai_paths[@]}"; do
  case "$path" in
    *.blade.php) continue ;;
    *.php)
      php -l "$path" >/dev/null
      echo "LINT_OK $path"
      ;;
  esac
done

echo "INSTALL_RESULT: PASS_FAIL_CLOSED"
echo "PMD Intelligence files are installed, but PMD_AI_ENABLED remains false unless explicitly configured server-side."
echo "No Git index, existing PMD source file, .env value, payment/order/auth file, or database row was changed by this installer."
