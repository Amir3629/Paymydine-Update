<?php

namespace Admin\Services;

/**
 * PMD_STARTER_MENU_LIBRARY_V3
 *
 * A fuller Quick Setup catalogue. Every supported restaurant type receives at
 * least 50 editable starter items, including drinks and the supporting courses
 * guests normally expect for that cuisine.
 *
 * This class is additive: V1/V2 items stay untouched and V3 only contributes
 * missing starter suggestions. Nutrition and allergen data are suggestions and
 * restaurant owners must review the final menu against their real recipes.
 */
class PmdStarterMenuLibraryV3 extends PmdStarterMenuLibraryV2
{
    public const VERSION = '3.0.0';
    public const MIN_ITEMS_PER_PACK = 50;

    public function pack(string $type): array
    {
        $type = strtolower(trim($type));
        $base = parent::pack($type);
        $items = [];
        $seen = [];

        foreach ((array)($base['items'] ?? []) as $item) {
            if (!is_array($item)) continue;
            $item = $this->decorateExisting($item, $type);
            $key = $this->key((string)($item['name'] ?? ''));
            if ($key === '' || isset($seen[$key])) continue;
            $seen[$key] = true;
            $items[] = $item;
        }

        foreach ($this->catalogueItems($type) as $item) {
            $key = $this->key((string)($item['name'] ?? ''));
            if ($key === '' || isset($seen[$key])) continue;
            $seen[$key] = true;
            $items[] = $item;
        }

        if (count($items) < self::MIN_ITEMS_PER_PACK) {
            throw new \RuntimeException(sprintf(
                'Starter pack %s has only %d items; minimum is %d.',
                $type,
                count($items),
                self::MIN_ITEMS_PER_PACK
            ));
        }

        $categories = [];
        foreach ($items as $item) {
            $category = trim((string)($item['category'] ?? ''));
            if ($category !== '' && !in_array($category, $categories, true)) {
                $categories[] = $category;
            }
        }

        return [
            'version' => self::VERSION,
            'type' => $type,
            'categories' => $categories,
            'items' => $items,
        ];
    }

    protected function decorateExisting(array $item, string $type): array
    {
        $name = trim((string)($item['name'] ?? ''));
        $family = strtolower(trim((string)($item['image_family'] ?? 'plated'))) ?: 'plated';
        $query = trim((string)($item['image_query'] ?? ''));
        $aliasKey = $this->key($name);
        $aliases = $this->queryAliases();
        if (isset($aliases[$aliasKey])) {
            $query = $aliases[$aliasKey];
        } elseif ($query === '') {
            $query = $this->imageQuery($name, $type, $family);
        }

        $item['image_family'] = $family;
        $item['image_query'] = $query;
        $item['image_fallback_query'] = $this->fallbackQuery($type, $family);
        $item['image_required'] = $this->requiredTerms($name, $family);
        $item['image_forbid'] = array_values((array)($item['image_forbid'] ?? []));
        $item['starter_library_version'] = self::VERSION;
        $item['restaurant_type'] = $type;

        return $item;
    }

    protected function catalogueItems(string $type): array
    {
        $catalogue = $this->catalogue();
        $groups = (array)($catalogue[$type] ?? []);
        $items = [];

        foreach ($groups as $category => $rows) {
            foreach ((array)$rows as $row) {
                [$name, $family] = array_pad(explode('|', (string)$row, 2), 2, 'plated');
                $name = trim($name);
                $family = strtolower(trim($family)) ?: 'plated';
                if ($name === '') continue;
                $items[] = $this->item($name, (string)$category, $family, $type, count($items));
            }
        }

        return $items;
    }

    protected function item(string $name, string $category, string $family, string $type, int $index): array
    {
        $nutrition = $this->nutritionForFamily($family);

        return [
            'name' => $name,
            'description' => $this->descriptionFor($name, $category, $family, $type),
            'category' => $category,
            'price' => $this->priceFor($family, $type, $index),
            'allergens' => [],
            'prep' => in_array($family, ['grill','seafood','stew','plated'], true) ? 20 : 12,
            'halal' => in_array($type, ['turkish','arabic','persian'], true),
            'vegetarian' => in_array($family, ['salad','side','dessert','drink','bread','vegetarian'], true),
            'vegan' => false,
            'chef' => false,
            'bestseller' => false,
            'nutrition' => $nutrition,
            'image_family' => $family,
            'image_query' => $this->imageQuery($name, $type, $family),
            'image_fallback_query' => $this->fallbackQuery($type, $family),
            'image_required' => $this->requiredTerms($name, $family),
            'image_forbid' => [],
            'starter_library_version' => self::VERSION,
            'restaurant_type' => $type,
        ];
    }

    protected function descriptionFor(string $name, string $category, string $family, string $type): string
    {
        $cuisine = $this->cuisineLabel($type);
        $templates = [
            'pizza' => 'Stone-baked pizza in a classic '.$cuisine.' style.',
            'pasta' => 'Classic '.$cuisine.' pasta prepared for a generous main course.',
            'rice' => 'A comforting '.$cuisine.' rice speciality served as a complete dish.',
            'soup' => 'A warming '.$cuisine.' soup prepared in a traditional style.',
            'salad' => 'A fresh '.$cuisine.' salad with a clean, balanced finish.',
            'grill' => 'A grilled '.$cuisine.' favourite served hot from the kitchen.',
            'seafood' => 'A classic '.$cuisine.' seafood dish with a fresh, simple presentation.',
            'sandwich' => 'A satisfying '.$cuisine.' handheld favourite prepared to order.',
            'sushi' => 'Fresh Japanese sushi prepared as an editable starter-menu suggestion.',
            'dumpling' => 'Classic dumplings prepared in a traditional '.$cuisine.' style.',
            'mezze' => 'A shareable '.$cuisine.' mezze plate with a classic preparation.',
            'starter' => 'A popular '.$cuisine.' starter designed for sharing or opening the meal.',
            'vegetarian' => 'A vegetable-led '.$cuisine.' dish with a classic preparation.',
            'side' => 'A classic '.$cuisine.' side dish for the table.',
            'dessert' => 'A traditional '.$cuisine.' sweet to finish the meal.',
            'drink' => 'A refreshing drink that fits the '.$cuisine.' menu.',
            'bread' => 'Fresh bread or pastry served in a classic '.$cuisine.' style.',
            'sausage' => 'A classic '.$cuisine.' sausage speciality.',
            'stew' => 'A slow-cooked '.$cuisine.' speciality with a rich, comforting finish.',
            'plated' => 'A classic '.$cuisine.' '.$category.' dish prepared as a full plate.',
        ];

        return $templates[$family] ?? $templates['plated'];
    }

    protected function priceFor(string $family, string $type, int $index): float
    {
        $base = [
            'pizza' => 15.90,
            'pasta' => 16.90,
            'rice' => 16.90,
            'soup' => 7.90,
            'salad' => 10.90,
            'grill' => 19.90,
            'seafood' => 21.90,
            'sandwich' => 13.90,
            'sushi' => 11.90,
            'dumpling' => 9.90,
            'mezze' => 8.50,
            'starter' => 9.50,
            'vegetarian' => 15.90,
            'side' => 6.50,
            'dessert' => 8.50,
            'drink' => 4.90,
            'bread' => 6.90,
            'sausage' => 15.90,
            'stew' => 18.90,
            'plated' => 18.90,
        ][$family] ?? 15.90;

        $modifier = [
            'fine_dining' => 6.0,
            'steakhouse' => 4.0,
            'mediterranean' => 1.0,
            'cafe' => -2.0,
            'bar' => -1.0,
        ][$type] ?? 0.0;

        if (in_array($family, ['drink','side','dessert','starter','mezze','soup','bread'], true)) {
            $modifier *= 0.35;
        }

        $variation = (($index % 3) - 1) * 0.5;
        return max(2.50, round($base + $modifier + $variation, 2));
    }

    protected function nutritionForFamily(string $family): array
    {
        $map = [
            'pizza' => [760, 29, 88, 31, 8],
            'pasta' => [670, 25, 82, 25, 8],
            'rice' => [650, 27, 86, 20, 8],
            'soup' => [310, 12, 38, 12, 7],
            'salad' => [320, 12, 25, 22, 9],
            'grill' => [690, 47, 38, 38, 6],
            'seafood' => [540, 40, 33, 27, 6],
            'sandwich' => [650, 30, 69, 28, 8],
            'sushi' => [390, 20, 54, 10, 5],
            'dumpling' => [420, 20, 47, 17, 6],
            'mezze' => [340, 10, 31, 21, 6],
            'starter' => [410, 17, 42, 20, 6],
            'vegetarian' => [510, 18, 53, 25, 9],
            'side' => [300, 7, 42, 13, 5],
            'dessert' => [450, 7, 56, 23, 34],
            'drink' => [170, 4, 30, 4, 24],
            'bread' => [370, 10, 52, 14, 5],
            'sausage' => [660, 30, 49, 38, 9],
            'stew' => [610, 36, 51, 28, 9],
            'plated' => [570, 29, 49, 28, 8],
        ];
        [$calories, $protein, $carbs, $fat, $sugar] = $map[$family] ?? $map['plated'];
        return compact('calories', 'protein', 'carbs', 'fat', 'sugar');
    }

    protected function imageQuery(string $name, string $type, string $family): string
    {
        $aliases = $this->queryAliases();
        $key = $this->key($name);
        if (isset($aliases[$key])) return $aliases[$key];
        return trim($name.' '.$this->cuisineLabel($type).' food');
    }

    protected function fallbackQuery(string $type, string $family): string
    {
        $term = [
            'pizza' => 'pizza', 'pasta' => 'pasta', 'rice' => 'rice dish', 'soup' => 'soup',
            'salad' => 'salad', 'grill' => 'grilled food', 'seafood' => 'seafood plate',
            'sandwich' => 'sandwich', 'sushi' => 'sushi', 'dumpling' => 'dumplings',
            'mezze' => 'mezze', 'starter' => 'appetizer', 'vegetarian' => 'vegetarian plate',
            'side' => 'side dish', 'dessert' => 'dessert', 'drink' => 'drink',
            'bread' => 'bread', 'sausage' => 'sausage plate', 'stew' => 'stew',
            'plated' => 'plated dish',
        ][$family] ?? 'plated food';
        return trim($this->cuisineLabel($type).' '.$term);
    }

    protected function requiredTerms(string $name, string $family): array
    {
        $key = $this->key($name);
        $aliases = $this->semanticAliases();
        if (isset($aliases[$key])) return $aliases[$key];

        $familyTokens = [
            'pizza' => ['pizza'],
            'pasta' => ['pasta','spaghetti','noodle'],
            'rice' => ['rice','risotto','paella'],
            'soup' => ['soup','broth','ramen','pho'],
            'salad' => ['salad'],
            'grill' => ['grilled','steak','chicken','beef','lamb','kebab'],
            'seafood' => ['fish','salmon','prawn','shrimp','seafood','octopus','calamari'],
            'sandwich' => ['sandwich','burger','taco','toast','bagel','wrap'],
            'sushi' => ['sushi','nigiri','roll','maki'],
            'dumpling' => ['dumpling','gyoza','bao'],
            'mezze' => ['hummus','dip','mezze','meze'],
            'starter' => ['appetizer','starter','tapas'],
            'vegetarian' => ['vegetable','vegetarian','eggplant','aubergine','tofu'],
            'side' => ['potato','fries','side','vegetable'],
            'dessert' => ['dessert','cake','pudding','ice cream','pastry','sweet'],
            'drink' => ['drink','coffee','tea','juice','water','soda','lemonade'],
            'bread' => ['bread','toast','pastry','pretzel','croissant'],
            'sausage' => ['sausage','bratwurst'],
            'stew' => ['stew','braised'],
            'plated' => ['plate','dish'],
        ][$family] ?? ['plate','dish'];

        return $familyTokens;
    }

    protected function cuisineLabel(string $type): string
    {
        return [
            'german' => 'German',
            'turkish' => 'Turkish',
            'arabic' => 'Middle Eastern',
            'persian' => 'Persian',
            'italian' => 'Italian',
            'spanish' => 'Spanish',
            'japanese' => 'Japanese',
            'chinese' => 'Chinese',
            'vietnamese' => 'Vietnamese',
            'mexican' => 'Mexican',
            'mediterranean' => 'Mediterranean',
            'steakhouse' => 'Steakhouse',
            'cafe' => 'Cafe',
            'fine_dining' => 'Fine dining',
            'bar' => 'Bar',
        ][$type] ?? ucfirst(str_replace('_', ' ', $type));
    }

    protected function key(string $value): string
    {
        $value = mb_strtolower(trim($value));
        $value = preg_replace('/[^\\pL\\pN]+/u', ' ', $value) ?: '';
        return trim(preg_replace('/\\s+/u', ' ', $value) ?: '');
    }

    protected function queryAliases(): array
    {
        return [
            'pimientos de padrón' => 'padron green peppers tapas',
            'ensalada manchega' => 'spanish tomato manchego salad',
            'gambas al ajillo' => 'garlic prawns shrimp spanish tapas',
            'croquetas de jamón' => 'spanish ham croquettes',
            'tortilla española' => 'spanish potato omelette tortilla',
            'paella valenciana' => 'spanish paella rice chicken',
            'paella de marisco' => 'spanish seafood paella rice',
            'arroz negro' => 'black rice seafood paella',
            'pulpo a la gallega' => 'spanish octopus potato plate',
            'patatas bravas' => 'spanish patatas bravas potatoes',
            'mercimek çorbası' => 'turkish red lentil soup',
            'ezogelin çorbası' => 'turkish lentil bulgur soup',
            'imam bayıldı' => 'turkish stuffed eggplant tomato',
            'i̇mam bayıldı' => 'turkish stuffed eggplant tomato',
            'kashk e bademjan' => 'persian eggplant dip kashk',
            'mirza ghasemi' => 'persian smoked eggplant tomato egg',
            'ghormeh sabzi' => 'persian herb stew beef kidney beans',
            'fesenjan' => 'persian walnut pomegranate chicken stew',
            'zereshk polo ba morgh' => 'persian saffron chicken barberry rice',
            'chelow kebab koobideh' => 'persian koobideh kebab rice',
            'phở bò' => 'vietnamese beef pho noodle soup',
            'phở gà' => 'vietnamese chicken pho noodle soup',
            'bún bò huế' => 'vietnamese spicy beef noodle soup',
            'gỏi cuốn' => 'vietnamese fresh spring rolls',
            'bánh mì chicken' => 'vietnamese chicken banh mi sandwich',
            'bánh mì pork' => 'vietnamese pork banh mi sandwich',
            'bánh mì tofu' => 'vietnamese tofu banh mi sandwich',
            'bánh xèo' => 'vietnamese crispy savory pancake',
            'tonkotsu ramen' => 'japanese tonkotsu ramen pork noodles',
            'miso ramen' => 'japanese miso ramen noodles',
            'shoyu ramen' => 'japanese shoyu ramen noodles',
            'tacos al pastor' => 'mexican al pastor tacos pork pineapple',
            'birria tacos' => 'mexican birria beef tacos',
            'chiles rellenos' => 'mexican stuffed poblano peppers',
            'cochinita pibil' => 'mexican slow cooked pork cochinita pibil',
            'currywurst' => 'german currywurst sausage fries',
            'käsespätzle' => 'german cheese spaetzle noodles',
            'jägerschnitzel' => 'german schnitzel mushroom sauce',
            'schweinshaxe' => 'german roast pork knuckle',
            'flammkuchen' => 'german flammkuchen flatbread',
            'bruschetta' => 'italian tomato basil bruschetta toast',
            'burrata tomato' => 'italian burrata tomato salad',
            'burrata & tomato' => 'italian burrata tomato salad',
            'risotto ai funghi' => 'italian mushroom risotto rice',
            'spaghetti carbonara' => 'italian spaghetti carbonara guanciale',
            'tagliatelle al ragù' => 'italian tagliatelle beef ragu pasta',
            'melanzane alla parmigiana' => 'italian eggplant parmigiana',
            'tiramisù' => 'italian tiramisu dessert slice',
            'panna cotta' => 'italian panna cotta dessert',
        ];
    }

    protected function semanticAliases(): array
    {
        return [
            'pimientos de padrón' => ['pepper','peppers','padron'],
            'ensalada manchega' => ['salad','tomato','manchego'],
            'paella valenciana' => ['paella','rice'],
            'paella de marisco' => ['paella','rice','seafood'],
            'arroz negro' => ['rice','paella'],
            'gambas al ajillo' => ['prawn','prawns','shrimp'],
            'pulpo a la gallega' => ['octopus'],
            'patatas bravas' => ['potato','potatoes','patatas'],
            'spaghetti carbonara' => ['carbonara','guanciale','pancetta','bacon'],
            'tagliatelle al ragù' => ['tagliatelle','ragu','bolognese'],
            'risotto ai funghi' => ['risotto','mushroom','rice'],
            'burrata & tomato' => ['burrata','mozzarella'],
            'bruschetta' => ['bruschetta','bread','toast'],
            'melanzane alla parmigiana' => ['eggplant','aubergine','melanzane'],
            'tiramisù' => ['tiramisu','tiramis'],
            'panna cotta' => ['panna cotta','pudding','custard'],
            'currywurst' => ['sausage','currywurst'],
            'käsespätzle' => ['spaetzle','spatzle','noodle'],
            'mercimek çorbası' => ['lentil','soup'],
            'ghormeh sabzi' => ['stew','herb'],
            'fesenjan' => ['stew','pomegranate','walnut'],
            'phở bò' => ['pho','soup','noodle'],
            'phở gà' => ['pho','soup','noodle'],
            'bún bò huế' => ['noodle','soup'],
            'gỏi cuốn' => ['spring roll','roll'],
            'tonkotsu ramen' => ['ramen','noodle'],
            'miso ramen' => ['ramen','noodle'],
            'shoyu ramen' => ['ramen','noodle'],
            'tacos al pastor' => ['taco','tacos'],
            'birria tacos' => ['taco','tacos','birria'],
        ];
    }

    protected function catalogue(): array
    {
        return [
            'german' => [
                'Starters' => ['Leberknödelsuppe|soup','Maultaschensuppe|soup','Handkäse mit Musik|starter','Wurstsalat|salad','Gurkensalat|salad'],
                'Classics' => ['Königsberger Klopse|plated','Frikadellen|grill','Nürnberger Rostbratwürste|sausage','Kasseler mit Sauerkraut|plated','Labskaus|plated'],
                'Mains' => ['Zwiebelrostbraten|grill','Hähnchen Schnitzel|grill','Schweinebraten|plated','Forelle Müllerin|seafood','Maultaschen Geschmälzt|dumpling'],
                'Vegetarian' => ['Semmelknödel mit Pilzrahm|vegetarian','Rahmwirsing|vegetarian','Gemüsemaultaschen|dumpling'],
                'Sides' => ['Bratkartoffeln|side','Rotkohl|side','Pommes Frites|side','Spätzle Beilage|side'],
                'Desserts' => ['Rote Grütze|dessert','Dampfnudel|dessert','Bienenstich|dessert'],
                'Drinks' => ['Apfelschorle|drink','Spezi|drink','Rhabarberschorle|drink','Mineralwasser Still|drink','Mineralwasser Sprudel|drink','Kaffee Crème|drink'],
            ],
            'turkish' => [
                'Meze' => ['Cacık|mezze','Şakşuka|vegetarian','Atom|mezze','Patlıcan Salatası|salad','Çoban Salatası|salad'],
                'Grill' => ['Beyti Kebab|grill','Kuzu Pirzola|grill','Tavuk Kanat|grill','Köfte Izgara|grill','Döner Plate|grill'],
                'Mains' => ['Ali Nazik|plated','Hünkar Beğendi|plated','Kuru Fasulye|stew','Etli Güveç|stew','Gözleme Peynirli|bread'],
                'Sides' => ['Bulgur Pilavı|rice','Pirinç Pilavı|rice','Sumaklı Soğan|side','Lavaş|bread','Mevsim Salata|salad'],
                'Desserts' => ['Revani|dessert','Kazandibi|dessert','Tavuk Göğsü|dessert','İrmik Helvası|dessert'],
                'Drinks' => ['Ayran|drink','Turkish Tea|drink','Turkish Coffee|drink','Şalgam|drink','Fresh Lemonade|drink','Mineral Water|drink'],
            ],
            'arabic' => [
                'Mezze' => ['Warak Enab|mezze','Foul Mudammas|mezze','Sambousek Cheese|starter','Sambousek Meat|starter','Arabic Pickles|side','Roasted Cauliflower Tahini|vegetarian'],
                'Salads' => ['Rocca Salad|salad','Cucumber Yoghurt Salad|salad','Beetroot Tahini Salad|salad'],
                'Grill' => ['Chicken Kofta|grill','Lamb Shish|grill','Arayes|sandwich','Grilled Halloumi|vegetarian'],
                'Mains' => ['Musakhan|plated','Kabsa Chicken|rice','Kabsa Lamb|rice','Dawood Basha|stew','Molokhia Chicken|stew','Freekeh Chicken|rice'],
                'Sides' => ['Vermicelli Rice|rice','Arabic Bread|bread','Grilled Vegetables|side','Toum & Pickles|side'],
                'Desserts' => ['Basbousa|dessert','Mahalabia|dessert','Qatayef|dessert','Date Cake|dessert'],
                'Drinks' => ['Mint Lemonade|drink','Jallab|drink','Tamarind Juice|drink','Arabic Coffee|drink','Mint Tea|drink','Laban Ayran|drink'],
            ],
            'persian' => [
                'Starters' => ['Mast-o Musir|mezze','Borani Esfenaj|mezze','Zeytoon Parvardeh|mezze','Torshi|side','Ash Reshteh|soup'],
                'Kebabs' => ['Kebab Soltani|grill','Kebab Vaziri|grill','Chenjeh Kebab|grill','Bakhtiari Kebab|grill'],
                'Stews' => ['Khoresh Karafs|stew','Khoresh Aloo Esfenaj|stew','Baghali Ghatogh|stew','Kaleh Joosh|stew'],
                'Mains' => ['Adas Polo|rice','Loobia Polo|rice','Sabzi Polo ba Mahi|seafood','Albaloo Polo|rice','Havij Polo|rice'],
                'Sides' => ['Saffron Rice|rice','Zereshk Rice|rice','Grilled Tomato|side'],
                'Desserts' => ['Ranginak|dessert','Zoolbia Bamieh|dessert','Bastani Nooni|dessert'],
                'Drinks' => ['Doogh|drink','Persian Tea|drink','Saffron Tea|drink','Sekanjabin|drink','Khakshir|drink','Rose Lemonade|drink'],
            ],
            'italian' => [
                'Antipasti' => ['Caprese|salad','Focaccia al Rosmarino|bread','Calamari Fritti|seafood','Vitello Tonnato|starter','Carpaccio di Manzo|starter'],
                'Pizza' => ['Pizza Napoli|pizza','Pizza Parma|pizza','Tonno e Cipolla|pizza','Boscaiola|pizza','Bufalina|pizza'],
                'Pasta' => ['Lasagne al Forno|pasta','Ravioli Ricotta e Spinaci|pasta','Cacio e Pepe|pasta','Amatriciana|pasta','Tortellini Panna e Prosciutto|pasta'],
                'Mains' => ['Osso Buco|stew','Chicken Parmigiana|plated','Veal Piccata|plated','Grilled Salmon Italian Style|seafood'],
                'Salads & Sides' => ['Caponata Siciliana|vegetarian','Rocket Parmesan Salad|salad','Grilled Vegetables|side'],
                'Desserts' => ['Affogato|dessert','Gelato Trio|dessert','Lemon Sorbet|dessert','Torta Caprese|dessert'],
                'Drinks' => ['Espresso|drink','Cappuccino|drink','San Pellegrino|drink','Still Water|drink','Aranciata|drink','Lemon Soda|drink'],
            ],
            'spanish' => [
                'Tapas' => ['Jamón Ibérico|starter','Queso Manchego|starter','Boquerones en Vinagre|seafood','Calamares a la Romana|seafood','Chorizo al Vino|sausage','Champiñones al Ajillo|vegetarian'],
                'Paella' => ['Arroz a Banda|rice','Paella de Verduras|rice','Fideuà|pasta'],
                'Mains' => ['Rabo de Toro|stew','Pollo a la Catalana|plated','Dorada a la Plancha|seafood','Merluza a la Vasca|seafood','Carrillada Ibérica|stew'],
                'Salads' => ['Ensaladilla Rusa|salad','Ensalada de Tomate y Ventresca|salad','Escalivada|vegetarian'],
                'Sides' => ['Papas Arrugadas|side','Pisto Manchego|vegetarian','Alioli & Bread|bread'],
                'Desserts' => ['Torrijas|dessert','Tarta de Queso Vasca|dessert','Arroz con Leche|dessert','Buñuelos|dessert'],
                'Drinks' => ['Agua Sin Gas|drink','Agua Con Gas|drink','Café Cortado|drink','Café con Leche|drink','Horchata Valenciana|drink','Zumo de Naranja|drink'],
            ],
            'japanese' => [
                'Sushi' => ['Ebi Nigiri|sushi','Hamachi Nigiri|sushi','Tuna Avocado Roll|sushi','Vegetable Maki|sushi','Dragon Roll|sushi'],
                'Starters' => ['Miso Soup|soup','Seaweed Salad|salad','Takoyaki|starter','Korokke|starter','Chawanmushi|starter'],
                'Ramen' => ['Spicy Miso Ramen|soup','Chicken Ramen|soup','Vegan Ramen|soup','Tsukemen|soup'],
                'Rice Bowls' => ['Katsudon|rice','Unagi Don|rice','Salmon Teriyaki Don|rice','Tofu Donburi|rice'],
                'Grill' => ['Miso Salmon|seafood','Beef Yakiniku|grill','Grilled Mackerel|seafood'],
                'Desserts' => ['Matcha Ice Cream|dessert','Japanese Cheesecake|dessert','Black Sesame Ice Cream|dessert'],
                'Drinks' => ['Green Tea|drink','Matcha Latte|drink','Ramune|drink','Yuzu Lemonade|drink','Iced Green Tea|drink','Calpico|drink'],
            ],
            'chinese' => [
                'Starters' => ['Wonton Soup|soup','Egg Drop Soup|soup','Salt & Pepper Tofu|vegetarian','Chinese Cucumber Salad|salad','Prawn Toast|bread'],
                'Dim Sum' => ['Siu Mai|dumpling','Char Siu Bao|dumpling','Vegetable Dumplings|dumpling','Chicken Dumplings|dumpling','Cheung Fun|dumpling'],
                'Mains' => ['Lemon Chicken|plated','Crispy Chilli Beef|grill','Cantonese Sweet & Sour Pork|plated','Ginger Spring Onion Chicken|plated','Salt & Pepper Prawns|seafood'],
                'Rice & Noodles' => ['Singapore Noodles|pasta','Beef Chow Fun|pasta','Yangzhou Fried Rice|rice','Vegetable Fried Rice|rice','Lo Mein|pasta'],
                'Vegetarian' => ['Buddha’s Delight|vegetarian','Dry-Fried Green Beans|vegetarian','Garlic Aubergine|vegetarian'],
                'Desserts' => ['Egg Tart|dessert','Coconut Pudding|dessert','Fried Sesame Banana|dessert'],
                'Drinks' => ['Jasmine Tea|drink','Oolong Tea|drink','Hong Kong Milk Tea|drink','Lychee Juice|drink','Lemon Iced Tea|drink','Soy Milk|drink'],
            ],
            'vietnamese' => [
                'Starters' => ['Nem Nướng Cuốn|starter','Green Papaya Salad|salad','Lotus Stem Salad|salad','Crispy Prawn Cakes|seafood','Chicken Summer Rolls|starter'],
                'Noodle Soups' => ['Bún Riêu|soup','Hủ Tiếu|soup','Mì Quảng|soup','Vegetarian Phở|soup'],
                'Mains' => ['Bò Lúc Lắc|grill','Thịt Kho Trứng|stew','Grilled Pork Chop Rice|rice','Lemongrass Beef Rice|rice','Tamarind Prawns|seafood'],
                'Bowls' => ['Bún Thịt Nướng|rice','Bún Tôm|rice','Vegan Vermicelli Bowl|rice'],
                'Sides' => ['Vietnamese Pickled Vegetables|side','Jasmine Rice|rice','Garlic Morning Glory|vegetarian'],
                'Desserts' => ['Banana Sticky Rice|dessert','Pandan Waffle|dessert','Mango Sticky Rice|dessert','Coconut Jelly|dessert'],
                'Drinks' => ['Iced Black Coffee|drink','Coconut Coffee|drink','Lychee Iced Tea|drink','Passion Fruit Soda|drink','Sugarcane Juice|drink','Jasmine Iced Tea|drink'],
            ],
            'mexican' => [
                'Starters' => ['Queso Fundido|starter','Ceviche de Camarón|seafood','Sopa de Tortilla|soup','Esquites|starter','Pico de Gallo & Chips|starter'],
                'Tacos' => ['Fish Tacos|sandwich','Chicken Tinga Tacos|sandwich','Barbacoa Tacos|sandwich','Mushroom Tacos|sandwich','Baja Shrimp Tacos|sandwich'],
                'Mains' => ['Chiles Rellenos|vegetarian','Enchiladas Verdes|plated','Carne Asada Plate|grill','Cochinita Pibil|stew','Chicken Tamales|plated'],
                'Vegetarian' => ['Veggie Burrito Bowl|rice','Black Bean Enchiladas|vegetarian','Nopales Salad|salad'],
                'Sides' => ['Refried Beans|side','Street Corn Rice|rice','Mexican Slaw|salad'],
                'Desserts' => ['Sopapillas|dessert','Arroz con Leche|dessert','Chocoflan|dessert','Mexican Chocolate Cake|dessert'],
                'Drinks' => ['Agua Fresca Jamaica|drink','Agua Fresca Tamarindo|drink','Lime Agua Fresca|drink','Mexican Cola|drink','Fresh Lemonade|drink','Café de Olla|drink'],
            ],
            'mediterranean' => [
                'Starters' => ['Dolmades|starter','Whipped Feta|mezze','Olive & Feta Plate|mezze','Roasted Red Pepper Dip|mezze','Grilled Artichokes|vegetarian'],
                'Seafood' => ['Grilled Salmon|seafood','Baked Sea Bream|seafood','Prawn Saganaki|seafood','Mussels Tomato Feta|seafood','Seafood Skewers|seafood'],
                'Grill' => ['Beef Souvlaki|grill','Lamb Kofta|grill','Grilled Chicken Plate|grill','Mixed Souvlaki|grill'],
                'Mains' => ['Chicken Gyros Plate|plated','Orzo Chicken|pasta','Baked Feta Pasta|pasta'],
                'Salads' => ['Village Salad|salad','Tabbouleh Salad|salad','Lentil Salad|salad'],
                'Sides' => ['Herbed Rice|rice','Roasted Vegetables|side','Pita Basket|bread'],
                'Desserts' => ['Loukoumades|dessert','Galaktoboureko|dessert','Orange Semolina Cake|dessert'],
                'Drinks' => ['Greek Coffee|drink','Mint Tea|drink','Lemon Mint Cooler|drink','Pomegranate Juice|drink','Sparkling Water|drink','Still Water|drink'],
            ],
            'steakhouse' => [
                'Starters' => ['Bone Marrow Toast|starter','Prawn Cocktail|seafood','Beef Carpaccio|starter','Wedge Salad|salad','Caesar with Bacon|salad'],
                'Steaks' => ['Porterhouse Steak|grill','T-Bone 450g|grill','Flat Iron Steak|grill','Bavette Steak|grill','Surf & Turf|grill'],
                'Grill' => ['Lamb Chops|grill','BBQ Chicken|grill','Pork Ribs|grill','Grilled Prawns|seafood','Beef Skewers|grill'],
                'Sides' => ['Garlic Mash|side','Truffle Fries|side','Sweet Potato Fries|side','Grilled Asparagus|side','Steakhouse Mac & Cheese|pasta','House Salad|salad'],
                'Sauces' => ['Chimichurri|side','Béarnaise Sauce|side','Red Wine Jus|side'],
                'Desserts' => ['Apple Pie|dessert','Pecan Pie|dessert','Ice Cream Sundae|dessert'],
                'Drinks' => ['Still Water|drink','Sparkling Water|drink','Cola|drink','Cola Zero|drink','Ginger Ale|drink','Fresh Lemonade|drink'],
            ],
            'cafe' => [
                'Breakfast' => ['Full Breakfast|plated','Vegetarian Breakfast|vegetarian','Porridge|plated','Chia Pudding|dessert','Breakfast Bagel|sandwich'],
                'Brunch' => ['Classic Omelette|plated','Turkish Eggs|plated','Halloumi Avocado Toast|sandwich','Croque Madame|sandwich','Breakfast Hash|plated'],
                'Lunch' => ['Grilled Cheese|sandwich','Tomato Soup & Toastie|soup','Chicken Caesar Wrap|sandwich','Falafel Wrap|sandwich','Soup of the Day|soup'],
                'Bakery' => ['Pain au Chocolat|bread','Banana Bread|bread','Chocolate Muffin|dessert','Lemon Loaf|dessert','Scone|bread'],
                'Coffee' => ['Espresso|drink','Americano|drink','Latte|drink','Mocha|drink','Macchiato|drink','Hot Chocolate|drink'],
                'Cold Drinks' => ['Iced Americano|drink','Cold Brew|drink','House Lemonade|drink','Apple Juice|drink'],
            ],
            'fine_dining' => [
                'Starters' => ['Foie Gras Parfait|starter','Cured Salmon|seafood','Octopus Carpaccio|seafood','Roasted Beetroot|vegetarian','Asparagus Velouté|soup'],
                'Mains' => ['Venison Loin|grill','Turbot|seafood','Lobster Tail|seafood','Veal Tenderloin|grill','Truffle Chicken|plated'],
                'Vegetarian' => ['Cauliflower Steak|vegetarian','Beetroot Wellington|vegetarian','Celeriac Risotto|rice','Pumpkin Ravioli|pasta'],
                'Sides' => ['Truffle Mash|side','Pommes Anna|side','Charred Broccolini|side','Glazed Shallots|side'],
                'Cheese' => ['Comté Selection|starter','Blue Cheese Selection|starter'],
                'Desserts' => ['Chocolate Soufflé|dessert','Vanilla Mille-Feuille|dessert','Raspberry Pavlova|dessert','Pistachio Parfait|dessert'],
                'Drinks' => ['Sparkling Water|drink','Still Water|drink','House Kombucha|drink','Elderflower Spritz Zero|drink','Citrus Tonic|drink','Espresso|drink'],
            ],
            'bar' => [
                'Bar Bites' => ['Jalapeño Poppers|starter','Garlic Bread|bread','Potato Skins|starter','Mini Sausage Rolls|sausage','Fried Pickles|starter'],
                'Sharing' => ['Nacho Platter|starter','Chicken Platter|grill','Veggie Sharing Board|vegetarian','Loaded Fries|side'],
                'Mains' => ['BBQ Pulled Beef Burger|sandwich','Grilled Chicken Sandwich|sandwich','Steak Sandwich|sandwich','Bar Mac & Cheese|pasta','Caesar Chicken Salad|salad'],
                'Sides' => ['Fries|side','Sweet Potato Fries|side','Onion Rings|side','Coleslaw|salad','Side Salad|salad'],
                'Desserts' => ['Ice Cream Sundae|dessert','Churros Bites|dessert','Apple Crumble|dessert'],
                'Zero-Proof' => ['Virgin Mojito|drink','Passion Fruit Cooler|drink','Ginger Beer|drink','Cola|drink','Cola Zero|drink','Lemonade|drink','Tonic & Lime|drink','Iced Tea|drink'],
            ],
        ];
    }
}
