'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { trackEvent } from '@/lib/analytics/posthog'

// Google Identity Services (GIS) instead of Supabase's redirect OAuth flow. The redirect flow
// sends Google to <ref>.supabase.co/auth/v1/callback, so Google's account chooser shows the
// Supabase project domain; GIS runs from our own origin, so it shows tradeanalyst.app. The
// ID token GIS returns is exchanged for a session with signInWithIdToken — no /auth/callback hop.

type CredentialResponse = { credential: string }

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string
    callback: (response: CredentialResponse) => void
    nonce: string
    ux_mode: 'popup'
    context: 'signin' | 'signup'
  }) => void
  renderButton: (
    parent: HTMLElement,
    options: {
      type: 'standard'
      theme: 'filled_black'
      size: 'large'
      text: 'signin_with' | 'signup_with'
      shape: 'rectangular'
      logo_alignment: 'center'
      width: number
      locale: string
      click_listener: () => void
    },
  ) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

type Props = {
  next?: string
  mode?: 'signin' | 'signup'
}

// Supabase expects Google to have seen the SHA-256 hex of the nonce and signInWithIdToken to
// get the raw value.
async function generateNonce(): Promise<[raw: string, hashed: string]> {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  return [raw, hashed]
}

export function GoogleSignInButton({ next = '/research', mode = 'signin' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const gis = window.google?.accounts.id
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!scriptReady || !container || !gis) return
    if (!clientId) throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set')

    let cancelled = false
    generateNonce().then(([rawNonce, hashedNonce]) => {
      if (cancelled) return
      gis.initialize({
        client_id: clientId,
        nonce: hashedNonce,
        ux_mode: 'popup',
        context: mode,
        callback: async ({ credential }) => {
          setError(null)
          setLoading(true)
          const { createClient } = await import('@/lib/supabase/client')
          const { error } = await createClient().auth.signInWithIdToken({
            provider: 'google',
            token: credential,
            nonce: rawNonce,
          })
          if (error) {
            trackEvent('google_signin_failed', { next, supabaseError: error.message })
            setError('שגיאה בהתחברות עם Google')
            setLoading(false)
            return
          }
          // Full navigation, not router.push: the server layout must see the new session cookie.
          window.location.assign(next)
        },
      })
      container.replaceChildren()
      gis.renderButton(container, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: mode === 'signup' ? 'signup_with' : 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'center',
        // GIS takes a fixed pixel width, capped at 400.
        width: Math.min(400, container.clientWidth),
        locale: 'he',
        click_listener: () => trackEvent('google_signin_clicked', { next }),
      })
    })
    return () => {
      cancelled = true
    }
  }, [scriptReady, mode, next])

  return (
    <div className="space-y-2">
      <Script src="https://accounts.google.com/gsi/client" onReady={() => setScriptReady(true)} />
      <div ref={containerRef} className="flex justify-center min-h-10" aria-busy={loading} />
      {loading && <p className="text-text-dim text-sm text-center">מתחבר...</p>}
      {error && <p className="text-red text-sm text-center">{error}</p>}
    </div>
  )
}
