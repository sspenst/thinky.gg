module.exports = {
  productionBrowserSourceMaps: true,

  // Optimize output for faster builds
  output: 'standalone',
  
  // Reduce build traces collection time
  outputFileTracingIncludes: {
    '/': ['./constants/**/*', './lib/**/*', './models/**/*', './helpers/**/*'],
  },

  // Enable experimental features for better performance
  experimental: {
    // Optimize CSS loading
    optimizeCss: true,
  },

  // Optimize webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Enable module concatenation for smaller bundles (client only)
      config.optimization.concatenateModules = true;
      
      // Optimize chunk splitting for client bundles only
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk for node_modules
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Common chunk for shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Separate chunks for large libraries
          react: {
            name: 'react',
            test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          recharts: {
            name: 'recharts',
            test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
            chunks: 'all',
            priority: 25,
          },
          three: {
            name: 'three',
            test: /[\\/]node_modules[\\/]three[\\/]/,
            chunks: 'all',
            priority: 25,
          },
        },
      };

      // Use deterministic module ids for long-term caching
      config.optimization.moduleIds = 'deterministic';
    }

    // Add module resolution alias for faster builds
    // Note: Removed lodash alias as it causes issues with recharts

    return config;
  },

  // Optimize TypeScript checking
  typescript: {
    // Skip type checking during builds (run separately)
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
  },

  // Optimize ESLint checking
  eslint: {
    // Skip linting during builds (run separately)
    ignoreDuringBuilds: process.env.SKIP_LINT === 'true',
    dirs: [
      'components',
      'constants',
      'contexts',
      'helpers',
      'hooks',
      'lib',
      'models',
      'pages',
      'tests',
    ],
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
