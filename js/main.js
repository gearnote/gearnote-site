document.addEventListener("DOMContentLoaded", () => {
  const pdCta = document.querySelector(".pd-cta");
  if (pdCta) {
    const h1 = document.querySelector(".pd-info h1");
    const productName = h1 ? h1.textContent.trim() : document.title;
    const shareText = `${productName} - GEARNOTE`;
    const shareLink = document.createElement("a");
    shareLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(location.href)}`;
    shareLink.target = "_blank";
    shareLink.rel = "nofollow noopener";
    shareLink.className = "btn btn-ghost btn-share";
    shareLink.innerHTML = "𝕏でシェア";
    pdCta.appendChild(shareLink);

    const pdDeep = document.querySelector(".pd-deep");
    if (pdDeep) {
      const bottomWrap = document.createElement("div");
      bottomWrap.className = "pd-cta-bottom-wrap";
      bottomWrap.appendChild(pdCta.cloneNode(true));
      pdDeep.insertAdjacentElement("afterend", bottomWrap);
    }
  }

  document.querySelectorAll(".back-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      if (document.referrer && new URL(document.referrer).origin === location.origin) {
        history.back();
      } else {
        location.href = link.getAttribute("href");
      }
    });
  });

  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      nav.classList.toggle("open");
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => nav.classList.remove("open"));
    });
  }

  // ダークモード固定：切替ボタンは取り除き、過去に保存されたライト設定も無効にする
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) themeToggle.remove();
  document.documentElement.setAttribute("data-theme", "dark");
  try {
    localStorage.removeItem("gearnote-theme");
  } catch (e) {}

  const rankingList = document.getElementById("ranking-list");
  const picksList = document.getElementById("picks-list");
  if ((rankingList || picksList) && typeof RANKING_POOL !== "undefined" && RANKING_POOL.length) {
    const getWeekNumber = (d) => {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    };

    const buildCtaHtml = (item) => {
      const detailHref = item.page || null;
      return detailHref
        ? `<a href="${detailHref}" class="btn btn-amazon btn-sm">くわしく見る</a>`
        : `<a href="${item.link}" class="btn btn-amazon btn-sm" target="_blank" rel="nofollow sponsored noopener">Amazonで最新価格を見る</a>`;
    };

    const poolSize = RANKING_POOL.length;

    // ---- Ranking: rotates weekly ----
    const weekIndex = getWeekNumber(new Date()) % poolSize;
    const rankingCount = Math.min(3, poolSize);
    const rankingItems = [];
    for (let i = 0; i < rankingCount; i++) {
      rankingItems.push(RANKING_POOL[(weekIndex + i) % poolSize]);
    }

    if (rankingList) {
      rankingList.innerHTML = "";
      rankingItems.forEach((item, i) => {
        const rank = i + 1;

        const card = document.createElement("div");
        card.className = "rank-card";
        card.setAttribute("data-reveal", "");

        const rankNumHtml = `<div class="rank-num">${rank}</div>`;

        const detailHref = item.page || null;
        const dOpen = detailHref ? `<a href="${detailHref}">` : "";
        const dClose = detailHref ? "</a>" : "";
        card.innerHTML =
          rankNumHtml +
          `<div class="thumb">${dOpen}<img src="${item.img}" alt="${item.name}" width="300" height="300" loading="lazy">${dClose}</div>` +
          `<div class="rank-body"><h3>${dOpen}${item.name}${dClose}</h3><p>${item.excerpt}</p></div>` +
          buildCtaHtml(item);

        rankingList.appendChild(card);
      });
    }

    // ---- Picks: rotates daily, and never shows what ranking is currently showing ----
    if (picksList) {
      picksList.innerHTML = "";
      const rankingSet = new Set(rankingItems);
      const picksPool = RANKING_POOL.filter((it) => !rankingSet.has(it));
      const picksPoolSize = picksPool.length || poolSize;
      const dayIndex = Math.floor(Date.now() / 86400000);
      const picksCount = Math.min(12, picksPoolSize);
      const picksStart = dayIndex % picksPoolSize;

      for (let i = 0; i < picksCount; i++) {
        const item = picksPool.length ? picksPool[(picksStart + i) % picksPoolSize] : RANKING_POOL[(picksStart + i) % poolSize];

        const card = document.createElement("div");
        card.className = "product-card";
        card.setAttribute("data-reveal", "");

        const detailHref = item.page || null;
        const dOpen = detailHref ? `<a href="${detailHref}">` : "";
        const dClose = detailHref ? "</a>" : "";
        card.innerHTML =
          `<div class="product-thumb">${dOpen}<img src="${item.img}" alt="${item.name}" loading="lazy">${dClose}</div>` +
          `<div class="product-body"><h3>${dOpen}${item.name}${dClose}</h3><p class="excerpt">${item.excerpt}</p><div class="product-meta cta-only">${buildCtaHtml(item)}</div></div>`;

        picksList.appendChild(card);
      }
    }

    // ---- New arrivals: rotates daily through the most recently added items ----
    const newArrivalsList = document.getElementById("new-arrivals-list");
    if (newArrivalsList) {
      newArrivalsList.innerHTML = "";
      const recentCount = Math.min(50, poolSize);
      const recentPool = RANKING_POOL.slice(poolSize - recentCount);
      const recentPoolSize = recentPool.length;
      const dayIndex = Math.floor(Date.now() / 86400000);
      const arrivalsCount = Math.min(10, recentPoolSize);
      const arrivalsStart = dayIndex % recentPoolSize;

      for (let i = 0; i < arrivalsCount; i++) {
        const item = recentPool[(arrivalsStart + i) % recentPoolSize];

        const card = document.createElement("div");
        card.className = "product-card";
        card.setAttribute("data-reveal", "");

        const detailHref = item.page || null;
        const dOpen = detailHref ? `<a href="${detailHref}">` : "";
        const dClose = detailHref ? "</a>" : "";
        card.innerHTML =
          `<div class="product-thumb">${dOpen}<img src="${item.img}" alt="${item.name}" loading="lazy">${dClose}</div>` +
          `<div class="product-body"><h3>${dOpen}${item.name}${dClose}</h3><p class="excerpt">${item.excerpt}</p><div class="product-meta cta-only">${buildCtaHtml(item)}</div></div>`;

        newArrivalsList.appendChild(card);
      }
    }
  }

  // ---------- Favorites ----------
  const FAV_KEY = "gearnote-favorites";

  const getFavorites = () => {
    try {
      return JSON.parse(localStorage.getItem(FAV_KEY)) || [];
    } catch (e) {
      return [];
    }
  };

  const saveFavorites = (list) => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(list));
    } catch (e) {
      /* localStorage unavailable (private mode etc.) — fail silently */
    }
  };

  const isFavorited = (link) => getFavorites().some((f) => f.link === link);

  const toggleFavorite = (product) => {
    const list = getFavorites();
    const idx = list.findIndex((f) => f.link === product.link);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(product);
    }
    saveFavorites(list);
    updateFavCount();
    return idx < 0;
  };

  const updateFavCount = () => {
    const badge = document.getElementById("nav-fav-count");
    if (!badge) return;
    const count = getFavorites().length;
    badge.textContent = count > 0 ? String(count) : "";
    badge.setAttribute("data-count", String(count));
  };

  const extractProductInfo = (el) => {
    const link = el.matches("a") ? el.href : el.querySelector("a.btn-amazon")?.href;
    const name = el.querySelector(".cat-product-name, h3")?.textContent.trim() || "";
    const imgEl = el.querySelector("img.cat-product-thumb, .product-thumb img, .thumb img");
    const img = imgEl ? imgEl.src : "";
    return { link, name, img };
  };

  const makeFavBtn = (product) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fav-btn";
    btn.setAttribute("aria-label", "お気に入りに追加");
    btn.textContent = "♡";
    if (product.link && isFavorited(product.link)) {
      btn.classList.add("active");
      btn.textContent = "♥";
    }
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!product.link) return;
      const nowFav = toggleFavorite(product);
      btn.classList.toggle("active", nowFav);
      btn.textContent = nowFav ? "♥" : "♡";
      const onFavPage = document.getElementById("favorites-list");
      if (onFavPage && !nowFav) {
        renderFavorites();
      }
    });
    return btn;
  };

  const injectFavButtons = (scope) => {
    scope.querySelectorAll(".rank-card, .product-card, .cat-product-item").forEach((card) => {
      if (card.querySelector(".fav-btn")) return;
      const product = extractProductInfo(card);
      if (!product.link) return;
      card.appendChild(makeFavBtn(product));
    });
  };

  injectFavButtons(document);
  updateFavCount();

  const pdGrid = document.querySelector(".pd-grid");
  const breadcrumbLinks = document.querySelectorAll(".breadcrumb a");
  if (pdGrid && breadcrumbLinks.length >= 2) {
    const categoryHref = breadcrumbLinks[1].getAttribute("href");
    const currentFile = location.pathname.split("/").pop();
    fetch(categoryHref)
      .then((res) => res.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const items = Array.from(doc.querySelectorAll(".cat-product-item")).filter((el) => {
          const href = el.getAttribute("href") || "";
          return href && !href.includes(currentFile);
        });
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
        const picked = items.slice(0, 4);
        if (!picked.length) return;

        const section = document.createElement("div");
        section.className = "related-products";
        const title = document.createElement("p");
        title.className = "related-products-title";
        title.textContent = "こんな商品も見られています";
        const row = document.createElement("div");
        row.className = "cat-product-row";
        picked.forEach((item) => row.appendChild(item.cloneNode(true)));
        section.appendChild(title);
        section.appendChild(row);
        pdGrid.parentElement.appendChild(section);
        injectFavButtons(row);
      })
      .catch(() => {});
  }

  const favoritesListEl = document.getElementById("favorites-list");
  function renderFavorites() {
    if (!favoritesListEl) return;
    const list = getFavorites();
    const emptyEl = document.getElementById("favorites-empty");
    favoritesListEl.innerHTML = "";
    if (!list.length) {
      favoritesListEl.hidden = true;
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    favoritesListEl.hidden = false;
    if (emptyEl) emptyEl.hidden = true;
    list.forEach((product) => {
      const a = document.createElement("a");
      a.href = product.link;
      a.className = "cat-product-item";
      a.target = "_blank";
      a.rel = "nofollow sponsored noopener";
      const thumbHtml = product.img
        ? `<img class="cat-product-thumb" src="${product.img}" alt="${product.name}" loading="lazy">`
        : `<div class="cat-product-thumb" style="background:linear-gradient(135deg,var(--brand-light),var(--brand));">♥</div>`;
      a.innerHTML =
        thumbHtml +
        `<div class="cat-product-info"><span class="cat-product-name">${product.name}</span></div>`;
      a.appendChild(makeFavBtn(product));
      favoritesListEl.appendChild(a);
    });
  }
  renderFavorites();

  // ---------- Product name search (all-products.html) ----------
  const allProductsGrid = document.getElementById("all-products-grid");
  if (allProductsGrid) {
    const items = Array.from(allProductsGrid.querySelectorAll(".cat-product-item"));
    const total = items.length;

    const searchBar = document.createElement("div");
    searchBar.className = "product-search";
    searchBar.innerHTML =
      `<input type="text" class="product-search-input" id="product-search-input" placeholder="商品名で検索（例：フライパン、水筒、イヤホン）" autocomplete="off">` +
      `<span class="product-search-count" id="product-search-count">全${total}件</span>`;
    allProductsGrid.parentElement.insertBefore(searchBar, allProductsGrid);

    const countEl = document.getElementById("product-search-count");
    const searchInput = document.getElementById("product-search-input");
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      let visible = 0;
      items.forEach((item) => {
        const name = (item.querySelector(".cat-product-name")?.textContent || "").toLowerCase();
        const match = !q || name.includes(q);
        item.classList.toggle("is-filtered-out", !match);
        if (match) visible++;
      });
      countEl.textContent = q ? `${visible}件 / 全${total}件` : `全${total}件`;
    });
  }

  const revealTargets = document.querySelectorAll("[data-reveal]");
  if (revealTargets.length) {
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
              setTimeout(() => entry.target.classList.add("in-view"), i * 60);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      revealTargets.forEach((el) => observer.observe(el));
    } else {
      revealTargets.forEach((el) => el.classList.add("in-view"));
    }
  }
});

// Channel tracking: ?src=note|tiktok remembers the visitor source and swaps the Amazon tracking ID on click.
(function () {
  var IDS = { note: 'hide0122-note-22', tiktok: 'hide0122-tiktok-22', x: 'hide0122-x-22' };
  try {
    var s = new URLSearchParams(location.search).get('src');
    if (s && IDS[s]) sessionStorage.setItem('gn_src', s);
  } catch (e) {}
  function current() {
    try { var s = sessionStorage.getItem("gn_src"); return s && IDS[s] ? IDS[s] : null; } catch (e) { return null; }
  }
  function swap(a) {
    var id = current();
    if (!id || !a || !a.href) return;
    if (a.href.indexOf('amazon.co.jp') < 0 || a.href.indexOf('tag=hide0122-22') < 0) return;
    a.href = a.href.replace('tag=hide0122-22', 'tag=' + id);
  }
  ['mousedown', 'touchstart', 'keydown', 'click'].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      swap(a);
    }, true);
  });
})();


// PWA install banner (sitewide) + service worker registration.
(function () {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {});
    });
  }

  function isStandalone() {
    try {
      return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    } catch (e) {
      return false;
    }
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }

  if (isStandalone()) return;

  var deferredPrompt = null;
  var banner = null;

  function buildBanner(innerHtml) {
    var el = document.createElement("div");
    el.className = "install-banner";
    el.innerHTML = innerHtml;
    // On the homepage, show it where the old scrolling ticker used to be (right after the hero);
    // every other page has no hero, so fall back to right after the header.
    var anchor = document.querySelector(".hero") || document.querySelector(".site-header");
    if (anchor) anchor.insertAdjacentElement("afterend", el);
    else document.body.insertBefore(el, document.body.firstChild);
    requestAnimationFrame(function () { el.classList.add("is-visible"); });
    return el;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (isIOS()) {
      banner = buildBanner(
        '<div class="install-banner-row">' +
          '<div class="install-banner-text">📌 GEARNOTEをホーム画面に追加できます' +
            '<ul class="install-banner-steps"><li>① 画面下の「共有」ボタンをタップ</li><li>② 「ホーム画面に追加」を選ぶ</li></ul>' +
          "</div>" +
        "</div>"
      );
      return;
    }
    // Android / desktop Chrome etc: wait for the real install prompt before showing anything.
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      if (banner) return;
      banner = buildBanner(
        '<div class="install-banner-row">' +
          '<div class="install-banner-text">📌 GEARNOTEをホーム画面に追加すると、次回からすぐ開けます</div>' +
          '<button type="button" class="install-banner-btn">ホーム画面に追加</button>' +
        "</div>"
      );
      var installBtn = banner.querySelector(".install-banner-btn");
      installBtn.addEventListener("click", function () {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.finally(function () {
          deferredPrompt = null;
          banner.classList.remove("is-visible");
        });
      });
    });
  });
})();

// 比較リスト（商品ページのボタンとヘッダーのリンク）
(function () {
  var s = document.createElement("script");
  s.src = "js/compare-list.js";
  s.defer = true;
  document.head.appendChild(s);
  var r = document.createElement("script");
  r.src = "js/recent-views.js";
  r.defer = true;
  document.head.appendChild(r);
})();
