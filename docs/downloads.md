# File tải về: ckk.biz/download/

Các file tải trực tiếp (APK Android của Führerschein Theorie và Leben in Deutschland) không nằm trong repo HalloVN.
Chúng nằm trên VPS `oracle` (92.5.43.34) và do một container nginx riêng phục vụ, nên thêm hoặc
thay file không cần deploy lại site.

| | |
|---|---|
| Thư mục file trên VPS | `~/ckk-downloads/files/` (user `ubuntu`) |
| Cấu hình nginx | `~/ckk-downloads/nginx.conf` |
| Container | `ckk-downloads` (`nginx:1.27-alpine`, network `coolify`) |
| Định tuyến | Traefik `coolify-proxy`: router `ckk-downloads` = `Host(ckk.biz) && PathPrefix(/download/)`; router `hallovn-media` = `Host(hallovn.de) && PathPrefix(/download/media/)` (video câu hỏi lái xe cho web HalloVN, không mở APK). Cả hai priority 1000 |

Mọi đường dẫn khác của `ckk.biz` đi vào app HalloVN (Next.js, repo này).
Trong `/download/` không liệt kê được thư mục, file không tồn tại trả 404.

## Phát hành APK mới

1. Build trong `~/Code/fuehrerschein-app/DrivingTheoryApp`: `eas build -p android --profile preview`
   (ký bằng keystore thật trên EAS; đừng dùng APK build tay từ thư mục `android/`).
2. Tải APK từ trang build của EAS, rồi upload. Ghi file tạm trước rồi mới đổi tên, để người
   đang tải không nhận được file dở dang:

   ```sh
   scp app.apk oracle:~/ckk-downloads/files/.fuehrerschein-ckk.apk.part
   ssh oracle 'cd ~/ckk-downloads/files && cp .fuehrerschein-ckk.apk.part fuehrerschein-ckk-<version>.apk && mv .fuehrerschein-ckk.apk.part fuehrerschein-ckk.apk'
   ```

3. Kiểm tra: `curl -sI https://ckk.biz/download/fuehrerschein-ckk.apk`
   (200, `content-type: application/vnd.android.package-archive`, đúng `content-length`).

Link trên trang (`APP_LINKS.fuehrerscheinAndroid` trong `src/lib/company/site.ts`) luôn là
`https://ckk.biz/download/fuehrerschein-ckk.apk`, nên không cần sửa site khi có bản mới.
File `fuehrerschein-ckk-<version>.apk` giữ lại các bản cũ để quay lại khi cần.

Mỗi bản mới phải có `versionCode` cao hơn bản trước và ký cùng keystore, nếu không máy của
người dùng sẽ không cài đè được.

## APK Leben in Deutschland

Link `https://ckk.biz/download/lid-ckk.apk` (`APP_LINKS.lidAndroid`), nút bật/tắt bằng
`SHOW_LID_ANDROID_APK` trong `src/lib/company/services.ts`. Bản Android không có gói Unlimited
(chỉ bản miễn phí có giới hạn hằng ngày).

1. Build trong `~/Code/lid-app/android`: `./gradlew :app:assembleRelease`
   (ký bằng `lebenindeutschlandvi-release.keystore`; file ra ở `app/build/outputs/apk/release/app-release.apk`).
2. Upload giống trên, với tên `lid-ckk.apk` và bản lưu `lid-ckk-<versionName>-<versionCode>.apk`:

   ```sh
   scp app-release.apk oracle:~/ckk-downloads/files/.lid-ckk.apk.part
   ssh oracle 'cd ~/ckk-downloads/files && cp .lid-ckk.apk.part lid-ckk-<version>.apk && mv .lid-ckk.apk.part lid-ckk.apk'
   ```

Bản đầu tiên: 2.5 (versionCode 4), đưa lên 2026-11-06.

## Tạo lại container

```sh
docker run -d --name ckk-downloads --restart unless-stopped --network coolify \
  -v $HOME/ckk-downloads/files:/srv/files:ro \
  -v $HOME/ckk-downloads/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  -l traefik.enable=true \
  -l "traefik.http.routers.ckk-downloads.rule=Host(\`ckk.biz\`) && PathPrefix(\`/download/\`)" \
  -l traefik.http.routers.ckk-downloads.entrypoints=https \
  -l traefik.http.routers.ckk-downloads.priority=1000 \
  -l traefik.http.routers.ckk-downloads.tls=true \
  -l traefik.http.routers.ckk-downloads.tls.certresolver=letsencrypt \
  -l traefik.http.routers.ckk-downloads.service=ckk-downloads \
  -l "traefik.http.routers.hallovn-media.rule=Host(\`hallovn.de\`) && PathPrefix(\`/download/media/\`)" \
  -l traefik.http.routers.hallovn-media.entrypoints=https \
  -l traefik.http.routers.hallovn-media.priority=1000 \
  -l traefik.http.routers.hallovn-media.tls=true \
  -l traefik.http.routers.hallovn-media.tls.certresolver=letsencrypt \
  -l traefik.http.routers.hallovn-media.service=ckk-downloads \
  -l traefik.http.services.ckk-downloads.loadbalancer.server.port=80 \
  nginx:1.27-alpine
```

`nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /srv;
    autoindex off;
    types { application/vnd.android.package-archive apk; }
    default_type application/octet-stream;

    location /download/ {
        alias /srv/files/;
        add_header Content-Disposition "attachment";
        add_header Cache-Control "no-cache";
        try_files $uri =404;
    }
    location / { return 404; }
}
```

## Tạm ẩn / hiện lại APK

APK đang **hiện** (ẩn từ 2026-11-06, hiện lại cùng ngày với bản 3.3.0 versionCode 5).

Tạm ẩn:

```sh
ssh oracle 'mkdir -p ~/ckk-downloads/hidden && mv ~/ckk-downloads/files/fuehrerschein-ckk*.apk ~/ckk-downloads/hidden/'
```

rồi đổi `SHOW_ANDROID_APK` trong `src/lib/company/services.ts` thành `false`, push `main` của repo HalloVN (Coolify tự deploy).

Hiện lại:

```sh
ssh oracle 'mv ~/ckk-downloads/hidden/fuehrerschein-ckk*.apk ~/ckk-downloads/files/'
```

rồi đổi `SHOW_ANDROID_APK` thành `true`, push `main` của repo HalloVN (Coolify tự deploy).
