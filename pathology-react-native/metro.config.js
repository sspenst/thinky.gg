// Learn more https://docs.expo.io/guides/customizing-metro
// const { getDefaultConfig } = require('expo/metro-config');

// const config = getDefaultConfig(__dirname);

// module.exports = config;

const path = require('path');

const extraNodeModules = {
  '../constants': path.resolve(__dirname + '/../constants'),
  '../models': path.resolve(__dirname + '/../models'),
};

const watchFolders = [
  path.resolve(__dirname + '/../constants'),
  path.resolve(__dirname + '/../models'),
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
        //redirects dependencies referenced from common/ to local node_modules
        name in target ? target[name] : path.join(process.cwd(), `node_modules/${name}`),
    }),
  },
  watchFolders,
};