/* GEARNOTE 比較リスト：商品ページに「比較リストに追加」ボタンを出し、追加した商品を compare-tool.html で並べて見られるようにする。
   保存先はブラウザの localStorage のみ（個人情報は送信しない）。最大4商品。 */
(function () {
  "use strict";
  var KEY = "gearnote-compare";
  var MAX = 4;

  function load() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(a) ? a.filter(function (x) { return typeof x === "string" && /^product-[a-z0-9-]+$/.test(x); }).slice(0, MAX) : [];
    } catch (e) { return []; }
  }
  function save(a) {
    try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch (e) {}
  }
  window.GearnoteCompare = { load: load, save: save, KEY: KEY, MAX: MAX };

  function slugOfPage() {
    var p = location.pathname.replace(/\/+$/, "").split("/").pop().replace(/\.html$/, "");
    return /^product-[a-z0-9-]+$/.test(p) ? p : null;
  }

  // ヘッダーのナビに「比較(N)」を、1件以上あるときだけ表示
  function navLink() {
    var nav = document.querySelector(".main-nav");
    if (!nav) return;
    var n = load().length;
    var el = nav.querySelector(".nav-compare");
    if (n === 0) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("a");
      el.className = "nav-compare";
      el.href = "compare-tool.html";
      var fav = nav.querySelector('a[href="favorites.html"]');
      if (fav && fav.nextSibling) nav.insertBefore(el, fav.nextSibling); else nav.appendChild(el);
    }
    el.textContent = "⚖ 比較（" + n + "）";
  }

  function productButton() {
    var slug = slugOfPage();
    var cta = document.querySelector(".pd-cta");
    if (!slug || !cta || cta.querySelector(".compare-toggle")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost compare-toggle";
    var hint = document.createElement("p");
    hint.className = "compare-hint";
    function render() {
      var list = load();
      var on = list.indexOf(slug) >= 0;
      btn.textContent = on ? "✓ 比較リストに追加済み（外す）" : "＋ 比較リストに追加";
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      if (list.length) {
        hint.innerHTML = '<a href="compare-tool.html">比較リストを見る（' + list.length + "/" + MAX + "商品）→</a>";
      } else {
        hint.textContent = "気になる商品を最大" + MAX + "つまで並べて、仕様を見比べられます。";
      }
    }
    btn.addEventListener("click", function () {
      var list = load();
      var i = list.indexOf(slug);
      if (i >= 0) { list.splice(i, 1); }
      else if (list.length >= MAX) { hint.textContent = "比較リストは最大" + MAX + "商品までです。比較ページで、不要な商品を外してください。"; return; }
      else { list.push(slug); }
      save(list); render(); navLink();
    });
    cta.appendChild(btn);
    cta.parentNode.insertBefore(hint, cta.nextSibling);
    render();
  }

  // 一覧・特集・新着などの商品カードに、小さな「＋ 比較」ボタンを付ける
  function cardButtons() {
    var cards = document.querySelectorAll(".product-card");
    if (!cards.length || slugOfPage()) return;
    function refresh(btn, slug) {
      var on = load().indexOf(slug) >= 0;
      btn.textContent = on ? "✓ 比較中" : "＋ 比較";
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
    cards.forEach(function (card) {
      var a = card.querySelector('a[href^="product-"]');
      var meta = card.querySelector(".product-meta");
      if (!a || !meta || meta.querySelector(".card-compare")) return;
      var slug = a.getAttribute("href").replace(/\.html.*$/, "");
      if (!/^product-[a-z0-9-]+$/.test(slug)) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-ghost btn-sm card-compare";
      b.addEventListener("click", function (ev) {
        ev.preventDefault();
        var list = load(), i = list.indexOf(slug);
        if (i >= 0) list.splice(i, 1);
        else if (list.length >= MAX) { b.textContent = "最大" + MAX + "商品まで"; return; }
        else list.push(slug);
        save(list); refresh(b, slug); navLink();
      });
      meta.appendChild(b);
      refresh(b, slug);
    });
  }

  function init() { navLink(); productButton(); cardButtons(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.addEventListener("storage", function (e) { if (e.key === KEY) navLink(); });
})();
