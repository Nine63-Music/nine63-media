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
    return (
      '<img src="' + Utils.escapeHTML(src) + '" alt="' + Utils.escapeHTML(alt) + '" loading="lazy" decoding="async">'
    );
  }

  /* ---------- Beat card ---------- */
  function beatCard(beat, opts) {
    opts = opts || {};
    const playing = Audio.state.currentId === beat.id;
    const faved = Store.isFav(beat.id);
    const collection = Utils.collectionOf(beat);
    const price = opts.price || cfg.startingPrice;
    const subBits = [];
    const genres = Utils.genresOf(beat);
    if (genres[0]) subBits.push(genres[0]);
    if (beat.bpm) subBits.push(beat.bpm + " BPM");
    if (beat.key) subBits.push(beat.key);

    return (
      '<article class="card' +
      (playing ? " is-playing" : "") +
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
      '<button class="card__play" data-action="play" data-id="' +
      Utils.escapeHTML(beat.id) +
      '" aria-label="' +
      (playing && Audio.state.playing ? "Pause " : "Play ") +
      Utils.escapeHTML(beat.title) +
      '">' +
      icon(playing && Audio.state.playing ? "pause" : "play") +
      "</button>" +
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
      '<div class="card__sub">' +
      Utils.escapeHTML(subBits.join(" · ")) +
      (collection && !genres.length ? " · " + Utils.escapeHTML(collection.displayName) : "") +
      "</div>" +
      '<div class="card__foot">' +
      '<span class="card__price">' +
      Utils.escapeHTML(Utils.fmtPrice(price)) +
      " <small>starting</small>" +
      "</span>" +
      '<a class="btn btn--sm btn--ghost" href="#/beat/' +
      Utils.escapeHTML(beat.slug) +
      '" data-action="license">License</a>' +
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

  window.ACLASS = Object.assign(window.ACLASS || {}, {
    Components: { Toast, beatCard, syncCard, soundTile, genreTile, moodTile, sectionHead, skeletonCards, beatsGrid, updateBadges, imgTag },
  });
})();
