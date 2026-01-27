# Comprehensive Image Loading Investigation

## Executive Summary

This document provides a complete deep-dive investigation into why food item images are not displaying in the frontend, while the logo image works correctly. The investigation covers all layers: Database, API, Route Handler, File System, and Frontend.

---

## 1. Database Layer Investigation

### 1.1 Media Attachments Table Structure

The `media_attachments` table stores image metadata:

**Key Columns:**
- `id` - Primary key
- `disk` - **CRITICAL**: Hash identifier used for file path construction (e.g., `6933980910771278432906`)
- `name` - Original filename (e.g., `HD-wallpaper-burgers-fast-food-delicious-food-sandwiches-harmful-food.jpg`)
- `file_name` - Stored filename
- `attachment_type` - Type of attachment (e.g., `menus`, `menu_combos`)
- `attachment_id` - ID of the related entity (menu_id, combo_id, etc.)
- `tag` - Image tag (usually `thumb` for thumbnails)

### 1.2 How Images Are Stored

**Example Record:**
```sql
SELECT 
    id, 
    disk, 
    name, 
    attachment_type, 
    attachment_id, 
    tag 
FROM media_attachments 
WHERE attachment_type = 'menus' 
AND attachment_id = 31;
```

**Result:**
- `disk`: `6978c2491b364221182244`
- `name`: `images.png` (or original filename)
- `attachment_type`: `menus`
- `attachment_id`: `31`
- `tag`: `thumb`

### 1.3 Database Query in API

**Current Query (app/main/routes.php):**
```php
SELECT 
    m.menu_id as id,
    m.menu_name as name,
    m.menu_description as description,
    CAST(m.menu_price AS DECIMAL(10,2)) as price,
    COALESCE(c.name, 'Main') as category_name,
    ma.name as image,           // ❌ PROBLEM: Using 'name' instead of 'disk'
    ma.disk as image_disk       // ✅ FIX: Now also selecting 'disk'
FROM menus m
LEFT JOIN menu_categories mc ON m.menu_id = mc.menu_id
LEFT JOIN categories c ON mc.category_id = c.category_id
LEFT JOIN media_attachments ma ON ma.attachment_type = 'menus' 
    AND ma.attachment_id = m.menu_id 
    AND ma.tag = 'thumb'
WHERE m.menu_status = 1
```

**Issue Identified:**
- Original code only selected `ma.name` which contains the original filename
- The `disk` column contains the hash used for actual file storage
- Files are stored using the `disk` hash, not the `name`

---

## 2. File System Layer Investigation

### 2.1 TastyIgniter Storage Structure

TastyIgniter stores media files in a **nested directory structure** based on the `disk` hash:

**Pattern:** `{first3chars}/{next3chars}/{next3chars}/{disk}.{ext}`

**Example:**
- Disk: `6978c2491b364221182244`
- Path: `697/8c2/491/6978c2491b364221182244.png`
- Full Path: `/var/www/paymydine/assets/media/attachments/public/697/8c2/491/6978c2491b364221182244.png`

### 2.2 Directory Structure Verification

**Verified Structure:**
```
assets/media/attachments/public/
├── 677/
├── 68f/
│   ├── 701/
│   │   ├── a0e/
│   │   │   └── 68f701a0e4f96798490085.png
│   │   ├── b3e/
│   │   └── ...
│   └── 485/
│       └── 3a0/
│           └── 68f4853a00aff605029023.png
├── 693/
│   ├── 398/
│   │   └── 091/
│   │       └── 6933980910771278432906.png  ✅ EXISTS
│   └── ...
├── 696/
└── 697/
    ├── 766/
    └── 8c2/
        └── 491/
            └── 6978c2491b364221182244.png  ✅ EXISTS
```

### 2.3 File Existence Verification

**Test Results:**
```bash
# File exists at expected location
ls -la assets/media/attachments/public/697/8c2/491/6978c2491b364221182244.png
# ✅ File found

# File exists for another image
ls -la assets/media/attachments/public/693/398/091/6933980910771278432906.png
# ✅ File found
```

**Conclusion:** Files exist on the filesystem at the correct locations.

---

## 3. API Layer Investigation

### 3.1 API Endpoint: `/api/v1/menu`

**Location:** `app/main/routes.php` (lines ~200-260)

**Current Implementation:**
```php
foreach ($items as &$item) {
    if ($item->image_disk && strlen($item->image_disk) >= 9) {
        // Use disk-based path
        $disk = $item->image_disk;
        $p1 = substr($disk, 0, 3);
        $p2 = substr($disk, 3, 3);
        $p3 = substr($disk, 6, 3);
        $basePath = base_path('assets/media/attachments/public/' . $p1 . '/' . $p2 . '/' . $p3 . '/');
        $extensions = ['webp', 'jpg', 'jpeg', 'png'];
        $resolved = null;
        foreach ($extensions as $ext) {
            $candidate = $basePath . $disk . '.' . $ext;
            if (file_exists($candidate)) {
                $resolved = $p1 . '/' . $p2 . '/' . $p3 . '/' . $disk . '.' . $ext;
                break;
            }
        }
        if ($resolved) {
            $item->image = "/api/media/" . $resolved;  // ✅ Full path
        } else {
            $item->image = "/api/media/" . $disk . ".png";  // ⚠️ Fallback
        }
    }
}
```

### 3.2 API Response Analysis

**What API Returns:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 31,
        "name": "Coffee Latte",
        "image": "/api/media/6933980910771278432906.png"  // ⚠️ Just disk name
        // OR
        "image": "/api/media/693/398/091/6933980910771278432906.png"  // ✅ Full path
      }
    ]
  }
}
```

**Issue:**
- When file is not found in expected location, API returns just disk name: `/api/media/6933980910771278432906.png`
- Route handler must then search for the file
- This works, but is less efficient

---

## 4. Route Handler Investigation

### 4.1 Route Definition: `/api/media/{path}`

**Location:** `app/main/routes.php` (lines ~86-200)

**Route Pattern:**
```php
Route::get('/media/{path}', function ($path) {
    // Handles: /api/media/6933980910771278432906.png
    // OR: /api/media/693/398/091/6933980910771278432906.png
})->where('path', '.*');
```

### 4.2 Route Handler Logic Flow

**Step 1: Extract Path**
```php
$path = explode('?', $path)[0];  // Remove query params
// Input: "6933980910771278432906.png"
// Result: "6933980910771278432906.png"
```

**Step 2: Try Direct Path**
```php
$mediaPath = base_path('assets/media/attachments/public/' . $path);
// Tries: assets/media/attachments/public/6933980910771278432906.png
// ❌ Fails (file not at root level)
```

**Step 3: Extract Disk Name**
```php
$filename = basename($path);  // "6933980910771278432906.png"
$pathWithoutExt = pathinfo($filename, PATHINFO_FILENAME);  // "6933980910771278432906"
```

**Step 4: Build Disk-Based Path**
```php
if (strlen($pathWithoutExt) >= 9 && ctype_alnum($pathWithoutExt)) {
    $disk = $pathWithoutExt;  // "6933980910771278432906"
    $p1 = substr($disk, 0, 3);   // "693"
    $p2 = substr($disk, 3, 3);   // "398"
    $p3 = substr($disk, 6, 3);   // "091"
    
    // Try each extension
    foreach (['webp', 'jpg', 'jpeg', 'png'] as $ext) {
        $candidate = base_path('assets/media/attachments/public/' . 
                               $p1 . '/' . $p2 . '/' . $p3 . '/' . 
                               $disk . '.' . $ext);
        // Tries: assets/media/attachments/public/693/398/091/6933980910771278432906.png
        // ✅ Should find file here
    }
}
```

**Step 5: Recursive Search (Fallback)**
```php
if (!file_exists($mediaPath)) {
    // Search entire directory tree for file matching disk name
    $iterator = new RecursiveIteratorIterator(...);
    foreach ($iterator as $file) {
        if (pathinfo($file->getFilename(), PATHINFO_FILENAME) === $disk) {
            $mediaPath = $file->getPathname();
            break;
        }
    }
}
```

### 4.3 Route Handler Issues

**Potential Problems:**
1. **Route Cache** - Laravel route cache might not include this route
2. **Route Order** - Another route might be catching `/api/media/*` first
3. **Nginx Interception** - Nginx might be serving files directly before Laravel
4. **File Permissions** - Web server might not have read access

---

## 5. Frontend Layer Investigation

### 5.1 How Frontend Receives Images

**API Call:**
```typescript
// Frontend calls: GET /api/v1/menu
const response = await fetch('/api/v1/menu');
const data = await response.json();
// data.data.items[0].image = "/api/media/6933980910771278432906.png"
```

### 5.2 How Frontend Displays Images

**Component: `menu-item-card.tsx`**
```typescript
<OptimizedImage
  src={item.image || "/placeholder.svg"}  // Uses API response
  alt={itemName}
  fill
  className="object-contain"
/>
```

**Image URL Construction:**
- Frontend receives: `/api/media/6933980910771278432906.png`
- Browser requests: `http://mimoza.paymydine.com/api/media/6933980910771278432906.png`
- Should be handled by Laravel route handler

### 5.3 Next.js Image Proxy

**Configuration: `frontend/next.config.mjs`**
```javascript
async rewrites() {
  return [
    {
      source: '/api/media/:path*',
      destination: 'http://127.0.0.1:8000/api/media/:path*',  // Proxies to Laravel
    },
  ];
}
```

**Issue:** In production, Next.js might not be proxying correctly, or Laravel route isn't matching.

---

## 6. Logo vs Food Images: Why Logo Works

### 6.1 Logo Storage

**Logo Location:**
- Stored in: `/assets/media/uploads/images.png`
- Served from: `/assets/media/uploads/` (direct file access)
- **NOT** using TastyIgniter's disk-based structure

**Logo API Response:**
```typescript
// From /api/v1/settings
{
  "site_logo": "images.png"  // Just filename
}
```

**Logo URL Construction:**
```typescript
// frontend/components/logo.tsx
const toUploadsUrl = (rel) => {
  const BASE = EnvironmentConfig.getInstance().backendBaseUrl();
  return `${BASE}/assets/media/uploads${normalized}`;
};
// Result: http://mimoza.paymydine.com/assets/media/uploads/images.png
```

**Why Logo Works:**
- ✅ Direct file path (no route handler needed)
- ✅ Nginx serves static files from `/assets/media/uploads/`
- ✅ No complex path construction required

### 6.2 Food Images Storage

**Food Image Location:**
- Stored in: `/assets/media/attachments/public/697/8c2/491/6978c2491b364221182244.png`
- Served from: `/api/media/` (requires Laravel route handler)
- **USES** TastyIgniter's disk-based structure

**Why Food Images Don't Work:**
- ❌ Requires route handler to construct path from disk hash
- ❌ Route handler might not be executing
- ❌ Route cache might be stale
- ❌ Nginx might be intercepting before Laravel

---

## 7. Root Cause Analysis

### 7.1 Primary Issue

**The route handler is not finding files, even though:**
1. ✅ Files exist on filesystem
2. ✅ Path construction logic is correct
3. ✅ API is returning correct URLs

### 7.2 Most Likely Causes

**1. Route Cache Not Cleared**
```bash
# Route cache contains old route definitions
php artisan route:clear  # Must run after code changes
```

**2. Route Not Registered**
```bash
# Check if route is registered
php artisan route:list | grep "api/media"
# Should show: GET|HEAD api/media/{path}
```

**3. Nginx Interception**
```nginx
# Nginx might have rules like:
location /api/media/ {
    # Serving files directly, bypassing Laravel
}
```

**4. Route Order Conflict**
- Another route might be catching `/api/media/*` first
- Check route registration order

**5. File Permissions**
```bash
# Web server needs read access
ls -la assets/media/attachments/public/693/398/091/
# Should show: -rw-r--r-- (readable by www-data)
```

---

## 8. Verification Steps

### 8.1 Database Verification
```sql
-- Check what's in database
SELECT 
    m.menu_id,
    m.menu_name,
    ma.disk,
    ma.name
FROM menus m
LEFT JOIN media_attachments ma ON ma.attachment_type = 'menus' 
    AND ma.attachment_id = m.menu_id 
    AND ma.tag = 'thumb'
WHERE m.menu_id = 31;
```

### 8.2 File System Verification
```bash
# Check if file exists
ls -la assets/media/attachments/public/697/8c2/491/6978c2491b364221182244.png

# Check permissions
stat assets/media/attachments/public/697/8c2/491/6978c2491b364221182244.png
```

### 8.3 API Verification
```bash
# Test API response
curl http://mimoza.paymydine.com/api/v1/menu | jq '.data.items[0].image'
# Should return: "/api/media/693/398/091/6933980910771278432906.png"
```

### 8.4 Route Handler Verification
```bash
# Test route directly
curl -I http://mimoza.paymydine.com/api/media/6933980910771278432906.png
# Should return: HTTP/1.1 200 OK

# Check Laravel logs
tail -f storage/logs/laravel.log
# Should show: "Media route called" log entry
```

### 8.5 Route Registration Verification
```bash
# List all routes
php artisan route:list | grep -i media

# Clear route cache
php artisan route:clear
```

---

## 9. Solution Implementation

### 9.1 Code Changes Made

**1. Updated API Query**
- ✅ Now selects both `ma.name` and `ma.disk`
- ✅ Uses `disk` to construct proper file paths

**2. Improved Route Handler**
- ✅ Better path construction logic
- ✅ Enhanced recursive search
- ✅ Added logging for debugging

**3. Fallback Logic**
- ✅ When file not found in expected location, returns disk name
- ✅ Route handler searches for file

### 9.2 Deployment Requirements

**CRITICAL: Must run after deploying code:**
```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear  # ⚠️ MOST IMPORTANT
php artisan view:clear
```

### 9.3 Verification After Deployment

```bash
# 1. Verify route is registered
php artisan route:list | grep "api/media"

# 2. Test route handler
curl -v http://mimoza.paymydine.com/api/media/6933980910771278432906.png

# 3. Check logs
tail -f storage/logs/laravel.log

# 4. Test in browser
# Open: http://mimoza.paymydine.com
# Check browser console for image loading errors
```

---

## 10. Troubleshooting Guide

### 10.1 Route Returns 404

**Check:**
1. Route cache cleared? → `php artisan route:clear`
2. Route registered? → `php artisan route:list | grep media`
3. File exists? → `ls -la assets/media/attachments/public/...`
4. Logs show route called? → `tail -f storage/logs/laravel.log`

### 10.2 Route Returns 200 but Image Doesn't Display

**Check:**
1. CORS headers?
2. Content-Type correct?
3. Browser cache?
4. Next.js proxy working?

### 10.3 Files Not Found in Expected Location

**Check:**
1. Disk hash correct in database?
2. File actually uploaded?
3. File permissions?
4. Directory structure matches disk hash?

---

## 11. Summary

### 11.1 What We Know

✅ **Files exist** on filesystem at correct locations  
✅ **Database has correct** disk hashes  
✅ **Path construction logic** is correct  
✅ **Route handler logic** is correct  
❌ **Route handler not executing** or not finding files  

### 11.2 What Needs to Happen

1. **Deploy updated code** to server
2. **Clear route cache** (critical!)
3. **Verify route registration**
4. **Test route handler** directly
5. **Check Laravel logs** for errors
6. **Verify file permissions**

### 11.3 Expected Outcome

After proper deployment and cache clearing:
- ✅ Route handler finds files
- ✅ Images load in frontend
- ✅ No more 404 errors

---

## 12. Next Steps

1. **Deploy code** to production server
2. **Run cache clearing commands**
3. **Verify route registration**
4. **Test route handler**
5. **Monitor Laravel logs**
6. **Test in browser**

If issues persist after these steps, check:
- Nginx configuration
- File permissions
- Route order conflicts
- PHP-FPM configuration

---

**Document Version:** 1.0  
**Last Updated:** January 27, 2026  
**Status:** Comprehensive Investigation Complete
