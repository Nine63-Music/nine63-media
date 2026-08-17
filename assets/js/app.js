/* ACLASS — bootstrap, global interactions, delegation */
(function () {
  "use strict";

  const Utils = window.ACLASS.Utils;
  const Store = window.ACLASS.Store;
  const Audio = window.ACLASS.Audio;
  const C = window.ACLASS.Components;
  const icon = window.ACLASS.icon;
  const cfg = Utils.config;

  window.ACLASS.Toast = C.Toast;

  /* ---------- Artwork fallback (handles deleted/missing images) ---------- */
  document.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (img.tagName !== "IMG") return;
      if (img.src && img.src.startsWith("data:")) return;
      const card = img.closest("[data-card-id]");
      let beat = card ? Utils.byId.get(card.getAttribute("data-card-id")) : null;
      if (!beat) {
        const holder = img.closest("[data-art-id]");
        if (holder) beat = Utils.byId.get(holder.getAttribute("data-art-id"));
      }
      img.onerror = null;
      img.src = beat ? Utils.artDataURI(beat) : Utils.artDataURI(null, "a-class");
    },
    true
  );

  /* ---------- Sync playing indicators after audio changes ---------- */
  function setPlayIcon(btn, playing) {
    const iconWrap = btn.querySelector(":scope > .icon");
    if (iconWrap) {
      iconWrap.innerHTML = icon(playing ? "pause" : "play");
      return;
    }
    const inner = btn.querySelector(".btn--play");
    if (inner) {
      inner.innerHTML = icon(playing ? "pause" : "play");
      return;
    }
    btn.innerHTML = icon(playing ? "pause" : "play");
  }

  function syncPlayingUI() {
    document.querySelectorAll(".card").forEach((cardEl) => {
      C.syncCard(cardEl, cardEl.getAttribute("data-card-id"));
    });
    const cur = Audio.state.currentId;
    const playing = Audio.state.playing && !Audio.state.loading;
    document.querySelectorAll('[data-action="play"]').forEach((btn) => {
      const id = btn.getAttribute("data-id");
      const on = id === cur;
      setPlayIcon(btn, on && playing);
      const lbl = btn.querySelector('[data-role="lbl"]');
      if (lbl) lbl.textContent = on && playing ? "Pause" : "Play beat";
      const chip = btn.closest(".spotlight")?.querySelector(".spotlight__chip");
      if (chip && on) chip.textContent = playing ? "Now spinning" : "Paused";
    });
    document.querySelectorAll(".art-frame").forEach((f) => f.classList.toggle("is-playing", f.querySelector('[data-action="play"][data-id="' + cur + '"]') != null && playing));
  }

  Audio.subscribe(syncPlayingUI);
  Store.onChange(() => {
    C.updateBadges();
    syncPlayingUI();
  });

  /* ---------- Global action delegation ---------- */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");

    if (action === "play") {
      const grid = btn.closest("[data-queue]");
      let queue = null;
      if (grid) {
        const ids = (grid.getAttribute("data-queue") || "").split(",").filter(Boolean);
        queue = ids.map((x) => Utils.byId.get(x)).filter(Boolean);
      }
      Audio.playId(id, { queue });
      return;
    }

    if (action === "fav") {
      const faved = Store.toggleFav(id);
      C.Toast.show(faved ? "Added to favorites" : "Removed from favorites");
      C.updateBadges();
      syncPlayingUI();
      return;
    }

    if (action === "add-cart") {
      const license = btn.getAttribute("data-license");
      Store.addToCart(id, license);
      const beat = Utils.byId.get(id);
      const lic = cfg.licenses.find((l) => l.slug === license);
      C.Toast.show((beat ? beat.title + " · " : "") + (lic ? lic.name : "") + " added to cart");
      btn.textContent = "In cart — added";
      C.updateBadges();
      return;
    }

    if (action === "remove-cart") {
      Store.removeFromCart(id, btn.getAttribute("data-license"));
      C.Toast.show("Removed from cart");
      C.updateBadges();
      const row = btn.closest(".cart-item");
      if (row) row.remove();
      if (!Store.cartCount) {
        window.ACLASS.Router.dispatch();
      }
      return;
    }

    if (action === "tag") {
      location.hash = Utils.route("beats", { q: btn.getAttribute("data-tag") });
    }
  });

  /* ---------- Search overlay ---------- */
  const overlay = document.getElementById("search-overlay");
  const input = document.getElementById("search-input");
  const resultsEl = document.getElementById("search-results");
  let searchResults = [];

  function renderSearchResults(q) {
    searchResults = Utils.searchBeats(q).slice(0, 12);
    if (!searchResults.length) {
      resultsEl.innerHTML = '<p style="color:var(--text-mute);padding:20px 6px">Nothing matches that. Try a mood — like "dark" or "chill".</p>';
      return;
    }
    const queueAttr = "data-queue=\"" + e(searchResults.map((b) => b.id).join(",")) + "\"";
    resultsEl.setAttribute("data-queue", searchResults.map((b) => b.id).join(","));
    resultsEl.innerHTML =
      '<div class="search-results-list" ' + queueAttr + '>' +
      searchResults
        .map(
          (b) =>
            '<div class="search-result">' +
            '<a class="search-result__art" href="#/beat/' + e(b.slug) + '" data-art-id="' + e(b.id) + '"><img src="' + e(Utils.artSrc(b)) + '" alt="Artwork for ' + e(b.title) + '" loading="lazy"></a>' +
            '<a href="#/beat/' + e(b.slug) + '">' +
            '<div class="search-result__title">' + e(b.title) + "</div>" +
            '<div class="search-result__sub">' + e(Utils.genreLine(b)) + (b.bpm ? " · " + b.bpm + " BPM" : "") + "</div>" +
            "</a>" +
            '<button class="search-result__play" data-action="play" data-id="' + e(b.id) + '" aria-label="Play ' + e(b.title) + '">' + icon("play") + "</button>" +
            "</div>"
        )
        .join("") +
      "</div>";
  }

  function openSearch() {
    overlay.hidden = false;
    input.value = "";
    resultsEl.innerHTML = "";
    overlay.removeAttribute("data-queue");
    setTimeout(() => input.focus(), 30);
    document.body.style.overflow = "hidden";
  }
  function closeSearch() {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  document.getElementById("nav-search").addEventListener("click", openSearch);
  document.getElementById("search-close").addEventListener("click", closeSearch);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSearch();
  });

  let searchTimer = null;
  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderSearchResults(input.value.trim()), 90);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = input.value.trim();
      closeSearch();
      location.hash = Utils.route("beats", { q: q || undefined });
    } else if (e.key === "Escape") {
      closeSearch();
    }
  });

  /* ---------- Mobile drawer ---------- */
  const burger = document.getElementById("nav-burger");
  const drawer = document.getElementById("nav-drawer");
  burger.addEventListener("click", () => {
    const open = drawer.hidden;
    drawer.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
  });
  drawer.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      drawer.hidden = true;
      burger.setAttribute("aria-expanded", "false");
    })
  );

  /* ---------- Keyboard shortcuts ---------- */
  window.addEventListener("keydown", (e) => {
    const target = e.target;
    if (target && (target.closest("input, textarea, select") || target.isContentEditable)) return;

    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      Audio.toggle();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      Audio.seekBy(-5);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      Audio.seekBy(5);
    } else if (e.key.toLowerCase() === "m") {
      Audio.toggleMute();
    } else if (e.key === "/" && overlay.hidden) {
      e.preventDefault();
      openSearch();
    }
  });

  /* ---------- Boot ---------- */
  C.updateBadges();
  window.ACLASS.Router.boot();

  /* small helper: escape, reused in overlay rendering */
  function e(s) {
    return Utils.escapeHTML(s);
  }
})();
