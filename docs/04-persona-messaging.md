# PayMyDine Persona-Based Messaging (Phase 4)

## 1) Restaurant owner / founder
- **Care most about:** Revenue, margin, control over guest channel, easier operations.
- **What PayMyDine appears to offer:** Direct ordering stack + admin ops + payment flexibility.
- **Best 5 selling points:**
  1. Direct digital guest flow (table/menu/checkout)
  2. Menu/combos/options for upsell
  3. Multi-provider payment architecture
  4. Reservation + table management
  5. Staff/role control in one admin
- **Likely objections:** “Is this really production-stable for my payment setup?”
- **How to answer:** Show tenant-specific payment and checkout demo + exact provider setup matrix.
- **Needs confirmation before public claims:** exact wallet availability per provider per country.

## 2) Restaurant chain / multi-location operator
- **Care most about:** Rollout speed, standardization, brand consistency, governance.
- **Offer appears:** Tenant provisioning + superadmin + isolated DB per tenant.
- **Best 5 points:** tenant cloning, central oversight, role governance, KDS flows, POS/webhooks.
- **Objections:** “How robust is multi-tenant isolation in edge cases?”
- **Answer:** Walk through middleware and tenant DB switch logic + staging test evidence.
- **Needs confirmation:** custom domain onboarding process and SLA tooling.

## 3) Operations manager
- **Care most about:** Throughput, fewer errors, shift coordination.
- **Offer appears:** orders/reservations/tables/KDS/notifications/waiter-call.
- **Best 5 points:** KDS stations, reservation calendar, waiter call, status workflows, cash drawer tooling.
- **Objections:** “Will staff adopt this quickly?”
- **Answer:** Use role-based views and demonstrate short training path.
- **Needs confirmation:** depth of reporting KPIs for daily ops.

## 4) Finance / compliance stakeholder
- **Care most about:** payment traceability, tax/fiscal compliance, auditability.
- **Offer appears:** webhook payment lifecycle, Fiskaly artifacts, payment logs, tax/tip/coupon math.
- **Best 5 points:** provider webhooks, payment config controls, order totals decomposition, fiskaly-ready fields, log structures.
- **Objections:** “Is German compliance fully certified?”
- **Answer:** Position as compliance-ready architecture pending legal/accounting signoff.
- **Needs confirmation:** legal validation of full GoBD/KassenSichV workflow by deployment.

## 5) Technical / IT stakeholder
- **Care most about:** integration, maintainability, security boundaries.
- **Offer appears:** APIs, webhooks, tenant DB model, POS integration layer.
- **Best 5 points:** API v1 coverage, webhook handlers, tenant middleware, provider abstraction classes, superadmin tenant tools.
- **Objections:** “How clean is codebase given many backup files?”
- **Answer:** Scope to active paths and provide deployment hardening checklist.
- **Needs confirmation:** final production branch hygiene and automated test coverage depth.

## Core evidence paths
- `var/www/paymydine/app/admin/controllers/*`
- `var/www/paymydine/app/Http/Controllers/Api/*`
- `var/www/paymydine/app/Http/Middleware/DetectTenant.php`
- `var/www/paymydine/app/admin/routes.php`
- `var/www/paymydine/frontend/app/*`
