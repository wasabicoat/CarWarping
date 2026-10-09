<?php
// api.php[?refresh=1] -> catalog JSON (see docs/SPEC.md §2)
require __DIR__ . '/lib.php';
if (!ini_get('zlib.output_compression')) ob_start('ob_gzhandler');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');
echo json_encode(get_catalog(isset($_GET['refresh'])), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
