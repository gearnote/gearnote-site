/* GEARNOTE データ一覧：商品の一覧表に、絞り込み・並べ替え・見比べる機能を足す（2026-11-15）。
   表はもともとHTMLに全部書いてあり（検索エンジンにも見える）、このスクリプトは表示を変えるだけ。数字は表の中のものだけを使う（新しい数字は作らない）。
   優劣・おすすめの表示はしない。JSが動かない環境では、いつもの固定の表のまま。 */
(function () {
  "use strict";
  var tables = document.querySelectorAll("table.compare-table.guide-table");
  var table = null;
  for (var i = 0; i < tables.length; i++) {
    var h = tables[i].querySelector("thead th");
    if (h && h.textContent.trim() === "商品") { table = tables[i]; break; }
  }
  if (!table) return;
  var tbody = table.tBodies[0];
  var headRow = table.tHead.rows[0];
  var heads = [].slice.call(headRow.cells);
  var rows = [].slice.call(tbody.rows);
  if (rows.length < 4) return;
  var MAX = 4;

  function num(t) {
    t = t.replace(/[,，\s]/g, "").replace(/[^\d.\-]/g, "");
    if (t === "" || t === "-" || t === ".") return null;
    var v = parseFloat(t);
    return isFinite(v) ? v : null;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // 列ごとの数字（0列目=商品名, 1列目=区分 は除く）
  var cols = [];
  for (var c = 2; c < heads.length; c++) {
    var vals = rows.map(function (r) { var cell = r.cells[c]; return cell ? num(cell.textContent) : null; });
    var have = vals.filter(function (v) { return v !== null; });
    var raw = rows.filter(function (r) { var cell = r.cells[c]; return cell && cell.textContent.trim() !== "記載なし"; }).length;
    if (raw >= 3 && have.length >= raw * 0.8) {
      cols.push({ idx: c, label: heads[c].textContent.trim(), vals: vals, min: Math.min.apply(null, have), max: Math.max.apply(null, have) });
    }
  }
  if (!cols.length) return;
  rows.forEach(function (r, k) {
    r._i = k;
    r._name = r.cells[0].textContent.trim();
    r._href = (r.cells[0].querySelector("a") || {}).href || "";
    r._grp = r.cells[1] ? r.cells[1].textContent.trim() : "";
  });
  var groups = [];
  rows.forEach(function (r) { if (r._grp && groups.indexOf(r._grp) < 0) groups.push(r._grp); });

  // ---- UI
  var wrap = table.closest(".compare-table-wrap") || table;
  var box = document.createElement("details");
  box.className = "dtt-box";
  box.open = false;
  var sum = document.createElement("summary");
  sum.innerHTML = "条件で絞り込む・並べ替える・見比べる";
  box.appendChild(sum);
  var inner = document.createElement("div");
  inner.className = "dtt-inner";
  var html = '<p class="dtt-note">下の表の数字を、条件で絞り込めます。数字を入れる欄は、空のままなら条件なしです。表の見出しを押すと、その列の順に並べ替わります（順位ではなく、数字の大小の順です）。商品の左のチェックで、最大' + MAX + '件を横に並べて見比べられます。</p><div class="dtt-grid">';
  if (groups.length > 1) {
    html += '<label class="dtt-f"><span>区分</span><select data-g><option value="">すべて</option>' + groups.map(function (g) { return '<option>' + esc(g) + '</option>'; }).join("") + '</select></label>';
  }
  cols.forEach(function (c, k) {
    html += '<div class="dtt-f"><span>' + esc(c.label) + '</span><span class="dtt-range"><input type="number" inputmode="decimal" step="any" data-k="' + k + '" data-m="min" placeholder="' + c.min + '" aria-label="' + esc(c.label) + ' 以上"> 〜 <input type="number" inputmode="decimal" step="any" data-k="' + k + '" data-m="max" placeholder="' + c.max + '" aria-label="' + esc(c.label) + ' 以下"></span></div>';
  });
  html += '</div><p class="dtt-actions"><button type="button" class="dtt-btn" data-reset>条件をリセット</button> <span class="dtt-count" aria-live="polite"></span></p><p class="dtt-note dtt-small">条件を入れた項目で「記載なし」の商品は、表示から外れます（0という意味ではなく、メーカー側の仕様に書かれていない、という意味です）。</p>';
  inner.innerHTML = html;
  box.appendChild(inner);
  var cmp = document.createElement("div");
  cmp.className = "dtt-cmp";
  cmp.hidden = true;
  wrap.parentNode.insertBefore(box, wrap);
  wrap.parentNode.insertBefore(cmp, wrap);

  // 見比べるチェック列
  var th0 = document.createElement("th");
  th0.className = "dtt-chk";
  th0.innerHTML = '<span class="dtt-vh">見比べる</span>';
  th0.title = "見比べる";
  headRow.insertBefore(th0, headRow.cells[0]);
  rows.forEach(function (r) {
    var td = document.createElement("td");
    td.className = "dtt-chk";
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.setAttribute("aria-label", r._name + " を見比べる");
    td.appendChild(cb);
    r._cb = cb;
    r.insertBefore(td, r.cells[0]);
    cb.addEventListener("change", onPick);
  });
  var picked = [];
  function onPick(e) {
    var r = e.target.closest("tr");
    if (e.target.checked) {
      if (picked.length >= MAX) { e.target.checked = false; cmp.hidden = false; renderCmp("見比べられるのは最大" + MAX + "件までです。"); return; }
      picked.push(r);
    } else {
      picked = picked.filter(function (x) { return x !== r; });
    }
    renderCmp("");
  }
  function renderCmp(msg) {
    if (!picked.length) { cmp.hidden = true; cmp.innerHTML = ""; return; }
    cmp.hidden = false;
    var h = '<h3 class="dtt-cmp-h">見比べる（' + picked.length + '件）</h3>' + (msg ? '<p class="dtt-warn">' + esc(msg) + '</p>' : "") +
      '<div class="compare-table-wrap"><table class="compare-table guide-table dtt-cmp-t"><thead><tr><th>項目</th>' +
      picked.map(function (r) { return '<th><a href="' + esc(r._href) + '">' + esc(r._name) + '</a></th>'; }).join("") + '</tr></thead><tbody>';
    var all = [{ idx: 1, label: "区分" }].concat(cols);
    all.forEach(function (c) {
      h += '<tr><th>' + esc(c.label) + '</th>' + picked.map(function (r) { var cell = r.cells[c.idx + 1]; return '<td>' + esc(cell ? cell.textContent.trim() : "") + '</td>'; }).join("") + '</tr>';
    });
    h += '</tbody></table></div><p class="dtt-note dtt-small">数字は、すべて下の一覧表と同じものです。優劣の判定はしていません。条件（測り方・運転モードなど）は、商品名のリンク先の仕様表で確認できます。<button type="button" class="dtt-btn" data-clear>選びなおす</button></p>';
    cmp.innerHTML = h;
  }
  cmp.addEventListener("click", function (e) {
    if (e.target.hasAttribute("data-clear")) {
      picked.forEach(function (r) { r._cb.checked = false; });
      picked = [];
      renderCmp("");
    }
  });

  // 絞り込み
  var inputs = [].slice.call(box.querySelectorAll("input[type=number]"));
  var gsel = box.querySelector("[data-g]");
  var count = box.querySelector(".dtt-count");
  function apply() {
    var lim = cols.map(function (c, k) {
      var lo = box.querySelector('[data-k="' + k + '"][data-m="min"]').value;
      var hi = box.querySelector('[data-k="' + k + '"][data-m="max"]').value;
      return { lo: lo === "" ? null : parseFloat(lo), hi: hi === "" ? null : parseFloat(hi) };
    });
    var g = gsel ? gsel.value : "";
    var shown = 0;
    rows.forEach(function (r) {
      var ok = !g || r._grp === g;
      for (var k = 0; ok && k < cols.length; k++) {
        var L = lim[k];
        if (L.lo === null && L.hi === null) continue;
        var v = cols[k].vals[r._i];
        if (v === null || (L.lo !== null && v < L.lo) || (L.hi !== null && v > L.hi)) ok = false;
      }
      r.hidden = !ok;
      if (ok) shown++;
    });
    count.textContent = shown + "件を表示中（全" + rows.length + "件）";
  }
  inputs.forEach(function (i) { i.addEventListener("input", apply); });
  if (gsel) gsel.addEventListener("change", apply);
  box.querySelector("[data-reset]").addEventListener("click", function () {
    inputs.forEach(function (i) { i.value = ""; });
    if (gsel) gsel.value = "";
    apply();
  });
  apply();

  // 並べ替え（見出しを押す）
  var sortCol = -1, dir = 1;
  cols.forEach(function (c, k) {
    var th = heads[c.idx];
    th.classList.add("dtt-sortable");
    th.tabIndex = 0;
    th.setAttribute("role", "button");
    th.setAttribute("aria-sort", "none");
    function go() {
      dir = (sortCol === k) ? -dir : 1;
      sortCol = k;
      var arr = rows.slice().sort(function (a, b) {
        var x = c.vals[a._i], y = c.vals[b._i];
        if (x === null && y === null) return a._i - b._i;
        if (x === null) return 1;
        if (y === null) return -1;
        return (x - y) * dir || (a._i - b._i);
      });
      arr.forEach(function (r) { tbody.appendChild(r); });
      heads.forEach(function (h2) { h2.setAttribute("aria-sort", "none"); h2.classList.remove("dtt-asc", "dtt-desc"); });
      th.setAttribute("aria-sort", dir === 1 ? "ascending" : "descending");
      th.classList.add(dir === 1 ? "dtt-asc" : "dtt-desc");
    }
    th.addEventListener("click", go);
    th.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
})();
