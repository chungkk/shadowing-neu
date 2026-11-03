#!/bin/bash
# Chạy trên Mac (launchd): tải các bản backup mới từ VPS về ~/Backups/shadow-new, kiểm tra từng bản, báo khi có lỗi hoặc quá cũ.
set -uo pipefail
umask 077
export PATH=/usr/bin:/bin:/usr/sbin:/sbin

REMOTE=oracle
REMOTE_DIR=shadow-backup/archive
DEST="$HOME/Backups/shadow-new"
KEEP=60 # đếm theo số bản nên backup có ngừng chạy cũng không tự xoá hết
MAX_AGE_DAYS=3

log() { echo "[$(date -u +%FT%TZ)] $*"; }
alert() {
  log "LỖI: $1"
  osascript -e "display notification \"$1\" with title \"Backup Deutsch Shadowing\" sound name \"Basso\"" >/dev/null 2>&1 || true
}

mkdir -p "$DEST"

# Bản mới nhất có file checksum đi kèm; tải vào .incoming để bản chưa kiểm tra không lẫn với bản tốt
incoming="$DEST/.incoming"
mkdir -p "$incoming"
if ! scp -pq -o BatchMode=yes -o ConnectTimeout=20 "$REMOTE:$REMOTE_DIR/shadow-*" "$incoming/"; then
  alert "Không tải được từ VPS"
fi

for f in "$incoming"/shadow-*.tar.gz; do
  [ -e "$f" ] || continue
  name=$(basename "$f")
  if [ -e "$DEST/$name" ]; then rm -f "$f" "$f.sha256"; continue; fi

  ok=1
  (cd "$incoming" && shasum -a 256 -c "$name.sha256" >/dev/null 2>&1) || ok=0
  check=$(mktemp -d)
  if [ "$ok" = 1 ]; then
    tar -xzf "$f" -C "$check" shadow.db 2>/dev/null || ok=0
    [ "$(sqlite3 -readonly "$check/shadow.db" 'PRAGMA quick_check' 2>/dev/null)" = "ok" ] || ok=0
  fi
  if [ "$ok" = 1 ]; then
    users=$(sqlite3 -readonly "$check/shadow.db" 'SELECT COUNT(*) FROM users')
    lessons=$(sqlite3 -readonly "$check/shadow.db" 'SELECT COUNT(*) FROM lessons')
    mv "$f" "$f.sha256" "$DEST/"
    log "OK $name ($users người dùng, $lessons bài)"
  else
    rm -f "$f" "$f.sha256"
    alert "Bản $name bị hỏng, đã bỏ"
  fi
  rm -rf "$check"
done

ls -1t "$DEST"/shadow-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do rm -f "$old" "$old.sha256"; done

# VPS ngừng tạo bản mới thì scp vẫn thành công → phải tự kiểm tra độ mới
if [ -z "$(find "$DEST" -maxdepth 1 -name 'shadow-*.tar.gz' -mtime -"$MAX_AGE_DAYS" -print -quit)" ]; then
  alert "Không có bản backup nào mới hơn $MAX_AGE_DAYS ngày"
  exit 1
fi
