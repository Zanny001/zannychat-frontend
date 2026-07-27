module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated v4 moved its Babel plugin into react-native-worklets.
    // Must still be listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};
