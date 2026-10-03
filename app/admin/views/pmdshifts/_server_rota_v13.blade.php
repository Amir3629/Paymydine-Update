@php
    // PMD_SHIFTS_SERVER_FIRST_ROTA_V13

    $pmdServerRoleMeta = static function ($person) {
        $code = strtolower(trim(
            (string)($person['access_role_code'] ?? '')
        ));

        $name = strtolower(trim(
            (string)($person['access_role_name'] ?? '')
        ));

        if (
            str_starts_with($code, 'pmd-kds:')
            || $code === 'pmd-team-member'
            || $name === 'kitchen staff'
        ) {
            return ['family' => 'kitchen', 'rank' => 10];
        }

        if ($code === 'pmd-waiter' || $name === 'waiter') {
            return ['family' => 'waiter', 'rank' => 20];
        }

        if ($code === 'pmd-cashier' || $name === 'cashier') {
            return ['family' => 'cashier', 'rank' => 30];
        }

        if (
            $code === 'pmd-reservations'
            || $name === 'reservations'
        ) {
            return ['family' => 'reservations', 'rank' => 40];
        }

        if ($code === 'pmd-manager' || $name === 'manager') {
            return ['family' => 'manager', 'rank' => 50];
        }

        if (
            $code === 'pmd-accountant'
            || $name === 'accountant'
        ) {
            return ['family' => 'accountant', 'rank' => 60];
        }

        return ['family' => 'sonstige', 'rank' => 70];
    };


    $pmdServerPeople = $bootPeople
        ->map(function ($person) use ($pmdServerRoleMeta) {
            $meta = $pmdServerRoleMeta($person);

            $person['pmd_family'] = $meta['family'];
            $person['pmd_rank'] = $meta['rank'];

            return $person;
        })
        ->sort(function ($left, $right) {
            if (
                (int)$left['pmd_rank']
                !==
                (int)$right['pmd_rank']
            ) {
                return
                    (int)$left['pmd_rank']
                    <=>
                    (int)$right['pmd_rank'];
            }

            return strcasecmp(
                (string)$left['name'],
                (string)$right['name']
            );
        })
        ->values();


    $pmdServerDate = $selectedDay->toDateString();

    // PMD_SHIFTS_MIDNIGHT_TIMELINE_V17N
    // PMD_SHIFTS_DATE_LOCALE_SERVER_V7
    // PMD_SHIFTS_DATE_LOCALE_PIN_SERVER_V8B
    // Use the same cookie authority as the global Admin i18n boot layer so
    // first paint and later JS navigation can never disagree on language.
    $pmdServerLocale = strtolower(trim((string)request()->cookie(
        'pmd_admin_locale',
        app()->getLocale()
    )));
    if (!in_array($pmdServerLocale, ['en', 'de', 'tr'], true)) {
        $pmdServerLocale = 'en';
    }

    $pmdServerDateForLabel = clone $selectedDay;
    $pmdServerDateForLabel->locale($pmdServerLocale);

    if ($pmdServerLocale === 'de') {
        $pmdServerDateLabel = $pmdServerDateForLabel->translatedFormat('l, j. F Y');
    } elseif ($pmdServerLocale === 'tr') {
        $pmdServerDateLabel = $pmdServerDateForLabel->translatedFormat('j F Y l');
    } else {
        $pmdServerDateLabel = $pmdServerDateForLabel->translatedFormat('l, F j, Y');
    }

    $pmdServerDayShifts = $bootShifts
        ->filter(
            fn($shift) =>
                (string)($shift['date'] ?? '')
                ===
                $pmdServerDate
        )
        ->values();


    $pmdServerMinutes = static function ($clock, $fallback) {
        $clock = trim((string)$clock);

        if (
            !preg_match(
                '/^([01][0-9]|2[0-3]):([0-5][0-9])$/',
                $clock,
                $match
            )
        ) {
            return $fallback;
        }

        return ((int)$match[1] * 60) + (int)$match[2];
    };


    $pmdServerInitials = static function ($name) {
        $parts = preg_split(
            '/\s+/',
            trim((string)$name),
            -1,
            PREG_SPLIT_NO_EMPTY
        );

        $letters = '';

        foreach (array_slice($parts ?: [], 0, 2) as $part) {
            $letters .= mb_strtoupper(
                mb_substr($part, 0, 1)
            );
        }

        return $letters !== '' ? $letters : 'T';
    };
@endphp



<style id="pmd-shifts-date-visible-lock-v9">
  /* PMD_SHIFTS_DATE_VISIBLE_LOCK_SERVER_V9 */
  /* PMD_SHIFTS_DATE_VISIBLE_DEDUP_V10 */
  /*
   * Legacy Admin coverage code can still assign heading.textContent after
   * Shifts has rendered. Keep that mutable text in the DOM for compatibility,
   * but make it zero-size. The only visible label is the server-pinned
   * data-pmd-fixed-date value rendered by ::after.
   */
  /* PMD_SHIFTS_DATE_VISIBLE_SPECIFICITY_V11B */
  body.pmd-shifts-page .pmd-shifts-final-date h2[data-pmd-shifts-date-label] {
    font-size:0!important;
    line-height:0!important;
    color:transparent!important;
    text-shadow:none!important;
    white-space:nowrap!important;
  }
  body.pmd-shifts-page .pmd-shifts-final-date h2[data-pmd-shifts-date-label]::after {
    content:attr(data-pmd-fixed-date)!important;
    display:inline-block!important;
    color:#102a43!important;
    font-size:20px!important;
    line-height:1.25!important;
    white-space:nowrap!important;
  }
</style>

<style id="pmd-shifts-frame-first-paint-v135">
  /*
   * PMD_SHIFT_FRAME_FIRST_PAINT_V135
   *
   * Critical geometry is embedded immediately before the server timetable so
   * the browser never paints a provisional button frame while external Shifts
   * stylesheets/fonts finish settling. Inline left/width on each shift remains
   * the horizontal authority.
   */
  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-scale-row,
  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row {
    display:grid!important;
    grid-template-columns:220px minmax(900px,1fr)!important;
    width:100%!important;
    min-width:0!important;
  }

  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row {
    min-height:72px!important;
    border-bottom:1px solid #e5edf2!important;
    animation:none!important;
    transition:none!important;
    transform:none!important;
  }

  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-person {
    min-height:72px!important;
    box-sizing:border-box!important;
  }

  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-track {
    position:relative!important;
    min-width:0!important;
    min-height:72px!important;
    box-sizing:border-box!important;
    animation:none!important;
    transition:none!important;
    transform:none!important;
  }

  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shifts {
    position:absolute!important;
    inset:9px 0!important;
    z-index:3!important;
    pointer-events:none!important;
    animation:none!important;
    transition:none!important;
    transform:none!important;
  }

  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row {
    --pmd-role-bg:#f2f4f7;
    --pmd-role-border:#a8b2bf;
    --pmd-role-accent:#6b7787;
    --pmd-role-text:#435063;
  }
  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="kitchen"] {
    --pmd-role-bg:#fff4d8;--pmd-role-border:#e1aa2f;--pmd-role-accent:#c17a00;--pmd-role-text:#654400;
  }
  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="team_member"] {
    --pmd-role-bg:#e9faf6;--pmd-role-border:#63b9a7;--pmd-role-accent:#17806c;--pmd-role-text:#17594e;
  }
  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="waiter"] {
    --pmd-role-bg:#eaf3ff;--pmd-role-border:#80afe5;--pmd-role-accent:#2f80ed;--pmd-role-text:#174d91;
  }
  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="cashier"] {
    --pmd-role-bg:#eaf9ef;--pmd-role-border:#72bd8d;--pmd-role-accent:#27864c;--pmd-role-text:#1e6239;
  }
  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="reservations"] {
    --pmd-role-bg:#f3ecff;--pmd-role-border:#aa88df;--pmd-role-accent:#7c4dcc;--pmd-role-text:#55318d;
  }
  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="manager"] {
    --pmd-role-bg:#edf0ff;--pmd-role-border:#8997dc;--pmd-role-accent:#4f5fbd;--pmd-role-text:#354080;
  }
  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="bar"] {
    --pmd-role-bg:#fff0f4;--pmd-role-border:#dc8da4;--pmd-role-accent:#b94e70;--pmd-role-text:#7f3650;
  }
  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="accountant"] {
    --pmd-role-bg:#eaf8fb;--pmd-role-border:#78bdcb;--pmd-role-accent:#26889d;--pmd-role-text:#246071;
  }
  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="sonstige"],
  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-row[data-pmd-role-family="other"] {
    --pmd-role-bg:#f2f4f7;--pmd-role-border:#a8b2bf;--pmd-role-accent:#6b7787;--pmd-role-text:#435063;
  }

  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift {
    position:absolute!important;
    top:0!important;
    bottom:0!important;
    display:grid!important;
    align-content:center!important;
    grid-template-rows:min-content min-content!important;
    row-gap:1px!important;
    min-width:24px!important;
    max-width:none!important;
    margin:0!important;
    padding:4px 10px!important;
    border:1px solid var(--pmd-role-border)!important;
    border-left:4px solid var(--pmd-role-accent)!important;
    border-radius:10px!important;
    background:var(--pmd-role-bg)!important;
    color:var(--pmd-role-text)!important;
    box-shadow:none!important;
    box-sizing:border-box!important;
    appearance:none!important;
    -webkit-appearance:none!important;
    text-align:left!important;
    overflow:hidden!important;
    pointer-events:auto!important;
    transform:none!important;
    translate:none!important;
    animation:none!important;
    transition:none!important;
    will-change:auto!important;
    font-family:"PMDShiftsRobotoStable",Arial,Helvetica,sans-serif!important;
    font-synthesis:none!important;
    font-variant-numeric:tabular-nums!important;
    font-feature-settings:"tnum" 1!important;
  }

  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift.is-confirmed {
    border-color:var(--pmd-role-border)!important;
    border-left-color:var(--pmd-role-accent)!important;
    background:var(--pmd-role-bg)!important;
    color:var(--pmd-role-text)!important;
    box-shadow:inset 0 0 0 1px rgba(23,128,108,.22)!important;
  }

  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift.is-absent {
    border-color:#e0a0a0!important;
    border-left-color:#d34b4b!important;
    background:#fff1f1!important;
    color:#8b2929!important;
    box-shadow:none!important;
  }

  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift > strong {
    display:block!important;
    margin:0!important;
    font-size:12px!important;
    font-weight:900!important;
    line-height:1.1!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    white-space:nowrap!important;
  }

  html body.pmd-shifts-page #pmd-shifts .pmd-shifts-final-shift > span {
    display:block!important;
    margin:0!important;
    font-size:10px!important;
    font-weight:750!important;
    line-height:1.1!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    white-space:nowrap!important;
  }
</style>
<div
    class="pmd-shifts-final-screen"
    data-pmd-shifts-server-initial
    data-date="{{ $pmdServerDate }}"
    data-pmd-locale="{{ $pmdServerLocale }}"
    data-pmd-date-locale-authority="v8b"
>

    <header class="pmd-shifts-final-toolbar">

        <div class="pmd-shifts-final-date">

            <button
                type="button"
                class="pmd-shifts-final-nav"
                data-pmd-shifts-prev-day
                aria-label="Previous day"
            >‹</button>

            <div>
                <h2
                    data-pmd-no-translate
                    lang="{{ $pmdServerLocale }}"
                
                    data-pmd-i18n-skip
                
                    data-pmd-shifts-date-label
                
                    data-pmd-fixed-date="{{ $pmdServerDateLabel }}"
                    aria-label="{{ $pmdServerDateLabel }}"
                ></h2>
            </div>

            <button
                type="button"
                class="pmd-shifts-final-nav"
                data-pmd-shifts-next-day
                aria-label="Next day"
            >›</button>

        </div>


        <div class="pmd-shifts-final-actions">

            @if(!$selectedDay->isToday())
                <button
                    type="button"
                    class="pmd-shifts-final-soft"
                    data-pmd-shifts-today
                >Today</button>
            @endif

            <button
                type="button"
                class="pmd-shifts-final-member-add"
                data-pmd-team-open
            >+ Member</button>

            <label
                class="pmd-shifts-date-picker"
                title="Choose date"
            >
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="16"
                        rx="2"
                    ></rect>

                    <path
                        d="M8 3v4M16 3v4M3 10h18"
                    ></path>
                </svg>

                <input
                    type="date"
                    data-pmd-shifts-date-input
                    value="{{ $pmdServerDate }}"
                    aria-label="Choose date"
                >
            </label>

        </div>

    </header>


    @if($pmdServerPeople->isEmpty())

        <div class="pmd-shifts-final-empty">
            <strong>No team members yet</strong>

            <button
                type="button"
                data-pmd-team-open
            >+ Member</button>
        </div>

    @else

        <div class="pmd-shifts-final-scroll">
            <div class="pmd-shifts-final-board">

                <div class="pmd-shifts-final-scale-row">

                    <div class="pmd-shifts-final-scale-person">
                        Team
                    </div>

                    <div class="pmd-shifts-final-scale">

                        @for(
                            $tick = 0;
                            $tick <= 1440;
                            $tick += 120
                        )
                            <span>
                                {{
                                    $tick === 1440
                                        ? '24:00'
                                        : sprintf(
                                            '%02d:%02d',
                                            intdiv($tick, 60) % 24,
                                            $tick % 60
                                        )
                                }}
                            </span>
                        @endfor

                    </div>

                </div>


                @foreach($pmdServerPeople as $person)

                    @php
                        $personId = (int)$person['id'];

                        $personShifts =
                            $pmdServerDayShifts
                                ->filter(
                                    function ($shift)
                                    use ($personId) {
                                        return collect(
                                            $shift['people'] ?? []
                                        )->contains(
                                            fn($assigned) =>
                                                (int)(
                                                    $assigned[
                                                        'person_id'
                                                    ] ?? 0
                                                )
                                                ===
                                                $personId
                                        );
                                    }
                                )
                                ->values();

                        // PMD_SHIFT_ATTENDANCE_FIRST_PAINT_V134
                        // Render the same badge that the live endpoint would
                        // otherwise add after load, preserving row height.
                        $pmdLiveRowV134 = is_array(
                            $liveAttendanceRows[(string)$personId]
                            ?? null
                        )
                            ? $liveAttendanceRows[(string)$personId]
                            : [];

                        $pmdLiveStateV134 = preg_replace(
                            '/[^a-z_]/',
                            '',
                            strtolower(
                                trim(
                                    (string)(
                                        $pmdLiveRowV134['state']
                                        ?? 'off'
                                    )
                                )
                            )
                        ) ?: 'off';

                        $pmdLiveLabelV134 = trim(
                            (string)(
                                $pmdLiveRowV134['label']
                                ?? ''
                            )
                        );
                    @endphp


                    <div
                        class="pmd-shifts-final-row"
                        data-person-id="{{ $personId }}"
                        data-pmd-role-family="{{ $person['pmd_family'] }}"
                        data-pmd-role-rank="{{ (int)$person['pmd_rank'] }}"
                    >

                        <div class="pmd-shifts-final-person">

                            <span class="pmd-shifts-final-avatar">
                                {{
                                    $pmdServerInitials(
                                        $person['name']
                                    )
                                }}
                            </span>


                            <span class="pmd-shifts-final-person-copy">

                                <button
                                    type="button"
                                    data-pmd-team-edit
                                    data-person-id="{{ $personId }}"
                                    data-name="{{ $person['name'] }}"
                                    data-role="{{ $person['role'] ?? '' }}"
                                    data-has-access="{{ !empty($person['has_access']) ? '1' : '0' }}"
                                    data-username="{{ $person['username'] ?? '' }}"
                                    data-staff-role-id="{{ $person['staff_role_id'] ?? '' }}"
                                    data-has-quick-pin="{{ !empty($person['has_quick_pin']) ? '1' : '0' }}"
                                    data-access-role-code="{{ $person['access_role_code'] ?? '' }}"
                                >
                                    {{ $person['name'] }}
                                </button>

                                <small>
                                    {{ $person['role'] ?? 'Team' }}
                                </small>

                                @if(
                                    $pmdLiveLabelV134 !== ''
                                    && $pmdLiveStateV134 !== 'off'
                                )
                                    <span
                                        class="pmd-shifts-live-state is-{{ $pmdLiveStateV134 }}"
                                        data-pmd-shifts-live-state
                                        data-pmd-shifts-live-state-code="{{ $pmdLiveStateV134 }}"
                                    >{{ $pmdLiveLabelV134 }}</span>
                                @endif

                            </span>

                        </div>


                        <div class="pmd-shifts-final-track">

                            {{-- PMD_SHIFTS_SERVER_HOURLY_QUICK_CREATE_V17 --}}
                            <div class="pmd-shifts-final-slots">

                                @for(
                                    $slot = 0;
                                    $slot < 1440;
                                    $slot += 60
                                )

                                    @php
                                        $slotLabel = sprintf(
                                            '%02d:%02d',
                                            intdiv($slot, 60) % 24,
                                            $slot % 60
                                        );
                                    @endphp

                                    <button
                                        type="button"
                                        class="pmd-shifts-final-slot"
                                        data-pmd-person-slot-create
                                        data-person-id="{{ $personId }}"
                                        data-date="{{ $pmdServerDate }}"
                                        data-time="{{ $slotLabel }}"
                                        aria-label="Add {{ $person['name'] }} at {{ $slotLabel }}"
                                    ><span>+</span></button>

                                @endfor

                            </div>


                            <div class="pmd-shifts-final-shifts">

                                @foreach($personShifts as $shift)

                                    @php
                                        $start = $pmdServerMinutes(
                                            $shift['start'] ?? '',
                                            360
                                        );

                                        $end = $pmdServerMinutes(
                                            $shift['end'] ?? '',
                                            min(
                                                1440,
                                                $start + 480
                                            )
                                        );

                                        if ($end <= $start) {
                                            $end += 1440;
                                        }

                                        $drawStart = max(
                                            0,
                                            $start
                                        );

                                        $drawEnd = min(
                                            1440,
                                            $end
                                        );

                                        if (
                                            $drawEnd
                                            <=
                                            $drawStart
                                        ) {
                                            $drawEnd = min(
                                                1440,
                                                $drawStart + 30
                                            );
                                        }

                                        $left = (
                                            $drawStart
                                            /
                                            1440
                                        ) * 100;

                                        $width = (
                                            ($drawEnd - $drawStart)
                                            /
                                            1440
                                        ) * 100;


                                        $assignment =
                                            collect(
                                                $shift['people'] ?? []
                                            )->first(
                                                fn($assigned) =>
                                                    (int)(
                                                        $assigned[
                                                            'person_id'
                                                        ] ?? 0
                                                    )
                                                    ===
                                                    $personId
                                            );


                                        $state = strtolower(
                                            (string)(
                                                $assignment[
                                                    'attendance'
                                                ] ?? 'planned'
                                            )
                                        );


                                        $time = trim(
                                            (string)(
                                                $shift['start']
                                                ?? ''
                                            )
                                        );

                                        if ($time === '') {
                                            $time = 'All day';
                                        }

                                        if (
                                            !empty(
                                                $shift['end']
                                            )
                                        ) {
                                            $time .=
                                                '–'
                                                .
                                                (string)$shift[
                                                    'end'
                                                ];
                                        }


                                        $shiftClass =
                                            'pmd-shifts-final-shift';

                                        if (
                                            !empty(
                                                $shift['confirmed']
                                            )
                                        ) {
                                            $shiftClass .=
                                                ' is-confirmed';
                                        }

                                        if (
                                            $state === 'absent'
                                        ) {
                                            $shiftClass .=
                                                ' is-absent';
                                        }
                                    @endphp


                                    <button
                                        type="button"
                                        class="{{ $shiftClass }}"
                                        data-pmd-shift-manage="{{ (int)$shift['id'] }}"
                                        
                                    {{-- PMD_SHIFT_BAR_FIRST_PAINT_PRIORITY_FINAL --}}
                                    style="left:{{ number_format($left,4,'.','') }}% !important;width:{{ number_format($width,4,'.','') }}% !important;max-width:none !important;min-width:24px !important;box-sizing:border-box !important"
                                        title="{{ ($shift['label'] ?? 'Shift').' · '.$time.' · click to edit' }}"
                                    >
                                        <strong>{{ $time }}</strong>

                                        <span>
                                            {{ $shift['label'] ?? 'Shift' }}
                                        </span>
                                    </button>

                                @endforeach

                            </div>

                        </div>

                    </div>

                @endforeach

            </div>
        </div>

    @endif

</div>
