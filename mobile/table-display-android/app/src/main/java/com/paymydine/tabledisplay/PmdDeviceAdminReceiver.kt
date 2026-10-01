package com.paymydine.tabledisplay

import android.app.admin.DeviceAdminReceiver

/**
 * Device-owner receiver for restaurant-owned dedicated hardware.
 *
 * Normal APK installs continue to work in immersive mode. When a distributor
 * or installer provisions this package as Android Device Owner, the same app
 * can additionally use Lock Task and managed reboot without exposing the
 * Android launcher to restaurant staff or guests.
 */
class PmdDeviceAdminReceiver : DeviceAdminReceiver()
