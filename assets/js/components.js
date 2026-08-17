/* ACLASS — shared UI components (cards, tiles, toast, badges) */
(function () {
  "use strict";

  const Utils = window.ACLASS.Utils;
  const Store = window.ACLASS.Store;
  const Audio = window.ACLASS.Audio;
  const icon = window.ACLASS.icon;
  const cfg = Utils.config;

  /* ---------- Toast ---------- */
  const toastEl = () => document.getElementById("toast");
  let toastTimer = null;
  const Toast = {
    show(msg) {
      const el = toastEl();
      if (!el) return;
      el.textContent = msg;
      el.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        el.hidden = true;
      }, 2600);
    },
  };

  /* ---------- Artwork ---------- */
  function imgTag(beat, className, alt) {
    const src = Utils.artSrc(beat);
    const crossorigin = (Utils.config && Utils.config.assetBase) ? ' crossorigin="anonymous"' : '';
    return (
      '<img src="' + Utils.escapeHTML(src) + '"' + crossorigin + ' alt="' + Utils.escapeHTML(alt) + '" loading="lazy" decoding="async">'
    );
  }

  /* ---------- Beat card ---------- */
  function beatCard(beat, opts) {
    opts = opts || {};
    const playing = Audio.state.currentId === beat.id;
    const faved = Store.isFav(beat.id);
    const sold = beat.status === "sold";
    const collection = Utils.collectionOf(beat);
    const price = opts.price || cfg.startingPrice;
    const genres = Utils.genresOf(beat);
    const metaBits = [];
    if (beat.key) metaBits.push(beat.key);

    return (
      '<article class="card' +
      (playing && !sold ? " is-playing" : "") +
      (sold ? " is-sold" : "") +
      '" data-card-id="' +
      Utils.escapeHTML(beat.id) +
      '">' +
      '<div class="card__art">' +
      '<a href="#/beat/' +
      Utils.escapeHTML(beat.slug) +
      '" aria-label="Open ' +
      Utils.escapeHTML(beat.title) +
      '">' +
      imgTag(beat, "card__art-img", "Artwork for " + beat.title + " by " + beat.producer) +
      "</a>" +
      (sold
        ? '<span class="card__sold-badge">Sold</span>'
        : '<button class="card__play" data-action="play" data-id="' +
          Utils.escapeHTML(beat.id) +
          '" aria-label="' +
          (playing && Audio.state.playing ? "Pause " : "Play ") +
          Utils.escapeHTML(beat.title) +
          '">' +
          icon(playing && Audio.state.playing ? "pause" : "play") +
          "</button>") +
      '<button class="card__fav' +
      (faved ? " is-faved" : "") +
      '" data-action="fav" data-id="' +
      Utils.escapeHTML(beat.id) +
      '" aria-label="' +
      (faved ? "Remove " : "Add ") +
      Utils.escapeHTML(beat.title) +
      " " +
      (faved ? "from" : "to") +
      ' favorites" aria-pressed="' +
      faved +
      '">' +
      icon("heart") +
      "</button>" +
      '<span class="card__eq" aria-hidden="true"><span></span><span></span><span></span><span></span></span>' +
      "</div>" +
      '<div class="card__body">' +
      '<a class="card__title" href="#/beat/' +
      Utils.escapeHTML(beat.slug) +
      '">' +
      Utils.escapeHTML(beat.title) +
      "</a>" +
      '<div class="card__tags">' +
      genres.slice(0, 2).map(function (g) {
        var gSlug = g.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return '<a class="card__genre" href="#/genre/' + Utils.escapeHTML(gSlug) + '">' + Utils.escapeHTML(g) + "</a>";
      }).join("") +
      (collection && !genres.length ? '<span class="card__genre">' + Utils.escapeHTML(collection.displayName) + "</span>" : "") +
      metaBits.map(function (b) {
        return '<span class="card__meta">' + Utils.escapeHTML(b) + "</span>";
      }).join("") +
      "</div>" +
      '<div class="card__foot">' +
      (sold
        ? '<span class="card__price card__price--sold">Sold</span>'
        : '<span class="card__price">' +
          Utils.escapeHTML(Utils.fmtPrice(price)) +
          " <small>starting</small>" +
          "</span>" +
          '<a class="btn btn--sm btn--ghost" href="#/beat/' +
          Utils.escapeHTML(beat.slug) +
          '" data-action="license">License</a>') +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  /* Refresh a single card's play/fav state in place (cheap DOM update). */
  function syncCard(cardEl, beatId) {
    const playing = Audio.state.currentId === beatId;
    const isPaused = playing && !Audio.state.playing;
    cardEl.classList.toggle("is-playing", playing);
    const btn = cardEl.querySelector("[data-action=play]");
    if (btn) {
      btn.innerHTML = icon(playing && !isPaused ? "pause" : "play");
      btn.setAttribute("aria-label", (playing && !isPaused ? "Pause " : "Play ") + "beat");
    }
    const eq = cardEl.querySelector(".card__eq");
    if (eq) eq.style.display = playing && !isPaused ? "flex" : "";
  }

  /* ---------- Sound / genre tiles ---------- */
  function soundTile(folder) {
    const sample = Utils.data.beats.find((b) => b.collection === folder.slug);
    const img = sample ? Utils.artSrc(sample) : "";
    return (
      '<a class="tile" href="#/collection/' +
      Utils.escapeHTML(folder.slug) +
      '">' +
      '<span class="tile__bg">' +
      (img ? '<img src="' + Utils.escapeHTML(img) + '" alt="" loading="lazy" decoding="async">' : "") +
      "</span>" +
      '<span class="tile__body">' +
      '<span class="tile__kicker">' +
      Utils.escapeHTML((folder.genres[0] || "Sound").split(" ")[0].toUpperCase()) +
      "</span>" +
      '<span class="tile__name">' +
      Utils.escapeHTML(folder.displayName) +
      "</span>" +
      '<span class="tile__count">' +
      folder.beatCount +
      " beats — press play, see what happens" +
      "</span>" +
      "</span>" +
      "</a>"
    );
  }

  function genreTile(genre) {
    const beats = Utils.data.beats.filter((b) => (b.genres || []).includes(genre.slug));
    const sample = beats[0];
    const img = sample ? Utils.artSrc(sample) : "";
    return (
      '<a class="tile tile--grad" href="#/genre/' +
      Utils.escapeHTML(genre.slug) +
      '">' +
      '<span class="tile__bg">' +
      (img ? '<img src="' + Utils.escapeHTML(img) + '" alt="" loading="lazy" decoding="async">' : "") +
      "</span>" +
      '<span class="tile__body">' +
      '<span class="tile__name">' +
      Utils.escapeHTML(genre.name) +
      "</span>" +
      '<span class="tile__count">' +
      beats.length +
      " beat" +
      (beats.length === 1 ? "" : "s") +
      "</span>" +
      "</span>" +
      "</a>"
    );
  }

  function moodTile(mood) {
    const beats = Utils.data.beats.filter((b) => (b.moods || []).includes(mood.slug));
    const sample = beats[0];
    const img = sample ? Utils.artSrc(sample) : "";
    return (
      '<a class="tile tile--grad" href="#/mood/' +
      Utils.escapeHTML(mood.slug) +
      '">' +
      '<span class="tile__bg">' +
      (img ? '<img src="' + Utils.escapeHTML(img) + '" alt="" loading="lazy" decoding="async">' : "") +
      "</span>" +
      '<span class="tile__body">' +
      '<span class="tile__name">' +
      Utils.escapeHTML(mood.name) +
      "</span>" +
      '<span class="tile__count">' +
      beats.length +
      " beat" +
      (beats.length === 1 ? "" : "s") +
      "</span>" +
      "</span>" +
      "</a>"
    );
  }

  /* ---------- Section scaffolding ---------- */
  function sectionHead(eyebrow, title, sub, linkHref, linkLabel) {
    return (
      '<div class="section-head">' +
      "<div>" +
      (eyebrow ? '<p class="eyebrow">' + Utils.escapeHTML(eyebrow) + "</p>" : "") +
      '<h2 class="display h2" style="margin-top:' +
      (eyebrow ? "10px" : "0") +
      '">' +
      title +
      "</h2>" +
      (sub ? '<p style="color:var(--text-mute);margin-top:10px">' + Utils.escapeHTML(sub) + "</p>" : "") +
      "</div>" +
      (linkHref ? '<a class="section-head__link" href="' + linkHref + '">' + Utils.escapeHTML(linkLabel || "View all") + "</a>" : "") +
      "</div>"
    );
  }

  function skeletonCards(n) {
    let out = "";
    for (let i = 0; i < n; i++) {
      out +=
        '<div class="card" aria-hidden="true">' +
        '<div class="card__art" style="background:var(--surface-2)"></div>' +
        '<div class="card__body">' +
        '<div style="height:14px;width:70%;background:var(--surface-2);border-radius:6px"></div>' +
        '<div style="height:10px;width:45%;background:var(--surface-2);border-radius:6px"></div>' +
        "</div>" +
        "</div>";
    }
    return out;
  }

  /* ---------- Header badges ---------- */
  function updateBadges() {
    const fav = document.getElementById("fav-badge");
    const cart = document.getElementById("cart-badge");
    const favCount = Store.favorites.length;
    const cartCount = Store.cartCount;
    if (fav) {
      fav.hidden = favCount === 0;
      fav.textContent = favCount > 99 ? "99+" : String(favCount);
    }
    if (cart) {
      cart.hidden = cartCount === 0;
      cart.textContent = cartCount > 99 ? "99+" : String(cartCount);
    }
  }

  /* ---------- Section: beats grid ---------- */
  function beatsGrid(beats, opts) {
    const ids = beats.map((b) => b.id).join(",");
    return '<div class="grid ' + (opts && opts.wide ? "grid--beats-wide" : "grid--beats") + '" data-queue="' + Utils.escapeHTML(ids) + '">' + beats.map((b) => beatCard(b, opts)).join("") + "</div>";
  }

  /* ---------- Credit pack card ---------- */
  function creditPackCard(pack) {
    const inCart = Store.creditPackHas(pack.slug);
    const perCredit = (pack.price / pack.credits).toFixed(2).replace(/\.?0+$/, "");
    const isPopular = pack.credits === 5;
    return (
      '<div class="credit-pack-card' + (isPopular ? "" : " credit-pack-card--best") + '">' +
      '<div class="credit-pack-card__badge">' + (isPopular ? "Popular" : "Best value") + "</div>" +
      '<h3 class="credit-pack-card__name">' + Utils.escapeHTML(pack.name) + "</h3>" +
      '<div class="credit-pack-card__price">' + Utils.fmtPrice(pack.price) + "</div>" +
      '<div class="credit-pack-card__per">' + Utils.fmtPrice(perCredit) + " per credit · " + Utils.fmtPrice(25) + " value each</div>" +
      '<p class="credit-pack-card__desc">' + Utils.escapeHTML(pack.blurb) + "</p>" +
      '<button class="btn btn--primary" data-action="add-credits" data-pack="' + Utils.escapeHTML(pack.slug) + '">' +
      (inCart ? "In cart — add again" : "Add to cart") +
      "</button>" +
      "</div>"
    );
  }

  /* ---------- Bundle card ---------- */
  function bundleCard(bundle) {
    const inCart = Store.bundleHas(bundle.slug);
    const normalPrice = bundle.beats * cfg.startingPrice;
    const savings = normalPrice - bundle.price;
    return (
      '<div class="bundle-card">' +
      '<div class="bundle-card__badge">Save ' + Utils.fmtPrice(savings) + "</div>" +
      '<h3 class="bundle-card__name">' + Utils.escapeHTML(bundle.name) + "</h3>" +
      '<div class="bundle-card__price">' + Utils.fmtPrice(bundle.price) + "</div>" +
      '<div class="bundle-card__per">' + bundle.beats + " Basic licenses · " + Utils.fmtPrice(normalPrice) + " normally</div>" +
      '<p class="bundle-card__desc">' + Utils.escapeHTML(bundle.blurb) + "</p>" +
      '<button class="btn btn--ghost" data-action="add-bundle" data-bundle="' + Utils.escapeHTML(bundle.slug) + '">' +
      (inCart ? "In cart — add again" : "Add to cart") +
      "</button>" +
      "</div>"
    );
  }

  /* ---------- Credit pricing helper for beat detail ---------- */
  function creditPriceLine(license) {
    var cc = (cfg.licenseCredits || {})[license.slug];
    if (cc == null) return "";
    var cv = cfg.creditValue || 25;
    var cash = Math.max(0, license.price - cc * cv);
    return (
      '<div class="license-card__credit">' +
      "or " + Utils.fmtPrice(cash) + " + " + cc + " credit" + (cc > 1 ? "s" : "") +
      "</div>"
    );
  }

  /* ---------- Savings badge ---------- */
  function savingsBadge(amount) {
    if (!amount || amount <= 0) return "";
    return '<span class="savings-badge">You save ' + Utils.fmtPrice(amount) + "</span>";
  }

  /* ---------- Featured picks section ---------- */
  function featuredPicks(beats) {
    if (!beats || beats.length === 0) return "";
    var hero = beats[0];
    var rest = beats.slice(1, 5);
    var playing = Audio.state.currentId === hero.id;

    var rightCards = rest.map(function (b, i) {
      var isPlaying = Audio.state.currentId === b.id;
      var genres = Utils.genresOf(b);
      var genreTags = genres.slice(0, 2).map(function (g) {
        var gSlug = g.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return '<span class="fp-card__genre">' + Utils.escapeHTML(g) + "</span>";
      }).join("");
      return (
        '<a class="fp-card" href="#/beat/' + Utils.escapeHTML(b.slug) + '">' +
        '<div class="fp-card__art">' +
        '<img src="' + Utils.escapeHTML(Utils.artSrc(b)) + '" alt="' + Utils.escapeHTML(b.title) + '" loading="lazy" decoding="async">' +
        '<span class="fp-card__num">' + (i + 2) + "</span>" +
        "</div>" +
        '<div class="fp-card__info">' +
        '<div class="fp-card__title">' + Utils.escapeHTML(b.title) + "</div>" +
        '<div class="fp-card__tags">' + genreTags +
        "</div>" +
        "</div>" +
        '<button class="fp-card__play" data-action="play" data-id="' + Utils.escapeHTML(b.id) + '" aria-label="Play ' + Utils.escapeHTML(b.title) + '">' +
        (isPlaying && Audio.state.playing ? icon("pause") : icon("play")) +
        "</button>" +
        "</a>"
      );
    }).join("");

    var heroGenres = Utils.genresOf(hero);
    var heroTags = heroGenres.slice(0, 3).map(function (g) {
      return '<span class="fp-hero__genre">' + Utils.escapeHTML(g) + "</span>";
    }).join("");
    var heroMeta = (function() { var bits = []; if (hero.key) bits.push(hero.key); if (hero.year) bits.push(hero.year); return bits.length ? " · " + bits.join(" · ") : ""; })();

    return (
      '<div class="featured-picks">' +
      '<div class="fp-hero">' +
      '<a class="fp-hero__link" href="#/beat/' + Utils.escapeHTML(hero.slug) + '">' +
      '<div class="fp-hero__art">' +
      '<img src="' + Utils.escapeHTML(Utils.artSrc(hero)) + '" alt="Artwork for ' + Utils.escapeHTML(hero.title) + '" decoding="async">' +
      '<div class="fp-hero__overlay"></div>' +
      '<span class="fp-hero__badge">Featured</span>' +
      '<button class="fp-hero__play" data-action="play" data-id="' + Utils.escapeHTML(hero.id) + '" aria-label="' + (playing ? "Pause " : "Play ") + Utils.escapeHTML(hero.title) + '">' +
      (playing && Audio.state.playing ? icon("pause") : icon("play")) +
      "</button>" +
      "</div>" +
      "</a>" +
      '<div class="fp-hero__meta">' +
      '<div class="fp-hero__title">' + Utils.escapeHTML(hero.title) + "</div>" +
      '<div class="fp-hero__tags">' + heroTags + '<span class="fp-hero__meta-text">' + Utils.escapeHTML(heroMeta.replace(/^ · /, "")) + "</span></div>" +
      '<a class="btn btn--primary btn--sm" href="#/beat/' + Utils.escapeHTML(hero.slug) + '" style="margin-top:14px">License now</a>' +
      "</div>" +
      "</div>" +
      '<div class="fp-stack">' +
      rightCards +
      "</div>" +
      "</div>"
    );
  }

  window.ACLASS = Object.assign(window.ACLASS || {}, {
    Components: { Toast, beatCard, syncCard, soundTile, genreTile, moodTile, sectionHead, skeletonCards, beatsGrid, updateBadges, imgTag, creditPackCard, bundleCard, creditPriceLine, savingsBadge, featuredPicks },
  });
})();
