// https://docs.expo.io/guides/customizing-metro
// https://dushyant37.medium.com/how-to-import-files-from-outside-of-root-directory-with-react-native-metro-bundler-18207a348427
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const extraNodeModules = {
  '..': path.resolve(__dirname + '/..'),
};

const watchFolders = [
  path.resolve(__dirname + '/..'),
];

module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
  resolver: {
    extraNodeModules: new Proxy(extraNodeModules, {
      get: (target, name) =>
        // redirects dependencies referenced from common/ to local node_modules
        name in target ? target[name] : path.join(process.cwd(), `node_modules/${name}`),
    }),
  },
  watchFolders,
};
