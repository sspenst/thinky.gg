module.exports = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.pathology.sspenst.com',
          },
          {
            type: 'host',
            value: 'pathology.sspenst.com',
          },
          {
            type: 'host',
            value: 'www.pathology.k2xl.com',
          },
        ],
        destination: 'https://pathology.k2xl.com/:path*',
        permanent: true,
      },
    ];
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
