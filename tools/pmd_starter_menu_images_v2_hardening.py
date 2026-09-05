from pathlib import Path

p = Path('app/admin/Services/PmdStarterMenuImageServiceV2.php')
s = p.read_text(encoding='utf-8')

old = r'''        $category = trim((string)($item['category'] ?? ''));
        $cuisine = $this->cuisineTerm($restaurantType);

        // No broad "Italian food" style fallback. Every query remains tied to
        // the actual dish or its category, which prevents the V1 lasagna/ravioli
        // mismatch seen on Carbonara, Tagliatelle and Risotto.
        return array_values(array_unique(array_filter([
            trim($name.' plated restaurant food'),
            trim($name.' '.$cuisine.' dish'),
            trim($name.' food photography'),
            trim($category.' '.$cuisine.' plated dish'),
        ])));
'''
new = r'''        $description = trim((string)($item['description'] ?? ''));
        $cuisine = $this->cuisineTerm($restaurantType);
        $descriptionHint = implode(' ', array_slice(preg_split('/\s+/u', $description) ?: [], 0, 14));

        // No broad cuisine/category fallback. Every query stays anchored to the
        // actual dish. The description query gives culturally specific dishes a
        // useful visual hint without silently substituting a different menu item.
        return array_values(array_unique(array_filter([
            trim($name.' plated restaurant food'),
            trim($name.' '.$cuisine.' dish'),
            trim($name.' '.$descriptionHint.' food photography'),
        ])));
'''
if old not in s:
    raise SystemExit('query block not found')
s = s.replace(old, new, 1)

old_block = """        foreach (['restaurant interior', 'kitchen interior', 'menu board', 'food menu', 'person holding', 'people eating'] as $blocked) {\n"""
new_block = """        foreach ([\n            'restaurant interior', 'kitchen interior', 'menu board', 'food menu',\n            'person holding', 'people eating', 'takeaway', 'take out', 'plastic container',\n            'disposable container', 'paper plate', 'cafeteria', 'buffet', 'food tray', 'meal prep box'\n        ] as $blocked) {\n"""
if old_block not in s:
    raise SystemExit('blocked list not found')
s = s.replace(old_block, new_block, 1)

old_dims = """        if ($width < self::MIN_WIDTH || $height < self::MIN_HEIGHT || $width <= $height) return false;\n\n        $src = (array)($candidate['src'] ?? []);\n"""
new_dims = """        if ($width < self::MIN_WIDTH || $height < self::MIN_HEIGHT || $width <= $height) return false;\n        $ratio = $width / max(1, $height);\n        if ($ratio < 1.15 || $ratio > 2.1) return false;\n\n        $src = (array)($candidate['src'] ?? []);\n"""
if old_dims not in s:
    raise SystemExit('dimension block not found')
s = s.replace(old_dims, new_dims, 1)

p.write_text(s, encoding='utf-8')
print('V2 matching hardened')
