#!/usr/bin/env node
/* PMD_RESTAURANT_CALENDAR_CONTRACT_R1
   Fast static + parse smoke tests before tenant/user browser QA. */
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}
const targets=[
'app/admin/assets/js/pmd-settings-service-calendar-r1.js',
'app/admin/assets/js/pmd-settings-restaurant-v1.js',
'app/admin/assets/js/pmd-reservation-composer-v1.js',
'app/admin/assets/js/pmd-reservations-schedule-v1.js',
'app/admin/assets/js/pmd-reservations-lab-schedule-v1.js',
'app/admin/assets/js/pmd-quick-reservations-v1.js',
'public/assets/pmd/public-booking-v1.js'
];
targets.forEach(p=>{new Function(read(p));});
const settings=read('app/admin/views/pmdsettings/restaurant.blade.php');
const b=read('resources/views/pmd/public-booking.blade.php');
const ctrl=read('app/Http/Controllers/PmdPublicBookingController.php');
const php=read('app/admin/controllers/Pmdsettings.php');
const policy=read('app/Services/Reservations/PmdRestaurantServiceCalendarR1.php');
for(const term of ['[windows][','schedule[advance_days]','schedule[closed_dates_json]','data-pmd-service-days'])
  if(!settings.includes(term))throw Error('missing settings calendar control '+term);
if(!b.includes("'closedDates' =>")||!ctrl.includes('windowsForDate(')||
 !ctrl.includes('advanceDays(')||!ctrl.includes('restaurantCalendar()->allows('))
  throw Error('guest booking enforcement incomplete');
if(!php.includes('validateSubmission($hours, $calendarInput)')||
 !php.includes('$calendarService->save($locationId, $calendarPolicy)'))
  throw Error('profile schedule persistence missing');
if(!policy.includes('location_options')||!policy.includes('working_hours'))
  throw Error('legacy compatible storage missing');
console.log('PASS: restaurant calendar frontend syntax and core-server integration contracts');
