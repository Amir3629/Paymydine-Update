# Terminal Payment Flow

1. Admin configures an enabled terminal-capable provider record in Payments providers mode.
2. Admin submits a terminal payment request for an existing order through `POST /admin/orders/terminal-payment-attempt`.
3. The system validates the order belongs to the current tenant DB and validates the enabled provider configuration.
4. A `payment_attempts` row is created with status `pending`.
5. Provider abstraction attempts to send the payment to the terminal.
6. Without certified provider API docs, Worldline/VR skeleton providers return failure instead of fake success.
7. Logs use these markers: `PMD_TERMINAL_PAYMENT_CREATE`, `PMD_TERMINAL_PAYMENT_SENT`, `PMD_TERMINAL_PAYMENT_STATUS`, `PMD_TERMINAL_PAYMENT_FAILED`.
8. Statuses supported by the table: `pending`, `sent_to_terminal`, `paid`, `failed`, `cancelled`.

Secrets and API keys must never be stored in plain logs; payload redaction masks token/key/secret/password/certificate fields.
