# Alicar Wrap Gallery — Frontend Spec

Site root: `/Volumes/web/CarWarping/`. PHP 8.2, no framework, no build step, no npm.
Photos live in `/Volumes/web/CarWarping/Alicar/<category>/<colour folder>/[<sub>/]<file>`.

## 1. Existing backend (DONE — do NOT modify)
- `lib.php` — `get_catalog(bool $refresh=false): array` (cached scan), constants.
- `api.php` — `GET api.php` returns catalog JSON (§2). `?refresh=1` rescans (slow, ~15 s).
- `thumb.php?p=<path>&w=480|1600` — returns a resized JPEG of image `<path>` (path relative to `Alicar/`, exactly the `media[].path` string, URL-encoded with `encodeURIComponent`). 404 for bad path. Only for images, never videos.
- Original file URL (images & videos): `'Alicar/' + path.split('/').map(encodeURIComponent).join('/')`.

## 2. Catalog JSON shape
```json
{
  "generated": 1760000000,
  "categories": [
    {"key":"ขาว","label":"White","swatch":"#f4f4f2","order":1,"count":17}
  ],
  "colors": [
    {"id":"002-carbon-grey-blue","code":"002","name":"Carbon Grey blue",
     "categories":["น้ำเงิน","ฟ้า"],
     "media":[{"type":"image","path":"น้ำเงิน/002-Carbon Grey blue/1 (1).jpg","sub":""},
              {"type":"video","path":"...mp4","sub":""}]}
  ]
}
```
- `swatch` is any CSS `background` value (hex, linear-gradient, conic-gradient).
- `code` may be `""`. `sub` is a sub-folder label (e.g. `"ด้าน"` = matte) or `""`.
- ~17 categories, ~190 colours, ~1,750 media items. `media` always non-empty; the first image is the cover. A colour can have no images (only video) — then use the swatch of its first category as the cover.

## 3. Files to create
1. `index.php` — HTML shell. Must `require __DIR__.'/lib.php'` and embed the catalog inline to avoid a second request:
   `<script>window.CATALOG = <?= json_encode(get_catalog(), JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP) ?>;</script>`
   then `<script src="assets/app.js" defer></script>`, `<link rel="stylesheet" href="assets/app.css">`. `lang="th"`.
2. `assets/app.css`
3. `assets/app.js` — vanilla ES2020, no frameworks, no external JS libraries.
Google Fonts allowed: a display font + `Noto Sans Thai` (Thai text must render well).

## 4. Page design (make it beautiful — a premium automotive film brand)
Dark, glossy, automotive-luxury feel (think high-end car configurator): near-black background, subtle gradient sheen, generous whitespace, one accent colour. Also usable in light mode is NOT required — dark only.

Sections top→bottom:
1. **Sticky header**: "ALICAR" wordmark + subtitle "Car Wrap Colour Collection / ฟิล์มเปลี่ยนสีรถ", search input (right). Header becomes compact/blurred (backdrop-filter) after scroll.
2. **Hero**: big headline, short tagline, stats pulled from data (`N colours · M categories · K photos`), background = a slow crossfading collage of 5 random cover thumbnails (w=1600) under a dark gradient overlay.
3. **Category chips bar** (sticky below header, horizontally scrollable on mobile): "All" + one chip per category showing a circular swatch dot (`background: swatch`), Thai key, English label, and count. Active chip highlighted.
4. **Toolbar**: result count ("Showing 23 colours"), sort select (Code ↑ default, Name A–Z, Most photos).
5. **Colour grid**: responsive CSS grid (`repeat(auto-fill,minmax(260px,1fr))`, 2 columns min on phones ≤ 480px with smaller min). Each card:
   - cover image `thumb.php?w=480`, aspect-ratio 4/3, `object-fit:cover`, `loading="lazy"`, `decoding="async"`, fade-in on load, skeleton shimmer while loading;
   - on hover (desktop): slight zoom + cycle through the colour's first 4 images every 900 ms;
   - code badge (e.g. "#204") top-left, photo count + 🎬 icon if it has videos top-right;
   - name below, then small swatch dots for each of its categories.
   - Cards animate in (fade/translate) via IntersectionObserver as they enter the viewport.
   - Render in batches of 48 with infinite scroll (IntersectionObserver sentinel) — do not insert all 190 cards' images eagerly.
6. **Footer**: brand + "© Alicar".

Filtering: category chip AND search (case-insensitive substring over `code`, `name`, category keys and labels). Search debounced 150 ms. Empty state message with a reset button.

## 5. Colour detail viewer (modal / lightbox)
Opening a card opens a full-screen overlay:
- Header: `#code name`, category chips, close button (×).
- Main stage: current media. Images use `thumb.php?w=1600` (show the w=480 version blurred first while loading). Videos: `<video controls playsinline preload="metadata">` with the original URL.
- If `sub` is non-empty, show it as a small label on the stage.
- Prev/next arrows, counter "3 / 15", thumbnail strip below (w=480 thumbs; video items show a ▶ tile), active thumb scrolled into view.
- "Open original" link (original URL, `target="_blank" rel="noopener"`).
- Keyboard: ←/→ navigate, Esc closes. Touch swipe left/right on stage. Click backdrop closes.
- Pause any playing video when navigating away. Lock body scroll while open.
- Deep link: URL hash `#c=<id>&i=<index>`; opening/navigating updates hash with `history.replaceState`; loading the page with that hash opens the viewer. Category/search state may also be kept in the hash as `#cat=<key>&q=<text>` (encodeURIComponent).
- Preload next and previous w=1600 images.

## 6. Constraints / acceptance criteria
- No PHP errors; `index.php` must work under `php -S localhost:8080` from `/Volumes/web/CarWarping` and under Apache.
- Never build HTML from data with unescaped string concatenation into innerHTML — use `textContent` / `createElement`, or an `esc()` helper for every data value (folder names are user-controlled).
- All media URLs built only via the two helpers in §1 (encode properly — paths contain Thai, spaces, parentheses).
- Responsive: no horizontal page scroll at 360px width; 16px side gutters on mobile.
- Accessible: buttons are `<button>`, images have `alt` (colour name), visible focus rings, modal has `role="dialog" aria-modal="true"` and focus returns to the card on close.
- `prefers-reduced-motion`: disable hero crossfade, hover cycling and entrance animations.
- Do NOT touch `lib.php`, `api.php`, `thumb.php`, `Alicar/`, `cache/`.
