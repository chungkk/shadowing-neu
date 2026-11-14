// Cho app import code dùng chung với web (../src/lib: gộp câu, chấm chính tả, luật chấm thi) và dữ liệu câu hỏi (../src/content)
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../src/lib"), path.resolve(__dirname, "../src/content")];

module.exports = config;
