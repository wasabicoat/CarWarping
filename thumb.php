<?php
// thumb.php?p=<path relative to Alicar>&w=480|1600  -> cached, EXIF-rotated JPEG
// The page normally loads cache/thumbs/<id>-<w>.jpg directly; this is the fallback that builds missing ones.
require __DIR__ . '/lib.php';

$rel = (string)($_GET['p'] ?? '');
$w = (int)($_GET['w'] ?? 480);
if (!in_array($w, THUMB_WIDTHS, true)) $w = 480;

$cache = thumb_cache_file($rel, $w); // name is a hash, so $rel can't escape the cache dir
if (!is_file($cache)) {
    $abs = safe_media_path($rel);
    if (!$abs || media_type($abs) !== 'image') { http_response_code(404); exit; }
    if (!make_thumb($rel, $abs, $w)) {
        header('Location: ' . 'Alicar/' . implode('/', array_map('rawurlencode', explode('/', $rel))));
        exit;
    }
}

$etag = '"' . basename($cache, '.jpg') . '-' . filemtime($cache) . '"';
header('Cache-Control: public, max-age=604800');
header('ETag: ' . $etag);
if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) { http_response_code(304); exit; }
header('Content-Type: image/jpeg');
header('Content-Length: ' . filesize($cache));
readfile($cache);
