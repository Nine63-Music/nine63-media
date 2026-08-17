/* ACLASS — site configuration (edit freely) */
(function () {
  "use strict";

  const raw = window.ACLASS_DATA || { beats: [], folders: [], genres: [], moods: [] };

  const CONFIG = {
    brand: raw.brand || { name: "NINE63 MUSIC", producer: "963 Beats" },

    /* Media CDN prefix. Empty = serve beats/artwork from this site's own
       files (local dev). Set via data/site.js to an external root
       (e.g. https://cdn.jsdelivr.net/gh/USER/nine63-media@latest) when
       audio + artwork are hosted separately so the Vercel deploy stays
       small. Both audio and artwork resolve through Utils.assetUrl. */
    assetBase: (window.ACLASS_SITE && window.ACLASS_SITE.assetBase) || "",

    /* Order recipient. Used only to build the email link at runtime —
       never rendered anywhere on the page. */
    contactEmail: "catzmoke@gmail.com",

    /* Currency + default pricing. Edit here to reprice the whole store. */
    currency: "USD",
    currencySymbol: "$",

    /* License tiers — fully configurable. Each license lists what the buyer receives. */
    licenses: [
      {
        slug: "basic",
        name: "Basic",
        price: 30,
        tag: "Lease",
        popular: false,
        blurb: "Streaming-ready rights for a single release.",
        features: [
          "MP3 file (320kbps, untagged)",
          "1,000,000 audio streams",
          "Non-exclusive lease",
          "Radio / live performances included",
        ],
      },
      {
        slug: "premium",
        name: "Premium",
        price: 60,
        tag: "Lease",
        popular: true,
        blurb: "The go-to for serious releases. Everything included.",
        features: [
          "WAV + MP3 (320kbps, untagged)",
          "10,000,000 audio streams",
          "Non-exclusive lease",
          "Unlimited track sales on one release",
          "Videos, live, radio & DJ use included",
        ],
      },
      {
        slug: "unlimited",
        name: "Unlimited",
        price: 120,
        tag: "Lease",
        popular: false,
        blurb: "Full commercial run. Your song, all rights to use it.",
        features: [
          "WAV + MP3 (320kbps, untagged)",
          "Unlimited audio streams",
          "Unlimited sales of one release",
          "All platforms + sync licensing",
          "Free custom tag removal",
        ],
      },
      {
        slug: "exclusive",
        name: "Exclusive",
        price: 500,
        tag: "Yours",
        popular: false,
        blurb: "The beat is taken off the market. It only belongs to you.",
        features: [
          "WAV + MP3 + stems",
          "100% exclusive rights",
          "Beat removed from the store",
          "Contract transfer",
          "Priority support & mixes",
        ],
      },
    ],

    /* Starting price shown on cards (lowest tier). */
    startingPrice: 30,

    /* Credit packs — prepaid discount cards. Buyers purchase credits
       upfront and apply them to any beat for an instant discount. */
    creditPacks: [
      { slug: "5-credits", name: "5 Credits", price: 100, credits: 5, blurb: "Buy 5 credits upfront. Apply one to any beat for $25 off — that's a Basic for just $5." },
      { slug: "10-credits", name: "10 Credits", price: 180, credits: 10, blurb: "Best value. 10 credits for $180 — each one worth $25. That's 23% off every beat." },
    ],

    /* How many credits each license tier costs. Set a tier to null to disable credits for it. */
    licenseCredits: { basic: 1, premium: 2, unlimited: 4, exclusive: 10 },

    /* Bundle deals — multi-beat packages at a discount. */
    bundles: [
      { slug: "3-beat-bundle", name: "3-Beat Bundle", price: 75, beats: 3, license: "basic", blurb: "3 Basic licenses for $75 instead of $90. Save $15 — tell us which 3 in the order notes." },
      { slug: "5-beat-bundle", name: "5-Beat Bundle", price: 110, beats: 5, license: "basic", blurb: "5 Basic licenses for $110 instead of $150. Save $40 — the best deal for bulk." },
    ],

    /* How many seconds of "newest" vs stored date fallbacks behave. */
    freshCount: 8,
    trendingCount: 8,
    relatedCount: 6,
    hiddenGemsCount: 4,

    marquee: ["Dark Trap", "New Jazz", "Melodic Trap", "Plug", "UK Drill", "Smooth Trap", "Supertrap", "Afrobeats", "R&B", "Chill", "Experimental", "Jersey", "Laid Back", "Cinematic"],

    copy: {
      heroEyebrow: "Beats by " + (raw.brand?.producer || "963 Beats"),
      heroTitle: ["You just found your ", "sound."],
      heroLede:
        "This is a room full of beats that want to be songs. Press play, let your voice find them — and license the one that makes you write differently.",
      ctaPrimary: "Explore the beats",
      ctaSecondary: "License a beat",
      freshTitle: "Fresh drops",
      freshSub: "Straight out of the studio.",
      trendingTitle: "Trending right now",
      trendingSub: "The ones everyone keeps coming back to.",
      soundsTitle: "Browse by sound",
      soundsSub: "Four worlds, endless directions. Step into one.",
      vibeTitle: "Find your sound",
      vibeSub: "Tell us how you want to feel. We'll find the beat.",
      personalTitle: "Because you've been listening",
      personalSub: "Handpicked from your taste.",
      storyTitle: "Not a shop. A studio you can hear.",
      storyText:
        "Every beat here is crafted by 963 Beats and curated for artists who hear things before other people do. No stock packs. No filler. Just sound you can build a song on — cleared and ready to be yours.",
      finalTitle: "Your next song is hiding in here.",
      finalSub: "Don't force the song. Find the sound.",
      finalCta: "Press play",
      libraryTitle: "The vault",
      librarySub: "Every beat in the room, in one place.",
      emptyTitle: "Nothing matches that.",
      emptyText: "Try loosening a filter, or search for a mood instead of an exact title.",
    },
  };

  window.ACLASS_CONFIG = CONFIG;
})();
