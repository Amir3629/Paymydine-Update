`grep -r "host" .`

<file_content>
_investigation/logs/search_middleware.md
27:90:17:- ✅ API endpoints (2/3 correctly use request host, but bypass tenant middleware)
44:157:23:        Log::channel('tenant_detection')->info('DetectTenant middleware running for host: ' . $host);
93:17:- ✅ API endpoints (2/3 correctly use request host, but bypass tenant middleware)

_investigation/logs/search_from_ti.md
62:18:ERROR 1064 (42000) at line 1: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near ', status, db_host, db_user FROM ti_tenants LIMIT 20' at line 1
76:547:SELECT id, domain, database, subdomain, status, db_host FROM ti_tenants LIMIT 10;

_investigation/logs/search_tenant.md
88:12:**Root Cause**: The admin table edit blade view (`app/admin/views/tables/edit.blade.php`) constructs QR URLs using **database-stored `permalink_slug`** (value: `'default'`) instead of the **current HTTP request host**. This causes all QR codes to point to `http://default.paymydine.com` regardless of which tenant subdomain the admin is accessing.
90:17:- ✅ API endpoints (2/3 correctly use request host, but bypass tenant middleware)
156:22:        $host = $request->getHost();
157:23:        Log::channel('tenant_detection')->info('DetectTenant middleware running for host: ' . $host);
164:30:            $parts = explode('.', $host);
207:73:            'host' => $tenant->db_host ?? env('DB_HOST', '127.0.0.1'),

TENANT_HOST_LEAK_INVESTIGATION.md
12:**Root Cause**: The admin table edit blade view (`app/admin/views/tables/edit.blade.php`) constructs QR URLs using **database-stored `permalink_slug`** (value: `'default'`) instead of the **current HTTP request host**. This causes all QR codes to point to `http://default.paymydine.com` regardless of which tenant subdomain the admin is accessing.
17:- ✅ API endpoints (2/3 correctly use request host, but bypass tenant middleware)
19:- ✅ Helper functions (correctly use request host)
66:- No relationship to current HTTP request host (`127.0.0.1:8001` or `amir.paymydine.com`)
103:# From localhost
135:// From localhost: "http://127.0.0.1:8001/table/1?location=1&guest=1&qr=cashier&..."
236:│    │           WRONG! Should be current request host     │ │
359:- **Current problem**: Blade view uses this instead of request host
383:### 4.4 Localhost vs Production Behavior
385:**Localhost (`http://127.0.0.1:8001`):**
387:Request host: 127.0.0.1:8001
395:Request host: amir.paymydine.com
410:### 5.1 Scenario A: Localhost Development
464:    'request_host' => request()->getHost(),
473:    "request_host": "127.0.0.1:8001",
481:**Key Observation**: `request_host` is correct, but **ignored** in favor of `db_slug`.
497:**Finding**: API endpoint returns CORRECT URL (uses request host), but blade view shows WRONG URL (uses database slug).
503:### ✅ Hypothesis 1: Database slug instead of request host
574:- ✅ NO BREAKING CHANGE - Endpoint already returns correct host
584:- Not for URL building (use request host instead)
650:**Testing Required**: 2 scenarios (localhost + subdomain)

storage/framework/sessions/8YSJRgiW1NxHNk3RMYiHKDTU2w02TGD5metwhbRc
1:a:4:{s:6:"_token";s:40:"Eiwp7beTO0mXpsjCgxF5JBHxfl9Ivlg1wD9QwBsK";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/PNYxmOsHpn8OFmvufoTqdMJhy9KsbuEe7v4j84em
1:a:4:{s:6:"_token";s:40:"THYuE1X5WTxxTNXMy0wEKwxTG4iYVc17GKqk4f8l";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/iSjzOl2aRzoZwcWyuRpV4IpIqMsY1IxjsWRxEZuV
1:a:4:{s:6:"_token";s:40:"haPomJ3rP10BkQH5VONJn0mkf06N6X9QXMcFuiSI";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

FINAL_DEPLOYMENT_REPORT.md
122:**Problem**: QR codes used localhost URLs  
171:fix(qr-urls): apply request host fix to app/admin/routes.php QR generators
353:✅ **QR/cashier URLs use request host** (6 locations fixed: 3 in routes.php + 3 in app/admin/routes.php)  
364:Latest →  fix(qr-urls): apply request host fix to app/admin/routes.php QR generators
383:**Message**: fix(qr-urls): apply request host fix to app/admin/routes.php QR generators  
473:❌ QR codes broken (localhost URLs)  

GITHUB_DEPLOYMENT_SUCCESS.md
40:- ✅ Use tenant-specific subdomains (not localhost)
179:❌ QR codes pointed to localhost (broken)  

storage/framework/sessions/tQjx8jtsnA2z4JWuswFz92KRi5WMfUdXzsn8vPya
1:a:4:{s:6:"_token";s:40:"4gY9jcyErI5271euGJn0MIqntg7gfrWbQtkuEl4S";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/HixJ5EDvOtYsmiCaAb5yCmYDesDakvTELqbRXirk
1:a:4:{s:6:"_token";s:40:"ddAfN6NZbrZzinIG2oXDkLEfJx3tnYMttzMkd4rW";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/LdIC7ks05qJ9O2hThfaCbjRnfu4EA1598jsyEB6Z
1:a:4:{s:6:"_token";s:40:"aj3lxipQuGhB2EVlVahnmU09fg2IIrz7T6nnayrV";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/YoD1tJ2Y0dg7ccftx1jGS21Sza6tSb7LbAsoJLmR
1:a:4:{s:6:"_token";s:40:"1b3T8VxAQ5O4VQ5YZGYbKnhbt6RtCPaNSh5JdotL";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:65:"http://localhost:8000/api/v1/table-info?qr=ms288NyK7y&table_no=12";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/CVXsR0HAnaVLLAXa0N69eCVU717MVMifmb8e3oaX
1:a:4:{s:6:"_token";s:40:"m0S1m0mnzhqLUPr4hrw1U69K8yaMYsfM0MmoYezQ";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:50:"http://localhost:8000/api/v1/menu?_t=1760036479571";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/HSaPfmui0y9UasFKFC3imTVn4VwJU8fQW9S7h5WY
1:a:4:{s:6:"_token";s:40:"9H3jrQTAgUiDyV7D2My5xdy5Zd8RWfbUKbyqvVQN";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/payments";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/LMGxind8chhpABSjbe6tAgrlnGQtEcEiofXVZniA
1:a:4:{s:6:"_token";s:40:"q1ukF6QwzgGHdSmwZq4miqrMK2L81RVkldYm1TEt";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/OlVakq00vNsHcfs51KQptqADo3z8uL7jvu2Bk6B3
1:a:4:{s:6:"_token";s:40:"AT9S1IrnjKdZRjyxKhodLRnpDfl6Q8OvR9qgaU0G";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/payments";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/UZbykEVMzJu426ler1p68r9fbhwz7tZkHZln6GVV
1:a:4:{s:6:"_token";s:40:"TFqTEuGbfyYtOSA2wDP0AKQxEIGGv7fawQqAfWui";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/79K2eqJ3xX65EfcMnptAq5ByL6jz0y9zEfL3BRhA
1:a:4:{s:6:"_token";s:40:"spZAjOOoQ9THyaNr3V2IBbxvWtD78vhT1PEA0IIX";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:70:"http://localhost:8000/api/v1/table-info?qr_code=ms288NyK7y&table_no=12";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/GH42zNH1VVCQQifQZEMRf0CtJ5upWjQknZlTZ8rS
1:a:4:{s:6:"_token";s:40:"o0kBQP2Stf3j5sMZFGSQI4kC9oGwPPsYHJt3C8rc";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/yW6c4BDtWzkR8gn6gGbO7hokCcBBxcdFhpHtU1Tb
1:a:4:{s:6:"_token";s:40:"sE2fa2is84kZ8BWZtJDTK6oaeg3n5NlF8vUsCbi1";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/JCYp79fZq53zi3hvZ2cN83BczD7eYMkV77rcltkN
1:a:4:{s:6:"_token";s:40:"atyM7xH35gEMvnGuBzmLNewy1CEQ5F9mtiO3gL1A";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/kOUWPMk6byqWQFDOfJhtOqo9kJpL85HCb61iWg0H
1:a:4:{s:6:"_token";s:40:"YpprqGzxmuAtEpQyUCrjYVJMuYpF7KZK317kqqCv";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:65:"http://localhost:8000/api/v1/table-info?qr=ms288NyK7y&table_no=12";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/YtInIbVGqYj9ZeR7JgC5YdPwebnLG7qRUHt7T9RE
1:a:4:{s:6:"_token";s:40:"n32VTD5BmEobV0OSvrY78i5Wx6tjrvn9seBcA5df";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/PY1hUX88ejc6LBPjO8XSv1wpyW5Fa8Whmqk944W3
... and more
