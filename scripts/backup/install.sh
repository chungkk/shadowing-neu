#!/bin/bash
# Cài (hoặc cập nhật) backup tự động, chạy lại bao nhiêu lần cũng được. Chạy trên Mac: scripts/backup/install.sh
# VPS: cron 02:30 UTC mỗi ngày · Mac: launchd 09:00 mỗi ngày (máy ngủ thì chạy khi thức dậy) và khi đăng nhập.
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
REMOTE=oracle
LABEL=pro.ckk.shadow-backup
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Backups/shadow-new/pull.log"

ssh -o BatchMode=yes "$REMOTE" 'mkdir -p ~/shadow-backup && chmod 700 ~/shadow-backup'
scp -q "$HERE/vps-backup.sh" "$REMOTE:shadow-backup/vps-backup.sh"
ssh -o BatchMode=yes "$REMOTE" 'chmod 700 ~/shadow-backup/vps-backup.sh
  { crontab -l 2>/dev/null | grep -v "shadow-backup/vps-backup.sh" || true
    echo "30 2 * * * \$HOME/shadow-backup/vps-backup.sh >> \$HOME/shadow-backup/backup.log 2>&1"
  } | crontab -
  ~/shadow-backup/vps-backup.sh 2>&1 | tee -a ~/shadow-backup/backup.log' # chạy thử luôn: lỗi thì biết ngay, Mac cũng có bản đầu tiên để tải

mkdir -p "$HOME/Backups/shadow-new" "$HOME/Library/LaunchAgents"
chmod 700 "$HOME/Backups" "$HOME/Backups/shadow-new"
chmod +x "$HERE/mac-pull.sh"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$HERE/mac-pull.sh</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Đã cài. Bản backup ở $HOME/Backups/shadow-new · log: $LOG"
