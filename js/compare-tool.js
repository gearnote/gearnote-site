/* GEARNOTE 比較ページ：比較リスト（localStorage）または ?p=商品1,商品2 の商品ページを取得して、仕様表を横に並べる */
(function () {
  "use strict";
  var root = document.getElementById("compare-tool");
  if (!root) return;
  var MAX = 4;
  var KEY = "gearnote-compare";

  function validSlug(x) { return /^product-[a-z0-9-]+$/.test(x); }
  function fromUrl() {
    var m = location.search.match(/[?&]p=([^&]+)/);
    if (!m) return null;
    var a = decodeURIComponent(m[1]).split(",").filter(validSlug).slice(0, MAX);
    return a.length ? a : null;
  }
  function fromStore() {
    try { var a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a.filter(validSlug).slice(0, MAX) : []; } catch (e) { return []; }
  }
  var sharedMode = !!fromUrl();
  var slugs = fromUrl() || fromStore();

  function store(a) { if (!sharedMode) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} } }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var cache = {};
  function fetchProduct(slug) {
    if (cache[slug]) return Promise.resolve(cache[slug]);
    return fetch(slug + ".html", { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("not found");
      return r.text();
    }).then(function (t) {
      var d = new DOMParser().parseFromString(t, "text/html");
      var h1 = d.querySelector("h1");
      var og = d.querySelector('meta[property="og:image"]');
      var amazon = d.querySelector(".pd-cta a.btn-amazon");
      var notice = !!d.querySelector('[data-stock="unavailable"]');
      var rows = [];
      d.querySelectorAll(".spec-table tr").forEach(function (tr) {
        var th = tr.querySelector("th"), td = tr.querySelector("td");
        if (th && td) rows.push([th.textContent.trim(), td.textContent.trim()]);
      });
      var p = { slug: slug, name: h1 ? h1.textContent.trim() : slug, img: og ? og.getAttribute("content") : "", amazon: amazon ? amazon.getAttribute("href") : "", amazonLabel: amazon ? amazon.textContent.trim() : "", notice: notice, rows: rows };
      cache[slug] = p;
      return p;
    });
  }

  var onlyDiff = false;

  function render(products) {
    if (!products.length) {
      root.innerHTML = '<div class="compare-empty"><p>比較リストは空です。</p><p>商品ページの「＋ 比較リストに追加」ボタンで、気になる商品を最大' + MAX + 'つまで追加できます。</p>' +
        '<p><a class="btn btn-ghost" href="new-arrivals.html">新着商品から探す</a> <a class="btn btn-ghost" href="guides.html">選び方ガイドから探す</a> <a class="btn btn-ghost" href="all-products.html">全商品から探す</a></p></div>';
      return;
    }
    // 項目の和集合（出現順）
    var keys = [];
    products.forEach(function (p) { p.rows.forEach(function (r) { if (keys.indexOf(r[0]) < 0) keys.push(r[0]); }); });
    function val(p, k) { for (var i = 0; i < p.rows.length; i++) if (p.rows[i][0] === k) return p.rows[i][1]; return ""; }
    // 多くの商品に共通する項目を上に（同数なら出現順）
    keys = keys.map(function (k, i) { return { k: k, i: i, n: products.filter(function (p) { return val(p, k) !== ""; }).length }; })
      .sort(function (a, b) { return b.n - a.n || a.i - b.i; }).map(function (o) { return o.k; });
    var head = '<tr><th class="ct-corner"></th>' + products.map(function (p) {
      return '<th class="ct-prod"><a href="' + p.slug + '.html">' + (p.img ? '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy">' : "") + '<span class="ct-name">' + esc(p.name) + "</span></a>" +
        (p.notice ? '<span class="ct-notice">販売状況にご注意ください</span>' : "") +
        '<span class="ct-actions">' + (p.amazon ? '<a class="btn btn-amazon btn-sm" href="' + esc(p.amazon) + '" target="_blank" rel="nofollow sponsored noopener">' + esc(p.amazonLabel || "Amazonで見る") + "</a>" : "") +
        '<button type="button" class="btn btn-ghost btn-sm ct-remove" data-slug="' + p.slug + '">外す</button></span></th>';
    }).join("") + "</tr>";
    var body = keys.map(function (k) {
      var vals = products.map(function (p) { return val(p, k); });
      var have = vals.filter(function (v) { return v !== ""; });
      var distinct = have.filter(function (v, i) { return have.indexOf(v) === i; });
      var diff = have.length >= 2 && distinct.length > 1;
      if (onlyDiff && !diff) return "";
      return '<tr class="' + (diff ? "ct-diff" : "") + '"><th>' + esc(k) + "</th>" + vals.map(function (v) { return "<td>" + (v ? esc(v) : '<span class="ct-none">—</span>') + "</td>"; }).join("") + "</tr>";
    }).join("");
    var shareUrl = location.origin + "/compare-tool.html?p=" + products.map(function (p) { return p.slug; }).join(",");
    root.innerHTML = '<div class="ct-bar"><label><input type="checkbox" id="ct-onlydiff"' + (onlyDiff ? " checked" : "") + '> 違いのある項目だけ表示</label>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="ct-copy">この比較のURLをコピー</button>' +
      (sharedMode ? ' <a class="btn btn-ghost btn-sm" href="compare-tool.html" id="ct-mine">自分の比較リストを見る</a>' : ' <button type="button" class="btn btn-ghost btn-sm" id="ct-clear">リストを空にする</button>') + "</div>" +
      '<div class="ct-wrap"><table class="ct-table"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div>" +
      '<p class="pd-source-note">※仕様は、各商品ページ（Amazon商品ページの掲載情報をもとに記載）の「商品情報・仕様」を並べたものです。空欄（—）は、その商品ページに記載がない項目です。最新情報は必ずAmazon商品ページでご確認ください。</p>';
    var cb = document.getElementById("ct-onlydiff");
    if (cb) cb.addEventListener("change", function () { onlyDiff = cb.checked; render(products); });
    var cp = document.getElementById("ct-copy");
    if (cp) cp.addEventListener("click", function () {
      function done() { cp.textContent = "コピーしました"; setTimeout(function () { cp.textContent = "この比較のURLをコピー"; }, 1800); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(shareUrl).then(done, function () { window.prompt("URLをコピーしてください", shareUrl); });
      else window.prompt("URLをコピーしてください", shareUrl);
    });
    var cl = document.getElementById("ct-clear");
    if (cl) cl.addEventListener("click", function () { slugs = []; store(slugs); load(); });
    root.querySelectorAll(".ct-remove").forEach(function (b) {
      b.addEventListener("click", function () {
        slugs = slugs.filter(function (s) { return s !== b.getAttribute("data-slug"); });
        if (sharedMode) { history.replaceState(null, "", slugs.length ? "?p=" + slugs.join(",") : "compare-tool.html"); sharedMode = slugs.length > 0; }
        store(slugs); load();
      });
    });
  }

  function load() {
    if (!slugs.length) { render([]); return; }
    root.innerHTML = '<p class="compare-loading">読み込み中…</p>';
    Promise.all(slugs.map(function (s) { return fetchProduct(s).catch(function () { return null; }); })).then(function (ps) {
      render(ps.filter(Boolean));
    });
  }
  load();
})();
