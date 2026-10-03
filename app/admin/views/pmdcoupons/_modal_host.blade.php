<div class="pmd-coupon-modal" data-pmd-coupon-modal hidden aria-hidden="true">
    <div class="pmd-coupon-modal__backdrop" data-pmd-coupon-close></div>
    <section class="pmd-coupon-modal__card" role="dialog" aria-modal="true" aria-labelledby="pmd-coupon-modal-title">
        <header class="pmd-coupon-modal__header">
            <div>
                <span class="pmd-coupon-modal__eyebrow">{{ $pmdT('title') }}</span>
                <h2 id="pmd-coupon-modal-title" data-pmd-coupon-modal-title>{{ $pmdT('modal_create') }}</h2>
            </div>
            <button type="button" class="pmd-coupon-modal__close" data-pmd-coupon-close aria-label="{{ $pmdT('close') }}" title="{{ $pmdT('close') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
            </button>
        </header>

        <div class="pmd-coupon-modal__scroll" data-pmd-coupon-modal-scroll>
            <form class="pmd-coupon-form" data-pmd-coupon-form>
                <input type="hidden" name="_token" value="{{ csrf_token() }}">
                <input type="hidden" name="coupon_id" value="" data-pmd-coupon-id>
                <input type="hidden" name="card_type" value="coupon" data-pmd-card-type-input>
                <input type="hidden" name="type" value="F" data-pmd-discount-type-input>
                <input type="hidden" name="is_purchasable" value="0" data-pmd-gift-option-input="is_purchasable">
                <input type="hidden" name="is_reloadable" value="0" data-pmd-gift-option-input="is_reloadable">
                <input type="hidden" name="is_transferable" value="0" data-pmd-gift-option-input="is_transferable">

                <section class="pmd-coupon-form__section">
                    <div class="pmd-coupon-form__section-head">
                        <div class="pmd-coupon-form__section-icon"><svg viewBox="0 0 24 24"><path d="M4 7h16v10H4z"></path><path d="M8 7v10M16 7v10"></path><path d="M10 12h4"></path></svg></div>
                        <div><h3>{{ $pmdT('basic') }}</h3><p>{{ $pmdT('basic_help') }}</p></div>
                    </div>

                    <div class="pmd-coupon-form__label">{{ $pmdT('card_type') }}</div>
                    <div class="pmd-coupon-form__type-grid" data-pmd-card-types>
                        <button type="button" class="is-selected" data-pmd-card-type="coupon">
                            <svg viewBox="0 0 24 24"><path d="M4 7h16v10H4z"></path><path d="M8 7v10M16 7v10"></path><path d="M10 12h4"></path></svg><span>{{ $pmdT('coupon') }}</span>
                        </button>
                        <button type="button" data-pmd-card-type="gift_card">
                            <svg viewBox="0 0 24 24"><path d="M4 8h16v12H4z"></path><path d="M4 12h16M12 8v12"></path><path d="M9 8c-2 0-3-1-3-2.5S7 3 8.5 3C11 3 12 8 12 8"></path><path d="M15 8c2 0 3-1 3-2.5S17 3 15.5 3C13 3 12 8 12 8"></path></svg><span>{{ $pmdT('gift_card') }}</span>
                        </button>
                        <button type="button" data-pmd-card-type="voucher">
                            <svg viewBox="0 0 24 24"><path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"></path><path d="M12 7v12"></path></svg><span>{{ $pmdT('voucher') }}</span>
                        </button>
                        <button type="button" data-pmd-card-type="credit">
                            <svg viewBox="0 0 24 24"><path d="M4 7h16v10H4z"></path><path d="M8 11h8M8 14h5"></path></svg><span>{{ $pmdT('credit') }}</span>
                        </button>
                        <button type="button" data-pmd-card-type="comp">
                            <svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.3 6.8 19l1-5.8-4.3-4.1 5.9-.9z"></path></svg><span>{{ $pmdT('comp') }}</span>
                        </button>
                    </div>

                    <div class="pmd-coupon-form__grid">
                        <label class="pmd-coupon-field">
                            <span>{{ $pmdT('name') }}</span>
                            <input type="text" name="name" maxlength="128" minlength="2" required autocomplete="off" data-pmd-coupon-name>
                        </label>
                        <label class="pmd-coupon-field">
                            <span>{{ $pmdT('code') }}</span>
                            <div class="pmd-coupon-field__with-action">
                                <input type="text" name="code" maxlength="64" autocomplete="off" autocapitalize="characters" spellcheck="false" data-pmd-coupon-code>
                                <button type="button" data-pmd-generate-code>{{ $pmdT('generate') }}</button>
                            </div>
                            <small>{{ $pmdT('code_help') }}</small>
                        </label>
                        <label class="pmd-coupon-field pmd-coupon-field--full">
                            <span>{{ $pmdT('description') }}</span>
                            <textarea name="description" rows="3" maxlength="1028" data-pmd-coupon-description></textarea>
                        </label>
                    </div>
                </section>

                <section class="pmd-coupon-form__section" data-pmd-discount-section>
                    <div class="pmd-coupon-form__section-head">
                        <div class="pmd-coupon-form__section-icon is-warm"><svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="2"></circle><circle cx="16" cy="16" r="2"></circle><path d="m7 17 10-10"></path></svg></div>
                        <div><h3>{{ $pmdT('discount_section') }}</h3><p>{{ $pmdT('discount_help') }}</p></div>
                    </div>
                    <div class="pmd-coupon-form__discount-row">
                        <div class="pmd-coupon-form__segmented" data-pmd-discount-types>
                            <button type="button" class="is-selected" data-pmd-discount-type="F">{{ $pmdT('fixed') }}</button>
                            <button type="button" data-pmd-discount-type="P">{{ $pmdT('percentage') }}</button>
                        </div>
                        <label class="pmd-coupon-field">
                            <span>{{ $pmdT('discount_value') }}</span>
                            <input type="number" name="discount" min="0" max="9999999" step="0.01" inputmode="decimal" data-pmd-coupon-discount>
                        </label>
                    </div>
                </section>

                <section class="pmd-coupon-form__section" data-pmd-balance-section hidden>
                    <div class="pmd-coupon-form__section-head">
                        <div class="pmd-coupon-form__section-icon is-money"><svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"></path><path d="M8 10h8M8 14h5"></path></svg></div>
                        <div><h3>{{ $pmdT('balance_section') }}</h3><p>{{ $pmdT('balance_help') }}</p></div>
                    </div>
                    <div class="pmd-coupon-form__grid">
                        <label class="pmd-coupon-field">
                            <span>{{ $pmdT('starting_balance') }}</span>
                            <input type="number" name="initial_balance" min="0" max="9999999" step="0.01" inputmode="decimal" data-pmd-coupon-initial-balance>
                        </label>
                        <label class="pmd-coupon-field" data-pmd-current-balance-wrap hidden>
                            <span>{{ $pmdT('current_balance') }}</span>
                            <input type="text" readonly data-pmd-coupon-current-balance>
                        </label>
                    </div>
                </section>

                <section class="pmd-coupon-form__section" data-pmd-gift-section hidden>
                    <div class="pmd-coupon-form__section-head">
                        <div class="pmd-coupon-form__section-icon"><svg viewBox="0 0 24 24"><path d="M4 8h16v12H4z"></path><path d="M4 12h16M12 8v12"></path><path d="M9 8c-2 0-3-1-3-2.5S7 3 8.5 3C11 3 12 8 12 8"></path><path d="M15 8c2 0 3-1 3-2.5S17 3 15.5 3C13 3 12 8 12 8"></path></svg></div>
                        <div><h3>{{ $pmdT('gift_options') }}</h3><p>{{ $pmdT('gift_options_help') }}</p></div>
                    </div>
                    <div class="pmd-coupon-form__feature-grid">
                        <button type="button" data-pmd-gift-option="is_purchasable"><svg viewBox="0 0 24 24"><path d="M5 7h14l-1 13H6z"></path><path d="M9 9V6a3 3 0 0 1 6 0v3"></path></svg><span>{{ $pmdT('purchasable') }}</span></button>
                        <button type="button" data-pmd-gift-option="is_reloadable"><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7"></path><path d="M20 5v6h-6"></path></svg><span>{{ $pmdT('reloadable') }}</span></button>
                        <button type="button" data-pmd-gift-option="is_transferable"><svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M18 17H7l3 3"></path></svg><span>{{ $pmdT('transferable') }}</span></button>
                    </div>
                    <div class="pmd-coupon-form__grid pmd-coupon-form__grid--gift-price" data-pmd-purchase-price-wrap hidden>
                        <label class="pmd-coupon-field">
                            <span>{{ $pmdT('purchase_price') }}</span>
                            <input type="number" name="purchase_price" min="0" max="9999999" step="0.01" inputmode="decimal" data-pmd-coupon-purchase-price>
                        </label>
                    </div>
                </section>

                <section class="pmd-coupon-form__section">
                    <div class="pmd-coupon-form__section-head">
                        <div class="pmd-coupon-form__section-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></div>
                        <div><h3>{{ $pmdT('rules') }}</h3><p>{{ $pmdT('rules_help') }}</p></div>
                    </div>
                    <div class="pmd-coupon-form__grid pmd-coupon-form__grid--rules">
                        <label class="pmd-coupon-field">
                            <span>{{ $pmdT('minimum_order') }}</span>
                            <input type="number" name="min_total" min="0" max="9999999" step="0.01" inputmode="decimal" value="0" data-pmd-coupon-min-total>
                        </label>
                        <label class="pmd-coupon-field">
                            <span>{{ $pmdT('max_redemptions') }}</span>
                            <input type="number" name="redemptions" min="0" max="1000000" step="1" inputmode="numeric" value="0" data-pmd-coupon-redemptions>
                            <small>{{ $pmdT('zero_unlimited') }}</small>
                        </label>
                        <label class="pmd-coupon-field">
                            <span>{{ $pmdT('per_customer') }}</span>
                            <input type="number" name="customer_redemptions" min="0" max="1000000" step="1" inputmode="numeric" value="0" data-pmd-coupon-customer-redemptions>
                            <small>{{ $pmdT('zero_unlimited') }}</small>
                        </label>
                        <label class="pmd-coupon-field">
                            <span>{{ $pmdT('expiry_date') }}</span>
                            <input type="date" name="expiry_date" data-pmd-coupon-expiry>
                        </label>
                    </div>
                    <label class="pmd-coupon-form__switch-row">
                        <div><strong>{{ $pmdT('status') }}</strong><small>{{ $pmdT('status_help') }}</small></div>
                        <input type="hidden" name="status" value="0">
                        <input type="checkbox" name="status" value="1" checked data-pmd-coupon-status>
                        <span class="pmd-coupon-switch" aria-hidden="true"></span>
                    </label>
                </section>
            </form>
        </div>

        <footer class="pmd-coupon-modal__footer">
            <div class="pmd-coupon-modal__footer-left">
                <button type="button" class="pmd-coupon-modal__delete" data-pmd-coupon-delete hidden>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="m7 7 1 13h8l1-13"></path><path d="M10 11v5M14 11v5"></path></svg>
                    <span data-pmd-coupon-delete-label>{{ $pmdT('delete') }}</span>
                </button>
                <span class="pmd-coupon-modal__status" data-pmd-coupon-modal-status aria-live="polite"></span>
            </div>
            <div class="pmd-coupon-modal__buttons">
                <button type="button" class="pmd-coupon-modal__cancel" data-pmd-coupon-close>{{ $pmdT('cancel') }}</button>
                <button type="button" class="pmd-coupon-modal__save" data-pmd-coupon-save>{{ $pmdT('save') }}</button>
            </div>
        </footer>
    </section>
</div>
