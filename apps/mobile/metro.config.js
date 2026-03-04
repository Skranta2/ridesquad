// Disable Watchman to avoid macOS permission issues (e.g. Desktop folder restrictions).
// Keep Expo's default Metro configuration.

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force Metro to use the Node file crawler instead of Watchman.
config.resolver.useWatchman = false;

module.exports = config;
