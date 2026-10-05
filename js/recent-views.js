/* GEARNOTE 最近見た商品：商品ページを開くとブラウザ内（localStorage）に記録し、トップと商品ページに小さな一覧を出す。
   保存先はこのブラウザだけ。個人情報は送信しない。最大12件。 */
(function () {
  "use strict";
  var KEY = "gearnote-recent";
  var MAX = 12;

  function load() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(a) ? a.filter(function (x) { return x && /^product-[a-z0-9-]+$/.test(x.s) && x.n; }).slice(0, MAX) : [];
    } catch (e) { return []; }
  }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pageSlug() {
    var p = location.pathname.replace(/\/+$/, "").split("/").pop().replace(/\.html$/, "");
    return /^product-[a-z0-9-]+$/.test(p) ? p : null;
  }
  function shortName(t) { t = String(t).trim(); return t.length > 44 ? t.slice(0, 44).replace(/\s+\S*$/, "") : t; }

  function record(slug) {
    var h1 = document.querySelector("h1");
    var og = document.querySelector('meta[property="og:image"]');
    if (!h1) return;
    var item = { s: slug, n: shortName(h1.textContent), i: og ? og.getAttribute("content") : "" };
    var a = load().filter(function (x) { return x.s !== slug; });
    a.unshift(item);
    save(a);
  }

  function stripHtml(items) {
    return '<div class="recent-head"><span class="recent-title">最近見た商品</span><button type="button" class="recent-clear">履歴を消す</button></div>' +
      '<div class="recent-row">' + items.map(function (x) {
        return '<a class="recent-item" href="' + x.s + '.html">' + (x.i ? '<img src="' + esc(x.i) + '" alt="' + esc(x.n) + '" loading="lazy">' : "") + '<span>' + esc(x.n) + "</span></a>";
      }).join("") + "</div>";
  }
  function init() {
    var slug = pageSlug();
    if (slug) record(slug);
    var items = load().filter(function (x) { return x.s !== slug; });
    if (!items.length) return;
    var box, removeEl;
    if (slug) {
      var deep = document.querySelector(".pd-deep");
      if (!deep) return;
      box = document.createElement("div");
      box.className = "recent-strip";
      box.innerHTML = stripHtml(items.slice(0, 8));
      deep.parentNode.insertBefore(box, deep.nextSibling);
      removeEl = box;
    } else if (document.getElementById("new-arrivals")) {
      var sec = document.createElement("section");
      sec.className = "section section-tight";
      sec.id = "recent-views";
      sec.innerHTML = '<div class="wrap"><div class="recent-strip">' + stripHtml(items.slice(0, 8)) + "</div></div>";
      var na = document.getElementById("new-arrivals");
      na.parentNode.insertBefore(sec, na);
      box = sec.querySelector(".recent-strip");
      removeEl = sec;
    } else { return; }
    var btn = box.querySelector(".recent-clear");
    if (btn) btn.addEventListener("click", function () { try { localStorage.removeItem(KEY); } catch (e) {} removeEl.remove(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
