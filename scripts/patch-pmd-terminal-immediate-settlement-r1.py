#!/usr/bin/env python3
from pathlib import Path
import sys

MARKER = "PMD_TERMINAL_IMMEDIATE_SETTLEMENT_R1"

if len(sys.argv) != 2:
    raise SystemExit("usage: patch-pmd-terminal-immediate-settlement-r1.py <TerminalPaymentService.php>")
path = Path(sys.argv[1]).resolve()
text = path.read_text(encoding="utf-8")
if MARKER in text:
    print("ALREADY_PATCHED")
    raise SystemExit(0)

old = "        Log::info(($result['ok']??false)?'PMD_TERMINAL_PAYMENT_SENT':'PMD_TERMINAL_PAYMENT_FAILED',['attempt_id'=>$id,'provider_code'=>$providerCode,'status'=>$status]);\n        return ['success'=>(bool)($result['ok']??false),'attempt_id'=>$id,'status'=>$status,'message'=>$result['message']??null];"
new = "        Log::info(($result['ok']??false)?'PMD_TERMINAL_PAYMENT_SENT':'PMD_TERMINAL_PAYMENT_FAILED',['attempt_id'=>$id,'provider_code'=>$providerCode,'status'=>$status]);\n        // PMD_TERMINAL_IMMEDIATE_SETTLEMENT_R1\n        if($status==='paid')$this->settleSuccessfulAttempt($id,$result);\n        return ['success'=>(bool)($result['ok']??false),'attempt_id'=>$id,'status'=>$status,'message'=>$result['message']??null];"
if old not in text:
    raise SystemExit("ERROR: createAttempt return anchor not found")
text = text.replace(old, new, 1)

old2 = "        if(($attempt['status']??'')==='paid')return ['success'=>true,'attempt_id'=>$attemptId,'status'=>'paid','message'=>'Payment already confirmed.'];"
new2 = "        if(($attempt['status']??'')==='paid'){ $this->settleSuccessfulAttempt($attemptId,[]); return ['success'=>true,'attempt_id'=>$attemptId,'status'=>'paid','message'=>'Payment already confirmed.']; }"
if old2 not in text:
    raise SystemExit("ERROR: refresh paid anchor not found")
text = text.replace(old2, new2, 1)
path.write_text(text, encoding="utf-8")
print("PMD_TERMINAL_IMMEDIATE_SETTLEMENT_R1=OK")
