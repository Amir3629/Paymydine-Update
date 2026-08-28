'use client'

// PMD_PAYMOB_OMAN_PHONE_DIALOG_R11
// Paymob requires a real customer phone number in billing_data. Keep it only in
// this browser tab; PMD does not persist it in the payment-attempt table.
const SESSION_KEY = 'pmd-v2:paymob-oman:customer-phone:r11'

function validPhone(value: string): boolean {
  const clean = value.trim()
  if (clean.length < 7 || clean.length > 32) return false
  const digits = clean.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 18
}

function cachedPhone(): string {
  try {
    const value = window.sessionStorage.getItem(SESSION_KEY) || ''
    return validPhone(value) ? value : ''
  } catch {
    return ''
  }
}

export async function requestPaymobCustomerPhone(): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Paymob checkout must start in the browser.')
  }

  const existing = cachedPhone()
  if (existing) return existing

  return new Promise<string>((resolve, reject) => {
    const overlay = document.createElement('div')
    overlay.setAttribute('data-pmd-paymob-phone-r11', '')
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '2147483000', display: 'grid', placeItems: 'center',
      padding: '20px', background: 'rgba(10, 31, 27, .42)', backdropFilter: 'blur(8px)',
    })

    const card = document.createElement('section')
    card.setAttribute('role', 'dialog')
    card.setAttribute('aria-modal', 'true')
    card.setAttribute('aria-label', 'Phone number for secure payment')
    Object.assign(card.style, {
      width: 'min(440px, calc(100vw - 32px))', borderRadius: '22px', background: '#fff',
      border: '1px solid rgba(20, 74, 61, .14)', boxShadow: '0 28px 80px rgba(5, 32, 27, .24)',
      padding: '24px', color: '#16312a', fontFamily: 'inherit',
    })

    const title = document.createElement('h2')
    title.textContent = 'Phone number for payment'
    Object.assign(title.style, { margin: '0 0 8px', fontSize: '21px', lineHeight: '1.2' })

    const copy = document.createElement('p')
    copy.textContent = 'Paymob requires a customer phone number to open its secure Oman checkout. It is kept only for this browser tab.'
    Object.assign(copy.style, { margin: '0 0 18px', color: '#63756f', fontSize: '14px', lineHeight: '1.55' })

    const input = document.createElement('input')
    input.type = 'tel'
    input.inputMode = 'tel'
    input.autocomplete = 'tel'
    input.placeholder = '+968 9XXX XXXX'
    input.setAttribute('aria-label', 'Customer phone number')
    Object.assign(input.style, {
      width: '100%', height: '50px', boxSizing: 'border-box', border: '1px solid #d7e5e0',
      borderRadius: '13px', padding: '0 14px', fontSize: '16px', outline: 'none', color: '#17372f',
    })

    const error = document.createElement('div')
    Object.assign(error.style, { minHeight: '20px', marginTop: '7px', color: '#b42318', fontSize: '12px' })

    const actions = document.createElement('div')
    Object.assign(actions.style, { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' })

    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.textContent = 'Cancel'
    Object.assign(cancel.style, {
      minHeight: '44px', padding: '9px 16px', border: '1px solid #d6e4df', borderRadius: '12px',
      background: '#fff', color: '#17372f', fontWeight: '700', cursor: 'pointer',
    })

    const confirm = document.createElement('button')
    confirm.type = 'button'
    confirm.textContent = 'Continue to Paymob'
    Object.assign(confirm.style, {
      minHeight: '44px', padding: '9px 16px', border: '1px solid #123d32', borderRadius: '12px',
      background: '#123d32', color: '#fff', fontWeight: '800', cursor: 'pointer',
    })

    let closed = false
    const cleanup = () => {
      if (closed) return
      closed = true
      document.removeEventListener('keydown', onKey)
      overlay.remove()
    }
    const fail = () => {
      cleanup()
      reject(new Error('Paymob payment was cancelled before checkout opened.'))
    }
    const submit = () => {
      const value = input.value.trim()
      if (!validPhone(value)) {
        error.textContent = 'Enter a valid phone number, including country code when applicable.'
        input.focus()
        return
      }
      try { window.sessionStorage.setItem(SESSION_KEY, value) } catch {}
      cleanup()
      resolve(value)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') fail()
      if (event.key === 'Enter') submit()
    }

    cancel.addEventListener('click', fail)
    confirm.addEventListener('click', submit)
    overlay.addEventListener('click', (event) => { if (event.target === overlay) fail() })
    document.addEventListener('keydown', onKey)

    actions.append(cancel, confirm)
    card.append(title, copy, input, error, actions)
    overlay.appendChild(card)
    document.body.appendChild(overlay)
    window.setTimeout(() => input.focus(), 0)
  })
}
