<?php

namespace App\Services\AI;

/**
 * Keeps workforce tool evidence small, explicit and hard to misread by the
 * model. It also provides a narrow server-side correction for named worked-hour
 * questions so an AI provider can never contradict authoritative PMD attendance
 * facts with a generic "check payroll" refusal.
 *
 * Internal Admin AI only. Guest AI never calls this service.
 */
final class PmdWorkforceToolFactCompactor
{
    private const MAX_GENERAL_PEOPLE = 18;
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
        $selected = $matched ?: array_slice($people, 0, self::MAX_GENERAL_PEOPLE);

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
                'source' => 'PMD staff_attendance clock-in/check-out records, not payroll software.',
                'rule' => 'For a person where actual_hours_authoritative=true, actual_worked_hours is the cumulative PMD attendance fact for this exact range. Use it directly. Never say cumulative/annual attendance is unavailable and never redirect the operator to payroll.',
                'gap_rule' => 'If actual_hours_authoritative=false, explain the explicit attendance_source_available or attendance_identity_linked gap from the person metric. Do not invent actual hours.',
            ],
            'source' => 'PMD internal workforce authority; compacted for authenticated Admin AI.',
        ];
    }

    /**
     * Correct only the narrow failure mode shown in production: the provider
     * received named staff attendance facts but still claimed it lacked access.
     * Normal workforce answers remain provider-written.
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
            if (!$matched) continue;

            // If two roster names genuinely match the question, let the model
            // ask/clarify rather than choosing a person server-side.
            if (count($matched) !== 1) continue;

            $person = $matched[0];
            $authoritative = (bool)($person['actual_hours_authoritative'] ?? false);

            if ($authoritative) {
                $actual = round((float)($person['actual_worked_hours'] ?? 0), 2);
                if ($this->answerAlreadyUsesFact($answer, $actual)) return $answer;
                return $this->authoritativeHoursAnswer($person, (array)($evidence['range'] ?? []));
            }

            if ($this->looksLikeGenericAccessRefusal($answer)) {
                return $this->preciseGapAnswer($person, (array)($evidence['range'] ?? []));
            }
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

    private function answerAlreadyUsesFact(string $answer, float $actual): bool
    {
        $candidates = array_unique([
            $this->hours($actual),
            number_format($actual, 1, '.', ''),
            number_format($actual, 2, '.', ''),
        ]);
        foreach ($candidates as $candidate) {
            if ($candidate !== '' && str_contains($answer, $candidate)) return true;
        }
        return false;
    }

    private function looksLikeGenericAccessRefusal(string $answer): bool
    {
        $text = mb_strtolower($answer);
        $needles = [
            "don't have access", 'do not have access', "don't have a record", 'do not have a record',
            'limited to operational rostering', 'check your payroll', 'payroll software',
            'staff management software', 'attendance logs', 'cumulative historical',
        ];
        return $this->containsAny($text, $needles);
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
        $shiftCount = (int)($person['scheduled_shift_count'] ?? 0);
        $sourceReady = (bool)($person['attendance_source_available'] ?? false);
        $linked = (bool)($person['attendance_identity_linked'] ?? false);
        $start = trim((string)($range['start_date'] ?? ''));
        $end = trim((string)($range['end_date'] ?? ''));
        $rangeText = ($start !== '' && $end !== '') ? " for {$start} to {$end}" : '';

        if (!$sourceReady) {
            return "PMD can see {$name}'s rota{$rangeText}: **{$scheduled} scheduled hours across {$shiftCount} shifts**. The PMD attendance clock source is not available in this restaurant scope, so I can't safely claim actual worked hours yet.";
        }

        if (!$linked) {
            return "PMD can see {$name}'s rota{$rangeText}: **{$scheduled} scheduled hours across {$shiftCount} shifts**. Their Team profile is not linked to a PMD attendance identity, so actual clocked hours can't be totalled safely until that link is repaired.";
        }

        return "PMD can see {$name}'s rota{$rangeText}: **{$scheduled} scheduled hours across {$shiftCount} shifts**. Attendance is connected, but there isn't enough valid completed clock-in/clock-out evidence in this range to claim actual worked hours.";
    }

    private function hours(float $value): string
    {
        $formatted = number_format(round($value, 2), 2, '.', '');
        return rtrim(rtrim($formatted, '0'), '.');
    }
}
