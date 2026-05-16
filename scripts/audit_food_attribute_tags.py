#!/usr/bin/env python3
"""Static audit for PayMyDine menu food attribute/allergy tag feature."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CHECKS = {
    "migration_flags": (
        "app/admin/database/migrations/2026_05_16_000100_add_food_attribute_tags_to_menus_table.php",
        ["is_halal", "is_vegetarian", "is_vegan", "Milk / Lactose", "allergens"],
    ),
    "admin_form_section": (
        "app/admin/models/config/menus_model.php",
        ["Food Attributes & Allergies", "is_halal", "is_vegetarian", "is_vegan", "Allergy tags"],
    ),
    "model_casts": (
        "app/admin/models/Menus_model.php",
        ["'is_halal' => 'boolean'", "'is_vegetarian' => 'boolean'", "'is_vegan' => 'boolean'"],
    ),
    "api_normalization": (
        "app/Http/Controllers/Api/MenuController.php",
        ["normalizeFoodAttributes", "foodAttributeArray", "allergy_tags", "halal", "vegetarian", "vegan"],
    ),
    "tenant_route_normalization": (
        "app/main/routes.php",
        ["pmdFoodAttributeSelectSql", "pmdMenuAllergyTags", "pmdApplyFoodAttributes", "allergy_tags"],
    ),
    "frontend_badges": (
        "frontend/components/food-attribute-tags.tsx",
        ["FoodAttributeTags", "Halal", "Vegetarian", "Vegan", "Food attributes and allergy tags"],
    ),
    "frontend_card_usage": (
        "frontend/components/menu-item-card.tsx",
        ["FoodAttributeTags", "compact"],
    ),
    "frontend_modal_usage": (
        "frontend/components/menu-item-modal.tsx",
        ["FoodAttributeTags", "justify-center"],
    ),
}


def main() -> int:
    failures: list[str] = []
    for name, (rel_path, needles) in CHECKS.items():
        path = ROOT / rel_path
        if not path.exists():
            failures.append(f"{name}: missing {rel_path}")
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        missing = [needle for needle in needles if needle not in text]
        if missing:
            failures.append(f"{name}: missing {', '.join(missing)} in {rel_path}")
        else:
            print(f"PASS {name}")

    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1

    print("Food attribute tag audit passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
