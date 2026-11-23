import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXT_DIR = path.join(ROOT, "extension");
const DIST_DIR = path.join(ROOT, "dist");

const manifestPath = path.join(EXT_DIR, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const version = String(manifest.version || "1.0.0").trim();

// 1. Kiểm tra an toàn trước khi đóng gói nộp Chrome Web Store
const hostPerms = manifest.host_permissions || [];
for (const p of hostPerms) {
  if (/localhost|127\.0\.0\.1|\*:\/\/\*\//i.test(p) || p === "https://*/*" || p === "http://*/*") {
    throw new Error(`host_permissions chứa quyền không đạt chuẩn Store: ${p}`);
  }
}

const runtimeFiles = [
  "manifest.json",
  "background.js",
  "content.js",
  "content.css",
  "yt-hook.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
];

for (const rel of runtimeFiles) {
  const full = path.join(EXT_DIR, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Thiếu file bắt buộc trong extension/: ${rel}`);
  }
  if (rel.endsWith(".js")) {
    execFileSync(process.execPath, ["--check", full], { stdio: "inherit" });
  }
}

// 2. Đóng gói file .zip sạch (chỉ gồm runtime files, không chứa README / STORE_LISTING)
fs.mkdirSync(DIST_DIR, { recursive: true });
const outZip = path.join(DIST_DIR, `hallovn-extension-v${version}.zip`);
if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

execFileSync("zip", ["-r", "-q", outZip, ...runtimeFiles], { cwd: EXT_DIR, stdio: "inherit" });

const stat = fs.statSync(outZip);
console.log(`Đã đóng gói thành công: ${path.relative(ROOT, outZip)} (${(stat.size / 1024).toFixed(1)} KB)`);
