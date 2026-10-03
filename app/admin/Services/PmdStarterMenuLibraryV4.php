<?php

namespace Admin\Services;

/**
 * PMD_STARTER_MENU_LIBRARY_V4
 *
 * Production-size starter catalogue for new PayMyDine tenants.
 *
 * Contract:
 * - every supported restaurant type has at least 100 editable menu items
 * - every pack keeps the V1/V2/V3 catalogue and only adds missing suggestions
 * - every new item includes description, price, prep time, nutrition, dietary
 *   flags, allergen suggestions and image search metadata
 * - values are onboarding suggestions; the restaurant must review them against
 *   its real recipes before publishing
 */
class PmdStarterMenuLibraryV4 extends PmdStarterMenuLibraryV3
{
    public const VERSION = '4.0.0';
    public const MIN_ITEMS_PER_PACK = 100;
    public const MIN_DRINKS_PER_PACK = 12;

    public function pack(string $type): array
    {
        $type = strtolower(trim($type));
        $base = parent::pack($type);
        $items = [];
        $seen = [];

        foreach ((array)($base['items'] ?? []) as $item) {
            if (!is_array($item)) continue;
            $key = $this->key((string)($item['name'] ?? ''));
            if ($key === '' || isset($seen[$key])) continue;
            $seen[$key] = true;
            $item['starter_library_version'] = self::VERSION;
            $items[] = $item;
        }

        $index = count($items);
        foreach ((array)($this->expansionCatalogue()[$type] ?? []) as $category => $rows) {
            foreach ((array)$rows as $row) {
                [$name, $family] = array_pad(explode('|', (string)$row, 2), 2, 'plated');
                $name = trim($name);
                $family = strtolower(trim($family)) ?: 'plated';
                $key = $this->key($name);
                if ($key === '' || isset($seen[$key])) continue;

                $seen[$key] = true;
                $items[] = $this->v4Item($name, (string)$category, $family, $type, $index++);
            }
        }

        // Safety net. The named catalogue should normally satisfy the contract,
        // but a deterministic fallback prevents a future parent-library rename
        // from silently taking a cuisine below 100 items.
        $fallbackIndex = 1;
        $fallbackFamilies = ['starter','salad','grill','plated','vegetarian','side','dessert','drink'];
        while (count($items) < self::MIN_ITEMS_PER_PACK) {
            $family = $fallbackFamilies[($fallbackIndex - 1) % count($fallbackFamilies)];
            $name = $this->cuisineLabel($type).' House '.ucfirst($family).' '.$fallbackIndex;
            $key = $this->key($name);
            $fallbackIndex++;
            if (isset($seen[$key])) continue;

            $seen[$key] = true;
            $item = $this->v4Item($name, 'House Specials', $family, $type, $index++);
            $item['image_query'] = $this->fallbackQuery($type, $family);
            $item['image_required'] = $this->requiredTerms($name, $family);
            $items[] = $item;
        }

        $drinkCount = 0;
        foreach ($items as $item) {
            if (($item['image_family'] ?? '') === 'drink') $drinkCount++;
        }
        if ($drinkCount < self::MIN_DRINKS_PER_PACK) {
            throw new \RuntimeException(sprintf(
                'Starter pack %s has only %d drinks; minimum is %d.',
                $type,
                $drinkCount,
                self::MIN_DRINKS_PER_PACK
            ));
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

    protected function v4Item(string $name, string $category, string $family, string $type, int $index): array
    {
        $item = parent::item($name, $category, $family, $type, $index);
        $item['starter_library_version'] = self::VERSION;
        $item['allergens'] = $this->suggestedAllergens($name, $family);
        $item['chef'] = ($index % 17) === 0;
        $item['bestseller'] = ($index % 23) === 0;

        $normal = $this->key($name);
        if (str_contains($normal, 'vegan')) {
            $item['vegetarian'] = true;
            $item['vegan'] = true;
        } elseif (str_contains($normal, 'vegetarian') || str_contains($normal, 'veggie')) {
            $item['vegetarian'] = true;
        }

        return $item;
    }

    protected function suggestedAllergens(string $name, string $family): array
    {
        $text = $this->key($name);
        $allergens = [];

        if (in_array($family, ['pizza','pasta','dumpling','sandwich','bread'], true)) $allergens[] = 'Gluten';
        if ($family === 'dessert') $allergens = array_merge($allergens, ['Milk','Eggs']);
        if (in_array($family, ['pizza','pasta'], true)) $allergens[] = 'Milk';
        if (str_contains($text, 'cheese') || str_contains($text, 'yoghurt') || str_contains($text, 'cream') || str_contains($text, 'latte')) $allergens[] = 'Milk';
        if (str_contains($text, 'egg') || str_contains($text, 'omelette')) $allergens[] = 'Eggs';
        if (str_contains($text, 'salmon') || str_contains($text, 'tuna') || str_contains($text, 'fish') || str_contains($text, 'cod') || str_contains($text, 'sea bass') || str_contains($text, 'mackerel')) $allergens[] = 'Fish';
        if (str_contains($text, 'prawn') || str_contains($text, 'shrimp') || str_contains($text, 'crab') || str_contains($text, 'lobster')) $allergens[] = 'Crustaceans';
        if (str_contains($text, 'mussel') || str_contains($text, 'octopus') || str_contains($text, 'calamari') || str_contains($text, 'squid')) $allergens[] = 'Molluscs';
        if (str_contains($text, 'sesame') || str_contains($text, 'tahini')) $allergens[] = 'Sesame';
        if (str_contains($text, 'peanut')) $allergens[] = 'Peanuts';
        if (str_contains($text, 'soy') || str_contains($text, 'tofu') || str_contains($text, 'miso')) $allergens[] = 'Soybeans';
        if (str_contains($text, 'almond') || str_contains($text, 'walnut') || str_contains($text, 'pistachio') || str_contains($text, 'hazelnut')) $allergens[] = 'Nuts';
        if (str_contains($text, 'mustard')) $allergens[] = 'Mustard';

        return array_values(array_unique($allergens));
    }

    protected function expansionCatalogue(): array
    {
        return [
            'german' => [
                'Starters' => ['Kartoffelsuppe|soup','Gulaschsuppe|soup','Fladlesuppe|soup','Obatzda|mezze','Rettichsalat|salad','Bauernsalat|salad','Kartoffelpuffer|starter','Camembert Gebacken|starter','Brotzeit Teller|starter','Pilzrahmsuppe|soup'],
                'Mains' => ['Sauerbraten|stew','Rinderroulade|stew','Schnitzel Wiener Art|grill','Holsteiner Schnitzel|grill','Paprikaschnitzel|grill','Cordon Bleu|grill','Himmel und Erde|plated','Bauernfruhstuck|plated','Gebratene Ente|plated','Seelachsfilet|seafood'],
                'Sides' => ['Kartoffelknodel|side','Serviettenknodel|side','Sauerkraut|side','Rahmspinat|side','Erbsen und Mohren|side','Kartoffelsalat|salad','Krautsalat|salad','Brezelkorb|bread','Pilzrahm Spatzle|vegetarian','Kasespätzle Klein|vegetarian'],
                'Desserts' => ['Apfelstrudel|dessert','Kaiserschmarrn|dessert','Schwarzwalder Kirschtorte|dessert','Zwetschgenkuchen|dessert','Donauwelle|dessert','Quarkballchen|dessert','Vanillepudding|dessert','Kirschmichel|dessert','Nussecke|dessert','Mohnkuchen|dessert'],
                'Drinks' => ['Johannisbeerschorle|drink','Holunderschorle|drink','Maracujaschorle|drink','Orangenlimonade|drink','Zitronenlimonade|drink','Malzgetrank|drink','Eistee Pfirsich|drink','Eistee Zitrone|drink','Kakao|drink','Krautertee|drink'],
            ],
            'turkish' => [
                'Meze' => ['Haydari|mezze','Acili Ezme|mezze','Humus|mezze','Muhammara|mezze','Kisir|salad','Piyaz|salad','Mercimek Kofte|starter','Sigara Boregi|bread','Mucver|starter','Tarama|mezze'],
                'Grill & Mains' => ['Adana Kebab|grill','Urfa Kebab|grill','Iskender Kebab|grill','Tavuk Sis|grill','Kuzu Sis|grill','Karniyarik|plated','Et Sote|stew','Tavuk Sote|stew','Manti|dumpling','Lahmacun|pizza'],
                'Bakery & Sides' => ['Pide Kiymali|pizza','Pide Kasarli|pizza','Pide Sucuklu|pizza','Su Boregi|bread','Patates Kizartmasi|side','Fasulye Pilaki|vegetarian','Zeytinyagli Enginar|vegetarian','Zeytinyagli Taze Fasulye|vegetarian','Cacik Bowl|mezze','Domates Salatasi|salad'],
                'Desserts' => ['Baklava Pistachio|dessert','Kunefe|dessert','Sutlac|dessert','Lokma|dessert','Asure|dessert','Sekerpare|dessert','Tulumba|dessert','Gullac|dessert','Profiterol Turkish Style|dessert','Dondurma|dessert'],
                'Drinks' => ['Ayran Mint|drink','Ayran Plain|drink','Rosehip Tea|drink','Apple Tea|drink','Sage Tea|drink','Pomegranate Juice|drink','Sour Cherry Juice|drink','Peach Nectar|drink','Orange Juice|drink','Lemon Soda|drink'],
            ],
            'arabic' => [
                'Mezze' => ['Hummus Beiruti|mezze','Baba Ghanoush|mezze','Moutabal|mezze','Labneh|mezze','Muhammara|mezze','Falafel|starter','Kibbeh|starter','Cheese Rakakat|starter','Spinach Fatayer|bread','Meat Fatayer|bread'],
                'Grill & Mains' => ['Shish Tawook|grill','Lamb Kofta|grill','Mixed Grill Arabic|grill','Chicken Shawarma Plate|grill','Beef Shawarma Plate|grill','Mansaf|rice','Maqluba Chicken|rice','Sayadieh Fish|seafood','Ouzi Lamb|rice','Stuffed Zucchini|stew'],
                'Salads & Sides' => ['Fattoush|salad','Tabbouleh|salad','Arabic Cabbage Salad|salad','Tahini Salad|salad','Batata Harra|side','Mujadara|rice','Freekeh Rice|rice','Vermicelli Rice Large|rice','Garlic Potatoes|side','Pita Chips|bread'],
                'Desserts' => ['Kunafa Cheese|dessert','Kunafa Cream|dessert','Baklava Mixed|dessert','Maamoul Date|dessert','Maamoul Pistachio|dessert','Rice Pudding Arabic|dessert','Layali Lubnan|dessert','Halawet El Jibn|dessert','Umm Ali|dessert','Awameh|dessert'],
                'Drinks' => ['Rose Lemonade|drink','Orange Blossom Lemonade|drink','Pomegranate Lemonade|drink','Carob Juice|drink','Licorice Drink|drink','Qamar Al Din|drink','Sahlab|drink','Cardamom Tea|drink','Black Tea|drink','Sparkling Lemon Mint|drink'],
            ],
            'persian' => [
                'Starters' => ['Mast Khiar|mezze','Mast Borani|mezze','Kashk Bademjan|mezze','Mirza Ghasemi|vegetarian','Salad Shirazi|salad','Dolmeh Barg Mo|starter','Nargesi Esfenaj|vegetarian','Kuku Sabzi|starter','Ab Doogh Khiar|soup','Soup Jo|soup'],
                'Kebabs & Mains' => ['Kebab Koobideh|grill','Joojeh Kebab|grill','Kebab Barg|grill','Shishlik Persian|grill','Kebab Torsh|grill','Ghormeh Sabzi|stew','Fesenjan|stew','Gheymeh Bademjan|stew','Zereshk Polo Chicken|rice','Tahchin Chicken|rice'],
                'Rice & Sides' => ['Baghali Polo|rice','Sabzi Polo|rice','Shirin Polo|rice','Reshteh Polo|rice','Dill Rice|rice','Tahdig Plain|side','Tahdig Ghormeh Sabzi|side','Torshi Liteh|side','Sabzi Khordan|side','Persian Pickles|side'],
                'Desserts' => ['Sholeh Zard|dessert','Faloodeh Shirazi|dessert','Bastani Sonnati|dessert','Persian Love Cake|dessert','Halva Saffron|dessert','Kachi|dessert','Nan Berenji|dessert','Qottab|dessert','Sohan|dessert','Gaz Pistachio|dessert'],
                'Drinks' => ['Doogh Mint|drink','Doogh Sparkling|drink','Saffron Lemonade|drink','Rose Water Sharbat|drink','Sour Cherry Sharbat|drink','Basil Seed Drink|drink','Orange Blossom Tea|drink','Cardamom Tea|drink','Black Tea Lemon|drink','Pomegranate Juice|drink'],
            ],
            'italian' => [
                'Antipasti' => ['Arancini|starter','Suppli|starter','Polenta Fritta|starter','Prosciutto Melon|starter','Antipasto Misto|starter','Minestrone|soup','Zuppa Toscana|soup','Panzanella|salad','Insalata Mista|salad','Fried Zucchini Flowers|starter'],
                'Pizza & Pasta' => ['Pizza Quattro Formaggi|pizza','Pizza Capricciosa|pizza','Pizza Ortolana|pizza','Pizza Prosciutto Funghi|pizza','Pizza Marinara|pizza','Penne Arrabbiata|pasta','Penne Amatriciana|pasta','Spaghetti Aglio Olio|pasta','Linguine Vongole|pasta','Gnocchi Gorgonzola|pasta'],
                'Mains & Sides' => ['Saltimbocca Romana|plated','Pollo Cacciatore|stew','Branzino al Limone|seafood','Fritto Misto|seafood','Eggplant Involtini|vegetarian','Polenta Creamy|side','Rosemary Potatoes|side','Sauteed Spinach|side','Cannellini Beans|side','Fennel Orange Salad|salad'],
                'Desserts' => ['Cannoli Siciliani|dessert','Sfogliatella|dessert','Torta della Nonna|dessert','Zabaglione|dessert','Semifreddo|dessert','Ricotta Cheesecake|dessert','Chocolate Budino|dessert','Amaretti Cake|dessert','Pear Almond Tart|dessert','Granita Lemon|dessert'],
                'Drinks' => ['Macchiato|drink','Flat White Italian|drink','Iced Espresso|drink','Chinotto|drink','Blood Orange Soda|drink','Peach Iced Tea|drink','Lemon Iced Tea|drink','Pear Juice|drink','Peach Juice|drink','Sparkling Lemon Water|drink'],
            ],
            'spanish' => [
                'Tapas' => ['Pan con Tomate|bread','Croquetas de Setas|starter','Croquetas de Bacalao|seafood','Albondigas en Salsa|starter','Tortilla de Patatas|starter','Gambas a la Plancha|seafood','Sepia a la Plancha|seafood','Berenjenas con Miel|vegetarian','Pimientos Rellenos|vegetarian','Aceitunas Marinadas|mezze'],
                'Rice & Mains' => ['Paella Mixta|rice','Arroz Caldoso|rice','Arroz del Senyoret|rice','Pollo al Ajillo|plated','Bacalao al Pil Pil|seafood','Bacalao a la Vizcaina|seafood','Secreto Iberico|grill','Lomo a la Plancha|grill','Conejo al Ajillo|plated','Fabada Asturiana|stew'],
                'Salads & Sides' => ['Ensalada Mixta|salad','Ensalada de Garbanzos|salad','Tomate Aliñado|salad','Patatas Alioli|side','Patatas a lo Pobre|side','Espinacas con Garbanzos|vegetarian','Judias Verdes|side','Pan Rustico|bread','Setas a la Plancha|vegetarian','Verduras Asadas|side'],
                'Desserts' => ['Crema Catalana|dessert','Flan Casero|dessert','Churros Chocolate|dessert','Leche Frita|dessert','Tarta Santiago|dessert','Natillas|dessert','Polvorones|dessert','Mantecados|dessert','Chocolate con Churros|dessert','Helado Turron|dessert'],
                'Drinks' => ['Agua Limon|drink','Limonada Casera|drink','Naranjada|drink','Mosto Blanco|drink','Mosto Tinto|drink','Granizado Limon|drink','Granizado Cafe|drink','Tonica Limon|drink','Cola Spanish|drink','Tea Peach Spanish|drink'],
            ],
            'japanese' => [
                'Starters & Sushi' => ['Edamame Sea Salt|starter','Edamame Spicy|starter','Agedashi Tofu|vegetarian','Gyoza Chicken|dumpling','Gyoza Vegetable|dumpling','Salmon Sashimi|sushi','Tuna Sashimi|sushi','Salmon Nigiri|sushi','Tuna Nigiri|sushi','California Roll|sushi'],
                'Noodles & Rice' => ['Shio Ramen|soup','Tantanmen|soup','Udon Beef|pasta','Udon Tempura|pasta','Yakisoba Chicken|pasta','Yakisoba Vegetable|pasta','Chicken Katsu Curry|rice','Beef Gyudon|rice','Oyakodon|rice','Salmon Ochazuke|rice'],
                'Grill & Sides' => ['Chicken Teriyaki|grill','Salmon Teriyaki|seafood','Chicken Karaage|starter','Ebi Tempura|seafood','Vegetable Tempura|vegetarian','Yakitori Chicken|grill','Yakitori Mushroom|vegetarian','Japanese Pickles|side','Steamed Rice|rice','Cabbage Sesame Salad|salad'],
                'Desserts' => ['Mochi Ice Cream|dessert','Dorayaki|dessert','Taiyaki|dessert','Matcha Tiramisu|dessert','Yuzu Cheesecake|dessert','Anmitsu|dessert','Warabi Mochi|dessert','Matcha Pudding|dessert','Black Sesame Pudding|dessert','Castella Cake|dessert'],
                'Drinks' => ['Genmaicha|drink','Hojicha|drink','Hojicha Latte|drink','Yuzu Tea|drink','Ume Soda|drink','Melon Soda|drink','Grape Soda Japanese|drink','Iced Matcha|drink','Iced Hojicha|drink','Calpis Soda|drink'],
            ],
            'chinese' => [
                'Starters & Dim Sum' => ['Hot and Sour Soup|soup','Corn Chicken Soup|soup','Spring Rolls Vegetable|starter','Spring Rolls Chicken|starter','Har Gow|dumpling','Xiao Long Bao|dumpling','Scallion Pancake|bread','Crispy Wontons|dumpling','Sesame Prawn Toast|bread','Dan Dan Cucumber|salad'],
                'Mains' => ['Kung Pao Chicken|plated','Mapo Tofu|vegetarian','Black Pepper Beef|grill','Beef Broccoli|plated','Mongolian Beef|grill','Char Siu Pork|grill','Honey Garlic Chicken|plated','General Tso Chicken|plated','Steamed Sea Bass Ginger|seafood','Szechuan Prawns|seafood'],
                'Rice & Noodles' => ['Chicken Fried Rice|rice','Beef Fried Rice|rice','Egg Fried Rice|rice','Shanghai Noodles|pasta','Dan Dan Noodles|pasta','Beef Noodle Soup|soup','Chicken Chow Mein|pasta','Vegetable Chow Mein|pasta','Rice Noodles Prawn|pasta','Crispy Noodles Beef|pasta'],
                'Desserts' => ['Mango Pudding|dessert','Sesame Balls|dessert','Almond Tofu Pudding|dessert','Red Bean Buns|dessert','Mango Pancake|dessert','Steamed Sponge Cake|dessert','Coconut Tapioca|dessert','Fried Milk|dessert','Lychee Jelly|dessert','Matcha Egg Tart|dessert'],
                'Drinks' => ['Chrysanthemum Tea|drink','Pu Er Tea|drink','Winter Melon Tea|drink','Plum Juice|drink','Pear Juice Chinese|drink','Mango Juice|drink','Passion Fruit Tea|drink','Brown Sugar Milk Tea|drink','Jasmine Milk Tea|drink','Lemon Soda Chinese|drink'],
            ],
            'vietnamese' => [
                'Starters' => ['Cha Gio Pork|starter','Cha Gio Vegetable|starter','Goi Ga|salad','Goi Bo|salad','Banh Cuon|dumpling','Banh Bot Loc|dumpling','Banh Khot|starter','Bo La Lot|grill','Tofu Lemongrass|vegetarian','Crispy Calamari Vietnamese|seafood'],
                'Noodles & Soups' => ['Pho Tai|soup','Pho Chin|soup','Pho Seafood|soup','Bun Cha Hanoi|pasta','Bun Bo Nam Bo|pasta','Bun Ga Nuong|pasta','Cao Lau|pasta','Mi Vit Tiem|soup','Hu Tieu Nam Vang|soup','Banh Canh Cua|soup'],
                'Mains & Sides' => ['Com Tam Pork|rice','Com Ga Hoi An|rice','Caramel Fish Claypot|seafood','Caramel Chicken Claypot|stew','Shaking Beef Rice|rice','Lemongrass Chicken|grill','Lemongrass Tofu|vegetarian','Water Spinach Garlic|vegetarian','Pickled Daikon Carrot|side','Steamed Jasmine Rice|rice'],
                'Desserts' => ['Che Ba Mau|dessert','Che Chuoi|dessert','Che Dau Xanh|dessert','Vietnamese Flan|dessert','Coffee Flan|dessert','Pandan Coconut Cake|dessert','Sesame Balls Vietnamese|dessert','Banana Fritters|dessert','Taro Pudding|dessert','Coconut Ice Cream|dessert'],
                'Drinks' => ['Vietnamese Milk Coffee|drink','Salt Coffee|drink','Egg Coffee|drink','Pandan Latte|drink','Lemongrass Tea|drink','Peach Lemongrass Tea|drink','Kumquat Soda|drink','Soursop Juice|drink','Avocado Smoothie|drink','Mango Smoothie|drink'],
            ],
            'mexican' => [
                'Starters' => ['Guacamole and Chips|starter','Nachos Cheese|starter','Nachos Beef|starter','Elote|starter','Chicken Quesadilla|sandwich','Cheese Quesadilla|sandwich','Shrimp Ceviche|seafood','Tostada Tuna|seafood','Bean Tostada|vegetarian','Pozole Rojo|soup'],
                'Tacos & Mains' => ['Carnitas Tacos|sandwich','Carne Asada Tacos|sandwich','Chicken Adobo Tacos|sandwich','Grilled Veg Tacos|sandwich','Shrimp Tacos|sandwich','Beef Burrito|sandwich','Chicken Burrito|sandwich','Veggie Burrito|sandwich','Enchiladas Rojas|plated','Mole Chicken|stew'],
                'Bowls & Sides' => ['Carne Asada Bowl|rice','Chicken Fajita Bowl|rice','Veggie Fajita Bowl|rice','Cilantro Lime Rice|rice','Mexican Rice|rice','Charro Beans|side','Black Beans|side','Jalapeno Slaw|salad','Roasted Salsa|side','Salsa Verde|side'],
                'Desserts' => ['Churros|dessert','Tres Leches Cake|dessert','Flan Mexicano|dessert','Buñuelos Cinnamon|dessert','Cajeta Crepes|dessert','Mango Chamoy Sorbet|dessert','Coconut Paleta|dessert','Strawberry Paleta|dessert','Chocolate Tamal|dessert','Sweet Corn Cake|dessert'],
                'Drinks' => ['Horchata|drink','Jamaica|drink','Tamarindo|drink','Agua Fresca Watermelon|drink','Agua Fresca Cucumber Lime|drink','Pineapple Agua Fresca|drink','Mango Agua Fresca|drink','Topo Chico Lime|drink','Mexican Orange Soda|drink','Mexican Lime Soda|drink'],
            ],
            'mediterranean' => [
                'Starters' => ['Hummus Classic|mezze','Hummus Roasted Pepper|mezze','Baba Ghanoush Mediterranean|mezze','Tzatziki|mezze','Falafel Mediterranean|starter','Spanakopita|bread','Stuffed Vine Leaves|starter','Feta Saganaki|starter','Calamari Mediterranean|seafood','Roasted Aubergine|vegetarian'],
                'Mains' => ['Chicken Souvlaki|grill','Lamb Souvlaki|grill','Grilled Sea Bass|seafood','Grilled Octopus|seafood','Chicken Lemon Oregano|grill','Lamb Moussaka|plated','Vegetable Moussaka|vegetarian','Seafood Orzo|pasta','Spinach Feta Pasta|pasta','Stuffed Peppers Rice|vegetarian'],
                'Salads & Sides' => ['Greek Salad|salad','Mediterranean Quinoa Salad|salad','Chickpea Salad|salad','Fattoush Mediterranean|salad','Lemon Potatoes|side','Garlic Potatoes|side','Couscous Herbs|side','Grilled Courgette|side','Roasted Aubergine Tomato|side','Warm Pita|bread'],
                'Desserts' => ['Baklava Mediterranean|dessert','Greek Yogurt Honey|dessert','Rice Pudding Cinnamon|dessert','Lemon Olive Oil Cake|dessert','Orange Almond Cake|dessert','Pistachio Cake|dessert','Fig Tart|dessert','Date Walnut Cake|dessert','Honey Semolina Cake|dessert','Yogurt Berry Parfait|dessert'],
                'Drinks' => ['Rosemary Lemonade|drink','Cucumber Mint Water|drink','Pomegranate Soda|drink','Orange Blossom Soda|drink','Fig Iced Tea|drink','Peach Iced Tea Mediterranean|drink','Greek Mountain Tea|drink','Chamomile Tea|drink','Fresh Orange Juice|drink','Grapefruit Juice|drink'],
            ],
            'steakhouse' => [
                'Starters' => ['French Onion Soup|soup','Lobster Bisque|soup','Steak Tartare|starter','Calamari Steakhouse|seafood','Crab Cakes|seafood','Buffalo Cauliflower|vegetarian','Spinach Artichoke Dip|mezze','Loaded Potato Skins|starter','Bacon Brussels Sprouts|side','House Caesar|salad'],
                'Steaks & Grill' => ['Ribeye 350g|grill','Sirloin 300g|grill','Filet Mignon 250g|grill','New York Strip 350g|grill','Tomahawk Steak|grill','Prime Rib|grill','Peppercorn Steak|grill','Garlic Butter Steak|grill','Grilled Salmon Steakhouse|seafood','Grilled Chicken Breast|grill'],
                'Sides' => ['Creamed Spinach|side','Onion Rings Steakhouse|side','Baked Potato|side','Loaded Baked Potato|side','Sauteed Mushrooms|side','Mac and Cheese Truffle|pasta','Green Beans Almond|side','Corn Creamed|side','Broccoli Garlic|side','Coleslaw Steakhouse|salad'],
                'Desserts' => ['New York Cheesecake|dessert','Chocolate Lava Cake|dessert','Sticky Toffee Pudding|dessert','Creme Brulee|dessert','Brownie Sundae|dessert','Key Lime Pie|dessert','Carrot Cake|dessert','Chocolate Mousse|dessert','Bread Pudding|dessert','Vanilla Ice Cream|dessert'],
                'Drinks' => ['Iced Tea Unsweetened|drink','Iced Tea Peach|drink','Ginger Beer Zero|drink','Root Beer|drink','Cream Soda|drink','Cherry Cola|drink','Lemon Lime Soda|drink','Pomegranate Tonic|drink','Cold Brew Coffee|drink','Espresso Steakhouse|drink'],
            ],
            'cafe' => [
                'Breakfast' => ['Eggs Benedict|plated','Eggs Florentine|vegetarian','Avocado Toast|sandwich','Smoked Salmon Bagel|sandwich','French Toast|bread','Buttermilk Pancakes|bread','Belgian Waffle|bread','Granola Yogurt Bowl|dessert','Acai Bowl|dessert','Breakfast Burrito|sandwich'],
                'Lunch' => ['Tuna Melt|sandwich','Turkey Club|sandwich','Chicken Pesto Panini|sandwich','Mozzarella Tomato Panini|sandwich','Roast Veg Sandwich|sandwich','Quiche Lorraine|plated','Spinach Feta Quiche|vegetarian','Caesar Salad Cafe|salad','Greek Salad Cafe|salad','Soup and Salad Combo|soup'],
                'Bakery & Sweets' => ['Almond Croissant|bread','Cinnamon Roll|bread','Blueberry Muffin|dessert','Carrot Cake Cafe|dessert','Red Velvet Cake|dessert','Brownie|dessert','Chocolate Chip Cookie|dessert','Oatmeal Cookie|dessert','Apple Turnover|bread','Berry Tart|dessert'],
                'Coffee & Tea' => ['Cortado|drink','Piccolo Latte|drink','Iced Latte|drink','Iced Mocha|drink','Vanilla Latte|drink','Caramel Latte|drink','Chai Latte|drink','Matcha Latte Cafe|drink','Earl Grey Tea|drink','Peppermint Tea|drink'],
                'Cold Drinks' => ['Orange Juice Cafe|drink','Apple Juice Cafe|drink','Berry Smoothie|drink','Mango Smoothie Cafe|drink','Green Smoothie|drink','Iced Chai|drink','Iced Matcha Cafe|drink','Sparkling Lemonade|drink','Peach Iced Tea Cafe|drink','Berry Iced Tea|drink'],
            ],
            'fine_dining' => [
                'Starters' => ['Scallop Crudo|seafood','Tuna Tartare|seafood','Beef Tartare|starter','Duck Liver Parfait|starter','Jerusalem Artichoke Soup|soup','Wild Mushroom Veloute|soup','Burrata Heritage Tomato|salad','Celeriac Remoulade|salad','King Crab Salad|seafood','Smoked Eel Potato|seafood'],
                'Mains' => ['Duck Breast Cherry|grill','Beef Fillet Truffle|grill','Lamb Loin Herb Crust|grill','Halibut Beurre Blanc|seafood','Sea Bass Fennel|seafood','Monkfish Saffron|seafood','Guinea Fowl|plated','Pork Tenderloin Apple|grill','Mushroom Wellington|vegetarian','Truffle Risotto|rice'],
                'Sides & Vegetables' => ['Potato Puree|side','Fondant Potato|side','Roasted Carrots|side','Asparagus Hollandaise|side','Butter Leeks|side','Glazed Beetroot|side','Mushroom Fricassee|vegetarian','Cauliflower Puree|side','Braised Cabbage|side','Heritage Tomato Salad|salad'],
                'Desserts' => ['Dark Chocolate Tart|dessert','Lemon Tart Fine Dining|dessert','Apple Tarte Tatin|dessert','Pear Poached Vanilla|dessert','Mango Passion Entremet|dessert','Hazelnut Praline Mousse|dessert','Strawberry Mille Feuille|dessert','Coffee Opera Cake|dessert','Coconut Panna Cotta|dessert','Seasonal Sorbet|dessert'],
                'Drinks' => ['White Peach Spritz Zero|drink','Rhubarb Tonic|drink','Cucumber Elderflower|drink','Yuzu Tonic|drink','Ginger Lemongrass Fizz|drink','Cold Brew Tonic|drink','Jasmine Iced Tea Fine|drink','White Tea Pear|drink','Sparkling Grape Zero|drink','Espresso Double|drink'],
            ],
            'bar' => [
                'Bar Bites' => ['Buffalo Wings|grill','BBQ Wings|grill','Mozzarella Sticks|starter','Mac Cheese Bites|starter','Chicken Tenders|grill','Fish Goujons|seafood','Halloumi Fries|vegetarian','Corn Ribs|vegetarian','Pretzel Bites|bread','Crispy Calamari Bar|seafood'],
                'Burgers & Mains' => ['Classic Beef Burger|sandwich','Cheese Burger|sandwich','Bacon Burger|sandwich','Crispy Chicken Burger|sandwich','Grilled Chicken Burger|sandwich','Veggie Burger|sandwich','Fish Burger|sandwich','Pulled Pork Sandwich|sandwich','Chicken Caesar Wrap Bar|sandwich','Beef Nacho Bowl|plated'],
                'Sharing & Sides' => ['Loaded Nachos Chicken|starter','Loaded Nachos Beef|starter','Loaded Nachos Veggie|vegetarian','Cheese Fries|side','Chilli Cheese Fries|side','Garlic Parmesan Fries|side','Beer Style Onion Rings|side','House Slaw Bar|salad','Mixed Olives Bar|mezze','Hummus Pita Bar|mezze'],
                'Desserts' => ['Chocolate Brownie Bar|dessert','Sticky Toffee Bar|dessert','Cheesecake Bar|dessert','Cookie Sundae|dessert','Chocolate Sundae|dessert','Banoffee Cup|dessert','Lemon Cheesecake|dessert','Warm Apple Pie|dessert','Churros Chocolate Bar|dessert','Ice Cream Trio|dessert'],
                'Zero-Proof' => ['Berry Mojito Zero|drink','Mango Cooler Zero|drink','Cucumber Cooler Zero|drink','Pineapple Ginger Zero|drink','Passionfruit Soda Zero|drink','Blood Orange Tonic Zero|drink','Grapefruit Soda Zero|drink','Cherry Cola Bar|drink','Peach Iced Tea Bar|drink','Lemon Iced Tea Bar|drink'],
            ],
        ];
    }
}
