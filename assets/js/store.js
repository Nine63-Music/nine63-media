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

  /* ---- Cart item type helpers ---- */
  function cartType(item) {
    return item.type || "beat";
  }

  function cfg() {
    return window.ACLASS_CONFIG || {};
  }

  function resolveCart() {
    var c = cfg();
    return cart
      .map(function (item) {
        var t = cartType(item);
        if (t === "credits") {
          var pack = (c.creditPacks || []).find(function (p) { return p.slug === item.packId; });
          return pack ? { type: "credits", pack: pack } : null;
        }
        if (t === "bundle") {
          var bundle = (c.bundles || []).find(function (b) { return b.slug === item.bundleId; });
          return bundle ? { type: "bundle", bundle: bundle } : null;
        }
        var beat = byId.get(item.id);
        var license = (c.licenses || []).find(function (l) { return l.slug === item.license; });
        if (!beat || !license) return null;
        var out = { type: "beat", beat: beat, license: license };
        if (item.creditsUsed) out.creditsUsed = item.creditsUsed;
        return out;
      })
      .filter(Boolean);
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

    /* ---- Cart ---- */
    get cart() {
      return resolveCart();
    },
    get cartCount() {
      return cart.length;
    },

    /* Beat operations (backwards-compatible with legacy items) */
    addToCart(id, licenseSlug) {
      cart = cart.filter((i) => cartType(i) !== "beat" || !(i.id === id && i.license === licenseSlug));
      cart.push({ type: "beat", id: id, license: licenseSlug });
      write(KEY.cart, cart);
      emit();
    },
    addToCartWithCredits(id, licenseSlug) {
      cart = cart.filter((i) => cartType(i) !== "beat" || !(i.id === id && i.license === licenseSlug));
      var creditCost = ((cfg().licenseCredits || {})[licenseSlug]) || 0;
      cart.push({ type: "beat", id: id, license: licenseSlug, creditsUsed: creditCost });
      write(KEY.cart, cart);
      emit();
    },
    removeFromCart(id, licenseSlug) {
      cart = cart.filter((i) => {
        if (cartType(i) !== "beat") return true;
        return !(i.id === id && i.license === licenseSlug);
      });
      write(KEY.cart, cart);
      emit();
    },
    cartHas(id, licenseSlug) {
      return cart.some((i) => cartType(i) === "beat" && i.id === id && i.license === licenseSlug);
    },

    /* Credit pack operations */
    addCreditPack(slug) {
      cart = cart.filter((i) => !(cartType(i) === "credits" && i.packId === slug));
      cart.push({ type: "credits", packId: slug });
      write(KEY.cart, cart);
      emit();
    },
    removeCreditPack(slug) {
      cart = cart.filter((i) => !(cartType(i) === "credits" && i.packId === slug));
      write(KEY.cart, cart);
      emit();
    },
    creditPackHas(slug) {
      return cart.some((i) => cartType(i) === "credits" && i.packId === slug);
    },
    get creditBalance() {
      var c = cfg();
      return cart
        .filter((i) => cartType(i) === "credits")
        .reduce(function (sum, i) {
          var pack = (c.creditPacks || []).find(function (p) { return p.slug === i.packId; });
          return sum + (pack ? pack.credits : 0);
        }, 0);
    },
    get creditsUsed() {
      return cart
        .filter((i) => cartType(i) === "beat" && i.creditsUsed)
        .reduce(function (sum, i) { return sum + (i.creditsUsed || 0); }, 0);
    },
    get creditsRemaining() {
      return Math.max(0, this.creditBalance - this.creditsUsed);
    },

    /* Bundle operations */
    addBundle(slug) {
      cart = cart.filter((i) => !(cartType(i) === "bundle" && i.bundleId === slug));
      cart.push({ type: "bundle", bundleId: slug });
      write(KEY.cart, cart);
      emit();
    },
    removeBundle(slug) {
      cart = cart.filter((i) => !(cartType(i) === "bundle" && i.bundleId === slug));
      write(KEY.cart, cart);
      emit();
    },
    bundleHas(slug) {
      return cart.some((i) => cartType(i) === "bundle" && i.bundleId === slug);
    },

    /* Clear all cart items */
    clearCart() {
      cart = [];
      write(KEY.cart, cart);
      emit();
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
