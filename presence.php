<?php
// presence.php?id=<16 hex>[&leave=1] -> {"online": N}
// Each open tab pings every 30 s; a viewer counts as online until 75 s after its last ping.
require __DIR__ . '/lib.php';
const PRESENCE_TTL = 75;
const PRESENCE_MAX = 20000; // hard cap so junk ids can't grow the file without bound

header('Content-Type: application/json');
header('Cache-Control: no-store');
$id = (string)($_GET['id'] ?? '');
if (!preg_match('/^[0-9a-f]{16}$/', $id)) { http_response_code(400); echo '{"error":"bad id"}'; exit; }

// Throwaway data: keep it on local temp disk, file locks on a network share are very slow.
$fp = fopen(sys_get_temp_dir() . '/alicar-presence-' . md5(__DIR__) . '.json', 'c+');
if (!$fp || !flock($fp, LOCK_EX)) { http_response_code(503); echo '{"error":"busy"}'; exit; }
$seen = json_decode(stream_get_contents($fp), true) ?: [];
$now = time();
$seen = array_filter($seen, fn($t) => $now - $t < PRESENCE_TTL);
if (isset($_GET['leave'])) unset($seen[$id]);
elseif (isset($seen[$id]) || count($seen) < PRESENCE_MAX) $seen[$id] = $now;
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($seen));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);
echo json_encode(['online' => max(1, count($seen))]);
