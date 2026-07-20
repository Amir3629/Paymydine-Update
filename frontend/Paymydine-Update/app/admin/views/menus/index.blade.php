@php
use Admin\Models\Categories_model;
use Admin\Models\Menus_model;

$user = \Admin\Facades\AdminAuth::getUser();
$canManageLayout = $user && ($user->hasPermission('Admin.Menus') || $user->hasPermission('Admin.Categories'));

$cards = Menus_model::with(['categories', 'allergens', 'media', 'menu_images'])
    ->orderByRaw('COALESCE(menu_priority, 999999) ASC')
    ->orderBy('menu_name', 'asc')
    ->get();

$categories = Categories_model::query()
    ->orderByRaw('COALESCE(priority, 999999) ASC')
    ->orderBy('name', 'asc')
    ->get(['category_id','name']);

$totalItems = $cards->count();
$activeItems = $cards->where('menu_status', true)->count();
$stockOutItems = $cards->filter(fn($m) => !empty($m->is_stock_out))->count();
$categoryCount = $categories->count();

$pmdMenuNormalizeSlug = static function ($text) {
    $text = strtolower((string)$text);
    $text = preg_replace('/[^a-z0-9]+/i', '-', $text);
    $text = trim($text, '-');

    $drop = [
        'butter', 'fluffy', 'persian', 'special', 'deluxe', 'fresh',
        'classic', 'homemade', 'vegan', 'vegetarian'
    ];

    $parts = array_values(array_filter(explode('-', $text), function ($part) use ($drop) {
        return strlen($part) > 1 && !in_array($part, $drop, true);
    }));

    return implode('-', $parts);
};

$pmdMenuFileToUrl = static function ($file) {
    $file = str_replace('\\', '/', (string)$file);
    $base = str_replace('\\', '/', base_path());

    if (str_starts_with($file, $base.'/')) {
        $path = substr($file, strlen($base) + 1);
    } else {
        $path = ltrim($file, '/');
    }

    return url('/'.$path);
};

$pmdMenuPmdNewFiles = [];

try {
    $root = base_path('assets/media/attachments/public');

    if (is_dir($root)) {
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)
        );

        foreach ($it as $file) {
            if (!$file->isFile()) {
                continue;
            }

            $name = $file->getFilename();

            if (!preg_match('/^pmdnew_.*?\.(png|jpe?g|webp)$/i', $name)) {
                continue;
            }

            $stem = preg_replace('/\.(png|jpe?g|webp)$/i', '', $name);
            $stem = preg_replace('/^pmdnew_\d{8}_\d{6}_\d+_/i', '', $stem);
            $slug = $pmdMenuNormalizeSlug($stem);

            if ($slug !== '') {
                $pmdMenuPmdNewFiles[] = [
                    'slug' => $slug,
                    'file' => $file->getPathname(),
                    'url' => $pmdMenuFileToUrl($file->getPathname()),
                    'bytes' => $file->getSize(),
                ];
            }
        }
    }
} catch (\Throwable $e) {
    $pmdMenuPmdNewFiles = [];
}

$pmdSafeThumb = static function ($menu) use ($pmdMenuNormalizeSlug, $pmdMenuPmdNewFiles) {
    $fallback = url('/app/admin/assets/images/default-image.png');

    $normalizeUrl = static function ($src) {
        $src = is_string($src) ? trim($src) : '';

        if ($src === '') {
            return '';
        }

        if (preg_match('#^https?://#i', $src)) {
            return preg_replace('#^https?://[^/]+#', url('/'), $src);
        }

        if (str_starts_with($src, '/')) {
            return url($src);
        }

        if (str_starts_with($src, 'api/media/')) {
            return url('/'.$src);
        }

        if (str_starts_with($src, 'assets/media/')) {
            return url('/'.$src);
        }

        if (str_starts_with($src, 'attachments/')) {
            return url('/assets/media/'.$src);
        }

        if (str_starts_with($src, 'uploads/')) {
            return url('/assets/media/'.$src);
        }

        if (preg_match('#\.(png|jpe?g|webp|gif)$#i', $src)) {
            return url('/api/media/'.$src);
        }

        return url('/'.$src);
    };

    $pmdFixApiMediaIfUploadedFileExists = static function ($url) {
        $url = is_string($url) ? trim($url) : '';

        if ($url === '') {
            return $url;
        }

        $path = parse_url($url, PHP_URL_PATH) ?: '';
        $basename = basename($path);

        if ($basename === '' || $basename === '.' || $basename === '/') {
            return $url;
        }

        // Some legacy/uploaded images exist in assets/media/uploads,
        // but /api/media/<filename> returns 404 in admin preview.
        $uploadsPath = base_path('assets/media/uploads/'.$basename);

        if (is_file($uploadsPath)) {
            return url('/assets/media/uploads/'.$basename);
        }

        return $url;
    };

    $isBadGeneratedThumb = static function ($url) {
        return str_contains($url, '/pmd/new/_20/thumb_')
            || str_contains($url, '_contain_')
            || str_contains($url, 'default-image.png');
    };

    $menuName = $menu ? (string)$menu->menu_name : '';
    $menuSlug = $pmdMenuNormalizeSlug($menuName);

    $bestPmdNew = null;
    $bestScore = 0;

    if ($menuSlug !== '') {
        $menuTokens = array_values(array_filter(explode('-', $menuSlug)));

        foreach ($pmdMenuPmdNewFiles as $candidate) {
            $fileSlug = $candidate['slug'];
            $fileTokens = array_values(array_filter(explode('-', $fileSlug)));

            $score = 0;

            if ($fileSlug === $menuSlug) {
                $score += 100;
            }

            if (str_contains($menuSlug, $fileSlug) || str_contains($fileSlug, $menuSlug)) {
                $score += 60;
            }

            $overlap = count(array_intersect($menuTokens, $fileTokens));
            $score += $overlap * 20;

            if ($overlap > 0 && count($fileTokens) === 1) {
                $score += 10;
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestPmdNew = $candidate;
            }
        }
    }

    $officialCandidates = [];

    if ($menu) {
        try {
            foreach (($menu->menu_images ?? []) as $img) {
                foreach (['image_path', 'path', 'url', 'file_name', 'disk_name'] as $prop) {
                    if (isset($img->{$prop}) && is_string($img->{$prop})) {
                        $officialCandidates[] = $img->{$prop};
                    }
                }
            }
        } catch (\Throwable $e) {}

        try {
            foreach (($menu->media ?? []) as $media) {
                foreach (['getPath', 'getUrl'] as $method) {
                    if (method_exists($media, $method)) {
                        try {
                            $officialCandidates[] = $media->{$method}();
                        } catch (\Throwable $e) {}
                    }
                }

                foreach (['path', 'url', 'file_name', 'disk_name', 'name'] as $prop) {
                    if (isset($media->{$prop}) && is_string($media->{$prop})) {
                        $officialCandidates[] = $media->{$prop};
                    }
                }
            }
        } catch (\Throwable $e) {}

        try {
            if (method_exists($menu, 'getThumb')) {
                $officialCandidates[] = $menu->getThumb();
            }
        } catch (\Throwable $e) {}
    }

    $firstGoodOfficial = '';

    foreach ($officialCandidates as $candidate) {
        $url = $pmdFixApiMediaIfUploadedFileExists($normalizeUrl($candidate));

        if ($url !== '' && !str_contains($url, 'default-image.png')) {
            if (!$isBadGeneratedThumb($url)) {
                $firstGoodOfficial = $url;
                break;
            }

            if ($firstGoodOfficial === '') {
                $firstGoodOfficial = $url;
            }
        }
    }

    // If the current DB source is the broken generated thumb, prefer the real pmdnew file.
    if ($bestPmdNew && $bestScore >= 20) {
        if ($firstGoodOfficial === '' || $isBadGeneratedThumb($firstGoodOfficial)) {
            return [
                'src' => $bestPmdNew['url'],
                'hasImage' => true,
                'source' => 'pmdnew-name-match',
                'score' => $bestScore,
            ];
        }
    }

    if ($firstGoodOfficial !== '') {
        return [
            'src' => $firstGoodOfficial,
            'hasImage' => true,
            'source' => 'official-media',
            'score' => 0,
        ];
    }

    if ($bestPmdNew && $bestScore >= 20) {
        return [
            'src' => $bestPmdNew['url'],
            'hasImage' => true,
            'source' => 'pmdnew-name-match-fallback',
            'score' => $bestScore,
        ];
    }

    return [
        'src' => $fallback,
        'hasImage' => false,
        'source' => 'fallback',
        'score' => 0,
    ];
};
@endphp

<div class="pmd-menu-v160">
    <div class="pmd-menu-v160-hero">
        <div class="pmd-menu-v160-title-wrap">
            <div class="pmd-menu-v160-icon">🍽️</div>
            <div>
                <h1>Menu Items</h1>
                <p>Manage restaurant menu items, pricing, categories, stock status, and frontend visibility.</p>
            </div>
        </div>

        <div class="pmd-menu-v160-actions">
            <a class="pmd-menu-v160-btn primary" href="{{ admin_url('menus/create') }}">
                <i class="fa fa-plus"></i>
                Add Item
            </a>
            <a class="pmd-menu-v160-btn ghost" href="{{ admin_url('combos') }}">
                <i class="fa fa-layer-group"></i>
                Combos
            </a>
        </div>
    </div>

    <div class="pmd-menu-v160-stats">
        <div class="pmd-menu-v160-stat">
            <span>Total Items</span>
            <strong>{{ $totalItems }}</strong>
        </div>
        <div class="pmd-menu-v160-stat">
            <span>Active</span>
            <strong>{{ $activeItems }}</strong>
        </div>
        <div class="pmd-menu-v160-stat">
            <span>Stock Out</span>
            <strong>{{ $stockOutItems }}</strong>
        </div>
        <div class="pmd-menu-v160-stat">
            <span>Categories</span>
            <strong>{{ $categoryCount }}</strong>
        </div>
    </div>

    <section class="pmd-menu-v160-panel">
        <div class="pmd-menu-v160-toolbar">
            <div class="pmd-menu-v160-search">
                <i class="fa fa-search"></i>
                <input id="pmd-menu-search" type="search" placeholder="Search menu items..." autocomplete="off">
            </div>

            <div class="pmd-menu-v160-tools">
                <span id="pmd-selection-count" class="pmd-menu-v160-pill muted" style="display:none;">0 selected</span>
                <span id="pmd-menu-order-state" class="pmd-menu-v160-pill">Layout is saved</span>

                <button id="pmd-select-toggle" type="button" class="pmd-menu-v160-btn small ghost">
                    Select
                </button>

                @if($canManageLayout)
                    <button id="pmd-layout-toggle" type="button" class="pmd-menu-v160-btn small ghost">
                        Edit Layout
                    </button>
                @endif

                <button id="pmd-menu-save-order" type="button" class="pmd-menu-v160-btn small primary" hidden>
                    Save order
                </button>
            </div>
        </div>

        <div id="pmd-category-buttons" class="pmd-menu-v160-categories">
            <button type="button" class="pmd-menu-v160-cat active" data-category="all">
                <i class="fa fa-th-large"></i>
                All Items
            </button>

            @foreach($categories as $category)
                <button type="button" class="pmd-menu-v160-cat" data-category="{{ $category->category_id }}">
                    <i class="fa fa-utensils"></i>
                    {{ $category->name }}
                </button>
            @endforeach

            <a href="{{ admin_url('categories/create') }}" class="pmd-menu-v160-cat add">
                <i class="fa fa-plus"></i>
                Category
            </a>
        </div>

        <div id="pmd-menu-filter-warning" class="pmd-menu-v160-warning" style="display:none;">
            Clear category filter to reorder all items.
        </div>

        <div id="pmd-menu-grid" class="pmd-menu-v160-grid">
            @foreach($cards as $m)
                @php
                    $imgInfo = $pmdSafeThumb($m);
                    $img = $imgInfo['src'];

                    if (is_string($img) && trim($img) !== '') {
                        $pmdImgPath = parse_url($img, PHP_URL_PATH) ?: '';
                        $pmdImgBase = basename($pmdImgPath);

                        if ($pmdImgBase && is_file(base_path('assets/media/uploads/'.$pmdImgBase))) {
                            $img = url('/assets/media/uploads/'.$pmdImgBase);
                        }
                    }

                    $hasImage = (bool)($imgInfo['hasImage'] ?? false);
                    $imgSource = (string)($imgInfo['source'] ?? '');
                    $imgScore = (int)($imgInfo['score'] ?? 0);
                    $cat = optional($m->categories->sortBy('priority')->first());
                    $disabled = !$m->menu_status;
                    $stockOut = !empty($m->is_stock_out);
                    $hasAllergens = $m->allergens && $m->allergens->count();
                @endphp

                <article
                    class="pmd-menu-v160-card {{ $disabled ? 'is-disabled' : '' }} {{ $stockOut ? 'is-stock-out' : '' }}"
                    data-menu-id="{{ $m->menu_id }}"
                    data-category-id="{{ $cat->category_id ?? '' }}"
                    data-menu-name="{{ mb_strtolower((string)$m->menu_name) }}"
                    data-stock-out="{{ $stockOut ? 1 : 0 }}"
                    data-enabled="{{ $disabled ? 0 : 1 }}"
                >
                    <label class="pmd-menu-v160-select">
                        <input type="checkbox" class="pmd-select-checkbox" value="{{ $m->menu_id }}">
                        <span></span>
                    </label>

                    <div class="dropdown pmd-card-menu">
                        <button class="pmd-menu-v160-dots" type="button" data-toggle="dropdown" aria-label="Menu actions">
                            <i class="fa fa-ellipsis-h"></i>
                        </button>
                        <div class="dropdown-menu dropdown-menu-right">
                            <a class="dropdown-item" href="{{ admin_url('menus/edit/'.$m->menu_id) }}">Edit</a>
                            <button class="dropdown-item pmd-stock-toggle" type="button" data-menu-id="{{ $m->menu_id }}">
                                {{ $stockOut ? 'Stock in' : 'Stock out' }}
                            </button>
                            <button class="dropdown-item pmd-status-toggle" type="button" data-menu-id="{{ $m->menu_id }}">
                                {{ $disabled ? 'Enable' : 'Disable' }}
                            </button>
                        </div>
                    </div>

                    <div class="pmd-menu-v160-handle">
                        <i class="fa fa-grip-vertical"></i>
                    </div>

                    <a
                        class="pmd-menu-v160-image {{ $hasImage ? 'has-image' : 'no-image' }}"
                        data-img-src="{{ e($img) }}"
                        data-img-source="{{ e($imgSource) }}"
                        data-img-score="{{ $imgScore }}"
                        @if($hasImage) style="--pmd-menu-real-img: url('{{ e($img) }}');" @endif
                        href="{{ admin_url('menus/edit/'.$m->menu_id) }}"
                    >
                        <div class="pmd-menu-v160-placeholder">
                            <span>🍽️</span>
                            <strong>{{ $hasImage ? 'Image unavailable' : 'No image' }}</strong>
                        </div>
                    </a>

                    <div class="pmd-menu-v160-card-body">
                        <div class="pmd-menu-v160-card-top">
                            <span class="pmd-menu-v160-category">{{ $cat->name ?: 'Uncategorized' }}</span>
                            <span class="pmd-menu-v160-status {{ $disabled ? 'off' : 'on' }}">
                                {{ $disabled ? 'Disabled' : 'Active' }}
                            </span>
                        </div>

                        <h3>{{ $m->menu_name }}</h3>

                        <div class="pmd-menu-v160-price-row">
                            <strong>{{ currency_format($m->menu_price) }}</strong>
                            @if($stockOut)
                                <span class="pmd-menu-v160-stock danger">Stock out</span>
                            @else
                                <span class="pmd-menu-v160-stock">In stock</span>
                            @endif
                        </div>

                        <div class="pmd-menu-v160-tags">
                            @if(!empty($m->is_halal))<span>🕌 Halal</span>@endif
                            @if(!empty($m->is_vegetarian))<span>🥗 Vegetarian</span>@endif
                            @if(!empty($m->is_vegan))<span>🌱 Vegan</span>@endif
                            @if($hasAllergens)<span>⚠️ Allergens</span>@endif
                            @if(isset($m->spice_level) && $m->spice_level !== null)<span>🌶️ Spice</span>@endif
                        </div>

                        <div class="pmd-menu-v160-card-actions">
                            <a href="{{ admin_url('menus/edit/'.$m->menu_id) }}" class="pmd-menu-v160-btn small primary">
                                Edit Item
                            </a>
                            <button type="button" class="pmd-menu-v160-btn small ghost pmd-stock-toggle" data-menu-id="{{ $m->menu_id }}">
                                {{ $stockOut ? 'Stock In' : 'Stock Out' }}
                            </button>
                        </div>
                    </div>
                </article>
            @endforeach
        </div>

        <details class="pmd-menu-v160-advanced">
            <summary>Show advanced table view</summary>
            <div class="pmd-menu-v160-advanced-inner">
                {!! $this->renderList() !!}
            </div>
        </details>
    </section>
</div>

<style id="pmd-menu-v160-style">
.pmd-menu-v160,
.pmd-menu-v160 * {
  box-sizing: border-box;
}

.pmd-menu-v160 {
  --pmd-ink: #082f2b;
  --pmd-muted: #64748b;
  --pmd-border: #cfe8f6;
  --pmd-soft: #f8fcfb;
  --pmd-mint: #effdf7;
  --pmd-green: #006b55;
  --pmd-green-dark: #06483d;
  max-width: 1500px;
  margin: 34px auto 90px;
  padding: 0 22px;
  color: var(--pmd-ink);
}

.pmd-menu-v160-hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  margin-bottom: 22px;
}

.pmd-menu-v160-title-wrap {
  display: flex;
  align-items: center;
  gap: 18px;
}

.pmd-menu-v160-icon {
  width: 58px;
  height: 58px;
  border-radius: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e7fff6 0%, #f4fffb 100%);
  border: 1px solid #bff2df;
  box-shadow: 0 14px 34px rgba(0, 107, 85, .12);
  font-size: 28px;
}

.pmd-menu-v160 h1 {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
  font-weight: 950;
  letter-spacing: -.04em;
}

.pmd-menu-v160 p {
  margin: 7px 0 0;
  color: var(--pmd-muted);
  font-weight: 700;
}

.pmd-menu-v160-actions,
.pmd-menu-v160-tools,
.pmd-menu-v160-card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.pmd-menu-v160-btn {
  border: 1px solid var(--pmd-border);
  background: #fff;
  color: var(--pmd-ink);
  min-height: 48px;
  border-radius: 16px;
  padding: 0 18px;
  font-weight: 950;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  text-decoration: none !important;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(15, 23, 42, .04);
}

.pmd-menu-v160-btn.primary {
  background: var(--pmd-green);
  border-color: var(--pmd-green);
  color: #fff;
  box-shadow: 0 14px 32px rgba(0, 107, 85, .18);
}

.pmd-menu-v160-btn.ghost {
  background: #fff;
}

.pmd-menu-v160-btn.small {
  min-height: 42px;
  border-radius: 14px;
  padding: 0 15px;
  font-size: 13px;
}

.pmd-menu-v160-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.pmd-menu-v160-stat {
  background: #fff;
  border: 1px solid var(--pmd-border);
  border-radius: 22px;
  padding: 22px 24px;
  box-shadow: 0 18px 40px rgba(20, 45, 55, .06);
}

.pmd-menu-v160-stat span {
  display: block;
  color: #546987;
  font-size: 12px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: .18em;
  text-transform: uppercase;
  margin-bottom: 13px;
}

.pmd-menu-v160-stat strong {
  display: block;
  font-size: 34px;
  line-height: 1;
  font-weight: 950;
  color: var(--pmd-green-dark);
}

.pmd-menu-v160-panel {
  background: rgba(255,255,255,.74);
  border: 1px solid var(--pmd-border);
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0 22px 55px rgba(20, 45, 55, .07);
}

.pmd-menu-v160-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.pmd-menu-v160-search {
  flex: 1;
  min-width: 260px;
  min-height: 50px;
  border: 1px solid var(--pmd-border);
  border-radius: 18px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
}

.pmd-menu-v160-search i {
  color: var(--pmd-muted);
}

.pmd-menu-v160-search input {
  width: 100%;
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
  min-height: 46px;
  font-weight: 800;
  color: var(--pmd-ink);
}

.pmd-menu-v160-pill {
  min-height: 38px;
  padding: 0 13px;
  border: 1px solid var(--pmd-border);
  border-radius: 999px;
  background: var(--pmd-soft);
  display: inline-flex;
  align-items: center;
  font-weight: 900;
  color: var(--pmd-green-dark);
  font-size: 12px;
}

.pmd-menu-v160-pill.muted {
  color: var(--pmd-muted);
}

.pmd-menu-v160-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-bottom: 16px;
}

.pmd-menu-v160-cat {
  min-height: 42px;
  border: 1px solid var(--pmd-border);
  background: #fff;
  color: var(--pmd-ink);
  border-radius: 999px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 950;
  text-decoration: none !important;
}

.pmd-menu-v160-cat.active {
  background: var(--pmd-green);
  border-color: var(--pmd-green);
  color: #fff;
}

.pmd-menu-v160-cat.add {
  background: var(--pmd-mint);
}

.pmd-menu-v160-warning {
  border: 1px solid #f6d58b;
  background: #fff8e7;
  color: #8a5c00;
  border-radius: 16px;
  padding: 12px 14px;
  font-weight: 900;
  margin-bottom: 16px;
}

.pmd-menu-v160-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}

.pmd-menu-v160-card {
  position: relative;
  overflow: hidden;
  min-height: 430px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfffd 100%);
  border: 1px solid var(--pmd-border);
  border-radius: 24px;
  box-shadow: 0 18px 45px rgba(20, 45, 55, .07);
  transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
}

.pmd-menu-v160-card:hover {
  transform: translateY(-2px);
  border-color: #9edfc9;
  box-shadow: 0 24px 54px rgba(0, 107, 85, .10);
}

.pmd-menu-v160-card.is-disabled {
  opacity: .62;
}

.pmd-menu-v160-card.is-selected {
  border-color: var(--pmd-green);
  box-shadow: 0 0 0 3px rgba(0, 107, 85, .16), 0 24px 54px rgba(0, 107, 85, .10);
}

.pmd-menu-v160-card.is-draggable {
  cursor: move;
}

.pmd-menu-v160-card.is-dragging {
  opacity: .68;
  transform: scale(.985);
}

.pmd-menu-v160-card.is-hidden {
  display: none;
}

.pmd-menu-v160-select {
  display: none;
  position: absolute;
  left: 16px;
  top: 16px;
  z-index: 5;
}

.pmd-menu-v160-card.select-mode .pmd-menu-v160-select {
  display: block;
}

.pmd-menu-v160-select input {
  display: none;
}

.pmd-menu-v160-select span {
  width: 22px;
  height: 22px;
  border: 2px solid #a7b7c9;
  border-radius: 50%;
  background: #fff;
  display: block;
  box-shadow: 0 8px 18px rgba(15, 23, 42, .10);
}

.pmd-menu-v160-select input:checked + span {
  background: var(--pmd-green);
  border-color: var(--pmd-green);
}

.pmd-card-menu {
  position: absolute;
  right: 14px;
  top: 14px;
  z-index: 6;
}

.pmd-menu-v160-dots {
  width: 38px;
  height: 38px;
  border: 1px solid var(--pmd-border);
  background: rgba(255,255,255,.92);
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--pmd-ink);
}

.pmd-menu-v160-handle {
  display: none;
  position: absolute;
  left: 16px;
  top: 17px;
  z-index: 4;
  color: var(--pmd-muted);
}

.pmd-menu-v160-card.is-draggable .pmd-menu-v160-handle {
  display: block;
}

.pmd-menu-v160-image {
  height: 185px;
  padding: 22px 22px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 50% 15%, rgba(0,107,85,.10), transparent 42%),
    linear-gradient(135deg, #f7fbfa 0%, #ffffff 100%);
  text-decoration: none !important;
}

.pmd-menu-v160-image img {
  width: 100%;
  height: 150px;
  object-fit: contain;
  display: block;
  filter: drop-shadow(0 18px 24px rgba(15, 23, 42, .10));
}

.pmd-menu-v160-card-body {
  padding: 18px 20px 20px;
}

.pmd-menu-v160-card-top,
.pmd-menu-v160-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pmd-menu-v160-category,
.pmd-menu-v160-status,
.pmd-menu-v160-stock {
  min-height: 28px;
  border-radius: 999px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 950;
  background: #f1f8ff;
  border: 1px solid #dcefff;
  color: #38536d;
}

.pmd-menu-v160-status.on,
.pmd-menu-v160-stock {
  background: #dcfff1;
  border-color: #bcf4d7;
  color: #006b55;
}

.pmd-menu-v160-status.off,
.pmd-menu-v160-stock.danger {
  background: #fff0f0;
  border-color: #ffd2d2;
  color: #a42a2a;
}

.pmd-menu-v160-card h3 {
  min-height: 54px;
  margin: 14px 0 12px;
  font-size: 20px;
  line-height: 1.18;
  font-weight: 950;
  letter-spacing: -.03em;
  color: var(--pmd-ink);
}

.pmd-menu-v160-price-row strong {
  font-size: 22px;
  font-weight: 950;
  color: var(--pmd-green-dark);
}

.pmd-menu-v160-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  min-height: 38px;
  margin: 15px 0 18px;
}

.pmd-menu-v160-tags span {
  border: 1px solid var(--pmd-border);
  background: #fff;
  border-radius: 999px;
  padding: 6px 9px;
  font-size: 11px;
  font-weight: 900;
  color: #42556e;
}

.pmd-menu-v160-advanced {
  margin-top: 22px;
  border: 1px solid var(--pmd-border);
  border-radius: 18px;
  background: #fff;
  overflow: hidden;
}

.pmd-menu-v160-advanced summary {
  cursor: pointer;
  padding: 15px 18px;
  font-weight: 950;
  color: var(--pmd-ink);
}

.pmd-menu-v160-advanced-inner {
  padding: 16px;
  border-top: 1px solid var(--pmd-border);
  overflow: auto;
}

@media (max-width: 1100px) {
  .pmd-menu-v160-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pmd-menu-v160-toolbar,
  .pmd-menu-v160-hero {
    align-items: stretch;
    flex-direction: column;
  }
}

@media (max-width: 720px) {
  .pmd-menu-v160 {
    margin-top: 18px;
    padding: 0 12px;
  }

  .pmd-menu-v160-stats,
  .pmd-menu-v160-grid {
    grid-template-columns: 1fr;
  }

  .pmd-menu-v160 h1 {
    font-size: 27px;
  }
}

/* PMD Menu v161b UI/image refinements */
.pmd-menu-v160-btn[hidden],
#pmd-menu-save-order[hidden] {
  display: none !important;
}

.pmd-menu-v160 {
  margin-top: 26px !important;
}

.pmd-menu-v160-panel {
  padding: 22px !important;
}

.pmd-menu-v160-toolbar {
  align-items: stretch !important;
}

.pmd-menu-v160-search {
  box-shadow: 0 10px 24px rgba(15, 23, 42, .035), inset 0 1px 0 rgba(255,255,255,.9) !important;
}

.pmd-menu-v160-search input,
.pmd-menu-v160-search input:focus {
  appearance: none !important;
  background: transparent !important;
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
}

.pmd-menu-v160-card {
  min-height: 392px !important;
}

.pmd-menu-v160-image {
  height: 158px !important;
  margin: 16px 16px 0 !important;
  padding: 0 !important;
  border: 1px solid #d8edf7 !important;
  border-radius: 20px !important;
  overflow: hidden !important;
  background:
    radial-gradient(circle at 50% 18%, rgba(0,107,85,.14), transparent 42%),
    linear-gradient(135deg, #f7fbfa 0%, #ffffff 100%) !important;
}

.pmd-menu-v160-image.has-image img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block !important;
  filter: none !important;
}

.pmd-menu-v160-image.no-image,
.pmd-menu-v160-image.is-broken {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.pmd-menu-v160-placeholder {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  color: #52706b !important;
  font-weight: 950 !important;
  background:
    radial-gradient(circle at 50% 20%, rgba(0,107,85,.12), transparent 42%),
    linear-gradient(135deg, #f9fffd 0%, #eefbf5 100%) !important;
}

.pmd-menu-v160-placeholder span {
  width: 58px !important;
  height: 58px !important;
  border-radius: 22px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #fff !important;
  border: 1px solid #c8f1df !important;
  box-shadow: 0 14px 28px rgba(0, 107, 85, .10) !important;
  font-size: 29px !important;
}

.pmd-menu-v160-placeholder strong {
  font-size: 12px !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
}

.pmd-menu-v160-card-body {
  padding-top: 15px !important;
}

.pmd-menu-v160-card h3 {
  min-height: 46px !important;
  margin-top: 12px !important;
}

.pmd-menu-v160-tags {
  min-height: 34px !important;
  margin: 13px 0 16px !important;
}


/* PMD Menu v162: resilient image placeholder */
.pmd-menu-v160-image {
  position: relative !important;
}

.pmd-menu-v160-image img {
  position: absolute !important;
  inset: 0 !important;
  z-index: 2 !important;
}

.pmd-menu-v160-image .pmd-menu-v160-placeholder {
  position: absolute !important;
  inset: 0 !important;
  z-index: 1 !important;
}

.pmd-menu-v160-image.has-image.is-loaded:not(.is-broken) .pmd-menu-v160-placeholder {
  display: none !important;
}

.pmd-menu-v160-image.has-image:not(.is-loaded) .pmd-menu-v160-placeholder,
.pmd-menu-v160-image.no-image .pmd-menu-v160-placeholder,
.pmd-menu-v160-image.is-broken .pmd-menu-v160-placeholder {
  display: flex !important;
}

.pmd-menu-v160-image.is-broken {
  border-color: #d8edf7 !important;
}

.pmd-menu-v160-card {
  min-height: 374px !important;
}

.pmd-menu-v160-image {
  height: 142px !important;
}

.pmd-menu-v160-card h3 {
  min-height: 38px !important;
  font-size: 19px !important;
}

.pmd-menu-v160-price-row strong {
  font-size: 21px !important;
}

.pmd-menu-v160-card-actions .pmd-menu-v160-btn.small {
  min-height: 40px !important;
}


/* PMD Menu v163: use CSS background images so global scripts cannot remove menu photos */
.pmd-menu-v160-image.has-image,
.pmd-menu-v160-image.has-image:not(.is-loaded),
.pmd-menu-v160-image.has-image.is-loaded:not(.is-broken) {
  background-image:
    linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.02) 100%),
    var(--pmd-menu-img) !important;
  background-size: cover !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
}

.pmd-menu-v160-image.has-image .pmd-menu-v160-placeholder,
.pmd-menu-v160-image.has-image:not(.is-loaded) .pmd-menu-v160-placeholder,
.pmd-menu-v160-image.has-image.is-loaded:not(.is-broken) .pmd-menu-v160-placeholder {
  display: none !important;
}

.pmd-menu-v160-image.no-image .pmd-menu-v160-placeholder,
.pmd-menu-v160-image.is-broken .pmd-menu-v160-placeholder {
  display: flex !important;
}

.pmd-menu-v160-image {
  height: 148px !important;
}

.pmd-menu-v160-card {
  min-height: 378px !important;
}

.pmd-menu-v160-toolbar {
  gap: 14px !important;
}

.pmd-menu-v160-search {
  max-width: none !important;
}

.pmd-menu-v160-tools {
  justify-content: flex-end !important;
}

.pmd-menu-v160-card h3 {
  min-height: 40px !important;
}

.pmd-menu-v160-card-actions {
  padding-top: 2px !important;
}


/* PMD Menu v164: force menu preview images visible */
.pmd-menu-v160-image {
  background-color: #f4fbf8 !important;
}

.pmd-menu-v160-image.has-image {
  background-image: var(--pmd-menu-img), linear-gradient(135deg, #f7fbfa 0%, #ffffff 100%) !important;
  background-size: contain, cover !important;
  background-position: center center, center center !important;
  background-repeat: no-repeat, no-repeat !important;
}

.pmd-menu-v160-image.has-image::before {
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  z-index: 0 !important;
  background: radial-gradient(circle at 50% 22%, rgba(0,107,85,.08), transparent 42%) !important;
  pointer-events: none !important;
}

.pmd-menu-v160-image.has-image .pmd-menu-v160-placeholder {
  opacity: 0 !important;
  pointer-events: none !important;
}

.pmd-menu-v160-image.no-image .pmd-menu-v160-placeholder,
.pmd-menu-v160-image.is-broken .pmd-menu-v160-placeholder {
  opacity: 1 !important;
}

.pmd-menu-v160-image {
  height: 150px !important;
}

.pmd-menu-v160-card {
  min-height: 380px !important;
}

.pmd-menu-v160-card-body {
  padding: 14px 18px 18px !important;
}

.pmd-menu-v160-tags span {
  padding: 5px 8px !important;
}

.pmd-menu-v160-price-row {
  margin-top: 2px !important;
}








/* PMD_MENU_INDEX_V167_PURE_BG_START */
#pmd-menu-grid .pmd-menu-v160-image {
  position: relative !important;
  height: 158px !important;
  margin: 16px 16px 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  border-radius: 20px !important;
  border: 1px solid #d8edf7 !important;
  background-color: #f7fbfa !important;
  background-repeat: no-repeat !important;
  background-position: center center !important;
}

#pmd-menu-grid .pmd-menu-v160-image.has-image {
  background-image: var(--pmd-menu-real-img), linear-gradient(135deg, #f9fffd 0%, #ffffff 100%) !important;
  background-size: contain, cover !important;
  background-position: center center, center center !important;
  background-repeat: no-repeat, no-repeat !important;
}

#pmd-menu-grid .pmd-menu-v160-image.has-image .pmd-menu-v160-placeholder {
  display: none !important;
  opacity: 0 !important;
  visibility: hidden !important;
}

#pmd-menu-grid .pmd-menu-v160-image.no-image .pmd-menu-v160-placeholder,
#pmd-menu-grid .pmd-menu-v160-image.is-broken .pmd-menu-v160-placeholder {
  display: flex !important;
  opacity: 1 !important;
  visibility: visible !important;
}

#pmd-menu-grid .pmd-menu-v160-card {
  min-height: 384px !important;
}

#pmd-menu-grid .pmd-menu-v160-card-body {
  padding-top: 14px !important;
}

#pmd-menu-grid .pmd-menu-v160-card h3 {
  min-height: 40px !important;
}
/* PMD_MENU_INDEX_V167_PURE_BG_END */

</style>

<script id="pmd-menu-v160-script">
(function () {
  const grid = document.getElementById('pmd-menu-grid');
  if (!grid || grid.dataset.pmdMenuV160Ready === '1') return;

  grid.dataset.pmdMenuV160Ready = '1';

  const toggleBtn = document.getElementById('pmd-layout-toggle');
  const selectBtn = document.getElementById('pmd-select-toggle');
  const saveBtn = document.getElementById('pmd-menu-save-order');
  const searchInput = document.getElementById('pmd-menu-search');
  const warning = document.getElementById('pmd-menu-filter-warning');
  const stateEl = document.getElementById('pmd-menu-order-state');
  const countEl = document.getElementById('pmd-selection-count');
  const catWrap = document.getElementById('pmd-category-buttons');

  let editMode = false;
  let selectMode = false;
  let dirty = false;
  let dragCard = null;

  const cards = () => Array.from(grid.querySelectorAll('.pmd-menu-v160-card'));
  const activeCategory = () => catWrap.querySelector('.pmd-menu-v160-cat.active[data-category]')?.dataset.category || 'all';

  function syncMode() {
    const filtered = activeCategory() !== 'all';

    if (warning) warning.style.display = filtered ? 'block' : 'none';

    cards().forEach(card => {
      card.draggable = editMode && !filtered;
      card.classList.toggle('is-draggable', editMode && !filtered);
      card.classList.toggle('select-mode', selectMode);

      const menu = card.querySelector('.pmd-card-menu');
      if (menu) menu.style.display = editMode ? 'none' : '';
    });

    if (toggleBtn) toggleBtn.disabled = filtered;
    if (saveBtn) {
      saveBtn.hidden = !(editMode && dirty);
      saveBtn.disabled = !dirty || !editMode || filtered;
    }

    if (stateEl && !dirty) stateEl.textContent = 'Layout is saved';
    if (countEl) countEl.style.display = selectMode ? '' : 'none';
  }

  function applyFilter() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    const cat = activeCategory();

    cards().forEach(card => {
      const okCat = cat === 'all' || card.dataset.categoryId === cat;
      const okQ = !q || (card.dataset.menuName || '').includes(q);
      card.classList.toggle('is-hidden', !(okCat && okQ));
    });

    syncMode();
  }

  function updateSelection() {
    const selected = cards().filter(card => card.querySelector('.pmd-select-checkbox')?.checked).length;

    if (countEl) countEl.textContent = selected + ' selected';

    cards().forEach(card => {
      card.classList.toggle('is-selected', !!card.querySelector('.pmd-select-checkbox')?.checked);
    });
  }

  if (catWrap) {
    catWrap.addEventListener('click', event => {
      const btn = event.target.closest('.pmd-menu-v160-cat[data-category]');
      if (!btn) return;

      catWrap.querySelectorAll('.pmd-menu-v160-cat[data-category]').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      applyFilter();
});
  }

  if (searchInput) searchInput.addEventListener('input', applyFilter);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (toggleBtn.disabled) return;

      editMode = !editMode;

      if (editMode && selectMode) {
        selectMode = false;
      }

      toggleBtn.textContent = editMode ? 'Done editing' : 'Edit Layout';

      if (dirty && stateEl) stateEl.textContent = 'Unsaved items order';

      syncMode();
    });
  }

  if (selectBtn) {
    selectBtn.addEventListener('click', () => {
      if (editMode) return;

      selectMode = !selectMode;

      cards().forEach(card => {
        if (!selectMode) {
          const checkbox = card.querySelector('.pmd-select-checkbox');
          if (checkbox) checkbox.checked = false;
          card.classList.remove('is-selected');
        }
      });

      updateSelection();
      syncMode();
    });
  }

  grid.addEventListener('change', event => {
    if (event.target.classList.contains('pmd-select-checkbox')) updateSelection();
  });

  cards().forEach(card => {
    card.addEventListener('dragstart', event => {
      if (!editMode) return event.preventDefault();

      dragCard = card;
      card.classList.add('is-dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
    });

    card.addEventListener('dragover', event => {
      if (!editMode) return;
      event.preventDefault();
    });

    card.addEventListener('drop', event => {
      event.preventDefault();

      if (!editMode || !dragCard || dragCard === card) return;

      const after = (event.clientY - card.getBoundingClientRect().top) > card.offsetHeight / 2;

      if (after) card.after(dragCard);
      else card.before(dragCard);

      dirty = true;

      if (stateEl) stateEl.textContent = 'Unsaved items order';

      syncMode();
    });
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const ordered = cards().map(card => card.dataset.menuId).filter(Boolean);
      const body = ordered.map(id => 'ordered_ids[]=' + encodeURIComponent(id)).join('&') + '&_handler=onSaveCardOrder';

      fetch(window.location.pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
        },
        body
      })
      .then(response => response.json())
      .then(json => {
        if (json && json.ok) {
          dirty = false;
          if (stateEl) stateEl.textContent = 'Saved';
          setTimeout(() => {
            if (!dirty && stateEl) stateEl.textContent = 'Layout is saved';
          }, 1200);
          syncMode();
        }
        else if (stateEl) {
          stateEl.textContent = 'Save failed';
        }
      })
      .catch(() => {
        if (stateEl) stateEl.textContent = 'Save failed';
      });
    });
  }

  function postToggle(handler, id) {
    const body = '_handler=' + encodeURIComponent(handler) + '&menu_id=' + encodeURIComponent(id);

    fetch(window.location.pathname, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
      },
      body
    })
    .then(response => response.json())
    .then(json => {
      if (json && json.ok) {
        location.reload();
      }
      else {
        alert((json && json.message) || 'Action failed');
      }
    })
    .catch(() => alert('Action failed'));
  }

  grid.addEventListener('click', event => {
    const status = event.target.closest('.pmd-status-toggle');
    if (status) postToggle('onToggleMenuStatus', status.dataset.menuId);

    const stock = event.target.closest('.pmd-stock-toggle');
    if (stock) postToggle('onToggleMenuStock', stock.dataset.menuId);
  });

  applyFilter();

  window.PMDMenuV160 = {
    check() {
      return {
        mark: 'PMD_MENU_INDEX_V160_KDS_STYLE',
        cards: cards().length,
        hidden: cards().filter(card => card.classList.contains('is-hidden')).length,
        categories: catWrap ? catWrap.querySelectorAll('[data-category]').length : 0,
        search: !!searchInput,
        images: {
          total: document.querySelectorAll('.pmd-menu-v160-image').length,
          real: document.querySelectorAll('.pmd-menu-v160-image.has-image').length,
          loaded: Array.from(document.querySelectorAll('.pmd-menu-v166-photo')).filter(img => img.complete && img.naturalWidth > 0).length,
          broken: document.querySelectorAll('.pmd-menu-v160-image.is-broken').length,
          pmdnew: document.querySelectorAll('.pmd-menu-v160-image[data-img-source*="pmdnew"]').length,
          official: document.querySelectorAll('.pmd-menu-v160-image[data-img-source="official-media"]').length,
          sample: Array.from(document.querySelectorAll('.pmd-menu-v160-image')).slice(0, 4).map(box => ({
            source: box.dataset.imgSource || '',
            src: box.dataset.imgSrc || '',
            score: box.dataset.imgScore || ''
          }))
        },
        status: 'OK'
      };
    }
  };

  console.info('✅ PMD Menu Index v160 KDS-style active', window.PMDMenuV160.check());
})();
</script>
