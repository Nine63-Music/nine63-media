/* ACLASS — recommendation engine
   Similarity is scored from real metadata: genres, moods, tags, BPM, key,
   collection. Taste profile is built from play history + favorites. */
(function () {
  "use strict";

  const Utils = window.ACLASS.Utils;
  const Store = window.ACLASS.Store;
  const data = Utils.data;
  const byId = Utils.byId;

  const ROOT_NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  function keyRoot(key) {
    if (!key) return null;
    const m = /^([A-G][#b]?)/.exec(key.trim());
    return m ? m[1] : null;
  }

  function overlap(a, b) {
    if (!a || !b) return 0;
    const set = new Set(a);
    return b.filter((x) => set.has(x)).length;
  }

  function jaccard(a, b) {
    if (!a || !b || (!a.length && !b.length)) return 0;
    const sa = new Set(a);
    const sb = new Set(b);
    const inter = new Set([...sa].filter((x) => sb.has(x))).size;
    const union = new Set([...sa, ...sb]).size;
    return union ? inter / union : 0;
  }

  /* 0..1 similarity score. Higher = closer. */
  function score(a, b) {
    if (a.id === b.id) return 0;
    let s = 0;

    const gA = a.genres || [];
    const gB = b.genres || [];
    if (gA.length && gB.length) {
      s += 0.34 * (overlap(gA, gB) / Math.max(gA.length, gB.length));
    }

    const mA = a.moods || [];
    const mB = b.moods || [];
    if (mA.length && mB.length) {
      s += 0.26 * (overlap(mA, mB) / Math.max(mA.length, mB.length));
    }

    s += 0.16 * jaccard(a.tags || [], b.tags || []);

    if (a.bpm && b.bpm) {
      const d = Math.abs(a.bpm - b.bpm);
      s += 0.14 * Math.max(0, 1 - d / 60);
    }

    if (a.collection === b.collection) s += 0.06;

    if (a.key && b.key) {
      const ra = keyRoot(a.key);
      const rb = keyRoot(b.key);
      if (ra && rb) {
        if (ra === rb) s += 0.04;
        else if (a.key[1] === b.key[1] && a.key[0] === b.key[0]) s += 0.02;
      }
    }

    return Math.min(1, s);
  }

  function rank(anchor, pool, limit) {
    return pool
      .filter((b) => b.id !== anchor.id)
      .map((b) => ({ beat: b, s: score(anchor, b) }))
      .sort((x, y) => y.s - x.s || (y.beat.playCount - x.beat.playCount))
      .slice(0, limit)
      .map((x) => x.beat);
  }

  function tasteProfile() {
    const profile = { genres: {}, moods: {}, tags: {}, bpms: [], ids: [] };
    const seen = new Set();

    const push = (beat, weight) => {
      if (seen.has(beat.id)) return;
      seen.add(beat.id);
      profile.ids.push(beat.id);
      (beat.genres || []).forEach((g) => (profile.genres[g] = (profile.genres[g] || 0) + weight));
      (beat.moods || []).forEach((m) => (profile.moods[m] = (profile.moods[m] || 0) + weight));
      (beat.tags || []).forEach((t) => (profile.tags[t] = (profile.tags[t] || 0) + weight));
      if (beat.bpm) profile.bpms.push(beat.bpm);
    };

    for (const id of Object.keys(Store.playCounts)) {
      const b = byId.get(id);
      if (b) push(b, 1 + Math.min(3, Store.playCounts[id]));
    }
    for (const b of Store.favorites) push(b, 2);

    return profile;
  }

  function scoreAgainstProfile(beat, profile) {
    let s = 0;
    (beat.genres || []).forEach((g) => (s += profile.genres[g] || 0));
    (beat.moods || []).forEach((m) => (s += profile.moods[m] || 0));
    (beat.tags || []).forEach((t) => (s += profile.tags[t] || 0) * 0.5);
    const bpms = profile.bpms;
    if (bpms.length && beat.bpm) {
      const mean = bpms.reduce((a, b) => a + b, 0) / bpms.length;
      s += 2 * Math.max(0, 1 - Math.abs(mean - beat.bpm) / 80);
    }
    return s;
  }

  function forYou(limit) {
    const profile = tasteProfile();
    const hasTaste = profile.ids.length > 0;
    if (!hasTaste) {
      return data.beats
        .filter((b) => b.featured)
        .concat(data.beats.filter((b) => b.playCount > 0))
        .filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i)
        .slice(0, limit);
    }
    const banned = new Set(profile.ids);
    return data.beats
      .filter((b) => !banned.has(b.id))
      .map((b) => ({ beat: b, s: scoreAgainstProfile(b, profile) }))
      .sort((x, y) => y.s - x.s || y.beat.playCount - x.beat.playCount)
      .slice(0, limit)
      .map((x) => x.beat);
  }

  /* "Because you played X" — same family, minus X. */
  function becauseYouPlayed(beat, limit) {
    return rank(beat, data.beats, limit || 6);
  }

  /* More like this (identical to similar, kept for readability). */
  function similar(beat, limit) {
    return rank(beat, data.beats, limit || 6);
  }

  /* "Hidden gems" — quality picks people haven't found yet. */
  function hiddenGems(limit) {
    return data.beats
      .filter((b) => !b.featured)
      .sort((a, b) => (a.addedAt || "").localeCompare(b.addedAt || ""))
      .slice(0, limit || 4);
  }

  /* Trending — honest, driven by real Serato play counts. */
  function trending(limit) {
    return Utils.sortBeats(data.beats, "popular").slice(0, limit || 8);
  }

  function fresh(limit) {
    return Utils.sortBeats(data.beats, "newest").slice(0, limit || 8);
  }

  window.ACLASS = Object.assign(window.ACLASS || {}, {
    Recs: { score, similar, becauseYouPlayed, forYou, hiddenGems, trending, fresh, tasteProfile },
  });
})();
