#!/usr/bin/env python3
"""Standalone, read-only tests of the Nginx tenant unavailable installer.

Usage: python3 scripts/test-pmd-tenant-unavailable-r1.py
No Nginx, database, network or elevated privileges required.
"""
from __future__ import annotations
import importlib.util
from pathlib import Path

path = Path(__file__).with_name("pmd-install-tenant-unavailable-r1.py")
spec = importlib.util.spec_from_file_location("pmd_tenant_unavailable_installer", path)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

gate = """
server {
  listen 443 ssl;
  server_name example.paymydine.com;
  # PMD_TENANT_ACCESS_GATE_R2_START
  auth_request /__pmd_tenant_access_check;
  error_page 401 403 =302 https://paymydine.com/;
  location = /__pmd_tenant_access_check { internal; auth_request off; }
  # PMD_TENANT_ACCESS_GATE_R2_END
}
"""
patched, edits, count = module.transform(gate, "example")
assert edits == 1 and count == 1
assert module.OLD not in patched
assert module.INCLUDE in patched
repeat, edits, count = module.transform(patched, "example")
assert repeat == patched and edits == 0 and count == 1

two = gate + gate.replace("example.paymydine.com", "second.paymydine.com")
patched, edits, count = module.transform(two, "multiple tenant servers")
assert edits == 2 and count == 2
assert patched.count(module.INCLUDE) == 2

for invalid in [
    "error_page 401 403 =302 https://paymydine.com/;",
    gate.replace(module.GATE, "auth_request off;"),
    gate.replace(module.OLD, "return 302 https://paymydine.com/;"),
]:
    try:
        module.transform(invalid, "invalid")
    except RuntimeError:
        pass
    else:
        raise AssertionError("Unsafe / changed vhost was not rejected")

print("PASS: tenant unavailable Nginx installer dry-run transformation (6 checks)")
