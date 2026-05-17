# AI Food Calories & Nutrition System — Investigation and Implementation Plan

Date: 2026-05-17
Status: Investigation/design only. Do not ship production nutrition generation until a guarded admin workflow, provider keys, validation rules, and legal copy are approved.

## Executive recommendation

Use a hybrid AI + nutrition-database architecture:

1. AI parses restaurant menu text, multilingual ingredient descriptions, portion notes, and chef-entered free text into structured ingredients.
2. A nutrition database supplies the actual nutrient values wherever possible.
3. Admins review and approve generated nutrition before anything appears to guests.
4. Frontend displays values as estimates with a clear disclaimer.

Do not rely on an LLM alone for calories or nutrition facts. LLMs are useful for normalization, translation, ambiguity handling, and explaining confidence, but authoritative nutrient values should come from a database or verified restaurant data.

## Current feature scope proposal

### Phase 1 — Safe admin-assisted estimates

Admin-only flow:

1. Admin opens a menu item.
2. Admin enters ingredients with amount and unit, for example:
   - `180g grilled chicken breast`
   - `120g cooked basmati rice`
   - `25g butter sauce`
3. Admin optionally enters portion yield, serving size, cooking method, and notes.
4. System generates a draft nutrition profile:
   - calories
   - protein
   - fat
   - carbohydrates
   - sugar
   - confidence score
   - matched ingredient sources
   - warnings / unmatched items
5. Admin reviews, edits, and explicitly approves.
6. Approved values appear on frontend with `Estimated nutrition` copy.

### Phase 2 — Restaurant customization

Add restaurant-specific defaults:

- preferred units
- default serving sizes
- house ingredients / sauces
- country-specific nutrition source preference
- language preference
- disclaimer text override per tenant
- whether nutrition is visible by default

### Phase 3 — Bulk generation

For restaurants with large menus, add background batch jobs to generate drafts, never auto-publish.

## Provider/API investigation

### OpenAI role

Recommended use: ingredient parsing, multilingual understanding, candidate matching, confidence explanations, and structured JSON output.

Relevant official OpenAI capabilities:

- Responses API supports text/image inputs, structured JSON/text outputs, function calling, and tools. Source: https://platform.openai.com/docs/api-reference/responses
- Structured Outputs can constrain responses to a JSON Schema, which is important for predictable nutrition pipeline inputs. Source: https://platform.openai.com/docs/guides/structured-outputs
- The current OpenAI model listing identifies GPT-5.2 as a frontier model and GPT-5 mini/nano as faster/cost-efficient options. Source: https://platform.openai.com/docs/models
- Batch API can process asynchronous jobs and is suitable for large enrichment workloads. Source: https://platform.openai.com/docs/guides/batch

Recommended OpenAI approach:

- Use the Responses API with Structured Outputs.
- Use a strict schema for parsed ingredients, units, grams, assumptions, warnings, and confidence.
- Prefer a cost-efficient model for routine parsing and only escalate ambiguous items to a stronger model.
- Keep all OpenAI calls server-side; never expose API keys to the frontend.
- Log prompt version, model, request ID, and schema version for auditability.

Example AI output schema concept:

```json
{
  "language_detected": "string",
  "serving_size": { "quantity": 1, "unit": "serving", "grams": 350 },
  "ingredients": [
    {
      "raw_text": "180g grilled chicken breast",
      "canonical_name": "chicken breast, grilled",
      "quantity": 180,
      "unit": "g",
      "grams": 180,
      "preparation": "grilled",
      "confidence": 0.92,
      "needs_admin_review": false
    }
  ],
  "warnings": ["Sauce recipe not provided; estimate may be inaccurate"]
}
```

### Nutrition database options

#### USDA FoodData Central

Pros:

- Public, credible nutrition data source.
- API offers food search and food detail endpoints.
- Useful baseline for generic ingredients.

Cons:

- US-centric data and food naming.
- Restaurant recipes require ingredient decomposition.
- Admin still must validate matches and portion weights.

Source: https://fdc.nal.usda.gov/api-guide

#### Edamam Nutrition Analysis API

Pros:

- Designed for recipe/ingredient text nutrition analysis.
- Supports NLP-style recipe analysis and multilingual capabilities on commercial plans.
- Returns macro/micro nutrients and diet/allergy labels.

Cons:

- Paid/commercial licensing and caching restrictions must be reviewed carefully.
- Vendor lock-in risk.
- Need tenant-level cost controls.

Sources:

- https://developer.edamam.com/edamam-docs-nutrition-api
- https://developer.edamam.com/edamam-nutrition-api

#### Nutritionix

Pros:

- Has natural-language nutrient endpoint for text such as ingredient lists.
- Useful for common and branded foods.

Cons:

- Commercial terms and coverage need review.
- English-oriented docs/API behavior may require AI translation/normalization for multilingual admin input.

Source: https://developer.nutritionix.com/docs/v2

## Recommended architecture

```text
Admin UI
  -> ingredient/portion form
  -> Generate Draft button
  -> backend validation
  -> AI parsing service
  -> nutrition provider service
  -> draft nutrition snapshot
  -> admin review/edit/approve
  -> frontend read-only display
```

### Backend services

Suggested service boundaries:

- `NutritionDraftService`
  - Creates draft records.
  - Applies tenant feature flags.
  - Prevents auto-publication.
- `IngredientParsingService`
  - Calls OpenAI Responses API with Structured Outputs.
  - Converts multilingual/free text to structured ingredient lines.
- `NutritionProviderService`
  - Abstract interface for USDA, Edamam, Nutritionix, or manual provider.
- `NutritionCalculationService`
  - Scales per-100g nutrient values to ingredient grams and serving count.
- `NutritionApprovalService`
  - Stores admin approvals and audit history.

### Data model proposal

Keep food attributes separate from nutrition. Do not overload allergens or menu flags.

Proposed tables:

#### `menu_nutrition_profiles`

- `nutrition_profile_id`
- `menu_id`
- `tenant_id` or tenant connection context if applicable
- `serving_size_label`
- `serving_size_grams`
- `calories_kcal`
- `protein_g`
- `fat_g`
- `carbs_g`
- `sugar_g`
- `fiber_g` nullable
- `sodium_mg` nullable
- `status` enum: `draft`, `needs_review`, `approved`, `rejected`
- `source_type` enum: `manual`, `ai_usda`, `ai_edamam`, `ai_nutritionix`, `imported`
- `confidence_score`
- `disclaimer_text`
- `approved_by`
- `approved_at`
- timestamps

#### `menu_nutrition_ingredients`

- `nutrition_ingredient_id`
- `nutrition_profile_id`
- `raw_text`
- `canonical_name`
- `quantity`
- `unit`
- `grams`
- `preparation`
- `provider_food_id`
- `provider_name`
- `match_confidence`
- `needs_review`
- `notes`
- timestamps

#### `menu_nutrition_audit_logs`

- `nutrition_audit_id`
- `nutrition_profile_id`
- `event_type`
- `actor_id`
- `before_json`
- `after_json`
- `provider_request_json`
- `provider_response_json`
- `model`
- `prompt_version`
- timestamps

## Admin UI design

Add a new admin section/tab after Food Attributes, not inside payment/order flows:

- Section title: `Calories & Nutrition`
- Fields:
  - Serving size label
  - Serving size grams
  - Ingredient lines repeater/free text
  - Cooking/portion notes
  - Generate draft button
  - Results table with calories/macros
  - Confidence and warnings panel
  - Source/matches panel
  - Approve / reject / edit manually controls

Rules:

- Draft values are never visible to guests.
- Approved values can be shown.
- Manual override must be allowed.
- Changes must be audited.
- Show source and timestamp to admin.

## Frontend display design

Guest-facing display should be compact and optional:

- Menu card: show calories only, e.g. `~620 kcal`, if approved.
- Item modal: show a nutrition panel with calories, protein, fat, carbs, sugar.
- Add small text: `Estimated nutrition. Values may vary by preparation and portion size.`
- Do not show low-confidence or unapproved drafts.
- Add tenant setting to hide nutrition display entirely.

## Multi-language handling

- Store admin-entered ingredient text unchanged.
- Use AI to detect language and create canonical English ingredient names for provider search.
- Store display translations separately only if needed.
- Show warnings when translation or ingredient matching is uncertain.
- Do not auto-translate allergen/legal claims without review.

## Accuracy and safety limitations

Nutrition estimates can vary because of:

- ingredient brands
- cooking loss/yield
- oil absorption
- sauces and garnishes
- portion variability
- ingredient substitutions
- ambiguous menu descriptions

Required disclaimer:

> Estimated nutrition only. Values may vary by ingredients, portion size, preparation, and supplier. Not intended as medical advice or certified nutrition labeling.

Legal/compliance note:

- If a jurisdiction requires certified menu labeling, AI-generated estimates should not be presented as certified values unless reviewed through the required legal/nutrition process.
- Keep generated values marked as estimates unless certified by the restaurant or a qualified nutrition provider.

## Rollout plan

1. Add feature flag: `nutrition_ai_enabled` per tenant.
2. Add provider credentials in server-side settings only.
3. Build schema and admin draft UI behind the feature flag.
4. Pilot with one internal/test tenant.
5. Compare AI/database output against manually calculated benchmark items.
6. Add bulk generation only after single-item workflow is stable.
7. Enable frontend display only for approved records.

## Testing plan

Static/programmatic checks:

- PHP syntax for new services/controllers/migrations.
- Unit tests for gram conversion and nutrient scaling.
- Contract tests for AI structured output schema validation.
- Provider adapter tests using recorded fixtures.
- Feature flag tests to prove nutrition UI/API stays hidden when disabled.
- Regression tests to ensure payment/order/tenant routing is untouched.

Manual QA:

- Create draft from English ingredients.
- Create draft from non-English ingredients.
- Confirm uncertain matches require admin review.
- Approve and verify frontend display.
- Reject draft and verify frontend stays hidden.
- Confirm tenant A nutrition does not leak to tenant B.

## Implementation sequencing

Recommended commits if/when implementation starts:

1. Feature flag and database migrations only.
2. Provider abstraction and calculation service with tests.
3. Admin draft UI behind feature flag.
4. OpenAI structured parsing service behind feature flag.
5. Nutrition provider adapter(s).
6. Frontend approved-only display.
7. Bulk generation/background jobs.

## Open questions before implementation

- Which countries/regions are target restaurants in for nutrition compliance?
- Is estimated nutrition enough, or does PayMyDine need certified nutrition labels?
- Which provider terms allow caching and guest display for commercial use?
- Expected monthly generated menu items per tenant?
- Should restaurants pay per AI generation or include it in plan tiers?
- What tenant-level budget/rate limits should be enforced?
