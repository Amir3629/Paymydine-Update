# PayMyDine Linux Appliance V1.5.0

## Purpose

This is the first supported Linux appliance path for existing x86_64 POS hardware. It does **not** replace the PayMyDine cloud authority and it does **not** repartition disks automatically.

For evaluation on an existing Windows POS, keep Windows and install Ubuntu 24.04 LTS alongside it (dual boot). For dedicated hardware sold as a PayMyDine appliance, a later certified image may use the full disk after hardware validation.

## Supported base

- Ubuntu 24.04 LTS amd64/x86_64
- UEFI recommended
- Internet required for initial package/appliance installation
- CUPS-compatible receipt printer

## Safe dual-boot evaluation

1. Back up the Windows PC.
2. In Windows Disk Management, shrink the Windows partition and leave unallocated space for Ubuntu. Do not delete the Windows EFI or recovery partitions.
3. Create an Ubuntu 24.04 LTS installer USB using the official Ubuntu ISO and a trusted USB imaging tool.
4. Boot the USB in UEFI mode.
5. Choose the Ubuntu install option that keeps Windows / installs alongside it when offered. If manual partitioning is required, stop unless the operator understands the existing EFI/Windows partition layout.
6. Create a normal administrator account for PayMyDine support/development during Ubuntu setup. The appliance installer later creates a separate restricted `paymydine` account for restaurant staff.
7. Boot Ubuntu and install all OS updates.

## Install PayMyDine

Download these V1.5.0 release assets into the same directory:

- `PayMyDine-Desktop-1.5.0-linux-amd64.deb` (exact architecture suffix is release-generated)
- `PayMyDine-Appliance-Kit-1.5.0.tar.gz`

Then:

```bash
mkdir -p ~/PayMyDine-Appliance
cd ~/PayMyDine-Appliance
tar -xzf ~/Downloads/PayMyDine-Appliance-Kit-1.5.0.tar.gz
chmod +x *.sh
sudo ./install-appliance.sh ~/Downloads/PayMyDine-Desktop-1.5.0-linux-amd64.deb
sudo reboot
```

If the generated DEB uses `x86_64` rather than `amd64` in its file name, pass that exact file path instead.

## Boot behavior

After appliance installation and reboot:

1. LightDM automatically signs in the restricted `paymydine` account.
2. The `paymydine-kiosk` session starts Openbox with no normal desktop menu/panel.
3. PayMyDine starts full-screen and reconnects to the configured tenant Platform.
4. If PayMyDine exits unexpectedly, the session restarts it.
5. TTY2-TTY6 and OS sleep/hibernate targets are disabled in appliance mode.

## Developer exit

A small `DEV` button appears in PayMyDine when `/etc/paymydine/appliance-mode.json` enables appliance mode.

Current preview password: `password`.

After successful unlock:

- PayMyDine exits intentionally.
- The kiosk wrapper consumes a one-time marker.
- Openbox is stopped.
- XFCE starts for local developer/support work.
- Appliance mode remains configured.
- Reboot returns to the PayMyDine-only kiosk session.

The shared preview password must become a per-device support credential before broad production rollout.

## Recovery

From an administrator shell:

```bash
sudo paymydine-disable-appliance
sudo reboot
```

This disables automatic kiosk behavior but does not delete the PayMyDine app, printers, the POS account, or existing administrator accounts.

## Printers and cash drawer

Linux V1.5 uses CUPS:

- printer discovery: `lpstat`
- raw receipt/drawer output: `lp -o raw`

The appliance installer enables CUPS and adds the restricted `paymydine` user to `lp` and `lpadmin` groups.

## Offline boundary

The Desktop cache/snapshot behavior remains available. Financial/payment settlement and order writes are not reported as successful without verified server connectivity. Durable offline order replay still requires the server-side idempotent command contract before it can be enabled safely.
