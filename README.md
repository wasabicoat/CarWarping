# Alicar Wrap Gallery — Car Wrap Colour Collection (ฟิล์มเปลี่ยนสีรถ)

[![Deploy to GitHub Pages](https://github.com/wasabicoat/CarWarping/actions/workflows/pages.yml/badge.svg)](https://github.com/wasabicoat/CarWarping/actions/workflows/pages.yml)
[![Release](https://img.shields.io/github/v/release/wasabicoat/CarWarping)](https://github.com/wasabicoat/CarWarping/releases/latest)

🌐 **Live Web Demo**: [https://wasabicoat.github.io/CarWarping/](https://wasabicoat.github.io/CarWarping/)

PHP + HTML + JS gallery for the colour photos in `Alicar/<category>/<colour>/`.

## Run
Quick (built-in server):
```
cd /Volumes/web/CarWarping
/Applications/XAMPP/xamppfiles/bin/php -S 127.0.0.1:8080
```
Open http://127.0.0.1:8080/

XAMPP Apache: link the folder into htdocs, then open http://localhost/alicar/
```
ln -s /Volumes/web/CarWarping /Applications/XAMPP/xamppfiles/htdocs/alicar
```
(Apache needs `FollowSymLinks` (the XAMPP default) and read access to `/Volumes/web`. `cache/` must be writable by the web server user.)

## Adding photos
Drop images (jpg/png/webp) or mp4 into `Alicar/<category>/<code>-<Colour Name>/`.
The folder scan is cached for 24h because the share is slow. Open `api.php?refresh=1` once to rescan.

## Files
- `index.php`: page. `assets/app.css` and `assets/app.js`: UI.
- `lib.php`: folder scanner and catalog cache. `api.php`: catalog JSON.
- `thumb.php`: resized JPEG thumbnails (480 / 1600px), cached in `cache/thumbs/`.
- `docs/SPEC.md`: design spec.
