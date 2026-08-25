<!-- PMD_TABLE_QR_TEMPLATE_STUDIO_V2_INLINE -->
<style id="pmd-table-qr-template-studio-v2-inline-css">
/* PMD_TABLE_QR_TEMPLATE_STUDIO_V1 */
.pmd-table-qr-studio-v1 {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
    margin-left: 2rem;
}

.pmd-table-qr-studio-v1__preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 176px;
    min-height: 176px;
    padding: 12px;
    border: 1px solid #dce6ed;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 10px 24px rgba(24, 48, 70, .08);
}

.pmd-table-qr-studio-v1__preview img {
    display: block;
    width: 150px;
    height: 150px;
    object-fit: contain;
    image-rendering: pixelated;
}

.pmd-table-qr-studio-v1__actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
}

.pmd-table-qr-studio-v1__actions strong {
    color: #17324d;
    font-size: 15px;
    font-weight: 800;
}

.pmd-table-qr-studio-v1__actions span {
    max-width: 300px;
    color: #708395;
    font-size: 13px;
    line-height: 1.45;
}

.pmd-table-qr-studio-v1__button {
    appearance: none;
    border: 1px solid #173f67;
    border-radius: 10px;
    background: #173f67;
    color: #fff;
    padding: 11px 16px;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 8px 18px rgba(23, 63, 103, .16);
    transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
}

.pmd-table-qr-studio-v1__button:hover,
.pmd-table-qr-studio-v1__button:focus-visible {
    background: #0f355d;
    transform: translateY(-1px);
    box-shadow: 0 12px 22px rgba(23, 63, 103, .2);
    outline: none;
}

html.pmd-qr-template-modal-open-v1,
html.pmd-qr-template-modal-open-v1 body {
    overflow: hidden !important;
}

.pmd-qr-template-modal-v1 {
    position: fixed;
    inset: 0;
    z-index: 2147482000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 28px;
    background: rgba(6, 20, 32, .58);
    backdrop-filter: blur(8px);
    opacity: 0;
    visibility: hidden;
    transition: opacity .16s ease, visibility .16s ease;
}

.pmd-qr-template-modal-v1.is-open {
    opacity: 1;
    visibility: visible;
}

.pmd-qr-template-dialog-v1 {
    width: min(1240px, 96vw);
    max-height: 92vh;
    overflow: auto;
    border: 1px solid rgba(220, 231, 239, .95);
    border-radius: 24px;
    background: #f6f9fb;
    box-shadow: 0 28px 90px rgba(3, 18, 31, .28);
}

.pmd-qr-template-header-v1 {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding: 24px 28px 22px;
    border-bottom: 1px solid #dfe8ee;
    background: rgba(255, 255, 255, .96);
    backdrop-filter: blur(16px);
}

.pmd-qr-template-kicker-v1 {
    display: inline-block;
    margin-bottom: 7px;
    color: #16815f;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .14em;
}

.pmd-qr-template-header-v1 h2 {
    margin: 0;
    color: #132f4a;
    font-size: 26px;
    line-height: 1.15;
    font-weight: 900;
}

.pmd-qr-template-header-v1 p {
    margin: 7px 0 0;
    color: #6d8091;
    font-size: 14px;
}

.pmd-qr-template-close-v1 {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: 1px solid #d8e3ea;
    border-radius: 13px;
    background: #fff;
    color: #193550;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
}

.pmd-qr-template-grid-v1 {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 18px;
    padding: 24px;
}

.pmd-qr-template-loading-v1 {
    grid-column: 1 / -1;
    padding: 70px 20px;
    color: #708395;
    text-align: center;
    font-size: 15px;
    font-weight: 700;
}

.pmd-qr-template-card-v1 {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
    border: 1px solid #dbe5eb;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 9px 24px rgba(22, 47, 70, .07);
    transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
}

.pmd-qr-template-card-v1:hover {
    transform: translateY(-2px);
    border-color: #b9cbd7;
    box-shadow: 0 16px 34px rgba(22, 47, 70, .12);
}

.pmd-qr-template-preview-v1 {
    padding: 14px;
    background:
        linear-gradient(45deg, #f2f5f7 25%, transparent 25%),
        linear-gradient(-45deg, #f2f5f7 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #f2f5f7 75%),
        linear-gradient(-45deg, transparent 75%, #f2f5f7 75%);
    background-size: 18px 18px;
    background-position: 0 0, 0 9px, 9px -9px, -9px 0;
}

.pmd-qr-template-preview-v1 canvas {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 12px;
    box-shadow: 0 6px 18px rgba(12, 33, 50, .12);
}

.pmd-qr-template-card-info-v1 {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 10px;
    padding: 14px 14px 10px;
}

.pmd-qr-template-number-v1 {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: #edf4f7;
    color: #31506a;
    font-size: 11px;
    font-weight: 900;
}

.pmd-qr-template-card-info-v1 h3 {
    margin: 1px 0 4px;
    color: #18344e;
    font-size: 14px;
    font-weight: 900;
}

.pmd-qr-template-card-info-v1 p {
    margin: 0;
    color: #788b9b;
    font-size: 11px;
    line-height: 1.42;
}

.pmd-qr-template-download-v1 {
    appearance: none;
    margin: auto 14px 14px;
    border: 1px solid #c8d7e1;
    border-radius: 10px;
    background: #fff;
    color: #173f67;
    padding: 10px 12px;
    font: inherit;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
    transition: background .16s ease, color .16s ease, border-color .16s ease;
}

.pmd-qr-template-download-v1:hover,
.pmd-qr-template-download-v1:focus-visible {
    border-color: #173f67;
    background: #173f67;
    color: #fff;
    outline: none;
}

@media (max-width: 1100px) {
    .pmd-qr-template-grid-v1 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 760px) {
    .pmd-table-qr-studio-v1 {
        margin-left: 0;
        align-items: flex-start;
    }

    .pmd-qr-template-modal-v1 {
        padding: 10px;
    }

    .pmd-qr-template-dialog-v1 {
        width: 100%;
        max-height: 96vh;
        border-radius: 18px;
    }

    .pmd-qr-template-header-v1 {
        padding: 18px;
    }

    .pmd-qr-template-header-v1 h2 {
        font-size: 21px;
    }

    .pmd-qr-template-grid-v1 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        padding: 14px;
    }
}

@media (max-width: 480px) {
    .pmd-qr-template-grid-v1 {
        grid-template-columns: 1fr;
    }
}
</style>

<div class="row-fluid">
    {!! form_open([
        'id'     => 'edit-form',
        'role'   => 'form',
        'method' => 'PATCH',
    ]) !!}
    {!! $this->renderForm() !!}
    {!! form_close() !!}
    <div class="ms-qr">
    <?php 
    use Illuminate\Support\Facades\DB;
    $request_uri = $_SERVER['REQUEST_URI']; 
    $uri_parts = explode('/', $request_uri);
    $id = end($uri_parts);
    $qr_code = DB::table('tables')->select('qr_code')->where('table_id', $id)->first();
    
    $date = date('Y-m-d');
    $location_id = 1;
    $max_capacity = 3;
    $table_id = 1;
    if ($qr_code) {
        $table_data = DB::table('tables')->where('qr_code', $qr_code->qr_code)->first();
        $date = date('Y-m-d', strtotime($table_data->updated_at));
        $current_time = date('H:i', strtotime($table_data->updated_at));
        $time = $current_time; // raw value; http_build_query will encode
        // FIXED: Get location data separately to avoid confusion
        $location_data = DB::table('locationables')
            ->where('locationable_id', $id)
            ->where('locationable_type', 'tables')
            ->first();
            
        $location_id = $location_data ? $location_data->location_id : 1;
        $max_capacity = $table_data->max_capacity ?? 3;
        $table_id = $id; // Use the actual table_id from URL, not from joined query
        $site_url = request()->getSchemeAndHttpHost();
        
        // STRICT: Build subdomain URL from location slug (no localhost fallback)
        // NO "use Illuminate\Support\Facades\DB;" here

        $location_id = DB::table('locationables')
            ->where('locationable_type', 'tables')
            ->where('locationable_id', $id)
            ->value('location_id');

        // FIXED: ALWAYS use tenant domain from database (no slug fallback)
        $tenant = app()->bound('tenant') ? app('tenant') : null;
        
        if ($tenant && !empty($tenant->domain)) {
            // Use tenant domain from middleware
            $scheme = request()->isSecure() ? 'https' : 'http';
            $frontend_url = "{$scheme}://{$tenant->domain}";
        } else {
            // Query ti_tenants directly from current host
            $host = request()->getHost();
            $tenantFromDb = DB::connection('mysql')->table('tenants')
                ->where('domain', $host)
                ->where('status', 'active')
                ->first();
            
            if ($tenantFromDb && !empty($tenantFromDb->domain)) {
                $scheme = request()->isSecure() ? 'https' : 'http';
                $frontend_url = "{$scheme}://{$tenantFromDb->domain}";
            } else {
                // FAIL LOUDLY - show error instead of using wrong domain
                echo '<div style="color:#b91c1c;background:#fee2e2;padding:10px;border-radius:6px;margin:10px 0;">
                        <strong> Cannot generate QR code:</strong> No tenant detected.<br>
                        Please ensure you\'re accessing the admin via tenant domain (e.g., mimoza.paymydine.com)
                      </div>';
                return;
            }
        }

        $tableNumber = (!empty($table_data->table_no) && (int)$table_data->table_no > 0)
            ? (int)$table_data->table_no
            : (int)($table_id ?? 0);

        $qr_redirect_url = rtrim($frontend_url, '/') . '/table/' . $tableNumber . '?' . http_build_query([
            'location' => $location_id ?? 1,
            'guest'    => $max_capacity ?? 1,
            'date'     => $date ?? date('Y-m-d'),
            'time'     => $time ?? date('H:i'),
            'qr'       => $qr_code->qr_code ?? $table_data->qr_code ?? null,
            'table'    => $tableNumber,
        ]);
$qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode($qr_redirect_url);

        // PMD_TABLE_QR_GENERATOR_AUTHORITY_UNCHANGED_V1
        // Keep the existing QR provider and payload exactly as-is. The template
        // studio below only changes how the already-generated QR is presented/downloaded.
        $qr_code_image = file_get_contents($qr_code_url);
        $base64_qr_code = base64_encode($qr_code_image);
        $qrDataUri = 'data:image/png;base64,' . $base64_qr_code;

        // PMD_TABLE_QR_TEMPLATE_STUDIO_V1
        // Read-only restaurant identity. No setting, table or QR data is written here.
        $settingValue = static function (string $key) {
            try {
                return DB::table('settings')->where('item', $key)->value('value');
            } catch (\Throwable $error) {
                return null;
            }
        };

        $restaurantName = trim((string)($settingValue('pmd_restaurant_identity_name') ?: $settingValue('site_name') ?: ''));
        if ($restaurantName === '') {
            try {
                $restaurantName = trim((string)(DB::table('locations')->where('location_id', $location_id)->value('location_name') ?: ''));
            } catch (\Throwable $error) {
                $restaurantName = '';
            }
        }
        if ($restaurantName === '') {
            $restaurantName = ucfirst((string)(explode('.', request()->getHost())[0] ?? 'Restaurant'));
        }

        $restaurantLogo = trim((string)($settingValue('pmd_restaurant_identity_logo') ?: $settingValue('site_logo') ?: ''));
        if ($restaurantLogo === '') {
            $restaurantLogo = '/brand/paymydine-logo.svg';
        } elseif (!preg_match('#^https?://#i', $restaurantLogo)) {
            $logoPath = '/'.ltrim(str_replace('\\', '/', (string)(parse_url($restaurantLogo, PHP_URL_PATH) ?: $restaurantLogo)), '/');
            if (str_starts_with($logoPath, '/api/media/') || str_starts_with($logoPath, '/assets/media/') || str_starts_with($logoPath, '/brand/')) {
                $restaurantLogo = $logoPath;
            } elseif (str_starts_with($logoPath, '/uploads/')) {
                $restaurantLogo = '/assets/media'.$logoPath;
            } else {
                $restaurantLogo = '/api/media/'.basename($logoPath);
            }
        }

        $tableDisplayName = trim((string)($table_data->table_name ?? ''));
        if ($tableDisplayName === '') {
            $tableDisplayName = 'Table '.$tableNumber;
        }

        echo '<div class="pmd-table-qr-studio-v1"'
            .' data-pmd-qr-template-studio-v1="1"'
            .' data-pmd-qr-src="'.e($qrDataUri).'"'
            .' data-pmd-restaurant-name="'.e($restaurantName).'"'
            .' data-pmd-restaurant-logo="'.e($restaurantLogo).'"'
            .' data-pmd-table-name="'.e($tableDisplayName).'">';
        echo '<div class="pmd-table-qr-studio-v1__preview">';
        echo '<img id="qr-code" src="'.e($qrDataUri).'" alt="QR Code for '.e($tableDisplayName).'" />';
        echo '</div>';
        echo '<div class="pmd-table-qr-studio-v1__actions">';
        echo '<strong>'.e($tableDisplayName).' QR code</strong>';
        echo '<span>Choose from 10 branded restaurant templates before downloading.</span>';
        echo '<button type="button" class="pmd-table-qr-studio-v1__button" data-pmd-qr-template-open-v1>Choose design &amp; download</button>';
        echo '</div>';
        echo '</div>';

    } 
    ?>
</div>
</div>

</div>

<script id="pmd-table-qr-template-studio-v2-inline-js">
/* PMD_TABLE_QR_TEMPLATE_STUDIO_V1
 * Presentation-only table QR template selector.
 * The existing table URL / QR payload authority is not changed here.
 */
(function () {
    'use strict';

    const ROOT_SELECTOR = '[data-pmd-qr-template-studio-v1]';
    const MODAL_ID = 'pmd-qr-template-modal-v1';

    const templates = [
        {
            id: 'classic',
            name: 'Classic White',
            description: 'Clean, bright and easy to print.',
            background: '#eef4f8',
            panel: '#ffffff',
            text: '#12314f',
            muted: '#6f8193',
            accent: '#1f5b91',
            qrPanel: '#ffffff',
            border: '#d7e2ea',
            decor: 'classic',
            centerBadge: true,
        },
        {
            id: 'midnight',
            name: 'Midnight',
            description: 'Premium dark table card.',
            background: '#071b18',
            panel: '#0d2a25',
            text: '#ffffff',
            muted: '#b3c8c1',
            accent: '#8de64e',
            qrPanel: '#ffffff',
            border: '#25443d',
            decor: 'midnight',
            centerBadge: true,
        },
        {
            id: 'emerald',
            name: 'Emerald',
            description: 'Fresh PayMyDine green style.',
            background: '#e7f7ef',
            panel: '#ffffff',
            text: '#103d32',
            muted: '#66867d',
            accent: '#0f8a68',
            qrPanel: '#ffffff',
            border: '#cce8da',
            decor: 'emerald',
            centerBadge: true,
        },
        {
            id: 'bistro',
            name: 'Warm Bistro',
            description: 'Warm restaurant table presentation.',
            background: '#f8efe1',
            panel: '#fffaf2',
            text: '#4b2b27',
            muted: '#8d7169',
            accent: '#a9473d',
            qrPanel: '#ffffff',
            border: '#ead5bf',
            decor: 'bistro',
            centerBadge: true,
        },
        {
            id: 'ocean',
            name: 'Ocean Blue',
            description: 'Modern blue hospitality card.',
            background: '#e8f3ff',
            panel: '#ffffff',
            text: '#173a63',
            muted: '#6f87a2',
            accent: '#2674c7',
            qrPanel: '#ffffff',
            border: '#c9ddf3',
            decor: 'ocean',
            centerBadge: true,
        },
        {
            id: 'mono',
            name: 'Maximum Scan',
            description: 'Black and white, no center overlay.',
            background: '#ffffff',
            panel: '#ffffff',
            text: '#111111',
            muted: '#606060',
            accent: '#111111',
            qrPanel: '#ffffff',
            border: '#111111',
            decor: 'mono',
            centerBadge: false,
        },
        {
            id: 'gold',
            name: 'Gold Dining',
            description: 'Elegant dark and gold finish.',
            background: '#171714',
            panel: '#22221d',
            text: '#fff8e3',
            muted: '#c8bea2',
            accent: '#d4ad4f',
            qrPanel: '#fffdf7',
            border: '#5a4a25',
            decor: 'gold',
            centerBadge: true,
        },
        {
            id: 'coral',
            name: 'Coral Welcome',
            description: 'Friendly and colourful.',
            background: '#fff0eb',
            panel: '#fffaf8',
            text: '#502f31',
            muted: '#8e6e6c',
            accent: '#ef715f',
            qrPanel: '#ffffff',
            border: '#f3cec5',
            decor: 'coral',
            centerBadge: true,
        },
        {
            id: 'tent',
            name: 'Table Tent',
            description: 'Bold header for counter or table stands.',
            background: '#eaf0f5',
            panel: '#ffffff',
            text: '#15324d',
            muted: '#708497',
            accent: '#15324d',
            qrPanel: '#ffffff',
            border: '#d1dde7',
            decor: 'tent',
            centerBadge: true,
        },
        {
            id: 'botanical',
            name: 'Botanical',
            description: 'Soft natural restaurant style.',
            background: '#f0f3e9',
            panel: '#fbfcf7',
            text: '#31432f',
            muted: '#788773',
            accent: '#718b62',
            qrPanel: '#ffffff',
            border: '#d8e0cf',
            decor: 'botanical',
            centerBadge: false,
        },
    ];

    function roundedRect(ctx, x, y, width, height, radius) {
        const r = Math.max(0, Math.min(radius, width / 2, height / 2));
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + width, y, x + width, y + height, r);
        ctx.arcTo(x + width, y + height, x, y + height, r);
        ctx.arcTo(x, y + height, x, y, r);
        ctx.arcTo(x, y, x + width, y, r);
        ctx.closePath();
    }

    function fillRounded(ctx, x, y, width, height, radius, fill, stroke, lineWidth) {
        roundedRect(ctx, x, y, width, height, radius);
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth || 1;
            ctx.stroke();
        }
    }

    function loadImage(src) {
        return new Promise((resolve) => {
            if (!src) {
                resolve(null);
                return;
            }
            const image = new Image();
            if (!String(src).startsWith('data:')) image.crossOrigin = 'anonymous';
            image.onload = function () { resolve(image); };
            image.onerror = function () { resolve(null); };
            image.src = src;
        });
    }

    function drawImageContain(ctx, image, x, y, width, height) {
        if (!image || !image.naturalWidth || !image.naturalHeight) return false;
        const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
        const w = image.naturalWidth * ratio;
        const h = image.naturalHeight * ratio;
        ctx.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
        return true;
    }

    function initials(value) {
        const parts = String(value || 'Restaurant').trim().split(/\s+/).filter(Boolean);
        return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'R';
    }

    function fitText(ctx, text, maxWidth, startSize, minSize, weight) {
        let size = startSize;
        while (size > minSize) {
            ctx.font = `${weight || 700} ${size}px Arial, Helvetica, sans-serif`;
            if (ctx.measureText(text).width <= maxWidth) break;
            size -= 2;
        }
        return size;
    }

    function drawLogoBadge(ctx, image, restaurantName, x, y, size, accent, shape) {
        const radius = shape === 'circle' ? size / 2 : size * 0.28;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.12)';
        ctx.shadowBlur = size * 0.12;
        ctx.shadowOffsetY = size * 0.04;
        fillRounded(ctx, x, y, size, size, radius, '#ffffff', 'rgba(18,49,79,.08)', Math.max(1, size * 0.012));
        ctx.shadowColor = 'transparent';
        const inset = size * 0.17;
        roundedRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, radius * 0.6);
        ctx.clip();
        if (!drawImageContain(ctx, image, x + inset, y + inset, size - inset * 2, size - inset * 2)) {
            ctx.fillStyle = accent;
            ctx.fillRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `800 ${size * 0.26}px Arial, Helvetica, sans-serif`;
            ctx.fillText(initials(restaurantName), x + size / 2, y + size / 2);
        }
        ctx.restore();
    }

    function drawDecor(ctx, config, w, h) {
        if (config.decor === 'midnight') {
            ctx.fillStyle = 'rgba(141,230,78,.09)';
            ctx.beginPath();
            ctx.arc(w * .88, h * .08, w * .22, 0, Math.PI * 2);
            ctx.fill();
        } else if (config.decor === 'emerald') {
            ctx.fillStyle = 'rgba(15,138,104,.09)';
            ctx.beginPath();
            ctx.arc(w * .08, h * .92, w * .24, 0, Math.PI * 2);
            ctx.fill();
        } else if (config.decor === 'bistro') {
            ctx.strokeStyle = 'rgba(169,71,61,.16)';
            ctx.lineWidth = w * .012;
            ctx.beginPath();
            ctx.arc(w * .91, h * .1, w * .14, 0, Math.PI * 2);
            ctx.stroke();
        } else if (config.decor === 'ocean') {
            const gradient = ctx.createLinearGradient(0, 0, w, h);
            gradient.addColorStop(0, 'rgba(38,116,199,.10)');
            gradient.addColorStop(1, 'rgba(38,116,199,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
        } else if (config.decor === 'gold') {
            ctx.strokeStyle = 'rgba(212,173,79,.28)';
            ctx.lineWidth = w * .006;
            ctx.strokeRect(w * .035, h * .028, w * .93, h * .944);
        } else if (config.decor === 'coral') {
            ctx.fillStyle = 'rgba(239,113,95,.10)';
            ctx.beginPath();
            ctx.arc(w * .08, h * .12, w * .18, 0, Math.PI * 2);
            ctx.fill();
        } else if (config.decor === 'botanical') {
            ctx.fillStyle = 'rgba(113,139,98,.10)';
            [[.06,.12,.12],[.94,.16,.09],[.08,.88,.14],[.92,.9,.11]].forEach(([x,y,r]) => {
                ctx.beginPath();
                ctx.ellipse(w*x, h*y, w*r, w*r*.48, -.55, 0, Math.PI*2);
                ctx.fill();
            });
        }
    }

    function drawTemplate(canvas, config, data, assets) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = config.background;
        ctx.fillRect(0, 0, w, h);
        drawDecor(ctx, config, w, h);

        const margin = w * .07;
        const panelX = margin;
        const panelY = h * .045;
        const panelW = w - margin * 2;
        const panelH = h * .91;
        const panelRadius = w * .035;

        ctx.save();
        ctx.shadowColor = config.decor === 'mono' ? 'transparent' : 'rgba(22,42,58,.10)';
        ctx.shadowBlur = w * .035;
        ctx.shadowOffsetY = w * .014;
        fillRounded(ctx, panelX, panelY, panelW, panelH, panelRadius, config.panel, config.border, w * .0018);
        ctx.restore();

        if (config.decor === 'tent') {
            ctx.save();
            roundedRect(ctx, panelX, panelY, panelW, panelH, panelRadius);
            ctx.clip();
            ctx.fillStyle = config.accent;
            ctx.fillRect(panelX, panelY, panelW, h * .175);
            ctx.restore();
        }

        const headerDark = config.decor === 'tent';
        const titleColor = headerDark ? '#ffffff' : config.text;
        const mutedColor = headerDark ? 'rgba(255,255,255,.76)' : config.muted;

        const logoSize = w * .105;
        const logoX = panelX + w * .055;
        const logoY = panelY + h * .045;
        drawLogoBadge(ctx, assets.logo, data.restaurantName, logoX, logoY, logoSize, config.accent, config.decor === 'gold' ? 'circle' : 'rounded');

        const textX = logoX + logoSize + w * .035;
        const textMax = panelX + panelW - textX - w * .045;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = titleColor;
        const restaurantFont = fitText(ctx, data.restaurantName, textMax, w * .044, w * .025, 800);
        ctx.font = `800 ${restaurantFont}px Arial, Helvetica, sans-serif`;
        ctx.fillText(data.restaurantName, textX, logoY + logoSize * .48);
        ctx.fillStyle = mutedColor;
        ctx.font = `600 ${w * .019}px Arial, Helvetica, sans-serif`;
        ctx.fillText('SCAN • ORDER • ENJOY', textX, logoY + logoSize * .78);

        const qrSize = w * .57;
        const qrX = (w - qrSize) / 2;
        const qrY = h * .305;
        const qrPad = w * .032;

        ctx.textAlign = 'center';
        ctx.fillStyle = config.accent;
        ctx.font = `800 ${w * .024}px Arial, Helvetica, sans-serif`;
        ctx.fillText('SCAN TO VIEW MENU', w / 2, qrY - h * .035);

        ctx.save();
        ctx.shadowColor = config.decor === 'mono' ? 'transparent' : 'rgba(15,28,40,.12)';
        ctx.shadowBlur = w * .024;
        ctx.shadowOffsetY = w * .008;
        fillRounded(ctx, qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, w * .026, config.qrPanel, config.border, w * .002);
        ctx.restore();

        if (assets.qr) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(assets.qr, qrX, qrY, qrSize, qrSize);
            ctx.restore();
        }

        if (config.centerBadge) {
            const badgeSize = qrSize * .145;
            const badgeX = qrX + (qrSize - badgeSize) / 2;
            const badgeY = qrY + (qrSize - badgeSize) / 2;
            // Keep the badge deliberately small. The QR finder corners are never touched.
            drawLogoBadge(ctx, assets.logo, data.restaurantName, badgeX, badgeY, badgeSize, config.accent, 'rounded');
        }

        const tableY = qrY + qrSize + h * .082;
        ctx.fillStyle = config.text;
        const tableFont = fitText(ctx, data.tableName, panelW * .72, w * .052, w * .031, 800);
        ctx.font = `800 ${tableFont}px Arial, Helvetica, sans-serif`;
        ctx.fillText(data.tableName, w / 2, tableY);

        ctx.fillStyle = config.muted;
        ctx.font = `500 ${w * .021}px Arial, Helvetica, sans-serif`;
        ctx.fillText('Point your camera at the QR code to open the menu', w / 2, tableY + h * .045);

        const footerY = panelY + panelH - h * .065;
        ctx.fillStyle = config.muted;
        ctx.font = `600 ${w * .018}px Arial, Helvetica, sans-serif`;
        ctx.fillText('Powered by', w / 2, footerY - h * .018);
        ctx.fillStyle = config.text;
        ctx.font = `800 ${w * .027}px Arial, Helvetica, sans-serif`;
        ctx.fillText('PayMyDine', w / 2, footerY + h * .018);
    }

    function safeFilename(value) {
        return String(value || 'restaurant')
            .trim()
            .replace(/[^a-z0-9]+/gi, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 70) || 'restaurant';
    }

    function makeButton(label, className) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = label;
        return button;
    }

    function getData(root) {
        return {
            qrSrc: root.getAttribute('data-pmd-qr-src') || '',
            restaurantName: root.getAttribute('data-pmd-restaurant-name') || 'Restaurant',
            restaurantLogo: root.getAttribute('data-pmd-restaurant-logo') || '',
            tableName: root.getAttribute('data-pmd-table-name') || 'Table',
        };
    }

    function createModal(root, data) {
        let modal = document.getElementById(MODAL_ID);
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.className = 'pmd-qr-template-modal-v1';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Choose QR design');

        const dialog = document.createElement('div');
        dialog.className = 'pmd-qr-template-dialog-v1';
        modal.appendChild(dialog);

        const header = document.createElement('div');
        header.className = 'pmd-qr-template-header-v1';
        header.innerHTML = '<div><span class="pmd-qr-template-kicker-v1">TABLE QR</span><h2>Choose your QR design</h2><p>Pick one of 10 print-ready designs. Your table link stays exactly the same.</p></div>';
        const close = makeButton('×', 'pmd-qr-template-close-v1');
        close.setAttribute('aria-label', 'Close');
        header.appendChild(close);
        dialog.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'pmd-qr-template-grid-v1';
        dialog.appendChild(grid);

        const loading = document.createElement('div');
        loading.className = 'pmd-qr-template-loading-v1';
        loading.textContent = 'Preparing 10 designs…';
        grid.appendChild(loading);

        function closeModal() {
            modal.classList.remove('is-open');
            document.documentElement.classList.remove('pmd-qr-template-modal-open-v1');
            setTimeout(() => modal.remove(), 160);
        }

        close.addEventListener('click', closeModal);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModal();
        });
        document.addEventListener('keydown', function onKey(event) {
            if (event.key === 'Escape' && document.getElementById(MODAL_ID)) {
                document.removeEventListener('keydown', onKey);
                closeModal();
            }
        });

        document.body.appendChild(modal);
        requestAnimationFrame(() => modal.classList.add('is-open'));
        document.documentElement.classList.add('pmd-qr-template-modal-open-v1');

        Promise.all([loadImage(data.qrSrc), loadImage(data.restaurantLogo)]).then(([qr, logo]) => {
            grid.innerHTML = '';
            const assets = { qr, logo };

            templates.forEach((template, index) => {
                const card = document.createElement('article');
                card.className = 'pmd-qr-template-card-v1';
                card.setAttribute('data-template-id', template.id);

                const previewWrap = document.createElement('div');
                previewWrap.className = 'pmd-qr-template-preview-v1';
                const canvas = document.createElement('canvas');
                canvas.width = 300;
                canvas.height = 400;
                canvas.setAttribute('aria-label', `${template.name} preview`);
                previewWrap.appendChild(canvas);
                card.appendChild(previewWrap);

                const info = document.createElement('div');
                info.className = 'pmd-qr-template-card-info-v1';
                info.innerHTML = `<div class="pmd-qr-template-number-v1">${String(index + 1).padStart(2, '0')}</div><div><h3>${template.name}</h3><p>${template.description}</p></div>`;
                card.appendChild(info);

                const download = makeButton('Download this design', 'pmd-qr-template-download-v1');
                card.appendChild(download);

                drawTemplate(canvas, template, data, assets);

                download.addEventListener('click', () => {
                    const exportCanvas = document.createElement('canvas');
                    exportCanvas.width = 1200;
                    exportCanvas.height = 1600;
                    drawTemplate(exportCanvas, template, data, assets);
                    const link = document.createElement('a');
                    link.download = `${safeFilename(data.restaurantName)}-${safeFilename(data.tableName)}-${template.id}-qr.png`;
                    link.href = exportCanvas.toDataURL('image/png', 1);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                });

                grid.appendChild(card);
            });
        });

        return modal;
    }

    function init(root) {
        if (!root || root.dataset.pmdQrTemplateReady === '1') return;
        root.dataset.pmdQrTemplateReady = '1';
        const data = getData(root);
        const open = root.querySelector('[data-pmd-qr-template-open-v1]');
        if (!open) return;
        open.addEventListener('click', function () {
            createModal(root, data);
        });
    }

    function boot() {
        document.querySelectorAll(ROOT_SELECTOR).forEach(init);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }

    window.PMDQrTemplateStudioV1 = {
        boot,
        templates: templates.map(({ id, name }) => ({ id, name })),
    };
})();
</script>
