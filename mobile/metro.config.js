// Cho app import code dùng chung với web (../src/lib: gộp câu, chấm chính tả, đọc link YouTube)
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../src/lib")];

module.exports = config;
