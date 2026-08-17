/* ACLASS — shared utilities */
(function () {
  "use strict";

  const DATA = window.ACLASS_DATA || { beats: [], folders: [], genres: [], moods: [] };

  const Utils = {
    data: DATA,
    config: window.ACLASS_CONFIG,

    byId: new Map(DATA.beats.map((b) => [b.id, b])),
    bySlug: new Map(DATA.beats.map((b) => [b.slug, b])),

    /* ---- URL helpers ---- */
    encodePath(p) {
      return String(p)
        .split("/")
        .map((seg) => encodeURIComponent(seg))
        .join("/");
    },

    assetUrl(p) {
      if (!p) return "";
      const path = this.encodePath(p);
      const base = (this.config && this.config.assetBase) || "";
      return base ? base.replace(/\/+$/, "") + "/" + path : path;
    },

    /* Build a hash route with query string. */
    route(path, query) {
      let out = "#/" + path.replace(/^#?\/?/, "");
      if (query && Object.keys(query).length) {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(query)) {
          if (v === null || v === undefined || v === "") continue;
          if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
          else qs.set(k, v);
        }
        const s = qs.toString();
        if (s) out += "?" + s;
      }
      return out;
    },

    parseHash() {
      const raw = location.hash.replace(/^#\/?/, "") || "";
      const qi = raw.indexOf("?");
      const path = qi >= 0 ? raw.slice(0, qi) : raw;
      const qs = qi >= 0 ? raw.slice(qi + 1) : "";
      const parts = path.split("/").filter(Boolean);
      const params = {};
      if (qs) {
        for (const [k, v] of new URLSearchParams(qs)) {
          if (params[k] === undefined) params[k] = v;
          else params[k] = [].concat(params[k], v);
        }
      }
      return { path, parts, params };
    },

    /* ---- Text helpers ---- */
    escapeHTML(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    titleCase(s) {
      return String(s || "")
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    },

    fmtTime(sec) {
      if (!isFinite(sec) || sec < 0) return "0:00";
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return m + ":" + String(s).padStart(2, "0");
    },

    fmtPrice(n) {
      return (this.config.currencySymbol || "$") + (Number(n) || 0);
    },

    /* ---- Beat metadata accessors ---- */
    genresOf(beat) {
      return (beat.genres || []).map((s) => {
        const g = this.data.genres.find((x) => x.slug === s);
        return g ? g.name : this.titleCase(s);
      });
    },

    moodsOf(beat) {
      return (beat.moods || []).map((s) => {
        const m = this.data.moods.find((x) => x.slug === s);
        return m ? m.name : this.titleCase(s);
      });
    },

    collectionOf(beat) {
      return this.data.folders.find((f) => f.slug === beat.collection) || null;
    },

    metaLine(beat) {
      const bits = [];
      if (beat.key) bits.push(beat.key);
      if (beat.year) bits.push(beat.year);
      return bits.join(" · ");
    },

    genreLine(beat) {
      return this.genresOf(beat).slice(0, 3).join(" / ") || this.titleCase(beat.collection);
    },

    /* ---- Deterministic palette from a slug (generated-art fallback) ---- */
    paletteFor(seed) {
      const palettes = [
        ["#1ed760", "#0c4a2b"],
        ["#22d3ee", "#155e75"],
        ["#a78bfa", "#4c1d95"],
        ["#fb7185", "#881337"],
        ["#fbbf24", "#78350f"],
        ["#34d399", "#064e3b"],
        ["#f472b6", "#831843"],
        ["#38bdf8", "#1e3a8a"],
      ];
      let h = 0;
      for (const c of String(seed || "a")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      return palettes[h % palettes.length];
    },

    /* SVG artwork data-URI generated from a beat (elegant fallback). */
    artDataURI(beat, seedText) {
      const [c1, c2] = this.paletteFor(beat?.id || seedText);
      const letter = (beat?.title || "A").trim().charAt(0).toUpperCase();
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">' +
        '<defs><radialGradient id="g" cx="30%" cy="24%" r="85%">' +
        '<stop offset="0%" stop-color="' + c1 + '"/>' +
        '<stop offset="58%" stop-color="' + c2 + '"/>' +
        '<stop offset="100%" stop-color="#050505"/>' +
        "</radialGradient></defs>" +
        '<rect width="600" height="600" fill="#050505"/>' +
        '<rect width="600" height="600" fill="url(#g)" opacity="0.9"/>' +
        '<circle cx="470" cy="120" r="150" fill="#ffffff" opacity="0.06"/>' +
        '<circle cx="600" cy="600" r="230" fill="#000000" opacity="0.4"/>' +
        '<circle cx="300" cy="300" r="176" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>' +
        '<circle cx="300" cy="300" r="120" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1.5"/>' +
        '<text x="300" y="352" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="150" fill="#ffffff" opacity="0.92">' +
        this.escapeHTML(letter) +
        "</text></svg>";
      return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    },

    artSrc(beat) {
      if (beat.artwork) return this.assetUrl(beat.artwork);
      return this.artDataURI(beat);
    },

    /* ---- Search ---- */
    searchBeats(query) {
      const tokens = String(query || "")
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(Boolean);
      if (!tokens.length) return this.data.beats;
      return this.data.beats.filter((beat) => {
        const hay = this.searchText(beat);
        return tokens.every((t) => hay.includes(t));
      });
    },

    searchText(beat) {
      const g = this.genresOf(beat).join(" ").toLowerCase();
      const m = this.moodsOf(beat).join(" ").toLowerCase();
      const c = this.collectionOf(beat);
      return [
        beat.title,
        g,
        m,
        (beat.tags || []).join(" "),
        beat.producer,
        beat.key,
        beat.bpm,
        c ? c.displayName + " " + c.name : "",
      ]
        .join(" ")
        .toLowerCase();
    },

    /* ---- Store helpers ---- */
    sortBeats(beats, sort) {
      const arr = beats.slice();
      const sorter = {
        newest: (a, b) => (b.addedAt || "").localeCompare(a.addedAt || "") || b.playCount - a.playCount,
        popular: (a, b) => b.playCount - a.playCount || (b.addedAt || "").localeCompare(a.addedAt || ""),
        price_low: (a, b) => this.config.startingPrice - this.config.startingPrice || 0,
        title: (a, b) => a.title.localeCompare(b.title),
        bpm_high: (a, b) => (b.bpm || 0) - (a.bpm || 0),
        bpm_low: (a, b) => (a.bpm || 0) - (b.bpm || 0),
      };
      const fn = sorter[sort] || sorter.newest;
      return arr.sort(fn);
    },

    fmt: (n) => (Number(n) || 0).toLocaleString("en-US"),
  };

  window.ACLASS = Object.assign(window.ACLASS || {}, { Utils });
})();
