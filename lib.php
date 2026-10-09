<?php
// Shared config + catalog scanner for the Alicar wrap gallery.

const ALICAR_DIR   = __DIR__ . '/Alicar';
const CACHE_DIR    = __DIR__ . '/cache';
const CATALOG_TTL  = 86400; // seconds; scanning the share is slow, use ?refresh=1 after adding photos
const IMAGE_EXT    = ['jpg', 'jpeg', 'png', 'webp'];
const VIDEO_EXT    = ['mp4'];

// Category folder name => [English label, swatch CSS colour, sort order]
const CATEGORY_META = [
    'ขาว'            => ['White',         '#f4f4f2', 1],
    'ดำ'             => ['Black',         '#111214', 2],
    'เทา'            => ['Grey',          '#7d8288', 3],
    'เงิน'           => ['Silver',        'linear-gradient(135deg,#e9ecef,#9aa1a8)', 4],
    'ทอง'            => ['Gold',          'linear-gradient(135deg,#f6e27a,#b8860b)', 5],
    'แดง'            => ['Red',           '#c8102e', 6],
    'ชมพู'           => ['Pink',          '#f29ac0', 7],
    'ส้ม'            => ['Orange',        '#f37021', 8],
    'เหลือง'         => ['Yellow',        '#ffd200', 9],
    'เขียว'          => ['Green',         '#2e8b57', 10],
    'ฟ้า'            => ['Sky Blue',      '#5bc0eb', 11],
    'น้ำเงิน'        => ['Blue',          '#1d3c8f', 12],
    'ม่วง'           => ['Purple',        '#6a3d9a', 13],
    'น้ำตาล'         => ['Brown',         '#7b4a2a', 14],
    'เหลือบ'         => ['Iridescent',    'linear-gradient(135deg,#7f5af0,#2cb67d,#f9c74f,#ef476f)', 15],
    'Matte PET'      => ['Matte PET',     'linear-gradient(135deg,#3a3d40,#6c7075)', 16],
    'Special Colours'=> ['Special Colours','conic-gradient(#ef476f,#ffd166,#06d6a0,#118ab2,#ef476f)', 17],
];

function media_type(string $file): ?string {
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if (in_array($ext, IMAGE_EXT, true)) return 'image';
    if (in_array($ext, VIDEO_EXT, true)) return 'video';
    return null;
}

/** Recursively list media under $dir; paths returned relative to ALICAR_DIR. */
function scan_media(string $dir, string $rel, string $sub = ''): array {
    $out = [];
    $entries = @scandir($dir) ?: [];
    natcasesort($entries);
    foreach ($entries as $e) {
        if ($e[0] === '.') continue;
        $abs = "$dir/$e";
        if (is_dir($abs)) {
            $out = array_merge($out, scan_media($abs, "$rel/$e", $sub === '' ? $e : "$sub/$e"));
        } elseif (($type = media_type($e)) && is_file($abs) && is_readable($abs)) {
            $m = ['type' => $type, 'path' => "$rel/$e", 'sub' => $sub];
            if ($type === 'image') $m['t'] = thumb_id($m['path']);
            $out[] = $m;
        }
    }
    return $out;
}

function parse_color_folder(string $folder): array {
    $clean = trim(preg_replace('/\s+/u', ' ', $folder));
    if (preg_match('/^(\d{3})\s*-?\s*(.*)$/u', $clean, $m)) {
        return [$m[1], trim($m[2]) !== '' ? trim($m[2]) : $clean];
    }
    return ['', $clean];
}

function slugify(string $s): string {
    return trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($s)), '-');
}

function build_catalog(): array {
    $categories = [];
    $colors = []; // key => color, deduped across categories
    foreach (scandir(ALICAR_DIR) ?: [] as $cat) {
        if ($cat[0] === '.' || !is_dir(ALICAR_DIR . "/$cat")) continue;
        $meta = CATEGORY_META[$cat] ?? [$cat, '#888', 99];
        $count = 0;
        foreach (scandir(ALICAR_DIR . "/$cat") ?: [] as $folder) {
            if ($folder[0] === '.' || !is_dir(ALICAR_DIR . "/$cat/$folder")) continue;
            [$code, $name] = parse_color_folder($folder);
            $key = $code . '|' . slugify($name);
            $media = scan_media(ALICAR_DIR . "/$cat/$folder", "$cat/$folder");
            $count++;
            if (!isset($colors[$key])) {
                $colors[$key] = ['id' => '', 'code' => $code, 'name' => $name,
                                 'categories' => [], 'media' => []];
            }
            if (!in_array($cat, $colors[$key]['categories'], true)) $colors[$key]['categories'][] = $cat;
            // Same colour is copied into several category folders; keep the richest copy.
            if (count($media) > count($colors[$key]['media'])) $colors[$key]['media'] = $media;
        }
        $categories[] = ['key' => $cat, 'label' => $meta[0], 'swatch' => $meta[1],
                         'order' => $meta[2], 'count' => $count];
    }
    usort($categories, fn($a, $b) => $a['order'] <=> $b['order'] ?: strcmp($a['key'], $b['key']));
    $colors = array_values(array_filter($colors, fn($c) => $c['media']));
    usort($colors, fn($a, $b) => strcmp($a['code'] ?: '999', $b['code'] ?: '999') ?: strcasecmp($a['name'], $b['name']));
    foreach ($colors as &$c) {
        $slug = slugify($c['name']);
        $c['id'] = $c['code'] !== '' ? rtrim($c['code'] . '-' . $slug, '-') : ($slug !== '' ? $slug : substr(md5($c['name']), 0, 8));
    }
    unset($c);
    return ['generated' => time(), 'categories' => $categories, 'colors' => $colors];
}

function get_catalog(bool $refresh = false): array {
    // One cache per host: the NAS and a Mac mounting it over SMB see different
    // file names (SMB maps ':' and trailing spaces to private-use characters).
    $file = CACHE_DIR . '/catalog-' . preg_replace('/[^A-Za-z0-9_.-]/', '_', php_uname('n')) . '.json';
    if (!$refresh && is_file($file) && time() - filemtime($file) < CATALOG_TTL) {
        $data = json_decode((string)file_get_contents($file), true);
        if (is_array($data)) return $data;
    }
    $data = build_catalog();
    if (!is_dir(CACHE_DIR)) @mkdir(CACHE_DIR, 0775, true);
    @file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    return $data;
}

const THUMB_WIDTHS = [480, 1600];

// Thumbs are named from the catalog path alone, so a cached thumb can be found (or served
// statically as cache/thumbs/<id>-<w>.jpg) without touching the slow photo share.
// A replaced photo keeps its name: warm.php rebuilds thumbs older than their original.
function thumb_id(string $rel): string {
    return substr(sha1($rel), 0, 16);
}

function thumb_cache_file(string $rel, int $w): string {
    return CACHE_DIR . '/thumbs/' . thumb_id($rel) . '-' . $w . '.jpg';
}

/** Build the cached, EXIF-rotated JPEG of catalog image $rel ($abs = its file); returns its path or null if undecodable. */
function make_thumb(string $rel, string $abs, int $w): ?string {
    $cache = thumb_cache_file($rel, $w);
    if (!is_dir(dirname($cache))) @mkdir(dirname($cache), 0775, true);
    ini_set('memory_limit', '512M');
    $ext = strtolower(pathinfo($abs, PATHINFO_EXTENSION));
    // Decode by content, not extension: some .jpg files are really WebP.
    $src = @imagecreatefromstring((string)file_get_contents($abs));
    if (!$src) return null;

    if (in_array($ext, ['jpg', 'jpeg'], true) && function_exists('exif_read_data') && exif_imagetype($abs) === IMAGETYPE_JPEG) {
        $o = @exif_read_data($abs)['Orientation'] ?? 1;
        $rot = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
        if ($rot) $src = imagerotate($src, $rot, 0);
    }
    $sw = imagesx($src); $sh = imagesy($src);
    $tw = min($w, $sw); $th = (int)round($sh * $tw / $sw);
    $dst = imagecreatetruecolor($tw, $th);
    imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255)); // flatten PNG alpha
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $tw, $th, $sw, $sh);
    imagedestroy($src);
    imageinterlace($dst, true); // progressive: shows a preview while downloading
    imagejpeg($dst, $cache . '.tmp', $w > 480 ? 82 : 78);
    imagedestroy($dst);
    rename($cache . '.tmp', $cache);
    return $cache;
}

/** Resolve a catalog-relative path to an absolute file inside ALICAR_DIR, or null. */
function safe_media_path(string $rel): ?string {
    if ($rel === '' || str_contains($rel, "\0")) return null;
    $root = realpath(ALICAR_DIR);
    $abs = realpath(ALICAR_DIR . '/' . $rel);
    if ($root === false || $abs === false || !is_file($abs)) return null;
    if (!str_starts_with($abs, $root . DIRECTORY_SEPARATOR)) return null;
    return media_type($abs) ? $abs : null;
}
