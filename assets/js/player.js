/* ACLASS — persistent global player UI */
(function () {
  "use strict";

  const Utils = window.ACLASS.Utils;
  const Store = window.ACLASS.Store;
  const Audio = window.ACLASS.Audio;
  const icon = window.ACLASS.icon;
  const cfg = Utils.config;

  const root = document.getElementById("player-root");

  const el = {};
  let dragging = false;
  let bound = false;

  /* ---------- render the player bar ---------- */
  function render() {
    root.innerHTML =
      '<div class="player" role="region" aria-label="Now playing">' +
      '<div class="player__progress" data-action="scrub" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">' +
      '<div class="player__progress-fill"></div>' +
      "</div>" +
      '<div class="player__inner">' +
      '<div class="player__left">' +
      '<a class="player__art" data-action="open" aria-label="Open beat page"></a>' +
      '<div class="player__info">' +
      '<div class="player__title"></div>' +
      '<div class="player__sub"></div>' +
      "</div>" +
      "</div>" +
      '<div class="player__center">' +
      '<button class="player__btn" data-action="prev" aria-label="Previous beat">' +
      icon("prev") +
      "</button>" +
      '<button class="player__btn player__btn--main" data-action="toggle" aria-label="Play or pause">' +
      icon("play") +
      "</button>" +
      '<button class="player__btn" data-action="next" aria-label="Next beat">' +
      icon("next") +
      "</button>" +
      '<span class="player__time" data-role="time-cur">0:00</span>' +
      '<span class="player__time player__time--end" data-role="time-end">0:00</span>' +
      "</div>" +
      '<div class="player__right">' +
      '<button class="player__btn player__fav" data-action="fav" aria-label="Add to favorites">' +
      icon("heart") +
      "</button>" +
      '<div class="player__vol">' +
      '<button class="player__btn" data-action="mute" aria-label="Mute or unmute">' +
      icon("volume") +
      "</button>" +
      '<input type="range" min="0" max="1" step="0.01" aria-label="Volume" data-role="volume">' +
      "</div>" +
      '<a class="btn btn--sm btn--ghost" data-action="license" href="#">License</a>' +
      "</div>" +
      "</div>" +
      "</div>";

    el.bar = root.querySelector(".player__progress");
    el.fill = root.querySelector(".player__progress-fill");
    el.art = root.querySelector(".player__art");
    el.title = root.querySelector(".player__title");
    el.sub = root.querySelector(".player__sub");
    el.play = root.querySelector('[data-action="toggle"]');
    el.prev = root.querySelector('[data-action="prev"]');
    el.next = root.querySelector('[data-action="next"]');
    el.timeCur = root.querySelector('[data-role="time-cur"]');
    el.timeEnd = root.querySelector('[data-role="time-end"]');
    el.fav = root.querySelector('[data-action="fav"]');
    el.volBtn = root.querySelector('[data-action="mute"]');
    el.volInput = root.querySelector('[data-role="volume"]');
    el.license = root.querySelector('[data-action="license"]');

    el.volInput.value = Store.volume;
    el.volInput.style.setProperty("--fill", Store.volume * 100 + "%");
    el.volInput.addEventListener("input", () => {
      el.volInput.style.setProperty("--fill", (parseFloat(el.volInput.value) || 0) * 100 + "%");
      Audio.setVolume(parseFloat(el.volInput.value));
    });

    bindScrub();
  }

  /* ---------- progress bar scrubbing ---------- */
  function bindScrub() {
    const start = (e) => {
      if (!Audio.state.duration) return;
      dragging = true;
      setFill(e);
    };
    const setFill = (e) => {
      if (!el.bar) return;
      const rect = el.bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      el.fill.style.width = ratio * 100 + "%";
      el.bar.setAttribute("aria-valuenow", Math.round(ratio * 100));
    };
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      if (!el.bar) return;
      const rect = el.bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      Audio.seek(ratio * Audio.state.duration);
    };
    el.bar.addEventListener("pointerdown", start);
    if (!bound) {
      window.addEventListener("pointermove", (e) => dragging && setFill(e));
      window.addEventListener("pointerup", end);
      bound = true;
    }
    el.bar.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        Audio.seek(Audio.state.time + (e.key === "ArrowRight" ? 5 : -5));
      }
    });
  }

  /* ---------- sync UI with audio state ---------- */
  function sync() {
    const s = Audio.state;
    const beat = Audio.currentBeat();

    if (!beat) {
      if (root.firstChild) root.innerHTML = "";
      el.bar = el.fill = el.play = null;
      return;
    }

    if (!el.bar) render();

    const playing = s.playing && !s.loading;
    el.play.innerHTML = icon(playing ? "pause" : "play");
    el.play.setAttribute("aria-label", playing ? "Pause" : "Play");

    el.art.innerHTML = window.ACLASS.Components.imgTag(beat, null, "Artwork for " + beat.title);
    el.art.href = "#/beat/" + beat.slug;
    el.title.textContent = beat.title;
    el.sub.textContent = Utils.genreLine(beat) + (beat.bpm ? " · " + beat.bpm + " BPM" : "");

    const dur = s.duration || 0;
    const cur = s.time || 0;
    el.timeCur.textContent = Utils.fmtTime(cur);
    el.timeEnd.textContent = Utils.fmtTime(dur);
    const pct = dur ? Math.min(100, (cur / dur) * 100) : 0;
    el.fill.style.width = pct + "%";
    el.bar.setAttribute("aria-valuenow", Math.round(pct));

    const faved = Store.isFav(beat.id);
    el.fav.classList.toggle("on", faved);
    el.fav.setAttribute("aria-label", faved ? "Remove from favorites" : "Add to favorites");
    el.fav.setAttribute("aria-pressed", String(faved));

    el.license.href = "#/beat/" + beat.slug;
    el.license.textContent = cfg.currencySymbol + cfg.startingPrice + " · License";

    el.volBtn.innerHTML = icon(s.muted || s.volume === 0 ? "mute" : "volume");
  }

  /* ---------- player button delegation ---------- */
  function handleClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    if (action === "toggle") Audio.toggle();
    else if (action === "next") Audio.next();
    else if (action === "prev") Audio.prev();
    else if (action === "fav") {
      const beat = Audio.currentBeat();
      if (beat) {
        const faved = Store.toggleFav(beat.id);
        window.ACLASS.Toast.show(faved ? "Added to favorites" : "Removed from favorites");
      }
    } else if (action === "mute") Audio.toggleMute();
    else if (action === "open") {
      const beat = Audio.currentBeat();
      if (beat) location.hash = "#/beat/" + beat.slug;
    }
  }

  root.addEventListener("click", handleClick);
  Audio.subscribe(sync);
  Store.onChange(() => {
    if (Audio.currentBeat()) sync();
  });
  sync();
})();
