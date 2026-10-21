# PayMyDine Staff Android V1

Staff APK is separate from PayMyDine Device POS. No existing POS identity, permissions or device pairing is altered.

## Integration
- Android module: mobile/android/staff, application ID com.paymydine.staff.
- Existing device module: mobile/android/app, application ID com.paymydine.mobile.
- Staff login and personal portal: /admin/login?destination=staff and /admin/mywork.
- Attendance: /admin/mywork/clockin and /admin/mywork/clockout, existing staff_attendance server-time authority.
- Owner and Manager controls: /admin/shifts, Staff activity drawer (presence, requests, Team chat, schedule and clock history).
- Restaurant pin: locations.location_lat and locations.location_lng, edited in Restaurant Profile.

## Setup
Configure the restaurant coordinates and existing enhanced staff_attendance metadata column before enabling GPS punches. Every Start/Finish submission needs a new high-accuracy fix <= 90 meters, <= 90 seconds old and within 150 meters plus 25 meters building-edge tolerance. Failed checks refuse the clock change. The backend is tenant scoped and independent of Android device code. Database credentials and owner login are never embedded in the APK.

## Build
Requirements: Android SDK 36, JDK 17, Gradle 8.13.
From mobile/android run: gradle --no-daemon :staff:assembleDebug
Output: mobile/android/staff/build/outputs/apk/debug/staff-debug.apk
GitHub Actions workflow PayMyDine Staff Android (separate APK) publishes a standalone debug artifact; it does not sign or publish a release APK.

## Testing before production rollout
Test a real restaurant tenant plus two phones, same role login and MFA, GPS permission denied, stale GPS, poor accuracy, out of radius, in radius, duplicate taps, logout, network loss and exact admin Staff activity request decisions. Staff member cannot view Owner Shifts. An Owner does not require the Android Staff app.

## Privacy and limitations
No ACCESS_BACKGROUND_LOCATION, GPS polling or raw employee coordinate history. Permission is requested upon clock action only, with rounded distance and accuracy stored for verification audit. Device GPS may be spoofed; this is location evidence, not conclusive proof of presence. Plan a manual correction path and legal/privacy assessment before enforcing attendance. Private chat groups remain private; management sees the shared Team channel only. The webview is HTTPS only and honors certificate errors. Existing staff portal chat and requests remain canonical.
