# PayMyDine Positioning Framework (Phase 5)

## Positioning pillar 1: Direct ordering without marketplace dependence
- Message: “Your own digital ordering surface with your own data/control.”
- Proof base: table/menu/frontend + tenant routing.
- Confidence: CONFIRMED_FROM_CODE
- Evidence: `frontend/app/menu/page.tsx`, `frontend/app/table/[table_id]/page.tsx`, `app/admin/routes.php`

## Positioning pillar 2: Branded guest experience
- Message: “Tenant-aware domains and theming support branded ordering journeys.”
- Confidence: CONFIRMED_FROM_CODE
- Evidence: `app/Http/Middleware/DetectTenant.php`, `themes/*`, `SuperAdminController.php`

## Positioning pillar 3: QR/table convenience
- Message: “Guests can be guided from table QR context into ordering/payment flows.”
- Confidence: CONFIRMED_FROM_CODE
- Evidence: `app/Http/Controllers/Api/TableController.php`, `QrRedirectController.php`, `app/admin/routes.php`

## Positioning pillar 4: Integrated operations
- Message: “Orders, reservations, tables, kitchen, staff and notifications in one admin.”
- Confidence: CONFIRMED_FROM_CODE
- Evidence: admin controllers/models for Orders/Reservations/Tables/KitchenDisplay/Staff/Notifications

## Positioning pillar 5: Payment flexibility
- Message: “Method/provider matrix supports multiple PSP strategies.”
- Confidence: CONFIRMED_FROM_CODE (implementation), NEEDS_HUMAN_CONFIRMATION (tenant go-live)
- Evidence: `app/admin/controllers/Payments.php`, `app/admin/routes.php`, `app/Services/Payments/Providers/*`

## Positioning pillar 6: Back-office control
- Message: “Role-based admin and superadmin tenant controls for scaling operations.”
- Confidence: CONFIRMED_FROM_CODE
- Evidence: `StaffRoles.php`, `StaffGroups.php`, `SuperAdminController.php`

## Positioning pillar 7: Compliance confidence
- Message: “Germany-oriented fiscalization and data-protection features are present in architecture.”
- Confidence: CONFIRMED_FROM_CODE (artifacts), NEEDS_HUMAN_CONFIRMATION (legal signoff)
- Evidence: `app/admin/services/Fiskaly/*`, fiskaly migrations, `GDPRComplianceService.php`

## Positioning pillar 8: Scalable multi-tenant architecture
- Message: “Tenant-isolated databases and provisioning logic support multi-brand growth.”
- Confidence: CONFIRMED_FROM_CODE
- Evidence: `DetectTenant.php`, `config/database.php`, `SuperAdminController.php`

## Claims discipline (mandatory)
- Do not claim specific ROI %, customer counts, market leadership, or full legal certification without signed proof.
