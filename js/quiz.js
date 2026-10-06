/* GEARNOTE 診断クイズ：質問に答えると、条件に合う種類の目安と、選び方ガイド・掲載商品を表示する（ブラウザ内で完結、回答は送信しない） */
(function () {
  "use strict";
  var app = document.getElementById("quiz-app");
  var dataEl = document.getElementById("quiz-data");
  if (!app || !dataEl) return;
  var Q;
  try { Q = JSON.parse(dataEl.textContent); } catch (e) { app.textContent = "読み込みに失敗しました。"; return; }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var step = 0, answers = [];

  function showQuestion() {
    var q = Q.questions[step];
    var html = '<div class="quiz-progress">質問 ' + (step + 1) + " / " + Q.questions.length + '</div><h2 class="quiz-q">' + esc(q.q) + '</h2><div class="quiz-options">';
    q.options.forEach(function (o, i) {
      html += '<button type="button" class="quiz-opt" data-i="' + i + '">' + esc(o.t) + "</button>";
    });
    html += "</div>";
    if (step > 0) html += '<p><button type="button" class="quiz-back">← ひとつ前の質問へ</button></p>';
    app.innerHTML = html;
    app.querySelectorAll(".quiz-opt").forEach(function (b) {
      b.addEventListener("click", function () {
        answers[step] = parseInt(b.getAttribute("data-i"), 10);
        if (step + 1 < Q.questions.length) { step++; showQuestion(); } else { showResult(); }
      });
    });
    var back = app.querySelector(".quiz-back");
    if (back) back.addEventListener("click", function () { step--; showQuestion(); });
    app.scrollIntoView({ block: "nearest" });
  }

  function showResult() {
    var score = {}, flags = {};
    answers.forEach(function (ai, qi) {
      var o = Q.questions[qi].options[ai];
      Object.keys(o.s || {}).forEach(function (k) { score[k] = (score[k] || 0) + o.s[k]; });
      if (o.flag) flags[o.flag] = true;
    });
    var keys = Object.keys(Q.results).sort(function (a, b) { return (score[b] || 0) - (score[a] || 0); });
    var top = Q.results[keys[0]];
    var second = keys[1] && (score[keys[1]] || 0) >= (score[keys[0]] || 0) - 1 && (score[keys[1]] || 0) > 0 ? Q.results[keys[1]] : null;
    var html = '<div class="quiz-result"><p class="quiz-progress">診断結果の目安</p><h2 class="quiz-q">あなたの条件では、<strong>' + esc(top.name) + "</strong>が候補です</h2>" +
      "<p>" + esc(top.why) + "</p>" +
      '<h3 class="quiz-h3">仕様表で見るポイント</h3><ul>' + top.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" +
      '<p class="quiz-caution">⚠️ ' + esc(top.caution) + "</p>";
    Object.keys(flags).forEach(function (f) { if (Q.flags[f]) html += '<p class="quiz-caution">⚠️ ' + esc(Q.flags[f]) + "</p>"; });
    if (second) html += '<p class="quiz-second">次に近い種類：<strong>' + esc(second.name) + "</strong>（" + esc(second.why) + "）</p>";
    if (top.products.length) {
      html += '<h3 class="quiz-h3">GEARNOTEに掲載している、この種類の商品</h3><div class="recent-row quiz-prods">' + top.products.map(function (p) {
        return '<div class="quiz-prod"><a class="recent-item" href="' + p.s + '.html"><img src="' + esc(p.i) + '" alt="' + esc(p.n) + '" loading="lazy"><span>' + esc(p.n) + '</span></a><button type="button" class="btn btn-ghost btn-sm quiz-cmp" data-s="' + p.s + '">＋ 比較に追加</button></div>';
      }).join("") + "</div>";
    }
    html += '<p style="margin-top:18px;"><a class="btn btn-amazon" href="' + Q.guide + '.html">選び方ガイドで、仕様の見方をくわしく読む</a> <button type="button" class="btn btn-ghost quiz-retry">もう一度診断する</button></p>' +
      '<p class="pd-source-note">※一般的な目安です。特定の製品の効果や安全性を保証するものではありません。使用方法・注意事項は必ず各製品の取扱説明書をご確認ください。</p></div>';
    app.innerHTML = html;
    // 結果の共有（回答をURLに入れる。回答の中身は番号だけで、個人情報は含まない）
    var shareUrl = location.origin + location.pathname + "?a=" + answers.join(".");
    var shareBox = document.createElement("p");
    shareBox.className = "quiz-share";
    shareBox.innerHTML = '<button type="button" class="btn btn-ghost btn-sm quiz-copy">この結果のURLをコピー</button> ' +
      (navigator.share ? '<button type="button" class="btn btn-ghost btn-sm quiz-nshare">共有する</button>' : "");
    app.querySelector(".quiz-result").insertBefore(shareBox, app.querySelector(".pd-source-note"));
    shareBox.querySelector(".quiz-copy").addEventListener("click", function () {
      var b = this;
      function done() { b.textContent = "コピーしました"; setTimeout(function () { b.textContent = "この結果のURLをコピー"; }, 1800); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(shareUrl).then(done, function () { window.prompt("URLをコピーしてください", shareUrl); });
      else window.prompt("URLをコピーしてください", shareUrl);
    });
    var ns = shareBox.querySelector(".quiz-nshare");
    if (ns) ns.addEventListener("click", function () { navigator.share({ title: document.title, text: "診断結果：" + top.name + "が候補でした", url: shareUrl }).catch(function () {}); });
    app.querySelector(".quiz-retry").addEventListener("click", function () { step = 0; answers = []; try { history.replaceState(null, "", location.pathname); } catch (e) {} showQuestion(); });
    app.querySelectorAll(".quiz-cmp").forEach(function (b) {
      b.addEventListener("click", function () {
        var C = window.GearnoteCompare; if (!C) { location.href = "compare-tool.html"; return; }
        var list = C.load(), s = b.getAttribute("data-s");
        if (list.indexOf(s) >= 0) { b.textContent = "✓ 追加済み"; return; }
        if (list.length >= C.MAX) { b.textContent = "最大" + C.MAX + "商品まで"; return; }
        list.push(s); C.save(list); b.textContent = "✓ 比較に追加しました";
      });
    });
    app.scrollIntoView({ block: "start" });
  }

  // 共有URL（?a=0.2.1）から結果を開く
  var m = location.search.match(/[?&]a=([0-9.]+)/);
  if (m) {
    var parts = m[1].split(".").map(function (x) { return parseInt(x, 10); });
    var okShared = parts.length === Q.questions.length && parts.every(function (v, i) { return v >= 0 && v < Q.questions[i].options.length; });
    if (okShared) { answers = parts; step = Q.questions.length - 1; showResult(); return; }
  }
  showQuestion();
})();
