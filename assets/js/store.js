/* ACLASS — persistent client state (favorites, cart, history, prefs) */
(function () {
  "use strict";

  const NS = "aclass:v1";
  const data = window.ACLASS_DATA || { beats: [] };
  const byId = new Map(data.beats.map((b) => [b.id, b]));

  const KEY = {
    favs: NS + ":favorites",
    cart: NS + ":cart",
    plays: NS + ":plays",
    vol: NS + ":volume",
    last: NS + ":last",
  };

  function read(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable — non-fatal */
    }
  }

  let favorites = new Set(read(KEY.favs, []));
  let cart = read(KEY.cart, []);
  let plays = read(KEY.plays, {});
  let volume = read(KEY.vol, 0.8);

  const listeners = [];

  function emit() {
    for (const fn of listeners) {
      try {
        fn();
      } catch (e) {
        /* keep going */
      }
    }
  }
  function onChange(fn) {
    listeners.push(fn);
  }

  const Store = {
    get favorites() {
      return [...favorites].map((id) => byId.get(id)).filter(Boolean);
    },
    isFav(id) {
      return favorites.has(id);
    },
    toggleFav(id) {
      if (favorites.has(id)) favorites.delete(id);
      else favorites.add(id);
      write(KEY.favs, [...favorites]);
      emit();
      return favorites.has(id);
    },

    get cart() {
      return cart
        .map((item) => {
          const beat = byId.get(item.id);
          const license = (window.ACLASS_CONFIG.licenses || []).find((l) => l.slug === item.license);
          if (!beat || !license) return null;
          return { beat, license };
        })
        .filter(Boolean);
    },
    get cartCount() {
      return cart.length;
    },
    addToCart(id, licenseSlug) {
      cart = cart.filter((i) => !(i.id === id && i.license === licenseSlug));
      cart.push({ id, license: licenseSlug });
      write(KEY.cart, cart);
      emit();
    },
    removeFromCart(id, licenseSlug) {
      cart = cart.filter((i) => !(i.id === id && i.license === licenseSlug));
      write(KEY.cart, cart);
      emit();
    },
    clearCart() {
      cart = [];
      write(KEY.cart, cart);
      emit();
    },
    cartHas(id, licenseSlug) {
      return cart.some((i) => i.id === id && i.license === licenseSlug);
    },

    /* Play history: { id: count } */
    recordPlay(id) {
      plays[id] = (plays[id] || 0) + 1;
      write(KEY.plays, plays);
      write(KEY.last, id);
      emit();
    },
    get playCounts() {
      return plays;
    },
    get lastPlayedId() {
      return read(KEY.last, null);
    },

    get volume() {
      return volume;
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      write(KEY.vol, volume);
    },

    onChange,
  };

  window.ACLASS = Object.assign(window.ACLASS || {}, { Store });
})();
