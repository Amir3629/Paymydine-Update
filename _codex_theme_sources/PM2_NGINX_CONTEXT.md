# Current VPS Runtime Context

Generated at: Mon Jun 15 13:45:21 UTC 2026

## PM2

```
┌────┬─────────────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name                        │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼─────────────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 1  │ next-app                    │ default     │ N/A     │ fork    │ 1823727  │ 39D    │ 41   │ online    │ 0%       │ 59.4mb   │ ubuntu   │ disabled │
│ 21 │ paymydine-frontend          │ default     │ N/A     │ fork    │ 3528001  │ 19m    │ 2    │ online    │ 0%       │ 57.2mb   │ ubuntu   │ disabled │
│ 14 │ pmd-botanical-v0-exact      │ default     │ N/A     │ fork    │ 3527853  │ 19m    │ 13   │ online    │ 0%       │ 52.3mb   │ ubuntu   │ disabled │
│ 19 │ pmd-modern-green-preview    │ default     │ 16.2.6  │ fork    │ 3527874  │ 19m    │ 37   │ online    │ 0%       │ 73.6mb   │ ubuntu   │ disabled │
└────┴─────────────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

## PM2 details

```
----
name: next-app
status: online
cwd: /var/www/Landingpage
script: /usr/bin/npm
args: start
PORT: 3000
----
name: pmd-botanical-v0-exact
status: online
cwd: /var/www/pmd-v0-botanical-exact
script: /usr/bin/bash
args: -lc npm start -- -p 3002 -H 127.0.0.1
PORT: 
----
name: pmd-modern-green-preview
status: online
cwd: /var/www/pmd-modern-green-standalone
script: /var/www/pmd-modern-green-standalone/node_modules/next/dist/bin/next
args: start -p 3012 -H 127.0.0.1
PORT: 
----
name: paymydine-frontend
status: online
cwd: /var/www/paymydine/frontend
script: /usr/bin/npm
args: start -- -p 3001
PORT: 
```

## Nginx routing references

```
/etc/nginx/sites-enabled/persian.paymydine.com.conf:4:    server_name persian.paymydine.com;
/etc/nginx/sites-enabled/persian.paymydine.com.conf:23:    server_name persian.paymydine.com;
/etc/nginx/sites-enabled/persian.paymydine.com.conf:103:      proxy_pass http://127.0.0.1:3001;
/etc/nginx/sites-enabled/persian.paymydine.com.conf:113:      proxy_pass http://127.0.0.1:3001;
/etc/nginx/sites-enabled/persian.paymydine.com.conf:201:        proxy_pass http://127.0.0.1:3001;
/etc/nginx/sites-enabled/paymydine:15:    server_name paymydine.com www.paymydine.com;
/etc/nginx/sites-enabled/paymydine:55:        proxy_pass http://127.0.0.1:3002;
/etc/nginx/sites-enabled/paymydine:77:        proxy_pass http://127.0.0.1:3012;
/etc/nginx/sites-enabled/paymydine:94:        proxy_pass http://127.0.0.1:3000;
/etc/nginx/sites-enabled/paymydine:125:    server_name *.paymydine.com;
/etc/nginx/sites-enabled/paymydine:158:        proxy_pass http://127.0.0.1:3002;
/etc/nginx/sites-enabled/paymydine:189:    server_name mimoza.paymydine.com;
/etc/nginx/sites-enabled/paymydine:264:      proxy_pass http://127.0.0.1:3001;
/etc/nginx/sites-enabled/paymydine:274:      proxy_pass http://127.0.0.1:3001;
/etc/nginx/sites-enabled/paymydine:380:        proxy_pass http://127.0.0.1:3002;
/etc/nginx/sites-enabled/paymydine:402:        proxy_pass http://127.0.0.1:3012;
/etc/nginx/sites-enabled/paymydine:433:        proxy_pass http://127.0.0.1:3001;
/etc/nginx/sites-enabled/paymydine:473:    server_name rosana.paymydine.com;
/etc/nginx/sites-enabled/paymydine:512:        proxy_pass http://127.0.0.1:3002;
/etc/nginx/sites-enabled/paymydine:534:        proxy_pass http://127.0.0.1:3012;
/etc/nginx/sites-enabled/paymydine:574:        proxy_pass http://127.0.0.1:3001;
/etc/nginx/sites-enabled/paymydine:610:    server_name paymydine.com www.paymydine.com;
/etc/nginx/sites-enabled/paymydine:647:        proxy_pass http://127.0.0.1:3002;
```

## Note

Do not delete or edit PM2/Nginx in the migration PR.
First migrate Modern Green and Organic into the main frontend.
