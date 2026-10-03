<?php

namespace Admin\Services;

/**
 * PMD_STARTER_MENU_LIBRARY_V2
 *
 * V2 keeps the original starter catalogue as a safe baseline, then expands
 * every restaurant type into a fuller editable menu. The goal is a useful
 * starting restaurant menu, not a two-item demo category.
 *
 * Nutrition/allergen values remain suggestions only and must be reviewed by
 * the restaurant against its real recipes before publishing.
 */
class PmdStarterMenuLibraryV2 extends PmdStarterMenuLibraryV1
{
    public const VERSION = '2.0.0';

    public function pack(string $type): array
    {
        $type = strtolower(trim($type));
        $base = parent::pack($type);
        $items = [];
        $seen = [];

        foreach ((array)($base['items'] ?? []) as $item) {
            if (!is_array($item)) continue;
            $item = $this->decorate($item, $type);
            $key = mb_strtolower(trim((string)($item['name'] ?? '')));
            if ($key === '' || isset($seen[$key])) continue;
            $seen[$key] = true;
            $items[] = $item;
        }

        foreach ($this->extensions($type) as $item) {
            $key = mb_strtolower(trim((string)($item['name'] ?? '')));
            if ($key === '' || isset($seen[$key])) continue;
            $seen[$key] = true;
            $items[] = $item;
        }

        $categories = [];
        foreach ($items as $item) {
            $category = trim((string)($item['category'] ?? ''));
            if ($category !== '' && !in_array($category, $categories, true)) $categories[] = $category;
        }

        return [
            'version' => self::VERSION,
            'type' => $type,
            'categories' => $categories,
            'items' => $items,
        ];
    }

    private function decorate(array $item, string $type): array
    {
        $name = trim((string)($item['name'] ?? ''));
        $category = trim((string)($item['category'] ?? ''));
        $override = $this->visualOverrides()[mb_strtolower($name)] ?? [];

        $item['image_family'] = (string)($override['family'] ?? $this->familyFor($name, $category));
        $item['image_query'] = (string)($override['query'] ?? $name);
        $item['image_forbid'] = array_values((array)($override['forbid'] ?? []));
        $item['starter_library_version'] = self::VERSION;
        $item['restaurant_type'] = $type;

        return $item;
    }

    private function x(
        string $name,
        string $description,
        string $category,
        float $price,
        array $allergens = [],
        array $flags = []
    ): array {
        $family = (string)($flags['image_family'] ?? $this->familyFor($name, $category));
        $nutrition = $this->nutritionForFamily($family);

        return [
            'name' => $name,
            'description' => $description,
            'category' => $category,
            'price' => $price,
            'allergens' => $allergens,
            'prep' => (int)($flags['prep'] ?? 15),
            'halal' => !empty($flags['halal']),
            'vegetarian' => !empty($flags['vegetarian']),
            'vegan' => !empty($flags['vegan']),
            'chef' => !empty($flags['chef']),
            'bestseller' => !empty($flags['bestseller']),
            'nutrition' => $nutrition,
            'image_family' => $family,
            'image_query' => (string)($flags['image_query'] ?? $name),
            'image_forbid' => array_values((array)($flags['image_forbid'] ?? [])),
            'starter_library_version' => self::VERSION,
        ];
    }

    private function nutritionForFamily(string $family): array
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

    private function familyFor(string $name, string $category): string
    {
        $value = mb_strtolower($name.' '.$category);

        if (preg_match('/pizza|pide|lahmacun|flammkuchen/u', $value)) return 'pizza';
        if (preg_match('/pasta|spaghetti|tagliatelle|linguine|penne|gnocchi|noodle|spätzle|spaetzle|mac & cheese|macaroni/u', $value)) return 'pasta';
        if (preg_match('/risotto|paella|rice|polo|tahchin|maqluba|mansaf|donburi|don\b|bowl/u', $value)) return 'rice';
        if (preg_match('/ramen|phở|pho|soup|suppe|çorbası|corbasi|gazpacho|pozole/u', $value)) return 'soup';
        if (preg_match('/sushi|nigiri|roll/u', $value)) return 'sushi';
        if (preg_match('/dumpling|gyoza|manti|mantı|har gow|xiaolongbao|xiao long bao/u', $value)) return 'dumpling';
        if (preg_match('/salad|fattoush|tabbouleh|tabbouli|shirazi|coleslaw/u', $value)) return 'salad';
        if (preg_match('/mezze|meze|hummus|labneh|haydari|baba ghanoush|muhammara|dip/u', $value)) return 'mezze';
        if (preg_match('/dessert|cake|tiram|panna cotta|baklava|kunafa|künefe|pudding|ice cream|gelato|churro|fondant|brûlée|brulee|strudel|brownie|cheesecake|cannoli|mochi|flan|affogato/u', $value)) return 'dessert';
        if (preg_match('/coffee|latte|espresso|tea|juice|lemonade|soda|horchata|mocktail|cocktail|drink/u', $value)) return 'drink';
        if (preg_match('/sandwich|panini|toast|burger|slider|taco|burrito|quesadilla|bánh mì|banh mi/u', $value)) return 'sandwich';
        if (preg_match('/fish|salmon|tuna|cod|bass|prawn|shrimp|scallop|calamari|octopus|seafood|mussel/u', $value)) return 'seafood';
        if (preg_match('/steak|kebab|grill|rib|chop|schnitzel|shawarma|chicken|beef|lamb|duck|pork|kofta|bratwurst|currywurst|sausage/u', $value)) return 'grill';
        if (preg_match('/stew|goulash|gulasch|ghormeh|fesenjan|gheymeh|khoresh|roulade|sauerbraten/u', $value)) return 'stew';
        if (preg_match('/bread|pretzel|brezel|croissant|börek|borek|bruschetta/u', $value)) return 'bread';
        if (preg_match('/side|potato|fries|sauerkraut|rotkohl|tahdig/u', $value)) return 'side';
        if (preg_match('/vegetarian|vegetable|tofu|aubergine|eggplant|halloumi/u', $value)) return 'vegetarian';
        if (preg_match('/starter|appetizer|antipasti|tapas|bar bites/u', $value)) return 'starter';

        return 'plated';
    }

    private function visualOverrides(): array
    {
        return [
            'margherita' => ['family'=>'pizza','query'=>'margherita pizza basil mozzarella','forbid'=>['tuna','onion pizza']],
            'diavola' => ['family'=>'pizza','query'=>'spicy salami pepperoni pizza','forbid'=>['vegetarian pizza','arugula pizza']],
            'spaghetti carbonara' => ['family'=>'pasta','query'=>'creamy spaghetti carbonara pancetta','forbid'=>['tomato sauce','red sauce','bolognese']],
            'tagliatelle al ragù' => ['family'=>'pasta','query'=>'tagliatelle beef ragu bolognese pasta','forbid'=>['seafood']],
            'risotto ai funghi' => ['family'=>'rice','query'=>'creamy mushroom risotto parmesan','forbid'=>['pasta','steak']],
            'burrata & tomato' => ['family'=>'salad','query'=>'burrata cheese tomato salad white plate','forbid'=>['eggplant','chicken parmigiana']],
            'bruschetta' => ['family'=>'bread','query'=>'tomato basil bruschetta toast','forbid'=>['chicken','stuffed vegetable']],
            'melanzane alla parmigiana' => ['family'=>'vegetarian','query'=>'eggplant aubergine parmigiana','forbid'=>['chicken parmigiana']],
            'tiramisù' => ['family'=>'dessert','query'=>'tiramisu dessert slice cocoa','forbid'=>['ice cream sundae']],
            'panna cotta' => ['family'=>'dessert','query'=>'panna cotta berry dessert','forbid'=>['ice cream']],
            'flat white' => ['family'=>'drink','query'=>'flat white coffee ceramic cup','forbid'=>['iced coffee']],
            'mixed grill' => ['family'=>'grill','query'=>'middle eastern mixed grill kebab plate','forbid'=>['people','buffet']],
            'ribeye 300g' => ['family'=>'grill','query'=>'ribeye steak white plate restaurant','forbid'=>['raw steak']],
            'filet mignon 220g' => ['family'=>'grill','query'=>'filet mignon steak plated restaurant','forbid'=>['raw steak']],
            'new york strip 300g' => ['family'=>'grill','query'=>'new york strip steak plated','forbid'=>['raw steak']],
            'avocado toast' => ['family'=>'sandwich','query'=>'avocado toast poached egg cafe plate','forbid'=>['hands']],
            'eggs benedict' => ['family'=>'plated','query'=>'eggs benedict hollandaise english muffin','forbid'=>['fried eggs breakfast pan']],
        ];
    }

    private function extensions(string $type): array
    {
        $method = 'extra'.str_replace(' ', '', ucwords(str_replace('_', ' ', $type)));
        return method_exists($this, $method) ? $this->{$method}() : [];
    }

    private function extraItalian(): array
    {
        return [
            $this->x('Prosciutto e Funghi', 'Tomato, mozzarella, ham and mushrooms.', 'Pizza', 16.90, ['Gluten','Milk']),
            $this->x('Quattro Formaggi', 'Mozzarella, gorgonzola, fontina and parmesan.', 'Pizza', 16.50, ['Gluten','Milk'], ['vegetarian'=>1]),
            $this->x('Vegetariana', 'Tomato, mozzarella, peppers, courgette and mushrooms.', 'Pizza', 15.50, ['Gluten','Milk'], ['vegetarian'=>1]),
            $this->x('Capricciosa', 'Tomato, mozzarella, ham, mushroom, artichoke and olives.', 'Pizza', 17.50, ['Gluten','Milk']),
            $this->x('Penne all\'Arrabbiata', 'Penne with tomato, garlic, chilli and parsley.', 'Pasta', 15.90, ['Gluten'], ['vegan'=>1]),
            $this->x('Gnocchi al Pesto', 'Potato gnocchi with basil pesto and parmesan.', 'Pasta', 17.50, ['Gluten','Milk','Nuts'], ['vegetarian'=>1]),
            $this->x('Linguine ai Frutti di Mare', 'Linguine with prawns, mussels, squid, garlic and tomato.', 'Pasta', 22.90, ['Gluten','Crustaceans','Molluscs'], ['chef'=>1]),
            $this->x('Arancini', 'Crisp risotto balls with mozzarella and tomato sauce.', 'Starters', 9.90, ['Gluten','Eggs','Milk'], ['vegetarian'=>1]),
            $this->x('Pollo alla Milanese', 'Breaded chicken cutlet with lemon and rocket salad.', 'Mains', 19.90, ['Gluten','Eggs']),
            $this->x('Branzino al Limone', 'Grilled sea bass with lemon, herbs and seasonal vegetables.', 'Mains', 24.90, ['Fish'], ['chef'=>1]),
            $this->x('Saltimbocca alla Romana', 'Veal with prosciutto, sage and white wine sauce.', 'Mains', 24.50, ['Sulphites']),
            $this->x('Insalata Mista', 'Mixed leaves, tomato, cucumber and house vinaigrette.', 'Salads & Sides', 8.50, ['Sulphites'], ['vegan'=>1]),
            $this->x('Patate al Rosmarino', 'Roasted potatoes with rosemary, garlic and olive oil.', 'Salads & Sides', 6.90, [], ['vegan'=>1]),
            $this->x('Cannoli Siciliani', 'Crisp pastry tubes with sweet ricotta and pistachio.', 'Desserts', 9.50, ['Gluten','Milk','Nuts'], ['vegetarian'=>1]),
        ];
    }

    private function extraGerman(): array
    {
        return [
            $this->x('Gulaschsuppe', 'Rich beef and paprika soup with potato and herbs.', 'Starters', 8.90, ['Celery']),
            $this->x('Obatzda & Brezel', 'Bavarian cheese spread with warm pretzel and onion.', 'Starters', 8.90, ['Gluten','Milk'], ['vegetarian'=>1]),
            $this->x('Jägerschnitzel', 'Breaded pork schnitzel with creamy mushroom sauce and fries.', 'Classics', 19.90, ['Gluten','Eggs','Milk']),
            $this->x('Leberkäse mit Spiegelei', 'Pan-seared Bavarian meatloaf with fried egg and potato salad.', 'Classics', 15.90, ['Eggs','Mustard']),
            $this->x('Sauerbraten', 'Marinated braised beef with gravy, red cabbage and dumplings.', 'Mains', 23.90, ['Gluten','Celery','Sulphites']),
            $this->x('Schweinshaxe', 'Roasted pork knuckle with sauerkraut and potato dumpling.', 'Mains', 24.90, ['Gluten']),
            $this->x('Kartoffelpuffer', 'Crisp potato pancakes with apple sauce.', 'Vegetarian', 10.90, ['Eggs'], ['vegetarian'=>1]),
            $this->x('Pilzrahm Spätzle', 'Spaetzle with creamy mushroom sauce and herbs.', 'Vegetarian', 15.90, ['Gluten','Eggs','Milk'], ['vegetarian'=>1]),
            $this->x('Kartoffelsalat', 'German potato salad with herbs and mustard dressing.', 'Sides', 5.90, ['Mustard'], ['vegetarian'=>1]),
            $this->x('Kaiserschmarrn', 'Fluffy torn pancake with raisins and plum compote.', 'Desserts', 9.50, ['Gluten','Eggs','Milk'], ['vegetarian'=>1]),
        ];
    }

    private function extraTurkish(): array
    {
        return [
            $this->x('Ezogelin Çorbası', 'Lentil and bulgur soup with tomato, mint and pepper.', 'Starters', 7.90, ['Gluten'], ['vegan'=>1,'halal'=>1]),
            $this->x('Hummus', 'Chickpea tahini dip with lemon and olive oil.', 'Meze', 7.50, ['Sesame'], ['vegan'=>1,'halal'=>1]),
            $this->x('Haydari', 'Thick yoghurt dip with herbs and garlic.', 'Meze', 7.50, ['Milk'], ['vegetarian'=>1]),
            $this->x('Acılı Ezme', 'Spicy chopped tomato, pepper and herb salad.', 'Meze', 7.50, [], ['vegan'=>1,'halal'=>1]),
            $this->x('Urfa Kebab', 'Mild minced lamb skewer with bulgur and grilled pepper.', 'Grill', 19.90, ['Gluten'], ['halal'=>1]),
            $this->x('Kuzu Şiş', 'Marinated lamb skewers with bulgur and charred vegetables.', 'Grill', 21.90, [], ['halal'=>1]),
            $this->x('Karnıyarık', 'Aubergine filled with spiced minced beef and tomato.', 'Mains', 17.90, [], ['halal'=>1]),
            $this->x('Lahmacun', 'Thin flatbread with minced beef, tomato, pepper and herbs.', 'Mains', 10.90, ['Gluten'], ['halal'=>1]),
            $this->x('Pide Kuşbaşılı', 'Boat-shaped flatbread with diced beef, peppers and tomato.', 'Mains', 16.90, ['Gluten'], ['halal'=>1]),
            $this->x('Künefe', 'Warm shredded pastry with cheese, pistachio and syrup.', 'Desserts', 9.50, ['Gluten','Milk','Nuts'], ['vegetarian'=>1]),
        ];
    }

    private function extraArabic(): array
    {
        return [
            $this->x('Muhammara', 'Roasted red pepper and walnut dip with pomegranate molasses.', 'Mezze', 8.50, ['Nuts'], ['vegan'=>1,'halal'=>1]),
            $this->x('Labneh', 'Strained yoghurt with olive oil, za\'atar and herbs.', 'Mezze', 7.90, ['Milk','Sesame'], ['vegetarian'=>1]),
            $this->x('Kibbeh', 'Crisp bulgur shells filled with spiced beef and pine nuts.', 'Mezze', 10.90, ['Gluten','Nuts'], ['halal'=>1]),
            $this->x('Tabbouleh', 'Parsley, tomato, bulgur, mint and lemon.', 'Salads', 9.90, ['Gluten'], ['vegan'=>1,'halal'=>1]),
            $this->x('Shish Tawook', 'Garlic-marinated chicken skewers with rice and toum.', 'Grill', 18.90, ['Eggs'], ['halal'=>1]),
            $this->x('Lamb Chops', 'Grilled lamb chops with herbs, rice and vegetables.', 'Grill', 24.90, [], ['halal'=>1]),
            $this->x('Mansaf', 'Lamb with jameed yoghurt sauce, rice and toasted nuts.', 'Mains', 24.90, ['Milk','Nuts'], ['halal'=>1]),
            $this->x('Sayadiyah', 'Spiced fish and caramelised onion rice with tahini.', 'Mains', 21.90, ['Fish','Sesame'], ['halal'=>1]),
            $this->x('Batata Harra', 'Spiced potatoes with coriander, garlic and chilli.', 'Sides', 7.50, [], ['vegan'=>1,'halal'=>1]),
            $this->x('Umm Ali', 'Warm bread pudding with milk, nuts and raisins.', 'Desserts', 8.50, ['Gluten','Milk','Nuts'], ['vegetarian'=>1]),
        ];
    }

    private function extraPersian(): array
    {
        return [
            $this->x('Mast-o Khiar', 'Yoghurt with cucumber, herbs and dried mint.', 'Starters', 7.50, ['Milk'], ['vegetarian'=>1]),
            $this->x('Salad Shirazi', 'Tomato, cucumber, onion, lime and dried mint.', 'Starters', 7.50, [], ['vegan'=>1]),
            $this->x('Kebab Barg', 'Tender marinated beef fillet skewer with saffron rice.', 'Kebabs', 25.90, [], ['halal'=>1,'chef'=>1]),
            $this->x('Shishlik', 'Saffron-marinated lamb chops with rice and grilled tomato.', 'Kebabs', 27.90, [], ['halal'=>1]),
            $this->x('Gheymeh', 'Split pea and beef stew with dried lime and crisp potatoes.', 'Stews', 19.90, [], ['halal'=>1]),
            $this->x('Khoresh Bademjan', 'Aubergine and tomato stew with tender beef.', 'Stews', 20.50, [], ['halal'=>1]),
            $this->x('Baghali Polo ba Mahiche', 'Dill and broad bean rice with slow-cooked lamb shank.', 'Mains', 25.90, [], ['halal'=>1]),
            $this->x('Tahchin Morgh', 'Saffron yoghurt rice cake layered with chicken.', 'Mains', 19.90, ['Milk','Eggs'], ['halal'=>1]),
            $this->x('Sabzi Khordan', 'Fresh herbs, radish, feta and walnuts.', 'Sides', 7.90, ['Milk','Nuts'], ['vegetarian'=>1]),
            $this->x('Faloodeh', 'Frozen rosewater noodles with lime and sour cherry syrup.', 'Desserts', 8.50, [], ['vegan'=>1]),
        ];
    }

    private function extraSpanish(): array
    {
        return [
            $this->x('Pan con Tomate', 'Toasted bread rubbed with tomato, garlic and olive oil.', 'Tapas', 7.50, ['Gluten'], ['vegan'=>1]),
            $this->x('Albóndigas', 'Spanish meatballs in rich tomato and paprika sauce.', 'Tapas', 10.90, ['Gluten','Eggs']),
            $this->x('Pimientos de Padrón', 'Blistered green peppers with sea salt.', 'Tapas', 8.50, [], ['vegan'=>1]),
            $this->x('Gazpacho', 'Chilled tomato, cucumber and pepper soup.', 'Starters', 8.50, [], ['vegan'=>1]),
            $this->x('Arroz Negro', 'Squid-ink rice with calamari, prawns and aioli.', 'Paella', 23.90, ['Crustaceans','Molluscs','Eggs']),
            $this->x('Pollo al Ajillo', 'Garlic chicken with white wine, parsley and roasted potatoes.', 'Mains', 18.90, ['Sulphites']),
            $this->x('Bacalao a la Vizcaína', 'Cod with roasted pepper and tomato sauce.', 'Mains', 22.90, ['Fish']),
            $this->x('Patatas Alioli', 'Roasted potatoes with garlic aioli and parsley.', 'Sides', 7.50, ['Eggs'], ['vegetarian'=>1]),
            $this->x('Tarta de Santiago', 'Galician almond cake with citrus and icing sugar.', 'Desserts', 8.90, ['Eggs','Nuts'], ['vegetarian'=>1]),
            $this->x('Flan de Vainilla', 'Silky vanilla caramel custard.', 'Desserts', 7.90, ['Eggs','Milk'], ['vegetarian'=>1]),
        ];
    }

    private function extraJapanese(): array
    {
        return [
            $this->x('Spicy Tuna Roll', 'Tuna, cucumber and spicy mayo rolled with sushi rice.', 'Sushi', 13.90, ['Fish','Eggs','Sesame']),
            $this->x('California Roll', 'Crab, avocado and cucumber rolled with sushi rice.', 'Sushi', 12.90, ['Crustaceans','Eggs','Sesame']),
            $this->x('Gyoza', 'Pan-seared chicken and vegetable dumplings with soy dipping sauce.', 'Starters', 9.50, ['Gluten','Soybeans']),
            $this->x('Agedashi Tofu', 'Crisp tofu in light dashi broth with spring onion.', 'Starters', 8.90, ['Soybeans','Fish']),
            $this->x('Prawn Tempura', 'Light crisp prawns with tentsuyu dipping sauce.', 'Starters', 12.90, ['Gluten','Crustaceans']),
            $this->x('Shoyu Ramen', 'Soy-seasoned chicken broth, noodles, egg and spring onion.', 'Ramen', 17.90, ['Gluten','Eggs','Soybeans']),
            $this->x('Gyudon', 'Thin-sliced beef and onion over steamed rice.', 'Rice Bowls', 16.90, ['Soybeans']),
            $this->x('Chicken Katsu Curry', 'Crisp chicken cutlet with Japanese curry and rice.', 'Rice Bowls', 17.90, ['Gluten','Eggs']),
            $this->x('Yakitori', 'Glazed chicken skewers with spring onion.', 'Grill', 12.90, ['Soybeans'], ['image_query'=>'japanese yakitori chicken skewers']),
            $this->x('Dorayaki', 'Soft pancakes filled with sweet red bean paste.', 'Desserts', 7.50, ['Gluten','Eggs'], ['vegetarian'=>1]),
        ];
    }

    private function extraChinese(): array
    {
        return [
            $this->x('Hot & Sour Soup', 'Peppery broth with tofu, mushroom, bamboo and egg.', 'Starters', 7.90, ['Eggs','Soybeans']),
            $this->x('Scallion Pancakes', 'Crisp layered pancakes with spring onion and soy dip.', 'Starters', 7.90, ['Gluten','Soybeans'], ['vegan'=>1]),
            $this->x('Xiao Long Bao', 'Steamed pork soup dumplings with ginger vinegar.', 'Dim Sum', 11.90, ['Gluten','Soybeans']),
            $this->x('Char Siu Pork', 'Cantonese barbecue pork with honey-soy glaze.', 'Mains', 18.90, ['Soybeans']),
            $this->x('Cantonese Roast Duck', 'Roast duck with crisp skin, pak choi and plum sauce.', 'Mains', 21.90, ['Soybeans']),
            $this->x('Twice-Cooked Pork', 'Sichuan pork belly with peppers, leeks and chilli bean paste.', 'Mains', 18.90, ['Soybeans']),
            $this->x('Braised Beef Noodles', 'Slow-braised beef, wheat noodles and aromatic broth.', 'Rice & Noodles', 17.90, ['Gluten','Soybeans']),
            $this->x('Vegetable Chow Mein', 'Wok-fried noodles with seasonal vegetables and soy sauce.', 'Rice & Noodles', 14.90, ['Gluten','Soybeans'], ['vegan'=>1]),
            $this->x('Garlic Pak Choi', 'Wok-seared pak choi with garlic and light soy.', 'Vegetarian', 11.90, ['Soybeans'], ['vegan'=>1]),
            $this->x('Sesame Balls', 'Crisp glutinous rice balls with sweet red bean filling.', 'Desserts', 7.50, ['Sesame'], ['vegan'=>1]),
        ];
    }

    private function extraVietnamese(): array
    {
        return [
            $this->x('Bánh Xèo', 'Crisp turmeric rice pancake with prawns, pork and herbs.', 'Starters', 11.90, ['Crustaceans']),
            $this->x('Gỏi Gà', 'Chicken, cabbage and herb salad with lime dressing.', 'Starters', 10.90, ['Fish']),
            $this->x('Bún Bò Huế', 'Spicy lemongrass beef noodle soup with herbs and lime.', 'Noodle Soups', 17.90, ['Fish']),
            $this->x('Cơm Tấm', 'Broken rice with grilled pork, pickles and fried egg.', 'Mains', 17.50, ['Eggs','Fish']),
            $this->x('Cá Kho Tộ', 'Caramelised fish in clay-pot sauce with steamed rice.', 'Mains', 18.90, ['Fish']),
            $this->x('Lemongrass Chicken Rice', 'Grilled lemongrass chicken with jasmine rice and pickles.', 'Mains', 16.90, ['Fish']),
            $this->x('Bánh Mì Pork', 'Crisp baguette with pork, pickles, herbs and chilli.', 'Mains', 12.90, ['Gluten','Soybeans']),
            $this->x('Bánh Mì Tofu', 'Crisp baguette with lemongrass tofu, pickles and herbs.', 'Mains', 11.90, ['Gluten','Soybeans'], ['vegan'=>1]),
            $this->x('Coconut Tapioca', 'Warm coconut tapioca pudding with banana and sesame.', 'Desserts', 7.50, ['Sesame'], ['vegan'=>1]),
            $this->x('Fresh Lime Soda', 'Fresh lime, sparkling water and light cane syrup.', 'Drinks', 5.50, [], ['vegan'=>1]),
        ];
    }

    private function extraMexican(): array
    {
        return [
            $this->x('Birria Tacos', 'Slow-cooked beef tacos with onion, coriander and consommé.', 'Tacos', 17.90, [], ['bestseller'=>1]),
            $this->x('Carnitas Tacos', 'Slow-cooked pork tacos with salsa verde, onion and lime.', 'Tacos', 15.90),
            $this->x('Chicken Quesadilla', 'Toasted tortilla with chicken, cheese, peppers and salsa.', 'Mains', 15.90, ['Gluten','Milk']),
            $this->x('Enchiladas Rojas', 'Corn tortillas with chicken, red chilli sauce and cheese.', 'Mains', 17.90, ['Milk']),
            $this->x('Mole Poblano Chicken', 'Chicken with rich chilli, spice and cocoa mole sauce.', 'Mains', 19.90, ['Nuts','Sesame']),
            $this->x('Pozole Rojo', 'Red chilli hominy soup with pork, cabbage and radish.', 'Mains', 16.90),
            $this->x('Elote', 'Charred corn with lime, chilli, cheese and crema.', 'Starters', 8.50, ['Milk'], ['vegetarian'=>1]),
            $this->x('Mexican Rice', 'Tomato-seasoned rice with vegetables and herbs.', 'Sides', 5.90, [], ['vegan'=>1]),
            $this->x('Flan', 'Caramel custard with vanilla and citrus.', 'Desserts', 7.90, ['Eggs','Milk'], ['vegetarian'=>1]),
            $this->x('Horchata', 'Chilled cinnamon rice drink with vanilla.', 'Drinks', 5.50, [], ['vegetarian'=>1]),
        ];
    }

    private function extraMediterranean(): array
    {
        return [
            $this->x('Baba Ghanoush', 'Smoked aubergine dip with tahini, lemon and olive oil.', 'Starters', 8.50, ['Sesame'], ['vegan'=>1]),
            $this->x('Tzatziki & Pita', 'Greek yoghurt, cucumber, garlic and warm pita.', 'Starters', 8.50, ['Gluten','Milk'], ['vegetarian'=>1]),
            $this->x('Falafel', 'Herb falafel with tahini, pickles and salad.', 'Starters', 10.90, ['Sesame'], ['vegan'=>1]),
            $this->x('Grilled Octopus', 'Tender octopus with lemon, oregano and olive oil.', 'Seafood', 19.90, ['Molluscs'], ['chef'=>1]),
            $this->x('Crispy Calamari', 'Lightly fried calamari with lemon and garlic aioli.', 'Seafood', 15.90, ['Gluten','Molluscs','Eggs']),
            $this->x('Lamb Souvlaki', 'Herb-marinated lamb skewers with pita and tzatziki.', 'Grill', 20.90, ['Gluten','Milk']),
            $this->x('Stuffed Peppers', 'Peppers filled with herbed rice, tomato and pine nuts.', 'Mains', 16.90, ['Nuts'], ['vegan'=>1]),
            $this->x('Spanakopita', 'Crisp filo pastry with spinach, feta and herbs.', 'Mains', 14.90, ['Gluten','Milk'], ['vegetarian'=>1]),
            $this->x('Lemon Potatoes', 'Roasted potatoes with lemon, oregano and olive oil.', 'Sides', 6.90, [], ['vegan'=>1]),
            $this->x('Orange Olive Oil Cake', 'Moist citrus cake with olive oil and yoghurt cream.', 'Desserts', 8.90, ['Gluten','Eggs','Milk'], ['vegetarian'=>1]),
        ];
    }

    private function extraSteakhouse(): array
    {
        return [
            $this->x('Tomahawk Steak', 'Large bone-in rib steak for sharing with roasted garlic jus.', 'Steaks', 59.90, ['Milk'], ['chef'=>1,'prep'=>28,'image_query'=>'tomahawk ribeye steak plated']),
            $this->x('Sirloin 300g', 'Chargrilled sirloin with herb butter and fries.', 'Steaks', 29.90, ['Milk'], ['image_query'=>'sirloin steak restaurant plate']),
            $this->x('Steak Tartare', 'Hand-cut beef with capers, mustard and cured egg yolk.', 'Starters', 16.90, ['Eggs','Mustard']),
            $this->x('French Onion Soup', 'Slow-cooked onion soup with toasted bread and melted cheese.', 'Starters', 9.90, ['Gluten','Milk']),
            $this->x('Steakhouse Burger', 'Beef patty, cheddar, onion, pickles and house sauce.', 'Grill', 18.90, ['Gluten','Eggs','Milk','Mustard']),
            $this->x('Grilled Salmon', 'Salmon fillet with lemon butter and green vegetables.', 'Grill', 23.90, ['Fish','Milk']),
            $this->x('Loaded Baked Potato', 'Baked potato with cheddar, sour cream and chives.', 'Sides', 7.90, ['Milk'], ['vegetarian'=>1]),
            $this->x('Onion Rings', 'Beer-battered onion rings with smoky dip.', 'Sides', 7.50, ['Gluten','Eggs'], ['vegetarian'=>1]),
            $this->x('Peppercorn Sauce', 'Creamy green peppercorn steak sauce.', 'Sides', 4.50, ['Milk'], ['vegetarian'=>1,'image_family'=>'side']),
            $this->x('Sticky Toffee Pudding', 'Warm date sponge with toffee sauce and vanilla ice cream.', 'Desserts', 9.90, ['Gluten','Eggs','Milk'], ['vegetarian'=>1]),
        ];
    }

    private function extraCafe(): array
    {
        return [
            $this->x('Shakshuka', 'Eggs baked in spiced tomato and pepper sauce with sourdough.', 'Brunch', 13.90, ['Eggs','Gluten'], ['vegetarian'=>1]),
            $this->x('French Toast', 'Brioche French toast with berries, maple syrup and mascarpone.', 'Brunch', 12.90, ['Gluten','Eggs','Milk'], ['vegetarian'=>1]),
            $this->x('Breakfast Burrito', 'Egg, avocado, beans, cheese and salsa in a warm tortilla.', 'Breakfast', 12.90, ['Gluten','Eggs','Milk'], ['vegetarian'=>1]),
            $this->x('Açaí Bowl', 'Açaí, banana, berries, granola and coconut.', 'Breakfast', 10.90, ['Gluten','Nuts'], ['vegan'=>1]),
            $this->x('Smoked Salmon Bagel', 'Bagel with smoked salmon, cream cheese, cucumber and dill.', 'Lunch', 13.90, ['Gluten','Fish','Milk']),
            $this->x('Tuna Melt', 'Toasted sourdough with tuna, cheddar and tomato.', 'Lunch', 12.50, ['Gluten','Fish','Milk']),
            $this->x('Quinoa Avocado Salad', 'Quinoa, avocado, roasted vegetables and lemon dressing.', 'Lunch', 12.90, [], ['vegan'=>1]),
            $this->x('Blueberry Muffin', 'Soft vanilla muffin with blueberries and crumb topping.', 'Bakery', 4.90, ['Gluten','Eggs','Milk'], ['vegetarian'=>1]),
            $this->x('Cinnamon Roll', 'Soft cinnamon roll with cream cheese glaze.', 'Bakery', 5.50, ['Gluten','Eggs','Milk'], ['vegetarian'=>1]),
            $this->x('Cappuccino', 'Double espresso with steamed milk and fine foam.', 'Coffee', 4.50, ['Milk'], ['vegetarian'=>1,'prep'=>5]),
            $this->x('Iced Latte', 'Espresso, cold milk and ice.', 'Coffee', 4.90, ['Milk'], ['vegetarian'=>1,'prep'=>5]),
            $this->x('Fresh Orange Juice', 'Freshly pressed orange juice.', 'Cold Drinks', 5.50, [], ['vegan'=>1,'prep'=>5]),
        ];
    }

    private function extraFineDining(): array
    {
        return [
            $this->x('Tuna Tartare', 'Yellowfin tuna, avocado, citrus and sesame dressing.', 'Starters', 19.90, ['Fish','Sesame']),
            $this->x('Lobster Bisque', 'Silky lobster soup with brandy cream and chive oil.', 'Starters', 18.90, ['Crustaceans','Milk','Celery']),
            $this->x('Roasted Halibut', 'Halibut, beurre blanc, asparagus and herb potato.', 'Mains', 32.90, ['Fish','Milk']),
            $this->x('Lamb Loin', 'Pink lamb loin, aubergine, rosemary jus and potato terrine.', 'Mains', 34.90, ['Milk','Celery'], ['chef'=>1]),
            $this->x('Truffle Gnocchi', 'Potato gnocchi, truffle cream, parmesan and wild mushrooms.', 'Mains', 26.90, ['Gluten','Milk'], ['vegetarian'=>1]),
            $this->x('Glazed Carrots', 'Roasted heritage carrots with carrot purée and hazelnut.', 'Vegetarian', 19.90, ['Nuts'], ['vegan'=>1]),
            $this->x('Potato Dauphinoise', 'Layered potato baked with cream, garlic and thyme.', 'Sides', 9.90, ['Milk'], ['vegetarian'=>1]),
            $this->x('Seasonal Greens', 'Buttered seasonal green vegetables with lemon.', 'Sides', 8.90, ['Milk'], ['vegetarian'=>1]),
            $this->x('Lemon Tart', 'Sharp lemon curd tart with crème fraîche.', 'Desserts', 12.90, ['Gluten','Eggs','Milk'], ['vegetarian'=>1]),
            $this->x('Poached Pear', 'Spiced poached pear with vanilla cream and almond.', 'Desserts', 12.50, ['Milk','Nuts'], ['vegetarian'=>1]),
        ];
    }

    private function extraBar(): array
    {
        return [
            $this->x('Buffalo Cauliflower', 'Crisp cauliflower with buffalo glaze and ranch dip.', 'Bar Bites', 9.90, ['Gluten','Milk'], ['vegetarian'=>1]),
            $this->x('Mozzarella Sticks', 'Crisp mozzarella with tomato dipping sauce.', 'Bar Bites', 9.50, ['Gluten','Eggs','Milk'], ['vegetarian'=>1]),
            $this->x('Pulled Beef Nachos', 'Corn chips with pulled beef, cheese, jalapeño and salsa.', 'Sharing', 16.90, ['Milk']),
            $this->x('Mediterranean Sharing Plate', 'Hummus, olives, grilled vegetables, feta and flatbread.', 'Sharing', 17.90, ['Gluten','Milk','Sesame'], ['vegetarian'=>1]),
            $this->x('Classic Cheeseburger', 'Beef patty, cheddar, pickles, onion and house sauce.', 'Mains', 16.90, ['Gluten','Eggs','Milk','Mustard']),
            $this->x('Crispy Chicken Burger', 'Crisp chicken, slaw, pickles and spicy mayo.', 'Mains', 15.90, ['Gluten','Eggs']),
            $this->x('Fish Tacos', 'Crisp fish, cabbage, lime crema and salsa in tortillas.', 'Mains', 15.90, ['Fish','Milk']),
            $this->x('Sticky Toffee Pudding', 'Warm date sponge with toffee sauce and vanilla ice cream.', 'Desserts', 8.90, ['Gluten','Eggs','Milk'], ['vegetarian'=>1]),
            $this->x('Citrus Spritz Zero', 'Sparkling citrus, tonic and fresh herbs.', 'Zero-Proof', 6.90, [], ['vegan'=>1,'image_family'=>'drink']),
            $this->x('Berry Ginger Cooler', 'Mixed berries, ginger, lime and sparkling water.', 'Zero-Proof', 6.90, [], ['vegan'=>1,'image_family'=>'drink']),
        ];
    }
}
