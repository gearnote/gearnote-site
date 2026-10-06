/* GEARNOTE サイト内検索：search-index.json を読み込み、キーワード（スペース区切りでAND）で商品を絞り込む。
   ひらがな↔カタカナ、全角↔半角、大文字小文字の違いを吸収。ジャンル名や言い換え（例：イヤフォン）にも対応。入力内容は送信されない。 */
(function () {
  "use strict";
  var input = document.getElementById("site-search-input");
  var out = document.getElementById("site-search-results");
  var countEl = document.getElementById("site-search-count");
  var moreBtn = document.getElementById("site-search-more");
  var emptyEl = document.getElementById("site-search-empty");
  if (!input || !out) return;

  var SYN = [
    ["イヤホン", "イヤフォン", "earphone", "earphones", "earbuds", "airpods"],
    ["ヘッドホン", "ヘッドフォン", "headphone", "headphones"],
    ["モバイルバッテリー", "モバブ", "powerbank", "power bank", "バッテリー"],
    ["ロボット掃除機", "ルンバ", "roomba", "ロボ掃除機"],
    ["掃除機", "クリーナー", "vacuum"],
    ["ドライヤー", "ヘアドライヤー", "dryer"],
    ["炊飯器", "炊飯", "ライスクッカー"],
    ["加湿器", "加湿"],
    ["ヒーター", "暖房", "ストーブ"],
    ["空気清浄機", "空清"],
    ["電気毛布", "電気敷毛布", "ホットカーペット"],
    ["スマートウォッチ", "smartwatch", "スマートバンド"],
    ["ケーブル", "cable"],
    ["充電器", "アダプタ", "adapter", "charger"],
    ["モニター", "ディスプレイ", "monitor"],
    ["キーボード", "keyboard"],
    ["マウス", "mouse", "トラックボール"],
    ["コーヒーメーカー", "コーヒーマシン", "エスプレッソ"],
    ["洗剤", "ボディソープ"],
  ];

  function norm(s) {
    s = String(s).normalize("NFKC").toLowerCase();
    return s.replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });  // カタカナ→ひらがなに統一
  }
  var synNorm = SYN.map(function (g) { return g.map(norm); });
  function expand(term) {
    for (var i = 0; i < synNorm.length; i++) if (synNorm[i].indexOf(term) >= 0) return synNorm[i];
    return [term];
  }

  var data = [], haystack = [];
  var PAGE = 60, shown = 0, current = [];

  function imgUrl(i) {
    if (!i) return "";
    return /^https?:/.test(i) ? i : "https://m.media-amazon.com/images/I/" + i + "._AC_SX300_.jpg";
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function search(q) {
    var terms = norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var groups = terms.map(expand);
    var res = [];
    for (var k = 0; k < data.length; k++) {
      var h = haystack[k], score = 0, ok = true;
      for (var g = 0; g < groups.length; g++) {
        var best = -1;
        for (var v = 0; v < groups[g].length; v++) {
          var pos = h.n.indexOf(groups[g][v]);
          if (pos >= 0) best = Math.max(best, 100 - Math.min(pos, 90));
          else if (h.c.indexOf(groups[g][v]) >= 0) best = Math.max(best, 20);
        }
        if (best < 0) { ok = false; break; }
        score += best;
      }
      if (ok) res.push([score - (data[k].u ? 40 : 0), k]);
    }
    res.sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
    return res.map(function (r) { return r[1]; });
  }

  function addCompareButtons(scope) {
    var C = window.GearnoteCompare;
    if (!C) return;
    scope.querySelectorAll(".cat-product-item").forEach(function (card) {
      if (card.querySelector(".cmp-btn")) return;
      var slug = card.getAttribute("href").replace(/\.html.*$/, "");
      var b = document.createElement("button");
      b.type = "button"; b.className = "cmp-btn";
      function refresh() { var on = C.load().indexOf(slug) >= 0; b.textContent = on ? "✓" : "⚖"; b.classList.toggle("active", on); b.title = on ? "比較リストから外す" : "比較リストに追加"; }
      b.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var list = C.load(), i = list.indexOf(slug);
        if (i >= 0) list.splice(i, 1); else if (list.length < C.MAX) list.push(slug); else { b.textContent = "!"; return; }
        C.save(list); refresh();
        var nav = document.querySelector(".nav-compare"); if (nav) nav.textContent = "⚖ 比較（" + list.length + "）";
      });
      card.appendChild(b); refresh();
    });
  }

  function renderMore() {
    var end = Math.min(current.length, shown + PAGE), html = "";
    for (var i = shown; i < end; i++) {
      var d = data[current[i]];
      html += '<a href="' + d.s + '.html" class="cat-product-item"><img class="cat-product-thumb" src="' + esc(imgUrl(d.i)) + '" alt="' + esc(d.n) + '" loading="lazy">' +
        '<div class="cat-product-info"><span class="cat-product-name">' + esc(d.n) + "</span>" + (d.c ? '<span class="site-search-cat">' + esc(d.c) + (d.u ? "・販売状況にご注意ください" : "") + "</span>" : "") + "</div></a>";
    }
    var tmp = document.createElement("div"); tmp.innerHTML = html;
    while (tmp.firstChild) out.appendChild(tmp.firstChild);
    shown = end;
    moreBtn.hidden = shown >= current.length;
    addCompareButtons(out);
  }

  function run() {
    var q = input.value.trim();
    out.innerHTML = ""; shown = 0;
    try { history.replaceState(null, "", q ? "?q=" + encodeURIComponent(q) : location.pathname); } catch (e) {}
    if (!q) { current = []; countEl.textContent = "全" + data.length + "商品から探せます"; moreBtn.hidden = true; emptyEl.hidden = false; return; }
    current = search(q);
    emptyEl.hidden = current.length > 0 ? true : false;
    countEl.textContent = current.length ? current.length + "件見つかりました" : "見つかりませんでした。別のキーワードや、ジャンルから探してみてください。";
    renderMore();
  }

  moreBtn.addEventListener("click", renderMore);
  var timer;
  input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(run, 120); });

  fetch("search-index.json", { credentials: "same-origin" }).then(function (r) { return r.json(); }).then(function (d) {
    data = d;
    haystack = d.map(function (x) { return { n: norm(x.n), c: norm(x.c || "") }; });
    var m = location.search.match(/[?&]q=([^&]*)/);
    if (m) input.value = decodeURIComponent(m[1].replace(/\+/g, " "));
    run();
    if (!input.value) input.focus();
  }).catch(function () { countEl.textContent = "検索データの読み込みに失敗しました。ページを再読み込みしてください。"; });
})();
