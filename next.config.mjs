import { withSentryConfig } from '@sentry/nextjs'

// /admin/learn lesson pages read repo source files at request time (lib/learn/read-source.ts).
// Nothing imports them from the route, so without this the trace leaves them out of the function.
// __tests__/learn-lessons.test.ts checks every anchored file against this list.
const LEARN_SOURCE_FILES = [
  './app/**/*.{ts,tsx}',
  './components/**/*.{ts,tsx}',
  './lib/**/*.ts',
  './types/**/*.ts',
  './__tests__/*.test.ts',
  './proxy.ts',
  './supabase/migrations/*.sql',
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Both keys: the route is matched with or without the (dashboard) group in its path
  // depending on the build stage.
  outputFileTracingIncludes: {
    '/admin/learn/**': LEARN_SOURCE_FILES,
    '/**/admin/learn/**': LEARN_SOURCE_FILES,
  },
  // Short, trustworthy-looking links for social bios. The profile shows the link text verbatim,
  // so the UTM tags live behind a same-domain redirect instead of in the visible URL.
  async redirects() {
    return [
      {
        source: '/ig',
        destination: '/?utm_source=instagram&utm_medium=bio&utm_campaign=launch',
        permanent: false,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: 'avior-0b',
  project: 'trade-analyst',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  reactComponentAnnotation: { enabled: false },
})
