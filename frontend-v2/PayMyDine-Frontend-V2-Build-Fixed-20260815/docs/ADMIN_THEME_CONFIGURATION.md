# Admin Theme Configuration

## Canonical IDs

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

`integration/admin/theme-manifest.json` can be used to build the Admin selector.

## Settings that belong to Admin

### Restaurant identity

- Restaurant name
- Logo and favicon
- Hero image
- Description/tagline
- Contact phone and WhatsApp
- Address and opening text
- Footer message

### Features

- Waiter call
- Table note
- Valet
- Table ordering
- Split bill
- Tips
- Coupons
- Social links
- Call-to-order

### Localization

- Default locale
- Enabled locales
- Translated restaurant copy
- Translated categories
- Translated item names/descriptions

### Theme options

Theme options should be structured fields, not arbitrary CSS. Examples:

- hero mode
- category presentation
- card density
- heading style
- approved primary/accent colors
- service action placement
- call-to-order visibility

The Theme ID and configuration version should be stored together. Publishing a Theme should increment the version so CDN/server caches cannot serve an older visual package.
