# PMD Floor V1

Canonical reusable restaurant floor component.

## Page

`/admin/floor`

## Reuse inside any Blade page

Load the assets once:

```blade
<link rel="stylesheet" href="/app/admin/assets/css/pmd-floor-v1.css">
<script src="/app/admin/assets/js/pmd-floor-v1.js" defer></script>
```

Include the shared component:

```blade
@include('admin::_partials.pmd_floor_map_v1', [
    'floorId' => 'orders-floor',
    'floorSize' => 'compact',
    'floorMode' => 'embedded',
])
```

Supported sizes:

- `compact`
- `standard`
- `large`
- `fill`

All instances use the same live table endpoint, saved layout endpoint, and operational state endpoint. Layout edits and table status changes therefore appear in every page that includes this component.

## Included controls

- edit and save table positions
- merge and unmerge tables
- guide card
- zoom in/out and fit
- fullscreen
- refresh
- search and status filters
- mark available
- mark reserved
- needs cleaning
- waiter call
- notes
- open table / waiter POS

## Events and API

The runtime exposes `window.PMDFloorMapV1` and emits `pmd:floor:updated` after layout or operational updates.
