<?php

namespace App\Services\AI;

/**
 * Keeps workforce tool evidence small, explicit and hard to misread by the
 * model. For named worked-hour questions, the server owns the final factual
 * reply so provider wording can never contradict PMD attendance state or send
 * an operator to an unrelated external system.
 *
 * Internal Admin AI only. Guest AI never calls this service.
 */
final class PmdWorkforceToolFactCompactor
{
    private const MAX_GENERAL_PEOPLE = 18;
    private const MAX_HOURS_PEOPLE = 60;
    private const MAX_AUDIT_EVENTS = 30;

    public function compact(array $output, string $question): array
    {
        if (empty($output['available'])) {
            return [
                'available' => false,
                'reason' => (string)($output['reason'] ?? 'Workforce data is unavailable.'),
                'range' => $output['range'] ?? null,
            ];
        }

        $currentQuestion = $this->currentQuestion($question);
        $people = array_values(array_filter(
            (array)($output['people_metrics'] ?? []),
            'is_array'
        ));
        $matched = $this->matchingPeople($people, $currentQuestion);
        $hoursQuestion = $this->isWorkedHoursQuestion($currentQuestion);

        $selected = $matched
            ?: array_slice(
                $people,
                0,
                $hoursQuestion ? self::MAX_HOURS_PEOPLE : self::MAX_GENERAL_PEOPLE
            );

        // Re-resolve the small person-hours slice directly from PMD attendance.
        // This gives the model explicit source/link/coverage state and prevents
        // a large rota payload from hiding the number the operator asked for.
        if ($hoursQuestion) {
            $range = (array)($output['range'] ?? []);
            $hoursAuthority = app(PmdWorkforcePersonHoursService::class);
            foreach ($selected as $index => $person) {
                if (!is_array($person)) continue;
                $selected[$index] = $hoursAuthority->enrich($person, $range);
            }
            $selected = array_values($selected);
        }

        $selectedIds = [];
        $selectedNames = [];
        foreach ($selected as $person) {
            $personId = (int)($person['person_id'] ?? 0);
            if ($personId > 0) $selectedIds[$personId] = true;
            $name = trim((string)($person['name'] ?? ''));
            if ($name !== '') $selectedNames[mb_strtolower($name)] = true;
        }

        $audit = (array)($output['shift_audit'] ?? []);
        $auditEvents = array_values(array_filter(
            (array)($audit['events'] ?? []),
            function ($event) use ($selectedIds, $selectedNames, $matched): bool {
                if (!is_array($event)) return false;
                if (!$matched) return true;

                $personId = (int)($event['person_id'] ?? 0);
                if ($personId > 0 && isset($selectedIds[$personId])) return true;

                $name = mb_strtolower(trim((string)($event['person_name'] ?? '')));
                return $name !== '' && isset($selectedNames[$name]);
            }
        ));

        return [
            'available' => true,
            'range' => $output['range'] ?? null,
            'historical_hours_available' => (bool)($output['historical_hours_available'] ?? false),
            'matched_named_people' => (bool)$matched,
            'people_metrics' => $selected,
            'shift_audit' => [
                'available' => (bool)($audit['available'] ?? false),
                'coverage_start' => $audit['coverage_start'] ?? null,
                'coverage_note' => $audit['coverage_note'] ?? null,
                'events' => array_slice($auditEvents, 0, self::MAX_AUDIT_EVENTS),
            ],
            'worked_hours_rule' => (string)($output['worked_hours_rule'] ?? ''),
            'attendance_fact_contract' => [
                'source' => 'PMD attendance clock-in/check-out records.',
                'rule' => 'For a person where actual_hours_authoritative=true, actual_worked_hours is the PMD attendance fact for this exact range. Use it directly.',
                'coverage_rule' => 'If attendance is linked but attendance_coverage_complete_for_range=false and attendance_rows_found>0, actual_worked_hours is only the PMD-recorded partial total from attendance_coverage_start onward. State that coverage limitation explicitly.',
                'no_rows_rule' => 'If attendance_source_available=true, attendance_identity_linked=true and attendance_rows_found=0, the attendance source exists but this person has no PMD clock-in/check-out records in the requested range. Do not call the attendance system unavailable.',
                'gap_rule' => 'If actual_hours_authoritative=false, explain the explicit PMD attendance source, identity-link, no-records or coverage gap. Do not invent actual hours and do not redirect the operator to an external payroll or staff system.',
            ],
            'source' => 'PMD internal workforce authority; compacted for authenticated Admin AI.',
        ];
    }

    /**
     * Named worked-hours are factual PMD questions, so the server owns the final
     * answer after the provider has completed its tool turn. This intentionally
     * replaces provider prose even when the provider happened to sound plausible.
     */
    public function guardAnswer(string $answer, array $workforceEvidence, string $question): string
    {
        if (!$workforceEvidence) return $answer;

        $currentQuestion = $this->currentQuestion($question);
        if (!$this->isWorkedHoursQuestion($currentQuestion)) return $answer;

        foreach (array_reverse($workforceEvidence) as $evidence) {
            if (!is_array($evidence) || empty($evidence['available'])) continue;

            $people = array_values(array_filter(
                (array)($evidence['people_metrics'] ?? []),
                'is_array'
            ));
            $matched = $this->matchingPeople($people, $currentQuestion);
            if (count($matched) !== 1) continue;

            $person = $matched[0];
            if ((bool)($person['actual_hours_authoritative'] ?? false)) {
                return $this->authoritativeHoursAnswer(
                    $person,
                    (array)($evidence['range'] ?? [])
                );
            }

            return $this->preciseGapAnswer(
                $person,
                (array)($evidence['range'] ?? [])
            );
        }

        return $answer;
    }

    /** @return array<int,array> */
    private function matchingPeople(array $people, string $question): array
    {
        $scores = [];
        foreach ($people as $index => $person) {
            if (!is_array($person)) continue;
            $name = trim((string)($person['name'] ?? ''));
            if ($name === '') continue;

            $score = $this->nameScore($name, $question);
            if ($score > 0) $scores[] = [$score, $index, $person];
        }

        if (!$scores) return [];
        usort($scores, static function (array $a, array $b): int {
            return $b[0] <=> $a[0];
        });

        $top = (int)$scores[0][0];
        return array_values(array_map(
            static fn (array $row): array => $row[2],
            array_filter($scores, static fn (array $row): bool => (int)$row[0] === $top)
        ));
    }

    private function nameScore(string $name, string $question): int
    {
        $name = preg_replace('/\s+/u', ' ', trim($name)) ?: '';
        $question = preg_replace('/\s+/u', ' ', trim($question)) ?: '';
        if ($name === '' || $question === '') return 0;

        if ($this->containsWholeToken($question, $name)) return 100 + mb_strlen($name);

        $tokens = preg_split('/\s+/u', $name, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $best = 0;
        foreach ($tokens as $token) {
            if (mb_strlen($token) < 3) continue;
            if ($this->containsWholeToken($question, $token)) {
                $best = max($best, 20 + mb_strlen($token));
            }
        }
        return $best;
    }

    private function containsWholeToken(string $haystack, string $needle): bool
    {
        $pattern = '/(?<![\p{L}\p{N}])'.preg_quote($needle, '/').'(?![\p{L}\p{N}])/iu';
        return preg_match($pattern, $haystack) === 1;
    }

    private function currentQuestion(string $question): string
    {
        $marker = "CURRENT_USER_QUESTION:\n";
        $position = strrpos($question, $marker);
        if ($position === false) return trim($question);

        $current = substr($question, $position + strlen($marker));
        $rulePosition = strpos($current, "\n\nPMD_RULE:");
        if ($rulePosition !== false) $current = substr($current, 0, $rulePosition);
        return trim($current);
    }

    private function isWorkedHoursQuestion(string $question): bool
    {
        $text = mb_strtolower($question);
        $hourNeedles = [
            'hour', 'hours', 'clocked', 'time worked',
            'stunde', 'stunden', 'arbeitszeit',
            'saat', 'mesai',
            'ساعت', 'زمان کار',
            '時間', '勤務時間',
        ];
        $workNeedles = [
            'worked', 'work this', 'work in', 'actual', 'attendance', 'ytd', 'year to date',
            'gearbeitet', 'anwesen',
            'çalış', 'devam',
            'کار', 'حضور',
            '働', '勤務', '出勤',
        ];

        return $this->containsAny($text, $hourNeedles)
            && $this->containsAny($text, $workNeedles);
    }

    private function containsAny(string $text, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && mb_stripos($text, $needle) !== false) return true;
        }
        return false;
    }

    private function authoritativeHoursAnswer(array $person, array $range): string
    {
        $name = trim((string)($person['name'] ?? 'This team member')) ?: 'This team member';
        $actual = $this->hours((float)($person['actual_worked_hours'] ?? 0));
        $scheduled = $this->hours((float)($person['scheduled_hours'] ?? 0));
        $workedDays = (int)($person['worked_days'] ?? 0);
        $sessions = (int)($person['completed_attendance_sessions'] ?? 0);
        $open = (int)($person['open_attendance_sessions'] ?? 0);
        $anomalous = (int)($person['anomalous_attendance_sessions'] ?? 0);
        $shiftCount = (int)($person['scheduled_shift_count'] ?? 0);
        $delta = round(
            (float)($person['actual_worked_hours'] ?? 0)
            - (float)($person['scheduled_hours'] ?? 0),
            2
        );
        $deltaText = ($delta > 0 ? '+' : '').$this->hours($delta);
        $start = trim((string)($range['start_date'] ?? ''));
        $end = trim((string)($range['end_date'] ?? ''));
        $rangeText = ($start !== '' && $end !== '') ? " from {$start} to {$end}" : '';

        $answer = "### ⏱️ {$name}\n"
            ."PMD recorded **{$actual} actual worked hours**{$rangeText}, across **{$workedDays} worked days** and **{$sessions} completed attendance sessions**.\n\n"
            ."Scheduled: **{$scheduled} hours** across **{$shiftCount} shifts**. Difference versus schedule: **{$deltaText} hours**.";

        if ($open > 0 || $anomalous > 0) {
            $answer .= "\n\n⚠️ Excluded from the worked-hours total: **{$open} open** and **{$anomalous} anomalous** attendance sessions.";
        }

        return $answer;
    }

    private function preciseGapAnswer(array $person, array $range): string
    {
        $name = trim((string)($person['name'] ?? 'This team member')) ?: 'This team member';
        $scheduled = $this->hours((float)($person['scheduled_hours'] ?? 0));
        $actual = $this->hours((float)($person['actual_worked_hours'] ?? 0));
        $shiftCount = (int)($person['scheduled_shift_count'] ?? 0);
        $presentMarked = (int)($person['present_marked_shifts'] ?? 0);
        $rowsFound = (int)($person['attendance_rows_found'] ?? 0);
        $sourceReady = (bool)($person['attendance_source_available'] ?? false);
        $linked = (bool)($person['attendance_identity_linked'] ?? false);
        $coverageComplete = (bool)($person['attendance_coverage_complete_for_range'] ?? false);
        $coverageStart = trim((string)($person['attendance_coverage_start'] ?? ''));
        $start = trim((string)($range['start_date'] ?? ''));
        $end = trim((string)($range['end_date'] ?? ''));
        $rangeText = ($start !== '' && $end !== '') ? " for {$start} to {$end}" : '';

        if (!$sourceReady) {
            return "PMD can see {$name}'s rota{$rangeText}: **{$scheduled} scheduled hours across {$shiftCount} shifts**. PMD could not verify the attendance source for this request, so I won't invent actual worked hours.";
        }

        if (!$linked) {
            return "PMD can see {$name}'s rota{$rangeText}: **{$scheduled} scheduled hours across {$shiftCount} shifts**. This roster entry is not linked to a PMD Team attendance identity yet, so actual clocked hours cannot be reported until that PMD link is repaired.";
        }

        if ($rowsFound < 1) {
            $presentNote = $presentMarked > 0
                ? " The rota marks **{$presentMarked} shifts as present**, but a present mark is not a clock-in/clock-out record and cannot prove exact worked time."
                : '';

            return "PMD has **no clock-in/clock-out attendance records** for {$name}{$rangeText}. The rota shows **{$scheduled} scheduled hours across {$shiftCount} shifts**.{$presentNote} Actual worked hours therefore cannot be calculated from PMD attendance for this range.";
        }

        if (!$coverageComplete) {
            $coverageText = $coverageStart !== '' ? " since {$coverageStart}" : ' in the available attendance window';
            return "PMD has **{$actual} recorded actual hours** for {$name}{$coverageText}, but attendance coverage does not reach the start of the requested range{$rangeText}. Scheduled hours for the requested range are **{$scheduled} across {$shiftCount} shifts**. I won't label the partial attendance total as a full-period total.";
        }

        return "PMD can see {$name}'s rota{$rangeText}: **{$scheduled} scheduled hours across {$shiftCount} shifts**. Attendance is connected, but there are no valid completed PMD clock-in/clock-out sessions in this range from which to report actual worked hours.";
    }

    private function hours(float $value): string
    {
        $formatted = number_format(round($value, 2), 2, '.', '');
        return rtrim(rtrim($formatted, '0'), '.');
    }
}
