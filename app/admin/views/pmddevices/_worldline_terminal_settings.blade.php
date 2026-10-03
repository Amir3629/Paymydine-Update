@php
    $worldlineTerminal = (array)($opts['worldline_terminal'] ?? []);
    $worldlineTokenPresent = !empty($worldlineTerminal['terminal_api_token_present']);
    $worldlineEnvironment = strtolower((string)($worldlineTerminal['terminal_environment'] ?? 'test')) === 'live' ? 'live' : 'test';
@endphp

<section class="pmd-device-v6-section" data-pmd-worldline-terminal-settings>
    <div class="pmd-device-v6-section__head">
        <h3>{{ $pmdSettingsText('Worldline Terminal API') }}</h3>
        <p>{{ $pmdSettingsText('Card-present Worldline uses separate Terminal API credentials. These are not your Connect API key or webhook secret.') }}</p>
    </div>
    <div class="pmd-owner-form-grid">
        <div class="pmd-owner-field">
            <label>{{ $pmdSettingsText('Terminal merchant ID (UMID)') }}</label>
            <input type="text" name="Worldline_terminal[terminal_merchant_id]" value="{{ $worldlineTerminal['terminal_merchant_id'] ?? '' }}" autocomplete="off">
            <small>{{ $pmdSettingsText('Use the Worldline Terminal API merchant identifier supplied for the physical SmartPOS estate.') }}</small>
        </div>
        <div class="pmd-owner-field">
            <label>{{ $pmdSettingsText('Terminal environment') }}</label>
            <select name="Worldline_terminal[terminal_environment]">
                <option value="test" {{ $worldlineEnvironment === 'test' ? 'selected' : '' }}>{{ $pmdSettingsText('Test / Integration') }}</option>
                <option value="live" {{ $worldlineEnvironment === 'live' ? 'selected' : '' }}>{{ $pmdSettingsText('Live') }}</option>
            </select>
        </div>
        <div class="pmd-owner-field pmd-owner-field--full">
            <label>{{ $pmdSettingsText('Terminal API base URL') }}</label>
            <input type="url" name="Worldline_terminal[terminal_api_base_url]" value="{{ $worldlineTerminal['terminal_api_base_url'] ?? '' }}" placeholder="https://api.terminal.iacc.global.worldline-solutions.com" autocomplete="off">
            <small>{{ $pmdSettingsText('For Test / Integration the Worldline integration URL can be left blank to use the supported default. Live requires the production URL supplied by Worldline.') }}</small>
        </div>
        <div class="pmd-owner-field pmd-owner-field--full">
            <label>{{ $pmdSettingsText('Terminal API Bearer token') }}</label>
            <input type="password" name="Worldline_terminal[terminal_api_token]" value="" placeholder="{{ $worldlineTokenPresent ? $pmdSettingsText('Configured — leave blank to keep current token') : $pmdSettingsText('Paste Worldline Terminal API Bearer token') }}" autocomplete="new-password">
            <small>{{ $worldlineTokenPresent ? $pmdSettingsText('A Bearer token is already stored. Enter a new token only to replace it.') : $pmdSettingsText('This token is stored with the Worldline provider configuration and is never shown back in the browser.') }}</small>
        </div>
        <div class="pmd-owner-field pmd-owner-field--full">
            <small><strong>{{ $pmdSettingsText('Reader ID above = Worldline UTID.') }}</strong> {{ $pmdSettingsText('Do not paste a Connect Webhook Key ID. Save the terminal, then use Test terminal connection to validate configuration without charging a card.') }}</small>
        </div>
    </div>
</section>

<style>
  [data-pmd-worldline-terminal-settings] { display: none; }
  form[data-pmd-device-kind="terminals"]:has(select[name$="[provider_code]"] option[value="worldline"]:checked) [data-pmd-worldline-terminal-settings] { display: block; }
</style>
