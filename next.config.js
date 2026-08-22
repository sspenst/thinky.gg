module.exports = {
  productionBrowserSourceMaps: false,

  // Optimize output for faster builds
  // output: 'standalone',

  // Reduce build traces collection time
  outputFileTracingIncludes: {
    '/': ['./constants/**/*', './lib/**/*', './models/**/*', './helpers/**/*'],
  },
  outputFileTracingRoot: __dirname,

  // Enable experimental features for better performance
  experimental: {
    // Optimize CSS loading
    optimizeCss: true,
  },

  // Optimize TypeScript checking
  typescript: {
    // Skip type checking during builds (run separately)
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
  },

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'pathology.gg',
          },
          {
            type: 'host',
            value: 'www.pathology.gg',
          },
          {
            type: 'host',
            value: 'www.thinky.gg',
          },
        ],
        destination: 'https://thinky.gg/:path*',
        permanent: true,
      },
    ];
  },
  // TODO: can remove this a few months after updating the app
  async rewrites() {
    return [
      {
        source: '/api/notification-push-token',
        destination: '/api/device',
      },
      // PostHog proxy rules removed - now handled by Nginx for better performance
      // and to prevent analytics traffic from appearing in application metrics
    ];
  },
  // PostHog proxy rules removed - now handled by Nginx for better performance
  // and to prevent analytics traffic from appearing in application metrics
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        pathname: '**',
      },
    ],
  },
};
