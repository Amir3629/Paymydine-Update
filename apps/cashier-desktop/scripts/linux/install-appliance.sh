#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run with sudo: sudo ./install-appliance.sh /path/to/PayMyDine-Desktop-1.5.0-linux-amd64.deb" >&2
  exit 1
fi

DEB_PATH="${1:-}"
if [[ -z "$DEB_PATH" || ! -f "$DEB_PATH" ]]; then
  echo "Usage: sudo ./install-appliance.sh /absolute/path/PayMyDine-Desktop-1.5.0-linux-amd64.deb" >&2
  exit 2
fi
DEB_PATH="$(readlink -f "$DEB_PATH")"

if [[ ! -r /etc/os-release ]]; then
  echo "Unsupported Linux: /etc/os-release is missing." >&2
  exit 3
fi
# shellcheck disable=SC1091
source /etc/os-release
if [[ "${ID:-}" != "ubuntu" ]]; then
  echo "PayMyDine Appliance V1.5 currently supports Ubuntu only. Detected: ${PRETTY_NAME:-unknown}" >&2
  exit 4
fi
if [[ "${VERSION_ID:-}" != "24.04" ]]; then
  echo "PayMyDine Appliance V1.5 is certified for Ubuntu 24.04 LTS. Detected: ${PRETTY_NAME:-unknown}" >&2
  exit 5
fi
if [[ "$(dpkg --print-architecture)" != "amd64" ]]; then
  echo "PayMyDine Appliance V1.5 requires amd64/x86_64 hardware." >&2
  exit 6
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
for required in paymydine-kiosk-session.sh paymydine-kiosk.desktop openbox-rc.xml disable-appliance.sh; do
  if [[ ! -f "$SCRIPT_DIR/$required" ]]; then
    echo "Appliance kit is incomplete: missing $required" >&2
    exit 7
  fi
done

export DEBIAN_FRONTEND=noninteractive
echo "lightdm shared/default-x-display-manager select lightdm" | debconf-set-selections || true

echo "[1/8] Installing kiosk desktop, CUPS and support tools..."
apt-get update
apt-get install -y --no-install-recommends \
  lightdm openbox xfce4 xfce4-terminal dbus-x11 \
  cups cups-client printer-driver-all x11-xserver-utils ca-certificates

echo "[2/8] Installing PayMyDine Desktop..."
apt-get install -y "$DEB_PATH"

echo "[3/8] Creating restricted restaurant POS account..."
if ! id paymydine >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash --comment "PayMyDine POS" paymydine
fi
passwd -l paymydine >/dev/null 2>&1 || true
groupadd -f nopasswdlogin
usermod -aG nopasswdlogin,lp,lpadmin,audio,video,plugdev paymydine
install -d -o paymydine -g paymydine -m 0700 /home/paymydine/.config/paymydine

echo "[4/8] Installing PayMyDine-only session..."
install -d -m 0755 /etc/paymydine
install -m 0755 "$SCRIPT_DIR/paymydine-kiosk-session.sh" /usr/local/bin/paymydine-kiosk-session
install -m 0644 "$SCRIPT_DIR/paymydine-kiosk.desktop" /usr/share/xsessions/paymydine-kiosk.desktop
install -m 0644 "$SCRIPT_DIR/openbox-rc.xml" /etc/paymydine/openbox-rc.xml
install -m 0755 "$SCRIPT_DIR/disable-appliance.sh" /usr/local/sbin/paymydine-disable-appliance
cat >/etc/paymydine/appliance-mode.json <<'JSON'
{
  "enabled": true,
  "mode": "ubuntu-lightdm-openbox",
  "version": "1.5.0",
  "developerExit": "password-protected",
  "rebootReturnsToKiosk": true
}
JSON
chmod 0644 /etc/paymydine/appliance-mode.json

echo "[5/8] Configuring automatic PayMyDine login..."
install -d -m 0755 /etc/lightdm/lightdm.conf.d
cat >/etc/lightdm/lightdm.conf.d/90-paymydine-appliance.conf <<'CONF'
[Seat:*]
autologin-user=paymydine
autologin-user-timeout=0
autologin-session=paymydine-kiosk
user-session=paymydine-kiosk
greeter-hide-users=true
greeter-show-manual-login=true
allow-guest=false
CONF

# Keep the existing administrator account intact for recovery/support.
if [[ -x /usr/sbin/lightdm ]]; then
  printf '%s\n' /usr/sbin/lightdm >/etc/X11/default-display-manager
fi
systemctl disable gdm3.service >/dev/null 2>&1 || true
systemctl enable lightdm.service >/dev/null 2>&1 || true

echo "[6/8] Enabling local printer service..."
systemctl enable --now cups.service

echo "[7/8] Hardening restaurant-facing console access..."
for tty in 2 3 4 5 6; do
  systemctl mask "getty@tty${tty}.service" >/dev/null 2>&1 || true
done
systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target >/dev/null 2>&1 || true

echo "[8/8] Verifying installation..."
if ! command -v paymydine >/dev/null 2>&1 && [[ ! -x /opt/PayMyDine/paymydine ]] && [[ ! -x /opt/PayMyDine/PayMyDine ]]; then
  echo "PayMyDine package installed but executable could not be located." >&2
  exit 8
fi

echo
echo "PAYMYDINE_APPLIANCE_INSTALL=OK"
echo "POS_USER=paymydine"
echo "DEVICE_MODE=ubuntu-lightdm-openbox"
echo "DEVELOPER_EXIT_PASSWORD=password"
echo "RECOVERY_COMMAND=sudo paymydine-disable-appliance"
echo
echo "Reboot when ready: sudo reboot"
