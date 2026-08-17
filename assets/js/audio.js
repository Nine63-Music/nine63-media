/* ACLASS — global audio engine (single audio element, queue-aware) */
(function () {
  "use strict";

  const Utils = window.ACLASS.Utils;
  const Store = window.ACLASS.Store;
  const byId = Utils.byId;

  const audio = new Audio();
  audio.preload = "none";
  audio.setAttribute("aria-label", "Beat player");

  const state = {
    currentId: null,
    playing: false,
    loading: false,
    duration: 0,
    time: 0,
    volume: Store.volume,
    muted: false,
    queue: [],
    index: -1,
  };

  const listeners = [];

  function emit() {
    for (const fn of listeners) {
      try {
        fn(state);
      } catch (e) {
        console.error("[ACLASS audio listener]", e);
      }
    }
  }
  function subscribe(fn) {
    listeners.push(fn);
    return () => listeners.splice(listeners.indexOf(fn), 1);
  }

  function currentBeat() {
    return state.currentId ? byId.get(state.currentId) : null;
  }

  function setQueue(queue) {
    state.queue = queue;
    const i = state.queue.findIndex((b) => b.id === state.currentId);
    state.index = i >= 0 ? i : state.queue.length ? 0 : -1;
  }

  function beatSrc(beat) {
    return Utils.assetUrl(beat.file);
  }

  function load(beat, autoplay) {
    if (!beat) return;
    const src = beatSrc(beat);
    state.currentId = beat.id;
    state.loading = true;
    emit();
    try {
      audio.src = src;
      if (autoplay) {
        const p = audio.play();
        if (p) p.catch((e) => handlePlayError(beat, e));
      }
    } catch (e) {
      handlePlayError(beat, e);
    }
  }

  function handlePlayError(beat, err) {
    state.loading = false;
    emit();
    const msg = err && err.name === "NotAllowedError"
      ? "Tap play again to start audio."
      : "This beat couldn't load. Try another one.";
    const Toast = window.ACLASS.Toast;
    if (Toast) Toast.show(msg);
  }

  function playId(id, opts) {
    const beat = byId.get(id);
    if (!beat) return;
    if (state.currentId === id) {
      if (state.playing) return;
      resume();
      return;
    }
    if (opts && opts.queue) setQueue(opts.queue);
    load(beat, true);
    Store.recordPlay(id);
  }

  function playBeat(beat, opts) {
    playId(beat.id, opts);
  }

  function toggle() {
    if (!state.currentId) {
      /* nothing loaded — try last played, else first featured */
      const lastId = Store.lastPlayedId;
      const pick = byId.get(lastId) || Utils.data.beats.find((b) => b.featured) || Utils.data.beats[0];
      if (pick) playId(pick.id, { queue: queueFor(pick) });
      return;
    }
    if (state.playing) pause();
    else resume();
  }

  function resume() {
    const p = audio.play();
    if (p) p.catch((e) => handlePlayError(currentBeat(), e));
  }

  function pause() {
    audio.pause();
  }

  function stop() {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    state.currentId = null;
    state.loading = false;
    state.duration = 0;
    state.time = 0;
    emit();
  }

  function seek(t) {
    if (!isFinite(t)) return;
    audio.currentTime = Math.max(0, Math.min(t, state.duration || t));
  }

  function seekBy(delta) {
    seek(audio.currentTime + delta);
  }

  function setVolume(v) {
    state.volume = Math.max(0, Math.min(1, v));
    audio.volume = state.volume;
    Store.setVolume(state.volume);
    emit();
  }

  function toggleMute() {
    state.muted = !state.muted;
    audio.muted = state.muted;
    emit();
  }

  /* Build a sensible "up next" queue for a beat in a given context list. */
  function queueFor(beat, contextList) {
    const recs = window.ACLASS.Recs;
    if (contextList && contextList.length > 1) {
      return contextList;
    }
    const base = recs ? recs.similar(beat, Utils.data.beats.length) : [];
    const list = [beat].concat(base);
    const seen = new Set();
    return list.filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
  }

  function step(dir) {
    const beat = currentBeat();
    if (!beat || !state.queue.length) {
      if (beat) playBeat(beat, { queue: queueFor(beat) });
      return;
    }
    const next = state.queue[state.index + dir];
    if (!next) return;
    state.index = state.queue.findIndex((b) => b.id === next.id);
    playBeat(next, { queue: state.queue });
  }

  function next() {
    step(1);
  }
  function prev() {
    if (audio.currentTime > 4) {
      seek(0);
      return;
    }
    step(-1);
  }

  /* --- element events --- */
  audio.addEventListener("loadedmetadata", () => {
    state.duration = audio.duration || 0;
    state.loading = false;
    emit();
  });
  audio.addEventListener("timeupdate", () => {
    state.time = audio.currentTime || 0;
    emit();
  });
  audio.addEventListener("play", () => {
    state.playing = true;
    state.loading = false;
    emit();
  });
  audio.addEventListener("pause", () => {
    state.playing = false;
    emit();
  });
  audio.addEventListener("waiting", () => {
    state.loading = true;
    emit();
  });
  audio.addEventListener("canplay", () => {
    state.loading = false;
    emit();
  });
  audio.addEventListener("ended", () => {
    next();
  });
  audio.addEventListener("error", () => {
    state.loading = false;
    if (state.currentId) {
      const beat = currentBeat();
      const Toast = window.ACLASS.Toast;
      if (Toast && beat) Toast.show("Couldn't play \"" + beat.title + "\" right now.");
    }
    emit();
  });

  audio.volume = Store.volume;

  const AudioEngine = {
    state,
    subscribe,
    currentBeat,
    playId,
    playBeat,
    toggle,
    resume,
    pause,
    stop,
    seek,
    seekBy,
    setVolume,
    toggleMute,
    next,
    prev,
    queueFor,
  };

  window.ACLASS = Object.assign(window.ACLASS || {}, { Audio: AudioEngine });
})();
