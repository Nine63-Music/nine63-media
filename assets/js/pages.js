/* ACLASS — page renderers */
(function () {
  "use strict";

  const Utils = window.ACLASS.Utils;
  const Store = window.ACLASS.Store;
  const Audio = window.ACLASS.Audio;
  const Recs = window.ACLASS.Recs;
  const C = window.ACLASS.Components;
  const icon = window.ACLASS.icon;
  const cfg = Utils.config;
  const data = Utils.data;
  const e = Utils.escapeHTML;

  const STATE = {
    vibeMood: "dark",
  };

  /* ================= helpers ================= */

  function meta(title, description, opts) {
    opts = opts || {};
    return {
      title: title + " — NINE63 MUSIC",
      description: description,
      ogType: opts.ogType,
      jsonLd: opts.jsonLd,
    };
  }

  function autoDescription(beat) {
    const genres = Utils.genresOf(beat);
    const moods = Utils.moodsOf(beat);
    const coll = Utils.collectionOf(beat);
    let s = "A ";
    if (moods.length) s += moods.slice(0, 2).join(" and ").toLowerCase() + ", ";
    s += genres.length ? genres.slice(0, 2).join(" + ").toLowerCase() : coll ? coll.displayName.toLowerCase() : "";
    s = s.replace(/,\s+$/, "") + " beat crafted by " + beat.producer + ".";
    const bits = [];
    if (beat.key) bits.push("key of " + beat.key);
    if (beat.year) bits.push("made in " + beat.year);
    if (bits.length) s += " " + bits.join(" · ") + ".";
    s += " Every license includes the files and usage rights you need to make it a release.";
    return s;
  }

  function beatJsonLd(beat) {
    const genres = Utils.genresOf(beat);
    const offers = cfg.licenses.map((l) => ({
      "@type": "Offer",
      name: l.name + " license",
      price: l.price,
      priceCurrency: cfg.currency,
      availability: "https://schema.org/InStock",
    }));
    return {
      "@context": "https://schema.org",
      "@type": "MusicRecording",
      name: beat.title,
      byArtist: { "@type": "Person", name: beat.producer },
      genre: genres,
      inAlbum: { "@type": "MusicAlbum", name: Utils.collectionOf(beat) ? Utils.collectionOf(beat).displayName : undefined },
      offers: offers,
    };
  }

  function notFound() {
    return {
      html:
        '<section class="container section"><div class="empty-state" style="max-width:640px;margin:0 auto">' +
        '<p class="eyebrow" style="justify-content:center">404</p>' +
        '<div class="display h3" style="margin:14px 0 8px">That page drifted off the beat.</div>' +
        "<p>Whatever you were looking for isn't here — but the music is.</p>" +
        '<a class="btn btn--primary" href="#/beats" style="margin-top:22px">Back to the beats</a>' +
        "</div></section>",
      title: "Page not found — NINE63 MUSIC",
      description: "This page doesn't exist, but the beats do.",
    };
  }

  function breadcrumb(items) {
    let out = '<nav class="breadcrumb" aria-label="Breadcrumb">';
    items.forEach((it, i) => {
      if (i > 0) out += '<span class="sep" aria-hidden="true">/</span>';
      out += it.href ? '<a href="' + it.href + '">' + e(it.label) + "</a>" : "<span>" + e(it.label) + "</span>";
    });
    return out + "</nav>";
  }

  /* ================= HOME ================= */

  function renderHome() {
    const featured = Utils.sortBeats(data.beats.filter((b) => b.featured), "popular")[0] || data.beats[0];
    const fresh = Recs.fresh(cfg.freshCount);
    const trending = Recs.trending(cfg.trendingCount);
    const personal = Recs.forYou(8);
    const hasTaste = Object.keys(Store.playCounts).length > 0 || Store.favorites.length > 0;
    const moods = data.moods.slice(0, 6);

    const mood = data.moods.find((m) => m.slug === STATE.vibeMood) || data.moods[0];
    const vibeBeats = Utils.sortBeats(data.beats.filter((b) => (b.moods || []).includes(mood.slug)), "popular");
    const vibePick = vibeBeats[0] || data.beats[0];

    const subBits = [beatMeta(featured)];

    const html =
      hero(featured) +
      marquee() +

      '<section class="section" id="featured-picks" style="padding-top:0">' +
      '<div class="container">' +
      C.sectionHead(null, "Featured <em>picks</em>", "Hand-selected from the vault — press play on these first.", "#/beats", "Browse all") +
      C.featuredPicks(Utils.sortBeats(data.beats.filter((b) => b.featured), "popular")) +
      "</div>" +
      "</section>" +

      '<section class="section" id="save-more" style="padding-top:0">' +
      '<div class="container">' +
      C.sectionHead(null, "Save more <em>with credits</em>", "Prepay for credits and apply them to any beat. Save 17–23% on every purchase.", "#/credits", "How it works") +
      '<div class="grid grid--credits">' +
      (cfg.creditPacks || []).map((p) => C.creditPackCard(p)).join("") +
      (cfg.bundles || []).map((b) => C.bundleCard(b)).join("") +
      "</div>" +
      "</div>" +
      "</section>" +

      '<section class="section" id="fresh">' +
      '<div class="container">' +
      C.sectionHead(null, cfg.copy.freshTitle + " <em>" + subTitleWord(2) + "</em>", cfg.copy.freshSub, "#/beats?sort=newest", "All beats") +
      C.beatsGrid(fresh) +
      "</div>" +
      "</section>" +

      '<section class="section" id="sounds" style="padding-top:0">' +
      '<div class="container">' +
      C.sectionHead(null, cfg.copy.soundsTitle + " <em>" + subTitleWord(3) + "</em>", cfg.copy.soundsSub, "#/genres", "All genres") +
      '<div class="grid grid--tiles">' +
      data.folders.map((f) => C.soundTile(f)).join("") +
      "</div>" +
      "</div>" +
      "</section>" +

      (trending.length ? sectionWithHead("trending", cfg.copy.trendingTitle, cfg.copy.trendingSub, "#/beats?sort=popular", "Trending list") + C.beatsGrid(trending) + "</div></div></section>" : "") +

      '<section class="section" id="vibe" style="padding-top:0">' +
      '<div class="container">' +
      C.sectionHead(null, cfg.copy.vibeTitle + " <em>" + subTitleWord(4) + "</em>", cfg.copy.vibeSub, "#/beats", "All beats") +
      '<div class="chip-row" data-role="vibe-chips" role="group" aria-label="Choose a mood">' +
      moods.map((m) => chip(m, m.slug === STATE.vibeMood)).join("") +
      "</div>" +
      '<div class="vibe-preview" data-role="vibe-preview" style="margin-top:26px"></div>' +
      "</div>" +
      "</section>" +

      (personal.length ? sectionWithHead("picks", hasTaste ? "Because you've been listening" : "Editor's picks", hasTaste ? "Handpicked from your taste." : "A first listen for new ears.", "#/beats", "Browse all") + C.beatsGrid(personal) + "</div></div></section>" : "") +

      '<section class="section" style="padding-top:0">' +
      '<div class="container">' +
      '<div class="about-band">' +
      '<p class="eyebrow" style="margin-bottom:18px">The studio</p>' +
      '<h2 class="display h2" style="margin-bottom:20px">' +
      e(cfg.copy.storyTitle).replace("studio", "<em>studio</em>") +
      "</h2>" +
      '<p class="lede" style="max-width:52ch;margin-bottom:30px">' +
      e(cfg.copy.storyText) +
      "</p>" +
      '<div class="stat-block" style="margin-bottom:34px">' +
      stat(data.beats.length, "beats in the vault") +
      stat(data.genres.length, "sounds to explore") +
      stat(data.moods.length, "moods to feel") +
      "</div>" +
      '<div style="display:flex;gap:14px;flex-wrap:wrap">' +
      '<a class="btn btn--primary" href="#/beats">' + e(cfg.copy.finalCta) + "</a>" +
      '<a class="btn btn--ghost" href="#/about">The story</a>' +
      "</div>" +
      "</div>" +
      "</div>" +
      "</section>";

    const _ = subBits;
    return Object.assign(
      meta(
        "You just found your sound — A-Class Beats by 963 Beats",
        "A-class beats for artists who feel more. New jazz, melodic trap, plug, drill, supertrap and more — browse, listen, license.",
        { ogType: "website" }
      ),
      {
        html: html,
        mount(app) {
          mountVibeSection(app);
        },
      }
    );
  }

  function subTitleWord(n) {
    return n === 2 ? "warm" : n === 3 ? "wide" : n === 4 ? "yours" : "fresh";
  }

  function sectionWithHead(id, title, sub, href, label) {
    return '<section class="section" id="' + id + '"><div class="container">' + C.sectionHead(null, title + " <em></em>", sub, href, label);
  }

  function stat(n, label) {
    return '<div class="hero__stat"><b>' + Utils.fmt(n) + "</b><span>" + e(label) + "</span></div>";
  }

  function chip(m, active) {
    return (
      '<button class="chip' + (active ? " is-active" : "") + '" data-role="vibe-chip" data-slug="' + e(m.slug) + '" aria-pressed="' + active + '">' + e(m.name) + "</button>"
    );
  }

  function beatMeta(beat) {
    const bits = [];
    if (beat.key) bits.push(beat.key);
    if (beat.year) bits.push(beat.year);
    return Utils.genreLine(beat) + (bits.length ? " · " + bits.join(" · ") : "");
  }

  function hero(beat) {
    const playing = Audio.state.currentId === beat.id;
    return (
      '<section class="hero">' +
      '<div class="container hero__inner">' +
      '<div class="hero__copy">' +
      '<p class="eyebrow">' + e(cfg.copy.heroEyebrow) + "</p>" +
      '<h1 class="display h1">' + e(cfg.copy.heroTitle[0]) + "<em>" + e(cfg.copy.heroTitle[1]) + "</em></h1>" +
      '<p class="lede">' + e(cfg.copy.heroLede) + "</p>" +
      '<div class="hero__ctas">' +
      '<a class="btn btn--primary btn--lg" href="#/beats">' +
      '<span class="icon" aria-hidden="true">' + icon("play") + "</span>" +
      e(cfg.copy.ctaPrimary) +
      "</a>" +
      '<a class="btn btn--ghost btn--lg" href="#/licenses">' + e(cfg.copy.ctaSecondary) + "</a>" +
      "</div>" +
      '<div class="hero__stats">' +
      stat(data.beats.length, "beats") +
      stat(data.folders.length, "sound worlds") +
      stat(Utils.sortBeats(data.beats, "newest")[0].year || "-", "fresh from the lab") +
      "</div>" +
      "</div>" +

      '<div class="hero__stage">' +
      '<div class="spotlight">' +
      '<div class="spotlight__vinyl" aria-hidden="true"></div>' +
      '<div class="spotlight__card">' +
      '<div class="spotlight__art">' +
      '<img src="' + e(Utils.artSrc(beat)) + '" alt="Artwork for ' + e(beat.title) + '" decoding="async">' +
      '<span class="spotlight__chip">' + (playing ? (Audio.state.playing ? "Now spinning" : "Paused") : "Featured") + "</span>" +
      '<button class="spotlight__bigplay" data-action="play" data-id="' + e(beat.id) + '" aria-label="' + (playing ? "Pause " : "Play ") + e(beat.title) + '">' +
      icon(playing && Audio.state.playing ? "pause" : "play") +
      "</button>" +
      '<div class="spotlight__meta">' +
      "<div>" +
      '<div class="spotlight__title">' + e(beat.title) + "</div>" +
      '<div class="spotlight__sub">' + e(beatMeta(beat)) + "</div>" +
      "</div>" +
      '<div class="spotlight__actions">' +
      '<a class="btn btn--primary btn--sm" href="#/beat/' + e(beat.slug) + '">License</a>' +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</section>"
    );
  }

  function marquee() {
    const items = cfg.marquee.concat(cfg.marquee);
    const track = items.map((m) => '<span class="marquee__item">' + e(m) + "</span>").join("");
    return (
      '<div class="marquee" aria-hidden="true"><div class="marquee__track">' +
      track +
      "</div></div>"
    );
  }

  function mountVibeSection(app) {
    const chips = app.querySelectorAll("[data-role=vibe-chip]");
    const preview = app.querySelector("[data-role=vibe-preview]");
    if (!preview) return;

    const render = (mood) => {
      const beats = Utils.sortBeats(data.beats.filter((b) => (b.moods || []).includes(mood.slug)), "popular");
      const pick = beats[0];
      if (!pick) {
        preview.innerHTML = '<p class="empty-state">No beats in this mood yet.</p>';
        return;
      }
      preview.innerHTML =
        '<div class="grid grid--beats">' +
        beats.slice(0, 4).map((b) => C.beatCard(b)).join("") +
        "</div>" +
        '<div style="margin-top:18px"><a class="btn btn--ghost" href="#/beats?mood=' + e(mood.slug) + '">Hear every "' + e(mood.name) + '" beat →</a></div>';
    };

    chips.forEach((chipEl) => {
      chipEl.addEventListener("click", () => {
        STATE.vibeMood = chipEl.getAttribute("data-slug");
        chips.forEach((c2) => {
          const on = c2 === chipEl;
          c2.classList.toggle("is-active", on);
          c2.setAttribute("aria-pressed", String(on));
        });
        const mood = data.moods.find((m) => m.slug === STATE.vibeMood);
        if (mood) render(mood);
      });
    });
    const mood = data.moods.find((m) => m.slug === STATE.vibeMood) || data.moods[0];
    render(mood);
  }

  /* ================= LIBRARY ================= */

  function renderLibrary(parts, params) {
    const state = {
      q: String(params.q || ""),
      sort: params.sort || "newest",
      genres: toArr(params.genre),
      moods: toArr(params.mood),
      bpm: params.bpm || "any",
      key: params.key || "any",
    };
    const results = applyFilters(state);
    const activeCount = state.genres.length + state.moods.length + (state.bpm !== "any" ? 1 : 0) + (state.key !== "any" ? 1 : 0) + (state.q ? 1 : 0);

    const html =
      '<div class="container page-head">' +
      breadcrumb([{ label: "Home", href: "#/" }, { label: "Beats" }]) +
      '<h1 class="display h1">The <em>vault</em></h1>' +
      '<p class="page-head__meta">' +
      data.beats.length +
      " beats across " +
      data.genres.length +
      " sounds. Filter until something grabs you." +
      "</p>" +
      "</div>" +

      '<div class="filterbar">' +
      '<div class="filterbar__inner">' +
      '<div class="search-box" style="max-width:320px">' +
      '<span class="icon" aria-hidden="true">' + icon("search") + "</span>" +
      '<input type="search" placeholder="Search the vault…" value="' + e(state.q) + '" data-role="lib-q" aria-label="Search beats">' +
      "</div>" +
      '<div class="select">' +
      '<select data-role="lib-sort" aria-label="Sort beats">' +
      sortOptions(state.sort) +
      "</select>" +
      "</div>" +
      '<div class="select">' +
      '<select data-role="lib-bpm" aria-label="Filter by tempo">' +
      bpmOptions(state.bpm) +
      "</select>" +
      "</div>" +
      '<div class="select">' +
      '<select data-role="lib-key" aria-label="Filter by key">' +
      keyOptions(state.key) +
      "</select>" +
      "</div>" +
      "</div>" +
      "</div>" +

      '<div class="container">' +
      '<div class="filters-panel">' +
      '<div class="filters-row">' +
      '<span class="eyebrow" style="margin-right:6px">Genre</span>' +
      data.genres.map((g) => filterChip("genre", g.slug, g.name, state.genres)).join("") +
      "</div>" +
      '<div class="filters-row">' +
      '<span class="eyebrow" style="margin-right:6px">Mood</span>' +
      data.moods.map((m) => filterChip("mood", m.slug, m.name, state.moods)).join("") +
      "</div>" +
      "</div>" +
      (activeCount ? '<div class="filters-row" style="gap:10px">' + activeTags(state) + '<button class="chip" data-role="lib-clear">Clear all</button></div>' : "") +
      '<p class="results-count"><b>' + results.length + "</b> beat" + (results.length === 1 ? "" : "s") + " found</p>" +
      '<div data-role="lib-results">' +
      (results.length ? C.beatsGrid(results) : emptyLibrary(state)) +
      "</div>" +
      "</div>";

    return Object.assign(meta("Browse the vault — " + results.length + " beats", "Every beat in the room, filterable by genre, mood, tempo and key."), {
      html,
      mount(app) {
        mountLibrary(app, state);
      },
    });
  }

  function toArr(v) {
    if (v === undefined) return [];
    return Array.isArray(v) ? v : [v];
  }

  function applyFilters(state) {
    let beats = data.beats;
    if (state.q) beats = Utils.searchBeats(state.q);
    if (state.genres.length) beats = beats.filter((b) => state.genres.some((g) => (b.genres || []).includes(g)));
    if (state.moods.length) beats = beats.filter((b) => state.moods.some((m) => (b.moods || []).includes(m)));
    if (state.bpm !== "any" && state.bpm) {
      const r = { slow: [1, 89], mid: [90, 124], fast: [125, 149], hyper: [150, 999] }[state.bpm] || [1, 999];
      beats = beats.filter((b) => b.bpm && b.bpm >= r[0] && b.bpm <= r[1]);
    }
    if (state.key !== "any" && state.key) {
      beats = beats.filter((b) => b.key && keyRoot(b.key) === state.key);
    }
    return Utils.sortBeats(beats, state.sort);
  }

  function keyRoot(key) {
    const m = /^([A-G][#b]?)/.exec(key);
    return m ? m[1] : null;
  }

  function sortOptions(current) {
    const opts = [
      ["newest", "Newest"],
      ["popular", "Most popular"],
      ["title", "A–Z"],
      ["bpm_high", "Fastest"],
      ["bpm_low", "Slowest"],
    ];
    return opts.map(([v, l]) => '<option value="' + v + '"' + (v === current ? " selected" : "") + ">" + l + "</option>").join("");
  }

  function bpmOptions(current) {
    const opts = [
      ["any", "Any tempo"],
      ["slow", "Slow — under 90"],
      ["mid", "Mid — 90 to 124"],
      ["fast", "Fast — 125 to 149"],
      ["hyper", "Hyper — 150+"],
    ];
    return opts.map(([v, l]) => '<option value="' + v + '"' + (v === current ? " selected" : "") + ">" + l + "</option>").join("");
  }

  function keyOptions(current) {
    const roots = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    let out = '<option value="any">Any key</option>';
    out += roots
      .filter((r) => data.beats.some((b) => b.key && keyRoot(b.key) === r))
      .map((r) => '<option value="' + r + '"' + (r === current ? " selected" : "") + ">" + r + "</option>")
      .join("");
    return out;
  }

  function filterChip(type, slug, label, selected) {
    const on = selected.includes(slug);
    return (
      '<button class="chip' + (on ? " is-active" : "") + '" data-role="lib-' + type + '" data-slug="' + e(slug) + '" aria-pressed="' + on + '">' + e(label) + "</button>"
    );
  }

  function activeTags(state) {
    let out = "";
    const push = (label, remover) => {
      out += '<span class="filter-tag">' + e(label) + '<button data-role="lib-remove" data-remover="' + e(remover) + '" aria-label="Remove filter ' + e(label) + '">×</button></span>';
    };
    if (state.q) push('"' + state.q + '"', "q");
    state.genres.forEach((g) => {
      const name = data.genres.find((x) => x.slug === g);
      push(name ? name.name : g, "genre:" + g);
    });
    state.moods.forEach((m) => {
      const name = data.moods.find((x) => x.slug === m);
      push(name ? name.name : m, "mood:" + m);
    });
    if (state.bpm !== "any") push(bpmLabel(state.bpm), "bpm");
    if (state.key !== "any") push("Key of " + state.key, "key");
    return out;
  }

  function bpmLabel(v) {
    return { slow: "Under 90 BPM", mid: "90–124 BPM", fast: "125–149 BPM", hyper: "150+ BPM" }[v] || v;
  }

  function emptyLibrary(state) {
    return (
      '<div class="empty-state">' +
      '<div class="display h3">' + e(cfg.copy.emptyTitle) + "</div>" +
      "<p>" + e(cfg.copy.emptyText) + "</p>" +
      '<button class="btn btn--primary" data-role="lib-clear">Reset the filters</button>' +
      "</div>"
    );
  }

  function syncUrl(state) {
    const q = {
      q: state.q || undefined,
      sort: state.sort !== "newest" ? state.sort : undefined,
      genre: state.genres.length ? state.genres : undefined,
      mood: state.moods.length ? state.moods : undefined,
      bpm: state.bpm !== "any" ? state.bpm : undefined,
      key: state.key !== "any" ? state.key : undefined,
    };
    history.replaceState(null, "", Utils.route("beats", q));
  }

  function mountLibrary(app, state) {
    const qInput = app.querySelector("[data-role=lib-q]");
    const sortSel = app.querySelector("[data-role=lib-sort]");
    const bpmSel = app.querySelector("[data-role=lib-bpm]");
    const keySel = app.querySelector("[data-role=lib-key]");
    const results = app.querySelector("[data-role=lib-results]");

    const apply = (reloadUrl) => {
      const list = applyFilters(state);
      results.innerHTML = list.length ? C.beatsGrid(list) : emptyLibrary(state);
      const count = app.querySelector(".results-count");
      if (count) count.innerHTML = "<b>" + list.length + "</b> beat" + (list.length === 1 ? "" : "s") + " found";
      if (reloadUrl !== false) syncUrl(state);
    };

    let t = null;
    qInput.addEventListener("input", () => {
      state.q = qInput.value.trim();
      clearTimeout(t);
      t = setTimeout(() => apply(), 160);
    });
    sortSel.addEventListener("change", () => { state.sort = sortSel.value; apply(); });
    bpmSel.addEventListener("change", () => { state.bpm = bpmSel.value; apply(); });
    keySel.addEventListener("change", () => { state.key = keySel.value; apply(); });

    app.querySelectorAll("[data-role=lib-genre]").forEach((b) => {
      b.addEventListener("click", () => {
        const slug = b.getAttribute("data-slug");
        state.genres = state.genres.includes(slug) ? state.genres.filter((x) => x !== slug) : state.genres.concat(slug);
        b.classList.toggle("is-active", state.genres.includes(slug));
        b.setAttribute("aria-pressed", String(state.genres.includes(slug)));
        apply();
        rebuildTags(app, state, apply);
      });
    });
    app.querySelectorAll("[data-role=lib-mood]").forEach((b) => {
      b.addEventListener("click", () => {
        const slug = b.getAttribute("data-slug");
        state.moods = state.moods.includes(slug) ? state.moods.filter((x) => x !== slug) : state.moods.concat(slug);
        b.classList.toggle("is-active", state.moods.includes(slug));
        b.setAttribute("aria-pressed", String(state.moods.includes(slug)));
        apply();
        rebuildTags(app, state, apply);
      });
    });
    app.querySelectorAll("[data-role=lib-clear]").forEach((b) => b.addEventListener("click", () => clearAll(app, state, apply, qInput)));
    app.querySelectorAll("[data-role=lib-remove]").forEach((b) => b.addEventListener("click", () => removeTag(app, state, apply, qInput, b.getAttribute("data-remover"))));
  }

  function rebuildTags(app, state, apply) {
    const clearRow = app.querySelector('[data-role="lib-clear"]');
    const container = clearRow ? clearRow.closest(".filters-row") : null;
    if (!container) return;
    container.innerHTML = activeTags(state) + '<button class="chip" data-role="lib-clear">Clear all</button>';
    container.querySelectorAll("[data-role=lib-clear]").forEach((b) => b.addEventListener("click", () => clearAll(app, state, apply, app.querySelector("[data-role=lib-q]"))));
    container.querySelectorAll("[data-role=lib-remove]").forEach((b) => b.addEventListener("click", () => removeTag(app, state, apply, app.querySelector("[data-role=lib-q]"), b.getAttribute("data-remover"))));
  }

  function clearAll(app, state, apply, qInput) {
    state.q = ""; state.genres = []; state.moods = []; state.bpm = "any"; state.key = "any";
    if (qInput) qInput.value = "";
    const sortSel = app.querySelector("[data-role=lib-sort]"); if (sortSel) sortSel.value = "newest"; state.sort = "newest";
    const bpmSel = app.querySelector("[data-role=lib-bpm]"); if (bpmSel) bpmSel.value = "any";
    const keySel = app.querySelector("[data-role=lib-key]"); if (keySel) keySel.value = "any";
    app.querySelectorAll("[data-role^=lib-genre],[data-role^=lib-mood]").forEach((b) => { b.classList.remove("is-active"); b.setAttribute("aria-pressed", "false"); });
    apply();
    rebuildTags(app, state, apply);
  }

  function removeTag(app, state, apply, qInput, remover) {
    const [type, val] = remover.split(":");
    if (type === "q") { state.q = ""; if (qInput) qInput.value = ""; }
    else if (type === "genre") { state.genres = state.genres.filter((x) => x !== val); const chip = app.querySelector('[data-role="lib-genre"][data-slug="' + val + '"]'); if (chip) { chip.classList.remove("is-active"); chip.setAttribute("aria-pressed", "false"); } }
    else if (type === "mood") { state.moods = state.moods.filter((x) => x !== val); const chip = app.querySelector('[data-role="lib-mood"][data-slug="' + val + '"]'); if (chip) { chip.classList.remove("is-active"); chip.setAttribute("aria-pressed", "false"); } }
    else if (type === "bpm") { state.bpm = "any"; const sel = app.querySelector("[data-role=lib-bpm]"); if (sel) sel.value = "any"; }
    else if (type === "key") { state.key = "any"; const sel = app.querySelector("[data-role=lib-key]"); if (sel) sel.value = "any"; }
    apply();
    rebuildTags(app, state, apply);
  }

  /* ================= BEAT DETAIL ================= */

  function renderBeat(parts) {
    const slug = parts[1];
    const beat = Utils.bySlug.get(slug);
    if (!beat) return notFound();

    const playing = Audio.state.currentId === beat.id;
    const faved = Store.isFav(beat.id);
    const genres = Utils.genresOf(beat);
    const moods = Utils.moodsOf(beat);
    const coll = Utils.collectionOf(beat);
    const similar = Recs.similar(beat, cfg.relatedCount).slice(0, cfg.relatedCount);
    const youPlayed = becauseRow(beat);
    const description = beat.description || autoDescription(beat);

    const html =
      '<div class="container beat-hero">' +
      breadcrumb([
        { label: "Home", href: "#/" },
        { label: "Beats", href: "#/beats" },
        { label: beat.title },
      ]) +
      '<div class="beat-hero__inner">' +
      '<div class="beat-hero__art">' +
      '<div class="art-frame art-frame--square' + (playing ? " is-playing" : "") + '">' +
      '<img src="' + e(Utils.artSrc(beat)) + '" alt="Artwork for ' + e(beat.title) + ' by ' + e(beat.producer) + '" decoding="async">' +
      '<button class="art-frame__play" data-action="play" data-id="' + e(beat.id) + '" aria-label="' + (playing ? "Pause " : "Play ") + e(beat.title) + '">' +
      '<span class="btn--play" aria-hidden="true">' + icon(playing && Audio.state.playing ? "pause" : "play") + "</span>" +
      "</button>" +
      "</div>" +
      '<div class="beat-hero__actions">' +
      (beat.status === "sold"
        ? '<span class="btn btn--sold btn--lg">This beat has been sold</span>'
        : '<button class="btn btn--primary btn--lg" data-action="play" data-id="' + e(beat.id) + '">' +
          '<span class="icon" aria-hidden="true">' + icon(playing && Audio.state.playing ? "pause" : "play") + "</span>" +
          (playing && Audio.state.playing ? "Pause" : "Play beat") +
          "</button>" +
          '<button class="btn btn--ghost btn--lg" data-action="fav" data-id="' + e(beat.id) + '">' +
          '<span class="icon" aria-hidden="true">' + icon("heart") + "</span>" +
          (faved ? "Favorited" : "Favorite") +
          "</button>") +
      "</div>" +
      "</div>" +

      '<div class="beat-hero__info">' +
      '<p class="eyebrow">' + (coll ? e(coll.displayName) : "NINE63 MUSIC") + "</p>" +
      '<h1 class="beat-title">' + e(beat.title) + "</h1>" +
      '<p class="beat-byline">by <strong>' + e(beat.producer) + "</strong></p>" +

      '<div class="meta-strip">' +
      (beat.key ? '<span class="meta-pill">Key of <b>' + e(beat.key) + "</b></span>" : "") +
      (beat.year ? '<span class="meta-pill">Made in <b>' + beat.year + "</b></span>" : "") +
      (beat.playCount ? '<span class="meta-pill">Played <b>' + Utils.fmt(beat.playCount) + "</b> times</span>" : "") +
      "</div>" +

      '<div class="meta-strip" style="margin-top:0">' +
      genres.map((g) => '<a class="meta-pill" href="#/genre/' + e(genSlug(beat, g)) + '">' + e(g) + "</a>").join("") +
      moods.map((m) => '<a class="meta-pill" href="#/mood/' + e(moodSlug(beat, m)) + '">' + e(m) + "</a>").join("") +
      "</div>" +

      '<div class="tags-row">' +
      (beat.tags || []).map((t) => '<button class="tag" data-action="tag" data-tag="' + e(t) + '">#' + e(t) + "</button>").join("") +
      "</div>" +

      '<div class="para"><p>' + e(description) + "</p></div>" +

      '<div style="margin-top:30px">' +
      (beat.status === "sold"
        ? '<div class="sold-notice"><h2 class="display h3">This beat has been sold</h2><p style="color:var(--text-mute);font-size:0.95rem;margin-top:8px">The exclusive rights to this beat have been purchased. Browse more beats to find your next track.</p><a class="btn btn--primary btn--lg" href="#/beats" style="margin-top:18px">Browse beats</a></div>'
        : '<h2 class="display h3" style="margin-bottom:6px">Choose your license</h2>' +
      '<p style="color:var(--text-mute);font-size:0.92rem;margin-bottom:18px">Pick the rights you need. You can always upgrade later — leases are just the start.</p>' +
      (Store.creditsRemaining > 0 ? '<p style="color:var(--amber-bright);font-size:0.85rem;margin-bottom:14px">You have <b>' + Store.creditsRemaining + " credit" + (Store.creditsRemaining > 1 ? "s" : "") + "</b> available.</p>" : "") +
      '<div class="license-grid">' +
      cfg.licenses
        .map((l) => {
          const creditCost = (cfg.licenseCredits || {})[l.slug];
          const hasCredits = creditCost != null && Store.creditsRemaining >= creditCost;
          const creditCash = creditCost != null ? Math.max(0, l.price - creditCost * (cfg.creditValue || 25)) : 0;
          return (
          '<div class="license-card' + (l.popular ? " license-card--pick" : "") + '">' +
          '<div class="license-card__top">' +
          "<div>" +
          '<div class="license-card__name">' + e(l.name) + "</div>" +
          (l.popular ? '<span class="license-card__tag">Most chosen</span>' : l.tag ? '<span class="license-card__tag">' + e(l.tag) + "</span>" : "") +
          "</div>" +
          '<div class="license-card__price">' + e(Utils.fmtPrice(l.price)) + (l.slug === "exclusive" ? " <small>negotiable</small>" : "") +
          (creditCost != null ? '<div class="license-card__credit">or ' + e(Utils.fmtPrice(creditCash)) + " + " + creditCost + " credit" + (creditCost > 1 ? "s" : "") + "</div>" : "") +
          "</div>" +
          "</div>" +
          '<p class="license-card__desc">' + e(l.blurb) + "</p>" +
          '<ul class="license-card__features">' + l.features.map((f) => "<li>" + e(f) + "</li>").join("") + "</ul>" +
          '<div class="license-card__actions">' +
          '<button class="btn ' + (l.popular ? "btn--primary" : "btn--ghost") + '" data-action="add-cart" data-id="' + e(beat.id) + '" data-license="' + e(l.slug) + '">' +
          (Store.cartHas(beat.id, l.slug) ? "In cart" : "Add " + l.name + " to cart") +
          "</button>" +
          (creditCost != null
            ? '<button class="btn ' + (hasCredits ? "btn--credit" : "btn--ghost btn--disabled") + '" data-action="buy-with-credit" data-id="' + e(beat.id) + '" data-license="' + e(l.slug) + '"' + (hasCredits ? "" : " disabled") + ">" +
              (hasCredits ? "Buy with " + creditCost + " credit" + (creditCost > 1 ? "s" : "") : "Buy credits first") +
              "</button>"
            : "") +
          "</div>" +
          "</div>"
          );
        })
        .join("") +
      "</div>" +
      '<p class="note" style="margin-top:16px">Not sure which one? <a href="#/licenses" style="color:var(--amber-bright);text-decoration:underline">Read the license guide</a> — it takes a minute and saves you headaches later. <a href="#/credits" style="color:var(--amber-bright);text-decoration:underline">Or learn about credits</a>.</p>') +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>";

    const relatedHtml =
      (similar.length
        ? '<section class="section section--tight" style="padding-top:20px"><div class="container">' +
          C.sectionHead(null, "More like <em>this</em>", "Same family, same energy.", "#/beats", "Browse all") +
          C.beatsGrid(similar) +
          "</div></section>"
        : "") +
      (youPlayed
        ? '<section class="section section--tight" style="padding-top:20px"><div class="container">' +
          C.sectionHead(null, "Because you played <em>" + e(youPlayed.title) + "</em>", "If you liked that, start here.", "#/beats", "Browse all") +
          C.beatsGrid(youPlayed.beats) +
          "</div></section>"
        : "");

    return Object.assign(
      meta(
        beat.title + " — " + Utils.genreLine(beat) + " beat by " + beat.producer,
        description.slice(0, 155),
        { ogType: "music.song", jsonLd: beatJsonLd(beat) }
      ),
      { html: html + relatedHtml }
    );
  }

  function genSlug(beat, name) {
    const g = data.genres.find((x) => x.name === name);
    return g ? g.slug : (beat.genres || []).find((x) => Utils.titleCase(x) === name) || "";
  }
  function moodSlug(beat, name) {
    const m = data.moods.find((x) => x.name === name);
    return m ? m.slug : (beat.moods || []).find((x) => Utils.titleCase(x) === name) || "";
  }

  function becauseRow(beat) {
    const plays = Object.keys(Store.playCounts);
    const prev = plays
      .map((id) => Utils.byId.get(id))
      .filter((b) => b && b.id !== beat.id)
      .sort((a, b) => (Store.playCounts[b.id] || 0) - (Store.playCounts[a.id] || 0));
    const anchor = prev[0];
    if (!anchor) return null;
    return { title: anchor.title, beats: Recs.becauseYouPlayed(anchor, cfg.relatedCount).slice(0, cfg.relatedCount) };
  }

  /* ================= COLLECTION / GENRE / MOOD ================= */

  function renderCollection(parts) {
    const slug = parts[1];
    const folder = data.folders.find((f) => f.slug === slug);
    if (!folder) return notFound();
    const beats = Utils.sortBeats(data.beats.filter((b) => b.collection === slug), "newest");
    const sample = beats[0];

    return Object.assign(
      meta(folder.displayName + " — beats", folder.tagline || folder.displayName + " — beats crafted by " + cfg.brand.producer + "."),
      {
        html:
          '<div class="container page-head">' +
          breadcrumb([{ label: "Home", href: "#/" }, { label: "Genres", href: "#/genres" }, { label: folder.displayName }]) +
          '<p class="eyebrow">' + e((folder.genres[0] || "Sound").toUpperCase()) + "</p>" +
          '<h1 class="display h1">' + e(folder.displayName) + "</h1>" +
          '<p class="lede" style="max-width:60ch">' + e(folder.tagline || folder.displayName + " — a world of sound.") + "</p>" +
          '<div class="meta-strip">' +
          folder.genres.map((g) => '<a class="meta-pill" href="#/genre/' + e(slugify2(g)) + '">' + e(g) + "</a>").join("") +
          folder.moods.map((m) => '<a class="meta-pill" href="#/mood/' + e(slugify2(m)) + '">' + e(m) + "</a>").join("") +
          "</div>" +
          "</div>" +
          '<section class="container" style="padding-top:10px">' +
          '<p class="results-count"><b>' + beats.length + "</b> beat" + (beats.length === 1 ? "" : "s") + " in this world</p>" +
          C.beatsGrid(beats) +
          "</section>",
      }
    );
  }

  function slugify2(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function renderGenre(parts) {
    const slug = parts[1];
    const genre = data.genres.find((g) => g.slug === slug);
    if (!genre) return notFound();
    const beats = Utils.sortBeats(data.beats.filter((b) => (b.genres || []).includes(slug)), "newest");
    return Object.assign(
      meta(genre.name + " beats", genre.name + " beats by " + cfg.brand.producer + ". " + beats.length + " tracks, ready to license."),
      {
        html:
          '<div class="container page-head">' +
          breadcrumb([{ label: "Home", href: "#/" }, { label: "Genres", href: "#/genres" }, { label: genre.name }]) +
          '<p class="eyebrow">Genre</p>' +
          '<h1 class="display h1">' + e(genre.name) + " <em>beats</em></h1>" +
          '<p class="page-head__meta">' + beats.length + " beat" + (beats.length === 1 ? "" : "s") + " in this lane.</p>" +
          "</div>" +
          '<section class="container" style="padding-top:10px">' +
          C.beatsGrid(beats) +
          "</section>",
      }
    );
  }

  function renderMood(parts) {
    const slug = parts[1];
    const mood = data.moods.find((m) => m.slug === slug);
    if (!mood) return notFound();
    const beats = Utils.sortBeats(data.beats.filter((b) => (b.moods || []).includes(slug)), "newest");
    return Object.assign(
      meta(mood.name + " beats", mood.name + " beats by " + cfg.brand.producer + ". " + beats.length + " tracks built for that feeling."),
      {
        html:
          '<div class="container page-head">' +
          breadcrumb([{ label: "Home", href: "#/" }, { label: "Moods", href: "#/moods" }, { label: mood.name }]) +
          '<p class="eyebrow">Mood</p>' +
          '<h1 class="display h1">Feeling <em>' + e(mood.name.toLowerCase()) + "</em></h1>" +
          '<p class="page-head__meta">' + beats.length + " beat" + (beats.length === 1 ? "" : "s") + " that live here.</p>" +
          "</div>" +
          '<section class="container" style="padding-top:10px">' +
          C.beatsGrid(beats) +
          "</section>",
      }
    );
  }

  function renderGenres() {
    const collections = data.folders.map((f) => C.soundTile(f)).join("");
    const genres = data.genres.map((g) => C.genreTile(g)).join("");
    return Object.assign(meta("Genres & sounds", "Explore every sound world in the NINE63 MUSIC vault."), {
      html:
        '<div class="container page-head">' +
        breadcrumb([{ label: "Home", href: "#/" }, { label: "Genres" }]) +
        '<h1 class="display h1">Browse by <em>sound</em></h1>' +
        '<p class="lede" style="max-width:56ch">Four worlds, every one of them curated. Start somewhere and let the next beat find you.</p>' +
        "</div>" +
        '<section class="container section--tight">' +
        C.sectionHead(null, "Sound <em>worlds</em>", "The collections, as curated.") +
        '<div class="grid grid--tiles">' + collections + "</div>" +
        "</section>" +
        '<section class="container section--tight">' +
        C.sectionHead(null, "Every <em>genre</em>", "Filter by your lane.") +
        '<div class="grid grid--tiles">' + genres + "</div>" +
        "</section>",
    });
  }

  function renderMoods() {
    const moods = data.moods.map((m) => C.moodTile(m)).join("");
    return Object.assign(meta("Moods", "Find beats by the way they make you feel."), {
      html:
        '<div class="container page-head">' +
        breadcrumb([{ label: "Home", href: "#/" }, { label: "Moods" }]) +
        '<h1 class="display h1">How do you want to <em>feel?</em></h1>' +
        '<p class="lede" style="max-width:56ch">Pick a feeling. The beats will follow.</p>' +
        "</div>" +
        '<section class="container section--tight">' +
        '<div class="grid grid--tiles">' + moods + "</div>" +
        "</section>",
    });
  }

  /* ================= FAVORITES ================= */

  function renderFavorites() {
    const favs = Store.favorites;
    return Object.assign(meta("Your favorites", "The beats you saved."), {
      html:
        '<div class="container page-head">' +
        breadcrumb([{ label: "Home", href: "#/" }, { label: "Favorites" }]) +
        '<h1 class="display h1">Your <em>favorites</em></h1>' +
        '<p class="page-head__meta">' + (favs.length ? favs.length + " beat" + (favs.length === 1 ? "" : "s") + " you held onto." : "Nothing saved yet — yet.") + "</p>" +
        "</div>" +
        '<section class="container section--tight">' +
        (favs.length
          ? C.beatsGrid(Utils.sortBeats(favs, "newest"))
          : '<div class="empty-state">' +
            '<div class="display h3">No favorites yet.</div>' +
            "<p>Tap the heart on any beat and it'll wait for you here.</p>" +
            '<a class="btn btn--primary" href="#/beats">Find something to love</a>' +
            "</div>") +
        "</section>",
    });
  }

  /* ================= CART ================= */

  function renderCart() {
    const items = Store.cart;
    const beats = items.filter((it) => it.type === "beat");
    const creditPacks = items.filter((it) => it.type === "credits");
    const bundles = items.filter((it) => it.type === "bundle");
    const total = items.reduce((s, it) => {
      if (it.type === "credits") return s + it.pack.price;
      if (it.type === "bundle") return s + it.bundle.price;
      if (it.creditsUsed) {
        var cv = cfg.creditValue || 25;
        return s + Math.max(0, it.license.price - it.creditsUsed * cv);
      }
      return s + it.license.price;
    }, 0);
    const normalTotal = beats.reduce((s, it) => s + it.license.price, 0) +
      creditPacks.reduce((s, it) => s + it.pack.price, 0) +
      bundles.reduce((s, it) => s + it.bundle.price, 0);
    const creditSavings = beats.reduce((s, it) => {
      if (!it.creditsUsed) return s;
      var cv = cfg.creditValue || 25;
      return s + it.creditsUsed * cv;
    }, 0);
    const bundleSavings = bundles.reduce((s, it) => {
      var normal = it.bundle.beats * cfg.startingPrice;
      return s + (normal - it.bundle.price);
    }, 0);
    const totalSavings = creditSavings + bundleSavings;

    if (!items.length) {
      return Object.assign(meta("Your cart", "Nothing in your cart yet."), {
        html:
          '<div class="container section">' +
          '<div class="empty-state">' +
          '<div class="display h3">Your cart is quiet.</div>' +
          "<p>Pick a beat and a license — the cart comes alive in one click.</p>" +
          '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px">' +
          '<a class="btn btn--primary" href="#/beats">Browse the vault</a>' +
          '<a class="btn btn--ghost" href="#/credits">Buy credits</a>' +
          "</div>" +
          "</div>" +
          "</div>",
      });
    }

    return Object.assign(meta("Your cart", items.length + " item" + (items.length === 1 ? "" : "s") + " in your cart."), {
      html:
        '<div class="container page-head">' +
        breadcrumb([{ label: "Home", href: "#/" }, { label: "Cart" }]) +
        '<h1 class="display h1">Your <em>cart</em></h1>' +
        '<p class="page-head__meta">' + items.length + " item" + (items.length === 1 ? "" : "s") + " ready." +
        (totalSavings > 0 ? ' <span class="savings-badge">You save ' + e(Utils.fmtPrice(totalSavings)) + "</span>" : "") +
        "</p>" +
        "</div>" +

        '<div class="container section--tight cart-layout">' +
        '<div style="display:grid;gap:14px">' +

        (creditPacks.length
          ? '<div class="cart-group"><h3 class="cart-group__title">Credit Packs</h3>' +
            creditPacks.map((it) =>
              '<div class="cart-item cart-item--credits">' +
              '<div class="cart-item__icon"><span class="icon" aria-hidden="true">' + icon("tag") + "</span></div>" +
              "<div>" +
              '<div class="cart-item__title">' + e(it.pack.name) + "</div>" +
              '<div class="cart-item__sub">' + it.pack.credits + " credits · " + e(Utils.fmtPrice(it.pack.price)) + "</div>" +
              "</div>" +
              '<div style="display:flex;align-items:center;gap:14px">' +
              '<span class="cart-item__price">' + e(Utils.fmtPrice(it.pack.price)) + "</span>" +
              '<button class="icon-btn" data-action="remove-credits" data-pack="' + e(it.pack.slug) + '" aria-label="Remove ' + e(it.pack.name) + ' from cart">' + icon("trash") + "</button>" +
              "</div>" +
              "</div>"
            ).join("") +
            (Store.creditsRemaining > 0 ? '<p class="note" style="margin-top:4px">' + Store.creditsRemaining + " credit" + (Store.creditsRemaining > 1 ? "s" : "") + " remaining — use them on beats below.</p>" : "") +
            "</div>"
          : "") +

        (bundles.length
          ? '<div class="cart-group"><h3 class="cart-group__title">Bundle Deals</h3>' +
            bundles.map((it) => {
              var normal = it.bundle.beats * cfg.startingPrice;
              var save = normal - it.bundle.price;
              return (
              '<div class="cart-item cart-item--bundle">' +
              '<div class="cart-item__icon"><span class="icon" aria-hidden="true">' + icon("tag") + "</span></div>" +
              "<div>" +
              '<div class="cart-item__title">' + e(it.bundle.name) + "</div>" +
              '<div class="cart-item__sub">' + it.bundle.beats + " Basic licenses · " + e(Utils.fmtPrice(it.bundle.price)) +
              (save > 0 ? ' <span class="savings-badge savings-badge--sm">Save ' + e(Utils.fmtPrice(save)) + "</span>" : "") +
              "</div>" +
              "</div>" +
              '<div style="display:flex;align-items:center;gap:14px">' +
              '<span class="cart-item__price">' + e(Utils.fmtPrice(it.bundle.price)) + "</span>" +
              '<button class="icon-btn" data-action="remove-bundle" data-bundle="' + e(it.bundle.slug) + '" aria-label="Remove ' + e(it.bundle.name) + ' from cart">' + icon("trash") + "</button>" +
              "</div>" +
              "</div>"
              );
            }).join("") +
            '<p class="note" style="margin-top:4px">Tell us which beats you want in the order notes below.</p>' +
            "</div>"
          : "") +

        (beats.length
          ? '<div class="cart-group"><h3 class="cart-group__title">Beats</h3>' +
            beats
              .map(
                (it) => {
                  var cashPrice = it.creditsUsed ? Math.max(0, it.license.price - it.creditsUsed * (cfg.creditValue || 25)) : it.license.price;
                  return (
                  '<div class="cart-item">' +
                  '<a class="cart-item__art" href="#/beat/' + e(it.beat.slug) + '"><img src="' + e(Utils.artSrc(it.beat)) + '" alt="Artwork for ' + e(it.beat.title) + '" loading="lazy"></a>' +
                  "<div>" +
                  '<div class="cart-item__title">' + e(it.beat.title) + "</div>" +
                  '<div class="cart-item__sub">' + e((function() { var cg = Utils.genresOf(it.beat); return cg[0] || ""; })()) + " · " + e(it.license.name) + " license" +
                  (it.creditsUsed ? ' <span class="credit-tag">' + it.creditsUsed + " credit" + (it.creditsUsed > 1 ? "s" : "") + " used</span>" : "") +
                  "</div>" +
                  "</div>" +
                  '<div style="display:flex;align-items:center;gap:14px">' +
                  '<span class="cart-item__price">' +
                  (it.creditsUsed
                    ? '<span class="cart-item__price--original">' + e(Utils.fmtPrice(it.license.price)) + "</span> " + e(Utils.fmtPrice(cashPrice))
                    : e(Utils.fmtPrice(it.license.price))) +
                  "</span>" +
                  '<button class="icon-btn" data-action="remove-cart" data-id="' + e(it.beat.id) + '" data-license="' + e(it.license.slug) + '" aria-label="Remove ' + e(it.beat.title) + " from cart\">" + icon("trash") + "</button>" +
                  "</div>" +
                  "</div>"
                  );
                }
              )
              .join("") +
            "</div>"
          : "") +

        "</div>" +

        '<aside class="order-panel">' +
        "<h3>Checkout</h3>" +

        creditPacks.map((it) => '<div class="order-row"><span>' + e(it.pack.name) + "</span><span>" + e(Utils.fmtPrice(it.pack.price)) + "</span></div>").join("") +
        bundles.map((it) => '<div class="order-row"><span>' + e(it.bundle.name) + "</span><span>" + e(Utils.fmtPrice(it.bundle.price)) + "</span></div>").join("") +
        beats.map((it) => {
          var cashPrice = it.creditsUsed ? Math.max(0, it.license.price - it.creditsUsed * (cfg.creditValue || 25)) : it.license.price;
          var label = it.beat.title + " — " + it.license.name;
          if (it.creditsUsed) label += " (" + it.creditsUsed + " credit" + (it.creditsUsed > 1 ? "s" : "") + ")";
          return '<div class="order-row"><span>' + e(label) + "</span><span>" + e(Utils.fmtPrice(cashPrice)) + "</span></div>";
        }).join("") +

        (totalSavings > 0 ? '<div class="order-row order-row--savings"><span>Savings</span><span>-' + e(Utils.fmtPrice(totalSavings)) + "</span></div>" : "") +
        '<div class="order-row order-row--total"><span>Total</span><b>' + e(Utils.fmtPrice(total)) + "</b></div>" +

        '<div data-role="checkout-form">' +
        '<div class="field"><label for="co-name">Your name</label><input id="co-name" autocomplete="name" placeholder="Stage name or real name"></div>' +
        '<div class="field"><label for="co-email">Email</label><input id="co-email" type="email" autocomplete="email" placeholder="you@wherever.com"></div>' +
        (bundles.length ? '<div class="field"><label for="co-note">Bundle beats + any notes</label><textarea id="co-note" rows="3" placeholder="List the beats you want in your bundle, plus any other notes…" style="resize:vertical"></textarea></div>' :
        '<div class="field"><label for="co-note">Anything we should know?</label><textarea id="co-note" rows="2" placeholder="Tagless file? Stem request? Mixing?" style="resize:vertical"></textarea></div>') +
        '<button class="btn btn--primary" style="width:100%" data-action="place-order">Review my order</button>' +
        '<p class="note" style="margin-top:14px">This is an order request, not a charge. We review it, reply with payment details, and deliver the files once it clears — no surprises.</p>' +
        "</div>" +
        '<div data-role="order-confirm" hidden>' +
        '<p style="color:var(--text-dim);font-size:0.95rem;margin-bottom:14px">Here\'s your order. Send it to us and we\'ll take it from there.</p>' +
        '<pre data-role="order-summary" style="white-space:pre-wrap;font-size:0.82rem;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:14px;color:var(--text-dim);max-height:220px;overflow:auto"></pre>' +
        '<div style="display:grid;gap:10px;margin-top:14px">' +
        '<button class="btn btn--ghost" data-action="copy-order">Copy summary</button>' +
        '<a class="btn btn--primary" data-action="mail-order" href="#">Email this to us</a>' +
        '<button class="btn btn--ghost" data-action="reset-order">Edit order</button>' +
        "</div>" +
        '<p class="note" style="margin-top:14px">Keep this summary until your files land. If you don\'t hear from us within a day, the email address you sent it to should be in the summary.</p>' +
        "</div>" +
        "</aside>" +
        "</div>",
      mount(app) {
        mountCart(app, items, total);
      },
    });
  }

  function mountCart(app, items, total) {
    const formWrap = app.querySelector("[data-role=checkout-form]");
    const confirmWrap = app.querySelector("[data-role=order-confirm]");
    const summaryEl = app.querySelector("[data-role=order-summary]");
    let lastOrder = null;

    app.querySelector('[data-action="place-order"]').addEventListener("click", () => {
      const name = (app.querySelector("#co-name").value || "").trim();
      const email = (app.querySelector("#co-email").value || "").trim();
      const note = (app.querySelector("#co-note").value || "").trim();
      if (!email) {
        (window.ACLASS.Components.Toast).show("Add an email so we can send your files.");
        app.querySelector("#co-email").focus();
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        (window.ACLASS.Components.Toast).show("That email doesn't look right.");
        app.querySelector("#co-email").focus();
        return;
      }
      lastOrder = buildOrder(items, total, { name, email, note });
      summaryEl.textContent = lastOrder;
      formWrap.hidden = true;
      confirmWrap.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    app.querySelector('[data-action="copy-order"]').addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(lastOrder || "");
        (window.ACLASS.Components.Toast).show("Order summary copied.");
      } catch {
        (window.ACLASS.Components.Toast).show("Couldn't copy — select the text above and copy it.");
      }
    });

    const mailLink = app.querySelector('[data-action="mail-order"]');
    const FORMSPREE_URL = "https://formspree.io/f/myzpglqg";
    mailLink.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!lastOrder) return;
      mailLink.disabled = true;
      mailLink.textContent = "Sending…";
      try {
        var orderItems = items.map(function (it) {
          if (it.type === "beat") return it.beat.title + " (" + it.license.name + ")";
          if (it.type === "credits") return it.pack.name;
          if (it.type === "bundle") return it.bundle.name;
          return "";
        }).filter(Boolean).join(", ");
        var res = await fetch(FORMSPREE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _subject: "Beat order — " + (cfg.brand?.name || "NINE63 MUSIC"),
            name: (app.querySelector("#co-name") || {}).value || "",
            email: (app.querySelector("#co-email") || {}).value || "",
            order: lastOrder,
            items: orderItems,
            total: Utils.fmtPrice(total)
          })
        });
        if (res.ok) {
          (window.ACLASS.Components.Toast).show("Order sent! We'll get back to you soon.");
          mailLink.textContent = "Order sent ✓";
          mailLink.style.pointerEvents = "none";
        } else {
          throw new Error("Formspree " + res.status);
        }
      } catch (err) {
        (window.ACLASS.Components.Toast).show("Couldn't send — copy the summary and email us manually.");
        mailLink.disabled = false;
        mailLink.textContent = "Email this to us";
        var to = (cfg.contactEmail || "").trim();
        var subject = encodeURIComponent("Beat order — " + (cfg.brand?.name || "NINE63 MUSIC"));
        window.open((to ? "mailto:" + to : "mailto:") + "?subject=" + subject + "&body=" + encodeURIComponent(lastOrder || ""), "_blank");
      }
    });

    app.querySelector('[data-action="reset-order"]').addEventListener("click", () => {
      formWrap.hidden = false;
      confirmWrap.hidden = true;
    });
  }

  function buildOrder(items, total, info) {
    const lines = [];
    const creditPacks = items.filter((it) => it.type === "credits");
    const bundles = items.filter((it) => it.type === "bundle");
    const beats = items.filter((it) => it.type === "beat");
    const creditValue = cfg.creditValue || 25;

    lines.push("NINE63 MUSIC — BEAT ORDER REQUEST");
    lines.push("--------------------------------");
    lines.push("");
    if (info.name) lines.push("Name: " + info.name);
    lines.push("Email: " + info.email);
    lines.push("");

    if (creditPacks.length) {
      lines.push("CREDIT PACKS");
      creditPacks.forEach((it) => {
        lines.push("- " + it.pack.name + " — " + Utils.fmtPrice(it.pack.price) + " (" + it.pack.credits + " credits)");
      });
      lines.push("");
    }

    if (bundles.length) {
      lines.push("BUNDLE DEALS");
      bundles.forEach((it) => {
        lines.push("- " + it.bundle.name + " — " + Utils.fmtPrice(it.bundle.price) + " (" + it.bundle.beats + " Basic licenses)");
        lines.push("  List your " + it.bundle.beats + " beats below or in the notes.");
      });
      lines.push("");
    }

    if (beats.length) {
      lines.push("BEATS");
      beats.forEach((it) => {
        var cashPrice = it.creditsUsed ? Math.max(0, it.license.price - it.creditsUsed * creditValue) : it.license.price;
        lines.push("- " + it.beat.title + " (" + (it.beat.key || "") + ")");
        lines.push("  License: " + it.license.name + " — " + Utils.fmtPrice(cashPrice));
        if (it.creditsUsed) lines.push("  Credits used: " + it.creditsUsed);
        lines.push("  Beat link: " + location.origin + location.pathname + "#/beat/" + it.beat.slug);
      });
      lines.push("");
    }

    lines.push("Total: " + Utils.fmtPrice(total));
    if (info.note) {
      lines.push("");
      lines.push("Note: " + info.note);
    }
    lines.push("");
    lines.push("We'll confirm your order and send payment details. Nothing is charged yet.");
    return lines.join("\n");
  }

  /* ================= LICENSES ================= */

  function renderLicenses() {
    return Object.assign(
      meta("Licensing guide", "Every license explained — what you get, what you can do, and what it costs."),
      {
        html:
          '<div class="container page-head">' +
          breadcrumb([{ label: "Home", href: "#/" }, { label: "Licensing" }]) +
          '<h1 class="display h1">Licensing, <em>made clear</em></h1>' +
          '<p class="lede" style="max-width:62ch">Every beat is cleared to become yours. The only question is how much of it you need. Four licenses, no fine-print traps.</p>' +
          "</div>" +
          '<section class="container section--tight">' +
          '<div class="license-grid" style="grid-template-columns:repeat(auto-fit,minmax(250px,1fr))">' +
          cfg.licenses
            .map(
              (l) =>
                '<div class="license-card' + (l.popular ? " license-card--pick" : "") + '">' +
                '<div class="license-card__top"><div>' +
                '<div class="license-card__name">' + e(l.name) + "</div>" +
                (l.popular ? '<span class="license-card__tag">Most chosen</span>' : "") +
                "</div>" +
                '<div class="license-card__price">' + e(Utils.fmtPrice(l.price)) + "</div></div>" +
                '<p class="license-card__desc">' + e(l.blurb) + "</p>" +
                '<ul class="license-card__features">' + l.features.map((f) => "<li>" + e(f) + "</li>").join("") + "</ul>" +
                "</div>"
            )
            .join("") +
          "</div>" +
          "</section>" +
          '<section class="container section--tight">' +
          "<h2 class='display h3' style='margin-bottom:18px'>Questions, answered</h2>" +
          '<div class="faq">' +
          faq("What's the difference between a lease and an exclusive?", "A lease lets you release the song while we can still license the beat to others. An exclusive takes the beat off the market entirely — after that, it belongs only to you.") +
          faq("What do I actually receive?", "Leases deliver untagged MP3 (320kbps) or WAV depending on the tier. Exclusives include WAV, MP3 and stems. Files are sent after payment clears.") +
          faq("Can I use the beat for streaming before buying?", "Streams on Spotify, Apple Music and similar count toward your lease's stream cap. Radio, live shows and DJ sets are included in every license.") +
          faq("What happens if I hit my stream limit?", "You upgrade to the next license — the extra streams are covered from day one, not backdated. Your track stays live the whole time.") +
          faq("Can I buy two beats together?", "Yes — add as many beats and licenses as you like. The cart handles it in one order.") +
          faq("Do you do custom mixes or tagless files?", "Free tag removal comes with the Unlimited license. For stems, custom mixing or a personal beat, pick Exclusive or mention it in the order note.") +
          "</div>" +
          "</section>" +
          '<section class="container section--tight">' +
          '<div class="about-band" style="text-align:center">' +
          '<h2 class="display h2" style="margin-bottom:14px">Ready when you <em>are</em>.</h2>' +
          '<p class="lede" style="max-width:46ch;margin:0 auto 26px">Find the beat first — licensing is the easy part.</p>' +
          '<a class="btn btn--primary btn--lg" href="#/beats">Find your beat</a>' +
          "</div>" +
          "</section>",
      }
    );
  }

  function faq(q, a) {
    return "<details><summary>" + e(q) + "</summary><p>" + e(a) + "</p></details>";
  }

  /* ================= ABOUT ================= */

  function renderAbout() {
    const topBeats = Utils.sortBeats(data.beats, "popular").slice(0, 4);
    return Object.assign(meta("About", "The studio behind the sound — 963 Beats and the NINE63 MUSIC vault."), {
      html:
        '<div class="container page-head">' +
        breadcrumb([{ label: "Home", href: "#/" }, { label: "About" }]) +
        '<h1 class="display h1">Not a shop. <em>A studio</em> you can hear.</h1>' +
        '<p class="lede" style="max-width:60ch">NINE63 MUSIC is where "a-class" stops being a label and starts being a standard. Every beat here is made, mixed and mastered by 963 Beats — then picked for the vault by ear, not by number.</p>' +
        "</div>" +
        '<section class="container section--tight">' +
        '<div class="stat-block">' +
        stat(data.beats.length, "beats in the vault") +
        stat(data.genres.length, "sounds") +
        stat(Utils.sortBeats(data.beats, "newest")[0].year || "-", "still recording") +
        "</div>" +
        "</section>" +
        '<section class="container section--tight">' +
        '<div class="about-band">' +
        '<p class="eyebrow" style="margin-bottom:16px">The producer</p>' +
        '<h2 class="display h2" style="margin-bottom:18px">Crafted by <em>963 Beats</em></h2>' +
        '<div class="para" style="max-width:64ch">' +
        "<p>The vault is built the way good records are: one sound at a time. New jazz that floats, plug that drips, drill that hits, supertrap that shakes rooms. Nothing here was imported from a stock pack — it was all written, then cut to the bone.</p>" +
        "<p>The beats you'll find are the ones that survived the late nights. The rest got deleted.</p>" +
        "</div>" +
        "</div>" +
        "</section>" +
        '<section class="container section--tight">' +
        "<h2 class='display h3' style='margin-bottom:18px'>How buying works</h2>" +
        '<div class="faq">' +
        faq("How do I listen?", "Every beat has a play button. Tap it anywhere on the site — the player follows you from page to page.") +
        faq("How do I buy?", "Open a beat, pick a license, add it to your cart, then place an order request with your email. We confirm, send payment details, and deliver your files.") +
        faq("How fast do I get my files?", "Orders placed by email usually get a reply the same day. Exclusive purchases are handled personally.") +
        faq("Is every beat really exclusive to this store?", "Yes. If it's in the vault, it hasn't been sold elsewhere and isn't sitting in a free YouTube pack.") +
        "</div>" +
        "</section>" +
        '<section class="container section--tight">' +
        C.sectionHead(null, "Start with the <em>hottest</em>", "The most-played right now.") +
        C.beatsGrid(topBeats) +
        "</section>",
    });
  }

  /* ================= CREDITS ================= */

  function renderCredits() {
    const packs = cfg.creditPacks || [];
    const bundles = cfg.bundles || [];
    const cv = cfg.creditValue || 25;
    const lc = cfg.licenseCredits || {};

    var comparisonRows = cfg.licenses
      .filter((l) => lc[l.slug] != null)
      .map((l) => {
        var cc = lc[l.slug];
        var cash5 = Math.max(0, l.price - cc * cv);
        var total5 = cash5 + 100 / 5 * cc;
        return (
          '<tr>' +
          '<td>' + e(l.name) + "</td>" +
          '<td class="text-right">' + e(Utils.fmtPrice(l.price)) + "</td>" +
          '<td class="text-right">' + e(Utils.fmtPrice(cash5)) + " + " + cc + " cr</td>" +
          '<td class="text-right">' + e(Utils.fmtPrice(cash5)) + " + " + cc + " cr</td>" +
          "</tr>"
        );
      })
      .join("");

    return Object.assign(
      meta("Credits & bundles", "Prepay for credits and save 17–23% on every beat. Bundle deals for bulk purchases."),
      {
        html:
          '<div class="container page-head">' +
          breadcrumb([{ label: "Home", href: "#/" }, { label: "Credits" }]) +
          '<h1 class="display h1">Buy credits. <em>Beat the price.</em></h1>' +
          '<p class="lede" style="max-width:62ch">Prepay for credits and apply them to any beat. Save 17–23% on every purchase. Credits work across all license tiers — the more you buy, the more you save.</p>' +
          "</div>" +

          '<section class="container section--tight">' +
          '<h2 class="display h3" style="margin-bottom:18px">Credit Packs</h2>' +
          '<div class="grid grid--credits">' +
          packs.map((p) => C.creditPackCard(p)).join("") +
          "</div>" +
          "</section>" +

          '<section class="container section--tight">' +
          '<h2 class="display h3" style="margin-bottom:18px">How it works</h2>' +
          '<div class="credits-how">' +
          '<div class="credits-step"><span class="credits-step__num">1</span><h3>Buy a credit pack</h3><p>Add a credit pack to your cart. Each credit is worth $25 toward any beat.</p></div>' +
          '<div class="credits-step"><span class="credits-step__num">2</span><h3>Pick your beats</h3><p>Browse the vault and click "Buy with credit" on any beat you like.</p></div>' +
          '<div class="credits-step"><span class="credits-step__num">3</span><h3>Pay less</h3><p>Credits are deducted from the price. You pay only the cash remainder.</p></div>' +
          "</div>" +
          "</section>" +

          '<section class="container section--tight">' +
          '<h2 class="display h3" style="margin-bottom:18px">Price comparison</h2>' +
          '<div style="overflow-x:auto">' +
          '<table class="credits-table">' +
          "<thead><tr><th>License</th><th class='text-right'>Normal</th><th class='text-right'>With 5 Credits</th><th class='text-right'>With 10 Credits</th></tr></thead>" +
          "<tbody>" + comparisonRows + "</tbody>" +
          "</table>" +
          "</div>" +
          "</section>" +

          (bundles.length
            ? '<section class="container section--tight">' +
              '<h2 class="display h3" style="margin-bottom:18px">Bundle Deals</h2>' +
              '<div class="grid grid--credits">' +
              bundles.map((b) => C.bundleCard(b)).join("") +
              "</div>" +
              '<p class="note" style="margin-top:14px">Tell us which beats you want in the order notes when you check out.</p>' +
              "</section>"
            : "") +

          '<section class="container section--tight">' +
          "<h2 class='display h3' style='margin-bottom:18px'>Questions, answered</h2>" +
          '<div class="faq">' +
          faq("How do credits work?", "Buy a credit pack, then apply credits to any beat. Each credit is worth $25 — so a Basic ($30) costs just $5 + 1 credit. Credits are deducted from your balance automatically.") +
          faq("Do credits expire?", "No. Credits stay in your cart until you use them. There's no time limit.") +
          faq("Can I mix credits and regular purchases?", "Yes. Some beats can be bought with credits, others at full price — it's up to you. The cart handles both.") +
          faq("What about bundles?", "Bundles are pre-set packages —3 or 5 Basic licenses at a discount. Tell us which beats you want in the order notes when you check out.") +
          faq("Can I get a refund on unused credits?", "Contact us and we'll work it out. Credits are meant to save you money, not trap you.") +
          "</div>" +
          "</section>" +

          '<section class="container section--tight">' +
          '<div class="about-band" style="text-align:center">' +
          '<h2 class="display h2" style="margin-bottom:14px">Ready to save?</h2>' +
          '<p class="lede" style="max-width:46ch;margin:0 auto 26px">Find the beat first — credits make the licensing even better.</p>' +
          '<a class="btn btn--primary btn--lg" href="#/beats">Find your beat</a>' +
          "</div>" +
          "</section>",
      }
    );
  }

  /* ================= dispatcher ================= */

  function render(parts, params) {
    const page = parts[0] || "";
    switch (page) {
      case "":
        return renderHome();
      case "beats":
        return renderLibrary(parts, params);
      case "beat":
        return renderBeat(parts);
      case "collection":
        return renderCollection(parts);
      case "genre":
        return renderGenre(parts);
      case "mood":
        return renderMood(parts);
      case "genres":
        return renderGenres();
      case "moods":
        return renderMoods();
      case "favorites":
        return renderFavorites();
      case "cart":
        return renderCart();
      case "licenses":
        return renderLicenses();
      case "credits":
        return renderCredits();
      case "about":
        return renderAbout();
      case "search": {
        const q = params.q ? "?q=" + encodeURIComponent(String(params.q)) : "";
        location.replace(Utils.route("beats", { q: q ? String(params.q) : undefined }));
        return { html: '<section class="container section"><p style="color:var(--text-mute)">Searching…</p></section>', title: "Search — NINE63 MUSIC", description: "" };
      }
      default:
        return notFound();
    }
  }

  function renderNotFound() {
    return notFound();
  }

  window.ACLASS = Object.assign(window.ACLASS || {}, {
    Pages: { render, renderNotFound },
  });
})();
