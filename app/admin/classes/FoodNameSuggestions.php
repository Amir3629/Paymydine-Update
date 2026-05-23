<?php

namespace Admin\Classes;

class FoodNameSuggestions
{
    public static function templates(): array
    {
        return [
            'persian' => ['جوجه کباب','جوجه بی استخوان','جوجه ترش','جوجه سلطانی','کوبیده','چلو کباب برگ','زرشک پلو با مرغ','قورمه سبزی'],
            'arabic' => ['شاورما دجاج','كباب لحم','حمص','فتوش','مندي دجاج','فلافل','متبل','تبولة'],
            'turkish' => ['Döner Kebap','Iskender Kebap','Adana Kebap','Lahmacun','Menemen','Pide','Mercimek Çorbası','Köfte'],
            'german' => ['Currywurst','Schnitzel','Bratwurst','Kartoffelsalat','Käsespätzle','Rinderroulade','Frikadelle','Apfelstrudel'],
            'english' => ['Chicken Burger','Beef Burger','Caesar Salad','Grilled Salmon','Margherita Pizza','Club Sandwich','Pasta Alfredo','Tomato Soup'],
            'cafe' => ['Cappuccino','Latte','Espresso','Cold Brew','Cheesecake','Brownie','Croissant','Iced Matcha'],
            'fast_food' => ['Cheeseburger','Double Burger','Chicken Nuggets','Loaded Fries','Hot Dog','Fried Chicken Wrap','BBQ Wings','Onion Rings'],
        ];
    }

    public static function normalize(string $value): string
    {
        $value = trim($value);
        $value = preg_replace('/\s+/u', ' ', $value) ?: '';
        $value = str_replace(['ي', 'ك'], ['ی', 'ک'], $value);
        return mb_strtolower($value, 'UTF-8');
    }
}
