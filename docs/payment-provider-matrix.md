# Payment Provider Compatibility Matrices

## Phase 1 — provider_capability_matrix (research-level)

> This matrix reflects general provider capabilities, not what is currently implemented in this repository.

| Provider   | card | apple_pay | google_pay | paypal | cod |
|------------|------|-----------|------------|--------|-----|
| stripe     | yes  | yes       | yes        | no     | no  |
| paypal     | yes* | yes*      | yes*       | yes    | no  |
| worldline  | yes  | yes*      | yes*       | no     | no  |
| sumup      | yes  | yes*      | yes*       | yes*   | no  |
| square     | yes  | yes*      | yes*       | no     | no  |

`*` depends on product/region/setup.

## Phase 2 — implemented_flow_matrix (this codebase)

### Criteria used for "implemented"
- Admin validation + dropdown filtering
- Checkout rendering path exists
- API routing exists
- Provider config fields exist and are used by route
- End-to-end payment flow integration for this method/provider in current frontend/backend stack

| Provider\Method | card | apple_pay | google_pay | paypal | cod |
|-----------------|------|-----------|------------|--------|-----|
| stripe          | implemented | implemented | implemented | not implemented | not implemented |
| paypal          | not implemented | not implemented | not implemented | implemented | not implemented |
| worldline       | partially implemented | not implemented | not implemented | not implemented | not implemented |
| sumup           | partially implemented | not implemented | not implemented | not implemented | not implemented |
| square          | partially implemented | not implemented | not implemented | not implemented | not implemented |

### Why "partially implemented" for Worldline/SumUp/Square card
- Hosted/link creation routes exist or are close, but there is no complete order-confirm reconciliation path equivalent to the existing Stripe/PayPal flows in the current checkout pipeline.
- Therefore they are intentionally blocked from admin assignment to prevent silent runtime breakage.

## Phase 3 — enforced selectable providers (intersection)

`available_provider_options_for_method = intersection(provider_capability_matrix, implemented_flow_matrix)`

Result:
- card -> stripe
- apple_pay -> stripe
- google_pay -> stripe
- paypal -> paypal
- cod -> (no provider)
