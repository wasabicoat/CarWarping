<?php
// CLI: pre-build every thumbnail so visitors never wait for GD, and rebuild thumbs of replaced photos.
//   php warm.php            (run after adding photos / api.php?refresh=1)
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/lib.php';

$catalog = get_catalog();
$made = $skipped = $failed = 0;
foreach ($catalog['colors'] as $c) {
    foreach ($c['media'] as $m) {
        if ($m['type'] !== 'image' || !($abs = safe_media_path($m['path']))) continue;
        foreach (THUMB_WIDTHS as $w) {
            $cache = thumb_cache_file($m['path'], $w);
            if (is_file($cache) && filemtime($cache) >= filemtime($abs)) { $skipped++; continue; }
            if (make_thumb($m['path'], $abs, $w)) { $made++; echo "+ {$w} {$m['path']}\n"; }
            else { $failed++; echo "! {$w} {$m['path']}\n"; }
        }
    }
}
echo "built $made, up to date $skipped, failed $failed\n";
