{{-- PMD_SHIFTS_STAFF_CENTER_PANEL_V1_20261021: Owner/Manager-only, rendered by authorized endpoint. --}}
@php
    $center = $pmdStaffOperations ?? [];
    $active = collect($center['active'] ?? []);
    $recent = collect($center['recent'] ?? []);
    $requests = collect($center['requests'] ?? []);
    $messages = collect($center['messages'] ?? []);
    $events = collect($center['events'] ?? []);
    $site = $center['site'] ?? [];
    $group = $center['team_group'] ?? null;
@endphp
<div class="pmd-staff-ops__intro">
    <div>
        <span class="pmd-staff-ops__eyebrow">WORKFORCE · LIVE</span>
        <h2 id="pmd-staff-ops-title">Staff operations</h2>
        <p>Attendance, requests and restaurant-wide team messages in one place.</p>
    </div>
    <div class="pmd-staff-ops__status">{{ $center['generated_at'] ?? '' }}</div>
</div>
<div class="pmd-staff-ops__kpis">
    <div><small>Working now</small><strong>{{ $active->count() }}</strong><span>Open time-clock records</span></div>
    <div><small>Needs review</small><strong>{{ $requests->count() }}</strong><span>Pending team requests</span></div>
    <div><small>Location check</small>
        <strong class="pmd-staff-ops__status-text">{{ !empty($site['configured']) ? 'Ready' : 'Setup' }}</strong>
        <span>{{ !empty($site['configured']) ? 'Within '.(int)($site['radius_m'] ?? 150).' m of restaurant' : 'Set the restaurant GPS pin' }}</span>
    </div>
</div>
<nav class="pmd-staff-ops__tabs" aria-label="Staff management sections">
    <button type="button" data-pmd-staff-ops-tab="presence" aria-selected="true">Presence</button>
    <button type="button" data-pmd-staff-ops-tab="requests" aria-selected="false">Requests <span>{{ $requests->count() }}</span></button>
    <button type="button" data-pmd-staff-ops-tab="chat" aria-selected="false">Team chat</button>
    <button type="button" data-pmd-staff-ops-tab="activity" aria-selected="false">Activity</button>
</nav>
<section class="pmd-staff-ops__section" data-pmd-staff-ops-section="presence">
    <h3>Currently on shift</h3>
    @forelse($active as $person)
        <div class="pmd-staff-ops__entry">
            <span class="pmd-staff-ops__online" aria-label="Working"></span>
            <div><strong>{{ $person->staff_name ?: 'Staff #'.(int)$person->staff_id }}</strong>
                <small>Started {{ $person->check_in_time ? \Carbon\Carbon::parse($person->check_in_time)->format('H:i') : '—' }}</small>
                @php $activeMeta = json_decode((string)($person->metadata ?? ''), true); @endphp
                @if(is_array($activeMeta) && ($activeMeta['schedule_status'] ?? '') === 'unscheduled')
                    <small class="pmd-staff-ops__unscheduled">Unscheduled work · actual time clocked</small>
                @endif
                @if(is_array($activeMeta) && is_array($activeMeta['staff_portal_breaks'] ?? null))
                    @foreach($activeMeta['staff_portal_breaks'] as $breakEvent)
                        @if(!empty($breakEvent['start_at']) && empty($breakEvent['end_at']))
                            <small>On break · attendance session remains open</small>
                            @break
                        @endif
                    @endforeach
                @endif
            </div>
        </div>
    @empty
        <p class="pmd-staff-ops__empty">No one has an open time-clock record here.</p>
    @endforelse
    <div class="pmd-staff-ops__geo-note">
        <strong>Workplace location</strong>
        <p>Shift starts and finishes require a fresh, precise GPS check near the saved restaurant pin. Employee coordinates are not stored; the attendance audit keeps rounded distance and accuracy only.</p>
        @unless(!empty($site['configured']))
            <a href="{{ admin_url('settings/restaurant') }}">Configure location in Restaurant Profile →</a>
        @endunless
    </div>
</section>
<section class="pmd-staff-ops__section" data-pmd-staff-ops-section="requests" hidden>
    <h3>Pending requests</h3>
    @forelse($requests as $requestRow)
        <article class="pmd-staff-ops__request">
            <div><strong>{{ $requestRow->person_name ?: 'Team member' }}</strong>
                <small>{{ str_replace('_',' ',ucfirst((string)$requestRow->request_type)) }} · {{ optional($requestRow->created_at ? \Carbon\Carbon::parse($requestRow->created_at) : null)->format('d M H:i') }}</small>
                @if($requestRow->message)<p>{{ $requestRow->message }}</p>@endif
                @if($requestRow->date_from)<small>{{ $requestRow->date_from }}{{ $requestRow->date_to && $requestRow->date_to != $requestRow->date_from ? ' → '.$requestRow->date_to : '' }}</small>@endif
            </div>
            <div class="pmd-staff-ops__request-actions">
                <form method="post" action="{{ admin_url('shifts/handlerequest') }}">
                    @csrf
                    <input type="hidden" name="id" value="{{ (int)$requestRow->id }}">
                    <input type="hidden" name="decision" value="approved">
                    <button type="submit" class="is-approve">Approve</button>
                </form>
                <form method="post" action="{{ admin_url('shifts/handlerequest') }}">
                    @csrf
                    <input type="hidden" name="id" value="{{ (int)$requestRow->id }}">
                    <input type="hidden" name="decision" value="declined">
                    <button type="submit" class="is-decline">Decline</button>
                </form>
            </div>
        </article>
    @empty
        <p class="pmd-staff-ops__empty">No requests need review.</p>
    @endforelse
</section>
<section class="pmd-staff-ops__section" data-pmd-staff-ops-section="chat" hidden>
    <h3>Restaurant team chat</h3>
    <p class="pmd-staff-ops__note">Only the shared Team channel is shown. Private groups remain visible only to their members.</p>
    <div class="pmd-staff-ops__chat-log" aria-label="Recent team messages">
        @forelse($messages as $msg)
            <div class="pmd-staff-ops__message">
                <strong>{{ $msg->staff_name ?: 'Team member' }}</strong>
                <p>{{ $msg->message }}</p>
                <small>{{ $msg->created_at ? \Carbon\Carbon::parse($msg->created_at)->format('d M · H:i') : '' }}</small>
            </div>
        @empty
            <p class="pmd-staff-ops__empty">No Team messages yet.</p>
        @endforelse
    </div>
    @if($group && !empty($center['can_send']))
        <form method="post" class="pmd-staff-ops__composer" action="{{ admin_url('shifts/sendteammessage') }}">
            @csrf
            <input type="hidden" name="group_id" value="{{ (int)$group->id }}">
            <label for="pmd-staff-ops-message">Message your team</label>
            <textarea id="pmd-staff-ops-message" name="message" required maxlength="1500" rows="3" placeholder="Write a team update…"></textarea>
            <button type="submit">Send to Team</button>
        </form>
    @elseif(!$group)
        <p class="pmd-staff-ops__note">Team chat becomes available when your restaurant's Staff Portal initializes its Team channel.</p>
    @else
        <p class="pmd-staff-ops__note">Connect this Manager/Owner login to a staff profile to send a message.</p>
    @endif
</section>
<section class="pmd-staff-ops__section" data-pmd-staff-ops-section="activity" hidden>
    <h3>Recent clock activity</h3>
    @forelse($recent as $row)
        <div class="pmd-staff-ops__entry">
            <span class="pmd-staff-ops__event-dot"></span>
            <div><strong>{{ $row->staff_name ?: 'Staff #'.(int)$row->staff_id }}</strong>
                <small>In: {{ $row->check_in_time ? \Carbon\Carbon::parse($row->check_in_time)->format('d M H:i') : '—' }}
                    · Out: {{ $row->check_out_time ? \Carbon\Carbon::parse($row->check_out_time)->format('d M H:i') : 'Working' }}</small>
                @php $geoEvidence = json_decode((string)($row->metadata ?? ''), true); @endphp
                @if(is_array($geoEvidence) && ($geoEvidence['schedule_status'] ?? '') === 'unscheduled')
                    <small class="pmd-staff-ops__unscheduled">Unscheduled work · not assigned on the rota</small>
                @endif
                @if(is_array($geoEvidence) && $row->check_out_time)
                    @if(isset($geoEvidence['staff_portal_break_minutes']))
                        <small>Break: {{ number_format((float)$geoEvidence['staff_portal_break_minutes'], 0) }} min
                            · {{ ($geoEvidence['staff_portal_break_report'] ?? '') === 'tracked' ? 'timer recorded' :
                                    (($geoEvidence['staff_portal_break_report'] ?? '') === 'employee_reported' ? 'employee reported' : 'none reported') }}
                        </small>
                        @if(($geoEvidence['staff_portal_break_report'] ?? '') === 'not_reported')
                            <small class="pmd-staff-ops__unscheduled">Break not reported · review attendance</small>
                        @endif
                    @endif
                @endif
                @if(is_array($geoEvidence) && !empty($geoEvidence['clock_in_geo']['verified']))
                    <small>GPS check: {{ (int)($geoEvidence['clock_in_geo']['distance_m'] ?? 0) }} m from site</small>
                @endif
            </div>
        </div>
    @empty
        <p class="pmd-staff-ops__empty">No recorded attendance here yet.</p>
    @endforelse
    <h3>Schedule updates</h3>
    @forelse($events as $event)
        <div class="pmd-staff-ops__entry">
            <span class="pmd-staff-ops__event-dot"></span>
            <div><strong>{{ str_replace('_',' ',ucfirst((string)$event->event_type)) }}</strong>
                <small>{{ $event->target_name_snapshot ?: $event->actor_name_snapshot ?: 'Team schedule' }} · {{ \Carbon\Carbon::parse($event->created_at)->format('d M H:i') }}</small>
            </div>
        </div>
    @empty
        <p class="pmd-staff-ops__empty">No recent schedule edits.</p>
    @endforelse
</section>
