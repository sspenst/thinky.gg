module.exports = {
  async redirects() {
    return [{
      source: '/:path*',
      has: [
        {
          type: 'host',
          value: 'www.pathology.k2xl.com',
        },
      ],
      destination: 'https://pathology.k2xl.com/:path*',
      permanent: true,
    }];
  },
  images: {
    domains: ['i.imgur.com'],
  },
  eslint: {
    dirs: [
      '',
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
  experimental: {
    // This is experimental but can
    // be enabled to allow parallel threads
    // with nextjs automatic static generation
    workerThreads: false,
    cpus: 1
  },
};
