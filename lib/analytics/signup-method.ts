const FRESH_ACCOUNT_MS = 5 * 60 * 1000

/** A Supabase user created moments ago is a signup; an older one is a returning login. */
export function isFreshAccount(createdAt: string | undefined, now = Date.now()): boolean {
  if (!createdAt) return false
  const created = Date.parse(createdAt)
  if (Number.isNaN(created)) return false
  const age = now - created
  return age >= 0 && age < FRESH_ACCOUNT_MS
}

/** `app_metadata.provider` from Supabase. Anything other than Google is the email path. */
export function signupMethodFromProvider(provider: unknown): 'email' | 'google' {
  return provider === 'google' ? 'google' : 'email'
}
