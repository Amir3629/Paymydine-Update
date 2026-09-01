# PMD Intelligence V1

PMD Intelligence is a read-only owner operations copilot for PayMyDine.

## Runtime contract

- Server-side OpenAI Responses API only.
- The browser never receives `OPENAI_API_KEY`.
- Tenant, database, authenticated user and canonical location are resolved by PMD server runtime and are never model-controlled tool arguments.
- No generic SQL tool exists.
- V1 tools are read-only wrappers around existing PMD authorities:
  - Dashboard2 owner KPIs
  - Pmdreports report payloads
  - PmdKitchenWorkforceService
- V1 cannot create/void/refund/settle orders, capture payments, mark paid, change VAT/tax/fiscal data, edit menus, change reservations, change attendance/rosters, or reset MFA.
- Tool output is minimized/redacted before provider submission.
- AI runs are audit logged by run ID with provider/model/tool trace/latency/usage metadata. Secrets and raw questions are not persisted by the AI audit logger.
- Provider response storage is disabled by default (`store=false`).
- Tenant daily and user-minute request budgets are enforced through Laravel Cache.

## Configuration

Configure only on the server. Never paste API keys into tickets, chat, Git, browser JavaScript, templates or logs.

```dotenv
PMD_AI_ENABLED=false
PMD_AI_PROVIDER=openai
PMD_AI_MODEL=gpt-5.6-luna
OPENAI_API_KEY=<set-locally-on-server>
PMD_AI_TIMEOUT_SECONDS=25
PMD_AI_MAX_OUTPUT_TOKENS=1400
PMD_AI_MAX_TOOL_CALLS=6
PMD_AI_DAILY_REQUEST_BUDGET=250
```

The feature is intentionally fail-closed while `PMD_AI_ENABLED=false`.

## VPS validation sequence

Do not pull/reset production blindly. First prove which commit and files are actually live.

```bash
cd /var/www/paymydine
printf 'HEAD: '; git rev-parse HEAD
printf 'BRANCH: '; git branch --show-current
git status --short
php -v
php -m | grep -i '^curl$' || true
```

Check only whether the secret is present; never print its value:

```bash
php -r 'require "vendor/autoload.php"; $app=require "bootstrap/app.php"; $k=$app->make(Illuminate\Contracts\Console\Kernel::class); $k->bootstrap(); echo trim((string)config("pmd_ai.openai_api_key", ""))!=="" ? "OPENAI_API_KEY=PRESENT\n" : "OPENAI_API_KEY=MISSING\n";'
```

After setting the key locally on the VPS, clear stale config cache if the deployment uses cached config:

```bash
php artisan config:clear
```

Run the direct provider smoke test before enabling the product UI:

```bash
php scripts/pmd-ai-openai-smoke.php
```

Expected final line:

```text
RESULT: PASS
```

Then enable PMD Intelligence server-side:

```dotenv
PMD_AI_ENABLED=true
```

Clear config cache again and test as an authenticated owner with a canonical location selected:

```text
/admin/pmdintelligence
```

Suggested canary prompts:

- What should I focus on tonight?
- Summarize today's sales performance and call out the biggest operational risk.
- Check live orders and kitchen workforce. Is there anything the owner should act on now?
- Review today's reservations and tell me what deserves attention.

Do not save or mutate restaurant data as part of this V1 canary; the implementation contains no write tools.

## Promotion gate

Do not merge/deploy solely because GitHub code exists. Promote only after:

1. production Git/served-file authority is audited;
2. PHP syntax/autoload checks pass on the VPS runtime;
3. direct OpenAI smoke passes without exposing the key;
4. authenticated `/admin/pmdintelligence` loads for one tenant/location;
5. Ask PMD uses expected tools and shows a run ID;
6. logs contain no API key/customer contact/payment credential data;
7. a second tenant cannot see the first tenant's data;
8. payment/order/auth/MFA flows are regression checked and unchanged.

## Future phases

Write-capable AI remains out of scope for V1. Any future action agent must follow:

AI proposes -> explicit human confirmation -> existing canonical PMD service/controller performs the write under normal RBAC/audit.

The model must never become authorization, payment, tax/fiscal, order-state or employment-decision authority.
