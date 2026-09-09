@php
    $data = $pmdTurkey ?? [];
    $integrations = (array)($data['integrations'] ?? []);
    $readiness = (array)($data['readiness'] ?? []);
    $paymentMethods = (array)($data['payment_methods'] ?? []);

    $cfg = static function (string $code, string $key, $fallback = '') use ($integrations) {
        return $integrations[$code]['config'][$key] ?? $fallback;
    };
    $state = static function (string $code) use ($integrations): array {
        return (array)($integrations[$code]['state'] ?? []);
    };
    $badge = static function (string $code) use ($state): string {
        $s = $state($code);
        if (!empty($s['production_ready'])) return '<span class="pmd-tr-badge is-live">Live</span>';
        $status = (string)($s['status'] ?? 'not configured');
        $safe = e(str_replace('_', ' ', $status));
        return '<span class="pmd-tr-badge">'.$safe.'</span>';
    };
@endphp

<div class="pmd-tr-shell" id="pmd-tr-settings">
    <header class="pmd-tr-header">
        <div>
            <a class="pmd-tr-back" href="{{ admin_url('pmdsettings') }}">← Settings</a>
            <h1>Türkiye setup</h1>
            <p>Türkiye-only fiscal, payment, delivery and communication connections for this restaurant location.</p>
        </div>
        <div class="pmd-tr-readiness {{ !empty($readiness['pilot_ready']) ? 'is-ready' : '' }}">
            <strong>{{ !empty($readiness['pilot_ready']) ? 'Pilot ready' : 'Not pilot ready' }}</strong>
            <span>Location {{ (int)($data['location_id'] ?? 0) }} · TR</span>
        </div>
    </header>

    <div class="pmd-tr-note">
        <strong>Important:</strong> saving settings does not make a regulated Turkish integration live.
        YN ÖKC, acquiring, FAST and e-document connections stay fail-closed until a real partner/device approval exists.
    </div>

    <div class="pmd-tr-secret-note">
        <strong>Secrets:</strong> never paste API secrets into these forms. Put the real value in the VPS/server secret configuration and save only a reference such as
        <code>env:PMD_TR_YEMEKSEPETI_CLIENT_SECRET</code>.
    </div>

    <div id="pmd-tr-action-status" class="pmd-tr-action-status"></div>

    {!! form_open(['id' => 'pmd-tr-settings-form', 'role' => 'form', 'method' => 'POST']) !!}

    <section class="pmd-tr-section" id="fiscal-receipts">
        <div class="pmd-tr-section-title">
            <div><span class="pmd-tr-kicker">1</span><h2>Fiscal & receipts</h2></div>
            <p>Connect the restaurant to Türkiye's fiscal cash-register system and electronic invoice provider.</p>
        </div>

        <div class="pmd-tr-grid">
            <article class="pmd-tr-card">
                <div class="pmd-tr-card-head">
                    <div><h3>YN ÖKC</h3><p>Government-approved fiscal cash-register device. The integrated EFT-POS type can also contain the card-payment POS in the same physical device.</p></div>
                    {!! $badge('yn_okc') !!}
                </div>
                <div class="pmd-tr-fields">
                    <label>Manufacturer<input name="turkey[fiscal][manufacturer]" value="{{ e($cfg('yn_okc','manufacturer')) }}" placeholder="TOKEN / VERA / Hugin / ..."></label>
                    <label>Device model<input name="turkey[fiscal][device_model]" value="{{ e($cfg('yn_okc','device_model')) }}" placeholder="Model from approved vendor"></label>
                    <label>Device serial<input name="turkey[fiscal][device_serial]" value="{{ e($cfg('yn_okc','device_serial')) }}" placeholder="Physical/test device serial"></label>
                    <label>Device type
                        <select name="turkey[fiscal][integration_topology]">
                            <option value="">Choose later</option>
                            <option value="eft_pos_integrated" @selected($cfg('yn_okc','integration_topology') === 'eft_pos_integrated')>Combined EFT-POS + fiscal YN ÖKC</option>
                            <option value="computer_connected" @selected($cfg('yn_okc','integration_topology') === 'computer_connected')>Computer-connected fiscal YN ÖKC</option>
                        </select>
                    </label>
                    <label>Security agreement reference<input name="turkey[fiscal][security_agreement_reference]" value="{{ e($cfg('yn_okc','security_agreement_reference')) }}" placeholder="Contract/document reference from vendor"></label>
                    <label>Certification status<input name="turkey[fiscal][certification_status]" value="{{ e($cfg('yn_okc','certification_status')) }}" placeholder="pending / test / certified"></label>
                </div>
            </article>

            <article class="pmd-tr-card">
                <div class="pmd-tr-card-head">
                    <div><h3>e-Fatura / e-Arşiv</h3><p>Electronic invoice/document connection. This is separate from the ordinary YN ÖKC fiscal receipt.</p></div>
                    {!! $badge('e_document') !!}
                </div>
                <div class="pmd-tr-fields">
                    <label>Provider / Özel Entegratör<input name="turkey[edocument][provider]" value="{{ e($cfg('e_document','provider')) }}" placeholder="Authorized e-document provider"></label>
                    <label>Merchant / tax identifier<input name="turkey[edocument][merchant_identifier]" value="{{ e($cfg('e_document','merchant_identifier')) }}" placeholder="Restaurant identifier"></label>
                    <label>Environment
                        <select name="turkey[edocument][environment]">
                            <option value="sandbox" @selected($cfg('e_document','environment','sandbox') === 'sandbox')>Sandbox / test</option>
                            <option value="production" @selected($cfg('e_document','environment') === 'production')>Production</option>
                        </select>
                    </label>
                    <label>Credential reference<input name="turkey[edocument][credential_reference]" value="{{ e($cfg('e_document','credential_reference')) }}" placeholder="env:PMD_TR_EDOCUMENT_SECRET"></label>
                    <label>Activation status<input name="turkey[edocument][activation_status]" value="{{ e($cfg('e_document','activation_status')) }}" placeholder="not_onboarded / test / active"></label>
                </div>
            </article>
        </div>

        <button type="button" class="btn btn-primary pmd-tr-save" data-request="onSaveFiscal" data-request-flash>Save fiscal & receipt settings</button>
    </section>

    <section class="pmd-tr-section" id="payments">
        <div class="pmd-tr-section-title">
            <div><span class="pmd-tr-kicker">2</span><h2>Payments</h2></div>
            <p>PMD's table QR stays the menu entry. At checkout the guest chooses Card, FAST Ödeme İste, FAST/TR Karekod or Cash.</p>
        </div>

        <div class="pmd-tr-payment-flow">
            <span>Table QR</span><b>→</b><span>Digital menu</span><b>→</b><span>Checkout</span><b>→</b><span>Choose payment method</span>
        </div>

        <div class="pmd-tr-grid pmd-tr-grid--three">
            @foreach([
                ['acquirer','Card / PSP','Online card/acquirer connection. A PSP is the bank/payment company that actually processes the payment.','contract_status'],
                ['fast_request','FAST Ödeme İste','Best same-phone bank-payment flow: tap Pay, receive a request in the banking/financial app, approve it, return/confirm.','activation_status'],
                ['tr_qr_fast','FAST / TR Karekod','A separate payment QR generated for a payment transaction. Best when the QR can be shown on another screen; it is not the table QR.','activation_status'],
            ] as [$code,$title,$description,$statusField])
                <article class="pmd-tr-card">
                    <div class="pmd-tr-card-head">
                        <div><h3>{{ $title }}</h3><p>{{ $description }}</p></div>
                        {!! $badge($code) !!}
                    </div>
                    <div class="pmd-tr-fields">
                        <label>Provider<input name="turkey[{{ $code }}][provider]" value="{{ e($cfg($code,'provider')) }}" placeholder="Bank / licensed PSP"></label>
                        <label>Merchant ID<input name="turkey[{{ $code }}][merchant_id]" value="{{ e($cfg($code,'merchant_id')) }}"></label>
                        <label>Environment
                            <select name="turkey[{{ $code }}][environment]">
                                <option value="sandbox" @selected($cfg($code,'environment','sandbox') === 'sandbox')>Sandbox / test</option>
                                <option value="production" @selected($cfg($code,'environment') === 'production')>Production</option>
                            </select>
                        </label>
                        <label>Credential reference<input name="turkey[{{ $code }}][credential_reference]" value="{{ e($cfg($code,'credential_reference')) }}" placeholder="env:PMD_TR_..._SECRET"></label>
                        <label>{{ str_replace('_',' ',ucfirst($statusField)) }}<input name="turkey[{{ $code }}][{{ $statusField }}]" value="{{ e($cfg($code,$statusField)) }}" placeholder="pending / sandbox / active"></label>
                    </div>
                </article>
            @endforeach
        </div>

        <div class="pmd-tr-method-summary">
            @foreach($paymentMethods as $method)
                <div><strong>{{ $method['label'] ?? $method['code'] }}</strong><span>{{ !empty($method['available']) ? 'Available' : 'Waiting for provider activation' }}</span></div>
            @endforeach
        </div>

        <button type="button" class="btn btn-primary pmd-tr-save" data-request="onSavePayments" data-request-flash>Save payment settings</button>
    </section>

    <section class="pmd-tr-section" id="delivery-channels">
        <div class="pmd-tr-section-title">
            <div><span class="pmd-tr-kicker">3</span><h2>Delivery channels</h2></div>
            <p>Connect Yemeksepeti first. Uber / Trendyol Go stays for a later phase.</p>
        </div>

        <article class="pmd-tr-card">
            <div class="pmd-tr-card-head">
                <div><h3>Yemeksepeti Partner API</h3><p>OAuth connection for orders/catalog/status. Sandbox credentials are separate from production credentials.</p></div>
                {!! $badge('yemeksepeti') !!}
            </div>
            <div class="pmd-tr-fields pmd-tr-fields--wide">
                <label>Environment
                    <select name="turkey[yemeksepeti][environment]">
                        <option value="sandbox" @selected($cfg('yemeksepeti','environment','sandbox') === 'sandbox')>Sandbox</option>
                        <option value="production" @selected($cfg('yemeksepeti','environment') === 'production')>Production</option>
                    </select>
                </label>
                <label>Client ID<input name="turkey[yemeksepeti][client_id]" value="{{ e($cfg('yemeksepeti','client_id')) }}"></label>
                <label>Client Secret Reference<input name="turkey[yemeksepeti][client_secret_reference]" value="{{ e($cfg('yemeksepeti','client_secret_reference')) }}" placeholder="env:PMD_TR_YEMEKSEPETI_CLIENT_SECRET"></label>
                <label>Merchant / Partner ID<input name="turkey[yemeksepeti][merchant_or_partner_id]" value="{{ e($cfg('yemeksepeti','merchant_or_partner_id')) }}"></label>
                <label>Chain ID<input name="turkey[yemeksepeti][chain_id]" value="{{ e($cfg('yemeksepeti','chain_id')) }}"></label>
                <label>Vendor ID<input name="turkey[yemeksepeti][vendor_id]" value="{{ e($cfg('yemeksepeti','vendor_id')) }}"></label>
            </div>
            <div class="pmd-tr-card-actions">
                <button type="button" class="btn btn-primary" data-request="onSaveDelivery" data-request-flash>Save Yemeksepeti</button>
                <button type="button" class="btn btn-default" data-request="onTestYemeksepeti" data-request-flash>Test sandbox connection</button>
                <span id="pmd-tr-yemek-test-status"></span>
            </div>
        </article>

        <div class="pmd-tr-info-row">
            <strong>Marketplace settlements</strong>
            <span><code>pmd_tr_marketplace_settlements</code> is currently a backend database table, not a visible report page yet. It stores marketplace commission/fee/settlement lines for later reconciliation UI.</span>
        </div>
    </section>

    <section class="pmd-tr-section" id="communications">
        <div class="pmd-tr-section-title">
            <div><span class="pmd-tr-kicker">4</span><h2>Communications</h2></div>
            <p>Transactional messages and marketing permission are separate. OTP/order notifications are not the same as promotional marketing.</p>
        </div>

        <div class="pmd-tr-grid pmd-tr-grid--three">
            <article class="pmd-tr-card">
                <div class="pmd-tr-card-head"><div><h3>İYS</h3><p>Türkiye's national registry for commercial marketing-message permissions. Restaurant/brand is the legal sender; PMD can synchronize the consent.</p></div>{!! $badge('iys') !!}</div>
                <div class="pmd-tr-fields">
                    <label>Authorized integrator<input name="turkey[iys][integrator]" value="{{ e($cfg('iys','integrator')) }}"></label>
                    <label>Restaurant legal entity / brand<input name="turkey[iys][brand_or_legal_entity]" value="{{ e($cfg('iys','brand_or_legal_entity')) }}"></label>
                    <label>Environment<select name="turkey[iys][environment]"><option value="sandbox" @selected($cfg('iys','environment','sandbox') === 'sandbox')>Sandbox/test</option><option value="production" @selected($cfg('iys','environment') === 'production')>Production</option></select></label>
                    <label>Credential reference<input name="turkey[iys][credential_reference]" value="{{ e($cfg('iys','credential_reference')) }}" placeholder="env:PMD_TR_IYS_SECRET"></label>
                    <label>Contract status<input name="turkey[iys][contract_status]" value="{{ e($cfg('iys','contract_status')) }}"></label>
                </div>
            </article>

            <article class="pmd-tr-card">
                <div class="pmd-tr-card-head"><div><h3>SMS / OTP</h3><p>Use for phone verification, delivery/reservation service messages and OTP. PMD can use one technical provider while keeping a tenant-specific sender identity.</p></div>{!! $badge('sms') !!}</div>
                <div class="pmd-tr-fields">
                    <label>Provider<input name="turkey[sms][provider]" value="{{ e($cfg('sms','provider')) }}" placeholder="SMS provider"></label>
                    <label>Tenant sender ID<input name="turkey[sms][sender_id]" value="{{ e($cfg('sms','sender_id')) }}" placeholder="Restaurant sender name"></label>
                    <label>Credential reference<input name="turkey[sms][credential_reference]" value="{{ e($cfg('sms','credential_reference')) }}" placeholder="env:PMD_TR_SMS_SECRET"></label>
                </div>
            </article>

            <article class="pmd-tr-card">
                <div class="pmd-tr-card-head"><div><h3>WhatsApp Business</h3><p>PMD may be the technology provider, but each restaurant should have its own business/number identity rather than all tenants pretending to be one restaurant.</p></div>{!! $badge('whatsapp') !!}</div>
                <div class="pmd-tr-fields">
                    <label>Provider<input name="turkey[whatsapp][provider]" value="{{ e($cfg('whatsapp','provider')) }}"></label>
                    <label>Tenant business account reference<input name="turkey[whatsapp][business_account_reference]" value="{{ e($cfg('whatsapp','business_account_reference')) }}"></label>
                    <label>Credential reference<input name="turkey[whatsapp][credential_reference]" value="{{ e($cfg('whatsapp','credential_reference')) }}" placeholder="env:PMD_TR_WHATSAPP_SECRET"></label>
                </div>
            </article>
        </div>

        <button type="button" class="btn btn-primary pmd-tr-save" data-request="onSaveCommunications" data-request-flash>Save communication settings</button>
    </section>

    <section class="pmd-tr-section pmd-tr-section--readiness">
        <div class="pmd-tr-section-title"><div><span class="pmd-tr-kicker">✓</span><h2>Türkiye readiness</h2></div></div>
        @if(!empty($readiness['blockers']))
            <ul class="pmd-tr-blockers">
                @foreach($readiness['blockers'] as $blocker)<li>{{ $blocker }}</li>@endforeach
            </ul>
        @else
            <p class="pmd-tr-status-ok">No PMD-recorded pilot blockers.</p>
        @endif
        <button type="button" class="btn btn-default" data-request="onProvisionTurkey" data-request-flash>Ensure Türkiye tenant schema</button>
    </section>

    {!! form_close() !!}
</div>
