<?php

namespace App\Services\AI;

interface AiProvider
{
    public function create(array $payload): array;

    public function outputText(array $response): string;

    public function functionCalls(array $response): array;

    public function modelHistoryItems(array $response): array;

    public function toolResultItem(array $call, $output): array;

    public function usage(array $response): array;

    public function responseModel(array $response): string;

    public function name(): string;
}
