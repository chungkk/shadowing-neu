#!/usr/bin/env bash
# Chạy trên VPS (cron): chụp SQLite + ảnh đại diện từ container đang chạy → ~/shadow-backup/archive/shadow-<giờ UTC>.tar.gz
# Không đọc thẳng file .db vì có thể đang ghi dở: VACUUM INTO tạo bản sao nhất quán. Không có cache TTS (tạo lại được).
set -euo pipefail
umask 077 # bản sao có email + hash mật khẩu
export PATH=/usr/local/bin:/usr/bin:/bin

APP_PREFIX=mmmxvvm5awcsrqv8wdadovea-
ARCHIVE="$HOME/shadow-backup/archive"
KEEP=7 # trên VPS chỉ giữ 7 bản; đếm theo số bản nên backup có ngừng chạy cũng không tự xoá hết

log() { echo "[$(date -u +%FT%TZ)] $*"; }

container=$(docker ps --filter "health=healthy" --format '{{.Names}}' | grep "^$APP_PREFIX" | head -1 || true)
[ -n "$container" ] || { log "LỖI: không có container app nào đang healthy"; exit 1; }

stamp=$(date -u +%Y%m%dT%H%M%SZ)
tmp_db="/tmp/backup-$stamp.db"
work=$(mktemp -d)
cleanup() {
  docker exec "$container" rm -f "$tmp_db" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

docker exec "$container" node --no-warnings -e '
  const { DatabaseSync } = require("node:sqlite");
  const [src, dst] = process.argv.slice(1);
  const db = new DatabaseSync(src, { readOnly: true, timeout: 10000 });
  db.exec(`VACUUM INTO ${JSON.stringify(dst).replace(/"/g, "\x27")}`);
  db.close();
  const copy = new DatabaseSync(dst, { readOnly: true });
  const r = copy.prepare("PRAGMA quick_check").get().quick_check;
  if (r !== "ok") throw new Error("quick_check: " + r);
' /app/data/shadow.db "$tmp_db"

docker cp -q "$container:$tmp_db" "$work/shadow.db"
docker cp -q "$container:/app/data/avatars" "$work/avatars"

mkdir -p "$ARCHIVE"
file="shadow-$stamp.tar.gz"
tar -czf "$ARCHIVE/.$file.part" -C "$work" shadow.db avatars
mv "$ARCHIVE/.$file.part" "$ARCHIVE/$file" # đổi tên sau cùng: Mac không bao giờ tải phải file đang ghi dở
(cd "$ARCHIVE" && sha256sum "$file" > "$file.sha256")

ls -1t "$ARCHIVE"/shadow-*.tar.gz | tail -n +$((KEEP + 1)) | while read -r old; do rm -f "$old" "$old.sha256"; done
log "OK $file ($(du -h "$ARCHIVE/$file" | cut -f1))"
