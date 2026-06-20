# PayMyDine — Checkout Refactor Audit Report
**Date**: 2026-06-17  
**Auditor**: Claude Code (static analysis)  
**Branch**: main  
**Scope**: `frontend/features/customer-menu/checkout/` — commits 20fe96c1 through bd1bedb9

---

## Overall Verdict: RISKY — one confirmed regression bug, several type-safety gaps

Not "broken" globally (Neutral theme works), but the Modern Green and Kazen Japanese coupon
flow has a confirmed `undefined` handler bug introduced by the refactor.
Everything else audited is structurally sound.

---

## Important Note on Build / Typecheck

Build and typecheck could NOT be run during this audit (node_modules not installed locally).
**Before deploying, run these on the VPS:**

```bash
cd /var/www/paymydine/frontend
npm run build
npx tsc --noEmit --pretty false 2>&1 | head -80
```

The extensive `any` typing means TypeScript will NOT catch the missing-prop bug below —
it only surfaces at runtime. A build run will catch import errors or missing modules
from the extraction.

---

## 1. Confirmed Bugs

### BUG-1 — Missing coupon handlers in CheckoutShellRouter props spread
**File**: `PaymentModalCore.tsx` lines 657–793  
**Severity**: HIGH — crashes coupon UI on Modern Green and Kazen Japanese themes

`handleModernGreenApplyCoupon` (line 629) and `handleModernGreenRemoveCoupon` (line 651)
are defined in `PaymentModalCore` but are **not included** in the `{...{...}}` props spread
passed to `<CheckoutShellRouter>`.

`CheckoutShellRouter` then passes them as `onApplyCoupon` and `onRemoveCoupon` into both
`ModernGreenCheckoutShell` (lines 109–110) and `KazenJapaneseCheckoutShell` (lines 180–181).

Both shells wire these directly to button `onClick` handlers. With `undefined`, clicking
"Apply Coupon" or "Remove Coupon" throws:
```
TypeError: onApplyCoupon is not a function
```

**Affected flows**: coupon apply/remove on Modern Green and Kazen Japanese themes.  
**Unaffected**: Neutral theme (calls `validateCoupon`/`removeCoupon` from the CMS store directly).

**Fix — add two lines inside the props spread in PaymentModalCore.tsx, before the closing `}}`:**
```ts
        handleModernGreenApplyCoupon,
        handleModernGreenRemoveCoupon,
```
That is, insert them around line 790, after `modernGreenSubmittedItems,`.

**Backup command before editing:**
```bash
cp /var/www/paymydine/frontend/features/customer-menu/checkout/PaymentModalCore.tsx \
   /var/www/paymydine/storage/deploy-backups/PaymentModalCore.tsx.bak-$(date +%Y%m%d_%H%M%S)
```

**After fix, verify:**
```bash
cd /var/www/paymydine/frontend
npm run build && npx tsc --noEmit --pretty false 2>&1 | head -40
```

---

## 2. Risky Areas — Require Manual Browser Testing

### RISK-1 — `usePaymentReturnVerification` empty deps array (stale closure)
**File**: `usePaymentReturnVerification.ts` line 171

```ts
  }, [])  // eslint-disable-next-line react-hooks/exhaustive-deps
```

`handlePayment` is captured from the **first render** and not updated. If `submittedSnapshot`
or `tableDraft` load asynchronously after mount (they do — `useCheckoutTableDraftSync` fetches
on open), the return handler fires before state settles and may resolve with a stale/empty
order ID or amount.

This was **intentionally preserved** from pre-refactor behavior (hence the eslint-disable
comment), so it is not a new regression. But it is a pre-existing risk that needs coverage.

**Manual QA required**: complete a hosted checkout redirect for each provider (Worldline,
SumUp, VR Payment, Wero) and confirm the order is correctly marked paid on return.

---

### RISK-2 — `handleSubmitTableDraft` guard condition uses `&&` instead of `||`
**File**: `hooks/useCheckoutTableActions.ts` line 137

```ts
if (!tableDraft?.draft_id && tableDraft?.status !== "draft") return
```

With `&&` (AND), this guard only blocks when **both** conditions are true simultaneously:
no `draft_id` AND status is not "draft". If a draft has a `draft_id` but its status has
already advanced to `"submitted"` or `"paid"`, the function falls through and calls
`submitTableDraftAction` again, potentially causing a double-submission error from the API.

The likely intended guard is:
```ts
if (!tableDraft?.draft_id || tableDraft?.status !== "draft") return
```

However, this may be intentional — the server-side action presumably has its own idempotency
guard. Do not change without confirming original behavior.

**Manual QA required**: open the payment modal when the table draft status is already
`"submitted"` — confirm no double-submission toast or API error occurs.

---

### RISK-3 — `resolveSubmittedPaymentAmount()` called during render
**File**: `hooks/useCheckoutPaymentContext.ts` line 68

```ts
const stripePaymentData = {
    amount: resolveSubmittedPaymentAmount(),
    ...
}
```

This function reads `localStorage`/`sessionStorage` and is called on **every render** of
`PaymentModalCore` (not inside a `useMemo` or `useEffect`). Safe in client-side rendering
(all guarded with `typeof window`), but means `stripePaymentData` gets a new object
reference on every render. If `StripePaymentElement` is memoized and receives `stripePaymentData`
as a prop, it may re-mount unnecessarily.

No immediate action required, but worth wrapping in `useMemo` if Stripe element flickering
is observed.

---

### RISK-4 — `useCheckoutSplitBill` effect sets two states in one `useEffect`
**File**: `hooks/useCheckoutSplitBill.ts` lines 125–133

```ts
useEffect(() => {
    setSharePercents(prev => normalizeSharePercentsForGuestCount(...))
    setItemAssignments(prev => pruneItemAssignmentsForGuestCount(...))
}, [splitGuestCount, setSharePercents, setItemAssignments])
```

Two `setState` calls in one effect cause two re-renders (React 17) or one batched render
(React 18). Since `setSharePercents` and `setItemAssignments` are stable `useState` setters,
there is no loop risk. This is correct. Confirm the split guest add/remove UI does not flash
or double-render items when adjusting guest count.

---

## 3. Unused Values Returned from Hooks (Cleanup Opportunities)

These are not bugs — the values are computed correctly inside their hooks —
but they are returned and never destructured in `PaymentModalCore`. Safe to remove from the
hook return objects in a future cleanup pass.

| Hook | Unused return values |
|------|---------------------|
| `usePaymentProviderConfig` | `paymentMethods`, `methodByCode` |
| `useCheckoutSplitBill` | `itemSplitPeople`, `shareSplitPeople`, `splitSubtotal`, `splitExtraAmount` |
| `useCheckoutPaymentBase` | `isOrderStatusFlow`, `tipBaseAmount`, `couponBaseAmount` |

Note: `itemSplitPeople` and `shareSplitPeople` ARE consumed inside `useCheckoutSplitBill`
to build `activeSplitPeople`. They just don't need to be in the public return.

---

## 4. Type Safety Gaps

The following hooks accept their entire params as `any`. TypeScript will not catch
wrong call-site arguments (missing props, wrong types, etc.).

| Hook | Location |
|------|----------|
| `useCheckoutPaymentSummary` | params destructured as `}: any` (line 29) |
| `useCheckoutTableActions` | params destructured as `}: any` (line 28) |
| `useCheckoutReviewInvoiceActions` | params destructured as `}: any` (line 13) |
| `useCheckoutPaymentContext` | params destructured as `}: any` (line 14) |
| `useCheckoutDisplayItems` | params destructured as `}: any` (line 17) |
| `useCheckoutModalLifecycleEffects` | params destructured as `}: any` (line 29) |

No runtime bug today, but this is how BUG-1 was able to merge undetected (TypeScript
could not see the missing prop). Add typed interfaces incrementally — one hook per PR.

---

## 5. SSR / Browser-Only Safety

All `window`, `localStorage`, and `sessionStorage` accesses in the refactored files are
correctly guarded. No SSR regression risk.

| File | Guard |
|------|-------|
| `paymentModalStorage.ts` | All three functions gate on `typeof window === "undefined"` |
| `paymentModalResolution.ts` | `sessionStorage`/`localStorage` in try/catch + `typeof window` guard |
| `paymentModalHostedCheckout.ts` | All `window.location` writes guarded |
| `hooks/useCheckoutPaymentContext.ts` | URL reads guarded |
| `hooks/useCheckoutModalLifecycleEffects.ts` | `document`/`window` guarded in both `useLayoutEffect` blocks |

---

## 6. Customer Flow Verification Matrix

| Flow | Status | Notes |
|------|--------|-------|
| Personal cart → review → confirm items → table draft | ✅ Safe | `handleConfirmMyItems` correctly calls `clearCart()`, refreshes draft, fires `onOpenOrderUpdate` |
| Table draft → submit to kitchen | ✅ Safe | `handleSubmitTableDraft` correctly stores snapshot, updates checkout step. See RISK-2. |
| Submitted order → pay full amount | ✅ Safe | `resolveSubmittedPaymentOrderId` + `resolveSubmittedPaymentAmount` use correct priority chains |
| Submitted order → split equally | ✅ Safe | `equalSplitPeople` builds correctly from `splitGrandTotal` |
| Submitted order → split by item | ✅ Safe | `itemSplitPeople` built from `itemAssignments`, passed to `paymentModalPaymentFlow` as `selected_items` payload |
| Submitted order → split by shares | ✅ Safe | `shareSplitPeople` built from `sharePercents` |
| Tip percentage / custom tip | ✅ Safe | `updatePaymentTipPercentage` / `updatePaymentCustomTip` correctly route to per-guest or global tip state |
| Coupon apply / remove | ❌ **BUG-1** | Neutral theme ✅. Modern Green + Kazen handlers not forwarded — see BUG-1. |
| Stripe / card payment | ✅ Safe | `handlePaymentFlow` Stripe path preserved correctly |
| PayPal | ✅ Safe | PayPal config hook preserved, `effectivePayPalClientId` forwarded |
| Hosted redirect (Worldline, SumUp, VR Payment) | ✅ Safe | `paymentModalHostedCheckout.ts` fully preserved. See RISK-1 for return flow. |
| Cash (COD) | ✅ Safe | `cod` method code routed correctly in both flow branches |
| Payment success → order marked paid → cart clears | ✅ Safe | `markOpenOrderAsPaid` + `resetPaymentAdjustmentsAfterSuccess` + `clearCart` all called correctly |
| Review submit / business invoice download | ✅ Safe | `useCheckoutReviewInvoiceActions` resolves `orderId` from all fallback sources |
| `/checkout` route redirects to `/menu` | ✅ Safe | `app/checkout/page.tsx`: `redirect("/menu")` unchanged |
| VAT / tax display | ✅ Safe | `vatLabels` computed in `useCheckoutPaymentBase`, `paymentVatAmount`/`paymentVatPercentage` forwarded |

---

## 7. Safe to Continue Extracting JSX Panels?

**Yes — after fixing BUG-1.**

The hook extraction architecture is clean:
- All cross-hook dependencies pass through `PaymentModalCore` as explicit arguments.
- No hidden globals or side-channel dependencies between hooks.
- All SSR guards are in place.
- `resetPaymentAdjustmentsAfterSuccess`, `paidSplitPeople`/`setPaidSplitPeople`, and the
  key resolver functions (`resolveSubmittedPaymentOrderId`, `resolveSubmittedPaymentAmount`)
  stay correctly in `PaymentModalCore` scope and are passed as callbacks.

The remaining ~2228 lines are JSX render branches that can be broken out into panel components
one at a time safely. Suggested extraction order (lowest risk first):

1. Order status / ETA panel (read-only display)
2. Review / invoice panel
3. Split bill selection panel
4. Split review panel
5. Payment method selector
6. Payment form wrapper

---

## 8. Priority Action List

| Priority | Action | File |
|----------|--------|------|
| 🔴 Fix now | Add `handleModernGreenApplyCoupon` + `handleModernGreenRemoveCoupon` to props spread | `PaymentModalCore.tsx:790` |
| 🔴 Fix now | Run `npm run build` + `tsc --noEmit` on VPS to confirm no hidden TS/import errors | VPS |
| 🟡 QA | Test coupon apply/remove on Modern Green and Kazen Japanese themes | Browser |
| 🟡 QA | Test hosted payment return for Worldline, SumUp, VR Payment, Wero | Browser |
| 🟡 QA | Confirm no double-submit when draft is already in submitted status | Browser |
| 🟢 Cleanup | Add typed interfaces to replace `any` on all extracted hooks | hooks/*.ts |
| 🟢 Cleanup | Remove unused return values from `useCheckoutSplitBill`, `usePaymentProviderConfig`, `useCheckoutPaymentBase` | hooks/*.ts |

---

*Generated by static code analysis — 2026-06-17. Does not substitute for a full build run and manual QA pass.*
