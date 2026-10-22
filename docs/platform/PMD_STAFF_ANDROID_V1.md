# PayMyDine Staff Android V1

Staff APK is separate from PayMyDine Device POS. No existing POS identity, permissions or device pairing is altered.

## Integration
- Android module: mobile/android/staff, application ID com.paymydine.staff.
- Existing device module: mobile/android/app, application ID com.paymydine.mobile.
- Staff login and personal portal: /admin/login?destination=staff and /admin/mywork.
- Attendance: /admin/mywork/clockin and /admin/mywork/clockout, existing staff_attendance server-time authority.
- Owner and Manager controls: /admin/shifts, Staff activity drawer (presence, requests, Team chat, schedule and clock history).
- Restaurant pin: locations.location_lat and locations.location_lng, edited in Restaurant Profile > Staff attendance location. Two validated coordinates save atomically to the selected location, while old tabs cannot clear the pin. An explicit owner checkbox can remove the pin, disabling mobile clocking.

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


## October 21 reliability update

- PMD_STAFF_WORKFORCE_DAILY_RELIABILITY_V2_20261021: Staff operations reloads on every opening and after an Owner/Manager request decision or shared Team message; it retains the selected tab and does not grant staff access to the Owner controls.
- The standalone Android WebView keeps restaurant authentication within the host chosen by the employee. External tenant links leave the Staff app instead of carrying the current WebView session.
- Use scripts/pmd-install-staff-platform-v1.sh with a pinned 40-character Git commit. It now includes the Mywork bridge and Time Clock CSS alongside the server logic and Shifts drawer.
- APK assembly is a separate GitHub Actions build. An Android project source commit is not an installed/verified release APK. Obtain the staff-debug.apk artifact after the Staff Android workflow completes successfully, and perform onsite device tests before distributing.
- Only use the Staff app for employee accounts. Managers and owners use /admin/shifts > Staff activity; Staff chats are limited to the restaurant Team channel in the management drawer.

- PMD_STAFF_RESTAURANT_GPS_PIN_V1_20261021: Owner must enter physical restaurant entrance latitude/longitude (not a staff-device reading). An unconfigured pin prevents attendance punches; clearing it intentionally disables staff clocking. The settings form stores no employee GPS fix.

## GPS PERMISSION_DENIED troubleshooting (October 21, 2026)

- The exact Staff Time Clock message `Permission denied. Enable precise location to clock in or out.` comes from browser `navigator.geolocation` error code 1. The form does **not** POST to `/admin/mywork/clockin` or `clockout` when this error occurs; absence of a Laravel clock-in log is therefore expected.
- For the separate Android Staff app, check Android **Settings > Apps > PayMyDine Staff > Permissions > Location**. Select **Allow only while using the app** and enable **Use precise location** (Android 12+). Also enable device Location and retry from the staff screen. The app never needs background location.
- For Chrome/Safari, allow Location for the *exact restaurant origin* in browser site permissions. Test the same Staff Portal URL in the device browser: if browser works but the app fails, check the Android WebView/app permission; if both fail, check OS/browser permission or a geolocation Permissions-Policy restriction.
- In browser DevTools, check that `window.isSecureContext` is true and inspect the error code. Do not copy employee latitude/longitude, access tokens, session cookies or restaurant credentials into support logs.
- In web-server access logs, check for a `POST /admin/mywork/clockin` or `clockout`. A geolocation error code 1 normally produces no such POST, so troubleshoot the client before modifying staff roles, geofence radius or attendance tables.
- The guidance-only change `PMD_STAFF_CLOCK_GPS_PERMISSION_GUIDANCE_V2_20261021` also wraps long error messages on mobile. It does not auto-grant geolocation, bypass restaurant distance checks or modify attendance records.

## Native one-shot GPS bridge (October 22, 2026)

**Why:** Android's OS location approval and Android WebView's per-origin geolocation decision are separate. The original Staff clock used the latter even after the user had already granted app location. A previous diagnostic double-escaped the Android WebView UA regex; that only affected the wording of the error, not permission itself.

**Change:** The dedicated **Staff APK 0.1.1** adds a PMDStaffNativeGPS/1 marker and an internal pmdstaffgeo://clock?request=opaque-id navigation intercepted by StaffActivity. Only a main-frame navigation from the selected restaurant's HTTPS admin/mywork or staff document may initiate it. On an explicit shift button tap, the Activity checks/requests precise foreground Android permission, acquires ONE fresh fix from enabled GPS/network location providers, and returns it only to the same trusted Staff document via evaluateJavascript with JSON escaping. Raw GPS never goes into the internal URL, Android logs, preferences or a background task; listeners are cancelled on success, timeout or Activity destruction.

The Staff Portal JavaScript recognizes the new marker and uses the native path, otherwise it retains normal browser/WebView geolocation for Chrome, Safari and older APKs. Both submit the unchanged CSRF-protected /admin/mywork/clockin or /clockout form. Server checks are still authoritative: staff tenant identity, configured restaurant coordinates, accuracy <=90m, fix age <=90s, and radius 150m + 25m tolerance. No owner bypass or synthetic shift.

**Deployment is two parts:** Deploy the scoped Staff Time Clock and Staff Activity files with scripts/pmd-staff-native-gps-v1-deploy.sh (asset version v5), then install the new Staff APK from PayMyDine Staff Android GitHub Actions artifact. Updating only VPS cannot add native GPS code to an installed APK. The debug APK package is com.paymydine.staff.debug, not the POS app com.paymydine.mobile. Different GitHub Actions runner debug signing keys may require uninstalling the previous debug APK; that clears the saved restaurant choice and login.

**QA:** Onsite test Start/Finish Shift, precise permission denial, disabled device Location, poor accuracy, out-of-range and duplicate taps. Verify canonical Shifts attendance, tenant isolation, and database schema before declaring production completion.

## Unscheduled shift clocking (October 22, 2026)

- PMD_STAFF_UNSCHEDULED_ATTENDANCE_V1_20261022: A staff member **does not need a rota assignment** to Start Shift / Finish Shift. The normal active staff/team login and onsite precise GPS rules still apply.
- On Start Shift, the server automatically creates a real staff_attendance record with server check-in time and an existing-metadata-only field schedule_status = "unscheduled" if no non-cancelled assignment exists for today's roster at the same restaurant. Duplicate open punches remain blocked.
- On Finish Shift, the same attendance row receives server check-out time and hours worked, even with no rota assignment. No schedule is silently created or changed; actual work and planned rota remain separate.
- In Shifts > Staff activity, Owner/Manager see an "Unscheduled work" note under both currently working employees and recent clock activity. This records attendance for review without automatically treating it as an approved planned shift or payroll adjustment.
- The Staff Portal explains this before starting and labels an active unscheduled work session; no new Android code is needed for this feature (it is server-delivered).
- The VPS installer updates only Staff clock JS/CSS, V6 controller, Staff operations service/partial/CSS (6 files), stages and validates before modifications, backs up files, and rolls back on installation failure. It does **not** merge the repository, rewrite Shifts.php, modify database schema, bypass GPS, or touch Device POS.
- Android Staff debug package is com.paymydine.staff.debug, app display label "PayMyDine Staff"; independent from com.paymydine.mobile. Download the newly built APK artifact and install it manually on staff phones: server deployment never updates an installed APK. Debug packages are for device QA, not a long-lived production signing/distribution channel.
