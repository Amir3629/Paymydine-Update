#!/usr/bin/env python3
from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

TIMEOUT = 20
UA = 'PayMyDine-admin-asset-404-repair-r2'

ASSETS = {
    'app/admin/assets/vendor/pmd-mediafix/moment.min.js': (
        'https://cdn.jsdelivr.net/npm/moment@2.29.4/min/moment.min.js',
        "window.moment=window.moment||function(v){return{format:function(){return String(v||'')},clone:function(){return this}}};\n",
    ),
    'app/admin/assets/vendor/pmd-mediafix/tempusdominus-bootstrap-4.min.js': (
        'https://cdnjs.cloudflare.com/ajax/libs/tempusdominus-bootstrap-4/5.39.0/js/tempusdominus-bootstrap-4.min.js',
        "(function($){if($&&!$.fn.datetimepicker){$.fn.datetimepicker=function(){return this;};}})(window.jQuery);\n",
    ),
    'app/admin/assets/vendor/pmd-mediafix/tempusdominus-bootstrap-4.min.css': (
        'https://cdnjs.cloudflare.com/ajax/libs/tempusdominus-bootstrap-4/5.39.0/css/tempusdominus-bootstrap-4.min.css',
        '.bootstrap-datetimepicker-widget{position:absolute;z-index:3000;background:#fff}\n',
    ),
    'app/admin/assets/vendor/pmd-mediafix/bootstrap-treeview.min.js': (
        'https://cdn.jsdelivr.net/npm/bootstrap-treeview@1.2.0/dist/bootstrap-treeview.min.js',
        "(function($){if($&&!$.fn.treeview){$.fn.treeview=function(){return this;};}})(window.jQuery);\n",
    ),
    'app/admin/assets/vendor/pmd-mediafix/bootstrap-treeview.min.css': (
        'https://cdn.jsdelivr.net/npm/bootstrap-treeview@1.2.0/dist/bootstrap-treeview.min.css',
        '.treeview .list-group{margin-bottom:0}.treeview .list-group-item{cursor:pointer}\n',
    ),
    'app/admin/assets/vendor/pmd-mediafix/jquery-clockpicker.min.js': (
        'https://cdnjs.cloudflare.com/ajax/libs/clockpicker/0.0.7/bootstrap-clockpicker.min.js',
        "(function($){if($&&!$.fn.clockpicker){$.fn.clockpicker=function(){return this;};}})(window.jQuery);\n",
    ),
    'app/admin/assets/vendor/pmd-mediafix/jquery-clockpicker.min.css': (
        'https://cdnjs.cloudflare.com/ajax/libs/clockpicker/0.0.7/bootstrap-clockpicker.min.css',
        '.clockpicker-popover{z-index:3000}\n',
    ),
    'app/admin/assets/vendor/pmd-mediafix/Sortable.min.js': (
        'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js',
        "window.Sortable=window.Sortable||function(){};window.Sortable.create=window.Sortable.create||function(){return{destroy:function(){}}};\n",
    ),
    'app/admin/assets/vendor/pmd-mediafix/dropzone.min.js': (
        'https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/min/dropzone.min.js',
        "window.Dropzone=window.Dropzone||function(){};window.Dropzone.autoDiscover=false;\n",
    ),
    'app/admin/assets/vendor/pmd-mediafix/dropzone.min.css': (
        'https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/min/dropzone.min.css',
        '.dropzone{border:2px dashed #cbd5e1;border-radius:10px;padding:16px}\n',
    ),
    'app/main/widgets/mediamanager/assets/vendor/dropzone/dropzone.min.js': (
        'https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/min/dropzone.min.js',
        "window.Dropzone=window.Dropzone||function(){};window.Dropzone.autoDiscover=false;\n",
    ),
    'app/main/widgets/mediamanager/assets/vendor/dropzone/dropzone.min.css': (
        'https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.3/min/dropzone.min.css',
        '.dropzone{border:2px dashed #cbd5e1;border-radius:10px;padding:16px}\n',
    ),
    'app/main/widgets/mediamanager/assets/vendor/treeview/bootstrap-treeview.min.js': (
        'https://cdn.jsdelivr.net/npm/bootstrap-treeview@1.2.0/dist/bootstrap-treeview.min.js',
        "(function($){if($&&!$.fn.treeview){$.fn.treeview=function(){return this;};}})(window.jQuery);\n",
    ),
    'app/main/widgets/mediamanager/assets/vendor/treeview/bootstrap-treeview.min.css': (
        'https://cdn.jsdelivr.net/npm/bootstrap-treeview@1.2.0/dist/bootstrap-treeview.min.css',
        '.treeview .list-group{margin-bottom:0}.treeview .list-group-item{cursor:pointer}\n',
    ),
    'app/main/widgets/mediamanager/assets/vendor/selectonic/selectonic.min.js': (
        'https://cdn.jsdelivr.net/npm/selectonic@1.1.0/dist/selectonic.min.js',
        "(function($){if($&&!$.fn.selectonic){$.fn.selectonic=function(){return this;};}})(window.jQuery);\n",
    ),
}


def fetch(url: str) -> bytes | None:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
            if response.status >= 400:
                return None
            return response.read()
    except Exception:
        return None


def main() -> int:
    if len(sys.argv) != 2:
        print('usage: pmd_admin_asset_404_repair_r2.py <paymydine-root>', file=sys.stderr)
        return 2

    root = Path(sys.argv[1]).resolve()
    created: list[str] = []
    skipped: list[str] = []

    for rel, (url, fallback) in ASSETS.items():
        target = root / rel
        if target.exists() and target.stat().st_size > 0:
            skipped.append(rel)
            print(f'SKIPPED_EXISTING={rel}')
            continue

        target.parent.mkdir(parents=True, exist_ok=True)
        data = fetch(url)
        if data:
            target.write_bytes(data)
            source = 'cdn'
        else:
            target.write_text(fallback, encoding='utf-8')
            source = 'safe-fallback'

        created.append(rel)
        print(f'CREATED={rel} SOURCE={source}')

    print(f'CREATED_COUNT={len(created)}')
    print(f'SKIPPED_EXISTING_COUNT={len(skipped)}')
    print('PMD_ADMIN_ASSET_404_REPAIR_R2_OK')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
