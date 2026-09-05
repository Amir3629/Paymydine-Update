<?php

namespace Admin\Services;

/**
 * PMD_STARTER_MENU_LIBRARY_V1
 *
 * Version-controlled onboarding sample data. These are editable suggestions,
 * not legal nutrition/allergen declarations. The Quick Setup UI explicitly
 * asks the owner to review them against the restaurant's actual recipes.
 */
class PmdStarterMenuLibraryV1
{
    public function restaurantTypes(): array
    {
        return [
            'german' => ['label' => 'German', 'theme' => 'verdant_modern'],
            'turkish' => ['label' => 'Turkish', 'theme' => 'anatolia_turkish'],
            'arabic' => ['label' => 'Arabic / Middle Eastern', 'theme' => 'lumiere_fine_dining'],
            'persian' => ['label' => 'Persian', 'theme' => 'shahrazad_persian'],
            'italian' => ['label' => 'Italian', 'theme' => 'azzurra_coastal'],
            'spanish' => ['label' => 'Spanish / Tapas', 'theme' => 'azzurra_coastal'],
            'japanese' => ['label' => 'Japanese', 'theme' => 'kazen_japanese'],
            'chinese' => ['label' => 'Chinese', 'theme' => 'verdant_modern'],
            'vietnamese' => ['label' => 'Vietnamese', 'theme' => 'verdant_modern'],
            'mexican' => ['label' => 'Mexican / Latin', 'theme' => 'verdant_modern'],
            'mediterranean' => ['label' => 'Mediterranean / Seafood', 'theme' => 'azzurra_coastal'],
            'steakhouse' => ['label' => 'Steakhouse / Grill', 'theme' => 'ember_steakhouse'],
            'cafe' => ['label' => 'Café / Brunch', 'theme' => 'verdant_modern'],
            'fine_dining' => ['label' => 'Fine Dining', 'theme' => 'lumiere_fine_dining'],
            'bar' => ['label' => 'Bar / Lounge', 'theme' => 'neon_cocktail_bar'],
        ];
    }

    public function pack(string $type): array
    {
        $type = strtolower(trim($type));
        $method = 'pack'.str_replace(' ', '', ucwords(str_replace('_', ' ', $type)));
        if (!method_exists($this, $method)) {
            throw new \InvalidArgumentException('Starter Menu pack is not available for this restaurant type.');
        }

        $items = $this->{$method}();
        $categories = [];
        foreach ($items as $item) {
            if (!in_array($item['category'], $categories, true)) $categories[] = $item['category'];
        }

        return ['type' => $type, 'categories' => $categories, 'items' => $items];
    }

    private function i(
        string $name,
        string $description,
        string $category,
        float $price,
        array $allergens,
        int $calories,
        float $protein,
        float $carbs,
        float $fat,
        float $sugar,
        array $flags = []
    ): array {
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
            'nutrition' => compact('calories', 'protein', 'carbs', 'fat', 'sugar'),
        ];
    }

    private function packGerman(): array
    {
        return [
            $this->i('Currywurst', 'Grilled sausage with curry tomato sauce and fries.', 'Classics', 12.90, ['Mustard'], 760, 28, 78, 36, 15, ['bestseller'=>1]),
            $this->i('Schnitzel Wiener Art', 'Crispy pork schnitzel with lemon and potato salad.', 'Classics', 18.90, ['Gluten','Eggs','Mustard'], 820, 45, 62, 42, 6, ['chef'=>1]),
            $this->i('Käsespätzle', 'Soft egg noodles with alpine cheese and roasted onions.', 'Vegetarian', 15.50, ['Gluten','Eggs','Milk'], 740, 29, 79, 34, 8, ['vegetarian'=>1]),
            $this->i('Bratwurst Plate', 'Bratwurst, sauerkraut, mustard and rustic bread.', 'Classics', 14.90, ['Gluten','Mustard'], 680, 31, 54, 35, 8),
            $this->i('Rinderroulade', 'Braised beef roulade with red cabbage and potato dumpling.', 'Mains', 22.90, ['Gluten','Mustard','Celery'], 690, 47, 58, 29, 13, ['chef'=>1,'prep'=>25]),
            $this->i('Flammkuchen', 'Thin crisp flatbread with crème fraîche, onion and bacon.', 'Mains', 14.50, ['Gluten','Milk'], 610, 21, 66, 28, 7),
            $this->i('Kartoffelsuppe', 'Creamy potato soup with herbs and vegetable stock.', 'Starters', 7.90, ['Celery','Milk'], 310, 8, 37, 14, 6, ['vegetarian'=>1]),
            $this->i('Brezel & Butter', 'Warm pretzel with cultured butter.', 'Starters', 5.50, ['Gluten','Milk'], 330, 8, 53, 9, 4, ['vegetarian'=>1]),
            $this->i('Apfelstrudel', 'Apple strudel with vanilla sauce.', 'Desserts', 8.50, ['Gluten','Eggs','Milk'], 430, 7, 62, 17, 32, ['vegetarian'=>1,'bestseller'=>1]),
            $this->i('Schwarzwälder Kirschtorte', 'Chocolate sponge, cherries and whipped cream.', 'Desserts', 8.90, ['Gluten','Eggs','Milk'], 510, 7, 58, 28, 38, ['vegetarian'=>1]),
        ];
    }

    private function packTurkish(): array
    {
        return [
            $this->i('Adana Kebab', 'Spiced minced lamb skewer with bulgur, grilled pepper and onion.', 'Grill', 19.90, ['Gluten'], 720, 42, 58, 34, 8, ['halal'=>1,'chef'=>1]),
            $this->i('Tavuk Şiş', 'Marinated chicken skewers with rice and charred vegetables.', 'Grill', 17.90, [], 610, 48, 63, 18, 7, ['halal'=>1]),
            $this->i('İskender Kebab', 'Sliced döner over bread with tomato sauce, yoghurt and butter.', 'Grill', 21.50, ['Gluten','Milk'], 850, 44, 71, 43, 12, ['halal'=>1,'bestseller'=>1]),
            $this->i('Mercimek Çorbası', 'Red lentil soup with lemon and mild spices.', 'Starters', 7.50, ['Celery'], 280, 13, 42, 7, 5, ['vegan'=>1,'halal'=>1]),
            $this->i('Sigara Böreği', 'Crisp pastry rolls filled with white cheese and herbs.', 'Starters', 8.90, ['Gluten','Milk'], 410, 14, 39, 22, 4, ['vegetarian'=>1]),
            $this->i('Mantı', 'Small beef dumplings with garlic yoghurt and paprika butter.', 'Mains', 17.50, ['Gluten','Eggs','Milk'], 650, 32, 74, 25, 8, ['halal'=>1]),
            $this->i('İmam Bayıldı', 'Slow-cooked aubergine with tomato, onion and olive oil.', 'Vegetarian', 14.90, [], 390, 7, 31, 27, 15, ['vegan'=>1,'halal'=>1]),
            $this->i('Pide Peynirli', 'Boat-shaped flatbread with Turkish cheese.', 'Mains', 14.50, ['Gluten','Milk'], 660, 25, 82, 26, 7, ['vegetarian'=>1]),
            $this->i('Baklava', 'Layered filo pastry with pistachio and syrup.', 'Desserts', 8.50, ['Gluten','Nuts','Milk'], 470, 8, 55, 25, 34, ['vegetarian'=>1,'bestseller'=>1]),
            $this->i('Sütlaç', 'Oven-baked Turkish rice pudding.', 'Desserts', 7.50, ['Milk'], 330, 9, 52, 10, 31, ['vegetarian'=>1]),
        ];
    }

    private function packArabic(): array
    {
        return [
            $this->i('Mixed Grill', 'Chicken shish, kofta and lamb with rice, salad and garlic sauce.', 'Grill', 22.90, ['Milk'], 820, 61, 66, 34, 7, ['halal'=>1,'chef'=>1]),
            $this->i('Chicken Shawarma', 'Spiced chicken, pickles, garlic sauce and flatbread.', 'Mains', 15.90, ['Gluten','Eggs'], 690, 42, 63, 29, 8, ['halal'=>1,'bestseller'=>1]),
            $this->i('Kofta Kebab', 'Chargrilled minced beef and lamb with tahini and rice.', 'Grill', 18.90, ['Sesame'], 720, 47, 54, 35, 6, ['halal'=>1]),
            $this->i('Hummus', 'Chickpeas blended with tahini, lemon and olive oil.', 'Mezze', 7.50, ['Sesame'], 310, 10, 30, 18, 2, ['vegan'=>1,'halal'=>1]),
            $this->i('Baba Ghanoush', 'Smoked aubergine with tahini, lemon and pomegranate.', 'Mezze', 7.90, ['Sesame'], 220, 5, 18, 15, 8, ['vegan'=>1,'halal'=>1]),
            $this->i('Falafel Plate', 'Herb falafel with hummus, salad, pickles and flatbread.', 'Vegetarian', 14.90, ['Gluten','Sesame'], 590, 19, 70, 26, 8, ['vegan'=>1,'halal'=>1]),
            $this->i('Fattoush', 'Crisp salad with toasted bread, sumac and pomegranate dressing.', 'Salads', 10.90, ['Gluten'], 290, 6, 37, 14, 12, ['vegan'=>1,'halal'=>1]),
            $this->i('Lamb Maqluba', 'Spiced lamb, aubergine and rice cooked upside down.', 'Mains', 21.90, [], 760, 42, 83, 27, 9, ['halal'=>1,'prep'=>25]),
            $this->i('Kunafa', 'Warm shredded pastry with cheese and orange blossom syrup.', 'Desserts', 8.90, ['Gluten','Milk','Nuts'], 520, 12, 61, 25, 39, ['vegetarian'=>1]),
            $this->i('Baklava Selection', 'Assorted nut-filled filo pastries.', 'Desserts', 8.50, ['Gluten','Nuts','Milk'], 460, 7, 53, 25, 33, ['vegetarian'=>1]),
        ];
    }

    private function packPersian(): array
    {
        return [
            $this->i('Chelow Kebab Koobideh', 'Charcoal-grilled minced beef and lamb with saffron rice and tomato.', 'Kebabs', 21.90, [], 790, 49, 86, 27, 5, ['halal'=>1,'bestseller'=>1]),
            $this->i('Joojeh Kebab', 'Saffron lemon chicken with basmati rice and grilled tomato.', 'Kebabs', 19.90, ['Milk'], 650, 52, 78, 16, 5, ['halal'=>1]),
            $this->i('Ghormeh Sabzi', 'Herb and kidney bean stew with tender beef and dried lime.', 'Stews', 19.50, [], 610, 38, 61, 24, 7, ['halal'=>1,'chef'=>1,'prep'=>25]),
            $this->i('Fesenjan', 'Chicken braised in walnut and pomegranate sauce with rice.', 'Stews', 21.50, ['Nuts'], 740, 37, 72, 36, 24, ['halal'=>1]),
            $this->i('Kashk-e Bademjan', 'Aubergine, whey, mint and walnut dip with warm bread.', 'Starters', 10.90, ['Milk','Nuts','Gluten'], 430, 15, 36, 26, 7, ['vegetarian'=>1]),
            $this->i('Mirza Ghasemi', 'Smoked aubergine, tomato, garlic and egg.', 'Starters', 9.90, ['Eggs'], 290, 11, 18, 20, 9, ['vegetarian'=>1]),
            $this->i('Zereshk Polo ba Morgh', 'Saffron chicken with barberry rice and pistachio.', 'Mains', 20.90, ['Nuts'], 690, 40, 91, 18, 18, ['halal'=>1]),
            $this->i('Tahdig', 'Crispy saffron rice crust served with yoghurt herb sauce.', 'Sides', 7.50, ['Milk'], 360, 7, 58, 12, 3, ['vegetarian'=>1]),
            $this->i('Sholeh Zard', 'Saffron rice pudding with rosewater, cinnamon and almond.', 'Desserts', 7.90, ['Nuts'], 340, 6, 63, 7, 34, ['vegan'=>1]),
            $this->i('Persian Ice Cream', 'Saffron, rosewater and pistachio ice cream.', 'Desserts', 8.50, ['Milk','Nuts'], 390, 8, 42, 21, 31, ['vegetarian'=>1]),
        ];
    }

    private function packItalian(): array
    {
        return [
            $this->i('Margherita', 'Tomato, mozzarella, basil and extra virgin olive oil.', 'Pizza', 13.90, ['Gluten','Milk'], 730, 28, 91, 27, 8, ['vegetarian'=>1,'bestseller'=>1]),
            $this->i('Diavola', 'Tomato, mozzarella and spicy salami.', 'Pizza', 15.90, ['Gluten','Milk'], 820, 35, 88, 36, 9),
            $this->i('Spaghetti Carbonara', 'Pasta with egg, pecorino, guanciale and black pepper.', 'Pasta', 17.90, ['Gluten','Eggs','Milk'], 780, 33, 79, 36, 5, ['chef'=>1]),
            $this->i('Tagliatelle al Ragù', 'Slow-cooked beef ragù with egg pasta and parmesan.', 'Pasta', 18.50, ['Gluten','Eggs','Milk','Celery'], 720, 37, 83, 26, 11),
            $this->i('Risotto ai Funghi', 'Creamy mushroom risotto with parmesan and herbs.', 'Mains', 18.90, ['Milk','Celery'], 640, 18, 78, 26, 7, ['vegetarian'=>1]),
            $this->i('Burrata & Tomato', 'Burrata, tomatoes, basil oil and aged balsamic.', 'Starters', 12.90, ['Milk','Sulphites'], 420, 18, 20, 31, 12, ['vegetarian'=>1]),
            $this->i('Bruschetta', 'Toasted bread with tomato, garlic, basil and olive oil.', 'Starters', 8.90, ['Gluten'], 320, 8, 43, 13, 7, ['vegan'=>1]),
            $this->i('Melanzane alla Parmigiana', 'Baked aubergine, tomato, mozzarella and parmesan.', 'Vegetarian', 16.90, ['Milk'], 560, 25, 34, 36, 14, ['vegetarian'=>1]),
            $this->i('Tiramisù', 'Espresso-soaked sponge, mascarpone and cocoa.', 'Desserts', 8.90, ['Gluten','Eggs','Milk'], 480, 9, 49, 27, 28, ['vegetarian'=>1,'bestseller'=>1]),
            $this->i('Panna Cotta', 'Vanilla cream pudding with berry compote.', 'Desserts', 8.50, ['Milk'], 390, 6, 39, 24, 31, ['vegetarian'=>1]),
        ];
    }

    private function packSpanish(): array
    {
        return [
            $this->i('Patatas Bravas', 'Crispy potatoes with brava sauce and aioli.', 'Tapas', 8.50, ['Eggs'], 430, 7, 49, 23, 5, ['vegetarian'=>1,'bestseller'=>1]),
            $this->i('Gambas al Ajillo', 'Prawns sizzling in garlic, chilli and olive oil.', 'Tapas', 13.90, ['Crustaceans'], 310, 27, 5, 21, 2, ['chef'=>1]),
            $this->i('Croquetas de Jamón', 'Creamy ham croquettes with crisp breadcrumbs.', 'Tapas', 9.90, ['Gluten','Eggs','Milk'], 390, 15, 36, 21, 4),
            $this->i('Tortilla Española', 'Spanish potato and onion omelette.', 'Tapas', 8.90, ['Eggs'], 360, 13, 33, 20, 5, ['vegetarian'=>1]),
            $this->i('Paella Valenciana', 'Saffron rice with chicken, vegetables and traditional seasoning.', 'Paella', 22.90, ['Celery'], 690, 39, 86, 20, 8, ['prep'=>25]),
            $this->i('Paella de Marisco', 'Saffron rice with prawns, mussels and squid.', 'Paella', 24.90, ['Crustaceans','Molluscs','Fish'], 670, 43, 82, 17, 7, ['chef'=>1,'prep'=>25]),
            $this->i('Pulpo a la Gallega', 'Tender octopus with potato, paprika and olive oil.', 'Mains', 18.90, ['Molluscs'], 420, 34, 36, 15, 3),
            $this->i('Ensalada Manchega', 'Tomato salad with manchego, olives and sherry vinaigrette.', 'Salads', 11.90, ['Milk','Sulphites'], 340, 14, 20, 24, 9, ['vegetarian'=>1]),
            $this->i('Churros con Chocolate', 'Warm churros with thick chocolate dip.', 'Desserts', 8.50, ['Gluten','Milk'], 510, 8, 69, 23, 29, ['vegetarian'=>1]),
            $this->i('Crema Catalana', 'Citrus vanilla custard with caramelised sugar.', 'Desserts', 8.90, ['Eggs','Milk'], 390, 8, 46, 19, 34, ['vegetarian'=>1]),
        ];
    }

    private function packJapanese(): array
    {
        return [
            $this->i('Salmon Nigiri', 'Hand-pressed sushi rice topped with fresh salmon.', 'Sushi', 8.90, ['Fish'], 240, 16, 31, 6, 3, ['bestseller'=>1]),
            $this->i('Tuna Nigiri', 'Hand-pressed sushi rice topped with tuna.', 'Sushi', 9.50, ['Fish'], 220, 18, 30, 3, 3),
            $this->i('Salmon Avocado Roll', 'Salmon, avocado and sushi rice wrapped in nori.', 'Sushi', 12.90, ['Fish','Sesame'], 430, 20, 52, 16, 7),
            $this->i('Chicken Karaage', 'Japanese-style crispy marinated chicken with lemon mayo.', 'Starters', 9.90, ['Gluten','Soybeans','Eggs'], 460, 31, 32, 23, 5),
            $this->i('Edamame', 'Steamed young soybeans with sea salt.', 'Starters', 6.50, ['Soybeans'], 190, 17, 14, 8, 3, ['vegan'=>1]),
            $this->i('Tonkotsu Ramen', 'Rich pork broth, noodles, chashu, egg and spring onion.', 'Ramen', 18.90, ['Gluten','Eggs','Soybeans'], 790, 39, 78, 34, 7, ['chef'=>1]),
            $this->i('Miso Ramen', 'Miso broth, noodles, sweetcorn, mushroom and egg.', 'Ramen', 16.90, ['Gluten','Eggs','Soybeans'], 650, 24, 83, 22, 9, ['vegetarian'=>1]),
            $this->i('Teriyaki Chicken Don', 'Teriyaki glazed chicken over steamed rice and vegetables.', 'Rice Bowls', 16.50, ['Soybeans','Sesame'], 670, 40, 82, 19, 14),
            $this->i('Matcha Cheesecake', 'Creamy matcha cheesecake with biscuit base.', 'Desserts', 8.90, ['Gluten','Eggs','Milk'], 440, 8, 45, 27, 25, ['vegetarian'=>1]),
            $this->i('Mochi Ice Cream', 'Assorted soft rice cakes filled with ice cream.', 'Desserts', 7.90, ['Milk','Soybeans'], 300, 5, 47, 10, 28, ['vegetarian'=>1]),
        ];
    }

    private function packChinese(): array
    {
        return [
            $this->i('Sweet & Sour Chicken', 'Crispy chicken, peppers and pineapple in tangy sauce.', 'Mains', 16.90, ['Gluten','Soybeans'], 720, 35, 91, 23, 28, ['bestseller'=>1]),
            $this->i('Kung Pao Chicken', 'Chicken, chilli, vegetables and peanuts in savoury sauce.', 'Mains', 17.50, ['Peanuts','Soybeans'], 650, 42, 48, 31, 14, ['chef'=>1]),
            $this->i('Beef Black Bean', 'Tender beef, peppers and onions with black bean sauce.', 'Mains', 18.50, ['Soybeans'], 590, 41, 42, 27, 10),
            $this->i('Mapo Tofu', 'Silken tofu with spicy fermented bean sauce and Sichuan pepper.', 'Mains', 15.90, ['Soybeans'], 470, 22, 28, 29, 8, ['vegan'=>1]),
            $this->i('Vegetable Spring Rolls', 'Crisp rolls filled with cabbage, carrot and mushroom.', 'Starters', 7.50, ['Gluten','Soybeans'], 330, 8, 45, 14, 7, ['vegan'=>1]),
            $this->i('Pork Dumplings', 'Pan-fried pork and cabbage dumplings with soy dipping sauce.', 'Dim Sum', 9.90, ['Gluten','Soybeans'], 410, 20, 43, 18, 6),
            $this->i('Prawn Har Gow', 'Steamed crystal dumplings filled with prawns.', 'Dim Sum', 10.90, ['Crustaceans'], 280, 19, 36, 7, 3),
            $this->i('Egg Fried Rice', 'Wok-fried rice with egg, peas and spring onion.', 'Rice & Noodles', 8.90, ['Eggs','Soybeans'], 520, 15, 78, 16, 5, ['vegetarian'=>1]),
            $this->i('Dan Dan Noodles', 'Noodles with sesame chilli sauce, greens and minced pork.', 'Rice & Noodles', 15.90, ['Gluten','Sesame','Soybeans'], 680, 28, 79, 27, 10),
            $this->i('Mango Pudding', 'Chilled mango pudding with coconut cream.', 'Desserts', 7.50, [], 260, 3, 47, 7, 34, ['vegetarian'=>1]),
        ];
    }

    private function packVietnamese(): array
    {
        return [
            $this->i('Phở Bò', 'Rice noodle soup with beef, aromatic broth, herbs and lime.', 'Noodle Soups', 16.90, ['Fish'], 570, 36, 69, 17, 8, ['chef'=>1,'bestseller'=>1]),
            $this->i('Phở Gà', 'Rice noodle soup with chicken, herbs, bean sprouts and lime.', 'Noodle Soups', 15.90, ['Fish'], 520, 38, 66, 12, 7),
            $this->i('Bún Chả', 'Grilled pork patties, rice noodles, herbs and dipping sauce.', 'Mains', 17.50, ['Fish'], 640, 38, 75, 20, 13),
            $this->i('Bánh Mì Chicken', 'Crisp baguette with chicken, pickles, herbs and chilli mayo.', 'Mains', 11.90, ['Gluten','Eggs','Soybeans'], 590, 31, 71, 20, 10),
            $this->i('Gỏi Cuốn', 'Fresh rice paper rolls with prawns, herbs and rice noodles.', 'Starters', 9.50, ['Crustaceans','Peanuts'], 290, 16, 41, 7, 6),
            $this->i('Chả Giò', 'Crispy Vietnamese spring rolls with pork and vegetables.', 'Starters', 9.50, ['Fish'], 410, 18, 39, 20, 6),
            $this->i('Bún Bò Nam Bộ', 'Warm rice noodle bowl with lemongrass beef, herbs and peanuts.', 'Bowls', 17.90, ['Peanuts','Fish'], 650, 39, 72, 23, 11),
            $this->i('Tofu Lemongrass Bowl', 'Lemongrass tofu, rice noodles, herbs and pickled vegetables.', 'Bowls', 15.50, ['Soybeans','Peanuts'], 560, 21, 69, 21, 10, ['vegan'=>1]),
            $this->i('Vietnamese Coffee', 'Strong iced coffee with sweetened condensed milk.', 'Drinks', 5.50, ['Milk'], 190, 5, 31, 5, 29, ['vegetarian'=>1]),
            $this->i('Chè Ba Màu', 'Three-colour dessert with beans, jelly and coconut milk.', 'Desserts', 7.50, [], 360, 7, 62, 11, 34, ['vegan'=>1]),
        ];
    }

    private function packMexican(): array
    {
        return [
            $this->i('Tacos al Pastor', 'Corn tortillas with marinated pork, pineapple, onion and coriander.', 'Tacos', 14.90, [], 590, 31, 62, 24, 12, ['bestseller'=>1]),
            $this->i('Beef Tacos', 'Corn tortillas with seasoned beef, salsa, onion and lime.', 'Tacos', 15.90, ['Milk'], 620, 34, 56, 28, 8),
            $this->i('Chicken Fajitas', 'Sizzling chicken, peppers and onions with tortillas and salsa.', 'Mains', 18.90, ['Gluten'], 690, 45, 69, 24, 10, ['chef'=>1]),
            $this->i('Beef Burrito', 'Rice, beans, seasoned beef, cheese and salsa in a flour tortilla.', 'Mains', 16.90, ['Gluten','Milk'], 840, 39, 96, 32, 10),
            $this->i('Vegetable Quesadilla', 'Toasted tortilla with cheese, peppers, corn and salsa.', 'Vegetarian', 14.50, ['Gluten','Milk'], 650, 25, 71, 29, 8, ['vegetarian'=>1]),
            $this->i('Guacamole & Chips', 'Fresh avocado, lime, tomato and coriander with corn chips.', 'Starters', 9.90, [], 480, 7, 49, 29, 4, ['vegan'=>1]),
            $this->i('Nachos', 'Corn chips with cheese, beans, jalapeño, salsa and sour cream.', 'Starters', 11.90, ['Milk'], 690, 22, 73, 35, 8, ['vegetarian'=>1]),
            $this->i('Chilli con Carne', 'Slow-cooked beef and bean chilli with rice and sour cream.', 'Mains', 16.50, ['Milk'], 710, 42, 79, 25, 12),
            $this->i('Churros', 'Cinnamon sugar churros with chocolate sauce.', 'Desserts', 8.50, ['Gluten','Milk'], 510, 8, 68, 23, 30, ['vegetarian'=>1]),
            $this->i('Tres Leches Cake', 'Soft sponge soaked in three milks with whipped cream.', 'Desserts', 8.90, ['Gluten','Eggs','Milk'], 520, 10, 65, 23, 42, ['vegetarian'=>1]),
        ];
    }

    private function packMediterranean(): array
    {
        return [
            $this->i('Grilled Sea Bass', 'Whole sea bass with lemon, herbs and roasted vegetables.', 'Seafood', 24.90, ['Fish'], 560, 48, 26, 29, 7, ['chef'=>1]),
            $this->i('Garlic Prawns', 'Prawns with garlic, chilli, parsley and olive oil.', 'Seafood', 16.90, ['Crustaceans'], 360, 31, 8, 24, 3),
            $this->i('Seafood Linguine', 'Linguine with prawns, mussels, squid and tomato.', 'Pasta', 22.90, ['Gluten','Crustaceans','Molluscs'], 690, 39, 82, 22, 10, ['bestseller'=>1]),
            $this->i('Chicken Souvlaki', 'Herb-marinated chicken skewers with pita and tzatziki.', 'Grill', 17.90, ['Gluten','Milk'], 640, 45, 58, 24, 7),
            $this->i('Greek Salad', 'Tomato, cucumber, olives, red onion and feta.', 'Salads', 11.90, ['Milk'], 360, 12, 20, 27, 10, ['vegetarian'=>1]),
            $this->i('Hummus & Pita', 'Creamy hummus with warm pita and olive oil.', 'Starters', 8.50, ['Gluten','Sesame'], 390, 12, 49, 17, 3, ['vegan'=>1]),
            $this->i('Halloumi', 'Grilled halloumi with lemon, herbs and tomato relish.', 'Starters', 10.90, ['Milk'], 410, 24, 15, 29, 8, ['vegetarian'=>1]),
            $this->i('Moussaka', 'Layered aubergine, potato, spiced beef and béchamel.', 'Mains', 18.90, ['Milk','Gluten'], 720, 35, 56, 39, 11),
            $this->i('Baklava', 'Filo pastry with nuts, honey and citrus syrup.', 'Desserts', 8.50, ['Gluten','Nuts','Milk'], 470, 8, 55, 25, 34, ['vegetarian'=>1]),
            $this->i('Greek Yoghurt & Honey', 'Thick yoghurt with honey, walnuts and fruit.', 'Desserts', 7.90, ['Milk','Nuts'], 330, 12, 39, 15, 28, ['vegetarian'=>1]),
        ];
    }

    private function packSteakhouse(): array
    {
        return [
            $this->i('Ribeye 300g', 'Chargrilled ribeye with roasted garlic butter and fries.', 'Steaks', 34.90, ['Milk'], 920, 64, 48, 52, 3, ['chef'=>1,'bestseller'=>1,'prep'=>22]),
            $this->i('Filet Mignon 220g', 'Tender beef fillet with peppercorn sauce and potato gratin.', 'Steaks', 39.90, ['Milk'], 790, 61, 39, 43, 5, ['chef'=>1,'prep'=>22]),
            $this->i('New York Strip 300g', 'Grilled strip steak with herb butter and seasonal vegetables.', 'Steaks', 32.90, ['Milk'], 820, 66, 26, 48, 6, ['prep'=>22]),
            $this->i('BBQ Beef Ribs', 'Slow-cooked beef ribs with smoky barbecue glaze and slaw.', 'Grill', 28.90, ['Mustard'], 980, 59, 71, 51, 24, ['prep'=>25]),
            $this->i('Grilled Chicken', 'Herb grilled chicken breast with vegetables and jus.', 'Grill', 19.90, ['Celery'], 540, 52, 31, 19, 8),
            $this->i('Classic Caesar', 'Romaine, parmesan, croutons and Caesar dressing.', 'Starters', 11.90, ['Gluten','Eggs','Fish','Milk'], 430, 15, 29, 29, 4),
            $this->i('Truffle Mac & Cheese', 'Creamy macaroni with mature cheese and truffle.', 'Sides', 9.90, ['Gluten','Milk'], 620, 23, 61, 31, 7, ['vegetarian'=>1]),
            $this->i('Creamed Spinach', 'Spinach with cream, garlic and nutmeg.', 'Sides', 7.90, ['Milk'], 280, 9, 16, 21, 5, ['vegetarian'=>1]),
            $this->i('New York Cheesecake', 'Baked vanilla cheesecake with berry compote.', 'Desserts', 9.50, ['Gluten','Eggs','Milk'], 540, 10, 55, 32, 37, ['vegetarian'=>1]),
            $this->i('Chocolate Lava Cake', 'Warm chocolate cake with liquid centre and vanilla ice cream.', 'Desserts', 10.50, ['Gluten','Eggs','Milk'], 620, 9, 68, 34, 44, ['vegetarian'=>1]),
        ];
    }

    private function packCafe(): array
    {
        return [
            $this->i('Avocado Toast', 'Sourdough, smashed avocado, cherry tomato and seeds.', 'Brunch', 12.90, ['Gluten','Sesame'], 480, 13, 55, 24, 7, ['vegan'=>1,'bestseller'=>1]),
            $this->i('Eggs Benedict', 'Poached eggs, English muffin, ham and hollandaise.', 'Brunch', 14.90, ['Gluten','Eggs','Milk'], 650, 29, 48, 38, 5, ['chef'=>1]),
            $this->i('Pancake Stack', 'Fluffy pancakes with berries, maple syrup and yoghurt.', 'Brunch', 12.50, ['Gluten','Eggs','Milk'], 610, 15, 91, 21, 38, ['vegetarian'=>1]),
            $this->i('Granola Bowl', 'Greek yoghurt, granola, seasonal fruit and honey.', 'Breakfast', 9.90, ['Gluten','Milk','Nuts'], 430, 17, 58, 16, 27, ['vegetarian'=>1]),
            $this->i('Chicken Club Sandwich', 'Chicken, bacon, lettuce, tomato and mayo on toasted bread.', 'Lunch', 13.90, ['Gluten','Eggs'], 720, 39, 62, 34, 8),
            $this->i('Caprese Panini', 'Mozzarella, tomato, basil pesto and rocket.', 'Lunch', 11.90, ['Gluten','Milk','Nuts'], 560, 22, 61, 25, 6, ['vegetarian'=>1]),
            $this->i('Caesar Salad', 'Romaine, parmesan, croutons and classic Caesar dressing.', 'Lunch', 11.50, ['Gluten','Eggs','Fish','Milk'], 420, 14, 27, 29, 4),
            $this->i('Carrot Cake', 'Spiced carrot cake with cream cheese frosting.', 'Bakery', 6.50, ['Gluten','Eggs','Milk','Nuts'], 460, 7, 56, 24, 35, ['vegetarian'=>1]),
            $this->i('Croissant', 'Buttery laminated pastry baked fresh.', 'Bakery', 4.20, ['Gluten','Eggs','Milk'], 310, 6, 32, 18, 5, ['vegetarian'=>1]),
            $this->i('Flat White', 'Double espresso with silky steamed milk.', 'Coffee', 4.50, ['Milk'], 130, 7, 10, 7, 9, ['vegetarian'=>1,'prep'=>5]),
        ];
    }

    private function packFineDining(): array
    {
        return [
            $this->i('Beef Tartare', 'Hand-cut beef, capers, shallot, mustard and cured egg yolk.', 'Starters', 18.90, ['Eggs','Mustard'], 360, 28, 9, 23, 3, ['chef'=>1]),
            $this->i('Seared Scallops', 'Scallops, cauliflower purée, brown butter and herb oil.', 'Starters', 21.90, ['Molluscs','Milk'], 330, 25, 16, 20, 5),
            $this->i('Burrata', 'Burrata, heritage tomato, basil and aged balsamic.', 'Starters', 17.90, ['Milk','Sulphites'], 390, 17, 18, 28, 10, ['vegetarian'=>1]),
            $this->i('Duck Breast', 'Pink duck breast, carrot, orange jus and potato fondant.', 'Mains', 31.90, ['Milk','Celery'], 690, 44, 47, 34, 14, ['chef'=>1,'prep'=>25]),
            $this->i('Beef Fillet', 'Beef fillet, pomme purée, seasonal greens and red wine jus.', 'Mains', 38.90, ['Milk','Celery','Sulphites'], 760, 58, 43, 39, 8, ['bestseller'=>1,'prep'=>25]),
            $this->i('Pan-Roasted Cod', 'Cod, mussel velouté, leek and herb potato.', 'Mains', 29.90, ['Fish','Molluscs','Milk'], 590, 47, 41, 25, 7),
            $this->i('Wild Mushroom Risotto', 'Carnaroli rice, wild mushroom, parmesan and truffle.', 'Mains', 25.90, ['Milk','Celery'], 620, 18, 73, 28, 6, ['vegetarian'=>1]),
            $this->i('Cheese Selection', 'Three artisan cheeses with fruit chutney and crackers.', 'Cheese', 16.90, ['Milk','Gluten'], 510, 24, 37, 30, 17, ['vegetarian'=>1]),
            $this->i('Chocolate Fondant', 'Dark chocolate fondant, vanilla ice cream and cocoa crumb.', 'Desserts', 13.90, ['Gluten','Eggs','Milk'], 590, 9, 61, 34, 37, ['vegetarian'=>1]),
            $this->i('Crème Brûlée', 'Vanilla custard with crisp caramel top.', 'Desserts', 12.90, ['Eggs','Milk'], 430, 8, 43, 25, 37, ['vegetarian'=>1]),
        ];
    }

    private function packBar(): array
    {
        return [
            $this->i('Truffle Fries', 'Crispy fries with parmesan, truffle and herbs.', 'Bar Bites', 8.90, ['Milk'], 520, 11, 59, 27, 3, ['vegetarian'=>1,'bestseller'=>1]),
            $this->i('Chicken Wings', 'Crispy wings with hot honey glaze and ranch dip.', 'Bar Bites', 11.90, ['Milk','Eggs'], 690, 43, 34, 42, 15),
            $this->i('Beef Sliders', 'Mini beef burgers with cheddar, pickles and house sauce.', 'Bar Bites', 13.90, ['Gluten','Eggs','Milk','Mustard'], 760, 34, 58, 43, 9),
            $this->i('Loaded Nachos', 'Corn chips, cheese, beans, jalapeño, salsa and sour cream.', 'Sharing', 13.50, ['Milk'], 790, 25, 83, 41, 10, ['vegetarian'=>1]),
            $this->i('Charcuterie Board', 'Cured meats, olives, pickles, bread and mustard.', 'Sharing', 19.90, ['Gluten','Mustard'], 820, 38, 49, 51, 8),
            $this->i('Cheese Board', 'Selected cheeses, grapes, chutney and crackers.', 'Sharing', 18.90, ['Gluten','Milk'], 760, 31, 55, 46, 19, ['vegetarian'=>1]),
            $this->i('Crispy Calamari', 'Fried calamari with lemon and garlic aioli.', 'Bar Bites', 12.90, ['Gluten','Molluscs','Eggs'], 490, 27, 42, 24, 3),
            $this->i('Halloumi Bites', 'Crispy halloumi with chilli honey and sesame.', 'Bar Bites', 10.90, ['Milk','Sesame'], 460, 23, 31, 27, 13, ['vegetarian'=>1]),
            $this->i('Chocolate Brownie', 'Warm chocolate brownie with vanilla ice cream.', 'Desserts', 8.90, ['Gluten','Eggs','Milk'], 590, 8, 69, 33, 45, ['vegetarian'=>1]),
            $this->i('Salted Caramel Cheesecake', 'Creamy cheesecake with salted caramel sauce.', 'Desserts', 9.50, ['Gluten','Eggs','Milk'], 560, 9, 61, 31, 41, ['vegetarian'=>1]),
        ];
    }
}
