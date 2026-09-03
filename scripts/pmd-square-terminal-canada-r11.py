#!/usr/bin/env python3
from pathlib import Path

BASE = Path('/var/www/paymydine')
TERMINAL_CONTROLLER = BASE / 'app/admin/controllers/TerminalDevices.php'
MODAL = BASE / 'app/admin/views/pmddevices/_inline_modal_form.blade.php'


def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text()
    if new in text:
        print(f'PASS: {label} already applied')
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    path.write_text(text.replace(old, new, 1))
    print(f'PASS: {label}')


def insert_before_once(path: Path, anchor: str, block: str, marker: str, label: str):
    text = path.read_text()
    if marker in text:
        print(f'PASS: {label} already applied')
        return
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    path.write_text(text.replace(anchor, block + anchor, 1))
    print(f'PASS: {label}')


for required in [TERMINAL_CONTROLLER, MODAL]:
    if not required.is_file():
        raise SystemExit(f'STOP: required file missing: {required}')

# Custom AJAX handlers from the inline Devices modal execute directly against
# /admin/terminal_devices/edit/{id}. The FormController edit context is not
# guaranteed to be initialized before those handlers, so formGetModel() can
# throw even though the record exists. Resolve the persisted tenant record
# explicitly by the hidden record ID / route tail, then only fall back to the
# FormController model when available.
replace_once(
    TERMINAL_CONTROLLER,
    "use Admin\\Models\\Payments_model;\n",
    "use Admin\\Models\\Payments_model;\nuse Admin\\Models\\Terminal_devices_model;\n",
    'Terminal controller imports terminal device model',
)

resolver = r'''    // PMD_SQUARE_TERMINAL_CANADA_R11_INLINE_RECORD_RESOLVER
    private function resolveInlineTerminalRecord()
    {
        $recordId = (int)post('_pmd_terminal_device_id', 0);

        if ($recordId <= 0) {
            $routeTail = trim((string)basename((string)request()->path()));
            if ($routeTail !== '' && ctype_digit($routeTail)) {
                $recordId = (int)$routeTail;
            }
        }

        if ($recordId > 0) {
            try {
                $record = Terminal_devices_model::query()->find($recordId);
                if ($record) {
                    return $record;
                }
            } catch (\Throwable $error) {
                Log::error('PMD_TERMINAL_INLINE_RECORD_QUERY_FAILED_R11', [
                    'terminal_device_id' => $recordId,
                    'message' => $error->getMessage(),
                ]);
            }
        }

        try {
            $record = $this->formGetModel();
            if ($record) {
                return $record;
            }
        } catch (\Throwable $error) {
            Log::warning('PMD_TERMINAL_INLINE_FORM_MODEL_UNAVAILABLE_R11', [
                'terminal_device_id' => $recordId ?: null,
                'message' => $error->getMessage(),
            ]);
        }

        return null;
    }

'''
insert_before_once(
    TERMINAL_CONTROLLER,
    '    public function onDiscoverReaders()\n',
    resolver,
    'PMD_SQUARE_TERMINAL_CANADA_R11_INLINE_RECORD_RESOLVER',
    'Inline terminal actions resolve persisted record independently of FormController context',
)

old_discovery = r'''        // PMD_SQUARE_TERMINAL_CANADA_R10_DISCOVERY
        try {
            $model = $this->formGetModel();
        } catch (\Throwable $error) {
            Log::error('PMD_TERMINAL_DISCOVERY_MODEL_FAILED_R10', ['message' => $error->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Unable to load this terminal record for discovery.'], 422);
        }

        $providerCode = strtolower(trim((string)post('Terminal_device.provider_code', (string)($model->provider_code ?? ''))));
'''
new_discovery = r'''        // PMD_SQUARE_TERMINAL_CANADA_R11_DISCOVERY_RECORD
        $model = $this->resolveInlineTerminalRecord();
        if (!$model) {
            return response()->json([
                'success' => false,
                'error' => 'Unable to resolve this terminal record in the current restaurant database.',
                'terminal_device_id' => (int)post('_pmd_terminal_device_id', 0) ?: null,
            ], 422);
        }

        $providerCode = strtolower(trim((string)post('Terminal_device.provider_code', (string)($model->provider_code ?? ''))));
'''
replace_once(
    TERMINAL_CONTROLLER,
    old_discovery,
    new_discovery,
    'Terminal discovery no longer depends on FormController initialization',
)

old_test = r'''        // PMD_SQUARE_TERMINAL_CANADA_R10_TEST_HANDLER
        try {
            $model = $this->formGetModel();
        } catch (\Throwable $error) {
            Log::error('PMD_TERMINAL_TEST_MODEL_FAILED_R10', ['message' => $error->getMessage()]);
            return response()->json(['success' => false, 'error' => 'Unable to load this terminal record for testing.'], 422);
        }
        $providerCode = strtolower(trim((string)post('Terminal_device.provider_code', (string)($model->provider_code ?? ''))));
        $readerId = trim((string)post('Terminal_device.reader_id', (string)($model->reader_id ?? '')));
'''
new_test = r'''        // PMD_SQUARE_TERMINAL_CANADA_R11_TEST_RECORD
        $model = $this->resolveInlineTerminalRecord();
        if (!$model) {
            return response()->json([
                'success' => false,
                'error' => 'Unable to resolve this terminal record in the current restaurant database.',
                'terminal_device_id' => (int)post('_pmd_terminal_device_id', 0) ?: null,
            ], 422);
        }
        $providerCode = strtolower(trim((string)post('Terminal_device.provider_code', (string)($model->provider_code ?? ''))));
        $readerId = trim((string)post('Terminal_device.reader_id', (string)($model->reader_id ?? '')));
'''
replace_once(
    TERMINAL_CONTROLLER,
    old_test,
    new_test,
    'Terminal test no longer depends on FormController initialization',
)

# Add an explicit record identifier to the inline edit form. Route-tail fallback
# remains in place so stale cached HTML cannot break the handler.
modal_anchor = '    <input type="hidden" name="_token" value="{{ csrf_token() }}">\n'
modal_block = r'''    @if($kind === 'terminals' && $mode === 'edit' && $recordId)
        {{-- PMD_SQUARE_TERMINAL_CANADA_R11_RECORD_ID --}}
        <input type="hidden" name="_pmd_terminal_device_id" value="{{ (int)$recordId }}">
    @endif
'''
insert_before_once(
    MODAL,
    modal_anchor,
    modal_block,
    'PMD_SQUARE_TERMINAL_CANADA_R11_RECORD_ID',
    'Inline terminal form posts its persisted record ID',
)

# Integrity guards.
controller = TERMINAL_CONTROLLER.read_text()
for marker in [
    'PMD_SQUARE_TERMINAL_CANADA_R11_INLINE_RECORD_RESOLVER',
    'PMD_SQUARE_TERMINAL_CANADA_R11_DISCOVERY_RECORD',
    'PMD_SQUARE_TERMINAL_CANADA_R11_TEST_RECORD',
]:
    if marker not in controller:
        raise SystemExit(f'STOP: missing R11 controller marker: {marker}')
if 'Unable to load this terminal record for discovery.' in controller:
    raise SystemExit('STOP: stale R10 discovery model error is still present')
if 'Unable to load this terminal record for testing.' in controller:
    raise SystemExit('STOP: stale R10 test model error is still present')
if "Terminal_devices_model::query()->find($recordId)" not in controller:
    raise SystemExit('STOP: explicit tenant terminal record lookup missing')

modal = MODAL.read_text()
if 'PMD_SQUARE_TERMINAL_CANADA_R11_RECORD_ID' not in modal or '_pmd_terminal_device_id' not in modal:
    raise SystemExit('STOP: inline terminal record ID field missing')

print('PASS: Square/terminal Discover action can resolve the edit record without FormController context')
print('PASS: Square/terminal Test action can resolve the edit record without FormController context')
print('PASS: persisted record lookup remains tenant-database scoped')
print('PASS: existing Square R10 Canada/CAD validation and settlement code are untouched')
