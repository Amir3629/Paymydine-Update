#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '.')


def read(rel):
    p = ROOT / rel
    if not p.is_file():
        raise SystemExit(f'missing patch target: {rel}')
    return p, p.read_text()


def write(p, s):
    p.write_text(s)


def replace_once(s, old, new, label):
    if new in s:
        return s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    return s.replace(old, new, 1)


def patch_routes():
    rel = 'routes/api.php'
    p, s = read(rel)
    marker = 'PMD_LOCAL_POS_AGENT_R1_ROUTE_LOADER'
    if marker not in s:
        anchor = "// Apply CORS middleware to all API routes\n"
        block = "// PMD_LOCAL_POS_AGENT_R1_ROUTE_LOADER\nrequire_once base_path('routes/pmd-pos-agent-r1.php');\n\n"
        s = replace_once(s, anchor, block + anchor, 'routes api loader')
    write(p, s)


def patch_cashdrawers():
    rel = 'app/admin/controllers/CashDrawers.php'
    p, s = read(rel)

    s = s.replace(
        "$adminBase = rtrim(url(admin_url('/')), '/');",
        "$adminBase = rtrim(request()->getSchemeAndHttpHost(), '/');",
        1,
    )
    s = s.replace(
        "$agentUrl = $adminBase.'/cash_drawers/windows_connector_agent/'.$drawer->drawer_id;",
        "$agentUrl = $adminBase.'/api/pmd-pos-agent/agent.js';",
        1,
    )
    if "PMD_R2_PER_DEVICE_PAIRING_ONLY" not in s:
        s = replace_once(
            s,
            "$token = config('cashdrawer.agent_token');",
            "$token = ''; // PMD_R2_PER_DEVICE_PAIRING_ONLY",
            'disable shared agent token',
        )

    if 'PMD_CASH_DRAWER_SIMPLE_CONNECTOR_R2' not in s:
        old = """        $device = $drawer->localPosDevice;
        if (!$device) {
            abort(400, 'No local POS terminal paired');
        }

"""
        new = """        // PMD_CASH_DRAWER_SIMPLE_CONNECTOR_R2
        if (!$this->hasLocalHardwareColumns()) {
            abort(409, 'Local hardware setup is not available yet for this tenant.');
        }
        $device = $this->ensureLocalPosDeviceForDrawer($drawer);

"""
        s = replace_once(s, old, new, 'windows connector auto mapping')

    if 'function ensureLocalPosDeviceForDrawer' not in s:
        anchor = "    protected function buildWindowsConnectorScript($drawer, $device): string\n"
        helper = r'''    /**
     * PMD_CASH_DRAWER_LOCAL_POS_OWNER_R2
     * One owner for local workstation creation/mapping. Downloading the
     * connector is enough to prepare the drawer; owners never choose a POS id.
     */
    protected function ensureLocalPosDeviceForDrawer($drawer)
    {
        $device = $drawer->localPosDevice;
        if (!$device) {
            $device = Pos_devices_model::create([
                'name' => ($drawer->name ?: 'Cashier').' POS',
                'code' => 'local-pos-drawer-'.$drawer->drawer_id,
                'device_type' => 'local_terminal',
                'description' => 'PayMyDine local hardware workstation for drawer '.$drawer->drawer_id,
                'is_local_terminal' => true,
                'pairing_token' => bin2hex(random_bytes(24)),
                'device_status' => 'offline',
                'capabilities' => ['cash_drawer' => true, 'printer' => true],
            ]);
        } else {
            if (!$device->pairing_token) {
                $device->pairing_token = bin2hex(random_bytes(24));
            }
            $device->is_local_terminal = true;
            if (empty($device->device_type)) {
                $device->device_type = 'local_terminal';
            }
            $device->save();
        }

        if (Schema::hasColumn('pos_devices', 'device_code') && empty($device->device_code)) {
            $device->device_code = 'PMD-POS-'.$device->device_id;
            $device->save();
        }

        $drawer->local_pos_device_id = $device->device_id;
        $drawer->local_mapping_invalid = false;
        if (empty($drawer->connection_type)) {
            $drawer->connection_type = 'rj11_printer';
        }
        $drawer->status = true;
        $drawer->auto_open_on_cash = true;
        $drawer->test_on_save = false;
        $drawer->save();

        return $device;
    }

'''
        s = replace_once(s, anchor, helper + anchor, 'cash drawer local pos helper')

    if 'PMD_CASH_DRAWER_SIMPLE_DEFAULTS_R2' not in s:
        anchor = "    public function formAfterSave($model)\n    {\n"
        block = """    public function formAfterSave($model)
    {
        // PMD_CASH_DRAWER_SIMPLE_DEFAULTS_R2
        // Product default is a printer-driven drawer. Advanced modes remain
        // available, but a normal owner never has to configure them.
        if (empty($model->connection_type)) {
            $model->connection_type = 'rj11_printer';
        }
        if (empty($model->esc_pos_command)) {
            $model->esc_pos_command = '27,112,0,60,120';
        }
        if ($model->test_on_save) {
            $model->test_on_save = false;
        }
        if ($model->isDirty()) {
            $model->save();
        }
"""
        s = replace_once(s, anchor, block, 'cash drawer simple defaults')

    write(p, s)


def patch_settlement():
    rel = 'app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php'
    p, s = read(rel)
    if 'PMD_CASH_DRAWER_SETTLEMENT_R1' not in s:
        import_anchor = "use App\\Services\\TerminalPayments\\TerminalPaymentService;\n"
        s = replace_once(
            s,
            import_anchor,
            import_anchor + "use Admin\\Services\\CashDrawerService\\CashDrawerSettlementBridge;\n",
            'settlement import',
        )
        anchor = """                $order->refresh();
                $freshSummary = $this->buildPaymentSummary($order, true);
"""
        replacement = """                $order->refresh();

                // PMD_CASH_DRAWER_SETTLEMENT_R1
                // Hardware failure never rolls back a valid payment. The
                // bridge only queues a short-lived deduplicated cash command.
                $cashDrawerResult = CashDrawerSettlementBridge::enqueueAfterSettlement(
                    $order,
                    (int)$transactionId,
                    $method,
                    $payload,
                    $idempotencyKey
                );

                $freshSummary = $this->buildPaymentSummary($order, true);
"""
        s = replace_once(s, anchor, replacement, 'settlement bridge')
        anchor2 = """                    'remaining_amount' => $newRemaining,
                ];
"""
        repl2 = """                    'remaining_amount' => $newRemaining,
                    'cash_drawer' => $cashDrawerResult,
                ];
"""
        s = replace_once(s, anchor2, repl2, 'settlement transaction result')
        anchor3 = """                'remaining_amount' => $result['remaining_amount'],
                'summary' => $result['summary'],
"""
        repl3 = """                'remaining_amount' => $result['remaining_amount'],
                'cash_drawer' => $result['cash_drawer'] ?? null,
                'summary' => $result['summary'],
"""
        s = replace_once(s, anchor3, repl3, 'settlement response')
    write(p, s)


def patch_payment_js():
    rel = 'app/admin/assets/js/pmd-waiter-pos-payment-v3.js'
    p, s = read(rel)
    if 'PMD_CASHIER_LOCAL_POS_IDENTITY_R1' not in s:
        anchor = "      function resetPaymentState() {\n"
        helper = r'''      // PMD_CASHIER_LOCAL_POS_IDENTITY_R1
      var pmdLocalPosIdentityPromise = null;
      async function resolveLocalPosIdentity() {
        var cachedCode = '';
        try { cachedCode = String(window.localStorage.getItem('pmd_local_pos_device_code') || ''); } catch (e) {}
        if (pmdLocalPosIdentityPromise) return pmdLocalPosIdentityPromise;

        pmdLocalPosIdentityPromise = (async function () {
          var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          var timer = controller ? setTimeout(function () { controller.abort(); }, 900) : null;
          try {
            var response = await fetch('http://127.0.0.1:17877/identity?_=' + Date.now(), {
              method: 'GET', cache: 'no-store', mode: 'cors',
              signal: controller ? controller.signal : undefined,
              headers: {'Accept': 'application/json'}
            });
            if (!response.ok) throw new Error('Local POS identity HTTP ' + response.status);
            var identity = await response.json();
            if (identity && identity.paired && identity.device_code) {
              try { window.localStorage.setItem('pmd_local_pos_device_code', String(identity.device_code)); } catch (e) {}
              return identity;
            }
          } catch (e) {
            // Connector may not be installed. A single unambiguous drawer can
            // still be selected server-side; multiple drawers fail closed.
          } finally {
            if (timer) clearTimeout(timer);
          }
          return cachedCode ? {device_code: cachedCode, cached: true} : null;
        })();

        try { return await pmdLocalPosIdentityPromise; }
        finally { pmdLocalPosIdentityPromise = null; }
      }

'''
        s = replace_once(s, anchor, helper + anchor, 'payment local identity helper')
        anchor2 = """        var summary = state.payment.summary;
        try {
          var json = await fetchJson(paymentSettleUrl(), {
"""
        repl2 = """        var summary = state.payment.summary;
        try {
          var localPosIdentity = state.payment.method === 'cash'
            ? await resolveLocalPosIdentity()
            : null;
          var json = await fetchJson(paymentSettleUrl(), {
"""
        s = replace_once(s, anchor2, repl2, 'payment identity resolve')
        anchor3 = """              payment_method: state.payment.method,
              provider_code: state.payment.method === 'external_terminal' ? 'external_terminal' : null,
"""
        repl3 = """              payment_method: state.payment.method,
              pos_device_code: localPosIdentity && localPosIdentity.device_code ? String(localPosIdentity.device_code) : null,
              provider_code: state.payment.method === 'external_terminal' ? 'external_terminal' : null,
"""
        s = replace_once(s, anchor3, repl3, 'payment identity payload')
        anchor4 = """          toast(json.message || 'Payment recorded');
          showSuccess(json.message || 'Payment recorded.');
"""
        repl4 = """          toast(json.message || 'Payment recorded');
          if (json.cash_drawer && json.cash_drawer.ok === false && !json.cash_drawer.skipped) {
            toast(json.cash_drawer.message || 'Payment recorded, but the cash drawer did not open.', true);
          }
          showSuccess(json.message || 'Payment recorded.');
"""
        s = replace_once(s, anchor4, repl4, 'payment drawer result')
    write(p, s)


def patch_tenant_baseline():
    rel = 'app/Services/PmdTenantProductBaselineR1.php'
    p, s = read(rel)
    if 'PMD_CASH_DRAWER_FOUNDATION_R1' not in s:
        anchor = """        if (in_array('pos', $scopes, true)) {
            $this->step($report, 'cash_drawers', fn () => $this->ensureCashDrawers());
"""
        replacement = """        if (in_array('pos', $scopes, true)) {
            // PMD_CASH_DRAWER_FOUNDATION_R1
            $this->step($report, 'cash_drawer_local_agent_foundation', fn () => (new PmdCashDrawerFoundationR1())->repairCurrentTenant(false));
            $this->step($report, 'cash_drawers', fn () => $this->ensureCashDrawers());
"""
        s = replace_once(s, anchor, replacement, 'tenant baseline cash drawer foundation')
    write(p, s)


def patch_drawer_form():
    rel = 'app/admin/views/pmddevices/_inline_modal_form.blade.php'
    p, s = read(rel)
    start = "    @elseif($kind === 'drawers')\n"
    end = "    @elseif($kind === 'biometric')\n"
    if 'PMD_CASH_DRAWER_SIMPLE_SETUP_R2' not in s:
        a = s.find(start)
        b = s.find(end, a + len(start)) if a >= 0 else -1
        if a < 0 or b < 0:
            raise SystemExit('drawer form branch anchors missing')
        block = r'''    @elseif($kind === 'drawers')
        {{-- PMD_CASH_DRAWER_SIMPLE_SETUP_R2 --}}
        @php
            $drawerConfig = (array)$v('connection_config', []);
            $savedPrinter = trim((string)($drawerConfig['windows_printer_name'] ?? $v('device_path', '')));
            $setupState = trim((string)$v('setup_state', '')) ?: 'not_connected';
            $setupMessage = trim((string)$v('setup_message', ''));
        @endphp

        <section class="pmd-device-v6-section" data-pmd-simple-drawer-setup>
            <div class="pmd-device-v6-section__head">
                <h3>Cash drawer & receipt printer</h3>
                <p>For the normal cable setup, PayMyDine configures the technical details automatically.</p>
            </div>
            <div class="pmd-owner-form-grid">
                <div class="pmd-owner-field pmd-owner-field--full">
                    <label>Drawer name</label>
                    <input type="text" name="{{ $arr }}[name]" value="{{ $v('name','Main Cash Drawer') }}" required>
                </div>
            </div>
            <div class="pmd-owner-setting-row">
                <div class="pmd-owner-setting-copy"><strong>Enabled</strong><small>Keep this on for the cashier workstation.</small></div>
                <label class="pmd-owner-switch"><input type="hidden" name="{{ $arr }}[status]" value="0"><input type="checkbox" name="{{ $arr }}[status]" value="1" {{ $v('status',1) ? 'checked' : '' }}><span></span></label>
            </div>
            <div class="pmd-owner-setting-row">
                <div class="pmd-owner-setting-copy"><strong>Open automatically for cash</strong><small>Cash payments open the drawer. Card and terminal payments do not.</small></div>
                <label class="pmd-owner-switch"><input type="hidden" name="{{ $arr }}[auto_open_on_cash]" value="0"><input type="checkbox" name="{{ $arr }}[auto_open_on_cash]" value="1" {{ $v('auto_open_on_cash',1) ? 'checked' : '' }}><span></span></label>
            </div>
            <input type="hidden" name="{{ $arr }}[test_on_save]" value="0">
        </section>

        @if($mode === 'edit')
        <section class="pmd-device-v6-section" data-pmd-drawer-quick-setup data-saved-printer="{{ e($savedPrinter) }}">
            <div class="pmd-device-v6-section__head">
                <h3>Connect this POS</h3>
                <p>Three quick steps. No USB IDs, COM ports or ESC/POS settings are needed for the standard printer cable setup.</p>
            </div>

            <div class="pmd-owner-setting-row" data-pmd-local-status-row>
                <div class="pmd-owner-setting-copy">
                    <strong>Connector status</strong>
                    <small data-pmd-local-status data-state="{{ $setupState }}">{{ $setupMessage ?: 'Checking this computer...' }}</small>
                </div>
            </div>

            <div class="pmd-device-v6-section">
                <div class="pmd-device-v6-section__head"><h3>1. Install connector</h3><p>Run this once on the Windows PC connected to the receipt printer.</p></div>
                <div class="pmd-device-v6-tools">
                    <a class="pmd-owner-action pmd-device-v6-primary" data-pmd-connector-download href="{{ admin_url('cash_drawers/windows_connector/'.$recordId) }}">Download & install connector</a>
                    <button type="button" class="pmd-owner-action" data-pmd-local-check>Check connection</button>
                </div>
            </div>

            <div class="pmd-device-v6-section">
                <div class="pmd-device-v6-section__head"><h3>2. Choose receipt printer</h3><p>PayMyDine reads the printers installed on this Windows PC.</p></div>
                <div class="pmd-owner-form-grid">
                    <div class="pmd-owner-field pmd-owner-field--full">
                        <label>Receipt printer</label>
                        <select data-pmd-local-printer-select>
                            <option value="">Click Find printers</option>
                            @if($savedPrinter)<option value="{{ e($savedPrinter) }}" selected>{{ $savedPrinter }}</option>@endif
                        </select>
                        <small>Usually Epson, Star, Bixolon, XPrinter or another thermal receipt printer.</small>
                    </div>
                </div>
                <input type="hidden" name="local_printer_name" value="{{ e($savedPrinter) }}" data-pmd-local-printer-name>
                <input type="hidden" name="local_printer_target" value="{{ e($savedPrinter) }}" data-pmd-local-printer-target>
                <div class="pmd-device-v6-tools">
                    <button type="button" class="pmd-owner-action" data-pmd-local-printers>Find printers</button>
                    <button type="button" class="pmd-owner-action pmd-device-v6-primary" data-pmd-device-action="onApplyLocalPrinter">Use this printer</button>
                    <button type="button" class="pmd-owner-action" data-pmd-device-action="onTestPrintLocal">Test print</button>
                </div>
            </div>

            <div class="pmd-device-v6-section">
                <div class="pmd-device-v6-section__head"><h3>3. Test cash drawer</h3><p>The drawer cable should be plugged into the drawer port on the receipt printer.</p></div>
                <div class="pmd-device-v6-tools">
                    <button type="button" class="pmd-owner-action pmd-device-v6-primary" data-pmd-device-action="onTestConnection">Test cash drawer</button>
                    <button type="button" class="pmd-owner-action" data-pmd-device-action="onOpenDrawer">Open drawer</button>
                </div>
            </div>
            <pre class="pmd-device-v6-result" data-pmd-device-result hidden></pre>
        </section>
        @else
        <section class="pmd-device-v6-section">
            <div class="pmd-device-v6-section__head"><h3>Next step</h3><p>Save this drawer once. Then reopen it and use Connect this POS to install the connector, find the printer and test the drawer.</p></div>
        </section>
        @endif

        <details class="pmd-device-v6-section" data-pmd-drawer-advanced>
            <summary><strong>Advanced hardware settings</strong> <span>Only for non-standard USB, serial or network setups</span></summary>
            <div class="pmd-device-v6-section__head"><p>Leave these defaults unchanged for a cash drawer connected to the receipt printer by cable.</p></div>
            <div class="pmd-owner-form-grid">
                <div class="pmd-owner-field"><label>Connection type</label><select name="{{ $arr }}[connection_type]">@foreach(($opts['connection_types'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)$v('connection_type','rj11_printer') === (string)$value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
                <div class="pmd-owner-field"><label>Device path / printer name</label><input type="text" name="{{ $arr }}[device_path]" value="{{ $v('device_path') }}"></div>
                <div class="pmd-owner-field"><label>ESC/POS drawer command</label><input type="text" name="{{ $arr }}[esc_pos_command]" value="{{ $v('esc_pos_command','27,112,0,60,120') }}"></div>
                <div class="pmd-owner-field"><label>Voltage</label><select name="{{ $arr }}[voltage]">@foreach(($opts['voltages'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)$v('voltage','12V') === (string)$value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
                <div class="pmd-owner-field"><label>IP address</label><input type="text" name="{{ $arr }}[network_ip]" value="{{ $v('network_ip') }}"></div>
                <div class="pmd-owner-field"><label>Network port</label><input type="number" name="{{ $arr }}[network_port]" value="{{ $v('network_port',9100) }}"></div>
                <div class="pmd-owner-field"><label>Serial port</label><input type="text" name="{{ $arr }}[serial_port]" value="{{ $v('serial_port') }}"></div>
                <div class="pmd-owner-field"><label>Baud rate</label><input type="number" name="{{ $arr }}[serial_baud_rate]" value="{{ $v('serial_baud_rate',9600) }}"></div>
                <div class="pmd-owner-field"><label>USB vendor ID</label><input type="text" name="{{ $arr }}[usb_vendor_id]" value="{{ $v('usb_vendor_id') }}"></div>
                <div class="pmd-owner-field"><label>USB product ID</label><input type="text" name="{{ $arr }}[usb_product_id]" value="{{ $v('usb_product_id') }}"></div>
                <div class="pmd-owner-field"><label>Legacy POS mapping</label><select name="{{ $arr }}[pos_device_id]"><option value="">None</option>@foreach(($opts['pos_devices'] ?? []) as $value=>$label)<option value="{{ $value }}" {{ (string)$v('pos_device_id') === (string)$value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
            </div>
        </details>

'''
        s = s[:a] + block + s[b:]
    write(p, s)


def patch_device_js():
    rel = 'app/admin/assets/js/pmd-device-inline-v6.js'
    p, s = read(rel)
    if 'PMD_CASH_DRAWER_SIMPLE_SETUP_R2' not in s:
        anchor = "  function templateFor(key) {\n"
        helper = r'''  /* PMD_CASH_DRAWER_SIMPLE_SETUP_R2
     The browser talks only to the loopback connector for discovery/status.
     Drawer actions still go through authenticated PayMyDine backend commands. */
  function drawerSetupForm(form) {
    return form && form.getAttribute('data-pmd-device-kind') === 'drawers'
      ? form.querySelector('[data-pmd-drawer-quick-setup]')
      : null;
  }

  function drawerLocalStatus(form, text, state) {
    var setup = drawerSetupForm(form);
    var node = setup && setup.querySelector('[data-pmd-local-status]');
    if (!node) return;
    node.textContent = text || '';
    node.setAttribute('data-state', state || 'unknown');
  }

  async function localConnectorGet(path, timeoutMs) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 1800) : null;
    try {
      var response = await fetch('http://127.0.0.1:17877' + path + (path.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now(), {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors',
        signal: controller ? controller.signal : undefined,
        headers: {'Accept': 'application/json'}
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || !data || data.ok === false) {
        throw new Error((data && data.message) || ('Connector HTTP ' + response.status));
      }
      return data;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function syncDrawerPrinterInputs(form) {
    var setup = drawerSetupForm(form);
    if (!setup) return;
    var select = setup.querySelector('[data-pmd-local-printer-select]');
    var nameInput = setup.querySelector('[data-pmd-local-printer-name]');
    var targetInput = setup.querySelector('[data-pmd-local-printer-target]');
    var value = select ? String(select.value || '').trim() : '';
    if (nameInput) nameInput.value = value;
    if (targetInput) targetInput.value = value;
  }

  async function checkDrawerConnector(form, quiet) {
    try {
      var health = await localConnectorGet('/health', 1600);
      if (health.paired) {
        drawerLocalStatus(form, 'Connected on this PC' + (health.display_name ? ' - ' + health.display_name : '') + '.', 'online');
      } else {
        drawerLocalStatus(form, 'Connector is running but not paired. Download the connector again.', 'warning');
      }
      return health;
    } catch (error) {
      drawerLocalStatus(form, 'Not connected on this PC. Download and run the PayMyDine connector once.', 'offline');
      if (!quiet) setStatus('Connector not detected on this PC.', 'error');
      return null;
    }
  }

  async function loadDrawerPrinters(form) {
    var setup = drawerSetupForm(form);
    var select = setup && setup.querySelector('[data-pmd-local-printer-select]');
    if (!select) return;
    setStatus('Finding printers...');
    var data;
    try {
      data = await localConnectorGet('/printers', 5000);
    } catch (error) {
      drawerLocalStatus(form, 'Connector is not available. Install it first, then try again.', 'offline');
      setStatus(error && error.message ? error.message : 'Could not read printers.', 'error');
      return;
    }

    var saved = String(setup.getAttribute('data-saved-printer') || '').trim();
    var printers = Array.isArray(data.printers) ? data.printers.filter(function (printer) {
      return printer && printer.name && !printer.offline;
    }) : [];
    select.replaceChildren();
    if (!printers.length) {
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'No available Windows printers found';
      select.appendChild(empty);
      syncDrawerPrinterInputs(form);
      setStatus('No available printer was found.', 'error');
      return;
    }

    printers.forEach(function (printer) {
      var option = document.createElement('option');
      option.value = String(printer.name);
      option.textContent = String(printer.name) + (printer.default ? ' (Default)' : '') + (printer.port ? ' - ' + printer.port : '');
      select.appendChild(option);
    });

    var preferred = printers.find(function (printer) { return saved && String(printer.name) === saved; })
      || printers.find(function (printer) { return printer.default; })
      || printers[0];
    select.value = preferred ? String(preferred.name) : '';
    syncDrawerPrinterInputs(form);
    drawerLocalStatus(form, 'Connected. Printer list loaded from this PC.', 'online');
    setStatus('Printers found. Choose the receipt printer, then click Use this printer.', 'ok');
  }

  function initDrawerSimpleSetup(form) {
    var setup = drawerSetupForm(form);
    if (!setup) return;
    syncDrawerPrinterInputs(form);
    setTimeout(function () { checkDrawerConnector(form, true); }, 50);
  }

'''
        s = replace_once(s, anchor, helper + anchor, 'device simple setup helper')

        anchor2 = """    setStatus('');
    setBusy(false);

    modal.hidden = false;
"""
        repl2 = """    setStatus('');
    setBusy(false);
    initDrawerSimpleSetup(form);

    modal.hidden = false;
"""
        s = replace_once(s, anchor2, repl2, 'device drawer init')

        anchor3 = """  document.addEventListener('click', function (event) {
    var opener = event.target.closest('[data-pmd-device-open]');
"""
        repl3 = """  document.addEventListener('click', function (event) {
    var localCheck = event.target.closest('[data-pmd-local-check]');
    if (localCheck && modal.contains(localCheck)) {
      event.preventDefault();
      checkDrawerConnector(currentForm(), false);
      return;
    }

    var localPrinters = event.target.closest('[data-pmd-local-printers]');
    if (localPrinters && modal.contains(localPrinters)) {
      event.preventDefault();
      loadDrawerPrinters(currentForm());
      return;
    }

    var connectorDownload = event.target.closest('[data-pmd-connector-download]');
    if (connectorDownload && modal.contains(connectorDownload)) {
      drawerLocalStatus(currentForm(), 'Download started. Run the file on this PC, then click Check connection.', 'installing');
    }

    var opener = event.target.closest('[data-pmd-device-open]');
"""
        s = replace_once(s, anchor3, repl3, 'device local action clicks')

        anchor4 = """  if (saveButton) {
"""
        change = """  modal.addEventListener('change', function (event) {
    if (event.target && event.target.matches('[data-pmd-local-printer-select]')) {
      syncDrawerPrinterInputs(currentForm());
    }
  });

  if (saveButton) {
"""
        s = replace_once(s, anchor4, change, 'device printer select sync')

        anchor5 = """      showResult(data.raw && Object.keys(data).length === 1 ? data.raw : data);
      setStatus('Done', 'ok');
"""
        repl5 = """      showResult(data.raw && Object.keys(data).length === 1 ? data.raw : data);
      if (kind === 'drawers' && handler === 'onApplyLocalPrinter') {
        drawerLocalStatus(form, 'Printer saved for this POS.', 'online');
        setStatus('Printer saved.', 'ok');
      } else if (kind === 'drawers' && handler === 'onTestPrintLocal') {
        setStatus('Test print sent.', 'ok');
      } else if (kind === 'drawers' && (handler === 'onTestConnection' || handler === 'onOpenDrawer')) {
        setStatus('Drawer test sent.', 'ok');
      } else {
        setStatus('Done', 'ok');
      }
"""
        s = replace_once(s, anchor5, repl5, 'device action status')

        s = s.replace("version: '6.0.0'", "version: '6.1.0-r2'", 1)
    write(p, s)


def main():
    patch_routes()
    patch_cashdrawers()
    patch_settlement()
    patch_payment_js()
    patch_tenant_baseline()
    patch_drawer_form()
    patch_device_js()
    print('PMD_CASH_DRAWER_R2_PATCH_OK')


if __name__ == '__main__':
    main()
