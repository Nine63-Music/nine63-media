/* ACLASS — inline SVG icon system */
(function () {
  "use strict";

  const ICONS = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72c0 .8.87 1.3 1.56.88l10.5-6.86a1.03 1.03 0 0 0 0-1.76L9.56 4.26A1.03 1.03 0 0 0 8 5.14Z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5.5A1.5 1.5 0 0 1 8.5 4h2A1.5 1.5 0 0 1 12 5.5v13A1.5 1.5 0 0 1 10.5 20h-2A1.5 1.5 0 0 1 7 18.5v-13Zm6 0A1.5 1.5 0 0 1 14.5 4h2A1.5 1.5 0 0 1 18 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-2A1.5 1.5 0 0 1 13 18.5v-13Z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6a1 1 0 0 1 2 0v12a1 1 0 1 1-2 0V6Zm4.2 1.16a1 1 0 0 0-1.43.9v7.88a1 1 0 0 0 1.43.9l9.4-3.94a1 1 0 0 0 0-1.8l-9.4-3.94Z"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 6a1 1 0 1 1 2 0v12a1 1 0 1 1-2 0V6ZM7.03 7.06a1 1 0 0 1 1.43-.9l9.4 3.94a1 1 0 0 1 0 1.8l-9.4 3.94a1 1 0 0 1-1.43-.9V7.06Z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.7-9.3-9.1C1.3 8 2.8 4.9 5.9 4.6c2-.2 3.6.9 4.6 2.6 0 0 1.5-1 3.6-.6 2.8.5 4.2 3.4 3.2 6.5-1.1 3.4-5.3 7.4-5.3 7.4Z"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h1.2l1.9 9.2a1.5 1.5 0 0 0 1.5 1.2h6.7a1.5 1.5 0 0 0 1.5-1.2L19.4 8H7.3"/><circle cx="9.7" cy="19.5" r="1.3"/><circle cx="16.3" cy="19.5" r="1.3"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    volume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" stroke="none"/><path d="M15 9.2a4 4 0 0 1 0 5.6M17.8 6.6a8 8 0 0 1 0 10.8"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" stroke="none"/><path d="m16 9 5 6m0-6-5 6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-.8 12.1a1.5 1.5 0 0 1-1.5 1.4H8.3a1.5 1.5 0 0 1-1.5-1.4L6 7"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m0 0-6-6m6 6-6 6"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>',
  };

  function icon(name) {
    return ICONS[name] || "";
  }

  window.ACLASS = Object.assign(window.ACLASS || {}, { icon });
})();
