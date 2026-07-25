#!/usr/bin/env bash
set -euo pipefail

echo "This deployment was withdrawn because it replaced the final Reservations2 Blade with an older repository snapshot."
echo "Do not deploy this branch. Restore the VPS backup created before runtime-cleanup-v1 instead."
exit 1
