// Phần cấu hình phụ thuộc biến môi trường (.env) — phần cố định nằm trong app.json.
// Đăng nhập Google cần URL scheme = iOS client ID viết ngược; chưa có client ID thì bỏ qua (nút Google tự ẩn).
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!iosClientId) return config;
  const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, "")}`;
  return { ...config, plugins: [...config.plugins, ["@react-native-google-signin/google-signin", { iosUrlScheme }]] };
};
