module.exports = {
  productionBrowserSourceMaps: true,

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
  publicRuntimeConfig: {
    NEXT_PUBLIC_APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN,
    NEXT_PUBLIC_GROWTHBOOK_API_HOST:
      process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST,
    NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY:
      process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        pathname: '**',
      },
    ],
  },
  eslint: {
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
};
