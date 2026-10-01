<?php

namespace App\Services\Inventory;

/**
 * PMD_INVENTORY_GLOBAL_CATALOG_R10
 *
 * Broad restaurant stock starter catalogue. It is deliberately a suggestion
 * layer, not a closed taxonomy: restaurants can always type their own item.
 *
 * The catalogue covers common stock used across cafes, bars, bakeries,
 * pizzerias, burger shops, steakhouses, seafood, Mediterranean, Turkish,
 * Arabic/Levantine, Persian, Indian, Chinese, Japanese, Korean, Thai,
 * Vietnamese, Mexican/Latin, European and general international kitchens.
 */
final class PmdInventoryStockCatalog
{
    public static function all(): array
    {
        static $items;

        if ($items !== null) {
            return $items;
        }

        $items = [];

        self::group($items, 'Produce', 'g', 'kg', 1000, [
            ['Tomato', 'tomatoes|tomat|domates|tomate|pomodoro|طماطم|گوجه|گوجه فرنگی', 'global|italian|turkish|arabic|persian|mediterranean|mexican|indian'],
            ['Cherry tomato', 'cherry tomatoes|kokteyl domates|pomodorini', 'mediterranean|italian|turkish'],
            ['Cucumber', 'cucumbers|salatalik|salatalık|khiyar|خیار|خيار', 'global|turkish|arabic|persian|mediterranean|asian'],
            ['Onion', 'onions|yellow onion|sogan|soğan|basal|بصل|پیاز', 'global'],
            ['Red onion', 'purple onion|kirmizi sogan|kırmızı soğan', 'global|mediterranean'],
            ['White onion', 'white onions', 'global'],
            ['Spring onion', 'green onion|scallion|scallions|taze sogan|negi', 'asian|global'],
            ['Garlic', 'garlic cloves|sarmisak|sarımsak|thoom|ثوم|سیر', 'global'],
            ['Ginger', 'fresh ginger|zencefil|زنجبیل|زنجبيل', 'asian|indian|global'],
            ['Potato', 'potatoes|patates|batata|بطاطا|سیب زمینی', 'global'],
            ['Sweet potato', 'yam|sweet potatoes|batata helwa', 'global'],
            ['Carrot', 'carrots|havuc|havuç|jazar|جزر|هویج', 'global'],
            ['Celery', 'celery stalk|kereviz|karafs|کرفس', 'global'],
            ['Leek', 'leeks|pirasa|pırasa', 'european|turkish'],
            ['Zucchini', 'courgette|kabak|zucchine|کدو', 'mediterranean|global'],
            ['Eggplant', 'aubergine|patlican|patlıcan|bademjan|بادمجان|باذنجان', 'turkish|arabic|persian|mediterranean|asian'],
            ['Bell pepper', 'capsicum|sweet pepper|biber|فلفل دلمه|فلفل رومي', 'global'],
            ['Red bell pepper', 'red pepper|kirmizi biber|kırmızı biber', 'global'],
            ['Green bell pepper', 'green pepper|yesil biber|yeşil biber', 'global'],
            ['Yellow bell pepper', 'yellow pepper', 'global'],
            ['Chili pepper', 'chilli|hot pepper|aci biber|acı biber|فلفل حار|فلفل تند', 'global|asian|mexican|indian'],
            ['Jalapeno', 'jalapeño|jalapenos', 'mexican|latin'],
            ['Serrano pepper', 'serrano chilli', 'mexican|latin'],
            ['Habanero', 'habanero pepper', 'mexican|latin'],
            ['Poblano pepper', 'poblano', 'mexican|latin'],
            ['Broccoli', 'broccoli florets', 'global|asian'],
            ['Cauliflower', 'karnabahar|gol kalam|گل کلم', 'global|indian'],
            ['Cabbage', 'white cabbage|lahana|kalam|کلم', 'global|asian|european'],
            ['Red cabbage', 'purple cabbage|kirmizi lahana', 'global|turkish'],
            ['Chinese cabbage', 'napa cabbage|wombok|baechu', 'chinese|korean|asian'],
            ['Bok choy', 'pak choi|bokchoi', 'chinese|asian'],
            ['Lettuce', 'iceberg|marul|khas|خس', 'global'],
            ['Romaine lettuce', 'cos lettuce|romaine', 'global|mediterranean'],
            ['Spinach', 'ispanak|esfenaj|اسفناج|سبانخ', 'global|turkish|persian|indian'],
            ['Rocket', 'arugula|roka|rucola', 'mediterranean|italian|turkish'],
            ['Kale', 'curly kale', 'global'],
            ['Swiss chard', 'chard|pazi|pazı', 'mediterranean|turkish'],
            ['Mushroom', 'mushrooms|champignon|mantar|قارچ|فطر', 'global'],
            ['Shiitake mushroom', 'shiitake', 'japanese|chinese|asian'],
            ['Oyster mushroom', 'oyster mushrooms', 'asian|global'],
            ['Bean sprouts', 'mung bean sprouts|sprouts', 'asian|chinese|thai|vietnamese'],
            ['Green beans', 'string beans|fasulye|لوبیا سبز', 'global|turkish|persian'],
            ['Peas', 'green peas|bezelye|نخود فرنگی', 'global|indian'],
            ['Corn', 'sweet corn|maize|misir|mısır|ذرت', 'global|mexican'],
            ['Avocado', 'avocados', 'mexican|global'],
            ['Artichoke', 'artichokes|enginar', 'mediterranean|turkish|italian'],
            ['Asparagus', 'asparagus spears', 'european|global'],
            ['Fennel', 'fresh fennel|rezene', 'mediterranean|italian'],
            ['Beetroot', 'beet|beets|pancar|چغندر', 'global|european'],
            ['Radish', 'radishes|turp|تربچه', 'global|asian'],
            ['Turnip', 'turnips|saljam|شلغم', 'global|middle eastern'],
            ['Pumpkin', 'squash|bal kabagi|bal kabağı|کدو حلوایی', 'global'],
            ['Butternut squash', 'butternut', 'global'],
            ['Okra', 'bamya|okra pods|بامیه|بامية', 'turkish|arabic|persian|indian'],
        ]);

        self::group($items, 'Fruit', 'g', 'kg', 1000, [
            ['Lemon', 'lemons|limon|لیمو|ليمون', 'global|mediterranean|middle eastern'],
            ['Lime', 'limes|misket limon|لیمو ترش', 'global|mexican|thai|vietnamese|bar'],
            ['Orange', 'oranges|portakal|برتقال', 'global'],
            ['Grapefruit', 'grapefruit', 'global|bar'],
            ['Apple', 'apples|elma|سیب|تفاح', 'global'],
            ['Pear', 'pears|armut|گلابی', 'global'],
            ['Banana', 'bananas|muz|موز', 'global'],
            ['Pineapple', 'ananas|pineapples|آناناس', 'global|thai|latin|bar'],
            ['Mango', 'mangoes|mangga|انبه', 'indian|asian|latin|global'],
            ['Papaya', 'papayas', 'asian|latin'],
            ['Watermelon', 'karpuz|هندوانه|بطيخ', 'global|middle eastern'],
            ['Melon', 'cantaloupe|honeydew|kavun|خربزه', 'global'],
            ['Strawberry', 'strawberries|cilek|çilek|توت فرنگی', 'global|bakery'],
            ['Blueberry', 'blueberries', 'global|bakery'],
            ['Raspberry', 'raspberries', 'global|bakery'],
            ['Blackberry', 'blackberries', 'global|bakery'],
            ['Grape', 'grapes|uzum|üzüm|انگور|عنب', 'global|mediterranean'],
            ['Pomegranate', 'nar|انار|رمان', 'turkish|persian|arabic|mediterranean'],
            ['Peach', 'peaches|seftali|şeftali|هلو', 'global'],
            ['Plum', 'plums|erik|آلو', 'global'],
            ['Apricot', 'apricots|kayisi|kayısı|زردآلو|مشمش', 'turkish|persian|middle eastern'],
            ['Fig', 'figs|incir|انجیر|تين', 'mediterranean|turkish|middle eastern'],
            ['Date', 'dates|hurma|تمر|خرما', 'arabic|persian|turkish|middle eastern'],
            ['Coconut', 'fresh coconut|hindistan cevizi|نارگیل', 'asian|indian|thai'],
            ['Kiwi', 'kiwifruit', 'global'],
            ['Passion fruit', 'passionfruit|maracuja', 'latin|bar|dessert'],
        ]);

        self::group($items, 'Fresh herbs', 'g', 'bunch', null, [
            ['Parsley', 'flat leaf parsley|maydanoz|جعفری|بقدونس', 'mediterranean|turkish|arabic|persian|global'],
            ['Coriander', 'cilantro|fresh coriander|kisnis|kişniş|گشنیز|كزبرة', 'indian|asian|middle eastern|mexican'],
            ['Mint', 'fresh mint|nane|نعناع', 'middle eastern|turkish|persian|bar'],
            ['Basil', 'fresh basil|feslegen|fesleğen|ریحان', 'italian|thai|mediterranean'],
            ['Thai basil', 'holy basil|horapa', 'thai|asian'],
            ['Dill', 'fresh dill|dereotu|شوید', 'turkish|persian|european'],
            ['Rosemary', 'fresh rosemary|biberiye', 'mediterranean|european'],
            ['Thyme', 'fresh thyme|kekik|آویشن|زعتر', 'mediterranean|middle eastern'],
            ['Oregano', 'fresh oregano|mercankosk|mercanköşk', 'italian|greek|mediterranean'],
            ['Sage', 'fresh sage|ada cayi', 'european|italian'],
            ['Tarragon', 'fresh tarragon|tarhun', 'french|persian|european'],
            ['Chives', 'fresh chives|frenk sogani', 'european|global'],
            ['Lemongrass', 'lemon grass|citronella stalk', 'thai|vietnamese|asian'],
            ['Kaffir lime leaves', 'makrut lime leaves|lime leaves', 'thai|asian'],
            ['Curry leaves', 'fresh curry leaves|kari patta', 'indian|south asian'],
            ['Shiso', 'perilla leaf|oba', 'japanese|asian'],
        ]);

        self::group($items, 'Spices', 'g', 'bag', null, [
            ['Salt', 'table salt|sea salt|kosher salt|tuz|نمک|ملح', 'global'],
            ['Black pepper', 'ground pepper|peppercorn|karabiber|فلفل سیاه', 'global'],
            ['White pepper', 'white peppercorn', 'asian|global'],
            ['Paprika', 'sweet paprika|toz biber|پاپریکا', 'global|turkish|hungarian'],
            ['Smoked paprika', 'pimenton|smoked pepper', 'spanish|global'],
            ['Chili flakes', 'red pepper flakes|pul biber|aleppo pepper|فلفل پول بیبر', 'turkish|middle eastern|global'],
            ['Cayenne pepper', 'cayenne|red chilli powder', 'global|indian'],
            ['Cumin', 'ground cumin|kimyon|زیره|كمون', 'middle eastern|indian|mexican|global'],
            ['Coriander seed', 'ground coriander|coriander powder', 'indian|middle eastern'],
            ['Turmeric', 'ground turmeric|zerdecal|زردچوبه|كركم', 'indian|persian|middle eastern'],
            ['Cinnamon', 'ground cinnamon|cinnamon sticks|tarcin|دارچین|قرفة', 'global|middle eastern|indian'],
            ['Cardamom', 'green cardamom|hel|هل|هل سبز', 'indian|persian|arabic'],
            ['Black cardamom', 'black elaichi', 'indian'],
            ['Cloves', 'whole cloves|karanfil|میخک|قرنفل', 'global|indian|middle eastern'],
            ['Nutmeg', 'ground nutmeg|muskat|جوز هندی', 'global|european'],
            ['Allspice', 'pimento|yenibahar|بهار', 'middle eastern|caribbean'],
            ['Star anise', 'star aniseed|badian', 'chinese|vietnamese|asian'],
            ['Fennel seed', 'fennel seeds|rezene tohumu', 'indian|mediterranean'],
            ['Fenugreek', 'methi|shanbalileh|شنبلیله', 'indian|persian'],
            ['Mustard seed', 'mustard seeds|rai', 'indian|global'],
            ['Nigella seed', 'black seed|kalonji|corek otu|çörek otu', 'turkish|middle eastern|indian'],
            ['Sumac', 'sumak|سماق', 'turkish|arabic|persian|middle eastern'],
            ['Za’atar', 'zaatar|zatar|زعتر', 'arabic|levantine|middle eastern'],
            ['Dried oregano', 'oregano dry|kekik', 'italian|greek|turkish'],
            ['Dried mint', 'dry mint|kuru nane|نعناع خشک', 'turkish|persian|middle eastern'],
            ['Bay leaf', 'bay leaves|defne yapragi|برگ بو', 'global|mediterranean'],
            ['Saffron', 'safran|زعفران', 'persian|spanish|indian|middle eastern'],
            ['Garam masala', 'garam masala powder', 'indian'],
            ['Curry powder', 'madras curry powder', 'indian|global'],
            ['Tandoori masala', 'tandoori spice', 'indian'],
            ['Chinese five spice', 'five-spice|5 spice', 'chinese'],
            ['Gochugaru', 'korean chilli flakes|korean red pepper', 'korean'],
            ['Shichimi', 'shichimi togarashi|japanese seven spice', 'japanese'],
            ['Ras el hanout', 'ras el hanout spice', 'north african|moroccan'],
            ['Baharat', 'baharat spice|seven spice', 'arabic|middle eastern'],
            ['Dukkah', 'duqqa|dukkah spice', 'egyptian|middle eastern'],
        ]);

        self::group($items, 'Meat', 'g', 'kg', 1000, [
            ['Beef', 'beef meat|dana eti|گوشت گاو|لحم بقري', 'global'],
            ['Beef mince', 'ground beef|minced beef|kiyma|kıyma|گوشت چرخ کرده', 'global|turkish|middle eastern'],
            ['Beef tenderloin', 'fillet steak|filet mignon|bonfile', 'steakhouse|global'],
            ['Beef ribeye', 'rib eye|antrikot', 'steakhouse'],
            ['Beef sirloin', 'sirloin steak|striploin', 'steakhouse'],
            ['Beef brisket', 'brisket', 'american|bbq'],
            ['Beef short rib', 'short ribs', 'american|korean|bbq'],
            ['Veal', 'veal meat|dana|گوساله', 'european|mediterranean'],
            ['Lamb', 'lamb meat|kuzu eti|گوشت بره|لحم خروف', 'turkish|arabic|persian|mediterranean'],
            ['Lamb mince', 'ground lamb|minced lamb|kuzu kiyma', 'turkish|middle eastern'],
            ['Lamb chops', 'lamb cutlets|pirzola', 'turkish|mediterranean'],
            ['Lamb shoulder', 'lamb shoulder meat', 'middle eastern|european'],
            ['Goat meat', 'goat|mutton|keçi eti', 'indian|middle eastern|african'],
            ['Pork', 'pork meat|schwein', 'global|european|asian'],
            ['Pork belly', 'belly pork|samgyeopsal', 'asian|korean|global'],
            ['Pork shoulder', 'pork butt', 'bbq|global'],
            ['Pork ribs', 'spare ribs|baby back ribs', 'bbq|global'],
            ['Bacon', 'smoked bacon|rashers', 'global'],
            ['Ham', 'cooked ham|prosciutto cotto', 'global|italian'],
            ['Prosciutto', 'parma ham|prosciutto crudo', 'italian'],
            ['Salami', 'dry salami|sucuk salami', 'italian|european'],
            ['Sausage', 'sausages|bratwurst|sosis', 'global'],
            ['Sucuk', 'sujuk|sucuk sausage', 'turkish|middle eastern'],
            ['Chorizo', 'spanish chorizo|mexican chorizo', 'spanish|mexican'],
            ['Bratwurst', 'bratwurst sausage|grillwurst', 'german|central european'],
            ['Weisswurst', 'weißwurst|white sausage', 'german|bavarian'],
            ['Frankfurter', 'frankfurter sausage|wiener würstchen|wiener wurstchen', 'german|central european'],
            ['Leberkase', 'leberkäse|meat loaf bavarian', 'german|bavarian'],
            ['Pork schnitzel', 'schweineschnitzel|schnitzel pork', 'german|austrian|central european'],
        ]);

        self::group($items, 'Poultry', 'g', 'kg', 1000, [
            ['Chicken', 'chicken meat|tavuk|مرغ|دجاج', 'global'],
            ['Chicken breast', 'chicken fillet|tavuk gogsu|سینه مرغ', 'global'],
            ['Chicken thigh', 'chicken thighs|tavuk but', 'global'],
            ['Chicken wing', 'chicken wings|kanat', 'global'],
            ['Whole chicken', 'whole bird|roast chicken', 'global'],
            ['Turkey', 'turkey meat|hindi', 'global'],
            ['Duck', 'duck meat|ordek|ördek', 'chinese|french|global'],
        ]);

        self::group($items, 'Seafood', 'g', 'kg', 1000, [
            ['Salmon', 'salmon fillet|somon|ماهی سالمون|سلمون', 'global|japanese'],
            ['Tuna', 'fresh tuna|tuna loin|ton baligi', 'japanese|global'],
            ['Cod', 'cod fillet|morina', 'european|global'],
            ['Haddock', 'haddock fillet', 'european'],
            ['Sea bass', 'branzino|levrek', 'mediterranean|turkish'],
            ['Sea bream', 'dorade|dorada|cupra|çupra', 'mediterranean|turkish'],
            ['Trout', 'rainbow trout|alabalik', 'global|turkish'],
            ['Mackerel', 'uskumru|saba', 'japanese|turkish|global'],
            ['Sardine', 'sardines|sardalya', 'mediterranean|global'],
            ['Anchovy', 'anchovies|hamsi', 'italian|turkish|mediterranean'],
            ['Swordfish', 'sword fish', 'mediterranean'],
            ['Shrimp', 'prawn|prawns|karides|میگو|روبيان', 'global|asian'],
            ['Tiger prawn', 'king prawn|jumbo shrimp', 'global|asian'],
            ['Squid', 'calamari|kalamar', 'mediterranean|asian'],
            ['Octopus', 'ahtapot|pulpo', 'mediterranean|japanese'],
            ['Mussel', 'mussels|midye|cozze', 'mediterranean|turkish'],
            ['Clam', 'clams|vongole', 'italian|asian'],
            ['Scallop', 'scallops', 'global'],
            ['Crab', 'crab meat|yengec', 'global|asian'],
            ['Lobster', 'lobster tail|istakoz', 'fine dining|global'],
            ['Eel', 'unagi|fresh eel', 'japanese|asian'],
        ]);

        self::group($items, 'Dairy & eggs', 'ml', 'l', 1000, [
            ['Milk', 'whole milk|full fat milk|sut|süt|شیر|حليب', 'global|cafe|bakery'],
            ['Skim milk', 'low fat milk', 'global|cafe'],
            ['Oat milk', 'oat drink', 'cafe|vegan'],
            ['Soy milk', 'soy drink', 'cafe|asian|vegan'],
            ['Almond milk', 'almond drink', 'cafe|vegan'],
            ['Coconut milk', 'coconut cream milk|hindistan cevizi sutu', 'thai|indian|asian'],
            ['Cream', 'heavy cream|double cream|cooking cream|krema', 'global|bakery'],
            ['Buttermilk', 'buttermilk', 'bakery|american'],
            ['Yogurt', 'yoghurt|plain yogurt|yogurt|yoğurt|ماست|لبن', 'turkish|middle eastern|indian|global'],
            ['Ayran', 'ayran drink', 'turkish'],
            ['Kefir', 'kefir drink', 'turkish|european'],
        ]);

        self::group($items, 'Dairy & eggs', 'g', 'kg', 1000, [
            ['Butter', 'unsalted butter|salted butter|tereyagi|tereyağı|کره|زبدة', 'global|bakery'],
            ['Mozzarella', 'mozzarella cheese|pizza cheese', 'italian|pizza'],
            ['Parmesan', 'parmigiano|parmesan cheese', 'italian'],
            ['Cheddar', 'cheddar cheese', 'global|burger'],
            ['Gouda', 'gouda cheese', 'european'],
            ['Emmental', 'swiss cheese|emmentaler', 'european'],
            ['Feta', 'feta cheese|beyaz peynir', 'greek|turkish|mediterranean'],
            ['Halloumi', 'hellim|halloumi cheese', 'cypriot|middle eastern|mediterranean'],
            ['Cream cheese', 'philadelphia style cream cheese', 'bakery|global'],
            ['Mascarpone', 'mascarpone cheese', 'italian|bakery'],
            ['Ricotta', 'ricotta cheese', 'italian'],
            ['Goat cheese', 'chevre|keçi peyniri', 'mediterranean|french'],
            ['Blue cheese', 'gorgonzola|roquefort|stilton', 'european'],
            ['Labneh', 'labne|strained yogurt cheese|لبنة', 'arabic|turkish|middle eastern'],
            ['Quark', 'speisequark|magerquark', 'german|central european|bakery'],
            ['Sour cream', 'saure sahne|sauerrahm', 'german|central european|global'],
            ['Creme fraiche', 'crème fraîche|creme fraiche', 'german|french|european'],
        ]);

        self::group($items, 'Dairy & eggs', 'piece', 'tray', null, [
            ['Eggs', 'egg|eggs large|yumurta|تخم مرغ|بيض', 'global|bakery'],
        ]);

        self::group($items, 'Dry goods', 'g', 'kg', 1000, [
            ['White rice', 'rice|long grain rice|pirinc|pirinç|برنج|رز', 'global|asian|middle eastern'],
            ['Basmati rice', 'basmati|basmati pirinc', 'indian|persian|middle eastern'],
            ['Jasmine rice', 'thai jasmine rice', 'thai|asian'],
            ['Sushi rice', 'japanese short grain rice', 'japanese'],
            ['Brown rice', 'wholegrain rice', 'global'],
            ['Bulgur', 'bulgur wheat|bulgur pilavi|بلغور', 'turkish|middle eastern'],
            ['Couscous', 'cous cous|كسكس', 'north african|middle eastern'],
            ['Quinoa', 'quinoa grain', 'global|healthy'],
            ['Barley', 'pearl barley|arpa', 'global'],
            ['Oats', 'rolled oats|yulaf', 'breakfast|bakery'],
            ['Polenta', 'cornmeal|maize meal', 'italian'],
            ['Semolina', 'irmik|سميد', 'mediterranean|middle eastern|bakery'],
            ['Wheat flour', 'flour|plain flour|all purpose flour|un|آرد|طحين', 'global|bakery'],
            ['Bread flour', 'strong flour|pizza flour', 'bakery|pizza'],
            ['00 flour', 'tipo 00|pizza flour 00', 'italian|pizza'],
            ['Whole wheat flour', 'wholemeal flour', 'bakery'],
            ['Corn flour', 'cornstarch|maizena|corn starch', 'global|asian'],
            ['Rice flour', 'rice flour', 'asian|gluten free'],
            ['Chickpea flour', 'gram flour|besan|nohut unu', 'indian|middle eastern'],
            ['Breadcrumbs', 'bread crumbs|panko crumbs', 'global'],
            ['Panko', 'japanese breadcrumbs|panko crumbs', 'japanese|asian'],
            ['Spaghetti', 'spaghetti pasta', 'italian'],
            ['Penne', 'penne pasta', 'italian'],
            ['Fusilli', 'spiral pasta', 'italian'],
            ['Lasagne sheets', 'lasagna sheets', 'italian'],
            ['Tagliatelle', 'tagliatelle pasta', 'italian'],
            ['Egg noodles', 'chinese egg noodles', 'chinese|asian'],
            ['Rice noodles', 'rice vermicelli|pho noodles', 'vietnamese|thai|asian'],
            ['Udon noodles', 'udon', 'japanese'],
            ['Soba noodles', 'buckwheat noodles|soba', 'japanese'],
            ['Ramen noodles', 'ramen', 'japanese'],
            ['Glass noodles', 'cellophane noodles|mung bean noodles', 'asian'],
            ['Red lentils', 'red lentil|kirmizi mercimek|عدس قرمز', 'turkish|middle eastern|indian'],
            ['Green lentils', 'brown lentils|yesil mercimek|عدس', 'global|middle eastern'],
            ['Chickpeas', 'garbanzo|nohut|نخود|حمص', 'middle eastern|indian|mediterranean'],
            ['Kidney beans', 'red kidney beans', 'mexican|global'],
            ['Black beans', 'frijoles negros', 'mexican|latin'],
            ['White beans', 'cannellini beans|navy beans|kuru fasulye', 'italian|turkish|global'],
            ['Mung beans', 'mung bean|green gram', 'asian|indian'],
            ['Split peas', 'yellow split peas|green split peas', 'global|persian|indian'],
            ['Sugar', 'white sugar|granulated sugar|seker|şeker|شکر|سكر', 'global|bakery|bar'],
            ['Brown sugar', 'light brown sugar|dark brown sugar', 'bakery|bar'],
            ['Icing sugar', 'powdered sugar|confectioners sugar', 'bakery'],
            ['Spaetzle', 'spätzle|spatzle|egg noodles german', 'german|swabian|central european'],
            ['Potato dumplings', 'kartoffelknödel|kartoffelknoedel|klöße|kloesse', 'german|central european'],
            ['Bread dumplings', 'semmelknödel|semmelknoedel', 'german|bavarian|austrian'],
        ]);

        self::group($items, 'Nuts & seeds', 'g', 'kg', 1000, [
            ['Almonds', 'almond|بادام|لوز', 'global|middle eastern|bakery'],
            ['Walnuts', 'walnut|گردو|جوز', 'global|middle eastern|bakery'],
            ['Pistachios', 'pistachio|antep fistigi|پسته|فستق', 'turkish|persian|middle eastern|bakery'],
            ['Hazelnuts', 'hazelnut|findik|فندق', 'turkish|european|bakery'],
            ['Cashews', 'cashew nuts', 'indian|asian|global'],
            ['Peanuts', 'peanut|groundnut', 'asian|global'],
            ['Pine nuts', 'pine nut|cam fistigi|صنوبر', 'mediterranean|middle eastern'],
            ['Sesame seeds', 'sesame|susam|کنجد|سمسم', 'middle eastern|asian'],
            ['Black sesame', 'black sesame seeds', 'japanese|asian'],
            ['Sunflower seeds', 'sunflower seed', 'global'],
            ['Pumpkin seeds', 'pepitas|kabak cekirdegi', 'global|mexican'],
            ['Chia seeds', 'chia', 'healthy|global'],
            ['Flax seeds', 'linseed|flaxseed', 'healthy|global'],
        ]);

        self::group($items, 'Oils & condiments', 'ml', 'l', 1000, [
            ['Olive oil', 'extra virgin olive oil|evoo|zeytinyagi|روغن زیتون|زيت زيتون', 'mediterranean|global'],
            ['Sunflower oil', 'sunflower cooking oil|aycicek yagi', 'global|turkish'],
            ['Vegetable oil', 'cooking oil|frying oil', 'global'],
            ['Canola oil', 'rapeseed oil', 'global'],
            ['Sesame oil', 'toasted sesame oil', 'asian|chinese|korean|japanese'],
            ['Coconut oil', 'coconut cooking oil', 'asian|vegan'],
            ['Soy sauce', 'light soy sauce|shoyu|soya sauce', 'asian|chinese|japanese'],
            ['Dark soy sauce', 'dark soya', 'chinese|asian'],
            ['Fish sauce', 'nam pla|nuoc mam', 'thai|vietnamese|asian'],
            ['Oyster sauce', 'oyster seasoning sauce', 'chinese|asian'],
            ['Hoisin sauce', 'hoisin', 'chinese|vietnamese'],
            ['Teriyaki sauce', 'teriyaki', 'japanese|asian'],
            ['Rice vinegar', 'rice wine vinegar', 'asian|japanese'],
            ['White vinegar', 'distilled vinegar', 'global'],
            ['Apple cider vinegar', 'cider vinegar|acv', 'global'],
            ['Balsamic vinegar', 'balsamico', 'italian|mediterranean'],
            ['Red wine vinegar', 'wine vinegar red', 'mediterranean'],
            ['Lemon juice', 'bottled lemon juice', 'global|bar'],
            ['Lime juice', 'bottled lime juice', 'global|bar'],
            ['Tahini', 'sesame paste|tahin|ارده|طحينة', 'middle eastern|turkish|persian'],
            ['Pomegranate molasses', 'nar eksisi|nar ekşisi|دبس رمان|رب انار', 'turkish|arabic|persian'],
            ['Date molasses', 'date syrup|dibs tamr', 'arabic|middle eastern'],
            ['Grape molasses', 'pekmez|grape syrup', 'turkish'],
            ['Honey', 'bal|عسل', 'global'],
            ['Maple syrup', 'maple', 'american|breakfast'],
            ['Ketchup', 'tomato ketchup', 'global|fast food'],
            ['Mayonnaise', 'mayo', 'global|fast food'],
            ['Mustard', 'yellow mustard|dijon mustard', 'global|european'],
            ['Hot sauce', 'chilli sauce|tabasco style', 'global'],
            ['Sriracha', 'sriracha sauce', 'asian|global'],
            ['Sweet chili sauce', 'sweet chilli sauce', 'thai|asian'],
            ['BBQ sauce', 'barbecue sauce', 'american|bbq'],
            ['Worcestershire sauce', 'worcester sauce', 'global'],
            ['German mustard', 'mittelscharfer senf|senf mittelscharf|bavarian mustard', 'german|central european'],
            ['Curry ketchup', 'curryketchup|currywurst sauce', 'german|fast food'],
            ['Remoulade', 'remouladensauce|remoulade sauce', 'german|european'],
            ['Horseradish sauce', 'meerrettich|meerrettichsauce', 'german|central european'],
            ['Applesauce', 'apfelmus|apple sauce', 'german|central european'],
        ]);

        self::group($items, 'German deli & pantry', 'g', 'kg', 1000, [
            ['Sauerkraut', 'sauerkraut|fermented cabbage', 'german|central european'],
            ['Prepared red cabbage', 'rotkohl|blaukraut|cooked red cabbage', 'german|central european'],
            ['Gherkins', 'gewürzgurken|gewurzgurken|essiggurken|pickled cucumbers', 'german|central european'],
        ]);

        self::group($items, 'Middle Eastern pantry', 'g', 'kg', 1000, [
            ['Hummus', 'humus|حمص جاهز', 'middle eastern|arabic|turkish'],
            ['Baba ghanoush', 'baba ganoush|mutabbal|متبل', 'arabic|middle eastern'],
            ['Freekeh', 'frikeh|فريكة', 'arabic|middle eastern'],
            ['Maftoul', 'palestinian couscous|مفتول', 'levantine'],
            ['Kibbeh bulgur', 'fine bulgur|koftelik bulgur', 'turkish|arabic'],
            ['Tarhana', 'tarhana powder', 'turkish'],
            ['Kadayif', 'kadayif pastry|kataifi', 'turkish|middle eastern|bakery'],
            ['Baklava pastry', 'phyllo|filo pastry|yufka', 'turkish|greek|middle eastern'],
            ['Rose water', 'golab|گلاب|ماء الورد', 'persian|arabic|indian'],
            ['Orange blossom water', 'ma zhar|ماء الزهر', 'arabic|middle eastern'],
            ['Dried lime', 'loomi|limoo amani|لیمو عمانی', 'persian|arabic'],
            ['Barberries', 'zereshk|زرشک', 'persian'],
            ['Dried sour cherries', 'albaloo dry|آلبالو خشک', 'persian|turkish'],
            ['Grape leaves', 'vine leaves|sarma leaves|yaprak', 'turkish|greek|arabic'],
        ]);

        self::group($items, 'Asian pantry', 'g', 'kg', 1000, [
            ['Miso paste', 'miso|white miso|red miso', 'japanese'],
            ['Gochujang', 'korean chilli paste|gochujang paste', 'korean'],
            ['Doenjang', 'korean soybean paste', 'korean'],
            ['Kimchi', 'baechu kimchi|korean kimchi', 'korean'],
            ['Tofu', 'firm tofu|silken tofu|bean curd', 'asian|chinese|japanese|vegan'],
            ['Tempeh', 'tempe', 'indonesian|vegan'],
            ['Edamame', 'soy beans green', 'japanese|asian'],
            ['Nori', 'seaweed sheets|sushi nori', 'japanese'],
            ['Wakame', 'wakame seaweed', 'japanese'],
            ['Kombu', 'kombu kelp', 'japanese'],
            ['Bonito flakes', 'katsuobushi', 'japanese'],
            ['Dashi powder', 'dashi stock powder', 'japanese'],
            ['Wasabi', 'wasabi paste|horseradish wasabi', 'japanese'],
            ['Pickled ginger', 'gari|sushi ginger', 'japanese'],
            ['Bamboo shoots', 'bamboo shoot', 'chinese|asian'],
            ['Water chestnuts', 'water chestnut', 'chinese|asian'],
            ['Tamarind paste', 'tamarind|imli paste', 'indian|thai|asian'],
            ['Curry paste red', 'red curry paste|thai red curry', 'thai'],
            ['Curry paste green', 'green curry paste|thai green curry', 'thai'],
            ['Massaman curry paste', 'massaman paste', 'thai'],
            ['Sambal oelek', 'sambal|chilli paste', 'indonesian|asian'],
        ]);

        self::group($items, 'Indian pantry', 'g', 'kg', 1000, [
            ['Paneer', 'indian cottage cheese', 'indian'],
            ['Ghee', 'clarified butter|desi ghee', 'indian|middle eastern'],
            ['Urad dal', 'black gram|urad lentil', 'indian'],
            ['Chana dal', 'split chickpeas|bengal gram', 'indian'],
            ['Toor dal', 'arhar dal|pigeon peas', 'indian'],
            ['Moong dal', 'yellow mung dal', 'indian'],
            ['Tikka masala paste', 'tikka paste', 'indian'],
            ['Mango chutney', 'mango chutney', 'indian'],
            ['Mint chutney', 'green chutney|hari chutney', 'indian'],
            ['Tamarind chutney', 'imli chutney', 'indian'],
            ['Papadum', 'papad|poppadom', 'indian'],
        ]);

        self::group($items, 'Mexican & Latin pantry', 'g', 'kg', 1000, [
            ['Corn tortilla', 'tortillas corn|maize tortilla', 'mexican'],
            ['Flour tortilla', 'wheat tortilla|tortilla wrap', 'mexican|tex mex'],
            ['Tortilla chips', 'nacho chips', 'mexican|tex mex'],
            ['Masa harina', 'corn masa flour', 'mexican'],
            ['Refried beans', 'frijoles refritos', 'mexican'],
            ['Salsa roja', 'red salsa', 'mexican'],
            ['Salsa verde', 'green salsa|tomatillo salsa', 'mexican'],
            ['Chipotle in adobo', 'chipotle peppers|adobo chipotle', 'mexican'],
            ['Tomatillo', 'tomatillos', 'mexican'],
            ['Queso fresco', 'fresh mexican cheese', 'mexican'],
        ]);

        self::group($items, 'Bakery', 'piece', 'piece', 1, [
            ['Burger bun', 'hamburger bun|burger buns', 'burger|fast food'],
            ['Hot dog bun', 'hotdog bun|hot dog rolls', 'fast food'],
            ['Baguette', 'french baguette', 'french|bakery'],
            ['Ciabatta', 'ciabatta bread', 'italian|bakery'],
            ['Pita bread', 'pita|khobz|arabic bread|خبز|نان پیتا', 'middle eastern|mediterranean'],
            ['Lavash', 'lavash bread|lavaş|نان لواش', 'turkish|persian|caucasian'],
            ['Naan', 'naan bread|نان', 'indian'],
            ['Tortilla wrap', 'wrap bread', 'mexican|fast food'],
            ['Croissant', 'butter croissant', 'french|cafe|bakery'],
            ['Bagel', 'bagels', 'cafe|bakery'],
            ['Brioche bun', 'brioche roll', 'burger|bakery'],
            ['Pretzel', 'brezel|laugenbrezel|pretzel', 'german|bakery'],
            ['Bread roll', 'brötchen|broetchen|semmel|schrippe', 'german|bakery'],
            ['Rye bread', 'roggenbrot|rye loaf', 'german|bakery'],
            ['Sourdough bread', 'sauerteigbrot|sourdough loaf', 'german|bakery'],
        ]);

        self::group($items, 'Bakery & dessert', 'g', 'kg', 1000, [
            ['Cocoa powder', 'cacao powder', 'bakery|dessert'],
            ['Dark chocolate', 'dark couverture|bittersweet chocolate', 'bakery|dessert'],
            ['Milk chocolate', 'milk couverture', 'bakery|dessert'],
            ['White chocolate', 'white couverture', 'bakery|dessert'],
            ['Chocolate chips', 'choc chips', 'bakery'],
            ['Baking powder', 'baking powder', 'bakery'],
            ['Baking soda', 'bicarbonate soda|sodium bicarbonate', 'bakery'],
            ['Dry yeast', 'instant yeast|active dry yeast', 'bakery|pizza'],
            ['Gelatin', 'gelatine powder|gelatin sheets', 'dessert'],
            ['Vanilla', 'vanilla extract|vanilla paste', 'bakery|dessert'],
            ['Custard powder', 'custard mix', 'bakery'],
            ['Ice cream vanilla', 'vanilla ice cream', 'dessert'],
            ['Ice cream chocolate', 'chocolate ice cream', 'dessert'],
            ['Ice cream strawberry', 'strawberry ice cream', 'dessert'],
        ]);

        self::group($items, 'Coffee & tea', 'g', 'kg', 1000, [
            ['Coffee beans', 'espresso beans|coffee bean|kahve cekirdegi', 'cafe|global'],
            ['Ground coffee', 'filter coffee|coffee grounds', 'cafe|global'],
            ['Turkish coffee', 'turk kahvesi|türk kahvesi', 'turkish|cafe'],
            ['Instant coffee', 'soluble coffee', 'cafe'],
            ['Black tea', 'tea leaves|siyah cay|چای سیاه|شاي', 'cafe|global'],
            ['Green tea', 'sencha style green tea', 'cafe|asian'],
            ['Earl Grey tea', 'earl grey', 'cafe'],
            ['Matcha', 'matcha powder|green tea powder', 'japanese|cafe'],
            ['Chai tea', 'masala chai|chai masala', 'indian|cafe'],
        ]);

        self::group($items, 'Soft drinks', 'ml', 'bottle', null, [
            ['Still water', 'water bottle|mineral water|su|آب|ماء', 'global'],
            ['Sparkling water', 'soda water bottle|maden suyu|گازدار', 'global'],
            ['Cola', 'coke|cola drink', 'global'],
            ['Diet cola', 'cola zero|diet coke|zero cola', 'global'],
            ['Lemonade', 'lemon soda|limonata', 'global'],
            ['Orange soda', 'orange soft drink|fanta style', 'global'],
            ['Tonic water', 'tonic|quinine tonic', 'bar'],
            ['Ginger ale', 'ginger beer soft drink', 'bar'],
            ['Energy drink', 'energy drinks', 'bar|global'],
            ['Apple juice', 'apple juice', 'global'],
            ['Orange juice', 'orange juice|oj', 'global'],
            ['Pineapple juice', 'pineapple juice', 'bar|global'],
            ['Cranberry juice', 'cranberry juice', 'bar'],
            ['Tomato juice', 'tomato juice', 'bar|global'],
        ]);

        // PMD_INVENTORY_SUPERMARKET_MASTER_CATALOG_R14
        // Common wholesale beverage families kept in the curated core so they
        // remain available even before the optional Atlas materializer runs.
        self::group($items, 'Juice', 'ml', 'bottle', null, [
            ['Grape juice', 'grape juice|traubensaft', 'bar|cafe|global'],
            ['Mango juice', 'mango juice|mangosaft', 'bar|cafe|global'],
            ['Grapefruit juice', 'grapefruit juice|grapefruitsaft', 'bar|cafe'],
            ['Pomegranate juice', 'pomegranate juice|granatapfelsaft', 'bar|cafe|middle eastern'],
            ['Peach juice', 'peach juice|pfirsichsaft', 'bar|cafe'],
            ['Blackcurrant juice', 'blackcurrant juice|cassis juice|johannisbeersaft', 'bar|cafe'],
            ['Multivitamin juice', 'multi vitamin juice|multivitaminsaft', 'cafe|global'],
            ['Cherry juice', 'sour cherry juice|kirschsaft|sauerkirschsaft', 'bar|cafe'],
            ['Carrot juice', 'carrot juice|karottensaft', 'cafe|global'],
            ['Passion fruit juice', 'passionfruit juice|maracuja juice', 'bar|cafe'],
        ]);

        self::group($items, 'Beer & cider', 'ml', 'bottle', null, [
            ['Lager beer', 'lager|beer lager|bira', 'bar|global'],
            ['Pilsner beer', 'pilsner|pils', 'bar|global'],
            ['Wheat beer', 'weissbier|weizen', 'bar|german'],
            ['IPA beer', 'ipa|india pale ale', 'bar'],
            ['Stout beer', 'stout|porter beer', 'bar'],
            ['Alcohol-free beer', 'non alcoholic beer|0 beer', 'bar'],
            ['Cider', 'apple cider alcoholic', 'bar'],
            ['Pear cider', 'perry|pear cider', 'bar'],
            ['Pale ale', 'pale ale beer', 'bar'],
            ['Amber ale', 'amber ale beer', 'bar'],
            ['Porter beer', 'porter', 'bar'],
            ['Sour beer', 'sour ale', 'bar'],
            ['Radler', 'shandy|beer lemonade mix', 'bar|german'],
            ['Craft lager', 'craft beer lager', 'bar'],
            ['Alcohol-free wheat beer', 'non alcoholic wheat beer|alkoholfreies weizen', 'bar|german'],
        ]);

        self::group($items, 'Wine', 'ml', 'bottle', null, [
            ['Red wine', 'red wine bottle|kirmizi sarap|شراب قرمز', 'bar|global'],
            ['White wine', 'white wine bottle|beyaz sarap', 'bar|global'],
            ['Rose wine', 'rosé wine|rose sarap', 'bar|global'],
            ['Sparkling wine', 'prosecco|cava|sparkling', 'bar|global'],
            ['Champagne', 'champagne bottle', 'bar|fine dining'],
            ['Dessert wine', 'sweet wine', 'bar'],
            ['Port wine', 'port', 'bar'],
            ['Sherry', 'sherry wine', 'bar'],
            ['Prosecco', 'prosecco sparkling wine', 'bar|italian'],
            ['Cava', 'cava sparkling wine', 'bar|spanish'],
            ['Sauvignon Blanc', 'sauvignon blanc wine', 'bar'],
            ['Chardonnay', 'chardonnay wine', 'bar'],
            ['Riesling', 'riesling wine', 'bar|german'],
            ['Pinot Grigio', 'pinot grigio|pinot gris wine', 'bar'],
            ['Cabernet Sauvignon', 'cabernet sauvignon wine', 'bar'],
            ['Merlot', 'merlot wine', 'bar'],
            ['Pinot Noir', 'pinot noir wine', 'bar'],
        ]);

        self::group($items, 'Spirits', 'ml', 'bottle', null, [
            ['Vodka', 'vodka bottle|votka', 'bar|global'],
            ['Gin', 'gin bottle|cin', 'bar|global'],
            ['White rum', 'rum white|light rum', 'bar'],
            ['Dark rum', 'rum dark', 'bar'],
            ['Spiced rum', 'rum spiced', 'bar'],
            ['Bourbon', 'bourbon whiskey', 'bar'],
            ['Whisky', 'whiskey|scotch whisky', 'bar'],
            ['Tequila blanco', 'silver tequila|tequila', 'bar|mexican'],
            ['Tequila reposado', 'reposado tequila', 'bar|mexican'],
            ['Mezcal', 'mezcal agave spirit', 'bar|mexican'],
            ['Brandy', 'brandy spirit', 'bar'],
            ['Cognac', 'cognac brandy', 'bar'],
            ['Raki', 'rakı|turkish raki', 'bar|turkish'],
            ['Arak', 'arak spirit|عرق', 'bar|middle eastern'],
            ['Ouzo', 'ouzo spirit', 'bar|greek'],
            ['Sake', 'nihonshu|rice wine sake', 'bar|japanese'],
            ['Soju', 'korean soju', 'bar|korean'],
            ['Aperol', 'aperol aperitif', 'bar|italian'],
            ['Campari', 'campari bitter', 'bar|italian'],
            ['Vermouth sweet', 'sweet vermouth|rosso vermouth', 'bar'],
            ['Vermouth dry', 'dry vermouth', 'bar'],
            ['Triple sec', 'cointreau style orange liqueur', 'bar'],
            ['Coffee liqueur', 'kahlua style liqueur', 'bar'],
            ['Irish cream', 'baileys style cream liqueur', 'bar'],
            ['Amaretto', 'almond liqueur', 'bar|italian'],
            ['Scotch whisky', 'scotch|scotch whiskey', 'bar'],
            ['Irish whiskey', 'irish whisky|irish whiskey', 'bar'],
            ['Rye whiskey', 'rye whisky|rye whiskey', 'bar'],
            ['Tennessee whiskey', 'tennessee whisky|tennessee whiskey', 'bar'],
            ['London dry gin', 'dry gin|london gin', 'bar'],
            ['Pink gin', 'pink gin', 'bar'],
            ['Aged rum', 'aged rum|gold rum', 'bar'],
            ['Tequila anejo', 'añejo tequila|anejo tequila', 'bar|mexican'],
            ['Sambuca', 'sambuca liqueur', 'bar|italian'],
            ['Limoncello', 'lemon liqueur|limoncello', 'bar|italian'],
            ['Grappa', 'grappa spirit', 'bar|italian'],
            ['Absinthe', 'absinthe spirit', 'bar'],
            ['Peach schnapps', 'peach schnapps liqueur', 'bar'],
            ['Blue curacao', 'blue curaçao|orange liqueur blue', 'bar'],
        ]);

        self::group($items, 'Frozen', 'g', 'kg', 1000, [
            ['French fries', 'frozen fries|chips|patates kizartmasi', 'fast food|global'],
            ['Sweet potato fries', 'frozen sweet potato fries', 'fast food'],
            ['Onion rings', 'frozen onion rings', 'fast food'],
            ['Chicken nuggets', 'nuggets', 'fast food'],
            ['Falafel', 'frozen falafel|فلافل', 'middle eastern'],
            ['Gyoza', 'dumplings japanese|potstickers', 'japanese|asian'],
            ['Spring rolls', 'frozen spring roll', 'asian'],
            ['Edamame frozen', 'frozen edamame', 'japanese|asian'],
            ['Mixed berries frozen', 'frozen berries', 'dessert|smoothie'],
            ['Potato croquettes', 'kroketten|kartoffelkroketten|frozen croquettes', 'german|fast food|central european'],
            ['Frozen schnitzel', 'tiefkühl schnitzel|tiefkuehl schnitzel|breaded schnitzel frozen', 'german|austrian|central european'],
        ]);

        self::group($items, 'Packaging', 'piece', 'case', null, [
            ['Takeaway box', 'takeout box|food container|clamshell', 'restaurant supplies'],
            ['Soup container', 'soup cup|deli container', 'restaurant supplies'],
            ['Paper cup', 'coffee cup|hot cup', 'cafe|restaurant supplies'],
            ['Plastic cup', 'cold drink cup', 'bar|restaurant supplies'],
            ['Cup lid', 'coffee lid|drink lid', 'restaurant supplies'],
            ['Paper bag', 'takeaway bag|kraft bag', 'restaurant supplies'],
            ['Plastic bag', 'carrier bag', 'restaurant supplies'],
            ['Napkin', 'napkins|serviette', 'restaurant supplies'],
            ['Paper straw', 'straws|drink straw', 'restaurant supplies'],
            ['Wooden cutlery', 'disposable cutlery|fork knife spoon set', 'restaurant supplies'],
            ['Aluminium foil', 'aluminum foil|kitchen foil', 'restaurant supplies'],
            ['Cling film', 'plastic wrap|food wrap', 'restaurant supplies'],
            ['Baking paper', 'parchment paper', 'restaurant supplies'],
            ['Pizza box', 'pizza boxes', 'pizza|restaurant supplies'],
            ['Burger box', 'burger clamshell', 'burger|restaurant supplies'],
            ['Sauce cup', 'portion pot|condiment cup', 'restaurant supplies'],
        ]);

        self::group($items, 'Cleaning', 'ml', 'l', 1000, [
            ['Dishwasher detergent', 'dish machine detergent', 'restaurant supplies'],
            ['Rinse aid', 'dishwasher rinse aid', 'restaurant supplies'],
            ['Dish soap', 'washing up liquid', 'restaurant supplies'],
            ['Surface sanitizer', 'sanitiser|food safe sanitizer', 'restaurant supplies'],
            ['Degreaser', 'kitchen degreaser', 'restaurant supplies'],
            ['Floor cleaner', 'floor detergent', 'restaurant supplies'],
            ['Glass cleaner', 'window cleaner', 'restaurant supplies'],
            ['Hand soap', 'liquid hand soap', 'restaurant supplies'],
            ['Bleach', 'chlorine bleach|bleaching cleaner', 'restaurant supplies'],
            ['Disinfectant spray', 'disinfection spray|surface disinfectant', 'restaurant supplies'],
            ['Drain cleaner', 'drain opener|pipe cleaner', 'restaurant supplies'],
            ['Descaler', 'limescale remover|coffee machine descaler', 'restaurant supplies|cafe'],
            ['Oven cleaner', 'oven and grill cleaner', 'restaurant supplies'],
            ['Stainless steel cleaner', 'steel polish|stainless cleaner', 'restaurant supplies'],
            ['Laundry detergent', 'washing detergent', 'restaurant supplies'],
            ['Fabric softener', 'laundry softener', 'restaurant supplies'],
        ]);

        self::group($items, 'Kitchen & utility', 'piece', 'piece', 1, [
            ['Mop', 'floor mop|mop head', 'restaurant supplies'],
            ['Broom', 'floor broom|sweeping broom', 'restaurant supplies'],
            ['Dustpan', 'dust pan', 'restaurant supplies'],
            ['Cleaning brush', 'scrubbing brush|utility brush', 'restaurant supplies'],
            ['Dish brush', 'washing up brush', 'restaurant supplies'],
            ['Cleaning sponge', 'dish sponge|scrub sponge', 'restaurant supplies'],
            ['Scouring pad', 'scrubber|scourer', 'restaurant supplies'],
            ['Microfiber cloth', 'microfibre cloth|cleaning cloth|tuch', 'restaurant supplies'],
            ['Kitchen cloth', 'dish cloth|cleaning rag', 'restaurant supplies'],
            ['Squeegee', 'window squeegee|floor squeegee', 'restaurant supplies'],
            ['Cleaning bucket', 'mop bucket|bucket', 'restaurant supplies'],
            ['Rubber gloves', 'cleaning gloves|dishwashing gloves', 'restaurant supplies'],
            ['Disposable gloves', 'nitrile gloves|vinyl gloves|food gloves', 'restaurant supplies'],
            ['Coffee filter', 'coffee filters|filter paper', 'cafe|restaurant supplies'],
            ['Batteries', 'battery|aa battery|aaa battery', 'restaurant supplies'],
        ]);

        self::group($items, 'Paper & hygiene', 'pack', 'pack', 1, [
            ['Paper towels', 'kitchen roll|paper towel roll', 'restaurant supplies'],
            ['Toilet paper', 'toilet roll|bath tissue', 'restaurant supplies'],
            ['Facial tissues', 'tissue box|paper tissues', 'restaurant supplies'],
            ['Wet wipes', 'cleaning wipes|moist wipes', 'restaurant supplies'],
            ['Disinfecting wipes', 'sanitizing wipes|sanitising wipes', 'restaurant supplies'],
            ['Bin bags', 'trash bags|garbage bags|bin liners', 'restaurant supplies'],
            ['Hand towels', 'paper hand towels|c-fold towels', 'restaurant supplies'],
            ['Centerfeed roll', 'blue roll|center feed paper', 'restaurant supplies'],
        ]);

        // PMD_INVENTORY_REWE_PRIORITY_R18
        // The curated PMD list remains authoritative. A reviewed REWE runtime
        // layer may add real supermarket SKUs/variants, then Ingredient Atlas
        // fills the remaining broad catalogue. Earlier layers win name
        // collisions so a reviewed REWE item is never replaced by Atlas.
        $items = self::mergeRuntimeReweCatalog($items);
        $items = self::mergeRuntimeAtlasCatalog($items);

        return $items;
    }

    private static function mergeRuntimeReweCatalog(array $items): array
    {
        $root = dirname(__DIR__, 3);
        $path = $root.'/storage/app/pmd-inventory-rewe-catalog-r18.json';

        if (!is_file($path) || (int)@filesize($path) < 10) {
            return $items;
        }

        try {
            $decoded = json_decode((string)@file_get_contents($path), true);
            $runtime = is_array($decoded['items'] ?? null)
                ? $decoded['items']
                : [];

            $seen = [];
            foreach ($items as $item) {
                $key = self::normalize((string)($item['name'] ?? ''));
                if ($key !== '') {
                    $seen[$key] = true;
                }
            }

            foreach ($runtime as $row) {
                if (!is_array($row)) {
                    continue;
                }

                $name = trim((string)($row['name'] ?? ''));
                $key = self::normalize($name);
                if ($name === '' || $key === '' || isset($seen[$key])) {
                    continue;
                }

                $aliases = array_values(array_unique(array_filter(array_map(
                    static fn ($value) => trim((string)$value),
                    is_array($row['aliases'] ?? null) ? $row['aliases'] : []
                ))));

                $items[] = [
                    'name' => mb_substr($name, 0, 190),
                    'category' => mb_substr(trim((string)($row['category'] ?? 'Produce')), 0, 100),
                    'unit' => trim((string)($row['unit'] ?? 'g')) ?: 'g',
                    'purchase_unit' => trim((string)($row['purchase_unit'] ?? 'kg')) ?: 'kg',
                    'purchase_to_base' => isset($row['purchase_to_base'])
                        && is_numeric($row['purchase_to_base'])
                        ? max(0.0001, (float)$row['purchase_to_base'])
                        : null,
                    'aliases' => $aliases,
                    'cuisines' => [],
                    'catalog_source' => 'rewe-reviewed',
                    'rewe_image_slug' => trim((string)($row['rewe_image_slug'] ?? '')),
                ];
                $seen[$key] = true;
            }
        } catch (\Throwable $error) {
            return $items;
        }

        return $items;
    }

    private static function mergeRuntimeAtlasCatalog(array $items): array
    {
        $root = dirname(__DIR__, 3);
        $path = function_exists('storage_path')
            ? storage_path('app/pmd-inventory-atlas-catalog-r14.json')
            : $root.'/storage/app/pmd-inventory-atlas-catalog-r14.json';

        if (!is_file($path) || (int)@filesize($path) < 10) {
            return $items;
        }

        try {
            $decoded = json_decode((string)@file_get_contents($path), true);
            $runtime = is_array($decoded['items'] ?? null)
                ? $decoded['items']
                : (is_array($decoded) ? $decoded : []);

            $seen = [];
            foreach ($items as $item) {
                $key = self::normalize((string)($item['name'] ?? ''));
                if ($key !== '') {
                    $seen[$key] = true;
                }
            }

            foreach ($runtime as $row) {
                if (!is_array($row)) {
                    continue;
                }

                $name = trim((string)($row['name'] ?? ''));
                $key = self::normalize($name);
                if ($name === '' || $key === '' || isset($seen[$key])) {
                    continue;
                }

                $aliases = array_values(array_unique(array_filter(array_map(
                    static fn ($value) => trim((string)$value),
                    is_array($row['aliases'] ?? null) ? $row['aliases'] : []
                ))));

                $items[] = [
                    'name' => mb_substr($name, 0, 190),
                    'category' => mb_substr(trim((string)($row['category'] ?? 'Pantry')), 0, 100),
                    'unit' => trim((string)($row['unit'] ?? 'piece')) ?: 'piece',
                    'purchase_unit' => trim((string)($row['purchase_unit'] ?? ($row['unit'] ?? 'piece'))) ?: 'piece',
                    'purchase_to_base' => isset($row['purchase_to_base'])
                        && is_numeric($row['purchase_to_base'])
                        ? max(0.0001, (float)$row['purchase_to_base'])
                        : null,
                    'aliases' => $aliases,
                    'cuisines' => [],
                    'catalog_source' => 'ingredient-atlas',
                    'atlas_slug' => trim((string)($row['atlas_slug'] ?? '')),
                    'image_slug' => trim((string)($row['image_slug'] ?? ($row['atlas_slug'] ?? ''))),
                    'atlas_kind' => trim((string)($row['atlas_kind'] ?? '')),
                    'atlas_category' => trim((string)($row['atlas_category'] ?? '')),
                    'atlas_subcategory' => trim((string)($row['atlas_subcategory'] ?? '')),
                ];
                $seen[$key] = true;
            }
        } catch (\Throwable $error) {
            // A damaged optional runtime catalog must never break Inventory.
            return $items;
        }

        return $items;
    }

    public static function bestMatch(string $term): ?array
    {
        $query = self::normalize($term);
        if ($query === '') {
            return null;
        }

        $best = null;
        $bestScore = 0;

        foreach (self::all() as $item) {
            $score = self::score($item, $query);
            if ($score > $bestScore) {
                $best = $item;
                $bestScore = $score;
            }
        }

        return $bestScore >= 72 ? $best : null;
    }

    private static function group(
        array &$items,
        string $category,
        string $unit,
        string $purchaseUnit,
        ?float $purchaseToBase,
        array $rows
    ): void {
        foreach ($rows as $row) {
            $name = (string)($row[0] ?? '');
            $aliases = array_values(array_filter(array_map(
                'trim',
                explode('|', (string)($row[1] ?? ''))
            )));

            // PMD_INVENTORY_GERMAN_MARKET_ALIASES_R10
            // Germany is a primary launch market. Owners can search the visual
            // catalogue using the supermarket/kitchen words they actually use
            // (for example Zwiebel, Hackfleisch, Sahne, Brötchen, Pommes).
            $germanAliases = self::germanAliases($name);
            if ($germanAliases) {
                $aliases = array_values(array_unique(array_merge(
                    $aliases,
                    $germanAliases
                )));
            }

            $cuisines = array_values(array_filter(array_map(
                'trim',
                explode('|', (string)($row[2] ?? ''))
            )));

            if ($name === '') {
                continue;
            }

            $items[] = [
                'name' => $name,
                'category' => $category,
                'unit' => $unit,
                'purchase_unit' => $purchaseUnit,
                'purchase_to_base' => $purchaseToBase,
                'aliases' => $aliases,
                'cuisines' => $cuisines,
            ];
        }
    }

    /**
     * PMD_INVENTORY_GERMAN_MARKET_ALIASES_R10
     *
     * High-frequency German supermarket / restaurant vocabulary. This keeps
     * the master catalogue language-neutral while making the Germany workflow
     * feel native. Unknown/custom items are still always allowed.
     */
    private static function germanAliases(string $name): array
    {
        static $map = [
            'Tomato' => ['Tomate', 'Tomaten'],
            'Cherry tomato' => ['Cherrytomate', 'Cocktailtomate'],
            'Cucumber' => ['Gurke', 'Salatgurke'],
            'Onion' => ['Zwiebel', 'Zwiebeln'],
            'Red onion' => ['rote Zwiebel', 'rote Zwiebeln'],
            'Spring onion' => ['Frühlingszwiebel', 'Lauchzwiebel'],
            'Garlic' => ['Knoblauch'],
            'Ginger' => ['Ingwer'],
            'Potato' => ['Kartoffel', 'Kartoffeln'],
            'Sweet potato' => ['Süßkartoffel', 'Süsskartoffel'],
            'Carrot' => ['Karotte', 'Möhre', 'Moehre'],
            'Celery' => ['Sellerie'],
            'Leek' => ['Lauch', 'Porree'],
            'Zucchini' => ['Zucchini'],
            'Eggplant' => ['Aubergine'],
            'Bell pepper' => ['Paprika', 'Paprikaschote'],
            'Red bell pepper' => ['rote Paprika'],
            'Green bell pepper' => ['grüne Paprika', 'gruene Paprika'],
            'Yellow bell pepper' => ['gelbe Paprika'],
            'Chili pepper' => ['Chili', 'Peperoni'],
            'Broccoli' => ['Brokkoli'],
            'Cauliflower' => ['Blumenkohl'],
            'Cabbage' => ['Weißkohl', 'Weisskohl', 'Kohl'],
            'Red cabbage' => ['Rotkohl', 'Blaukraut'],
            'Chinese cabbage' => ['Chinakohl'],
            'Lettuce' => ['Salat', 'Eisbergsalat'],
            'Romaine lettuce' => ['Römersalat', 'Romana Salat'],
            'Spinach' => ['Spinat'],
            'Rocket' => ['Rucola'],
            'Mushroom' => ['Champignon', 'Pilze', 'Pilz'],
            'Green beans' => ['grüne Bohnen', 'gruene Bohnen'],
            'Peas' => ['Erbsen'],
            'Corn' => ['Mais'],
            'Avocado' => ['Avocado'],
            'Asparagus' => ['Spargel'],
            'Beetroot' => ['Rote Bete', 'Rote Beete'],
            'Radish' => ['Radieschen'],
            'Pumpkin' => ['Kürbis', 'Kuerbis'],
            'Lemon' => ['Zitrone', 'Zitronen'],
            'Lime' => ['Limette', 'Limetten'],
            'Orange' => ['Orange', 'Orangen'],
            'Apple' => ['Apfel', 'Äpfel', 'Aepfel'],
            'Pear' => ['Birne', 'Birnen'],
            'Banana' => ['Banane', 'Bananen'],
            'Pineapple' => ['Ananas'],
            'Mango' => ['Mango'],
            'Watermelon' => ['Wassermelone'],
            'Melon' => ['Melone'],
            'Strawberry' => ['Erdbeere', 'Erdbeeren'],
            'Blueberry' => ['Blaubeere', 'Heidelbeere'],
            'Raspberry' => ['Himbeere', 'Himbeeren'],
            'Blackberry' => ['Brombeere', 'Brombeeren'],
            'Grape' => ['Traube', 'Weintraube'],
            'Peach' => ['Pfirsich'],
            'Plum' => ['Pflaume'],
            'Apricot' => ['Aprikose'],
            'Parsley' => ['Petersilie'],
            'Coriander' => ['Koriander'],
            'Mint' => ['Minze'],
            'Basil' => ['Basilikum'],
            'Dill' => ['Dill'],
            'Rosemary' => ['Rosmarin'],
            'Thyme' => ['Thymian'],
            'Oregano' => ['Oregano'],
            'Salt' => ['Salz'],
            'Black pepper' => ['schwarzer Pfeffer', 'Pfeffer'],
            'Paprika' => ['Paprikapulver'],
            'Cumin' => ['Kreuzkümmel', 'Kreuzkuemmel'],
            'Cinnamon' => ['Zimt'],
            'Nutmeg' => ['Muskat', 'Muskatnuss'],
            'Beef' => ['Rindfleisch'],
            'Beef mince' => ['Rinderhack', 'Rinderhackfleisch', 'Hackfleisch'],
            'Beef tenderloin' => ['Rinderfilet'],
            'Beef ribeye' => ['Ribeye', 'Entrecôte', 'Entrecote'],
            'Veal' => ['Kalbfleisch'],
            'Lamb' => ['Lammfleisch'],
            'Lamb mince' => ['Lammhack', 'Lammhackfleisch'],
            'Pork' => ['Schweinefleisch'],
            'Pork belly' => ['Schweinebauch'],
            'Bacon' => ['Speck', 'Bacon'],
            'Ham' => ['Schinken'],
            'Sausage' => ['Wurst', 'Würstchen', 'Wuerstchen'],
            'Chicken' => ['Hähnchen', 'Haehnchen', 'Huhn'],
            'Chicken breast' => ['Hähnchenbrust', 'Haehnchenbrust'],
            'Chicken thigh' => ['Hähnchenschenkel', 'Haehnchenschenkel'],
            'Chicken wing' => ['Hähnchenflügel', 'Haehnchenfluegel'],
            'Turkey' => ['Pute', 'Putenfleisch'],
            'Duck' => ['Ente'],
            'Salmon' => ['Lachs'],
            'Tuna' => ['Thunfisch'],
            'Cod' => ['Kabeljau'],
            'Sea bass' => ['Wolfsbarsch'],
            'Sea bream' => ['Dorade'],
            'Trout' => ['Forelle'],
            'Shrimp' => ['Garnele', 'Garnelen', 'Shrimps'],
            'Squid' => ['Tintenfisch', 'Calamari'],
            'Octopus' => ['Oktopus'],
            'Mussel' => ['Muschel', 'Miesmuschel'],
            'Milk' => ['Milch', 'Vollmilch'],
            'Skim milk' => ['Magermilch', 'fettarme Milch'],
            'Oat milk' => ['Hafermilch', 'Haferdrink'],
            'Soy milk' => ['Sojamilch', 'Sojadrink'],
            'Cream' => ['Sahne', 'Schlagsahne'],
            'Yogurt' => ['Joghurt'],
            'Butter' => ['Butter'],
            'Mozzarella' => ['Mozzarella'],
            'Parmesan' => ['Parmesan'],
            'Cheddar' => ['Cheddar'],
            'Gouda' => ['Gouda'],
            'Feta' => ['Feta', 'Schafskäse', 'Schafskaese'],
            'Cream cheese' => ['Frischkäse', 'Frischkaese'],
            'Eggs' => ['Ei', 'Eier'],
            'White rice' => ['Reis', 'Langkornreis'],
            'Basmati rice' => ['Basmatireis'],
            'Wheat flour' => ['Mehl', 'Weizenmehl'],
            'Bread flour' => ['Brotmehl'],
            'Whole wheat flour' => ['Vollkornmehl'],
            'Breadcrumbs' => ['Paniermehl', 'Semmelbrösel', 'Semmelbroesel'],
            'Spaghetti' => ['Spaghetti', 'Nudeln'],
            'Penne' => ['Penne', 'Nudeln'],
            'Fusilli' => ['Fusilli', 'Nudeln'],
            'Red lentils' => ['rote Linsen'],
            'Green lentils' => ['grüne Linsen', 'gruene Linsen'],
            'Chickpeas' => ['Kichererbsen'],
            'Kidney beans' => ['Kidneybohnen'],
            'White beans' => ['weiße Bohnen', 'weisse Bohnen'],
            'Sugar' => ['Zucker'],
            'Brown sugar' => ['brauner Zucker'],
            'Icing sugar' => ['Puderzucker'],
            'Almonds' => ['Mandeln'],
            'Walnuts' => ['Walnüsse', 'Walnuesse'],
            'Hazelnuts' => ['Haselnüsse', 'Haselnuesse'],
            'Peanuts' => ['Erdnüsse', 'Erdnuesse'],
            'Olive oil' => ['Olivenöl', 'Olivenoel'],
            'Sunflower oil' => ['Sonnenblumenöl', 'Sonnenblumenoel'],
            'Vinegar' => ['Essig'],
            'Ketchup' => ['Ketchup'],
            'Mayonnaise' => ['Mayonnaise', 'Mayo'],
            'Mustard' => ['Senf'],
            'Honey' => ['Honig'],
            'Bread' => ['Brot'],
            'Burger bun' => ['Burgerbrötchen', 'Burgerbroetchen'],
            'Pita bread' => ['Pitabrot'],
            'Coffee beans' => ['Kaffeebohnen'],
            'Ground coffee' => ['Kaffeepulver', 'gemahlener Kaffee'],
            'Black tea' => ['Schwarztee'],
            'Green tea' => ['Grüntee', 'Gruentee'],
            'Still water' => ['stilles Wasser', 'Wasser still'],
            'Sparkling water' => ['Mineralwasser', 'Sprudel', 'Wasser mit Kohlensäure'],
            'Cola' => ['Cola'],
            'Orange soda' => ['Orangenlimonade'],
            'Apple juice' => ['Apfelsaft'],
            'Orange juice' => ['Orangensaft'],
            'Beer' => ['Bier'],
            'Pilsner' => ['Pils', 'Pilsner'],
            'Wheat beer' => ['Weizenbier', 'Weißbier', 'Weissbier'],
            'Red wine' => ['Rotwein'],
            'White wine' => ['Weißwein', 'Weisswein'],
            'French fries' => ['Pommes', 'Pommes frites', 'Fritten'],
            'Sweet potato fries' => ['Süßkartoffelpommes', 'Suesskartoffelpommes'],
            'Onion rings' => ['Zwiebelringe'],
            'Chicken nuggets' => ['Hähnchennuggets', 'Haehnchennuggets'],
            'Takeaway box' => ['Take-away Box', 'Verpackungsbox', 'Essensbox'],
            'Paper cup' => ['Pappbecher'],
            'Paper bag' => ['Papiertüte', 'Papiertuete'],
            'Napkin' => ['Serviette', 'Servietten'],
            'Aluminium foil' => ['Alufolie'],
            'Cling film' => ['Frischhaltefolie'],
            'Baking paper' => ['Backpapier'],
            'Pizza box' => ['Pizzakarton'],
            'Dishwasher detergent' => ['Spülmaschinenreiniger', 'Spuelmaschinenreiniger'],
            'Dish soap' => ['Spülmittel', 'Spuelmittel'],
            'Surface sanitizer' => ['Flächendesinfektion', 'Flaechendesinfektion'],
            'Floor cleaner' => ['Bodenreiniger'],
            'Glass cleaner' => ['Glasreiniger'],
            'Hand soap' => ['Handseife'],
        ];

        return $map[$name] ?? [];
    }

    private static function score(array $item, string $query): int
    {
        $name = self::normalize((string)($item['name'] ?? ''));
        $category = self::normalize((string)($item['category'] ?? ''));
        $aliases = array_map([self::class, 'normalize'], (array)($item['aliases'] ?? []));
        $cuisines = array_map([self::class, 'normalize'], (array)($item['cuisines'] ?? []));

        if ($name === $query) {
            return 120;
        }
        if (str_starts_with($name, $query)) {
            return 112;
        }
        foreach ($aliases as $alias) {
            if ($alias === $query) {
                return 116;
            }
            if ($alias !== '' && str_starts_with($alias, $query)) {
                return 108;
            }
        }
        if (str_contains($name, $query)) {
            return 100;
        }
        foreach ($aliases as $alias) {
            if ($alias !== '' && str_contains($alias, $query)) {
                return 98;
            }
        }

        $words = preg_split('/\s+/u', $name.' '.implode(' ', $aliases)) ?: [];
        foreach ($words as $word) {
            if ($word !== '' && str_starts_with($word, $query)) {
                return 94;
            }
        }

        if ($category !== '' && str_contains($category, $query)) {
            return 82;
        }
        foreach ($cuisines as $cuisine) {
            if ($cuisine !== '' && str_contains($cuisine, $query)) {
                return 78;
            }
        }

        if (
            strlen($query) >= 4
            && preg_match('/^[a-z0-9 ]+$/', $query)
            && preg_match('/^[a-z0-9 ]+$/', $name)
            && levenshtein($query, $name) <= 2
        ) {
            return 74;
        }

        return 0;
    }

    private static function normalize(string $value): string
    {
        $value = mb_strtolower(trim($value));

        if ($value === '') {
            return '';
        }

        if (function_exists('iconv')) {
            $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
            if (is_string($ascii) && $ascii !== '') {
                $value = strtolower($ascii);
            }
        }

        $value = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $value) ?? $value;
        return trim(preg_replace('/\s+/u', ' ', $value) ?? $value);
    }
}
