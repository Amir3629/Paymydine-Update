# PayMyDine Staff Android 0.2.0 — release readiness (22 October 2026)

This document is a product/engineering checklist, **not legal advice or a published Privacy Policy**. The 0.2.0 APK from Actions is a debug preview for onsite QA, not a Google Play upload.

## What this change implements

- Independent application package: release `com.paymydine.staff`, debug `com.paymydine.staff.debug`, distinct from PayMyDine POS/Device.
- Branded launcher icon built with **exact paths from** `app/admin/assets/images/pmd-brand-mark.svg` and a small clock hand badge. No temporary generic checklist icon.
- No permanent extra native header when signed in; the authenticated web app owns its own navigation. Restaurant-switch control lives in Staff Profile for the dedicated app.
- Initial restaurant **code** only (e.g. `tomo`), securely resolved to `https://tomo.paymydine.com`. A complete HTTPS tenant hostname remains accepted for backwards compatibility.
- First-run, localized (Android device language) privacy/location explanation and mandatory **acknowledgment of reading** before continuing to login. This is not a claim that employee consent is the lawful GDPR basis.
- GPS permission is requested for a **single foreground** Start/Finish action. Never request background location. No location polling outside an explicit clock action.
- Staff Portal default tab is **My shifts**. Only one active staff workspace area at a time across phones, tablets and desktops.
- The duplicated top profile shortcut is replaced with a language picker. Staff Profile is accessible in the tab navigation.
- Staff language options are derived from the active restaurant's country row: Germany **Deutsch / English**, Türkiye **Türkçe / English**, otherwise English. One existing `pmd_admin_locale` cookie per tenant host remembers preference. Server-provided business data and user-generated chat are never machine-translated as UI text. Additional terminology and accessibility review with fluent employees remains necessary.
- Attendance API now preserves **clock-only failures** in `session('pmd_staff_clock_error')` and renders an accessible, dismissible notice at the Start/Finish card; no clock constraints are bypassed.
- The already built unscheduled attendance support is retained. Real `staff_attendance` facts are recorded without silently fabricating manager rota assignments.

## Privacy and employee information — MUST resolve before production distribution

1. Identify and approve the correct legal entity/controller for each restaurant and PayMyDine's role (controller/processor as applicable). Provide DPO/privacy contact, retention periods, jurisdiction, employee rights requests, sub-processors and cross-border transfer details.
2. **Publish an accurate, public, HTTPS, HTML privacy policy for PayMyDine Staff** and link it inside the APK and Play Store listing. Current in-app notice is only a short disclosure. Do not invent a privacy policy URL or legal contact in code.
3. Document precise location access for on-site Start/Finish, the nature of rounded accuracy/distance evidence stored, recipients and retention. Assess necessity/proportionality and workplace policies or works-council requirements in each country.
4. Confirm a lawful basis other than a coerced employee consent where appropriate. A checkbox acknowledging a notice **does not** constitute an employment-data-processing consent. Keep any genuinely optional consents separately revocable. Provide a non-GPS correction procedure if law/workplace policy requires it.
5. Fill the **Google Play Data Safety** questionnaire consistently with actual login, messaging, requests, attendance and location flows. Publish a reachable account/data deletion request process where required. Audit third-party SDKs and web endpoints.
6. Get human-reviewed EN/DE/TR legal copy and policy terms, including login, Onboarding, in-app Staff Portal and accessibility. Do not claim a full translation audit based only on curated UI labels.

## Google Play technical release — MUST resolve before submitting

1. App targets Android 16 / API 36 as required for submissions after 31 August 2026; keep `targetSdk=36` or newer.
2. Create a **release-signing keystore** and store credentials only in protected CI secrets, not GitHub. Configure release signing and produce a signed **Android App Bundle (.aab)** under `com.paymydine.staff`; **never upload the debug-signed** `com.paymydine.staff.debug` APK.
3. Configure app integrity/Play App Signing, Play Console developer identity, listing, privacy policy URL, Data Safety, content declaration, store imagery, release notes and testing track.
4. Test on at least two physical Android devices with the actual restaurant tenant, MFA and staff roles: login, switching workplaces, EN↔DE or EN↔TR, poor GPS, denied location, valid Start/Finish, no planned rota assignment, duplicate tap, stale fix, out-of-range fix, offline error and manager review. Audit tenant separation and retention.
5. Perform a keyboard/TalkBack/responsiveness and native icon screenshot review before publication.
6. The APK link in restaurant Settings is **for internal preview distribution**. Switch it to an approved release artifact and a stable signing key for production updates only after legal and app-store readiness.

## Official references checked October 2026

- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Google Play location permissions policy: https://support.google.com/googleplay/android-developer/answer/16558241
- Android target SDK: https://developer.android.com/google/play/requirements/target-sdk
- Play new app bundle format: https://support.google.com/googleplay/android-developer/answer/2481797
- EDPB consent at work: https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf
