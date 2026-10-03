# Architecture

## Runtime topology

```text
Customer Browser
    |
    v
Next.js Frontend V2 :3002
    |  server fetch with tenant Host header
    |  client same-origin /api/v1 rewrites
    v
Laravel / PayMyDine :8000
    |
    v
Tenant Database
```

## First paint and theme authority

1. Next.js reads the tenant host (or the server-owned `PMD_TENANT_HOST_OVERRIDE` used by the isolated staging process), table query/path, QR and locale.
2. The server loader requests `/simple-theme`, `/settings`, `/api/v1/restaurant`, `/api/v1/menu`, payment methods, table information and current table-order state.
3. The backend theme ID is normalized once in `src/themes/catalog.ts`.
4. `ThemeRenderer` imports exactly one Theme module.
5. HTML and the selected CSS Module are rendered together.
6. Hydration adds interaction only; it does not replace the Theme or repaint the DOM.

There is no localStorage prepaint authority, no default Theme flash and no client-side Theme fallback tree.

## One owner per concern

| Concern | Owner |
|---|---|
| Tenant and initial data | `src/server/bootstrap.ts` |
| Backend normalization | `src/server/normalize.ts` |
| Theme selection and aliases | `src/themes/catalog.ts` |
| Theme composition and visuals | One directory under `src/themes/` |
| Cart and guest session | `MenuRuntimeContext.tsx` |
| Table order sync | `MenuRuntimeContext.tsx` and `client-api.ts` |
| Dialog behavior | `RuntimeOverlays.tsx` |
| Backend requests | `src/lib/client-api.ts` |
| UI translations | `src/lib/i18n.ts` |

## Theme isolation

Each Theme directory owns one component and one CSS Module. Themes may use shared headless actions and small semantic components, but may not import another Theme or alter global CSS.

```text
src/themes/<theme-id>/
  ThemeName.tsx
  ThemeName.module.css
```

## Multi-device table order

- A tenant/table-scoped guest UUID is stored locally.
- Personal items are POSTed to `table-order-draft/confirm-items` with that guest UUID.
- Shared draft/order state is polled from one owner every five seconds and on focus/visibility return.
- Submission creates or merges into the current unpaid table order in Laravel.
- Payment status changes on another phone are reflected in the common order snapshot.

## Preview safety

Preview bootstrap uses tenant ID `preview`. Runtime actions are simulated locally and do not issue production POST requests.
