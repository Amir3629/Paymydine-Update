<?php

namespace Admin\Helpers;

class PosMenuNormalizer
{
    /**
     * Normalize Square POS products into a unified structure.
     *
     * @param array $rawProducts Raw product data returned by Square API.
     * @return array Normalized product list.
     */
    public static function fromSquare(array $rawProducts): array
    {
        $normalized = [];

        foreach ($rawProducts as $item) {
            if (($item['type'] ?? '') !== 'ITEM') {
                continue;
            }

            $data = $item['item_data'] ?? [];
            $name = trim($data['name'] ?? '');

            if ($name === '') {
                continue;
            }

            $description = trim(
                $data['description_plaintext']
                    ?? $data['description']
                    ?? ''
            );

            $variation = $data['variations'][0]['item_variation_data'] ?? [];

            $price = isset($variation['price_money']['amount'])
                ? $variation['price_money']['amount'] / 100
                : 0;

            $normalized[] = [
                'name'        => $name,
                'description' => $description,
                'price'       => (float) $price,
            ];
        }

        return $normalized;
    }

    /**
     * Normalize Clover POS products into a unified structure.
     *
     * @param array $rawProducts Raw product data returned by Clover API.
     * @return array Normalized product list.
     */
    public static function fromClover(array $rawProducts): array
    {
        $normalized = [];

        foreach ($rawProducts as $item) {
            $name = trim($item['name'] ?? '');

            if ($name === '') {
                continue;
            }

            // Clover may or may not include description
            $description = '';
            if (!empty($item['description'])) {
                $description = trim($item['description']);
            }

            // Clover sends price in cents (example: 5000 => $50.00)
            $price = isset($item['price'])
                ? $item['price'] / 100
                : 0;

            $normalized[] = [
                'name'        => $name,
                'description' => $description,
                'price'       => (float) $price,
            ];
        }

        return $normalized;
    }

    /**
     * Normalize Lightspeed POS products into a unified structure.
     *
     * Expected input formats:
     *  - Listing: ["data" => [ { product... }, { product... } ]]
     *  - Or directly: [ { ... }, { ... } ]
     *  - Or items with ["data" => { ... }] (such as in nested sale structures).
     *
     * @param array $rawProducts Raw product data returned by the Lightspeed API.
     * @return array Normalized product list.
     */
    public static function fromLightspeed(array $rawProducts): array
    {
        $normalized = [];

        // If it comes in the format ["data" => [...]] use "data", otherwise treat the array itself as the list.
        $items = $rawProducts['data'] ?? $rawProducts;

        if (!is_array($items)) {
            return [];
        }

        foreach ($items as $item) {
            // Sometimes it comes as ["includes" => ..., "data" => { ... }]
            if (isset($item['data']) && is_array($item['data'])) {
                $p = $item['data'];
            } else {
                $p = $item;
            }

            $name = trim($p['name'] ?? '');

            if ($name === '') {
                continue;
            }

            $description = '';
            if (!empty($p['description'])) {
                $description = trim($p['description']);
            }

            // Prefer price excluding tax if available; otherwise including tax; otherwise supply_price.
            if (isset($p['price_excluding_tax'])) {
                $price = (float) $p['price_excluding_tax'];
            } elseif (isset($p['price_including_tax'])) {
                $price = (float) $p['price_including_tax'];
            } elseif (isset($p['supply_price'])) {
                $price = (float) $p['supply_price'];
            } else {
                $price = 0.0;
            }

            $normalized[] = [
                'name'        => $name,
                'description' => $description,
                'price'       => $price,
            ];
        }

        return $normalized;
    }

}

