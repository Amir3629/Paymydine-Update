# Admin Theme Configuration — V2

## 10 canonical Theme IDs

| ID | Display name | Restaurant profile |
|---|---|---|
| `noir_editorial` | Noir Editorial | Chef's table / luxury dining |
| `verdant_modern` | Verdant Modern | Modern casual / bistro |
| `lumiere_fine_dining` | Lumière Fine Dining | Hotel / fine dining |
| `kazen_japanese` | Kazen Japanese | Japanese / omakase |
| `azzurra_coastal` | Azzurra Coastal | Mediterranean / seafood |
| `neon_cocktail_bar` | Neon Cocktail Bar | Bar / nightlife |
| `art_deco_speakeasy` | Art Deco Speakeasy | Premium bar / lounge |
| `shahrazad_persian` | Shahrazad Persian | Persian fine dining |
| `anatolia_turkish` | Anatolia Turkish | Turkish / grill |
| `ember_steakhouse` | Ember Steakhouse | Steakhouse / charcoal grill |

The installable field definition is `integration/admin/frontend-theme-fields-v2.php`.

## Product settings exposed by the V2 Theme fields

- Customer menu Theme
- Enabled menu languages (`en,de,fa,tr,ja`)
- Waiter Call on/off
- Valet on/off
- Split Bill on/off
- Tips on/off
- Coupons on/off
- Social links on/off
- Existing website URL and featured social destination

Restaurant name, logo, menu, categories, prices, images, dietary/allergen fields, tables and payment methods continue to come from their existing Admin/backend authorities; they are not duplicated inside Theme settings.

There is intentionally **no** Phone / Call-to-Order field and **no** Table Note field in V2. This is a dine-in QR ordering experience.

## Theme switching rule

Admin saves a canonical Theme ID. `/api/v2/frontend-theme` returns that ID plus `theme_version`. Next resolves the Theme on the server before rendering. The browser does not first render a default/old Theme and then repaint it.

## Isolation rule

Theme customization must remain structured. No arbitrary global CSS, runtime DOM repair script, iframe Theme, `MutationObserver` styling or cross-theme stylesheet is allowed. Future Theme-specific options should be namespaced, e.g. `pmd_v2_<theme_id>_*`.
