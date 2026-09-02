<?php

declare(strict_types=1);

/*
 * PayMyDine keyed EN/DE catalogue - migration phase 1.
 *
 * This file is the only source for migrated Waiter POS text. Legacy Admin
 * routes keep their existing TastyIgniter/PMD translator until audited and
 * migrated; do not add another DOM or page-specific translation authority.
 */

return [
    'supported_locales' => ['en', 'de'],
    'messages' => [
        'shared.add_item' => [
            'en' => 'Add item',
            'de' => 'Artikel hinzufügen',
        ],
        'shared.apply' => [
            'en' => 'Apply',
            'de' => 'Anwenden',
        ],
        'shared.cancel' => [
            'en' => 'Cancel',
            'de' => 'Abbrechen',
        ],
        'shared.close' => [
            'en' => 'Close',
            'de' => 'Schließen',
        ],
        'shared.coupon' => [
            'en' => 'Coupon',
            'de' => 'Gutschein',
        ],
        'shared.custom' => [
            'en' => 'Custom',
            'de' => 'Benutzerdefiniert',
        ],
        'shared.edit_order' => [
            'en' => 'Edit order',
            'de' => 'Bestellung bearbeiten',
        ],
        'shared.optional' => [
            'en' => 'Optional',
            'de' => 'Optional',
        ],
        'shared.options' => [
            'en' => 'Options',
            'de' => 'Optionen',
        ],
        'shared.payment' => [
            'en' => 'Payment',
            'de' => 'Zahlung',
        ],
        'shared.payment_history' => [
            'en' => 'Payment history',
            'de' => 'Zahlungsverlauf',
        ],
        'shared.payment_method' => [
            'en' => 'Payment method',
            'de' => 'Zahlungsmethode',
        ],
        'shared.payment_summary' => [
            'en' => 'Payment summary',
            'de' => 'Zahlungsübersicht',
        ],
        'shared.print' => [
            'en' => 'Print',
            'de' => 'Drucken',
        ],
        'shared.table' => [
            'en' => 'Table',
            'de' => 'Tisch',
        ],
        'shared.tip' => [
            'en' => 'Tip',
            'de' => 'Trinkgeld',
        ],
        'shared.view_order' => [
            'en' => 'View order',
            'de' => 'Bestellung anzeigen',
        ],
        'shared.waiter' => [
            'en' => 'Waiter',
            'de' => 'Kellner',
        ],
        'waiter.dashboard.title' => [
            'en' => 'Waiter POS',
            'de' => 'Kellner-POS',
        ],
        'waiter.payment.by_items' => [
            'en' => 'By items',
            'de' => 'Nach Artikeln',
        ],
        'waiter.payment.cash_received' => [
            'en' => 'Cash received',
            'de' => 'Erhaltener Barbetrag',
        ],
        'waiter.payment.center' => [
            'en' => 'PAYMENT CENTER',
            'de' => 'ZAHLUNGSCENTER',
        ],
        'waiter.payment.choose_coverage' => [
            'en' => 'Choose what this payer covers',
            'de' => 'Auswählen, was dieser Zahler übernimmt',
        ],
        'waiter.payment.configured_methods_only' => [
            'en' => 'Only configured methods are shown',
            'de' => 'Nur konfigurierte Zahlungsmethoden werden angezeigt',
        ],
        'waiter.payment.copy_link' => [
            'en' => 'Copy customer payment link',
            'de' => 'Kundenzahlungslink kopieren',
        ],
        'waiter.payment.coupon_code' => [
            'en' => 'Coupon code',
            'de' => 'Gutscheincode',
        ],
        'waiter.payment.custom_tip' => [
            'en' => 'Custom tip',
            'de' => 'Benutzerdefiniertes Trinkgeld',
        ],
        'waiter.payment.equally' => [
            'en' => 'Equally',
            'de' => 'Gleichmäßig',
        ],
        'waiter.payment.external_confirmation' => [
            'en' => 'I confirm the external terminal approved this exact amount.',
            'de' => 'Ich bestätige, dass das externe Terminal genau diesen Betrag freigegeben hat.',
        ],
        'waiter.payment.external_reference_required' => [
            'en' => 'Required for external terminal',
            'de' => 'Für externes Terminal erforderlich',
        ],
        'waiter.payment.full_bill' => [
            'en' => 'Full bill',
            'de' => 'Gesamte Rechnung',
        ],
        'waiter.payment.full_remaining_only' => [
            'en' => 'Full remaining balance only',
            'de' => 'Nur für den gesamten Restbetrag',
        ],
        'waiter.payment.no_tip' => [
            'en' => 'No tip',
            'de' => 'Kein Trinkgeld',
        ],
        'waiter.payment.payer_label' => [
            'en' => 'Payer / guest label',
            'de' => 'Zahler / Gast',
        ],
        'waiter.payment.payer_placeholder' => [
            'en' => 'Guest 1, Anna, Seat 2…',
            'de' => 'Gast 1, Anna, Platz 2…',
        ],
        'waiter.payment.provider_confirmation_safety' => [
            'en' => 'Online and direct-terminal payments are never marked successful without provider confirmation.',
            'de' => 'Online- und Direktterminal-Zahlungen werden ohne Bestätigung des Zahlungsanbieters niemals als erfolgreich markiert.',
        ],
        'waiter.payment.record_payment' => [
            'en' => 'Record payment',
            'de' => 'Zahlung erfassen',
        ],
        'waiter.payment.refresh_status' => [
            'en' => 'Refresh payment status',
            'de' => 'Zahlungsstatus aktualisieren',
        ],
        'waiter.payment.settle_order' => [
            'en' => 'Settle order',
            'de' => 'Bestellung abrechnen',
        ],
        'waiter.payment.split_bill' => [
            'en' => 'Split bill',
            'de' => 'Rechnung teilen',
        ],
        'waiter.payment.terminal_reference' => [
            'en' => 'Terminal approval / receipt reference',
            'de' => 'Terminalfreigabe / Belegreferenz',
        ],
        'waiter.pos.already_sent' => [
            'en' => 'Already sent',
            'de' => 'Bereits gesendet',
        ],
        'waiter.pos.back_to_floor' => [
            'en' => '← Back to floor',
            'de' => '← Zurück zum Tischplan',
        ],
        'waiter.pos.clear_cart' => [
            'en' => 'Clear cart',
            'de' => 'Warenkorb leeren',
        ],
        'waiter.pos.close_cart' => [
            'en' => 'Close cart',
            'de' => 'Warenkorb schließen',
        ],
        'waiter.pos.close_payment' => [
            'en' => 'Close payment',
            'de' => 'Zahlung schließen',
        ],
        'waiter.pos.compact_list_view' => [
            'en' => 'Compact list view',
            'de' => 'Kompakte Listenansicht',
        ],
        'waiter.pos.current_order' => [
            'en' => 'Current order',
            'de' => 'Aktuelle Bestellung',
        ],
        'waiter.pos.decrease_guests' => [
            'en' => 'Decrease guests',
            'de' => 'Gästezahl verringern',
        ],
        'waiter.pos.do_not_send' => [
            'en' => 'Do not send',
            'de' => 'Nicht senden',
        ],
        'waiter.pos.existing_order' => [
            'en' => 'Existing order',
            'de' => 'Bestehende Bestellung',
        ],
        'waiter.pos.grid_view' => [
            'en' => 'Grid view',
            'de' => 'Rasteransicht',
        ],
        'waiter.pos.guests' => [
            'en' => 'Guests',
            'de' => 'Gäste',
        ],
        'waiter.pos.increase_guests' => [
            'en' => 'Increase guests',
            'de' => 'Gästezahl erhöhen',
        ],
        'waiter.pos.item_count_many' => [
            'en' => ':count items',
            'de' => ':count Artikel',
        ],
        'waiter.pos.menu_categories' => [
            'en' => 'Menu categories',
            'de' => 'Menükategorien',
        ],
        'waiter.pos.menu_items' => [
            'en' => 'Menu items',
            'de' => 'Menüartikel',
        ],
        'waiter.pos.new_items' => [
            'en' => 'New items',
            'de' => 'Neue Artikel',
        ],
        'waiter.pos.new_order' => [
            'en' => 'New order',
            'de' => 'Neue Bestellung',
        ],
        'waiter.pos.not_sent_yet' => [
            'en' => 'Not sent yet',
            'de' => 'Noch nicht gesendet',
        ],
        'waiter.pos.order_note_placeholder' => [
            'en' => 'Order note for kitchen or service…',
            'de' => 'Bestellnotiz für Küche oder Service…',
        ],
        'waiter.pos.order_total' => [
            'en' => 'Order total',
            'de' => 'Bestellsumme',
        ],
        'waiter.pos.quick_ordering' => [
            'en' => 'Quick waiter ordering',
            'de' => 'Schnelle Kellnerbestellung',
        ],
        'waiter.pos.refresh_order_menu' => [
            'en' => 'Refresh order and menu',
            'de' => 'Bestellung und Menü aktualisieren',
        ],
        'waiter.pos.save_hold' => [
            'en' => 'Save / Hold',
            'de' => 'Speichern / Halten',
        ],
        'waiter.pos.search_placeholder' => [
            'en' => 'Search food, drink, category…',
            'de' => 'Speisen, Getränke, Kategorien suchen…',
        ],
        'waiter.pos.send_to_kitchen' => [
            'en' => 'Send to kitchen',
            'de' => 'An Küche senden',
        ],
        'waiter.pos.table_covers' => [
            'en' => 'Table covers',
            'de' => 'Gäste am Tisch',
        ],
        'waiter.pos.view_mode' => [
            'en' => 'View mode',
            'de' => 'Ansichtsmodus',
        ],
    ],
];
