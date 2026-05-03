const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const config = {
  resolver: {
    blockList: [/node_modules\/.*\/android\/build\/.*/],
  },
};
module.exports = mergeConfig(getDefaultConfig(__dirname), config);
