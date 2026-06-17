#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "❌ $1"; exit 1; }
pass() { echo "✅ $1"; }

[[ ! -d features/customer-menu/legacy-dom-repairs ]] || fail "legacy-dom-repairs folder came back"
pass "legacy-dom-repairs folder removed"

checkout_hook="features/customer-menu/checkout/dom-compat/useCheckoutDomCompatibilityEffects.ts"
organic_hook="features/customer-menu/theme/organic/useOrganicCheckoutDomPolish.ts"

[[ -f "$checkout_hook" ]] || fail "missing checkout compatibility hook boundary"
[[ -f "$organic_hook" ]] || fail "missing organic marker hook boundary"
pass "small compatibility hook boundaries are present"

grep -q "useCheckoutDomCompatibilityEffects" features/customer-menu/checkout/PaymentModalCore.tsx || fail "checkout hook boundary is not wired from PaymentModalCore"
grep -q "useOrganicCheckoutDomPolish" features/customer-menu/theme/useOrganicThemeEffects.ts || fail "organic marker hook boundary is not wired"
pass "checkout/organic hook boundaries are wired"

if grep -RIn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git "legacy-dom-repairs" features app components store lib 2>/dev/null | grep -q .; then
  grep -RIn --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git "legacy-dom-repairs" features app components store lib 2>/dev/null
  fail "legacy-dom-repairs imports remain"
fi
pass "no legacy-dom-repairs imports remain"

banned='MutationObserver|querySelector|querySelectorAll|getElementById|getElementsBy|style\.setProperty|appendChild|insertBefore|createElement|requestAnimationFrame|setTimeout|setInterval|closest\('

if grep -RInE "$banned" "$checkout_hook" "$organic_hook" 2>/dev/null | grep -q .; then
  grep -RInE "$banned" "$checkout_hook" "$organic_hook" 2>/dev/null
  fail "DOM repair APIs remain inside compatibility hook boundaries"
fi
pass "DOM repair APIs removed from compatibility hook boundaries"

checkout_lines=$(wc -l < "$checkout_hook" | awk '{print $1}')
organic_lines=$(wc -l < "$organic_hook" | awk '{print $1}')

[[ "$checkout_lines" -le 60 ]] || fail "$checkout_hook is $checkout_lines lines; expected <= 60"
[[ "$organic_lines" -le 45 ]] || fail "$organic_hook is $organic_lines lines; expected <= 45"
pass "checkout hook boundary line count: $checkout_lines"
pass "organic marker hook line count: $organic_lines"

grep -q "PMD_DOM_COMPAT_REAL_CSS_FIXES_20260617" styles/customer/checkout/checkout-theme-compat.css || fail "missing checkout real CSS replacement rules"
grep -q "PMD_ORGANIC_DOM_POLISH_REAL_CSS_FIXES_20260617" styles/customer/themes/shared-theme-compat.css || fail "missing organic real CSS replacement rules"
pass "CSS replacement rules are present"

echo "✅ DOM compatibility guard passed"
