#!/usr/bin/env python3
from pathlib import Path
import sys

MARKER = "PMD_VR_RETURN_RESUME_R1_4_4"


def fail(message: str) -> None:
    raise SystemExit("ERROR: " + message)


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: patch-pmd-vr-return-resume-r1-4-4.py <PaymentReturnClient.tsx>")

    path = Path(sys.argv[1]).resolve()
    if not path.is_file():
        fail("target not found: " + str(path))

    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        print(MARKER + "=ALREADY_PRESENT")
        return

    anchor_state = """  const [state, setState] = useState<State>('checking')\n  const [message, setMessage] = useState('Verifying your payment with PayMyDine…')\n  const [returnTo, setReturnTo] = useState('/')\n"""
    replacement_state = """  const [state, setState] = useState<State>('checking')\n  const [message, setMessage] = useState('Verifying your payment with PayMyDine…')\n  const [returnTo, setReturnTo] = useState('/')\n  const [returnResolved, setReturnResolved] = useState(false) // PMD_VR_RETURN_RESUME_R1_4_4\n"""
    if anchor_state not in text:
        fail("return state anchor not found")
    text = text.replace(anchor_state, replacement_state, 1)

    anchor_fallback = """      const fallback = safeReturnPath(pending?.returnTo || params.get('return_to') || '/')\n      setReturnTo(fallback)\n\n      if (!provider || !pending) {\n"""
    replacement_fallback = """      const fallback = safeReturnPath(pending?.returnTo || params.get('return_to') || '/')\n      setReturnTo(fallback)\n      setReturnResolved(true)\n\n      if (!provider || !pending) {\n"""
    if anchor_fallback not in text:
        fail("return fallback anchor not found")
    text = text.replace(anchor_fallback, replacement_fallback, 1)

    anchor_icon = """  const Icon = state === 'paid'\n"""
    resume_effect = """  // PMD_VR_RETURN_RESUME_R1_4_4\n  // VR Payment Lightbox intentionally redirects the top-level window to successUrl\n  // or failedUrl after processing. Keep the canonical /payment/return verification\n  // authority, then resume the original PayMyDine table URL in the SAME tab.\n  // window.location.replace prevents Back from re-entering the provider return page.\n  useEffect(() => {\n    if (!returnResolved || (state !== 'paid' && state !== 'cancelled')) return\n    if (!returnTo || returnTo.startsWith('/payment/return')) return\n\n    const timer = window.setTimeout(() => {\n      window.location.replace(returnTo)\n    }, state === 'paid' ? 900 : 500)\n\n    return () => window.clearTimeout(timer)\n  }, [returnResolved, returnTo, state])\n\n  const Icon = state === 'paid'\n"""
    if anchor_icon not in text:
        fail("Icon anchor not found")
    text = text.replace(anchor_icon, resume_effect, 1)

    path.write_text(text, encoding="utf-8")

    updated = path.read_text(encoding="utf-8")
    if updated.count(MARKER) < 2:
        fail("R1.4.4 markers missing after patch")
    if "window.location.replace(returnTo)" not in updated:
        fail("same-tab resume call missing after patch")

    print(MARKER + "=OK")
    print("VR_RETURN_AUTHORITY=PAYMENT_RETURN_VERIFY_THEN_RESUME")
    print("VR_RETURN_NAVIGATION=SAME_TAB_LOCATION_REPLACE")


if __name__ == "__main__":
    main()
