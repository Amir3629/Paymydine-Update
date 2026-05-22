# Menu multi-image support research

- Current backend API (`app/Http/Controllers/Api/MenuController.php`) selects a single media attachment with `tag = 'thumb'` and maps only one `image` field per menu item.
- No multi-image payload is currently exposed in the menu response (`images`, `gallery`, `media` arrays are not emitted by backend today).
- Frontend is now backward-compatible and ready to consume multi-image arrays if backend later provides them.

## Low-risk backend proposal (not implemented here)

1. Add optional related media list query (e.g. additional `media_attachments` rows per `menu_id`).
2. Return `images: string[]` (or `gallery: string[]`) in API response while keeping existing `image` field unchanged.
3. Keep `image` as first thumbnail for legacy clients.

## Rollback

- Revert frontend-only support by restoring:
  - `frontend/components/menu-item-modal.tsx`
  - `frontend/lib/api-client.ts`
