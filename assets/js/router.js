/* ACLASS — hash router */
(function () {
  "use strict";

  const app = document.getElementById("app");
  let current = {};

  function setMeta(page) {
    document.title = page.title;
    const set = (sel, attr, val) => {
      const el = document.head.querySelector(sel);
      if (el) el.setAttribute(attr, val);
    };
    const desc = page.description || "";
    set('meta[name="description"]', "content", desc);
    set('meta[property="og:title"]', "content", page.title);
    set('meta[property="og:description"]', "content", desc);
    set('meta[name="twitter:title"]', "content", page.title);
    const ogType = page.ogType || "website";
    set('meta[property="og:type"]', "content", ogType);

    let ld = document.getElementById("jsonld");
    if (page.jsonLd) {
      if (!ld) {
        ld = document.createElement("script");
        ld.id = "jsonld";
        ld.type = "application/ld+json";
        document.head.appendChild(ld);
      }
      ld.textContent = JSON.stringify(page.jsonLd);
    } else if (ld) {
      ld.remove();
    }
  }

  function highlightNav(parts) {
    const currentPage = parts[0] || "home";
    document.querySelectorAll(".site-nav a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const match =
        (currentPage === "beats" && href === "#/beats") ||
        (currentPage === "genres" && href === "#/genres") ||
        (currentPage === "moods" && href === "#/moods") ||
        (currentPage === "about" && href === "#/about") ||
        (currentPage === "home" && href === "#/");
      if (match) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function closeChrome() {
    const drawer = document.getElementById("nav-drawer");
    if (drawer) drawer.hidden = true;
    const burger = document.getElementById("nav-burger");
    if (burger) burger.setAttribute("aria-expanded", "false");
  }

  function dispatch() {
    const { parts, params } = window.ACLASS.Utils.parseHash();
    const Pages = window.ACLASS.Pages;
    if (!Pages) return;

    const requested = parts.join("/");
    if (current.requested === requested && JSON.stringify(current.params) === JSON.stringify(params)) {
      return; /* same route, no reload */
    }
    current = { requested, params };

    let page;
    try {
      page = Pages.render(parts, params);
    } catch (err) {
      console.error(err);
      page = Pages.renderNotFound();
    }
    if (!page) return;

    app.innerHTML = page.html;
    setMeta(page);
    highlightNav(parts);
    closeChrome();

    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    window.ACLASS.Components.updateBadges();

    /* post-render hooks */
    if (typeof page.mount === "function") page.mount(app);
  }

  function boot() {
    window.addEventListener("hashchange", dispatch);
    dispatch();
  }

  window.ACLASS = Object.assign(window.ACLASS || {}, { Router: { boot, dispatch } });
})();
