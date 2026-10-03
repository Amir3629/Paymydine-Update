#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess
import sys

MARK = "PMD_VR_PAYMENT_SAFETY_R6_20260905"

SERVICE_REL = "app/Services/TerminalPayments/TerminalPaymentService.php"
CLIENT_REL = "app/Services/Payments/VrPaymentApiClient.php"
JS_REL = "app/admin/assets/js/pmd-waiter-pos-payment-v3.js"
FINANCE_REL = "app/admin/views/pmdfinance/_inline_provider_form_v1.blade.php"


def fail(msg: str) -> None:
    print(f"\nERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly one anchor, found {count}. Live code differs from the audited R5/R4B state.")
    return text.replace(old, new, 1)


def lint_php(path: Path) -> None:
    p = subprocess.run(["php", "-l", str(path)], text=True, capture_output=True)
    out = (p.stdout or p.stderr).strip()
    if out:
        print(out)
    if p.returncode != 0:
        raise RuntimeError(f"PHP lint failed: {path}")


def patch_service(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print("SKIP already patched:", path)
        return

    old = """        $attempt=(array)DB::table('payment_attempts')->where('id',$id)->first();$result=$provider->createPayment($attempt,$config);$status=($result['ok']??false)?($result['status']??'sent_to_terminal'):'failed';
"""
    new = f"""        $attempt=(array)DB::table('payment_attempts')->where('id',$id)->first();
        $result=$provider->createPayment($attempt,$config);

        // {MARK}
        // PMD's local VR simulators are diagnostics only. They MUST NEVER settle
        // an order or generate a paid invoice/receipt.
        $isPmdVrSimulator=$this->isPmdVrSimulatorAttempt($attempt);
        $rawStatus=(string)($result['status']??(($result['ok']??false)?'sent_to_terminal':'failed'));
        $status=$isPmdVrSimulator
            ? $this->mapPmdVrSimulatorStatus($rawStatus)
            : (($result['ok']??false)?$rawStatus:'failed');
"""
    text = replace_once(text, old, new, "createAttempt simulator status guard")

    old = """        DB::table('payment_attempts')->where('id',$id)->update($this->filterColumns('payment_attempts',['status'=>$status,'provider_reference'=>$result['provider_reference']??null,'response_payload'=>json_encode($this->redact($result)),'error_message'=>($result['ok']??false)?null:($result['message']??'Terminal payment failed.'),'updated_at'=>now()]));
"""
    new = """        DB::table('payment_attempts')->where('id',$id)->update($this->filterColumns('payment_attempts',[
            'status'=>$status,
            'provider_reference'=>$result['provider_reference']??null,
            'response_payload'=>json_encode($this->redact($result)),
            'error_message'=>$isPmdVrSimulator?null:(($result['ok']??false)?null:($result['message']??'Terminal payment failed.')),
            'updated_at'=>now(),
        ]));
"""
    text = replace_once(text, old, new, "createAttempt attempt update")

    old = """        if($status==='paid')$this->settleSuccessfulAttempt($id,$result);
        return ['success'=>(bool)($result['ok']??false),'attempt_id'=>$id,'status'=>$status,'message'=>$result['message']??null];
"""
    new = """        if(!$isPmdVrSimulator&&$status==='paid')$this->settleSuccessfulAttempt($id,$result);
        return [
            'success'=>$isPmdVrSimulator?true:(bool)($result['ok']??false),
            'attempt_id'=>$id,
            'status'=>$status,
            'message'=>$isPmdVrSimulator
                ? 'TEST ONLY — '.(string)($result['message']??'VR simulator scenario completed.').' No payment was recorded and the order remains unpaid.'
                : ($result['message']??null),
            'simulated'=>$isPmdVrSimulator,
            'payment_recorded'=>$isPmdVrSimulator?false:($status==='paid'),
            'simulator_scenario'=>$isPmdVrSimulator?($result['simulator_scenario']??null):null,
        ];
"""
    text = replace_once(text, old, new, "createAttempt settlement block")

    old = """        $attempt=(array)(DB::table('payment_attempts')->where('id',$attemptId)->first()?:[]);if(!$attempt)return ['success'=>false,'error'=>'Payment attempt not found.'];
        if(($attempt['status']??'')==='paid'){ $this->settleSuccessfulAttempt($attemptId,[]); return ['success'=>true,'attempt_id'=>$attemptId,'status'=>'paid','message'=>'Payment already confirmed.']; }
"""
    new = f"""        $attempt=(array)(DB::table('payment_attempts')->where('id',$attemptId)->first()?:[]);if(!$attempt)return ['success'=>false,'error'=>'Payment attempt not found.'];

        // {MARK}
        // Migration guard for simulator attempts created before R6.
        if($this->isPmdVrSimulatorAttempt($attempt)&&strtolower((string)($attempt['status']??''))==='paid'){{
            DB::table('payment_attempts')->where('id',$attemptId)->update($this->filterColumns('payment_attempts',[
                'status'=>'simulated_approved',
                'error_message'=>null,
                'updated_at'=>now(),
            ]));
            return [
                'success'=>true,
                'attempt_id'=>$attemptId,
                'status'=>'simulated_approved',
                'message'=>'TEST ONLY — simulator approval detected. No new settlement is allowed by R6.',
                'simulated'=>true,
                'payment_recorded'=>false,
            ];
        }}
        if(($attempt['status']??'')==='paid'){{ $this->settleSuccessfulAttempt($attemptId,[]); return ['success'=>true,'attempt_id'=>$attemptId,'status'=>'paid','message'=>'Payment already confirmed.','simulated'=>false,'payment_recorded'=>true]; }}
"""
    text = replace_once(text, old, new, "refreshAttempt legacy paid guard")

    old = """        $result=$provider->checkStatus($attempt,$config);$status=(string)($result['status']??($attempt['status']??'pending'));
"""
    new = """        $result=$provider->checkStatus($attempt,$config);
        $isPmdVrSimulator=$this->isPmdVrSimulatorAttempt($attempt);
        $rawStatus=(string)($result['status']??($attempt['status']??'pending'));
        $status=$isPmdVrSimulator?$this->mapPmdVrSimulatorStatus($rawStatus):$rawStatus;
"""
    text = replace_once(text, old, new, "refreshAttempt simulator status guard")

    old = """        if($status==='paid')$this->settleSuccessfulAttempt($attemptId,$result);
        return ['success'=>(bool)($result['ok']??false),'attempt_id'=>$attemptId,'status'=>$status,'message'=>$result['message']??null];
"""
    new = """        if(!$isPmdVrSimulator&&$status==='paid')$this->settleSuccessfulAttempt($attemptId,$result);
        return [
            'success'=>$isPmdVrSimulator?true:(bool)($result['ok']??false),
            'attempt_id'=>$attemptId,
            'status'=>$status,
            'message'=>$isPmdVrSimulator
                ? 'TEST ONLY — '.(string)($result['message']??'VR simulator scenario updated.').' No payment was recorded and the order remains unpaid.'
                : ($result['message']??null),
            'simulated'=>$isPmdVrSimulator,
            'payment_recorded'=>$isPmdVrSimulator?false:($status==='paid'),
            'simulator_scenario'=>$isPmdVrSimulator?($result['simulator_scenario']??null):null,
        ];
"""
    text = replace_once(text, old, new, "refreshAttempt settlement block")

    anchor = """    private function resolveSquareTerminal(?string $terminalId=null)
"""
    helper = f"""    // {MARK}
    private function isPmdVrSimulatorAttempt(array $attempt):bool
    {{
        if(strtolower(trim((string)($attempt['provider_code']??'')))!=='vr_payment')return false;
        $terminalId=strtoupper(trim((string)($attempt['terminal_id']??'')));
        return str_starts_with($terminalId,'PMD-VR-SIM-');
    }}

    private function mapPmdVrSimulatorStatus(string $status):string
    {{
        return match(strtolower(trim($status))){{
            'paid','authorized','completed','fulfilled','fulfill'=>'simulated_approved',
            'failed','declined','decline'=>'simulated_declined',
            'cancelled','canceled','voided'=>'simulated_cancelled',
            'simulated_approved','simulated_declined','simulated_cancelled','simulated_pending'=>strtolower(trim($status)),
            default=>'simulated_pending',
        }};
    }}

"""
    text = replace_once(text, anchor, helper + anchor, "simulator helper insertion")

    old = """    private function settleSuccessfulAttempt(int $attemptId,array $providerResult):void
    {
        DB::transaction(function()use($attemptId,$providerResult){
"""
    new = f"""    private function settleSuccessfulAttempt(int $attemptId,array $providerResult):void
    {{
        // {MARK}
        // Defense in depth: even if a caller accidentally passes status=paid for a
        // PMD VR simulator, settlement is blocked here before touching the order.
        $preview=(array)(DB::table('payment_attempts')->where('id',$attemptId)->first()?:[]);
        if($preview&&$this->isPmdVrSimulatorAttempt($preview)){{
            DB::table('payment_attempts')->where('id',$attemptId)->update($this->filterColumns('payment_attempts',[
                'status'=>'simulated_approved',
                'error_message'=>null,
                'updated_at'=>now(),
            ]));
            Log::warning('PMD_VR_SIMULATOR_SETTLEMENT_BLOCKED_R6',[
                'attempt_id'=>$attemptId,
                'order_id'=>(int)($preview['order_id']??0),
                'terminal_id'=>(string)($preview['terminal_id']??''),
            ]);
            return;
        }}

        DB::transaction(function()use($attemptId,$providerResult){{
"""
    text = replace_once(text, old, new, "settlement hard guard")

    path.write_text(text, encoding="utf-8")


def patch_client(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print("SKIP already patched:", path)
        return

    old = """        return match ($state) {
            'AUTHORIZED', 'FULFILL', 'FULFILLED', 'COMPLETED' => 'paid',
            'FAILED', 'DECLINE', 'DECLINED' => 'failed',
            'VOIDED', 'CANCELLED', 'CANCELED' => 'cancelled',
            'PENDING', 'CONFIRMED', 'PROCESSING' => 'sent_to_terminal',
            default => 'pending',
        };
"""
    new = f"""        // {MARK}
        // Fail closed. VR documents FULFILL / DECLINE as the final merchant
        // decision states. AUTHORIZED and COMPLETED are not treated as settled.
        return match ($state) {{
            'FULFILL', 'FULFILLED' => 'paid',
            'FAILED', 'DECLINE', 'DECLINED' => 'failed',
            'VOIDED', 'CANCELLED', 'CANCELED' => 'cancelled',
            'PENDING', 'CONFIRMED', 'PROCESSING', 'AUTHORIZED', 'COMPLETED' => 'sent_to_terminal',
            default => 'pending',
        }};
"""
    text = replace_once(text, old, new, "VR final-state mapping")
    path.write_text(text, encoding="utf-8")


def patch_js(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print("SKIP already patched:", path)
        return

    anchor = """      // PMD_SQUARE_TERMINAL_CANADA_R10_READINESS
      function terminalIsOnline(row) {
"""
    helper = f"""      // {MARK}
      function terminalIsPmdVrSimulator(row) {{
        if (!row) return false;
        return String(row.provider_code || '').toLowerCase() === 'vr_payment'
          && String(row.reader_id || '').toUpperCase().indexOf('PMD-VR-SIM-') === 0;
      }}

      // PMD_SQUARE_TERMINAL_CANADA_R10_READINESS
      function terminalIsOnline(row) {{
"""
    text = replace_once(text, anchor, helper, "frontend simulator helper")

    old = """      async function executeTerminalPayment() {
        var chosen = selectedTerminal();
        if (!state.payment.providerCode || !state.payment.terminalDeviceId || !chosen) return toast('Choose an online terminal.', true);

        state.payment.submitting = true;
"""
    new = f"""      async function executeTerminalPayment() {{
        var chosen = selectedTerminal();
        if (!state.payment.providerCode || !state.payment.terminalDeviceId || !chosen) return toast('Choose an online terminal.', true);

        // {MARK}
        if (terminalIsPmdVrSimulator(chosen)) {{
          var proceed = window.confirm(
            'TEST ONLY — PMD VR Simulator\\n\\n'
            + 'This does NOT charge the customer, does NOT send a payment to VR Payment, '
            + 'and will NOT mark the order/invoice as paid.\\n\\nContinue with the simulation?'
          );
          if (!proceed) return;
        }}

        state.payment.submitting = true;
"""
    text = replace_once(text, old, new, "frontend simulator confirmation")

    old = """      async function finishTerminalStatus(result, silent) {
        var status = String(result && result.status ? result.status : '').toLowerCase();
        if (status === 'paid') {
"""
    new = f"""      async function finishTerminalStatus(result, silent) {{
        var status = String(result && result.status ? result.status : '').toLowerCase();

        // {MARK}
        if (status.indexOf('simulated_') === 0) {{
          await loadPaymentSummary(true);
          var scenario = String(result && result.simulator_scenario ? result.simulator_scenario : '').toLowerCase();

          if (status === 'simulated_pending' && scenario === 'delayed_success') {{
            if (!silent) toast('TEST ONLY — simulated payment is still pending. No payment has been recorded.');
            return false;
          }}

          var simulationMessage =
            status === 'simulated_approved'
              ? 'TEST ONLY — approval scenario passed. NO payment was recorded; the order remains unpaid.'
              : status === 'simulated_declined'
                ? 'TEST ONLY — decline scenario passed. NO payment was recorded; the order remains unpaid.'
                : status === 'simulated_cancelled'
                  ? 'TEST ONLY — cancel scenario passed. NO payment was recorded; the order remains unpaid.'
                  : 'TEST ONLY — timeout/pending scenario passed. NO payment was recorded; the order remains unpaid.';

          toast(simulationMessage, status !== 'simulated_approved');
          return true;
        }}

        if (status === 'paid') {{
"""
    text = replace_once(text, old, new, "frontend simulator status handling")

    path.write_text(text, encoding="utf-8")


def patch_finance_warning(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARK in text:
        print("SKIP already patched:", path)
        return

    anchor = """                <strong>VR Terminal management</strong><br>
"""
    if anchor not in text:
        print("WARN: Finance R5 terminal management block not found; skipping Finance warning text.")
        return

    replacement = f"""                <strong>VR Terminal management</strong><br>
                {{-- {MARK} --}}
                <div style="margin:8px 0 10px;padding:9px 11px;border:1px solid #f0c7c7;border-radius:9px;background:#fff6f6;color:#8b1d1d">
                    <strong>Safety:</strong> PMD VR Simulators are diagnostics only. They never charge, never settle the order, and never create a paid invoice. Only a final VR provider transaction may settle a real order.
                </div>
"""
    text = replace_once(text, anchor, replacement, "Finance simulator warning")
    path.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Safety-fix PMD VR simulator settlement and fail-closed VR final-state mapping."
    )
    parser.add_argument("--root", default="/var/www/paymydine")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    service = root / SERVICE_REL
    client = root / CLIENT_REL
    js = root / JS_REL
    finance = root / FINANCE_REL

    for p in [service, client, js]:
        if not p.is_file():
            fail(f"Missing required file: {p}")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_root = root / "storage" / "pmd-vr-terminal-simulator-r1" / f"safety-r6-{stamp}"
    backup_root.mkdir(parents=True, exist_ok=True)

    targets = [service, client, js]
    if finance.is_file():
        targets.append(finance)

    for src in targets:
        rel = src.relative_to(root)
        dst = backup_root / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)

    print("Backup directory:", backup_root)

    try:
        patch_service(service)
        patch_client(client)
        patch_js(js)
        if finance.is_file():
            patch_finance_warning(finance)

        lint_php(service)
        lint_php(client)

        node = shutil.which("node")
        if node:
            p = subprocess.run([node, "--check", str(js)], text=True, capture_output=True)
            if p.stdout.strip():
                print(p.stdout.strip())
            if p.stderr.strip():
                print(p.stderr.strip())
            if p.returncode != 0:
                raise RuntimeError("JavaScript syntax check failed.")
        else:
            print("Node not installed; skipped node --check.")

        print("\nSUCCESS")
        print("Patch marker:", MARK)
        print("Backup:", backup_root)
        print("\nSafety behavior now:")
        print("  - PMD VR Simulator can NEVER settle an order.")
        print("  - PMD VR Simulator can NEVER create a paid invoice/receipt.")
        print("  - Real VR payments settle only after final FULFILL/FULFILLED.")
        print("  - AUTHORIZED/COMPLETED remain processing, not paid.")
        print("  - Cashier shows an explicit TEST ONLY confirmation for PMD simulators.")
        print("\nNext:")
        print("  sudo systemctl reload php8.3-fpm")
        print("  Then hard-refresh Cashier/Waiter.")

    except Exception as exc:
        print(f"\nPATCH FAILED: {exc}", file=sys.stderr)
        print("Restoring backups...", file=sys.stderr)
        for src in targets:
            rel = src.relative_to(root)
            bak = backup_root / rel
            if bak.is_file():
                shutil.copy2(bak, src)
        raise


if __name__ == "__main__":
    main()
