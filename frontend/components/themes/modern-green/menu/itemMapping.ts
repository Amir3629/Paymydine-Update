export type NativeMenuItem = any;

export function nativeItemId(item: NativeMenuItem): string {
  return String(item?.id ?? item?.menu_id ?? item?.menuId ?? "");
}

export function nativeItemName(item: NativeMenuItem): string {
  return String(item?.name ?? item?.menu_name ?? item?.title ?? "Menu item");
}

export function nativeItemDescription(item: NativeMenuItem): string {
  return String(
    item?.description ?? item?.menu_description ?? item?.desc ?? "",
  );
}

export function nativeItemCategory(item: NativeMenuItem): string {
  return String(
    item?.category ??
      item?.category_name ??
      item?.categoryName ??
      item?.menu_category_name ??
      "Menu",
  );
}

export function nativeItemPrice(item: NativeMenuItem): number {
  const value = Number(
    item?.price ?? item?.menu_price ?? item?.sale_price ?? 0,
  );
  return Number.isFinite(value) ? value : 0;
}

export function nativeItemImage(item: NativeMenuItem): string {
  const images = Array.isArray(item?.images) ? item.images : [];
  const media = Array.isArray(item?.media) ? item.media : [];
  const candidates = [
    item?.image,
    item?.image_url,
    item?.imageUrl,
    item?.thumb,
    item?.thumbnail,
    ...images.map((image: any) =>
      typeof image === "string"
        ? image
        : image?.url || image?.path || image?.image_path || image?.src,
    ),
    ...media.map(
      (image: any) =>
        image?.url || image?.path || image?.image_path || image?.src,
    ),
  ];
  return String(
    candidates.find((value) => typeof value === "string" && value.trim()) || "",
  );
}
