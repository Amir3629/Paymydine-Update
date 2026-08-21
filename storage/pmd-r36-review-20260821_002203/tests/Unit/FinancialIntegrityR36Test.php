<?php

namespace Tests\Unit;

use App\Services\Financial\DeterministicSplit;
use App\Services\Financial\ServiceChargeCalculator;
use PHPUnit\Framework\TestCase;

final class FinancialIntegrityR36Test extends TestCase
{
    public function testEqualSplitUsesStableOriginalCentBase(): void
    {
        self::assertSame([5000, 5000], DeterministicSplit::equal(10000, 2));
        self::assertSame([3334, 3333, 3333], DeterministicSplit::equal(10000, 3));
    }

    public function testPercentageUsesFixedBasisPoints(): void
    {
        self::assertSame(3333, DeterministicSplit::percentage(10000, 3333));
    }

    public function testServiceChargeIsCalculatedOnceOnAggregateGross(): void
    {
        self::assertSame(1000, ServiceChargeCalculator::calculate(10000, 'percentage', '10'));
        self::assertSame(250, ServiceChargeCalculator::calculate(10000, 'fixed', '2.50'));
    }
}
