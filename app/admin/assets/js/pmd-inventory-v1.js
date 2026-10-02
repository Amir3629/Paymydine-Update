/* PMD_INVENTORY_CONTROL_R20 */
(function () {
  'use strict';

  if (window.PMDInventoryControlR1) return;

  var root = document.querySelector('[data-pmd-inventory-root]');
  var bootstrapNode = document.getElementById('pmd-inventory-bootstrap');
  if (!root || !bootstrapNode) return;

  var bootstrap = {};
  try {
    bootstrap = JSON.parse(bootstrapNode.textContent || '{}');
  } catch (ignore) {
    bootstrap = {};
  }

  var state = {
    ready: Boolean(bootstrap.ready),
    aiReceipts: Boolean(bootstrap.ai_receipts),
    currency: String(bootstrap.currency || 'EUR'),
    today: String(bootstrap.today || ''),
    snapshot: bootstrap.snapshot && typeof bootstrap.snapshot === 'object'
      ? bootstrap.snapshot
      : {},
    busy: false,
    search: '',
    recipeSearch: '',
    commonSearch: '',
    shoppingDays: 1,
    // PMD_INVENTORY_SELF_CHECKOUT_BROWSER_R19
    // Each workflow keeps its own category/search/visible-card state.
    browsers: {
      dashboard: {query: '', main: 'Popular', section: 'All', limit: 12},
      catalog: {query: '', main: 'Popular', section: 'All', limit: 18},
      purchase: {query: '', main: 'Popular', section: 'All', limit: 12},
      waste: {query: '', main: 'All', section: 'All', limit: 12},
      recipe: {query: '', main: 'All', section: 'All', limit: 12}
    }
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ============================================================
     PMD_INVENTORY_SELF_CHECKOUT_BROWSER_R16
     One visual stock language reused by add, purchase, waste, recipe,
     storage rows, count rows and shopping. No remote image service is used:
     every catalogue item gets a deterministic item/category visual instantly.
     ============================================================ */

  var mainBrowserSections = [
    {key:'Popular', label:'Popular', icon:'★'},
    {key:'All', label:'All items', icon:'▦'},
    {key:'Food', label:'Food', icon:'🥬'},
    {key:'Drinks', label:'Non-alcoholic', icon:'🧃'},
    {key:'Alcohol', label:'Alcohol', icon:'🍷'},
    {key:'Supplies', label:'Supplies', icon:'🧽'}
  ];

  var detailBrowserSections = [
    {key:'Produce', parent:'Food', label:'Vegetables', icon:'🥬'},
    {key:'Fruit', parent:'Food', label:'Fruit', icon:'🍎'},
    {key:'Herbs', parent:'Food', label:'Fresh herbs', icon:'🌿'},
    {key:'Meat', parent:'Food', label:'Meat', icon:'🥩'},
    {key:'Poultry', parent:'Food', label:'Poultry', icon:'🍗'},
    {key:'Seafood', parent:'Food', label:'Seafood', icon:'🐟'},
    {key:'Dairy', parent:'Food', label:'Dairy & eggs', icon:'🧀'},
    {key:'DryGoods', parent:'Food', label:'Grains & dry goods', icon:'🌾'},
    {key:'Spices', parent:'Food', label:'Spices', icon:'🫙'},
    {key:'Pantry', parent:'Food', label:'Pantry', icon:'🥫'},
    {key:'Condiments', parent:'Food', label:'Oils & sauces', icon:'🫒'},
    {key:'Bakery', parent:'Food', label:'Bakery', icon:'🥖'},
    {key:'Frozen', parent:'Food', label:'Frozen', icon:'❄️'},

    {key:'CoffeeTea', parent:'Drinks', label:'Coffee & tea', icon:'☕'},
    {key:'Juice', parent:'Drinks', label:'Juices', icon:'🧃'},
    {key:'WaterMixers', parent:'Drinks', label:'Water & mixers', icon:'💧'},
    {key:'SoftDrinks', parent:'Drinks', label:'Soft drinks', icon:'🥤'},

    {key:'BeerCider', parent:'Alcohol', label:'Beer & cider', icon:'🍺'},
    {key:'Wine', parent:'Alcohol', label:'Wine', icon:'🍷'},
    {key:'Spirits', parent:'Alcohol', label:'Spirits', icon:'🥃'},

    {key:'Cleaning', parent:'Supplies', label:'Cleaning', icon:'🧽'},
    {key:'PaperHygiene', parent:'Supplies', label:'Paper & hygiene', icon:'🧻'},
    {key:'Packaging', parent:'Supplies', label:'Packaging', icon:'📦'},
    {key:'KitchenUtility', parent:'Supplies', label:'Kitchen & utility', icon:'🧹'},
    {key:'HouseholdSupplies', parent:'Supplies', label:'Household', icon:'🪣'},
    {key:'PersonalCare', parent:'Supplies', label:'Personal care', icon:'🧴'}
  ];

  var popularCatalogNames = [
    'Tomato','Onion','Garlic','Potato','Lemon','Cucumber','Lettuce',
    'Banana','Apple','Chicken breast','Beef mince','Eggs','Milk','Butter',
    'Mozzarella','White rice','Wheat flour','Olive oil','Spaghetti',
    'Coffee beans','Still water','Orange juice','Cola','Lager beer',
    'Vodka','Red wine','Dish soap','Paper towels','Mop','Bin bags'
  ];

  var commonBrowserIndexCache = null;

  function commonBrowserMode(mode) {
    return mode === 'dashboard' || mode === 'catalog' || mode === 'purchase';
  }

  function mainSectionForDetail(detail) {
    for (var i = 0; i < detailBrowserSections.length; i += 1) {
      if (detailBrowserSections[i].key === detail) return detailBrowserSections[i].parent;
    }
    return 'Food';
  }

  function rowMainSection(row) {
    return mainSectionForDetail(stockSection(row && row.category, row && row.name));
  }

  function buildBrowserIndex(rows, mode) {
    var index = {
      all: rows.slice(),
      popular: [],
      byMain: {Food:[], Drinks:[], Alcohol:[], Supplies:[]},
      bySection: {},
      mainCounts: {All: rows.length, Popular: 0, Food: 0, Drinks: 0, Alcohol: 0, Supplies: 0},
      sectionCounts: {}
    };

    var popularRank = {};
    popularCatalogNames.forEach(function (name, position) {
      popularRank[normalizeCatalogText(name)] = position;
    });

    rows.forEach(function (row) {
      var detail = stockSection(row && row.category, row && row.name);
      var main = mainSectionForDetail(detail);
      if (!index.bySection[detail]) index.bySection[detail] = [];
      index.bySection[detail].push(row);
      index.sectionCounts[detail] = Number(index.sectionCounts[detail] || 0) + 1;

      if (!index.byMain[main]) index.byMain[main] = [];
      index.byMain[main].push(row);
      index.mainCounts[main] = Number(index.mainCounts[main] || 0) + 1;

      if (
        commonBrowserMode(mode)
        && Object.prototype.hasOwnProperty.call(popularRank, normalizeCatalogText(row.name))
      ) {
        index.popular.push(row);
      }
    });

    index.popular = browserSort(index.popular, 'Popular');
    index.mainCounts.Popular = index.popular.length;
    return index;
  }

  function browserIndex(rows, mode) {
    if (commonBrowserMode(mode)) {
      if (!commonBrowserIndexCache) {
        commonBrowserIndexCache = buildBrowserIndex(rows, mode);
      }
      return commonBrowserIndexCache;
    }
    return buildBrowserIndex(rows, mode);
  }

  function browserState(mode) {
    mode = String(mode || 'catalog');
    if (!state.browsers[mode]) {
      state.browsers[mode] = {query:'', main:'All', section:'All', limit:12};
    }
    return state.browsers[mode];
  }

  function stockSection(category, name) {
    category = String(category || '');
    name = normalizeCatalogText(name || '');
    var lower = category.toLowerCase();

    if (category === 'Produce') return 'Produce';
    if (category === 'Fruit') return 'Fruit';
    if (category === 'Fresh herbs') return 'Herbs';
    if (category === 'Meat') return 'Meat';
    if (category === 'Poultry') return 'Poultry';
    if (category === 'Seafood') return 'Seafood';
    if (category === 'Dairy & eggs') return 'Dairy';
    if (category === 'Dry goods') return 'DryGoods';
    if (category === 'Spices') return 'Spices';
    if (category === 'Oils & condiments') return 'Condiments';
    if (['Middle Eastern pantry','Asian pantry','Indian pantry','Mexican & Latin pantry','Nuts & seeds'].indexOf(category) !== -1) return 'Pantry';
    if (['Bakery','Bakery & dessert'].indexOf(category) !== -1) return 'Bakery';
    if (category === 'Frozen') return 'Frozen';
    if (category === 'Coffee & tea') return 'CoffeeTea';
    if (category === 'Juice') return 'Juice';
    if (category === 'Water & mixers') return 'WaterMixers';
    if (category === 'Soft drinks') {
      if (/juice|nectar/.test(name)) return 'Juice';
      if (/water|tonic|club soda|soda water/.test(name)) return 'WaterMixers';
      return 'SoftDrinks';
    }
    if (category === 'Beverages') return 'SoftDrinks';
    if (category === 'Beer & cider') return 'BeerCider';
    if (category === 'Wine') return 'Wine';
    if (category === 'Spirits') return 'Spirits';
    if (category === 'Cleaning') return 'Cleaning';
    if (category === 'Paper & hygiene') return 'PaperHygiene';
    if (category === 'Kitchen & utility') return 'KitchenUtility';
    if (category === 'Household supplies') return 'HouseholdSupplies';
    if (category === 'Personal care') return 'PersonalCare';
    if (category === 'Packaging') {
      if (/napkin|tissue|paper towel|toilet paper|foil|film|baking paper|parchment/.test(name)) return 'PaperHygiene';
      if (/mop|broom|brush|sponge|cloth|dustpan|bucket|squeegee|glove/.test(name)) return 'KitchenUtility';
      return 'Packaging';
    }

    if (/personal care/.test(lower)) return 'PersonalCare';
    if (/household/.test(lower)) return 'HouseholdSupplies';
    return 'Pantry';
  }

  function sectionSlug(value) {
    return String(value || 'pantry').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function visualEmoji(row) {
    row = row || {};
    var name = normalizeCatalogText(row.name || '');
    var category = String(row.category || '');

    var rules = [
      [/tomato/, '🍅'], [/(onion|shallot)/, '🧅'], [/garlic/, '🧄'],
      [/(potato|croquette)/, '🥔'], [/(carrot)/, '🥕'], [/(corn|maize)/, '🌽'],
      [/(cucumber|gherkin|pickle)/, '🥒'], [/(eggplant|aubergine)/, '🍆'],
      [/(chili|jalapeno|habanero|pepper)/, '🌶️'], [/(avocado)/, '🥑'],
      [/(broccoli)/, '🥦'], [/(mushroom|shiitake)/, '🍄'],
      [/(lettuce|cabbage|spinach|rocket|kale|chard|bok choy|herb|parsley|coriander|mint|basil|dill|thyme|oregano)/, '🥬'],
      [/(lemon)/, '🍋'], [/(lime)/, '🍋‍🟩'], [/(orange|mandarin)/, '🍊'],
      [/(apple)/, '🍎'], [/(pear)/, '🍐'], [/(banana)/, '🍌'],
      [/(pineapple)/, '🍍'], [/(mango)/, '🥭'], [/(watermelon)/, '🍉'],
      [/(melon)/, '🍈'], [/(strawberry)/, '🍓'], [/(blueberry|berry)/, '🫐'],
      [/(grape)/, '🍇'], [/(peach)/, '🍑'], [/(coconut)/, '🥥'], [/(kiwi)/, '🥝'],
      [/(beef|veal|steak|lamb|goat|pork|schnitzel)/, '🥩'],
      [/(bacon|ham|prosciutto|salami)/, '🥓'], [/(sausage|bratwurst|sucuk|chorizo)/, '🌭'],
      [/(chicken|turkey|duck|poultry|nugget|wing)/, '🍗'],
      [/(salmon|tuna|cod|haddock|bass|bream|trout|mackerel|sardine|anchovy|fish)/, '🐟'],
      [/(shrimp|prawn)/, '🍤'], [/(crab)/, '🦀'], [/(lobster)/, '🦞'], [/(squid)/, '🦑'],
      [/(milk|ayran|kefir)/, '🥛'], [/(cheese|mozzarella|parmesan|cheddar|gouda|feta|halloumi|ricotta|labneh)/, '🧀'],
      [/(egg)/, '🥚'], [/(butter|cream|yogurt)/, '🧈'],
      [/(rice)/, '🍚'], [/(noodle|ramen|udon|soba|spaghetti|penne|fusilli|lasagne|tagliatelle|pasta)/, '🍝'],
      [/(bread|bun|pita|baguette|loaf|pretzel)/, '🥖'], [/(flour|oat|barley|semolina)/, '🌾'],
      [/(bean|lentil|chickpea|pea)/, '🫘'], [/(almond|walnut|hazelnut|peanut|cashew|pistachio|nut)/, '🥜'],
      [/(olive oil|olive)/, '🫒'], [/(oil)/, '🧴'], [/(honey)/, '🍯'],
      [/(sauce|ketchup|mayonnaise|mustard|paste|puree|jam|tahini|hummus)/, '🥫'],
      [/(coffee)/, '☕'], [/(tea)/, '🍵'], [/(water)/, '💧'], [/(juice)/, '🧃'],
      [/(cola|soda|lemonade|tonic|energy drink)/, '🥤'], [/(beer|cider)/, '🍺'],
      [/(wine|prosecco|champagne)/, '🍷'], [/(vodka|gin|rum|whisky|whiskey|tequila|mezcal|brandy|cognac|raki|arak|ouzo|sake|soju|aperol|campari|vermouth|liqueur|amaretto)/, '🥃'],
      [/(fries|frozen|gyoza|spring roll|falafel)/, '❄️'],
      [/(box|container|cup|lid|bag|napkin|straw|cutlery|foil|film|paper)/, '📦'],
      [/(detergent|cleaner|soap|sanitizer|sanitiser|degreaser|rinse aid)/, '🧽']
    ];

    for (var i = 0; i < rules.length; i += 1) {
      if (rules[i][0].test(name)) return rules[i][1];
    }

    var section = stockSection(category, row.name);
    return {
      Produce:'🥬', Fruit:'🍎', Herbs:'🌿', Meat:'🥩', Poultry:'🍗',
      Seafood:'🐟', Dairy:'🧀', DryGoods:'🌾', Spices:'🫙', Pantry:'🥫',
      Condiments:'🫒', Bakery:'🥖', Frozen:'❄️', CoffeeTea:'☕',
      Juice:'🧃', WaterMixers:'💧', SoftDrinks:'🥤', BeerCider:'🍺',
      Wine:'🍷', Spirits:'🥃', Cleaning:'🧽', PaperHygiene:'🧻',
      Packaging:'📦', KitchenUtility:'🧹', HouseholdSupplies:'🪣',
      PersonalCare:'🧴'
    }[section] || '🍽️';
  }

  function inventoryPhotoUrl(row) {
    row = row || {};
    var direct = String(row.image_url || '').trim();
    if (direct) return direct;

    if (row.id || row.name) {
      var template = catalogTemplateForItem(row);
      var mapped = template ? String(template.image_url || '').trim() : '';
      if (mapped) return mapped;
    }

    return '';
  }

  function visualMarkup(row, size) {
    var section = stockSection(row && row.category, row && row.name);
    var photo = inventoryPhotoUrl(row);
    var visualSize = String(size || 'sm');

    // PMD_INVENTORY_IMAGE_STABILITY_R15
    // Local catalog photos are already known before markup is rendered.
    // Mark the visual as photographic immediately instead of waiting for the
    // image load event. This removes the emoji -> photo flash every time a
    // category is re-rendered. If the file is genuinely missing, the existing
    // error handler removes has-photo and reveals the deterministic fallback.
    return '<span class="pmd-inv-item-visual is-' + esc(sectionSlug(section)) +
      ' is-' + esc(visualSize) + (photo ? ' has-photo' : '') +
      '" aria-hidden="true">' +
      (photo
        ? '<img src="' + esc(photo) + '" alt="" loading="' +
          (visualSize === 'lg' ? 'eager' : 'lazy') +
          '" decoding="async" data-pmd-inv-real-image>'
        : '') +
      '<span class="pmd-inv-item-visual__emoji">' +
      esc(visualEmoji(row)) + '</span></span>';
  }

  var preloadedCatalogPhotos = {};
  var browserRenderTokens = {};

  function markCatalogPhotoLoaded(url) {
    url = String(url || '').trim();
    if (url) preloadedCatalogPhotos[url] = true;
  }

  function preloadBrowserPhotos(rows) {
    var urls = [];
    (rows || []).forEach(function (row) {
      var url = inventoryPhotoUrl(row);
      if (!url || preloadedCatalogPhotos[url] || urls.indexOf(url) !== -1) return;
      urls.push(url);
    });

    if (!urls.length) return Promise.resolve();

    var jobs = urls.map(function (url) {
      return new Promise(function (resolve) {
        var image = new Image();
        var done = function () {
          markCatalogPhotoLoaded(url);
          resolve();
        };
        image.onload = done;
        image.onerror = done;
        image.decoding = 'async';
        image.src = url;
        if (image.complete) done();
      });
    });

    // PMD_INVENTORY_ZERO_BLINK_R18
    // These are local product assets. Keep the current shelf visible until
    // every next-shelf image has either loaded or failed, then swap once.
    // No timeout means we never replace the grid with half-decoded imagery.
    return Promise.all(jobs);
  }

  function catalogTemplateForItem(item) {
    if (!item) return null;
    var exact = normalizeCatalogText(item.name);
    var rows = commonStockTemplates();
    for (var i = 0; i < rows.length; i += 1) {
      if (normalizeCatalogText(rows[i].name) === exact) return rows[i];
    }
    return bestCatalogMatch(item.name, 82);
  }

  function existingItemForTemplate(template) {
    if (!template) return null;
    var target = normalizeCatalogText(template.name);
    var aliases = Array.isArray(template.aliases)
      ? template.aliases.map(normalizeCatalogText)
      : [];

    return items().find(function (item) {
      var name = normalizeCatalogText(item.name);
      return name === target || aliases.indexOf(name) !== -1;
    }) || null;
  }

  function browserSource(mode) {
    return (mode === 'waste' || mode === 'recipe') ? items() : commonStockTemplates();
  }

  function browserMatch(row, query, mode) {
    query = String(query || '').trim();
    if (!query) return true;

    if (mode === 'catalog' || mode === 'purchase' || mode === 'dashboard') {
      return catalogScore(row, query) > 0;
    }

    var template = catalogTemplateForItem(row);
    var haystack = [
      row.name, row.category, row.supplier_name,
      template && Array.isArray(template.aliases) ? template.aliases.join(' ') : ''
    ].join(' ');
    return normalizeCatalogText(haystack).indexOf(normalizeCatalogText(query)) !== -1;
  }

  function browserSort(rows, section) {
    rows = rows.slice();

    if (section === 'Popular') {
      var rank = {};
      popularCatalogNames.forEach(function (name, index) {
        rank[normalizeCatalogText(name)] = index;
      });
      rows.sort(function (a, b) {
        var ar = Object.prototype.hasOwnProperty.call(rank, normalizeCatalogText(a.name))
          ? rank[normalizeCatalogText(a.name)]
          : 9999;
        var br = Object.prototype.hasOwnProperty.call(rank, normalizeCatalogText(b.name))
          ? rank[normalizeCatalogText(b.name)]
          : 9999;
        if (ar !== br) return ar - br;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
      return rows.filter(function (row) {
        return Object.prototype.hasOwnProperty.call(rank, normalizeCatalogText(row.name));
      });
    }

    rows.sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    return rows;
  }

  function renderVisualBrowser(mode, photosReady) {
    mode = String(mode || '');
    var grid = root.querySelector('[data-pmd-inv-browser-grid="' + mode + '"]');
    var cats = root.querySelector('[data-pmd-inv-browser-categories="' + mode + '"]');
    var more = root.querySelector('[data-pmd-inv-browser-more="' + mode + '"]');
    if (!grid || !cats) return;

    var bState = browserState(mode);
    var allRows = browserSource(mode);
    var index = browserIndex(allRows, mode);
    var query = String(bState.query || '').trim();

    if (!bState.main) bState.main = commonBrowserMode(mode) ? 'Popular' : 'All';
    if (!bState.section) bState.section = 'All';

    var filtered;
    if (query) {
      filtered = allRows.filter(function (row) {
        return browserMatch(row, query, mode);
      });
    } else if (bState.main === 'Popular') {
      filtered = index.popular.slice();
    } else if (bState.main === 'All') {
      filtered = index.all.slice();
    } else if (bState.section !== 'All') {
      filtered = (index.bySection[bState.section] || []).slice();
    } else {
      filtered = (index.byMain[bState.main] || []).slice();
    }

    if (bState.main !== 'Popular') {
      filtered = browserSort(filtered, 'All');
    }

    var mainSections = mainBrowserSections.filter(function (section) {
      if (section.key === 'Popular') {
        return commonBrowserMode(mode) && Number(index.mainCounts.Popular || 0) > 0;
      }
      if (section.key === 'All') return true;
      return Number(index.mainCounts[section.key] || 0) > 0;
    });

    var detailSections = detailBrowserSections.filter(function (section) {
      return section.parent === bState.main && Number(index.sectionCounts[section.key] || 0) > 0;
    });

    var mainHtml = '<div class="pmd-inv-pos-browser__main-row">';
    mainHtml += mainSections.map(function (section) {
      var count = section.key === 'All'
        ? allRows.length
        : Number(index.mainCounts[section.key] || 0);

      return '<button type="button" class="' +
        (section.key === bState.main ? 'is-active' : '') +
        '" data-pmd-inv-browser-main="' + esc(mode) +
        '" data-pmd-inv-browser-main-key="' + esc(section.key) + '">' +
        '<span aria-hidden="true">' + esc(section.icon) + '</span>' +
        '<b>' + esc(section.label) + '</b>' +
        '<em>' + esc(count) + '</em></button>';
    }).join('');
    mainHtml += '</div>';

    var detailHtml = '';
    if (detailSections.length) {
      var activeMainMeta = mainBrowserSections.find(function (section) {
        return section.key === bState.main;
      });
      var activeMainLabel = activeMainMeta ? activeMainMeta.label : bState.main;
      var mainCount = Number(index.mainCounts[bState.main] || 0);

      detailHtml = '<div class="pmd-inv-pos-browser__detail-row">' +
        '<button type="button" class="' + (bState.section === 'All' ? 'is-active' : '') +
        '" data-pmd-inv-browser-section="' + esc(mode) +
        '" data-pmd-inv-browser-section-key="All"><b>All ' +
        esc(activeMainLabel) +
        '</b><em>' + esc(mainCount) + '</em></button>' +
        detailSections.map(function (section) {
          return '<button type="button" class="' +
            (section.key === bState.section ? 'is-active' : '') +
            '" data-pmd-inv-browser-section="' + esc(mode) +
            '" data-pmd-inv-browser-section-key="' + esc(section.key) + '">' +
            '<span aria-hidden="true">' + esc(section.icon) + '</span>' +
            '<b>' + esc(section.label) + '</b>' +
            '<em>' + esc(Number(index.sectionCounts[section.key] || 0)) + '</em></button>';
        }).join('') +
      '</div>';
    }

    cats.innerHTML = mainHtml + detailHtml;

    var visible = filtered.slice(0, Math.max(1, Number(bState.limit || 12)));
    if (!visible.length) {
      grid.innerHTML = '<div class="pmd-inv-pos-browser__empty">No matching items.</div>';
      grid.classList.remove('is-switching');
      if (more) more.hidden = true;
      return;
    }

    if (mode === 'dashboard' && !photosReady) {
      var renderToken = Number(browserRenderTokens[mode] || 0) + 1;
      browserRenderTokens[mode] = renderToken;
      grid.classList.add('is-switching');

      preloadBrowserPhotos(visible).then(function () {
        if (browserRenderTokens[mode] !== renderToken) return;
        renderVisualBrowser(mode, true);
      });
      return;
    }

    grid.classList.remove('is-switching');
    grid.innerHTML = visible.map(function (row) {
      var sourceIndex = allRows.indexOf(row);
      var isStockMode = mode === 'waste' || mode === 'recipe';
      var existing = isStockMode ? row : existingItemForTemplate(row);
      var selected = false;
      var added = false;

      if (mode === 'waste') {
        var wasteSelect = root.querySelector('[data-pmd-waste-item]');
        selected = wasteSelect && Number(wasteSelect.value || 0) === Number(row.id || 0);
      } else if (mode === 'recipe') {
        added = Array.prototype.some.call(
          root.querySelectorAll('[data-pmd-recipe-item]'),
          function (select) { return Number(select.value || 0) === Number(row.id || 0); }
        );
      } else if (mode === 'catalog' || mode === 'dashboard') {
        added = Boolean(existing);
      }

      var meta = isStockMode
        ? ownerQuantityLabel(row, row.estimated_on_hand, 2) + ' on hand'
        : ((row.category || 'Stock item') + ' · buy ' + (row.purchase_unit || row.unit || 'piece'));

      return '<button type="button" class="pmd-inv-pos-card' +
        (selected ? ' is-selected' : '') +
        (added ? ' is-added' : '') +
        '" data-pmd-inv-browser-card="' + esc(mode) + '"' +
        (isStockMode
          ? ' data-pmd-inv-browser-item-id="' + esc(row.id) + '"'
          : ' data-pmd-inv-browser-common-index="' + esc(sourceIndex) + '"') +
        '>' +
          visualMarkup(row, 'lg') +
          '<span class="pmd-inv-pos-card__copy"><strong>' + esc(row.name || '') + '</strong>' +
          '<small>' + esc(meta) + '</small></span>' +
          (added ? '<span class="pmd-inv-pos-card__badge">' + (mode === 'recipe' ? 'Added' : 'In stock') + '</span>' : '') +
          (selected ? '<span class="pmd-inv-pos-card__badge">Selected</span>' : '') +
        '</button>';
    }).join('');

    grid.removeAttribute('data-pmd-inv-server-rendered');

    if (more) {
      more.hidden = filtered.length <= visible.length;
      more.textContent = filtered.length > visible.length
        ? ('Show ' + String(Math.min(24, filtered.length - visible.length)) + ' more')
        : 'Show more';
    }
  }

  function renderOpenVisualBrowsers(renderDashboard) {
    if (renderDashboard) renderVisualBrowser('dashboard');

    root.querySelectorAll('.pmd-inv-modal:not([hidden]) [data-pmd-inv-visual-browser]').forEach(function (browser) {
      var mode = String(browser.getAttribute('data-pmd-inv-visual-browser') || '');
      if (mode) renderVisualBrowser(mode);
    });
  }

  function selectBrowserCard(button) {
    if (!button) return;
    var mode = String(button.getAttribute('data-pmd-inv-browser-card') || '');
    var commonIndex = button.getAttribute('data-pmd-inv-browser-common-index');
    var itemId = Number(button.getAttribute('data-pmd-inv-browser-item-id') || 0);

    if (mode === 'dashboard') {
      var dashboardTemplate = commonStockTemplates()[Number(commonIndex)];
      if (!dashboardTemplate) return;

      var dashboardStockItem = existingItemForTemplate(dashboardTemplate);
      openModal('purchase');

      var purchaseHost = root.querySelector('[data-pmd-inv-purchase-lines]');
      if (purchaseHost) purchaseHost.innerHTML = '';

      addPurchaseLine({
        item_name: dashboardStockItem ? dashboardStockItem.name : dashboardTemplate.name,
        quantity: 1,
        unit: dashboardStockItem
          ? (dashboardStockItem.purchase_unit || dashboardStockItem.unit || 'piece')
          : (dashboardTemplate.purchase_unit || dashboardTemplate.unit || 'piece'),
        unit_cost: dashboardStockItem ? Number(dashboardStockItem.purchase_unit_cost || 0) : ''
      });

      var quickRows = root.querySelectorAll('[data-pmd-inv-purchase-lines] .pmd-inv-line');
      var quickLast = quickRows.length ? quickRows[quickRows.length - 1] : null;
      var quickQty = quickLast && quickLast.querySelector('[data-pmd-purchase-qty]');
      if (quickQty) {
        quickQty.focus();
        try { quickQty.select(); } catch (ignore) {}
      }
      return;
    }

    if (mode === 'catalog') {
      var template = commonStockTemplates()[Number(commonIndex)];
      var existing = existingItemForTemplate(template);
      if (existing) {
        prepareItemEditor(Number(existing.id || 0));
        toast('Already in stock — opened it for editing.');
      } else {
        applyCommonStock(Number(commonIndex));
      }
      renderVisualBrowser('catalog');
      return;
    }

    if (mode === 'purchase') {
      var purchaseTemplate = commonStockTemplates()[Number(commonIndex)];
      if (!purchaseTemplate) return;
      var stockItem = existingItemForTemplate(purchaseTemplate);
      addPurchaseLine({
        item_name: stockItem ? stockItem.name : purchaseTemplate.name,
        quantity: '',
        unit: stockItem
          ? (stockItem.purchase_unit || stockItem.unit || 'piece')
          : (purchaseTemplate.purchase_unit || purchaseTemplate.unit || 'piece'),
        unit_cost: stockItem ? Number(stockItem.purchase_unit_cost || 0) : ''
      });
      var purchaseRows = root.querySelectorAll('[data-pmd-inv-purchase-lines] .pmd-inv-line');
      var lastPurchase = purchaseRows.length ? purchaseRows[purchaseRows.length - 1] : null;
      var qtyInput = lastPurchase && lastPurchase.querySelector('[data-pmd-purchase-qty]');
      if (qtyInput) qtyInput.focus();
      return;
    }

    if (mode === 'waste') {
      var waste = root.querySelector('[data-pmd-waste-item]');
      if (!waste || !itemId) return;
      waste.value = String(itemId);
      updateWasteUnitOptions();
      renderVisualBrowser('waste');
      var wasteQty = root.querySelector('[data-pmd-inv-form="waste"] [name="quantity"]');
      if (wasteQty) wasteQty.focus();
      return;
    }

    if (mode === 'recipe') {
      if (!itemId) return;
      var recipeRows = Array.prototype.slice.call(
        root.querySelectorAll('[data-pmd-inv-recipe-lines] .pmd-inv-line')
      );
      var targetRow = recipeRows.find(function (row) {
        var select = row.querySelector('[data-pmd-recipe-item]');
        return select && Number(select.value || 0) === itemId;
      });

      if (!targetRow) {
        targetRow = recipeRows.find(function (row) {
          var select = row.querySelector('[data-pmd-recipe-item]');
          return select && !Number(select.value || 0);
        });
      }

      if (!targetRow) {
        addRecipeLine({item_id:itemId});
        recipeRows = Array.prototype.slice.call(
          root.querySelectorAll('[data-pmd-inv-recipe-lines] .pmd-inv-line')
        );
        targetRow = recipeRows[recipeRows.length - 1] || null;
      } else {
        var targetSelect = targetRow.querySelector('[data-pmd-recipe-item]');
        if (targetSelect) {
          targetSelect.value = String(itemId);
          updateRecipeLineUnit(targetRow);
        }
      }

      renderVisualBrowser('recipe');
      var recipeQty = targetRow && targetRow.querySelector('[data-pmd-recipe-qty]');
      if (recipeQty) recipeQty.focus();
    }
  }

  function csrf() {
    var node = document.querySelector('meta[name="csrf-token"]');
    return node && node.content ? node.content : '';
  }

  function num(value, digits) {
    value = Number(value || 0);
    if (!Number.isFinite(value)) value = 0;
    var max = typeof digits === 'number' ? digits : 2;
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: max,
      minimumFractionDigits: 0
    }).format(value);
  }

  /* PMD_INVENTORY_CARD_GEOMETRY_R9
   * Inventory lives inside the owner shell, whose transformed content area can
   * become the containing block for position:fixed. Correct that offset before
   * paint so every card is centered on the real browser viewport, exactly like
   * the Owner Dashboard table manager.
   */
  function alignModalToViewport(modal) {
    if (!modal) return;

    modal.style.setProperty('--pmd-inv-modal-shift-x', '0px');
    modal.style.setProperty('--pmd-inv-modal-shift-y', '0px');

    var rect = modal.getBoundingClientRect();
    var shiftX = Math.abs(rect.left) > 0.5 ? -rect.left : 0;
    var shiftY = Math.abs(rect.top) > 0.5 ? -rect.top : 0;

    modal.style.setProperty('--pmd-inv-modal-shift-x', shiftX + 'px');
    modal.style.setProperty('--pmd-inv-modal-shift-y', shiftY + 'px');
  }

  function stepperNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number(fallback || 0);
  }

  function stepperPrecision(value) {
    value = String(value == null ? '' : value);
    var dot = value.indexOf('.');
    return dot === -1 ? 0 : Math.min(4, value.length - dot - 1);
  }

  function syncNumericStepper(input) {
    if (!input) return;
    var wrap = input.closest('.pmd-inv-stepper-r9');
    if (!wrap) return;

    var minus = wrap.querySelector('[data-pmd-inv-stepper-dir="-1"]');
    var plus = wrap.querySelector('[data-pmd-inv-stepper-dir="1"]');
    var value = input.value === '' ? null : Number(input.value);
    var min = input.hasAttribute('min') ? Number(input.getAttribute('min')) : null;
    var max = input.hasAttribute('max') ? Number(input.getAttribute('max')) : null;
    var blocked = Boolean(input.disabled || input.readOnly || state.busy);

    if (minus) {
      minus.disabled = blocked || (
        value !== null && Number.isFinite(min) && value <= min
      );
    }
    if (plus) {
      plus.disabled = blocked || (
        value !== null && Number.isFinite(max) && value >= max
      );
    }
  }

  function enhanceNumericSteppers(scope) {
    scope = scope || root;
    scope.querySelectorAll('input[data-pmd-inv-stepper]').forEach(function (input) {
      if (input.closest('.pmd-inv-stepper-r9')) {
        syncNumericStepper(input);
        return;
      }

      var wrap = document.createElement('div');
      wrap.className = 'pmd-inv-stepper-r9';

      var minus = document.createElement('button');
      minus.type = 'button';
      minus.setAttribute('data-pmd-inv-stepper-dir', '-1');
      minus.setAttribute('aria-label', 'Decrease');
      minus.innerHTML = '<span aria-hidden="true">−</span>';

      var plus = document.createElement('button');
      plus.type = 'button';
      plus.setAttribute('data-pmd-inv-stepper-dir', '1');
      plus.setAttribute('aria-label', 'Increase');
      plus.innerHTML = '<span aria-hidden="true">+</span>';

      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(minus);
      wrap.appendChild(input);
      wrap.appendChild(plus);
      syncNumericStepper(input);
    });
  }

  function stepNumericInput(button) {
    var wrap = button && button.closest('.pmd-inv-stepper-r9');
    var input = wrap && wrap.querySelector('input[type="number"]');
    if (!input || input.disabled || input.readOnly || state.busy) return;

    var direction = Number(button.getAttribute('data-pmd-inv-stepper-dir') || 0);
    if (!direction) return;

    var configuredStep = stepperNumber(
      input.getAttribute('data-pmd-inv-stepper-step'),
      1
    );
    var step = configuredStep > 0 ? configuredStep : 1;
    var min = input.hasAttribute('min') ? Number(input.getAttribute('min')) : null;
    var max = input.hasAttribute('max') ? Number(input.getAttribute('max')) : null;
    var current = input.value === ''
      ? (Number.isFinite(min) ? min : 0)
      : stepperNumber(input.value, 0);
    var next = current + (direction * step);

    if (Number.isFinite(min)) next = Math.max(min, next);
    if (Number.isFinite(max)) next = Math.min(max, next);

    var precision = Math.max(
      stepperPrecision(step),
      stepperPrecision(input.getAttribute('step'))
    );
    input.value = String(Number(next.toFixed(Math.min(4, precision))));
    input.dispatchEvent(new Event('input', {bubbles:true}));
    input.dispatchEvent(new Event('change', {bubbles:true}));
    syncNumericStepper(input);
  }

  function money(value) {
    value = Number(value || 0);
    if (!Number.isFinite(value)) value = 0;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: state.currency,
        maximumFractionDigits: 2
      }).format(value);
    } catch (ignore) {
      return num(value, 2) + ' ' + state.currency;
    }
  }

  function dateLabel(value) {
    value = String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—';
    try {
      return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(new Date(value + 'T12:00:00'));
    } catch (ignore) {
      return value;
    }
  }

  function dateTimeLabel(value) {
    value = String(value || '');
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value.replace(' ', 'T')));
    } catch (ignore) {
      return value.slice(0, 16);
    }
  }

  function toast(message, error) {
    var node = root.querySelector('[data-pmd-inv-toast]');
    if (!node) return;
    node.textContent = String(message || '');
    node.classList.toggle('is-error', Boolean(error));
    node.classList.add('is-show');
    window.clearTimeout(node._pmdTimer);
    node._pmdTimer = window.setTimeout(function () {
      node.classList.remove('is-show');
    }, 2600);
  }

  function setBusy(next) {
    state.busy = Boolean(next);
    root.querySelectorAll('form button[type="submit"]').forEach(function (button) {
      button.disabled = state.busy;
    });
  }

  function mountHeaderNotification() {
    var header = root.querySelector('#pmd-inv-clean-header');
    var slot = header && header.querySelector('[data-pmd-inv-notif-slot]');
    var notificationRoot = document.getElementById('notif-root');

    if (!header || !slot || !notificationRoot) return false;
    if (!header.contains(notificationRoot)) {
      slot.replaceWith(notificationRoot);
    }

    notificationRoot.classList.add('pmd-inv__notif-mounted');
    var trigger = notificationRoot.querySelector('#notifDropdown');
    if (trigger) {
      trigger.setAttribute('aria-label', 'Notifications');
      trigger.setAttribute('title', 'Notifications');
    }
    return true;
  }

  function bootHeaderNotification() {
    if (mountHeaderNotification()) return;

    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      if (mountHeaderNotification() || attempts >= 40) {
        window.clearInterval(timer);
      }
    }, 100);
  }

  function request(handler, data, formData) {
    var headers = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-IGNITER-REQUEST-HANDLER': handler
    };
    var token = csrf();
    if (token) headers['X-CSRF-TOKEN'] = token;

    var options = {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: headers
    };

    if (formData) {
      options.body = formData;
    } else {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data || {});
    }

    var endpoint = String(bootstrap.endpoint || window.location.href || '');
    return fetch(endpoint, options).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (json) {
        if (!response.ok || !json || json.ok === false) {
          throw new Error(
            json && json.error
              ? String(json.error)
              : 'Inventory action could not be completed.'
          );
        }
        return json;
      });
    });
  }

  function items() {
    return Array.isArray(state.snapshot.items) ? state.snapshot.items : [];
  }

  function menus() {
    return Array.isArray(state.snapshot.menus) ? state.snapshot.menus : [];
  }

  function recipes() {
    return Array.isArray(state.snapshot.recipes) ? state.snapshot.recipes : [];
  }

  function itemById(id) {
    id = Number(id || 0);
    return items().find(function (item) {
      return Number(item.id || 0) === id;
    }) || null;
  }

  function purchaseFactor(item) {
    return Math.max(0.0001, Number(item && item.purchase_to_base || 1));
  }

  function ownerQuantity(item, baseQty) {
    item = item || {};
    var factor = purchaseFactor(item);
    var baseUnit = String(item.unit || 'piece');
    var purchaseUnit = String(item.purchase_unit || baseUnit);
    var usePurchase = purchaseUnit && purchaseUnit !== baseUnit;

    return {
      qty: Number(baseQty || 0) / (usePurchase ? factor : 1),
      unit: usePurchase ? purchaseUnit : baseUnit,
      base_qty: Number(baseQty || 0),
      base_unit: baseUnit,
      converted: usePurchase
    };
  }

  function ownerQuantityLabel(item, baseQty, digits) {
    var value = ownerQuantity(item, baseQty);
    return num(value.qty, typeof digits === 'number' ? digits : 2) + ' ' + value.unit;
  }

  function updateWasteUnitOptions() {
    var form = root.querySelector('[data-pmd-inv-form="waste"]');
    if (!form) return;

    var itemId = Number((form.querySelector('[data-pmd-waste-item]') || {}).value || 0);
    var select = form.querySelector('[data-pmd-waste-unit]');
    var item = itemById(itemId);
    if (!select) return;

    if (!item) {
      select.innerHTML = '<option value="">Choose item first</option>';
      return;
    }

    var base = String(item.unit || 'piece');
    var purchase = String(item.purchase_unit || base);
    var html = '<option value="' + esc(base) + '">' + esc(base) + '</option>';

    if (purchase !== base) {
      html = '<option value="' + esc(purchase) + '">' + esc(purchase) + '</option>' + html;
    }

    select.innerHTML = html;
    select.value = purchase !== base ? purchase : base;
  }

  function itemOptions(emptyLabel) {
    var html = '<option value="">' + esc(emptyLabel || 'Choose item') + '</option>';
    items().forEach(function (item) {
      html += '<option value="' + esc(item.id) + '">' +
        esc(item.name) + ' · ' + esc(item.unit || '') +
      '</option>';
    });
    return html;
  }

  function unitOptions(selected) {
    var units = bootstrap.units && typeof bootstrap.units === 'object'
      ? bootstrap.units
      : {piece:'piece',bottle:'bottle',can:'can',pack:'pack',case:'case',box:'box',tray:'tray',bag:'bag',bunch:'bunch',jar:'jar',tub:'tub',bucket:'bucket',crate:'crate',carton:'carton',keg:'keg',sack:'sack',roll:'roll',loaf:'loaf',dozen:'dozen',kg:'kg',g:'g',l:'l',ml:'ml'};
    return Object.keys(units).map(function (value) {
      return '<option value="' + esc(value) + '"' +
        (String(selected || '') === String(value) ? ' selected' : '') +
        '>' + esc(units[value]) + '</option>';
    }).join('');
  }

  function syncSelects() {
    root.querySelectorAll('[data-pmd-inv-item-select]').forEach(function (select) {
      var current = String(select.value || '');
      select.innerHTML = itemOptions('Choose item');
      if (current) select.value = current;
    });

    root.querySelectorAll('[data-pmd-inv-menu-select]').forEach(function (select) {
      var current = String(select.value || '');
      select.innerHTML = '<option value="">Choose menu item</option>' +
        menus().map(function (menu) {
          return '<option value="' + esc(menu.id) + '">' + esc(menu.name) + '</option>';
        }).join('');
      if (current) select.value = current;
    });
  }

  function syncPurchaseDatalist() {
    var list = document.getElementById('pmd-inv-purchase-items-r1');
    if (!list) {
      list = document.createElement('datalist');
      list.id = 'pmd-inv-purchase-items-r1';
      root.appendChild(list);
    }

    var known = {};
    var html = [];

    items().forEach(function (item) {
      var key = normalizeCatalogText(item.name);
      if (key) known[key] = true;
      html.push(
        '<option value="' + esc(item.name) + '">' +
          esc((item.purchase_unit || item.unit || '') + (item.supplier_name ? ' · ' + item.supplier_name : '')) +
        '</option>'
      );
    });

    commonStockTemplates().forEach(function (item) {
      var key = normalizeCatalogText(item.name);
      if (!key || known[key]) return;
      html.push(
        '<option value="' + esc(item.name) + '">' +
          esc((item.category || 'Stock item') + ' · ' + (item.purchase_unit || item.unit || 'piece')) +
        '</option>'
      );
    });

    list.innerHTML = html.join('');
  }

  function bestCatalogMatch(value, minimumScore) {
    var best = null;
    var bestScore = Number(minimumScore || 1) - 1;

    commonStockTemplates().forEach(function (row) {
      var score = catalogScore(row, value);
      if (score > bestScore) {
        best = row;
        bestScore = score;
      }
    });

    return best;
  }

  function syncPurchaseLineToKnownItem(input) {
    var rawName = String(input && input.value || '').trim();
    var name = normalizeCatalogText(rawName);
    var line = input && input.closest ? input.closest('.pmd-inv-line') : null;
    if (!line) return;

    var item = items().find(function (row) {
      return normalizeCatalogText(row.name) === name;
    });

    var unit = line.querySelector('[data-pmd-purchase-unit]');
    var cost = line.querySelector('[data-pmd-purchase-cost]');

    if (item) {
      line.setAttribute('data-pmd-purchase-item-id', String(item.id || ''));
      if (unit) unit.value = String(item.purchase_unit || item.unit || 'piece');
      if (cost && (!cost.value || Number(cost.value) === 0)) {
        cost.value = String(item.purchase_unit_cost || item.unit_cost || 0);
      }
      return;
    }

    line.removeAttribute('data-pmd-purchase-item-id');

    var template = bestCatalogMatch(rawName, 108);
    if (!template) return;

    if (normalizeCatalogText(template.name) !== name) {
      var aliases = Array.isArray(template.aliases) ? template.aliases.map(normalizeCatalogText) : [];
      if (aliases.indexOf(name) === -1) return;
      if (input) input.value = String(template.name || rawName);
    }

    if (unit) {
      unit.value = String(template.purchase_unit || template.unit || 'piece');
    }
  }

  function commonStockTemplates() {
    return Array.isArray(bootstrap.common_stock) ? bootstrap.common_stock : [];
  }

  function normalizeCatalogText(value) {
    value = String(value == null ? '' : value).trim().toLowerCase();
    try {
      value = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (ignore) {}
    return value.replace(/[^a-z0-9\u0600-\u06ff]+/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  function catalogDistance(a, b) {
    a = String(a || '');
    b = String(b || '');
    if (!a || !b) return 99;
    if (Math.abs(a.length - b.length) > 3) return 99;

    var previous = [];
    var current = [];
    for (var j = 0; j <= b.length; j += 1) previous[j] = j;

    for (var i = 1; i <= a.length; i += 1) {
      current[0] = i;
      for (var k = 1; k <= b.length; k += 1) {
        current[k] = Math.min(
          current[k - 1] + 1,
          previous[k] + 1,
          previous[k - 1] + (a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1)
        );
      }
      previous = current.slice();
    }
    return previous[b.length];
  }

  function catalogScore(row, rawQuery) {
    var query = normalizeCatalogText(rawQuery);
    if (!query) return 0;

    var name = normalizeCatalogText(row.name);
    var category = normalizeCatalogText(row.category);
    var aliases = Array.isArray(row.aliases) ? row.aliases.map(normalizeCatalogText) : [];
    var cuisines = Array.isArray(row.cuisines) ? row.cuisines.map(normalizeCatalogText) : [];
    var searchable = [name, category]
      .concat(aliases)
      .concat(cuisines)
      .concat([normalizeCatalogText(row.unit), normalizeCatalogText(row.purchase_unit)])
      .filter(Boolean);

    if (name === query) return 130;
    if (name.indexOf(query) === 0) return 122;

    for (var i = 0; i < aliases.length; i += 1) {
      if (aliases[i] === query) return 126;
      if (aliases[i].indexOf(query) === 0) return 119;
    }

    if (name.indexOf(query) !== -1) return 112;
    for (var a = 0; a < aliases.length; a += 1) {
      if (aliases[a].indexOf(query) !== -1) return 109;
    }

    var queryParts = query.split(' ').filter(Boolean);
    if (queryParts.length > 1) {
      var joined = searchable.join(' ');
      var allParts = queryParts.every(function (part) {
        return joined.indexOf(part) !== -1;
      });
      if (allParts) return 104;
    }

    var words = searchable.join(' ').split(' ').filter(Boolean);
    for (var w = 0; w < words.length; w += 1) {
      if (words[w].indexOf(query) === 0) return 101;
    }

    if (category.indexOf(query) !== -1) return 92;
    for (var ci = 0; ci < cuisines.length; ci += 1) {
      if (cuisines[ci].indexOf(query) !== -1) return 88;
    }

    if (/^[a-z0-9 ]+$/.test(query) && query.length >= 4) {
      var distance = catalogDistance(query, name);
      if (distance === 1) return 97;
      if (distance === 2) return 86;

      for (var al = 0; al < aliases.length; al += 1) {
        var aliasDistance = catalogDistance(query, aliases[al]);
        if (aliasDistance === 1) return 95;
        if (aliasDistance === 2) return 84;
      }
    }

    return 0;
  }

  function renderCommonStock() {
    var host = root.querySelector('[data-pmd-inv-common-results]');
    if (!host) return;

    var query = String(state.commonSearch || '').trim();
    if (!query) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }

    var rows = commonStockTemplates()
      .map(function (row, index) {
        return {row: row, index: index, score: catalogScore(row, query)};
      })
      .filter(function (match) { return match.score > 0; })
      .sort(function (a, b) {
        if (a.score !== b.score) return b.score - a.score;
        return String(a.row.name || '').localeCompare(String(b.row.name || ''));
      })
      .slice(0, 8);

    if (!rows.length) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }

    host.hidden = false;
    host.innerHTML = rows.map(function (match) {
      var row = match.row;
      var packageLabel = row.purchase_unit && row.purchase_unit !== row.unit
        ? (' · buy ' + row.purchase_unit)
        : '';
      return '<button type="button" data-pmd-inv-common-index="' +
        esc(match.index) + '">' +
        '<strong>' + esc(row.name || '') + '</strong>' +
        '<small>' + esc((row.category || 'Stock item') + packageLabel) + '</small>' +
      '</button>';
    }).join('');
  }

  function applyCommonStock(index) {
    var template = commonStockTemplates()[Number(index)];
    var form = root.querySelector('[data-pmd-inv-form="item"]');
    if (!template || !form) return;

    form.querySelector('[name="name"]').value = String(template.name || '');
    form.querySelector('[name="category"]').value = String(template.category || '');
    form.querySelector('[name="unit"]').value = String(template.unit || 'piece');
    form.querySelector('[name="purchase_unit"]').value = String(template.purchase_unit || template.unit || 'piece');
    form.querySelector('[name="purchase_to_base"]').value =
      template.purchase_to_base == null ? '' : String(template.purchase_to_base);

    updatePackageHelp(form);
    state.commonSearch = '';
    var host = root.querySelector('[data-pmd-inv-common-results]');
    if (host) {
      host.hidden = true;
      host.innerHTML = '';
    }
    renderVisualBrowser('catalog');
    var name = form.querySelector('[name="name"]');
    if (name) name.focus();
  }

  function updatePackageHelp(form) {
    form = form || root.querySelector('[data-pmd-inv-form="item"]');
    if (!form) return;

    var base = String((form.querySelector('[name="unit"]') || {}).value || 'piece');
    var purchase = String((form.querySelector('[name="purchase_unit"]') || {}).value || base);
    var factor = String((form.querySelector('[name="purchase_to_base"]') || {}).value || '');
    var help = form.querySelector('[data-pmd-inv-package-help]');
    if (!help) return;

    if (purchase === base) {
      help.textContent = 'Same unit: keep this at 1.';
    } else if (factor) {
      help.textContent = '1 ' + purchase + ' = ' + factor + ' ' + base + '.';
    } else {
      help.textContent = 'Enter how many ' + base + ' are inside one ' + purchase + '.';
    }
  }

  function renderSummary() {
    var summary = state.snapshot.summary || {};

    var attention = Number(summary.critical_items || 0) + Number(summary.low_items || 0);
    var attentionNode = root.querySelector('[data-pmd-inv-stat="attention"]');
    var criticalNode = root.querySelector('[data-pmd-inv-stat="critical"]');
    var lowNode = root.querySelector('[data-pmd-inv-stat="low"]');
    if (attentionNode) attentionNode.textContent = String(attention);
    if (criticalNode) criticalNode.textContent = String(Number(summary.critical_items || 0));
    if (lowNode) lowNode.textContent = String(Number(summary.low_items || 0));

    [
      ['stock', summary.estimated_stock_value],
      ['purchases', summary.purchases_cost_30d],
      ['waste', summary.waste_cost_30d],
      ['variance', summary.unexplained_loss_value]
    ].forEach(function (pair) {
      var node = root.querySelector('[data-pmd-inv-money="' + pair[0] + '"]');
      if (node) node.textContent = money(pair[1]);
    });

    var coverage = root.querySelector('[data-pmd-inv-recipe-coverage]');
    if (coverage) coverage.textContent = String(Number(summary.recipe_coverage_pct || 0)) + '%';

    var last = root.querySelector('[data-pmd-inv-last-count]');
    if (last) {
      last.textContent = state.snapshot.last_count && state.snapshot.last_count.counted_at
        ? 'Last count ' + dateTimeLabel(state.snapshot.last_count.counted_at)
        : 'No physical count yet';
    }
  }

  function rowMatchesSearch(item) {
    if (!state.search) return true;
    var haystack = [
      item.name,
      item.sku,
      item.category,
      item.supplier_name,
      item.status
    ].join(' ').toLowerCase();
    return haystack.indexOf(state.search.toLowerCase()) !== -1;
  }

  function renderStock() {
    var body = root.querySelector('[data-pmd-inv-stock-body]');
    if (!body) return;

    var rows = items().filter(rowMatchesSearch);
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5" class="pmd-inv__empty-row">' +
        (items().length ? 'No stock items match this search.' : 'No stock items yet.') +
      '</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (item) {
      var status = String(item.status || 'healthy');
      var statusLabel = status === 'critical'
        ? 'Reorder'
        : (status === 'low' ? 'Low' : (status === 'setup' ? 'Setup' : 'Good'));
      var days = item.days_left === null || typeof item.days_left === 'undefined'
        ? '—'
        : num(item.days_left, 1);
      var variance = Number(item.last_variance_qty || 0);
      var varianceOwner = ownerQuantity(item, variance);
      var varianceClass = variance < 0 ? ' is-negative' : (variance > 0 ? ' is-positive' : '');
      var packageMeta = item.purchase_unit && item.purchase_unit !== item.unit
        ? ('1 ' + item.purchase_unit + ' = ' + num(item.purchase_to_base, 2) + ' ' + item.unit)
        : '';
      var meta = [item.category, packageMeta].filter(Boolean).join(' · ');
      var onHand = ownerQuantity(item, item.estimated_on_hand);

      return '<tr class="is-' + esc(status) + '">' +
        '<td class="pmd-inv__item-name">' +
          '<div class="pmd-inv-stock-item-cell">' +
            visualMarkup(item, 'sm') +
            '<div><button type="button" class="pmd-inv__item-edit" data-pmd-inv-edit-item="' + esc(item.id) + '">' + esc(item.name) + '</button>' +
            '<small>' + esc(meta || 'Stock item') + '</small></div>' +
          '</div>' +
        '</td>' +
        '<td><span class="pmd-inv__qty">' + esc(num(onHand.qty, 2)) + ' <small>' + esc(onHand.unit) + '</small></span></td>' +
        '<td><span class="pmd-inv__days">' + esc(days) + '</span></td>' +
        '<td><span class="pmd-inv__variance' + varianceClass + '">' +
          (varianceOwner.qty > 0 ? '+' : '') + esc(num(varianceOwner.qty, 2)) + ' ' + esc(varianceOwner.unit) +
        '</span></td>' +
        '<td><span class="pmd-inv-status is-' + esc(status) + '">' + esc(statusLabel) + '</span></td>' +
      '</tr>';
    }).join('');
  }

  function renderAttention() {
    var host = root.querySelector('[data-pmd-inv-attention]');
    if (!host) return;

    var rows = items().filter(function (item) {
      var status = String(item.status || 'healthy');
      return status === 'critical' || status === 'low';
    }).sort(function (a, b) {
      var pa = String(a.status || '') === 'critical' ? 0 : 1;
      var pb = String(b.status || '') === 'critical' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return String(a.name || '').localeCompare(String(b.name || ''));
    }).slice(0, 5);

    if (!rows.length) {
      host.innerHTML = '<div class="pmd-inv-r6-order-empty">Nothing needs buying right now.</div>';
      return;
    }

    host.innerHTML = rows.map(function (item) {
      var buy = ownerQuantity(item, Number(item.suggested_order_qty || 0));
      var detail = item.days_left === null || typeof item.days_left === 'undefined'
        ? ownerQuantityLabel(item, item.estimated_on_hand, 2) + ' on hand'
        : num(item.days_left, 1) + ' days left';

      return '<div class="pmd-inv-r6-order-row">' +
        visualMarkup(item, 'xs') +
        '<div><strong>' + esc(item.name) + '</strong><small>' + esc(detail) + '</small></div>' +
        '<b>' + esc(buy.qty > 0 ? (num(buy.qty, 2) + ' ' + buy.unit) : 'Review') + '</b>' +
      '</div>';
    }).join('');
  }

  function shoppingHorizonDays() {
    return Math.max(1, Number(state.shoppingDays || 1));
  }

  function shoppingNeedBase(item) {
    var horizon = shoppingHorizonDays();
    var onHand = Math.max(0, Number(item.estimated_on_hand || 0));
    var daily = Math.max(0, Number(item.avg_daily_usage || 0));
    var safety = Math.max(0, Number(item.reorder_point || 0));
    var neededThroughDate = (daily * horizon) + safety;
    return Math.max(0, neededThroughDate - onHand);
  }

  function shoppingSuggestion(item) {
    var baseQty = shoppingNeedBase(item);
    var factor = Math.max(0.0001, Number(item.purchase_to_base || 1));
    var purchaseUnit = String(item.purchase_unit || item.unit || 'piece');
    var baseUnit = String(item.unit || 'piece');
    var purchaseQty = baseQty / factor;
    var discrete = ['piece','bottle','can','pack','case','box','tray','bag'].indexOf(purchaseUnit) !== -1;
    if (discrete && purchaseQty > 0) purchaseQty = Math.ceil(purchaseQty);

    return {
      base_qty: baseQty,
      purchase_qty: purchaseQty,
      purchase_unit: purchaseUnit,
      base_unit: baseUnit,
      label: baseQty > 0
        ? (num(purchaseQty, discrete ? 0 : 2) + ' ' + purchaseUnit)
        : 'No buy needed'
    };
  }

  function shoppingItems() {
    return items()
      .filter(function (item) {
        return shoppingNeedBase(item) > 0;
      })
      .sort(function (a, b) {
        var needA = shoppingNeedBase(a);
        var needB = shoppingNeedBase(b);
        if (needA !== needB) return needB - needA;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  }

  function shoppingDateLabel() {
    var date = new Date(String(state.today || '') + 'T12:00:00');
    if (Number.isNaN(date.getTime())) date = new Date();
    date.setDate(date.getDate() + Math.max(0, shoppingHorizonDays() - 1));
    try {
      return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch (ignore) {
      return date.toISOString().slice(0, 10);
    }
  }

  function renderShoppingList() {
    var host = root.querySelector('[data-pmd-inv-shopping-list]');
    var summary = root.querySelector('[data-pmd-inv-shopping-summary]');
    if (!host) return;

    var rows = shoppingItems();
    if (summary) {
      summary.innerHTML =
        '<strong>Cover through ' + esc(shoppingDateLabel()) + '</strong>' +
        '<span>' + esc(String(rows.length)) + ' item' + (rows.length === 1 ? '' : 's') + ' need purchasing based on recent sales usage.</span>';
    }

    root.querySelectorAll('[data-pmd-shopping-days]').forEach(function (button) {
      button.classList.toggle(
        'is-active',
        Number(button.getAttribute('data-pmd-shopping-days') || 0) === shoppingHorizonDays()
      );
    });

    if (!rows.length) {
      host.innerHTML = '<div class="pmd-inv-activity-empty">Current stock should cover this period at recent sales usage.</div>';
      return;
    }

    host.innerHTML = rows.map(function (item) {
      var suggestion = shoppingSuggestion(item);
      var supplier = item.supplier_name || 'Supplier not set';
      var projectedUse = Number(item.avg_daily_usage || 0) * shoppingHorizonDays();

      return '<div class="pmd-inv-shopping-row pmd-inv-shopping-row--visual">' +
        visualMarkup(item, 'sm') +
        '<div><strong>' + esc(item.name) + '</strong><small>' +
          esc(supplier + ' · projected use ' + num(projectedUse, 2) + ' ' + item.unit) +
        '</small></div>' +
        '<span>' + esc(num(item.estimated_on_hand, 3) + ' ' + item.unit + ' on hand') + '</span>' +
        '<b>' + esc(suggestion.label) + '</b>' +
      '</div>';
    }).join('');
  }

  function shoppingText() {
    var rows = shoppingItems();
    if (!rows.length) {
      return 'PayMyDine shopping list · through ' + shoppingDateLabel() + '\nNo items need purchasing.';
    }

    var lines = ['PayMyDine shopping list · through ' + shoppingDateLabel(), ''];
    rows.forEach(function (item) {
      var suggestion = shoppingSuggestion(item);
      lines.push(
        '- ' + item.name + ': ' + suggestion.label +
        (item.supplier_name ? ' · ' + item.supplier_name : '')
      );
    });
    return lines.join('\n');
  }

  function copyShoppingList() {
    var value = shoppingText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value)
        .then(function () { toast('Shopping list copied.'); })
        .catch(function () { fallbackCopy(value); });
      return;
    }
    fallbackCopy(value);
  }

  function fallbackCopy(value) {
    var area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', 'readonly');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      toast('Shopping list copied.');
    } catch (ignore) {
      toast('Could not copy the shopping list.', true);
    }
    area.remove();
  }

  function printShoppingList() {
    var rows = shoppingItems();
    var body = rows.length
      ? rows.map(function (item) {
          var suggestion = shoppingSuggestion(item);
          return '<tr>' +
            '<td>' + esc(item.name) + '</td>' +
            '<td>' + esc(item.supplier_name || '—') + '</td>' +
            '<td>' + esc(num(item.estimated_on_hand, 3) + ' ' + item.unit) + '</td>' +
            '<td><strong>' + esc(suggestion.label) + '</strong></td>' +
          '</tr>';
        }).join('')
      : '<tr><td colspan="4">Current stock should cover this period.</td></tr>';

    var win = window.open('', '_blank', 'noopener,noreferrer,width=880,height=700');
    if (!win) {
      toast('Your browser blocked the print window.', true);
      return;
    }

    win.document.open();
    win.document.write(
      '<!doctype html><html><head><meta charset="utf-8"><title>PayMyDine shopping list</title>' +
      '<style>body{font-family:Arial,sans-serif;color:#111827;padding:28px}h1{font-size:24px;margin:0 0 4px}p{margin:0 0 18px;color:#667085;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid #dfe4ea;padding:10px;text-align:left}th{font-size:10px;text-transform:uppercase;color:#667085}strong{font-weight:800}@media print{body{padding:0}}</style>' +
      '</head><body><h1>Shopping list</h1><p>Cover through ' + esc(shoppingDateLabel()) + '. Based on current stock and recent sales usage.</p>' +
      '<table><thead><tr><th>Item</th><th>Supplier</th><th>On hand</th><th>Suggested buy</th></tr></thead><tbody>' +
      body +
      '</tbody></table><script>window.onload=function(){window.print();};<\/script></body></html>'
    );
    win.document.close();
  }

  function renderActivity() {
    var purchases = root.querySelector('[data-pmd-inv-panel="purchases"]');
    var waste = root.querySelector('[data-pmd-inv-panel="waste"]');
    var recipePanel = root.querySelector('[data-pmd-inv-panel="recipes"]');
    var counts = root.querySelector('[data-pmd-inv-panel="counts"]');

    if (purchases) {
      var rows = Array.isArray(state.snapshot.recent_purchases)
        ? state.snapshot.recent_purchases
        : [];
      purchases.innerHTML = rows.length
        ? rows.map(function (row) {
            var source = String(row.source || '') === 'ai_receipt' ? 'Scanned supplier bill' : 'Manual purchase';
            var detail = Array.isArray(row.lines)
              ? row.lines.slice(0, 4).map(function (line) {
                  return num(line.quantity, 3) + ' ' + (line.unit || '') + ' ' + (line.item_name || '');
                }).join(' · ')
              : '';
            if (Array.isArray(row.lines) && row.lines.length > 4) {
              detail += ' · +' + String(row.lines.length - 4) + ' more';
            }
            if (row.staff_name) {
              detail += (detail ? ' · ' : '') + 'Entered by ' + row.staff_name;
            }
            return '<div class="pmd-inv-activity-row">' +
              '<time>' + esc(dateLabel(row.purchased_at)) + '</time>' +
              '<div><strong>' + esc(row.supplier_name || 'Supplier not set') + '</strong><small>' + esc(detail || source) + '</small></div>' +
              '<b>' + esc(money(row.total_amount)) + '</b>' +
            '</div>';
          }).join('')
        : '<div class="pmd-inv-activity-empty">No purchases recorded yet.</div>';
    }

    if (waste) {
      var wasteRows = Array.isArray(state.snapshot.recent_waste)
        ? state.snapshot.recent_waste
        : [];
      waste.innerHTML = wasteRows.length
        ? wasteRows.map(function (row) {
            return '<div class="pmd-inv-activity-row">' +
              '<time>' + esc(dateTimeLabel(row.occurred_at)) + '</time>' +
              '<div><strong>' + esc(row.item_name || 'Stock item') + '</strong><small>' +
                esc(
                  (row.reason || 'Waste') +
                  (row.note ? ' · ' + row.note : '') +
                  (row.staff_name ? ' · Entered by ' + row.staff_name : '')
                ) +
              '</small></div>' +
              '<b>−' + esc(num(row.qty, 3)) + ' · ' + esc(money(row.cost)) + '</b>' +
            '</div>';
          }).join('')
        : '<div class="pmd-inv-activity-empty">No waste recorded yet.</div>';
    }

    if (recipePanel) {
      var query = String(state.recipeSearch || '').trim().toLowerCase();
      var recipeByMenu = {};
      recipes().forEach(function (recipe) {
        recipeByMenu[Number(recipe.menu_id || 0)] = recipe;
      });

      var menuRows = menus().filter(function (menu) {
        if (!query) return true;
        return String(menu.name || '').toLowerCase().indexOf(query) !== -1;
      });

      var connected = menus().filter(function (menu) {
        var recipe = recipeByMenu[Number(menu.id || 0)];
        return recipe && Array.isArray(recipe.lines) && recipe.lines.length;
      }).length;

      recipePanel.innerHTML =
        '<div class="pmd-inv-menu-map-head">' +
          '<div><strong>Menu → stock connections</strong><span>' +
            esc(String(connected)) + ' of ' + esc(String(menus().length)) +
            ' menu items connected</span></div>' +
          '<label><input type="search" placeholder="Search menu…" data-pmd-inv-menu-map-search value="' + esc(state.recipeSearch) + '"></label>' +
        '</div>' +
        (menuRows.length
          ? '<div class="pmd-inv-menu-map-list">' +
              menuRows.map(function (menu) {
                var recipe = recipeByMenu[Number(menu.id || 0)];
                var lines = recipe && Array.isArray(recipe.lines) ? recipe.lines : [];
                var mapped = lines.length > 0;
                var detail = mapped
                  ? lines.slice(0, 4).map(function (line) {
                      return num(line.qty_per_sale, 3) + ' ' + line.unit + ' ' + line.item_name;
                    }).join(' · ')
                  : 'Not connected yet — sales cannot reduce physical stock for this menu item.';

                return '<button type="button" class="pmd-inv-menu-map-row' + (mapped ? ' is-mapped' : ' is-missing') + '" data-pmd-inv-recipe-menu="' + esc(menu.id) + '">' +
                  '<span class="pmd-inv-menu-map-row__main"><strong>' + esc(menu.name) + '</strong><small>' + esc(detail) + '</small></span>' +
                  '<span class="pmd-inv-menu-map-row__price">' + esc(money(menu.price || 0)) + '</span>' +
                  '<span class="pmd-inv-menu-map-row__status">' + (mapped ? 'Connected' : 'Set up') + '</span>' +
                '</button>';
              }).join('') +
            '</div>'
          : '<div class="pmd-inv-activity-empty">No menu items match this search.</div>');
    }

    if (counts) {
      var last = state.snapshot.last_count;
      counts.innerHTML = last
        ? '<div class="pmd-inv-activity-row">' +
            '<time>' + esc(dateTimeLabel(last.counted_at)) + '</time>' +
            '<div><strong>Latest physical count</strong><small>' +
              esc(
                (last.note || 'Completed stock verification') +
                (last.staff_name ? ' · Counted by ' + last.staff_name : '')
              ) +
            '</small></div>' +
            '<b>' + esc(num(last.age_hours, 1)) + 'h ago</b>' +
          '</div>'
        : '<div class="pmd-inv-activity-empty">No physical stock count has been completed yet.</div>';
    }
  }

  function closeActionMenu() {
    var panel = root.querySelector('[data-pmd-inv-actions-panel]');
    var toggle = root.querySelector('[data-pmd-inv-actions-toggle]');
    if (panel) panel.hidden = true;
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function renderUiState() {
    var hasItems = items().length > 0;
    var empty = root.querySelector('[data-pmd-inv-empty-state]');
    var dashboard = root.querySelector('[data-pmd-inv-dashboard]');
    var headerOps = root.querySelector('[data-pmd-inv-header-ops]');

    if (empty) empty.hidden = hasItems;
    if (dashboard) dashboard.hidden = !hasItems;
    if (headerOps) headerOps.hidden = !hasItems;

    root.querySelectorAll('[data-pmd-inv-requires-items]').forEach(function (node) {
      node.hidden = !hasItems;
    });
  }

  function renderNextStep() {
    var host = root.querySelector('[data-pmd-inv-next-step]');
    if (!host) return;

    if (!items().length) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }

    var summary = state.snapshot.summary || {};
    var hasRecipe = recipes().some(function (recipe) {
      return recipe && Array.isArray(recipe.lines) && recipe.lines.length;
    });

    var title = '';
    var copy = '';
    var action = '';
    var label = '';

    if (menus().length && !hasRecipe) {
      title = 'Next: connect menu sales to stock';
      copy = 'Choose a menu item and tell PayMyDine what it consumes.';
      action = 'recipe';
      label = 'Connect menu';
    } else if (!state.snapshot.last_count) {
      title = 'Next: count what is physically there';
      copy = 'This creates the starting point for future variance checks.';
      action = 'count';
      label = 'Count stock';
    } else {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }

    host.hidden = false;
    host.innerHTML =
      '<div><span>Setup</span><strong>' + esc(title) + '</strong><small>' + esc(copy) + '</small></div>' +
      '<button type="button" data-pmd-inv-open="' + esc(action) + '">' + esc(label) + '</button>';
  }

  function renderRecentActivity() {
    var host = root.querySelector('[data-pmd-inv-recent]');
    if (!host) return;

    var events = [];

    (Array.isArray(state.snapshot.recent_purchases) ? state.snapshot.recent_purchases : []).forEach(function (row) {
      events.push({
        at: String(row.purchased_at || ''),
        type: 'Purchase',
        title: row.supplier_name || 'Supplier purchase',
        detail: Array.isArray(row.lines) && row.lines.length
          ? row.lines.slice(0, 2).map(function (line) { return line.item_name; }).filter(Boolean).join(' · ')
          : 'Stock received',
        value: money(row.total_amount || 0)
      });
    });

    (Array.isArray(state.snapshot.recent_waste) ? state.snapshot.recent_waste : []).forEach(function (row) {
      events.push({
        at: String(row.occurred_at || ''),
        type: 'Waste',
        title: row.item_name || 'Stock item',
        detail: row.reason || 'Recorded waste',
        value: '−' + money(row.cost || 0)
      });
    });

    if (state.snapshot.last_count && state.snapshot.last_count.counted_at) {
      events.push({
        at: String(state.snapshot.last_count.counted_at),
        type: 'Count',
        title: 'Physical stock count',
        detail: state.snapshot.last_count.staff_name
          ? ('Counted by ' + state.snapshot.last_count.staff_name)
          : 'Completed',
        value: ''
      });
    }

    events.sort(function (a, b) {
      return String(b.at || '').localeCompare(String(a.at || ''));
    });
    events = events.slice(0, 7);

    if (!events.length) {
      host.innerHTML = '<div class="pmd-inv-r6-recent-empty">No activity yet.</div>';
      return;
    }

    host.innerHTML = events.map(function (row) {
      var when = String(row.type || '') === 'Purchase'
        ? dateLabel(row.at)
        : dateTimeLabel(row.at);
      return '<div class="pmd-inv-r6-recent-row">' +
        '<time>' + esc(when) + '</time>' +
        '<div><span>' + esc(row.type) + '</span><strong>' + esc(row.title) + '</strong><small>' + esc(row.detail) + '</small></div>' +
        '<b>' + esc(row.value) + '</b>' +
      '</div>';
    }).join('');
  }

  var firstInventoryRender = true;

  function renderAll() {
    if (!state.ready) return;
    renderUiState();
    syncSelects();

    // PMD_INVENTORY_WORKSPACE_R19
    // R19 owns the visible workspace. Do not spend time rebuilding the hidden
    // R6/R18 dashboard, the 2k catalogue, attention list or activity stream on
    // every inventory mutation. Legacy modals remain available for advanced
    // editing, but all visible daily workflows are rendered by R19.
    if (root.querySelector('[data-pmd-inv-r19-workspace]')) {
      firstInventoryRender = false;
      return;
    }

    renderSummary();
    renderNextStep();
    renderStock();
    renderAttention();
    renderRecentActivity();
    renderShoppingList();

    var serverGrid = root.querySelector('[data-pmd-inv-browser-grid="dashboard"][data-pmd-inv-server-rendered="1"]');
    var shouldRenderDashboard = !(firstInventoryRender && serverGrid);
    renderOpenVisualBrowsers(shouldRenderDashboard);
    firstInventoryRender = false;
  }

  function prepareItemEditor(itemId) {
    var modal = root.querySelector('[data-pmd-inv-modal="item"]');
    var form = modal ? modal.querySelector('[data-pmd-inv-form="item"]') : null;
    if (!modal || !form) return;

    form.reset();
    state.commonSearch = '';
    var catalogBrowserState = browserState('catalog');
    catalogBrowserState.query = '';
    catalogBrowserState.main = 'Popular';
    catalogBrowserState.section = 'All';
    catalogBrowserState.limit = 24;
    var commonSearch = modal.querySelector('[data-pmd-inv-common-search]');
    if (commonSearch) commonSearch.value = '';

    var item = itemId ? itemById(itemId) : null;
    var title = modal.querySelector('[data-pmd-inv-item-title]');
    var save = modal.querySelector('[data-pmd-inv-item-save]');
    var archive = modal.querySelector('[data-pmd-inv-archive-item]');
    var openingField = modal.querySelector('[data-pmd-inv-opening-field]');
    var openingInput = openingField ? openingField.querySelector('[name="opening_qty"]') : null;
    var unit = form.querySelector('[name="unit"]');

    form.querySelector('[name="item_id"]').value = item ? String(item.id) : '';
    form.querySelector('[name="name"]').value = item ? String(item.name || '') : '';
    form.querySelector('[name="category"]').value = item ? String(item.category || '') : '';
    form.querySelector('[name="sku"]').value = item ? String(item.sku || '') : '';
    form.querySelector('[name="purchase_unit"]').value = item
      ? String(item.purchase_unit || item.unit || 'piece')
      : 'piece';
    form.querySelector('[name="purchase_to_base"]').value = item
      ? String(item.purchase_to_base || 1)
      : '1';
    form.querySelector('[name="purchase_cost"]').value = item
      ? String(item.purchase_unit_cost || 0)
      : '0';
    var factor = item ? purchaseFactor(item) : 1;
    form.querySelector('[name="reorder_point"]').value = item ? String(Number(item.reorder_point || 0) / factor) : '0';
    form.querySelector('[name="par_level"]').value = item ? String(Number(item.par_level || 0) / factor) : '0';
    form.querySelector('[name="supplier_name"]').value = item ? String(item.supplier_name || '') : '';

    if (unit) {
      unit.disabled = Boolean(item);
      unit.value = item ? String(item.unit || 'piece') : 'piece';
    }

    if (openingField) openingField.hidden = Boolean(item);
    if (openingInput) openingInput.disabled = Boolean(item);
    if (archive) archive.hidden = !item;
    if (title) title.textContent = item ? 'Edit stock item' : 'Add stock item';
    if (save) save.textContent = item ? 'Save item' : 'Add item';

    var advanced = modal.querySelector('.pmd-inv-r6-advanced');
    if (advanced) advanced.open = Boolean(item);

    var catalogBrowser = modal.querySelector('[data-pmd-inv-visual-browser="catalog"]');
    if (catalogBrowser) catalogBrowser.hidden = Boolean(item);

    updatePackageHelp(form);
    renderCommonStock();
    renderVisualBrowser('catalog');
  }

  function openRecipeForMenu(menuId) {
    var modal = root.querySelector('[data-pmd-inv-modal="recipe"]');
    var select = modal ? modal.querySelector('[data-pmd-inv-menu-select]') : null;
    if (!modal || !select) return;

    syncSelects();
    select.value = String(menuId || '');
    loadRecipeForMenu(menuId);
    openModal('recipe');
  }

  function openModal(name) {
    if (
      !items().length
      && ['count', 'waste', 'recipe', 'shopping'].indexOf(String(name || '')) !== -1
    ) {
      toast('Add stock first. Start with a purchase or one stock item.', true);
      return;
    }

    var modal = root.querySelector('[data-pmd-inv-modal="' + name + '"]');
    if (!modal) return;

    closeActionMenu();

    if (name === 'shopping') {
      renderShoppingList();
    }

    if (name === 'purchase') {
      var lines = root.querySelector('[data-pmd-inv-purchase-lines]');
      if (lines && !lines.children.length) addPurchaseLine({});
      syncPurchaseDatalist();
    }
    if (name === 'recipe') {
      var recipeLines = root.querySelector('[data-pmd-inv-recipe-lines]');
      if (recipeLines && !recipeLines.children.length) addRecipeLine({});
    }
    if (name === 'waste') {
      updateWasteUnitOptions();
    }
    if (['item','purchase','waste','recipe'].indexOf(name) !== -1) {
      var browserMode = name === 'item' ? 'catalog' : name;
      var activeBrowser = browserState(browserMode);
      activeBrowser.query = '';
      activeBrowser.limit = browserMode === 'catalog' ? 24 : 12;
      activeBrowser.main = commonBrowserMode(browserMode) ? 'Popular' : 'All';
      activeBrowser.section = 'All';
      var browserSearch = root.querySelector('[data-pmd-inv-browser-search="' + browserMode + '"]');
      if (browserSearch) browserSearch.value = '';
      renderVisualBrowser(browserMode);
    }
    if (name === 'count') {
      renderCountLines();
    }

    // PMD_INVENTORY_CARD_GEOMETRY_R9
    // Build steppers and correct the owner-shell fixed-position offset while the
    // modal is invisible. The first painted frame is already centered.
    document.documentElement.classList.add(
      'pmd-inventory-card-open-r8',
      'pmd-inventory-card-bgblur-r8',
      'pmd-inventory-card-open-r9'
    );
    modal.style.visibility = 'hidden';
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    enhanceNumericSteppers(modal);
    alignModalToViewport(modal);
    modal.style.visibility = '';

    var focus = modal.querySelector('input:not([type="hidden"]):not([type="file"]),select,button:not([hidden]):not([data-pmd-inv-stepper-dir])');
    if (focus) window.setTimeout(function () { focus.focus(); }, 30);
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    modal.style.visibility = '';
    modal.style.removeProperty('--pmd-inv-modal-shift-x');
    modal.style.removeProperty('--pmd-inv-modal-shift-y');

    var form = modal.querySelector('form');
    if (form && !state.busy) form.reset();

    if (modal.matches('[data-pmd-inv-modal="item"]')) {
      var itemUnit = modal.querySelector('[name="unit"]');
      var openingField = modal.querySelector('[data-pmd-inv-opening-field]');
      var openingInput = openingField ? openingField.querySelector('[name="opening_qty"]') : null;
      var itemTitle = modal.querySelector('[data-pmd-inv-item-title]');
      var itemSave = modal.querySelector('[data-pmd-inv-item-save]');
      var itemArchive = modal.querySelector('[data-pmd-inv-archive-item]');
      if (itemUnit) itemUnit.disabled = false;
      if (openingField) openingField.hidden = false;
      if (openingInput) openingInput.disabled = false;
      if (itemArchive) itemArchive.hidden = true;
      if (itemTitle) itemTitle.textContent = 'Add stock item';
      if (itemSave) itemSave.textContent = 'Add item';
    }

    if (modal.matches('[data-pmd-inv-modal="purchase"]')) {
      var purchaseLines = modal.querySelector('[data-pmd-inv-purchase-lines]');
      var receiptStatus = modal.querySelector('[data-pmd-inv-receipt-status]');
      var receiptId = modal.querySelector('[name="receipt_id"]');
      if (purchaseLines) purchaseLines.innerHTML = '';
      if (receiptStatus) {
        receiptStatus.textContent = '';
        receiptStatus.classList.remove('is-error');
      }
      if (receiptId) receiptId.value = '';
    }

    if (modal.matches('[data-pmd-inv-modal="recipe"]')) {
      var recipeLines = modal.querySelector('[data-pmd-inv-recipe-lines]');
      var clearRecipeButton = modal.querySelector('[data-pmd-inv-clear-recipe]');
      if (recipeLines) recipeLines.innerHTML = '';
      if (clearRecipeButton) clearRecipeButton.hidden = true;
    }

    if (modal.matches('[data-pmd-inv-modal="count"]')) {
      var countLines = modal.querySelector('[data-pmd-inv-count-lines]');
      if (countLines) countLines.innerHTML = '';
    }

    if (!root.querySelector('.pmd-inv-modal:not([hidden])')) {
      document.documentElement.style.overflow = '';
      document.documentElement.classList.remove(
        'pmd-inventory-card-open-r8',
        'pmd-inventory-card-bgblur-r8',
        'pmd-inventory-card-open-r9'
      );
    }
  }

  function closeAllModals() {
    root.querySelectorAll('.pmd-inv-modal:not([hidden])').forEach(closeModal);
  }

  function addPurchaseLine(data) {
    var host = root.querySelector('[data-pmd-inv-purchase-lines]');
    if (!host) return;

    data = data || {};
    var row = document.createElement('div');
    row.className = 'pmd-inv-line';
    row.innerHTML =
      '<input type="text" list="pmd-inv-purchase-items-r1" data-pmd-purchase-name placeholder="Stock item" value="' + esc(data.item_name || '') + '" required>' +
      '<input type="number" min="0.0001" step="0.0001" data-pmd-purchase-qty data-pmd-inv-stepper data-pmd-inv-stepper-step="1" placeholder="Qty" value="' + esc(data.quantity == null ? '' : data.quantity) + '" required>' +
      '<select data-pmd-purchase-unit>' + unitOptions(data.unit || 'piece') + '</select>' +
      '<input type="number" min="0" step="0.0001" data-pmd-purchase-cost placeholder="Cost / unit" value="' + esc(data.unit_cost == null ? '' : data.unit_cost) + '">' +
      '<button type="button" class="pmd-inv-line__remove" data-pmd-inv-remove-line aria-label="Remove line">×</button>';

    host.appendChild(row);
    enhanceNumericSteppers(row);
    var input = row.querySelector('[data-pmd-purchase-name]');
    if (input && input.value) syncPurchaseLineToKnownItem(input);
  }

  function purchaseLines() {
    return Array.prototype.slice.call(
      root.querySelectorAll('[data-pmd-inv-purchase-lines] .pmd-inv-line')
    ).map(function (row) {
      return {
        item_id: Number(row.getAttribute('data-pmd-purchase-item-id') || 0),
        item_name: String((row.querySelector('[data-pmd-purchase-name]') || {}).value || '').trim(),
        quantity: Number((row.querySelector('[data-pmd-purchase-qty]') || {}).value || 0),
        unit: String((row.querySelector('[data-pmd-purchase-unit]') || {}).value || 'piece'),
        unit_cost: Number((row.querySelector('[data-pmd-purchase-cost]') || {}).value || 0)
      };
    }).filter(function (line) {
      return line.item_name && line.quantity > 0;
    });
  }

  function updateRecipeLineUnit(row) {
    if (!row) return;
    var select = row.querySelector('[data-pmd-recipe-item]');
    var unit = row.querySelector('[data-pmd-recipe-unit]');
    var item = select ? itemById(select.value) : null;
    if (unit) unit.textContent = item ? String(item.unit || '') : 'unit';
  }

  function addRecipeLine(data) {
    var host = root.querySelector('[data-pmd-inv-recipe-lines]');
    if (!host) return;

    data = data || {};
    var row = document.createElement('div');
    row.className = 'pmd-inv-line is-recipe';
    row.innerHTML =
      '<select data-pmd-recipe-item required>' + itemOptions('Choose stock item') + '</select>' +
      '<input type="number" min="0.0001" step="0.0001" data-pmd-recipe-qty data-pmd-inv-stepper data-pmd-inv-stepper-step="1" placeholder="Amount" value="' + esc(data.qty_per_sale == null ? '' : data.qty_per_sale) + '" required>' +
      '<span class="pmd-inv-recipe-unit" data-pmd-recipe-unit>unit</span>' +
      '<button type="button" class="pmd-inv-line__remove" data-pmd-inv-remove-line aria-label="Remove ingredient">×</button>';
    host.appendChild(row);
    enhanceNumericSteppers(row);

    if (data.item_id) {
      row.querySelector('[data-pmd-recipe-item]').value = String(data.item_id);
    }
    updateRecipeLineUnit(row);
  }

  function loadRecipeForMenu(menuId) {
    var host = root.querySelector('[data-pmd-inv-recipe-lines]');
    if (!host) return;
    host.innerHTML = '';

    var recipe = recipes().find(function (row) {
      return Number(row.menu_id || 0) === Number(menuId || 0);
    });

    var clear = root.querySelector('[data-pmd-inv-clear-recipe]');
    var mapped = Boolean(recipe && Array.isArray(recipe.lines) && recipe.lines.length);
    if (clear) clear.hidden = !mapped;

    if (mapped) {
      recipe.lines.forEach(addRecipeLine);
    } else {
      addRecipeLine({});
    }
  }

  function applyDirectSaleShortcut() {
    var lines = root.querySelectorAll('[data-pmd-inv-recipe-lines] .pmd-inv-line');
    if (!lines.length) {
      addRecipeLine({});
      lines = root.querySelectorAll('[data-pmd-inv-recipe-lines] .pmd-inv-line');
    }

    var row = lines[0];
    var select = row.querySelector('[data-pmd-recipe-item]');
    var qty = row.querySelector('[data-pmd-recipe-qty]');
    var item = select ? itemById(select.value) : null;

    if (!item) {
      toast('Choose the stock item first, then use the direct-sale shortcut.', true);
      if (select) select.focus();
      return;
    }

    var factor = Math.max(0.0001, Number(item.purchase_to_base || 1));
    if (qty) qty.value = String(factor);
    updateRecipeLineUnit(row);
    toast('Direct sale set: one sale uses one ' + String(item.purchase_unit || item.unit) + '.');
  }

  function recipeLines() {
    return Array.prototype.slice.call(
      root.querySelectorAll('[data-pmd-inv-recipe-lines] .pmd-inv-line')
    ).map(function (row) {
      return {
        item_id: Number((row.querySelector('[data-pmd-recipe-item]') || {}).value || 0),
        qty_per_sale: Number((row.querySelector('[data-pmd-recipe-qty]') || {}).value || 0)
      };
    }).filter(function (line) {
      return line.item_id > 0 && line.qty_per_sale > 0;
    });
  }

  function renderCountLines() {
    var host = root.querySelector('[data-pmd-inv-count-lines]');
    if (!host) return;

    if (!items().length) {
      host.innerHTML = '<div class="pmd-inv-activity-empty">Add stock items first.</div>';
      return;
    }

    host.innerHTML = items().map(function (item) {
      var expected = ownerQuantity(item, item.estimated_on_hand);
      return '<div class="pmd-inv-count-row" data-pmd-count-item="' + esc(item.id) + '" data-pmd-count-expected="' + esc(item.estimated_on_hand) + '" data-pmd-count-factor="' + esc(purchaseFactor(item)) + '" data-pmd-count-unit="' + esc(expected.unit) + '">' +
        '<div class="pmd-inv-count-row__item">' + visualMarkup(item, 'xs') + '<strong>' + esc(item.name) + ' <small>' + esc(expected.unit) + '</small></strong></div>' +
        '<span>Expected <b>' + esc(num(expected.qty, 2)) + '</b></span>' +
        '<input type="number" min="0" step="0.0001" data-pmd-count-actual data-pmd-inv-stepper data-pmd-inv-stepper-step="1" placeholder="Actual ' + esc(expected.unit) + '">' +
        '<span class="pmd-inv-count-variance" data-pmd-count-variance>Variance —</span>' +
      '</div>';
    }).join('');
    enhanceNumericSteppers(host);
  }

  function updateCountVariance(input) {
    var row = input.closest('[data-pmd-count-item]');
    if (!row) return;

    var node = row.querySelector('[data-pmd-count-variance]');
    if (!node) return;

    if (input.value === '') {
      node.textContent = 'Variance —';
      node.className = 'pmd-inv-count-variance';
      return;
    }

    var expected = Number(row.getAttribute('data-pmd-count-expected') || 0);
    var factor = Math.max(0.0001, Number(row.getAttribute('data-pmd-count-factor') || 1));
    var unit = String(row.getAttribute('data-pmd-count-unit') || '');
    var actualOwner = Number(input.value || 0);
    var actual = actualOwner * factor;
    var diff = actual - expected;
    var diffOwner = diff / factor;

    node.textContent = 'Variance ' + (diffOwner > 0 ? '+' : '') + num(diffOwner, 2) + ' ' + unit;
    node.className = 'pmd-inv-count-variance' +
      (diff < 0 ? ' is-negative' : (diff > 0 ? ' is-positive' : ''));
  }

  function countLines() {
    return Array.prototype.slice.call(
      root.querySelectorAll('[data-pmd-count-item]')
    ).map(function (row) {
      var input = row.querySelector('[data-pmd-count-actual]');
      if (!input || input.value === '') return null;
      return {
        item_id: Number(row.getAttribute('data-pmd-count-item') || 0),
        counted_qty: Number(input.value || 0) *
          Math.max(0.0001, Number(row.getAttribute('data-pmd-count-factor') || 1))
      };
    }).filter(Boolean);
  }

  function formObject(form) {
    var out = {};
    new FormData(form).forEach(function (value, key) {
      out[key] = value;
    });
    return out;
  }

  function applySnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    state.snapshot = snapshot;
    renderAll();
    try {
      root.dispatchEvent(new CustomEvent('pmd:inventory-snapshot', {
        detail: {snapshot: state.snapshot}
      }));
    } catch (ignore) {}
  }

  function submitAction(form, handler, payload, successMessage) {
    if (state.busy) return;
    setBusy(true);

    request(handler, payload)
      .then(function (json) {
        if (json.snapshot) applySnapshot(json.snapshot);
        closeModal(form.closest('.pmd-inv-modal'));
        form.reset();
        toast(successMessage || 'Saved.');
      })
      .catch(function (error) {
        toast(error.message || 'Could not save.', true);
      })
      .finally(function () {
        setBusy(false);
      });
  }

  root.addEventListener('click', function (event) {
    var browserCard = event.target.closest('[data-pmd-inv-browser-card]');
    if (browserCard) {
      event.preventDefault();
      selectBrowserCard(browserCard);
      return;
    }

    var browserMain = event.target.closest('[data-pmd-inv-browser-main]');
    if (browserMain) {
      event.preventDefault();
      var mainMode = String(browserMain.getAttribute('data-pmd-inv-browser-main') || '');
      var mainKey = String(browserMain.getAttribute('data-pmd-inv-browser-main-key') || 'All');
      var mainState = browserState(mainMode);
      mainState.main = mainKey;
      mainState.section = 'All';
      mainState.query = '';
      mainState.limit = mainMode === 'catalog' ? 24 : (mainMode === 'dashboard' ? 12 : 12);
      var mainSearch = root.querySelector('[data-pmd-inv-browser-search="' + mainMode + '"]');
      if (mainSearch) mainSearch.value = '';
      renderVisualBrowser(mainMode);
      return;
    }

    var browserSection = event.target.closest('[data-pmd-inv-browser-section]');
    if (browserSection) {
      event.preventDefault();
      var sectionMode = String(browserSection.getAttribute('data-pmd-inv-browser-section') || '');
      var sectionKey = String(browserSection.getAttribute('data-pmd-inv-browser-section-key') || 'All');
      var sectionState = browserState(sectionMode);
      sectionState.section = sectionKey;
      sectionState.query = '';
      sectionState.limit = sectionMode === 'catalog' ? 24 : (sectionMode === 'dashboard' ? 12 : 12);
      var sectionSearch = root.querySelector('[data-pmd-inv-browser-search="' + sectionMode + '"]');
      if (sectionSearch) sectionSearch.value = '';
      renderVisualBrowser(sectionMode);
      return;
    }

    var browserMore = event.target.closest('[data-pmd-inv-browser-more]');
    if (browserMore) {
      event.preventDefault();
      var moreMode = String(browserMore.getAttribute('data-pmd-inv-browser-more') || '');
      var moreState = browserState(moreMode);
      moreState.limit += 24;
      renderVisualBrowser(moreMode);
      return;
    }

    var stepButton = event.target.closest('[data-pmd-inv-stepper-dir]');
    if (stepButton) {
      event.preventDefault();
      stepNumericInput(stepButton);
      return;
    }

    var actionToggle = event.target.closest('[data-pmd-inv-actions-toggle]');
    if (actionToggle) {
      event.preventDefault();
      var actionPanel = root.querySelector('[data-pmd-inv-actions-panel]');
      if (actionPanel) {
        var opening = actionPanel.hidden;
        actionPanel.hidden = !opening;
        actionToggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
      }
      return;
    }

    if (!event.target.closest('[data-pmd-inv-action-menu]')) {
      closeActionMenu();
    }

    var editItem = event.target.closest('[data-pmd-inv-edit-item]');
    if (editItem) {
      event.preventDefault();
      prepareItemEditor(Number(editItem.getAttribute('data-pmd-inv-edit-item') || 0));
      openModal('item');
      return;
    }

    var archiveItem = event.target.closest('[data-pmd-inv-archive-item]');
    if (archiveItem) {
      event.preventDefault();
      var archiveModal = archiveItem.closest('[data-pmd-inv-modal="item"]');
      var archiveForm = archiveModal ? archiveModal.querySelector('[data-pmd-inv-form="item"]') : null;
      var archiveId = Number((archiveForm && archiveForm.querySelector('[name="item_id"]') || {}).value || 0);
      var archiveName = String((archiveForm && archiveForm.querySelector('[name="name"]') || {}).value || 'this item');
      if (!archiveId) return;
      if (!window.confirm('Archive "' + archiveName + '"? History will stay, but it will stop appearing in stock and active menu links.')) return;

      setBusy(true);
      request('onArchiveItem', {item_id: archiveId})
        .then(function (json) {
          if (json.snapshot) applySnapshot(json.snapshot);
          closeModal(archiveModal);
          toast('Stock item archived.');
        })
        .catch(function (error) {
          toast(error.message || 'Could not archive the stock item.', true);
        })
        .finally(function () {
          setBusy(false);
        });
      return;
    }

    var recipeMenu = event.target.closest('[data-pmd-inv-recipe-menu]');
    if (recipeMenu) {
      event.preventDefault();
      openRecipeForMenu(Number(recipeMenu.getAttribute('data-pmd-inv-recipe-menu') || 0));
      return;
    }

    var common = event.target.closest('[data-pmd-inv-common-index]');
    if (common) {
      event.preventDefault();
      applyCommonStock(Number(common.getAttribute('data-pmd-inv-common-index') || 0));
      return;
    }

    var shoppingPreset = event.target.closest('[data-pmd-shopping-days]');
    if (shoppingPreset) {
      event.preventDefault();
      state.shoppingDays = Math.max(1, Number(shoppingPreset.getAttribute('data-pmd-shopping-days') || 1));
      var customDate = root.querySelector('[data-pmd-shopping-date]');
      if (customDate) {
        var date = new Date(String(state.today || '') + 'T12:00:00');
        if (!Number.isNaN(date.getTime())) {
          date.setDate(date.getDate() + state.shoppingDays - 1);
          customDate.value = date.toISOString().slice(0, 10);
        }
      }
      renderShoppingList();
      return;
    }

    var directRecipe = event.target.closest('[data-pmd-inv-direct-recipe]');
    if (directRecipe) {
      event.preventDefault();
      applyDirectSaleShortcut();
      return;
    }

    var open = event.target.closest('[data-pmd-inv-open]');
    if (open) {
      event.preventDefault();
      var modalName = String(open.getAttribute('data-pmd-inv-open') || '');
      if (modalName === 'item') prepareItemEditor(0);
      openModal(modalName);
      return;
    }

    var close = event.target.closest('[data-pmd-inv-close]');
    if (close) {
      event.preventDefault();
      closeModal(close.closest('.pmd-inv-modal'));
      return;
    }

    var copyShopping = event.target.closest('[data-pmd-inv-copy-shopping]');
    if (copyShopping) {
      event.preventDefault();
      copyShoppingList();
      return;
    }

    var printShopping = event.target.closest('[data-pmd-inv-print-shopping]');
    if (printShopping) {
      event.preventDefault();
      printShoppingList();
      return;
    }

    var clearRecipe = event.target.closest('[data-pmd-inv-clear-recipe]');
    if (clearRecipe) {
      event.preventDefault();
      var recipeForm = root.querySelector('[data-pmd-inv-form="recipe"]');
      var menuId = Number((recipeForm && recipeForm.querySelector('[name="menu_id"]') || {}).value || 0);
      if (!menuId) return;
      if (!window.confirm('Remove this menu-to-stock connection? Future sales will no longer consume stock until it is connected again.')) return;

      setBusy(true);
      request('onSaveRecipe', {menu_id: menuId, lines: []})
        .then(function (json) {
          if (json.snapshot) applySnapshot(json.snapshot);
          closeModal(clearRecipe.closest('.pmd-inv-modal'));
          toast('Menu stock connection removed.');
        })
        .catch(function (error) {
          toast(error.message || 'Could not remove the connection.', true);
        })
        .finally(function () {
          setBusy(false);
        });
      return;
    }

    var tab = event.target.closest('[data-pmd-inv-tab]');
    if (tab) {
      event.preventDefault();
      var name = String(tab.getAttribute('data-pmd-inv-tab') || '');
      root.querySelectorAll('[data-pmd-inv-tab]').forEach(function (button) {
        var active = button === tab;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      root.querySelectorAll('[data-pmd-inv-panel]').forEach(function (panel) {
        var active = panel.getAttribute('data-pmd-inv-panel') === name;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
      });
      return;
    }

    var addPurchase = event.target.closest('[data-pmd-inv-add-purchase-line]');
    if (addPurchase) {
      event.preventDefault();
      addPurchaseLine({});
      return;
    }

    var addRecipe = event.target.closest('[data-pmd-inv-add-recipe-line]');
    if (addRecipe) {
      event.preventDefault();
      addRecipeLine({});
      return;
    }

    var removeLine = event.target.closest('[data-pmd-inv-remove-line]');
    if (removeLine) {
      event.preventDefault();
      var line = removeLine.closest('.pmd-inv-line');
      if (line) line.remove();
      renderVisualBrowser('recipe');
    }
  });

  root.addEventListener('input', function (event) {
    if (event.target.matches('[data-pmd-inv-browser-search]')) {
      var browserMode = String(event.target.getAttribute('data-pmd-inv-browser-search') || '');
      var bState = browserState(browserMode);
      bState.query = String(event.target.value || '').trim();
      bState.main = bState.query
        ? 'All'
        : (commonBrowserMode(browserMode) ? 'Popular' : 'All');
      bState.section = 'All';
      bState.limit = browserMode === 'catalog' ? 24 : (browserMode === 'dashboard' ? 12 : 12);
      renderVisualBrowser(browserMode);
      return;
    }

    if (event.target.matches('input[data-pmd-inv-stepper]')) {
      syncNumericStepper(event.target);
    }

    if (event.target.matches('[data-pmd-inv-search]')) {
      state.search = String(event.target.value || '').trim();
      renderStock();
      return;
    }

    if (event.target.matches('[data-pmd-inv-common-search]')) {
      state.commonSearch = String(event.target.value || '').trim();
      renderCommonStock();
      var catalogState = browserState('catalog');
      catalogState.query = state.commonSearch;
      catalogState.main = state.commonSearch ? 'All' : 'Popular';
      catalogState.section = 'All';
      catalogState.limit = 24;
      var catalogSearch = root.querySelector('[data-pmd-inv-browser-search="catalog"]');
      if (catalogSearch && catalogSearch.value !== state.commonSearch) {
        catalogSearch.value = state.commonSearch;
      }
      renderVisualBrowser('catalog');
      return;
    }

    if (event.target.matches('[data-pmd-inv-menu-map-search]')) {
      state.recipeSearch = String(event.target.value || '').trim();
      renderActivity();
      var next = root.querySelector('[data-pmd-inv-menu-map-search]');
      if (next) {
        next.focus();
        try { next.setSelectionRange(next.value.length, next.value.length); } catch (ignore) {}
      }
      return;
    }

    if (event.target.matches('[data-pmd-count-actual]')) {
      updateCountVariance(event.target);
    }
  });

  root.addEventListener('change', function (event) {
    if (event.target.matches('[data-pmd-shopping-date]')) {
      var selected = new Date(String(event.target.value || '') + 'T12:00:00');
      var today = new Date(String(state.today || '') + 'T12:00:00');
      if (!Number.isNaN(selected.getTime()) && !Number.isNaN(today.getTime())) {
        state.shoppingDays = Math.max(1, Math.floor((selected - today) / 86400000) + 1);
      }
      renderShoppingList();
      return;
    }

    if (event.target.matches('[data-pmd-waste-item]')) {
      updateWasteUnitOptions();
      renderVisualBrowser('waste');
      return;
    }

    if (event.target.matches('[data-pmd-recipe-item]')) {
      updateRecipeLineUnit(event.target.closest('.pmd-inv-line'));
      renderVisualBrowser('recipe');
      return;
    }

    if (event.target.matches('[name="unit"], [name="purchase_unit"], [name="purchase_to_base"]')) {
      var itemForm = event.target.closest('[data-pmd-inv-form="item"]');
      if (itemForm) updatePackageHelp(itemForm);
    }

    if (event.target.matches('[data-pmd-purchase-name]')) {
      syncPurchaseLineToKnownItem(event.target);
      return;
    }

    if (event.target.matches('[data-pmd-inv-menu-select]')) {
      loadRecipeForMenu(event.target.value);
      return;
    }

    if (event.target.matches('[data-pmd-inv-receipt-file]')) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;

      var status = root.querySelector('[data-pmd-inv-receipt-status]');
      var form = root.querySelector('[data-pmd-inv-form="purchase"]');
      var data = new FormData();
      data.append('receipt', file);

      if (status) {
        status.textContent = state.aiReceipts
          ? 'Reading supplier bill…'
          : 'Saving attachment for manual review…';
        status.classList.remove('is-error');
      }

      event.target.disabled = true;

      request('onScanReceipt', null, data)
        .then(function (json) {
          var extraction = json.extraction || {};
          if (form) {
            var receipt = form.querySelector('[name="receipt_id"]');
            var supplier = form.querySelector('[name="supplier_name"]');
            var purchasedAt = form.querySelector('[name="purchased_at"]');
            if (receipt) receipt.value = String(json.receipt_id || '');
            if (supplier && extraction.supplier_name) supplier.value = extraction.supplier_name;
            if (purchasedAt && extraction.purchase_date) purchasedAt.value = extraction.purchase_date;
          }

          var host = root.querySelector('[data-pmd-inv-purchase-lines]');
          if (host) host.innerHTML = '';

          var lines = Array.isArray(extraction.lines) ? extraction.lines : [];
          if (lines.length) {
            lines.forEach(addPurchaseLine);
          } else {
            addPurchaseLine({});
          }

          if (status) {
            status.textContent = json.ai_ok
              ? 'Bill read. Check every line, quantity and unit cost before adding stock.'
              : 'Attachment saved. AI could not read it, so enter the purchase lines manually.';
            status.classList.toggle('is-error', !json.ai_ok);
          }
        })
        .catch(function (error) {
          if (status) {
            status.textContent = error.message || 'Receipt could not be uploaded.';
            status.classList.add('is-error');
          }
        })
        .finally(function () {
          event.target.disabled = false;
          event.target.value = '';
        });
    }
  });

  root.querySelectorAll('[data-pmd-inv-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var kind = String(form.getAttribute('data-pmd-inv-form') || '');
      var payload = formObject(form);

      if (kind === 'item') {
        var editing = Number(payload.item_id || 0) > 0;

        // If a new item is still on the untouched piece/piece defaults and the
        // typed name is a strong global-catalog match, use the catalog's safe
        // conversion automatically. "tomat" can therefore become Tomato,
        // tracked in g and purchased in kg, even if the suggestion was not
        // explicitly clicked.
        if (!editing) {
          var catalogMatch = bestCatalogMatch(payload.name, 119);
          var untouchedUnits =
            String(payload.unit || 'piece') === 'piece' &&
            String(payload.purchase_unit || 'piece') === 'piece' &&
            Number(payload.purchase_to_base || 1) === 1;

          if (catalogMatch) {
            payload.name = String(catalogMatch.name || payload.name || '');
            if (!String(payload.category || '').trim()) {
              payload.category = String(catalogMatch.category || '');
            }

            if (
              untouchedUnits &&
              catalogMatch.purchase_to_base != null &&
              Number(catalogMatch.purchase_to_base) > 0
            ) {
              payload.unit = String(catalogMatch.unit || 'piece');
              payload.purchase_unit = String(catalogMatch.purchase_unit || payload.unit);
              payload.purchase_to_base = Number(catalogMatch.purchase_to_base);
            }
          }
        }

        if (
          String(payload.purchase_unit || '') !== String(payload.unit || '') &&
          Number(payload.purchase_to_base || 0) <= 0
        ) {
          toast('Enter how much one purchase unit contains.', true);
          return;
        }

        submitAction(
          form,
          'onSaveItem',
          payload,
          editing ? 'Stock item updated.' : 'Stock item added.'
        );
        return;
      }

      if (kind === 'waste') {
        if (!Number(payload.item_id || 0)) {
          toast('Choose the stock item that was wasted.', true);
          renderVisualBrowser('waste');
          return;
        }

        var wasteItem = itemById(payload.item_id);
        if (wasteItem) {
          var wasteUnit = String(payload.quantity_unit || wasteItem.unit || '');
          var baseUnit = String(wasteItem.unit || '');
          var purchaseUnit = String(wasteItem.purchase_unit || baseUnit);
          if (wasteUnit === purchaseUnit && purchaseUnit !== baseUnit) {
            payload.quantity = Number(payload.quantity || 0) * purchaseFactor(wasteItem);
          }
        }
        delete payload.quantity_unit;
        submitAction(form, 'onRecordWaste', payload, 'Waste recorded.');
        return;
      }

      if (kind === 'purchase') {
        payload.lines = purchaseLines();
        if (!payload.lines.length) {
          toast('Add at least one purchase line.', true);
          return;
        }
        submitAction(form, 'onSavePurchase', payload, 'Purchase added to stock.');
        return;
      }

      if (kind === 'recipe') {
        payload.lines = recipeLines();
        if (!payload.menu_id) {
          toast('Choose a menu item.', true);
          return;
        }
        if (!payload.lines.length) {
          toast('Add at least one stock item to the recipe.', true);
          return;
        }
        submitAction(form, 'onSaveRecipe', payload, 'Recipe stock usage saved.');
        return;
      }

      if (kind === 'count') {
        payload.lines = countLines();
        if (!items().length) {
          toast('Add stock items before starting a count.', true);
          return;
        }
        if (payload.lines.length !== items().length) {
          toast('Enter the physical count for every stock item.', true);
          return;
        }
        submitAction(form, 'onCompleteCount', payload, 'Physical stock count completed.');
      }
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeAllModals();
  });

  // PMD_INVENTORY_VIEWPORT_RESIZE_R9
  window.addEventListener('resize', function () {
    root.querySelectorAll('.pmd-inv-modal:not([hidden])').forEach(function (modal) {
      alignModalToViewport(modal);
    });
  });

  root.addEventListener('load', function (event) {
    var image = event.target;
    if (!image || !image.matches || !image.matches('[data-pmd-inv-real-image]')) return;
    markCatalogPhotoLoaded(image.currentSrc || image.src);
    var visual = image.closest('.pmd-inv-item-visual');
    if (visual) visual.classList.add('has-photo');
  }, true);

  root.addEventListener('error', function (event) {
    var image = event.target;
    if (!image || !image.matches || !image.matches('[data-pmd-inv-real-image]')) return;
    var visual = image.closest('.pmd-inv-item-visual');
    if (visual) visual.classList.remove('has-photo');
    image.remove();
  }, true);

  enhanceNumericSteppers(root);
  bootHeaderNotification();
  renderAll();

  window.PMDInventoryControlR1 = {
    version: '20.0.0',
    refresh: function () {
      return request('onSnapshot', {}).then(function (json) {
        if (json.snapshot) applySnapshot(json.snapshot);
        return json;
      });
    },
    request: request,
    applySnapshot: applySnapshot,
    getSnapshot: function () {
      return state.snapshot;
    },
    getCatalog: function () {
      return commonStockTemplates();
    },
    getConfig: function () {
      return {
        ready: state.ready,
        aiReceipts: state.aiReceipts,
        currency: state.currency,
        units: bootstrap.units || {},
        wasteReasons: bootstrap.waste_reasons || {},
        embedded: Boolean(bootstrap.embedded),
        endpoint: String(bootstrap.endpoint || window.location.href || '')
      };
    },
    getState: function () {
      return {
        ready: state.ready,
        items: items().length,
        recipes: recipes().length,
        currency: state.currency
      };
    }
  };
})();
