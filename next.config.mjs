import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
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
