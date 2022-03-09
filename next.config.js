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
        ],
        destination: 'https://pathology.sspenst.com/:path*',
        permanent: true,
      },
    ]
  },
}
