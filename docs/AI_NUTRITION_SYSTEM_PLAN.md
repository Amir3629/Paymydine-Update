# AI Nutrition Assistant Plan (Safe Placeholder Scope)

## Current Production-Safe Status
- No production AI nutrition generation endpoint is enabled.
- No automatic nutrition write-back flow is enabled.
- Manual nutrition fields remain the source of truth: calories, protein, carbs, fat, sugar, serving_size.
- Admin users must manually review and save values.

## Guardrails
1. No hardcoded API keys in repo.
2. No automatic persistence of AI-generated values.
3. Any future AI output must be shown as draft suggestions only.
4. Tenant and menu context must be explicit for every suggestion request.
5. Feature must fail safely: if AI service is unavailable, manual entry flow is unchanged.

## Future Architecture (Non-implemented)
1. **Draft endpoint**: `POST /admin/menu/{id}/nutrition-suggest` (admin-auth only), returns draft JSON only.
2. **Validation layer**: enforce numeric bounds, nullable fields, and disclaimer metadata.
3. **UI state**: disabled-by-default "Suggest Nutrition" button with feature flag.
4. **Review step**: admin chooses which suggested fields to copy into form controls.
5. **Auditability**: log operator, menu_id, timestamp, and prompt hash (no PII/secrets in logs).

## Fallback UX
- If disabled or unavailable: show message "AI Nutrition Assistant is currently unavailable. Please enter estimates manually.".
- Keep existing manual nutrition helper text: restaurant-provided estimates may vary.

## Rollout Checklist (Future)
- Add env-based key management (not committed).
- Add per-tenant usage controls and rate limits.
- Add explicit consent text before first use.
- Add server-side timeout and retry policy with safe failure response.


## Environment flags
- `PMD_AI_NUTRITION_ENABLED=false` (default, recommended for production until provider is integrated)
- `PMD_AI_NUTRITION_PROVIDER=openai` (optional future provider selector)

When disabled, admin UI remains visible and returns the fallback message without generating or saving values.

- `PMD_AI_NUTRITION_MODEL=gpt-4.1-mini` (optional; defaults to gpt-4.1-mini)

When enabled with valid `OPENAI_API_KEY`, the admin-only menu form assistant returns **draft JSON suggestions only** (description, ingredients, and nutrition estimates). It never saves automatically.
