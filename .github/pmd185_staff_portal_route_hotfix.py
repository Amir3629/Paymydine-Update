from pathlib import Path

admin = Path('app/admin/routes.php')
main = Path('app/main/routes.php')

loader = "require_once base_path('routes/pmd-staff-portal-v1.php');\n"

admin_text = admin.read_text()
if loader not in admin_text:
    raise SystemExit('admin loader not found')
admin_text = admin_text.replace(loader, '', 1)
admin.write_text(admin_text)

main_text = main.read_text()
if loader in main_text:
    raise SystemExit('main loader already exists')
anchor = "require_once __DIR__.'/routes/worldline-public.php';\n"
if anchor not in main_text:
    raise SystemExit('main route anchor not found')
main_text = main_text.replace(anchor, anchor + "\n// PMD_STAFF_PORTAL_V1_PUBLIC_ROUTE_LOADER\n" + loader, 1)
main.write_text(main_text)

print('Staff portal loader moved to Main route authority')
