@php
    $customer = $pmdCustomer ?? [];
    $emails = (array)($customer['registration_email'] ?? []);
@endphp

<div id="pmd-customer-page" class="pmd-owner-page" data-pmd-owner-page>
    <header class="pmd-owner-header">
        <div class="pmd-owner-header__left">
            <a class="pmd-owner-header-button" href="{{ admin_url('pmdsettings') }}" aria-label="Back"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg></a>
            <h1>Customer accounts</h1>
        </div>
        <div class="pmd-owner-header__actions" data-pmd-owner-header-actions>
            <span id="pmd-owner-save-status"></span>
            <button type="submit" form="pmd-customer-form" class="pmd-owner-header-button pmd-owner-save" data-pmd-owner-save aria-label="Save changes" aria-hidden="true" tabindex="-1"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"></path></svg></button>
            <span class="pmd-owner-notif-slot" data-pmd-owner-notif-slot></span>
        </div>
    </header>

    <form id="pmd-customer-form" data-pmd-owner-form data-request="onSaveCustomerAccounts" data-request-flash>
        <section class="pmd-owner-section">
            <div class="pmd-owner-card" data-accent="rose">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M19 8v6M22 11h-6"></path></svg></div>
                    <div class="pmd-owner-card__title"><h2>Registration & account emails</h2><p>The two customer-account controls from the old settings page, without the old settings shell.</p></div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-setting-row">
                        <div class="pmd-owner-setting-copy"><strong>Allow customer registration</strong><small>Guests can create and use customer accounts.</small></div>
                        <label class="pmd-owner-switch"><input type="checkbox" name="customer_accounts[allow_registration]" value="1" {{ !empty($customer['allow_registration']) ? 'checked' : '' }}><span></span></label>
                    </div>
                    <div class="pmd-owner-setting-row">
                        <div class="pmd-owner-setting-copy"><strong>Send registration email to customer</strong><small>Send a confirmation message after successful registration.</small></div>
                        <label class="pmd-owner-switch"><input type="checkbox" name="customer_accounts[registration_email][]" value="customer" {{ in_array('customer', $emails, true) ? 'checked' : '' }}><span></span></label>
                    </div>
                    <div class="pmd-owner-setting-row">
                        <div class="pmd-owner-setting-copy"><strong>Notify restaurant admin</strong><small>Send the registration notification to the admin email too.</small></div>
                        <label class="pmd-owner-switch"><input type="checkbox" name="customer_accounts[registration_email][]" value="admin" {{ in_array('admin', $emails, true) ? 'checked' : '' }}><span></span></label>
                    </div>
                </div>
            </div>
        </section>
    </form>
</div>
