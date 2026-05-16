from pathlib import Path
import re

# مسیر فایل اصلی admin.js
admin_js = Path("/var/www/paymydine/app/admin/assets/js/admin.js")
vendor_dir = Path("/var/www/paymydine/app/admin/assets/vendor/pmd-mediafix/")

# --- STEP 1: ایجاد فایل‌های vendor حداقلی ---
vendor_files = {
    "moment.min.js": "/* Minimal moment.js placeholder */\nwindow.moment=function(){return{format:function(){return''}}};",
    "daterangepicker.js": "/* Minimal daterangepicker placeholder */\njQuery.fn.daterangepicker=function(){return this;};",
    "daterangepicker.css": "/* Minimal CSS placeholder */\n"
}

vendor_dir.mkdir(parents=True, exist_ok=True)
for fname, content in vendor_files.items():
    fpath = vendor_dir / fname
    if not fpath.exists():
        fpath.write_text(content, encoding="utf-8")
        print(f"✅ Created placeholder: {fpath}")

# --- STEP 2: پاک کردن بلوک قبلی PMD Toolbar Splitter ---
if not admin_js.exists():
    raise SystemExit(f"ERROR: File not found: {admin_js}")

text = admin_js.read_text(encoding="utf-8", errors="ignore")

start = "/* PMD GLOBAL TOOLBAR SPLITTER START */"
end = "/* PMD GLOBAL TOOLBAR SPLITTER END */"
pattern = re.escape(start) + r".*?" + re.escape(end)
text = re.sub(pattern, "", text, flags=re.S).rstrip()

# --- STEP 3: اضافه کردن بلوک جدید toolbar splitter ---
block = r'''
/* PMD GLOBAL TOOLBAR SPLITTER START */
(function() {
    "use strict";

    window.PMDToolbarSplitter = {
        run: function() {
            var toolbar = document.querySelector('.toolbar-container');
            if (!toolbar) return;

            toolbar.classList.add('pmd-toolbar-split-active');

            var actions = toolbar.querySelectorAll('.toolbar-action');
            if (actions.length > 1) {
                // ایجاد کانتینر سمت راست
                var right = document.createElement('div');
                right.className = 'right-buttons';
                for (var i = 1; i < actions.length; i++) {
                    right.appendChild(actions[i]);
                }
                toolbar.appendChild(right);
            }

            console.log("✅ PMD Toolbar Splitter active");
        }
    };

    document.addEventListener('DOMContentLoaded', function() {
        if(window.PMDToolbarSplitter) window.PMDToolbarSplitter.run();
    });

    // Inject minimal CSS
    var styleId = "pmd-global-toolbar-splitter-style";
    if(!document.getElementById(styleId)) {
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
        .pmd-toolbar-split-active {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 8px !important;
            width: 100% !important;
        }
        .pmd-toolbar-split-active > .right-buttons {
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            gap: 8px !important;
            margin-left: auto !important;
        }
        `;
        document.head.appendChild(style);
    }
})();
/* PMD GLOBAL TOOLBAR SPLITTER END */
'''

text += "\n\n" + block
admin_js.write_text(text, encoding="utf-8")
print(f"✅ Updated: {admin_js}")
print("💡 Now do a hard refresh in browser: Cmd + Shift + R (Mac) or Ctrl + F5 (Windows)")
