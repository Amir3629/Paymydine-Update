<?php

namespace Tests\Unit;

use App\Services\Financial\DeterministicSplit;
use App\Services\Financial\ServiceChargeCalculator;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class FinancialIntegrityR36Test extends TestCase
{
    public function testEqualSplitUsesStableOriginalCentBase(): void
    {
        self::assertSame([5000, 5000], DeterministicSplit::equal(10000, 2));
        self::assertSame([3334, 3333, 3333], DeterministicSplit::equal(10000, 3));
        self::assertSame([34, 33, 33], DeterministicSplit::equal(100, 3));
    }

    public function testPercentageUsesFixedBasisPoints(): void
    {
        self::assertSame(3333, DeterministicSplit::percentage(10000, 3333));
    }

    public function testWeightedSplitIsDeterministicAndCentExact(): void
    {
        self::assertSame([34, 33, 33], DeterministicSplit::weighted(100, [1, 1, 1]));
        self::assertSame([67, 33], DeterministicSplit::weighted(100, [2, 1]));
        self::assertSame(101, array_sum(DeterministicSplit::weighted(101, [40, 30, 30])));
    }

    public function testWeightedSplitRejectsAnUnallocatablePositiveTotal(): void
    {
        $this->expectException(InvalidArgumentException::class);
        DeterministicSplit::weighted(1, [0, 0]);
    }

    public function testServiceChargeIsCalculatedOnceOnAggregateGross(): void
    {
        self::assertSame(1000, ServiceChargeCalculator::calculate(10000, 'percentage', '10'));
        self::assertSame(250, ServiceChargeCalculator::calculate(10000, 'fixed', '2.50'));
        self::assertSame(333, ServiceChargeCalculator::calculate(9999, 'percentage', '3.33'));
    }
}
