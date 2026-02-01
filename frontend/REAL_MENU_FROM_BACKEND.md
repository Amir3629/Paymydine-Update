# Getting the Real Menu from the Backend (Same as Admin)

The frontend menu should show the **same list** as the admin order create page (`/admin/orders/create`). Both use the same backend data: menus + media + categories + options.

---

## How It Works

| Source | Data |
|--------|------|
| **Admin** `orders/create` | `Menus_model::with(['media', 'categories'])->get()` + options from DB |
| **API** `GET /api/v1/menu` | Same: menus + media_attachments + categories, one row per menu, with options via `getMenuItemOptions()` |

The API returns:
- `data.items` – menu items (id, name, description, price, category_id, category_name, image, options, isCombo, comboId)
- `data.categories` – list of categories (id, name, priority)

---

## What You Need to Update

### 1. Backend (Laravel)

- **CORS** – The frontend origin must be allowed. In `config/cors.php` you have `'allowed_origins' => ['*']`. If you still get 403:
  - Ensure Laravel’s CORS middleware is applied (e.g. in `app/Http/Kernel.php`).
  - Or set explicit origins, e.g. `['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001']`.
- **API route** – `GET /api/v1/menu` is in `app/main/routes.php` (Main module). Main must be loaded (`config/system.php` → `modules` includes `'Main'`).
- **Clear cache** after any config/route change:
  ```bash
  php artisan config:clear
  php artisan route:clear
  php artisan cache:clear
  ```

### 2. Frontend (Next.js) – Environment

So the frontend calls the **Laravel backend** (not itself):

- **Local dev** (e.g. frontend on 3001, Laravel on 8000):
  - In `frontend/.env.local` (or `.env`):
    ```env
    NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
    ```
  - Or, if Laravel is on 127.0.0.1:
    ```env
    NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
    ```
  - Restart the Next dev server after changing env.
- **Production** – If frontend and backend are on the **same domain** (e.g. `mimoza.paymydine.com`), no extra env is needed. If they are on **different domains**, set:
  ```env
  NEXT_PUBLIC_API_BASE_URL=https://your-laravel-domain.com
  ```

### 3. Frontend – Code (Already Done)

- Menu is loaded via `getMenuData()` → `apiClient.getMenu()` → `GET {backend}/api/v1/menu`.
- No static fallback: only `apiMenuItems` from the API are shown.
- API response is mapped in `lib/data.ts` (`convertApiMenuItem`) to the shape the UI expects (including image URL from `/api/media/...`).

---

## Quick Checklist

1. **Backend**
   - [ ] Laravel running (e.g. `http://localhost:8000` or `http://127.0.0.1:8000`).
   - [ ] Main module enabled (`config/system.php` → `'modules' => [..., 'Main']`).
   - [ ] CORS allows your frontend origin (or `*`).
   - [ ] `GET http://localhost:8000/api/v1/menu` returns JSON with `success: true` and `data.items` (and `data.categories`).

2. **Frontend**
   - [ ] `NEXT_PUBLIC_API_BASE_URL` set to your Laravel URL when frontend and backend are on different origins (e.g. dev: 3001 vs 8000).
   - [ ] Restart Next after changing `.env`.
   - [ ] No static/mock menu: only API data is shown (already implemented).

3. **Verify**
   - Open `/admin/orders/create` and note the menu items.
   - Open the frontend menu page; the same items (and categories) should appear (with images from `/api/media/...` if configured).

---

## If the Menu Is Empty or You See CORS Errors

- **CORS 403** – Backend must send `Access-Control-Allow-Origin` for your frontend origin. Check `config/cors.php` and that CORS middleware runs for `api/*`.
- **Empty menu** – Call `GET /api/v1/menu` in the browser or with `curl`. If it returns items, the problem is frontend URL or env. If it returns empty or 404, fix the backend (route, Main module, DB).
- **Images 404** – Menu images use `/api/media/{path}`. Ensure that route is registered and that files exist under `assets/media/attachments/public/` (see project docs on media).

This setup aligns the frontend menu with the admin order create page so both use the same real list from the backend.
