<?php
require __DIR__ . '/lib.php';
// The catalog is inlined (~130 KB); gzip shrinks the page ~8x. Skip if the server already compresses.
if (!ini_get('zlib.output_compression')) ob_start('ob_gzhandler');
$catalog = get_catalog();
$v = fn(string $f) => $f . '?v=' . filemtime(__DIR__ . '/' . $f); // cache-bust so assets can be cached long-term
?>
<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ALICAR — Car Wrap Colour Collection</title>
<meta name="description" content="Alicar car wrap colour collection / ฟิล์มเปลี่ยนสีรถ — browse every colour and finish.">
<meta name="theme-color" content="#08090b">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&family=Noto+Sans+Thai:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?= $v('assets/app.css') ?>">
</head>
<body>
<a class="skip" href="#grid">Skip to colours</a>

<header class="hdr" id="hdr">
  <div class="hdr__in">
    <a class="brand" href="#" aria-label="Alicar">
      <span class="brand__mark" aria-hidden="true"></span>
      <span class="brand__txt">
        <span class="brand__name">ALICAR</span>
        <span class="brand__sub">Car Wrap Colour Collection <i>/</i> ฟิล์มเปลี่ยนสีรถ</span>
      </span>
    </a>
    <span class="live" id="live" hidden title="People viewing this page now">
      <i aria-hidden="true"></i><b id="liveN"></b><span class="live__lbl"> viewing now</span>
    </span>
    <label class="search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="q" type="search" placeholder="Search colour, code…  ค้นหาสี" autocomplete="off" aria-label="Search colours">
      <kbd aria-hidden="true">/</kbd>
    </label>
  </div>
</header>

<section class="hero" id="hero">
  <div class="hero__bg" id="heroBg" aria-hidden="true"></div>
  <div class="hero__shade" aria-hidden="true"></div>
  <div class="hero__in">
    <p class="eyebrow"><span></span>Premium Wrap Film</p>
    <h1>Every shade,<br><em>every finish.</em></h1>
    <p class="hero__tag">Gloss, matte, metallic and colour-shift films — explore the full Alicar palette and see each colour on real cars.</p>
    <ul class="stats" id="stats" aria-label="Collection statistics"></ul>
  </div>
</section>

<nav class="cats" id="cats" aria-label="Categories">
  <div class="cats__scroll" id="catsScroll"></div>
</nav>

<main class="wrap">
  <div class="toolbar">
    <p class="count" id="count" aria-live="polite"></p>
    <label class="sort">
      <span>Sort</span>
      <select id="sort" aria-label="Sort colours">
        <option value="code">Code ↑</option>
        <option value="name">Name A–Z</option>
        <option value="photos">Most photos</option>
      </select>
    </label>
  </div>
  <div class="grid" id="grid"></div>
  <div class="empty" id="empty" hidden>
    <div class="empty__ring" aria-hidden="true"></div>
    <h2>No colours found</h2>
    <p>ไม่พบสีที่ค้นหา — try another keyword or clear the filters.</p>
    <button type="button" class="btn" id="reset">Reset filters</button>
  </div>
  <div id="sentinel" class="sentinel" aria-hidden="true"></div>
</main>

<footer class="ftr">
  <div class="ftr__in">
    <span class="brand__name">ALICAR</span>
    <span>© Alicar</span>
  </div>
</footer>

<div class="viewer" id="viewer" role="dialog" aria-modal="true" aria-labelledby="vTitle" hidden>
  <div class="viewer__backdrop" data-close></div>
  <div class="viewer__panel">
    <header class="viewer__hd">
      <div class="viewer__ttl">
        <h2 id="vTitle"></h2>
        <div class="viewer__cats" id="vCats"></div>
      </div>
      <div class="viewer__act">
        <a class="btn btn--ghost" id="vOpen" target="_blank" rel="noopener">Open original ↗</a>
        <button type="button" class="iconbtn" id="vClose" aria-label="Close" data-close>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
    </header>
    <div class="stage" id="stage">
      <button type="button" class="nav nav--prev" id="vPrev" aria-label="Previous">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>
      </button>
      <div class="stage__media" id="stageMedia"></div>
      <button type="button" class="nav nav--next" id="vNext" aria-label="Next">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
      </button>
      <span class="stage__sub" id="vSub" hidden></span>
      <span class="stage__ctr" id="vCtr"></span>
    </div>
    <div class="strip" id="strip" role="tablist" aria-label="Photos"></div>
  </div>
</div>

<script>window.CATALOG = <?= json_encode($catalog, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP) ?>;</script>
<script src="<?= $v('assets/app.js') ?>" defer></script>
</body>
</html>
