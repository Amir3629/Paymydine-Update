import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { NextRequest } from 'next/server'

const PMD_ROOT = process.env.PMD_LARAVEL_ROOT || '/var/www/paymydine'
const APPLE_PAY_DIR = path.join(PMD_ROOT, 'storage', 'app', 'pmd-wallets', 'apple-pay')

export const dynamic = 'force-dynamic'

function requestHost(request: NextRequest): string {
  const forwarded = String(request.headers.get('x-forwarded-host') || '').split(',')[0].trim()
  const raw = forwarded || String(request.headers.get('host') || '').trim()
  return raw.replace(/:\d+$/, '').toLowerCase()
}

function safeHost(host: string): boolean {
  return host.length > 0
    && host.length <= 253
    && !host.includes('..')
    && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host)
}

export async function GET(request: NextRequest) {
  const host = requestHost(request)
  if (!safeHost(host)) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const association = await readFile(path.join(APPLE_PAY_DIR, `${host}.bin`))
    if (association.length < 64 || association.length > 128 * 1024) {
      return new Response('Not found', { status: 404 })
    }

    return new Response(association, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=300',
        'X-PMD-Wallet-Authority': 'apple-pay-domain-managed-r3',
      },
    })
  } catch {
    return new Response('Apple Pay domain file is not configured for this tenant.', {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
        'X-PMD-Wallet-Authority': 'apple-pay-domain-managed-r3',
      },
    })
  }
}
