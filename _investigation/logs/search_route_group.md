`grep -r "Route::group" .`

<file_content>
app/admin/routes.php
17:    Route::group([
364:Route::group([
380:Route::group([
928:    Route::group([
937:    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
1067:    // Place AFTER the closing brace of the large Route::group([...]) in this file.
1068:    Route::group(['prefix' => 'admin/notifications-api'], function () {

routes.php
16:    Route::group([
361:Route::group([
376:Route::group([

CHANGES_APPLIED_DIFF.md
13:Route::group([
22:Route::group([
37:Route::group([
45:Route::group([
76:// Inside Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {
247:Route::group(['middleware' => ['web']], function () {
273:Route::group([
290:Route::group(['prefix' => 'admin/notifications-api'], function () {

FINAL_TENANT_FIX_VERIFICATION.md
16:**New Location**: Inside `Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']])` group (lines 376-1043)
24:**Removed**: `Route::group(['middleware' => ['web']])` wrapper that contained duplicate waiter-call and table-notes routes
124:Route::group([

CHANGES_SUMMARY.md
29:- Route::group(['prefix' => 'admin/notifications-api'], function () {
44:- Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
45:+ Route::group(['middleware' => ['web']], function () {

TENANT_FIX_APPLIED.md
51:Route::group(['middleware' => ['web']], function () {  // WAS: ['prefix' => 'api/v1', 'middleware' => ['web']]

TENANT_BLEED_INVESTIGATION_REPORT.md
269:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
273:    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
722:Route::group([
729:    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
741:Route::group(['prefix' => 'admin/notifications-api'], function () {
853:Route::group([
862:Route::group([
878:Route::group([
886:Route::group([
926:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
931:Route::group(['middleware' => ['web']], function () {  // REMOVE duplicate prefix

artifacts/flow-traces.md
635:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
638:Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {

artifacts/executive-summary.md
207:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
210:Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {
286:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
289:Route::group(['middleware' => ['web']], function () {  // Remove duplicate prefix

artifacts/routes-matrix.md
151:**Cause**: Nested `Route::group(['prefix' => 'api/v1'])` in `routes.php:934` inside another group that already has `prefix => 'api/v1'` (line 378).
156:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
160:    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
230:    Route::group([
240:    Route::group([
250:    Route::group([
261:    Route::group([
269:    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
275:    Route::group(['prefix' => 'admin/notifications-api'], function () {
293:    Route::group([
314:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
317:Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {
326:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
330:Route::group(['middleware' => ['web']], function () {

CONN_TRACE_NOTES.md
82:Route::group([
210:Route::group([

ROUTES_MIDDLEWARE_COVERAGE.md
89:Route::group([
116:Route::group([
150:Route::group([
222:Route::group(['prefix' => 'admin/notifications-api'], function () {

ADMIN_LOGOUT_FIX_COMPLETE.md
184:Route::group([

docs/FINDINGS_Admin_Logout_Issue.md
240:Route::group([

docs/API_INVENTORY.md
1041:Route::group([

full_differences.patch
4495: Route::group([
4622:-Route::group([
4631:-Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
4767:-// Place AFTER the closing brace of the large Route::group([...]) in this file.
4768:-Route::group(['prefix' => 'admin/notifications-api'], function () {

root path route.php
14:    Route::group([
87:Route::group([
102:Route::group([

app/main/routes.php
64:    Route::group([
71:        Route::group(['prefix' => 'api'], function () {

vendor/facade/ignition/src/IgnitionServiceProvider.php
183:        Route::group([

app/admin/old_routes.php
14:    Route::group([
87:Route::group([

app.main.routes.php  
10:    Route::group([
17:        Route::group(['prefix' => 'api'], function () {
