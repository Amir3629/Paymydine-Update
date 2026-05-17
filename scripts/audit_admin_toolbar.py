#!/usr/bin/env python3
"""Audit PayMyDine admin toolbar normalization safety.

The production bug class here is DOM reparenting of TastyIgniter buttons. This
script combines static guards with DOM-fixture simulations of the four reported
production toolbars so the classifier stays conservative.
"""
from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_JS = ROOT / "app/admin/assets/src/js/app.js"
BUILT_JS = ROOT / "app/admin/assets/js/admin.js"
TOOLBAR_CSS = ROOT / "app/admin/assets/css/pmd-admin/components/toolbar-buttons.css"
NO_GREEN_CSS = ROOT / "app/admin/assets/css/no-green-toolbar-buttons.css"


class Node:
    def __init__(self, tag: str, attrs: dict[str, str], parent: "Node | None" = None):
        self.tag = tag.lower()
        self.attrs = attrs
        self.parent = parent
        self.children: list[Node] = []
        self.text = ""

    @property
    def classes(self) -> set[str]:
        return set(self.attrs.get("class", "").split())

    def add_class(self, *names: str) -> None:
        classes = self.classes
        classes.update(names)
        self.attrs["class"] = " ".join(sorted(classes))

    def remove_class(self, *names: str) -> None:
        classes = self.classes
        classes.difference_update(names)
        self.attrs["class"] = " ".join(sorted(classes))

    def has_class(self, name: str) -> bool:
        return name in self.classes

    def attr(self, name: str) -> str:
        return self.attrs.get(name, "")

    def all_text(self) -> str:
        return (self.text + " " + " ".join(child.all_text() for child in self.children)).strip()

    def descendants(self) -> list["Node"]:
        out: list[Node] = []
        for child in self.children:
            out.append(child)
            out.extend(child.descendants())
        return out

    def find_all(self, pred) -> list["Node"]:
        return [node for node in self.descendants() if pred(node)]

    def find(self, pred) -> "Node | None":
        for node in self.descendants():
            if pred(node):
                return node
        return None


class Parser(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self):
        super().__init__()
        self.root = Node("root", {})
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, {k: v or "" for k, v in attrs}, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag.lower() not in self.VOID:
            self.stack.append(node)

    def handle_endtag(self, tag):
        tag = tag.lower()
        while len(self.stack) > 1:
            node = self.stack.pop()
            if node.tag == tag:
                break

    def handle_data(self, data):
        self.stack[-1].text += data


def parse(html: str) -> Node:
    parser = Parser()
    parser.feed(html)
    return parser.root


def text(node: Node) -> str:
    return re.sub(r"\s+", " ", node.all_text()).strip().lower()


def contains(node: Node, pred) -> bool:
    return pred(node) or any(pred(desc) for desc in node.descendants())


def is_hidden(node: Node) -> bool:
    return (
        node.attrs.get("hidden") is not None
        or node.attr("aria-hidden") == "true"
        or node.tag in {"script", "style", "template"}
        or node.attr("type") == "hidden"
        or bool({"d-none", "hide"} & node.classes)
        or "display:none" in node.attr("style").replace(" ", "")
    )


def is_back(node: Node) -> bool:
    if is_hidden(node):
        return False
    if node.attr("data-pmd-toolbar-back") or node.has_class("pmd-toolbar-back-action"):
        return True
    if re.search(r"^(back|cancel)(\b|\s|$)", text(node)):
        return True
    return contains(node, lambda n: "fa-arrow-left" in n.attr("class") or "fa-chevron-left" in n.attr("class"))


def is_action(node: Node) -> bool:
    if is_hidden(node) or node.tag in {"input", "script", "style"}:
        return False
    if node.has_class("progress-indicator"):
        return False
    if node.has_class("right-buttons"):
        return True
    if node.classes & {"btn", "btn-group", "dropdown", "form-group"}:
        return True
    if any(k in node.attrs for k in ("data-pmd-toolbar-secondary", "data-pmd-toolbar-primary", "data-request", "data-control", "data-toggle", "data-bs-toggle")):
        return True
    return contains(node, lambda n: bool(n.classes & {"btn", "btn-group"}) or any(k in n.attrs for k in ("data-pmd-toolbar-secondary", "data-pmd-toolbar-primary", "data-request", "data-control", "data-toggle", "data-bs-toggle")))


def primary_score(node: Node) -> int:
    if not is_action(node) or is_back(node):
        return 0
    label = text(node)
    requests = [n.attr("data-request").lower() for n in [node] + node.descendants() if n.attr("data-request")]
    request = requests[0] if requests else ""
    if request == "onsave":
        return 100
    if node.attr("data-pmd-toolbar-primary"):
        return 95
    if re.search(r"\b(save|create)\b", label):
        return 90
    if "edit layout" in label:
        return 85
    if contains(node, lambda n: bool(n.classes & {"btn-primary", "btn-success"})):
        if re.search(r"check for updates|check updates|update check", label) or request == "oncheckupdates":
            return 45
        return 75
    if re.search(r"^(new|add)(\b|\s|$)", label) or " add " in f" {label} ":
        return 65
    return 0


def normalize(container: Node) -> None:
    before = {id(node): id(node.parent) for node in container.descendants()}
    for node in [container] + container.descendants():
        node.remove_class("pmd-toolbar-primary-action", "pmd-toolbar-secondary-action", "pmd-toolbar-secondary-first")
    container.add_class("pmd-toolbar-normalized")
    direct = container.children
    right = next((child for child in direct if child.has_class("right-buttons")), None)
    if right:
        container.add_class("pmd-toolbar-split")
    primary = None
    best = 0
    backs: list[Node] = []
    for child in direct:
        if child is right:
            continue
        if not is_action(child):
            continue
        if is_back(child):
            backs.append(child)
            continue
        score = primary_score(child)
        if score > best:
            best = score
            primary = child
    secondary: list[Node] = []
    for child in direct:
        if not is_action(child) or child is right or child is primary or is_back(child):
            continue
        secondary.append(child)
    if right:
        for child in right.children:
            if is_action(child):
                secondary.append(child)
    for back in backs:
        back.add_class("pmd-toolbar-back-action", "pmd-toolbar-secondary-action")
        back.attrs["data-pmd-toolbar-back"] = "true"
    if primary:
        primary.add_class("pmd-toolbar-primary-action")
    first = right
    if right:
        right.add_class("pmd-toolbar-right-buttons", "pmd-toolbar-secondary-first")
    for action in secondary:
        if action is primary or is_back(action):
            continue
        action.add_class("pmd-toolbar-secondary-action")
        if first is None:
            first = action
    if first:
        first.add_class("pmd-toolbar-secondary-first")
    after = {id(node): id(node.parent) for node in container.descendants()}
    assert before == after, "normalizer simulation reparented a node"


def button_by_text(root: Node, needle: str) -> Node:
    needle = needle.lower()
    matches = [n for n in root.descendants() if needle in text(n) and is_action(n)]
    matches.sort(key=lambda n: len(n.descendants()))
    found = matches[0] if matches else None
    assert found is not None, f"missing action containing {needle!r}"
    return found


def fixture_system_logs() -> None:
    root = parse('''<div class="progress-indicator-container pmd-toolbar-normalized pmd-toolbar-split">
      <a class="btn btn-primary pmd-toolbar-primary-action" href="system_logs">Refresh</a>
      <div class="right-buttons pmd-toolbar-right-buttons">
        <a class="btn btn-danger pmd-toolbar-secondary-action" data-request-form="#list-form" data-request="onEmptyLog">Empty Logs</a>
        <a class="btn btn-default pmd-toolbar-secondary-action" href="request_logs">Request Logs</a>
      </div>
    </div>''')
    container = root.children[0]
    normalize(container)
    assert container.has_class("pmd-toolbar-normalized") and container.has_class("pmd-toolbar-split")
    assert button_by_text(root, "Refresh").has_class("pmd-toolbar-primary-action")
    right = container.find(lambda n: n.has_class("right-buttons"))
    assert right and right.has_class("pmd-toolbar-right-buttons") and right.has_class("pmd-toolbar-secondary-first")
    assert button_by_text(root, "Empty Logs").has_class("pmd-toolbar-secondary-action")
    assert button_by_text(root, "Request Logs").has_class("pmd-toolbar-secondary-action")


def fixture_staffs() -> None:
    root = parse('''<div class="progress-indicator-container">
      <a class="btn btn-primary" href="staffs/create">Add Staff</a>
      <a id="export" class="btn btn-default" data-request="onExport">Export</a>
      <button id="editor" class="btn btn-default" data-control="record-editor">Columns</button>
    </div>''')
    container = root.children[0]
    parents = {node.attr("id"): id(node.parent) for node in container.descendants() if node.attr("id")}
    normalize(container)
    assert button_by_text(root, "Add Staff").has_class("pmd-toolbar-primary-action")
    assert button_by_text(root, "Export").has_class("pmd-toolbar-secondary-action")
    assert button_by_text(root, "Columns").has_class("pmd-toolbar-secondary-action")
    assert button_by_text(root, "Export").has_class("pmd-toolbar-secondary-first")
    assert parents == {node.attr("id"): id(node.parent) for node in container.descendants() if node.attr("id")}


def fixture_language_edit() -> None:
    root = parse('''<div class="progress-indicator-container">
      <a class="btn btn-default"><i class="fa fa-arrow-left"></i> Back</a>
      <button class="btn btn-primary" data-request="onCheckUpdates">Check for updates</button>
      <input type="hidden" name="_handler" value="onSave">
      <div class="btn-group"><button class="btn btn-primary" data-request="onSave">Save</button></div>
      <button class="btn btn-danger" data-request="onDelete">Delete</button>
    </div>''')
    container = root.children[0]
    normalize(container)
    save_group = root.find(lambda n: n.has_class("btn-group"))
    assert save_group and save_group.has_class("pmd-toolbar-primary-action"), "nested onSave btn-group must be primary"
    assert not button_by_text(root, "Check for updates").has_class("pmd-toolbar-primary-action"), "Check updates must not beat Save"
    assert button_by_text(root, "Check for updates").has_class("pmd-toolbar-secondary-action")
    assert button_by_text(root, "Back").has_class("pmd-toolbar-back-action")
    assert button_by_text(root, "Delete").has_class("pmd-toolbar-secondary-action")
    hidden = root.find(lambda n: n.tag == "input")
    assert hidden and not (hidden.classes & {"pmd-toolbar-primary-action", "pmd-toolbar-secondary-action"}), "hidden input classified"


def fixture_dashboard() -> None:
    root = parse('''<div class="progress-indicator-container">
      <a class="btn btn-primary" data-request="onEditLayout">Edit Layout</a>
      <a id="add-widget" class="btn btn-default" data-toggle="modal" href="#add-widget-modal">Add Widget</a>
      <div id="date-range" class="form-group" data-control="daterange"><input name="date_range"></div>
    </div>''')
    container = root.children[0]
    parents = {node.attr("id"): id(node.parent) for node in container.descendants() if node.attr("id")}
    normalize(container)
    assert button_by_text(root, "Edit Layout").has_class("pmd-toolbar-primary-action")
    assert button_by_text(root, "Add Widget").has_class("pmd-toolbar-secondary-action")
    daterange = root.find(lambda n: n.attr("data-control") == "daterange")
    assert daterange and daterange.has_class("pmd-toolbar-secondary-action")
    assert button_by_text(root, "Add Widget").has_class("pmd-toolbar-secondary-first")
    assert parents == {node.attr("id"): id(node.parent) for node in container.descendants() if node.attr("id")}


def normalizer_block(text_: str) -> str:
    start = text_.find("PayMyDine admin toolbar normalization")
    if start == -1:
        return ""
    end = text_.find("function syncPaymentsModeToggleLabels", start)
    return text_[start:end if end != -1 else len(text_)]


def assert_static() -> None:
    src = SRC_JS.read_text(encoding="utf-8", errors="ignore")
    built = BUILT_JS.read_text(encoding="utf-8", errors="ignore")
    css = TOOLBAR_CSS.read_text(encoding="utf-8", errors="ignore")
    no_green = NO_GREEN_CSS.read_text(encoding="utf-8", errors="ignore")
    for name, content in (("src", src), ("built", built)):
        assert content.count("PayMyDine admin toolbar normalization") == 1, f"duplicate normalizer in {name} JS"
        for helper in ("function syncPaymentsModeToggleLabels", "function queueToolbarSplitRefresh", "function scheduleToolbarSplit"):
            assert content.count(helper) == 1, f"duplicate toolbar helper {helper} in {name} JS"
        assert "PMD_TOOLBAR_SPLIT_STYLE_ID" not in content, f"runtime CSS marker found in {name} JS"
        assert "pmd-toolbar-split-runtime-style" not in content, f"runtime CSS id found in {name} JS"
        assert "secondaryActions.length < 2" not in content, f"old secondary guard in {name} JS"
        block = normalizer_block(content)
        assert "appendChild(style)" not in block and "document.createElement('style')" not in block, f"runtime CSS injection in {name} normalizer"
        assert ".appendChild(button)" not in block and "insertBefore(backAction" not in block and "rightButtons.appendChild" not in block, f"toolbar action reparenting in {name} normalizer"
    assert "pmd-toolbar-secondary-first" in css, "CSS missing secondary-first alignment marker"
    assert "margin-left: auto" in css, "CSS missing right alignment margin"
    assert "btn-danger.pmd-toolbar-secondary-action" in css, "CSS missing danger preservation rule"
    for path, content in ((TOOLBAR_CSS, css), (NO_GREEN_CSS, no_green)):
        for selector in re.findall(r"(^|\n)([^{}]+)\{", content):
            group = selector[1]
            for part in group.split(','):
                stripped = part.strip()
                compact = stripped.replace("html body.page ", "").replace("html body ", "")
                if re.match(r"^(?:a|button)?\.btn(?:[\s.#:[>+~]|$)", compact):
                    raise AssertionError(f"unsafe top-level .btn selector in {path.relative_to(ROOT)}: {stripped}")


def main() -> int:
    checks = [assert_static, fixture_system_logs, fixture_staffs, fixture_language_edit, fixture_dashboard]
    failures: list[str] = []
    for check in checks:
        try:
            check()
            print(f"PASS {check.__name__}")
        except Exception as exc:  # noqa: BLE001
            failures.append(f"FAIL {check.__name__}: {exc}")
    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    print("Admin toolbar audit passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
