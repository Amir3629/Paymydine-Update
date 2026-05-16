#!/usr/bin/env python3
"""Static/DOM-assumption audit for PayMyDine admin toolbar assets.

This does not log in to a running admin panel. It verifies the source assets and
uses representative toolbar fixtures for the pages called out in the cleanup
request so regressions are caught in CI or during production hotfix review.
"""
from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_FILES = [
    ROOT / "app/admin/assets/src/js/app.js",
    ROOT / "app/admin/assets/js/admin.js",
]
CSS_FILE = ROOT / "app/admin/assets/css/no-green-toolbar-buttons.css"
BASH_FILES = [ROOT / "scripts/fix_admin_back_buttons.sh"]
PY_FILES = [ROOT / "scripts/repair_admin_assets.py", ROOT / "scripts/audit_admin_toolbar.py"]
KNOWN_SOURCE_GLOBS = [
    "app/admin/controllers/Coupons.php",
    "app/admin/controllers/Staffs.php",
    "app/admin/controllers/Payments.php",
    "app/admin/controllers/Orders.php",
    "app/admin/controllers/Menus.php",
    "app/admin/controllers/Categories.php",
    "app/admin/controllers/MenuItems.php",
    "app/admin/controllers/Settings.php",
]

FIXTURES = {
    "/admin/coupons": """
      <div class='toolbar-action'><div class='progress-indicator-container'>
        <a class='btn btn-primary'>Add Coupon</a>
        <button class='btn btn-default'>Delete Selected</button>
      </div></div>
    """,
    "/admin/coupons/edit/1": """
      <div class='toolbar-action'><div class='progress-indicator-container'>
        <a class='btn btn-outline-secondary'><i class='fa fa-arrow-left'></i></a>
        <button class='btn btn-primary' data-request='onSave'>Save</button>
        <button class='btn btn-danger'>Delete</button>
      </div></div>
    """,
    "/admin/staffs": """
      <div class='toolbar-action'><div class='progress-indicator-container'>
        <a class='btn btn-primary'>Add Staff</a>
        <button class='btn btn-light'>Filter</button>
        <button class='btn btn-default'>Export</button>
      </div></div>
    """,
    "/admin/payments": """
      <div class='toolbar-action'><div class='progress-indicator-container'>
        <a class='btn btn-primary'>Create</a>
        <a class='btn btn-light pmd-payments-mode-toggle'>Providers</a>
      </div></div>
    """,
    "/admin/orders": """
      <div class='toolbar-action'><div class='progress-indicator-container'>
        <a class='btn btn-primary'>Create Order</a>
        <button class='btn btn-default'>Filter</button>
      </div></div>
    """,
    "/admin/menus/items": """
      <div class='toolbar-action'><div class='progress-indicator-container'>
        <a class='btn btn-primary'>Add Menu Item</a>
        <a class='btn btn-default'>Back</a>
      </div></div>
    """,
    "/admin/settings": """
      <div class='toolbar-action'><div class='progress-indicator-container'>
        <button class='btn btn-primary' data-request='onSave'>Save</button>
        <a class='btn btn-light'>Cancel</a>
      </div></div>
    """,
}

class ButtonParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.buttons: list[dict[str, object]] = []
        self.stack: list[str] = []
        self.current: dict[str, object] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = {k: v or "" for k, v in attrs}
        classes = attrs_dict.get("class", "")
        self.stack.append(classes)
        if tag in {"a", "button"} and "btn" in classes.split():
            self.current = {"tag": tag, "classes": classes, "text": "", "attrs": attrs_dict, "parents": list(self.stack)}
            self.buttons.append(self.current)

    def handle_data(self, data: str) -> None:
        if self.current is not None:
            self.current["text"] = str(self.current.get("text", "")) + data

    def handle_endtag(self, tag: str) -> None:
        if tag in {"a", "button"}:
            self.current = None
        if self.stack:
            self.stack.pop()


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore") if path.exists() else ""


def assert_true(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def classify_fixture(path: str, html: str) -> list[str]:
    parser = ButtonParser()
    parser.feed(html)
    report = [f"{path}:"]
    primary_seen = False
    secondary_seen = 0
    for button in parser.buttons:
        classes = str(button["classes"])
        text = re.sub(r"\s+", " ", str(button["text"])).strip() or "[icon]"
        attrs = button["attrs"]  # type: ignore[assignment]
        is_back = "arrow-left" in html and text == "[icon]" or text.lower() == "back"
        is_primary = "btn-primary" in classes or "btn-success" in classes or (isinstance(attrs, dict) and attrs.get("data-request") == "onSave")
        is_danger = "btn-danger" in classes
        if is_back:
            role = "secondary-back"
        elif is_primary:
            role = "primary"
            primary_seen = True
        elif is_danger:
            role = "danger-secondary"
            secondary_seen += 1
        else:
            role = "secondary"
            secondary_seen += 1
        report.append(f"  - {text}: role={role}; classes={classes}; expected_parent=.right-buttons when split={role != 'primary' and not is_back}")
    report.append(f"  - split_expected={primary_seen and secondary_seen >= 1}; one_secondary_supported={secondary_seen == 1}")
    return report


def main() -> int:
    errors: list[str] = []

    for js in JS_FILES:
        text = read(js)
        rel = js.relative_to(ROOT)
        assert_true(text.count("PayMyDine admin toolbar normalization.") == 1, f"{rel}: duplicate/missing normalizer", errors)
        assert_true(("secondaryActions" + ".length < 2") not in text, f"{rel}: old bad split condition exists", errors)
        assert_true("PMD_TOOLBAR_SPLIT_STYLE_ID" not in text, f"{rel}: runtime style injection exists", errors)
        assert_true("closest('.modal, .modal-footer, .table, .list-table" in text, f"{rel}: table/modal skip guard missing", errors)

    css = read(CSS_FILE)
    rel_css = CSS_FILE.relative_to(ROOT)
    assert_true(css.count("PayMyDine admin button/toolbar system.") == 1, f"{rel_css}: canonical CSS marker missing/duplicated", errors)
    assert_true(".pmd-toolbar-right-buttons" in css, f"{rel_css}: right-buttons rules missing", errors)
    assert_true("Back is secondary" in css, f"{rel_css}: back secondary rule missing", errors)
    assert_true(not re.search(r"(?m)^\s*\.btn(?:[\s,{.:#]|$)", css), f"{rel_css}: unsafe top-level .btn selector", errors)

    for source in KNOWN_SOURCE_GLOBS:
        path = ROOT / source
        if path.exists():
            text = read(path)
            assert_true(any(token in text for token in ("toolbar", "button", "list", "form", "config")), f"{source}: known admin source looked empty/unexpected", errors)

    print("Admin toolbar fixture report")
    print("============================")
    for page, html in FIXTURES.items():
        print("\n".join(classify_fixture(page, html)))

    if errors:
        print("\nFailures", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("\nAll toolbar audits passed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
