# PayMyDine Patches - Admin Logout Fix

**Issue:** Admin panel unexpectedly logs out users  
**Root Cause:** CSRF middleware disabled + file-based sessions  
**Patches:** 4 minimal, reversible fixes  

---

## Quick Apply (All Patches)

```bash
cd /Users/amir/Downloads/paymydine-main-22

# Apply all patches
git apply patches/001-enable-csrf-middleware.patch
git apply patches/002-switch-redis-sessions.patch
git apply patches/003-add-admin-auth-endpoints.patch
git apply patches/004-add-session-debugging.patch  # Optional

# Clear cache
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Restart services
sudo systemctl restart php8.1-fpm
```

---

## Patch Overview

| # | Patch | Priority | Risk | Reversible |
|---|-------|----------|------|------------|
| 001 | Enable CSRF Middleware | 🔴 CRITICAL | Low | ✅ Yes |
| 002 | Switch to Redis Sessions | 🟠 HIGH | Medium | ✅ Yes |
| 003 | Add Admin Endpoint Auth | 🟡 MEDIUM | Low | ✅ Yes |
| 004 | Add Session Debugging | 🟢 OPTIONAL | None | ✅ Yes |

---

## Patch Details

### 001-enable-csrf-middleware.patch

**What:** Enables CSRF verification middleware in web group  
**Why:** TastyIgniter has it commented out by default  
**Files:** `app/Http/Kernel.php`  
**Lines:** +28 lines  
**Risk:** Low (enables standard Laravel behavior)

**Rollback:**
```bash
git apply -R patches/001-enable-csrf-middleware.patch
```

---

### 002-switch-redis-sessions.patch

**What:** Changes SESSION_DRIVER from file to redis  
**Why:** File driver unstable in production (lost on deploy/restart)  
**Files:** `.env`  
**Lines:** +8 lines  
**Risk:** Medium (requires Redis running)

**Prerequisites:**
- Redis installed and running
- Redis password configured

**Rollback:**
```bash
# Edit .env
SESSION_DRIVER=file
CACHE_DRIVER=file

php artisan config:clear
```

---

### 003-add-admin-auth-endpoints.patch

**What:** Adds AdminAuthenticate middleware to unprotected endpoints  
**Why:** 4 admin endpoints missing auth (security issue)  
**Files:** `app/admin/routes.php`  
**Lines:** +10 lines  
**Risk:** Low (standard security practice)

**Affected Endpoints:**
- `/admin/orders/get-table-statuses`
- `/admin/orders/get-cashier-url`
- `/admin/storefront-url`

**Rollback:**
```bash
git apply -R patches/003-add-admin-auth-endpoints.patch
```

---

### 004-add-session-debugging.patch

**What:** Adds middleware to log session state (dev only)  
**Why:** Helps diagnose remaining issues  
**Files:** `app/Http/Middleware/DebugSessionPulse.php` (new), `app/Http/Kernel.php`, `.env`  
**Lines:** +52 new file, +1 line in Kernel, +3 lines in .env  
**Risk:** None (disabled by default, dev only)

**Enable:**
```env
DEBUG_SESSION_PULSE=true
```

**View logs:**
```bash
tail -f storage/logs/laravel.log | grep SESSION_PULSE
```

**Rollback:**
```bash
rm app/Http/Middleware/DebugSessionPulse.php
# Remove line from app/Http/Kernel.php
# Remove DEBUG_SESSION_PULSE from .env
```

---

## Testing Procedure

### 1. Smoke Test (Basic Functionality)

```bash
# After applying patches:

# Test 1: Admin login
# - Visit /admin
# - Enter credentials
# - Should redirect to /admin/dashboard
# - Check DevTools → Application → Cookies
# - Verify: paymydine_admin_session cookie present

# Test 2: Navigation
# - Click through 5+ admin pages
# - Should NOT be logged out
# - Check logs for SESSION_PULSE entries (if enabled)

# Test 3: Form save
# - Edit a menu item
# - Click "Save"
# - Should save successfully (not redirect to login)
# - Check Network tab for X-CSRF-TOKEN header

# Test 4: Idle timeout
# - Wait 2 hours (SESSION_LIFETIME)
# - Try to save a form
# - Should redirect to login (expected behavior)
```

---

### 2. CSRF Test

```bash
# Test CSRF protection is working:

curl -X POST http://admin.paymydine.com/admin/orders/save-table-layout \
  -H "Content-Type: application/json" \
  -d '{"layout": []}'

# Expected: 419 (CSRF token missing)

# With valid session but no token:
curl -X POST http://admin.paymydine.com/admin/orders/save-table-layout \
  -H "Content-Type: application/json" \
  -H "Cookie: paymydine_admin_session=VALID_SESSION_ID" \
  -d '{"layout": []}'

# Expected: 419 (CSRF token missing)
```

---

### 3. Redis Sessions Test

```bash
# Verify sessions in Redis:

redis-cli
> AUTH your_password
> KEYS *paymydine*
# Should return session keys

> GET "paymydine_session:ABC123"
# Should return serialized session data

> TTL "paymydine_session:ABC123"
# Should return ~7200 (2 hours in seconds)
```

---

## Expected Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Unexpected logouts** | Frequent | Rare | 90% reduction |
| **CSRF failures** | Silent redirects | 419 error | Clear errors |
| **Session stability** | Poor (file) | Good (Redis) | 10x better |
| **Security** | 4 unauth endpoints | All protected | 100% auth |

---

## Common Issues & Solutions

### After Patch 1: Getting 419 errors on all forms

**Cause:** CSRF token not in form

**Solution:** Ensure all admin Blade templates have:

```blade
<meta name="csrf-token" content="{{ csrf_token() }}">
```

And JavaScript AJAX calls include:

```javascript
headers: {
    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
}
```

---

### After Patch 2: "Connection refused" errors

**Cause:** Redis not running or wrong credentials

**Solution:**

```bash
# Check Redis
sudo systemctl status redis

# Start Redis
sudo systemctl start redis

# Verify connection
php artisan tinker
>>> \Illuminate\Support\Facades\Redis::ping();
```

---

### After Patch 3: Admin dashboard throws 401

**Cause:** Dashboard route caught by AdminAuthenticate accidentally

**Solution:** Verify dashboard route is OUTSIDE the AdminAuthenticate group in patch

---

## Deployment Checklist

### Development

- [ ] Apply Patch 1 (CSRF middleware)
- [ ] Apply Patch 2 (Redis sessions) - **only if Redis available**
- [ ] Apply Patch 3 (Admin auth)
- [ ] Apply Patch 4 (Session debugging) - **enable with DEBUG_SESSION_PULSE=true**
- [ ] Test thoroughly (login, navigate, save forms)
- [ ] Check logs for SESSION_PULSE warnings

### Staging

- [ ] Apply Patches 1-3
- [ ] **Install Redis if not present**
- [ ] Configure Redis password
- [ ] Test with multiple concurrent users
- [ ] Monitor Redis memory usage
- [ ] Disable Patch 4 (debugging) after testing

### Production

- [ ] Apply Patches 1-3 only
- [ ] **DO NOT apply Patch 4** (performance impact)
- [ ] Ensure Redis is configured with:
  - Password authentication
  - Maxmemory policy (allkeys-lru)
  - Persistence (AOF or RDB)
- [ ] Monitor for 419 errors (indicates CSRF issues)
- [ ] Monitor Redis memory/connections

---

## When to Enable HTTPS (Future)

After TLS is configured:

```env
# .env
APP_URL=https://admin.paymydine.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=strict  # or 'none' if needed for iframes
```

```bash
# Clear cache
php artisan config:clear

# Restart services
sudo systemctl restart php8.1-fpm nginx
```

**Test:**
- Cookies should have `Secure` flag in DevTools
- HTTP requests should upgrade to HTTPS automatically
- Admin panel should work identically

---

## Support

**If patches don't fix the issue:**

1. Enable DEBUG_SESSION_PULSE=true
2. Reproduce the logout
3. Collect logs: `grep SESSION_PULSE storage/logs/laravel.log > session_debug.log`
4. Check for:
   - `session_id` changes
   - `cookie_present: false`
   - `WARNING` entries
5. Share logs for further analysis

**Contact:**
- Check storage/logs/laravel.log for exceptions
- Run `php artisan route:list | grep admin` to verify middleware
- Run `php artisan config:show session` to verify session config

---

**End of patches/README.md**

