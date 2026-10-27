#!/usr/bin/env python3
"""PMD_R46_FLOOR_CONFIRM_NEUTRAL_UI

Patch only TWO existing R45B assets on a dirty live VPS:
- custom confirmation close + Cancel buttons become neutral white,
  matching the Owner's Add Floor card. Danger action stays red.
- hide Edit Table's status prose, keep its DOM and its R45B decision
  logic, disabled controls and server-side protection intact.

Never edits floor engine, controllers, tenant DB, the new V2 frontend,
modal event handlers, reservation, payment or order code.
"""
from pathlib import Path
import sys

JS_MARKER = 'PMD_R46_NEUTRAL_REMOVE_CONFIRM'
CSS_MARKER = 'PMD_R46_HIDE_TABLE_SAFETY_PROSE'
JS_ANCHORS = {
    "close": "      close.textContent = '×';",
    "cancel": "      cancel.textContent = 'Cancel';",
    "append": "      document.body.appendChild(layer);",
}
JS_HELPER = """
  // PMD_R46_NEUTRAL_REMOVE_CONFIRM
  // The global admin action skin can turn Cancel/X into green primaries.
  // This modal owns only the neutral controls; the destructive action
  // and its original confirmation event handling are left unchanged.
  function pmdR46NeutralAction(button) {
    if (!button || !button.style ||
        typeof button.style.setProperty !== 'function') return;
    [
      ['background', '#fff'],
      ['background-color', '#fff'],
      ['background-image', 'none'],
      ['border', '1px solid #c9dce8'],
      ['color', '#21483e'],
      ['-webkit-text-fill-color', '#21483e'],
      ['box-shadow', 'none'],
      ['text-shadow', 'none'],
    ].forEach(function (entry) {
      button.style.setProperty(entry[0], entry[1], 'important');
    });
  }
"""

CSS_ADD = """
/* PMD_R46_HIDE_TABLE_SAFETY_PROSE
 * The R45B message remains a DOM state target for the existing JS;
 * action lock/guards stay operative. Hide only its visible explanation.
 */
html body [data-pmd-floor-table-manager-panel] [data-pmd-r45-table-safety],
html body > [data-pmd-floor-table-manager-portal="true"] [data-pmd-r45-table-safety] {
  display:none!important;
  visibility:hidden!important;
  margin:0!important;
  padding:0!important;
}

/* PMD_R46_NEUTRAL_REMOVE_CONFIRM
 * Only the shared Remove Table/Remove Floor custom confirmation.
 * Keep destructive submit red and existing backdrop/blur/keyboard handling.
 */
html body > .pmd-r45-confirm-layer .pmd-r45-confirm-card
  .pmd-r45-confirm-heading button.pmd-r45-confirm-close,
html body > .pmd-r45-confirm-layer .pmd-r45-confirm-card
  .pmd-r45-confirm-actions button.pmd-r45-confirm-cancel {
  background:#fff!important;
  background-color:#fff!important;
  background-image:none!important;
  border:1px solid #c9dce8!important;
  color:#21483e!important;
  -webkit-text-fill-color:#21483e!important;
  text-shadow:none!important;
  box-shadow:none!important;
}
html body > .pmd-r45-confirm-layer .pmd-r45-confirm-card
  .pmd-r45-confirm-heading button.pmd-r45-confirm-close:hover,
html body > .pmd-r45-confirm-layer .pmd-r45-confirm-card
  .pmd-r45-confirm-actions button.pmd-r45-confirm-cancel:hover {
  background:#f5faf8!important;
  background-color:#f5faf8!important;
  border-color:#a6c7bb!important;
  color:#143d32!important;
  -webkit-text-fill-color:#143d32!important;
}
"""


def patch_js(text: str) -> str:
    if JS_MARKER in text:
        if (text.count(JS_MARKER) != 1 or
            "data-pmd-r46-neutral', 'close'" not in text or
            "data-pmd-r46-neutral', 'cancel'" not in text or
            text.count('pmdR46NeutralAction(close);') != 2 or
            text.count('pmdR46NeutralAction(cancel);') != 2):
            raise RuntimeError('STOP: R46 JS is partially installed or changed')
        return text
    if text.count('  var active = null;') != 1:
        raise RuntimeError('STOP: R45 confirmation JS entrypoint drift')
    for label, anchor in JS_ANCHORS.items():
        if text.count(anchor) != 1:
            raise RuntimeError('STOP: R45 confirmation ' + label + ' anchor drift')
    required = [
        "close.className = 'pmd-r45-confirm-close';",
        "cancel.className = 'pmd-r45-confirm-cancel';",
        "submit.className = 'pmd-r45-confirm-submit';",
        "close.addEventListener('click'",
        "cancel.addEventListener('click'",
        "submit.addEventListener('click'",
        "event.key === 'Escape'",
        "event.key === 'Tab'",
    ]
    if any(text.count(token) != 1 for token in required):
        raise RuntimeError('STOP: shared R45 alertdialog or action handlers drift')
    result = text.replace('  var active = null;', '  var active = null;\n' + JS_HELPER, 1)
    result = result.replace(JS_ANCHORS['close'],
        JS_ANCHORS['close'] +
        "\n      close.setAttribute('data-pmd-r46-neutral', 'close');" +
        "\n      pmdR46NeutralAction(close);", 1)
    result = result.replace(JS_ANCHORS['cancel'],
        JS_ANCHORS['cancel'] +
        "\n      cancel.setAttribute('data-pmd-r46-neutral', 'cancel');" +
        "\n      pmdR46NeutralAction(cancel);", 1)
    result = result.replace(JS_ANCHORS['append'],
        JS_ANCHORS['append'] +
        '\n      pmdR46NeutralAction(close);' +
        '\n      pmdR46NeutralAction(cancel);', 1)
    if result.count('submit.addEventListener') != text.count('submit.addEventListener'):
        raise RuntimeError('STOP: destructive action handler modified')
    return result


def patch_css(text: str) -> str:
    if CSS_MARKER in text:
        if text.count(CSS_MARKER) != 1 or text.count(JS_MARKER) != 1:
            raise RuntimeError('STOP: incomplete R46 CSS installation')
        if 'display:none!important;' not in text.split(CSS_MARKER, 1)[1]:
            raise RuntimeError('STOP: R46 message hide rule absent')
        return text
    required = [
        'html body .pmd-r45-table-safety,',
        'html body .pmd-floor-table-manager__delete:disabled,',
        'html body .pmd-r45-confirm-close {',
        'html body .pmd-r45-confirm-cancel {',
        'html body .pmd-r45-confirm-submit {',
        'z-index:2147483647!important;',
    ]
    if any(text.count(token) != 1 for token in required):
        raise RuntimeError('STOP: R45 safety CSS structure differs; preserve VPS')
    return text.rstrip() + '\n\n' + CSS_ADD.strip() + '\n'


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit('Usage: patcher.py JS_IN CSS_IN JS_OUT CSS_OUT')
    js_input, css_input, js_output, css_output = map(Path, sys.argv[1:])
    if any(not f.is_file() or f.is_symlink() for f in (js_input, css_input)):
        raise RuntimeError('STOP: R45 source missing or symlinked')
    original_js = js_input.read_text(encoding='utf-8')
    original_css = css_input.read_text(encoding='utf-8')
    updated_js = patch_js(original_js)
    updated_css = patch_css(original_css)
    for path, data in ((js_output, updated_js), (css_output, updated_css)):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(data, encoding='utf-8')
    print('PASS R46: neutral X/Cancel in shared confirmation; Edit Table status prose hidden.')
    print('PASS R46: original Cancel/Delete actions and R45 safety rules retained.')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(3)
