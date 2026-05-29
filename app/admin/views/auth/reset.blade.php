<style>
    :root {
        --pmd-auth-bg-top: #011714;
        --pmd-auth-bg-mid: #021F1C;
        --pmd-auth-bg-bottom: #062F2A;
        --pmd-auth-surface: rgba(255, 255, 255, 0.97);
        --pmd-auth-border: rgba(200, 155, 74, 0.38);
        --pmd-auth-text: #0D1B1E;
        --pmd-auth-muted: #6B7280;
        --pmd-auth-jade: #062F2A;
        --pmd-auth-jade-dark: #021F1C;
        --pmd-auth-gold: #D7A950;
        --pmd-auth-gold-soft: #F5E8D0;
        --pmd-auth-danger: #B42318;
        --pmd-auth-success: #15803D;
    }

    html,
    body.page-login,
    body.page-login .nk-app-root,
    body.page-login .nk-main,
    body.page-login .nk-wrap,
    body.page-login .nk-content,
    body.page-login .container-fluid {
        min-height: 100vh !important;
        background:
            radial-gradient(circle at 50% 8%, rgba(215, 169, 80, 0.16), transparent 32%),
            linear-gradient(180deg, var(--pmd-auth-bg-top) 0%, #021A17 34%, var(--pmd-auth-bg-mid) 68%, var(--pmd-auth-bg-bottom) 100%) !important;
        color: var(--pmd-auth-text) !important;
    }

    body.page-login {
        overflow-x: hidden !important;
    }

    .pmd-auth-reset-page {
        position: fixed;
        inset: 0;
        z-index: 5;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
        overflow-y: auto;
        background:
            radial-gradient(circle at 50% 8%, rgba(215, 169, 80, 0.16), transparent 32%),
            linear-gradient(180deg, var(--pmd-auth-bg-top) 0%, #021A17 34%, var(--pmd-auth-bg-mid) 68%, var(--pmd-auth-bg-bottom) 100%);
    }

    .pmd-auth-reset-card {
        width: min(100%, 430px);
        border: 1px solid var(--pmd-auth-border);
        border-radius: 24px;
        background: var(--pmd-auth-surface);
        box-shadow: 0 24px 70px rgba(1, 23, 20, 0.36), 0 0 0 1px rgba(255,255,255,0.16) inset;
        padding: 30px;
        backdrop-filter: blur(10px);
    }

    .pmd-auth-reset-title {
        margin: 0 0 8px;
        color: var(--pmd-auth-text);
        font-size: 1.28rem;
        line-height: 1.25;
        font-weight: 850;
        letter-spacing: -0.025em;
        text-align: center;
    }

    .pmd-auth-reset-subtitle {
        margin: 0 auto 22px;
        max-width: 340px;
        color: var(--pmd-auth-muted);
        font-size: 0.95rem;
        line-height: 1.5;
        text-align: center;
    }

    .pmd-auth-notice {
        margin: 0 0 18px;
        border-radius: 16px;
        padding: 12px 14px;
        font-size: 0.88rem;
        line-height: 1.45;
        font-weight: 650;
    }

    .pmd-auth-notice-success {
        border: 1px solid rgba(21, 128, 61, 0.20);
        background: rgba(21, 128, 61, 0.08);
        color: var(--pmd-auth-success);
    }

    .pmd-auth-notice-error {
        border: 1px solid rgba(180, 35, 24, 0.20);
        background: rgba(180, 35, 24, 0.08);
        color: var(--pmd-auth-danger);
    }

    .pmd-auth-help {
        margin: 0 0 20px;
        border: 1px solid rgba(215, 169, 80, 0.28);
        border-radius: 16px;
        background: rgba(245, 232, 208, 0.48);
        color: var(--pmd-auth-jade);
        padding: 12px 14px;
        font-size: 0.86rem;
        line-height: 1.45;
        font-weight: 650;
    }

    .pmd-auth-reset-card form,
    .pmd-auth-reset-card .form-group,
    .pmd-auth-reset-card .form-label-group,
    .pmd-auth-reset-card .form-control-wrap,
    .pmd-auth-reset-card label,
    .pmd-auth-reset-card p {
        background: transparent !important;
        box-shadow: none !important;
    }

    .pmd-auth-reset-card .form-group {
        margin-bottom: 18px !important;
    }

    .pmd-auth-reset-card .form-label {
        display: block;
        margin-bottom: 8px;
        color: var(--pmd-auth-text) !important;
        font-weight: 800 !important;
        font-size: 0.9rem;
    }

    .pmd-auth-reset-card .form-control {
        width: 100%;
        min-height: 50px;
        border: 1px solid #E8E2D8 !important;
        border-radius: 15px !important;
        background: #FFFFFF !important;
        color: var(--pmd-auth-text) !important;
        font-size: 0.98rem;
        padding: 0 15px;
        box-shadow: 0 8px 22px rgba(6, 47, 42, 0.05) !important;
    }

    .pmd-auth-reset-card .form-control:focus {
        border-color: var(--pmd-auth-gold) !important;
        box-shadow: 0 0 0 0.18rem rgba(215, 169, 80, 0.18), 0 8px 22px rgba(6, 47, 42, 0.07) !important;
        outline: none !important;
    }

    .pmd-auth-reset-card .text-danger {
        display: block;
        margin-top: 8px;
        color: var(--pmd-auth-danger) !important;
        font-size: 0.84rem;
        font-weight: 700;
    }

    .pmd-auth-reset-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 8px;
    }

    .pmd-auth-reset-card .btn {
        min-height: 48px;
        border-radius: 15px !important;
        padding: 0 18px !important;
        font-weight: 850 !important;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: none !important;
    }

    .pmd-auth-reset-card .btn-primary {
        border: 1px solid var(--pmd-auth-jade) !important;
        background: var(--pmd-auth-jade) !important;
        color: #FFFFFF !important;
        box-shadow: 0 10px 24px rgba(6, 47, 42, 0.18) !important;
    }

    .pmd-auth-reset-card .btn-primary:hover,
    .pmd-auth-reset-card .btn-primary:focus,
    .pmd-auth-reset-card .btn-primary:active {
        border-color: var(--pmd-auth-jade-dark) !important;
        background: var(--pmd-auth-jade-dark) !important;
        color: #FFFFFF !important;
    }

    .pmd-auth-reset-card .btn-default {
        border: 1px solid #E8E2D8 !important;
        background: #FFFFFF !important;
        color: var(--pmd-auth-jade) !important;
    }

    .pmd-auth-reset-card .btn-default:hover,
    .pmd-auth-reset-card .btn-default:focus {
        border-color: var(--pmd-auth-gold) !important;
        background: var(--pmd-auth-gold-soft) !important;
        color: var(--pmd-auth-jade) !important;
    }

    @media (max-width: 575.98px) {
        .pmd-auth-reset-page {
            align-items: center;
            padding: 18px 12px;
        }

        .pmd-auth-reset-card {
            width: min(100%, 390px);
            padding: 24px 20px;
            border-radius: 22px;
        }

        .pmd-auth-reset-actions {
            flex-direction: column-reverse;
            align-items: stretch;
        }

        .pmd-auth-reset-card .btn {
            width: 100%;
        }
    }

    /* PMD final reset polish: jade button + shorter helper copy styling */
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card button.btn.btn-primary,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card button.btn.btn-primary[data-attach-loading],
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card .btn.btn-primary {
        min-height: 48px !important;
        border: 1px solid #062F2A !important;
        border-radius: 15px !important;
        background: #062F2A !important;
        background-color: #062F2A !important;
        color: #FFFFFF !important;
        -webkit-text-fill-color: #FFFFFF !important;
        font-weight: 850 !important;
        box-shadow: 0 10px 24px rgba(6, 47, 42, 0.22) !important;
        transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease !important;
    }

    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card button.btn.btn-primary:hover,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card button.btn.btn-primary:focus,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card button.btn.btn-primary:active {
        border-color: #021F1C !important;
        background: #021F1C !important;
        background-color: #021F1C !important;
        color: #FFFFFF !important;
        -webkit-text-fill-color: #FFFFFF !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 14px 30px rgba(2, 31, 28, 0.28) !important;
    }

    html body.page-login .pmd-auth-reset-page .pmd-auth-help {
        margin-bottom: 22px !important;
        font-size: 0.86rem !important;
        line-height: 1.42 !important;
        color: #062F2A !important;
    }

    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-subtitle {
        max-width: 360px !important;
        font-size: 0.93rem !important;
        line-height: 1.48 !important;
    }


    /* PMD auth final cleanup: reset page darker top + unified action buttons */
    html,
    body.page-login,
    body.page-login .nk-app-root,
    body.page-login .nk-main,
    body.page-login .nk-wrap,
    body.page-login .nk-content,
    body.page-login .container-fluid,
    body.page-login .pmd-auth-reset-page {
        background:
            radial-gradient(circle at 50% 10%, rgba(215, 169, 80, 0.08), transparent 34%),
            linear-gradient(180deg, #00110F 0%, #011714 26%, #021A17 52%, #021F1C 78%, #062F2A 100%) !important;
        background-color: #011714 !important;
    }

    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card {
        background: rgba(255, 255, 255, 0.97) !important;
        border: 1px solid rgba(215, 169, 80, 0.38) !important;
        box-shadow: 0 24px 70px rgba(1, 23, 20, 0.36), 0 0 0 1px rgba(255,255,255,0.14) inset !important;
    }

    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-actions,
    html body.page-login .pmd-auth-reset-page .form-group.pmd-auth-reset-actions {
        width: 100% !important;
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 14px !important;
        align-items: stretch !important;
        margin-top: 22px !important;
    }

    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-actions .btn,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-actions a.btn,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-actions button.btn,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card .btn.btn-default,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card .btn.btn-primary {
        width: 100% !important;
        min-width: 0 !important;
        height: 48px !important;
        min-height: 48px !important;
        max-height: 48px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 18px !important;
        border-radius: 15px !important;
        font-size: 0.94rem !important;
        font-weight: 850 !important;
        line-height: 1 !important;
        text-align: center !important;
        white-space: nowrap !important;
        text-decoration: none !important;
        transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease, box-shadow 160ms ease !important;
    }

    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card .btn.btn-default,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-actions a.btn.btn-default {
        border: 1px solid #E8E2D8 !important;
        background: #FFFFFF !important;
        background-color: #FFFFFF !important;
        color: #062F2A !important;
        -webkit-text-fill-color: #062F2A !important;
        box-shadow: 0 8px 18px rgba(6, 47, 42, 0.08) !important;
    }

    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card .btn.btn-default:hover,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card .btn.btn-default:focus,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card .btn.btn-default:active {
        border-color: #D7A950 !important;
        background: #F5E8D0 !important;
        background-color: #F5E8D0 !important;
        color: #062F2A !important;
        -webkit-text-fill-color: #062F2A !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 12px 24px rgba(6, 47, 42, 0.12) !important;
    }

    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card .btn.btn-primary,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-actions button.btn.btn-primary,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-actions button.btn.btn-primary[data-attach-loading] {
        border: 1px solid #062F2A !important;
        background: #062F2A !important;
        background-color: #062F2A !important;
        color: #FFFFFF !important;
        -webkit-text-fill-color: #FFFFFF !important;
        box-shadow: 0 10px 24px rgba(6, 47, 42, 0.22) !important;
    }

    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card .btn.btn-primary:hover,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card .btn.btn-primary:focus,
    html body.page-login .pmd-auth-reset-page .pmd-auth-reset-card .btn.btn-primary:active {
        border-color: #021F1C !important;
        background: #021F1C !important;
        background-color: #021F1C !important;
        color: #FFFFFF !important;
        -webkit-text-fill-color: #FFFFFF !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 14px 30px rgba(2, 31, 28, 0.28) !important;
    }

    html body.page-login .pmd-auth-reset-page .pmd-auth-help {
        margin-bottom: 22px !important;
        padding: 14px 16px !important;
        border-color: rgba(215, 169, 80, 0.34) !important;
        background: rgba(245, 232, 208, 0.72) !important;
        color: #062F2A !important;
        font-size: 0.86rem !important;
        line-height: 1.42 !important;
    }

    @media (max-width: 575.98px) {
        html body.page-login .pmd-auth-reset-page .pmd-auth-reset-actions,
        html body.page-login .pmd-auth-reset-page .form-group.pmd-auth-reset-actions {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
        }
    }


<style>
/* PMD reset page final help position: small text under buttons, no big frame */
html body .pmd-auth-reset-page .pmd-auth-help,
html body .pmd-auth-reset-card .pmd-auth-help {
    display: none !important;
}

html body .pmd-auth-reset-page .pmd-auth-help-inline,
html body .pmd-auth-reset-card .pmd-auth-help-inline {
    display: block !important;
    width: 100% !important;
    margin: 14px 0 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: #6B7280 !important;
    -webkit-text-fill-color: #6B7280 !important;
    font-size: 13px !important;
    line-height: 1.45 !important;
    font-weight: 500 !important;
    text-align: center !important;
}

html body .pmd-auth-reset-page .pmd-auth-reset-actions,
html body .pmd-auth-reset-card .pmd-auth-reset-actions {
    margin-bottom: 0 !important;
}
</style>

</style>

<div class="pmd-auth-reset-page">
    <div class="pmd-auth-reset-card">
        <h5 class="pmd-auth-reset-title">
            @empty($resetCode)
                Reset your password
            @else
                Create a new password
            @endempty
        </h5>

        <p class="pmd-auth-reset-subtitle">
            @empty($resetCode)
                Enter your email to receive reset instructions.
            @else
                Choose a new secure password for your Please check your email for reset instructions..
            @endempty
        </p>

        @if (input('sent') == '1')
            <div class="pmd-auth-notice pmd-auth-notice-success">
                Please check your email for reset instructions.
            </div>
        @endif

        @if (input('failed') == '1')
            <div class="pmd-auth-notice pmd-auth-notice-error">
                This reset link is invalid or expired. Please request a new password reset link.
            </div>
        @endif

        @empty($resetCode)
@endempty

        {!! form_open(current_url(),
            [
                'id' => 'edit-form',
                'role' => 'form',
                'method' => 'POST',
                'data-request' => empty($resetCode) ? 'onRequestResetPassword' : 'onResetPassword',
            ]
        ) !!}

        @empty($resetCode)
            <div class="form-group">
                <label for="input-user" class="form-label">@lang('admin::lang.label_email')</label>
                <div class="form-control-wrap">
                    <input
                        name="email"
                        type="email"
                        id="input-user"
                        class="form-control"
                        placeholder="Enter your email"
                        autocomplete="email"
                    />
                    {!! form_error('email', '<span class="text-danger">', '</span>') !!}
                </div>
            </div>
        @else
            <input type="hidden" name="code" value="{{ $resetCode }}">
            <div class="form-group">
                <label for="password" class="form-label">@lang('admin::lang.login.label_password')</label>
                <input
                    type="password"
                    id="password"
                    class="form-control"
                    name="password"
                    placeholder="@lang('admin::lang.login.label_password')"
                    autocomplete="new-password"
                />
                {!! form_error('password', '<span class="text-danger">', '</span>') !!}
            </div>
            <div class="form-group">
                <label for="password-confirm" class="form-label">@lang('admin::lang.login.label_password_confirm')</label>
                <input
                    type="password"
                    id="password-confirm"
                    class="form-control"
                    name="password_confirm"
                    placeholder="@lang('admin::lang.login.label_password_confirm')"
                    autocomplete="new-password"
                />
                {!! form_error('password_confirm', '<span class="text-danger">', '</span>') !!}
            </div>
        @endempty

        
        <div id="pmd-reset-inline-message" class="pmd-reset-inline-message" role="status" aria-live="polite" hidden>
            <strong>Check your email</strong>
            <span>Please check your email for reset instructions.</span>
        </div>

        <div class="form-group pmd-auth-reset-actions">
            <a class="btn btn-default" href="{{ admin_url('login') }}">
                @lang('admin::lang.login.text_back_to_login')
            </a>
            <button type="submit" class="btn btn-primary" data-attach-loading="">
                @lang('admin::lang.login.button_reset_password')
            </button>
        </div>
{!! form_close() !!}
    </div>
</div>


<style>
/* PMD HARD FINAL reset page fix: no top flash, no admin wording */
html .flash-message,
html .alert.flash-message,
html .alert-success.flash-message,
html .alert-dismissible.flash-message,
html .animated.flash-message,
html .fadeInDown.flash-message,
html .fadeOutUp.flash-message,
html [data-allow-dismiss="true"].flash-message {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
}

html body .pmd-auth-reset-page .pmd-reset-inline-message {
    width: 100% !important;
    margin: 18px 0 0 0 !important;
    padding: 14px 16px !important;
    border: 1px solid rgba(21, 128, 61, 0.24) !important;
    border-left: 4px solid #15803D !important;
    border-radius: 16px !important;
    background: rgba(240, 253, 244, 0.96) !important;
    color: #14532D !important;
    box-shadow: 0 12px 28px rgba(21, 128, 61, 0.10) !important;
    font-size: 0.88rem !important;
    line-height: 1.45 !important;
}

html body .pmd-auth-reset-page .pmd-reset-inline-message strong {
    display: block !important;
    margin-bottom: 4px !important;
    color: #15803D !important;
    font-weight: 850 !important;
}

html body .pmd-auth-reset-page .pmd-reset-inline-message span {
    display: block !important;
    color: #14532D !important;
}

html body .pmd-auth-reset-page .pmd-auth-reset-actions,
html body .pmd-auth-reset-page .form-group.pmd-auth-reset-actions {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 14px !important;
    align-items: stretch !important;
}

html body .pmd-auth-reset-page .pmd-auth-reset-actions .btn,
html body .pmd-auth-reset-page .pmd-auth-reset-actions a.btn,
html body .pmd-auth-reset-page .pmd-auth-reset-actions button.btn {
    width: 100% !important;
    height: 48px !important;
    min-height: 48px !important;
    max-height: 48px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 18px !important;
    border-radius: 15px !important;
    font-size: 0.94rem !important;
    font-weight: 850 !important;
    line-height: 1 !important;
    text-align: center !important;
    white-space: nowrap !important;
    text-decoration: none !important;
}

html body .pmd-auth-reset-page .pmd-auth-reset-actions .btn.btn-default {
    border: 1px solid #E8E2D8 !important;
    background: #FFFFFF !important;
    color: #062F2A !important;
    -webkit-text-fill-color: #062F2A !important;
    box-shadow: 0 8px 18px rgba(6, 47, 42, 0.08) !important;
}

html body .pmd-auth-reset-page .pmd-auth-reset-actions .btn.btn-primary {
    border: 1px solid #062F2A !important;
    background: #062F2A !important;
    background-color: #062F2A !important;
    color: #FFFFFF !important;
    -webkit-text-fill-color: #FFFFFF !important;
    box-shadow: 0 10px 24px rgba(6, 47, 42, 0.22) !important;
}

html body .pmd-auth-reset-page .pmd-auth-reset-actions .btn.btn-primary:hover {
    border-color: #021F1C !important;
    background: #021F1C !important;
    background-color: #021F1C !important;
}

@media (max-width: 575.98px) {
    html body .pmd-auth-reset-page .pmd-auth-reset-actions,
    html body .pmd-auth-reset-page .form-group.pmd-auth-reset-actions {
        grid-template-columns: 1fr !important;
    }
}
</style>
