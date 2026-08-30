<?php

namespace App\Services;

/**
 * PMD_SITE_ACCESS_QR_V1
 *
 * Dependency-free QR encoder deliberately scoped to short Site Access URLs.
 * It emits Version 5-L (37x37), one RS block: 108 data + 26 EC codewords.
 * The signed PMD URL is kept below the Version 5-L byte-mode capacity.
 */
class PmdSiteAccessQrService
{
    private const VERSION = 5;
    private const SIZE = 37;
    private const DATA_CODEWORDS = 108;
    private const EC_CODEWORDS = 26;

    private array $exp = [];
    private array $log = [];

    public function svg(string $text, int $moduleSize = 5): string
    {
        $bytes = array_values(unpack('C*', $text) ?: []);
        if (count($bytes) > 106) {
            throw new \InvalidArgumentException('Site Access QR payload is too long.');
        }

        $this->initGalois();
        $data = $this->dataCodewords($bytes);
        $ec = $this->reedSolomon($data, self::EC_CODEWORDS);
        $codewords = array_merge($data, $ec);
        $matrix = $this->matrix($codewords);

        $quiet = 4;
        $total = self::SIZE + ($quiet * 2);
        $pixels = $total * max(2, $moduleSize);
        $rects = [];
        for ($row = 0; $row < self::SIZE; $row++) {
            for ($col = 0; $col < self::SIZE; $col++) {
                if (!empty($matrix[$row][$col])) {
                    $rects[] = '<rect x="'.($col + $quiet).'" y="'.($row + $quiet).'" width="1" height="1"/>';
                }
            }
        }

        return '<?xml version="1.0" encoding="UTF-8"?>'
            .'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '.$total.' '.$total.'" width="'.$pixels.'" height="'.$pixels.'" shape-rendering="crispEdges" role="img" aria-label="PMD Site Access QR">'
            .'<rect width="100%" height="100%" fill="#fff"/>'
            .'<g fill="#062f2a">'.implode('', $rects).'</g>'
            .'</svg>';
    }

    private function dataCodewords(array $bytes): array
    {
        $bits = [];
        $put = static function (int $value, int $length) use (&$bits): void {
            for ($i = $length - 1; $i >= 0; $i--) $bits[] = (($value >> $i) & 1);
        };

        $put(0b0100, 4); // byte mode
        $put(count($bytes), 8); // version 1-9 byte count
        foreach ($bytes as $byte) $put($byte, 8);

        $capacityBits = self::DATA_CODEWORDS * 8;
        for ($i = 0; $i < 4 && count($bits) < $capacityBits; $i++) $bits[] = 0;
        while (count($bits) % 8 !== 0) $bits[] = 0;

        $data = [];
        for ($i = 0; $i < count($bits); $i += 8) {
            $value = 0;
            for ($j = 0; $j < 8; $j++) $value = ($value << 1) | ($bits[$i + $j] ?? 0);
            $data[] = $value;
        }

        $pad = [0xEC, 0x11];
        $p = 0;
        while (count($data) < self::DATA_CODEWORDS) {
            $data[] = $pad[$p++ % 2];
        }
        return array_slice($data, 0, self::DATA_CODEWORDS);
    }

    private function reedSolomon(array $data, int $degree): array
    {
        $generator = [1];
        for ($i = 0; $i < $degree; $i++) {
            $generator = $this->polyMultiply($generator, [1, $this->gexp($i)]);
        }

        $message = array_merge($data, array_fill(0, $degree, 0));
        for ($i = 0; $i < count($data); $i++) {
            $factor = $message[$i];
            if ($factor === 0) continue;
            for ($j = 0; $j < count($generator); $j++) {
                $message[$i + $j] ^= $this->gmul($generator[$j], $factor);
            }
        }
        return array_slice($message, -$degree);
    }

    private function polyMultiply(array $a, array $b): array
    {
        $out = array_fill(0, count($a) + count($b) - 1, 0);
        foreach ($a as $i => $av) {
            foreach ($b as $j => $bv) {
                if ($av && $bv) $out[$i + $j] ^= $this->gmul($av, $bv);
            }
        }
        return $out;
    }

    private function matrix(array $codewords): array
    {
        $n = self::SIZE;
        $m = array_fill(0, $n, array_fill(0, $n, null));

        $this->finder($m, 0, 0);
        $this->finder($m, 0, $n - 7);
        $this->finder($m, $n - 7, 0);

        for ($i = 8; $i < $n - 8; $i++) {
            if ($m[6][$i] === null) $m[6][$i] = ($i % 2 === 0);
            if ($m[$i][6] === null) $m[$i][6] = ($i % 2 === 0);
        }

        $this->alignment($m, 30, 30);
        $this->formatInfo($m, 0); // L + mask 0, reserves cells before data map
        $m[$n - 8][8] = true; // fixed dark module

        $bits = [];
        foreach ($codewords as $cw) {
            for ($i = 7; $i >= 0; $i--) $bits[] = (($cw >> $i) & 1) === 1;
        }

        $bit = 0;
        $row = $n - 1;
        $inc = -1;
        for ($col = $n - 1; $col > 0; $col -= 2) {
            if ($col === 6) $col--;
            while (true) {
                for ($offset = 0; $offset < 2; $offset++) {
                    $c = $col - $offset;
                    if ($m[$row][$c] !== null) continue;
                    $dark = $bits[$bit] ?? false;
                    $bit++;
                    if ((($row + $c) % 2) === 0) $dark = !$dark; // mask 0
                    $m[$row][$c] = $dark;
                }
                $row += $inc;
                if ($row < 0 || $row >= $n) {
                    $row -= $inc;
                    $inc = -$inc;
                    break;
                }
            }
        }

        return $m;
    }

    private function finder(array &$m, int $row, int $col): void
    {
        $n = self::SIZE;
        for ($r = -1; $r <= 7; $r++) {
            for ($c = -1; $c <= 7; $c++) {
                $rr = $row + $r;
                $cc = $col + $c;
                if ($rr < 0 || $cc < 0 || $rr >= $n || $cc >= $n) continue;
                if ($r < 0 || $r > 6 || $c < 0 || $c > 6) {
                    $m[$rr][$cc] = false;
                    continue;
                }
                $m[$rr][$cc] = ($r === 0 || $r === 6 || $c === 0 || $c === 6 || ($r >= 2 && $r <= 4 && $c >= 2 && $c <= 4));
            }
        }
    }

    private function alignment(array &$m, int $row, int $col): void
    {
        if ($m[$row][$col] !== null) return;
        for ($r = -2; $r <= 2; $r++) {
            for ($c = -2; $c <= 2; $c++) {
                $m[$row + $r][$col + $c] = (abs($r) === 2 || abs($c) === 2 || ($r === 0 && $c === 0));
            }
        }
    }

    private function formatInfo(array &$m, int $mask): void
    {
        $n = self::SIZE;
        $data = (1 << 3) | $mask; // L = 01
        $bits = $this->bchFormat($data);

        for ($i = 0; $i < 15; $i++) {
            $dark = (($bits >> $i) & 1) === 1;
            if ($i < 6) $m[$i][8] = $dark;
            elseif ($i < 8) $m[$i + 1][8] = $dark;
            else $m[$n - 15 + $i][8] = $dark;
        }
        for ($i = 0; $i < 15; $i++) {
            $dark = (($bits >> $i) & 1) === 1;
            if ($i < 8) $m[8][$n - $i - 1] = $dark;
            elseif ($i < 9) $m[8][15 - $i] = $dark;
            else $m[8][15 - $i - 1] = $dark;
        }
    }

    private function bchFormat(int $data): int
    {
        $g15 = 0x537;
        $g15Mask = 0x5412;
        $d = $data << 10;
        while ($this->bchDigit($d) - $this->bchDigit($g15) >= 0) {
            $d ^= $g15 << ($this->bchDigit($d) - $this->bchDigit($g15));
        }
        return (($data << 10) | $d) ^ $g15Mask;
    }

    private function bchDigit(int $data): int
    {
        $digit = 0;
        while ($data !== 0) {
            $digit++;
            $data >>= 1;
        }
        return $digit;
    }

    private function initGalois(): void
    {
        if ($this->exp) return;
        $x = 1;
        for ($i = 0; $i < 255; $i++) {
            $this->exp[$i] = $x;
            $this->log[$x] = $i;
            $x <<= 1;
            if ($x & 0x100) $x ^= 0x11D;
        }
        for ($i = 255; $i < 512; $i++) $this->exp[$i] = $this->exp[$i - 255];
    }

    private function gexp(int $power): int
    {
        while ($power < 0) $power += 255;
        return $this->exp[$power % 255];
    }

    private function gmul(int $a, int $b): int
    {
        if ($a === 0 || $b === 0) return 0;
        return $this->exp[($this->log[$a] + $this->log[$b]) % 255];
    }
}
