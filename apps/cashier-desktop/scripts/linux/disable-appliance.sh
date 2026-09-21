#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run with sudo: sudo paymydine-disable-appliance" >&2
  exit 1
fi

rm -f /etc/lightdm/lightdm.conf.d/90-paymydine-appliance.conf
rm -f /etc/paymydine/appliance-mode.json
for tty in 2 3 4 5 6; do
  systemctl unmask "getty@tty${tty}.service" >/dev/null 2>&1 || true
done
systemctl unmask sleep.target suspend.target hibernate.target hybrid-sleep.target >/dev/null 2>&1 || true

# Do not delete the app, POS user, printers, or administrator accounts.
# This command only disables automatic kiosk/appliance behavior.
echo "PAYMYDINE_APPLIANCE_DISABLED=YES"
echo "Reboot to return to the normal Linux login screen: sudo reboot"
