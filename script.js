/**
 * MarketPulse — light interactivity
 * Glossary filter, theme toggle, market card number animation, mobile nav,
 * markets.json load with HTML fallback
 */

(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- Theme toggle ---------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const storedTheme = localStorage.getItem("mp-theme");

  if (storedTheme === "light" || storedTheme === "dark") {
    root.setAttribute("data-theme", storedTheme);
  }

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function setTheme(theme) {
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
    localStorage.setItem("mp-theme", theme);
    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        theme === "light" ? "Switch to dark theme" : "Switch to light theme"
      );
    }
  }

  if (themeToggle) {
    setTheme(currentTheme());
    themeToggle.addEventListener("click", function () {
      setTheme(currentTheme() === "light" ? "dark" : "light");
    });
  }

  /* ---------- Mobile nav ---------- */
  const navToggle = document.getElementById("navToggle");
  const mobileNav = document.getElementById("mobileNav");

  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      const open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      navToggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
      if (open) {
        mobileNav.setAttribute("hidden", "");
      } else {
        mobileNav.removeAttribute("hidden");
      }
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open menu");
        mobileNav.setAttribute("hidden", "");
      });
    });
  }

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* ---------- Glossary search / filter ---------- */
  const searchInput = document.getElementById("glossarySearch");
  const glossaryList = document.getElementById("glossaryList");
  const glossaryCount = document.getElementById("glossaryCount");
  const glossaryEmpty = document.getElementById("glossaryEmpty");

  function updateGlossaryFilter() {
    if (!glossaryList || !searchInput) return;

    const query = searchInput.value.trim().toLowerCase();
    const items = glossaryList.querySelectorAll(".glossary-item");
    let visible = 0;

    items.forEach(function (item) {
      const term = (item.querySelector("dt")?.textContent || "").toLowerCase();
      const def = (item.querySelector("dd")?.textContent || "").toLowerCase();
      const tags = (item.getAttribute("data-terms") || "").toLowerCase();
      const haystack = term + " " + def + " " + tags;
      const match = !query || haystack.includes(query);
      item.hidden = !match;
      if (match) visible += 1;
    });

    if (glossaryCount) {
      const total = items.length;
      glossaryCount.textContent =
        query === ""
          ? total + " terms"
          : visible + " of " + total + " terms";
    }

    if (glossaryEmpty) {
      glossaryEmpty.hidden = visible > 0;
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", updateGlossaryFilter);
    updateGlossaryFilter();
  }

  /* ---------- Number formatting ---------- */
  function formatNumber(n) {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatChangePercent(pct) {
    const abs = Math.abs(pct).toFixed(2);
    if (pct > 0) return "+" + abs + "%";
    if (pct < 0) return "−" + abs + "%";
    return abs + "%";
  }

  /* ---------- Animate market prices on scroll into view ---------- */
  function animateValue(el, end, duration) {
    if (prefersReducedMotion) {
      el.textContent = formatNumber(end);
      return;
    }

    const start = end * 0.97;
    const startTime = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = start + (end - start) * eased;
      el.textContent = formatNumber(value);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = formatNumber(end);
      }
    }

    requestAnimationFrame(frame);
  }

  function observePriceAnimation(el) {
    if (!("IntersectionObserver" in window)) {
      const raw = el.getAttribute("data-animate");
      const end = parseFloat(raw);
      if (!Number.isNaN(end)) el.textContent = formatNumber(end);
      return;
    }

    const priceObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          const target = entry.target;
          const raw = target.getAttribute("data-animate");
          const end = parseFloat(raw);
          if (!Number.isNaN(end)) {
            animateValue(target, end, 900);
          }
          obs.unobserve(target);
        });
      },
      { threshold: 0.4 }
    );
    priceObserver.observe(el);
  }

  /* ---------- Load markets from data/markets.json ---------- */

  function escapeAttrSelector(value) {
    if (window.CSS && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function applyMarketRow(card, row) {
    const price = Number(row.price);
    const change = Number(row.changePercent);
    if (Number.isNaN(price) || Number.isNaN(change)) return;

    const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
    card.setAttribute("data-change", direction);

    const title = card.querySelector("h3");
    if (title && row.name) title.textContent = row.name;

    const region = card.querySelector(".market-region");
    if (region && row.region) region.textContent = row.region;

    const priceEl = card.querySelector(".market-price");
    if (priceEl) {
      priceEl.setAttribute("data-animate", String(price));
      priceEl.textContent = formatNumber(price);
    }

    const changeEl = card.querySelector(".market-change");
    if (changeEl) {
      changeEl.classList.remove("up", "down", "flat");
      changeEl.classList.add(direction === "flat" ? "up" : direction);
      const arrow = direction === "down" ? "▼" : "▲";
      const ariaDir =
        direction === "down" ? "down" : direction === "up" ? "up" : "unchanged";
      changeEl.setAttribute(
        "aria-label",
        "Change " + ariaDir + " " + Math.abs(change).toFixed(2) + " percent"
      );
      changeEl.innerHTML =
        '<span class="change-arrow" aria-hidden="true">' +
        arrow +
        "</span> " +
        formatChangePercent(change);
    }
  }

  function showUpdatedAt(iso) {
    const wrap = document.getElementById("marketsUpdated");
    const timeEl = document.getElementById("marketsUpdatedTime");
    if (!wrap || !timeEl || !iso) return;

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;

    timeEl.setAttribute("datetime", iso);
    timeEl.textContent = d.toLocaleString("en-HK", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Hong_Kong",
    });
    wrap.hidden = false;
  }

  function applyMarketsPayload(data) {
    if (!data || !Array.isArray(data.markets)) return false;

    const labelEl = document.getElementById("marketsLabel");
    if (labelEl && data.label) {
      labelEl.textContent = data.label;
    }

    if (data.updatedAt) {
      showUpdatedAt(data.updatedAt);
    }

    let applied = 0;
    data.markets.forEach(function (row) {
      if (!row || !row.id) return;
      const card = document.querySelector(
        '.market-card[data-id="' + escapeAttrSelector(row.id) + '"]'
      );
      if (!card) return;
      applyMarketRow(card, row);
      applied += 1;
    });

    return applied > 0;
  }

  function loadMarketsJson() {
    const url = "data/markets.json?t=" + String(Date.now());
    return fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        applyMarketsPayload(data);
      })
      .catch(function () {
        /* Keep embedded HTML sample values — expected offline / CORS / missing file */
      });
  }

  /* Kick off JSON load, then wire price animations (after optional update) */
  loadMarketsJson().finally(function () {
    const priceEls = document.querySelectorAll(".market-price[data-animate]");
    priceEls.forEach(function (el) {
      observePriceAnimation(el);
    });
  });

  /* ---------- Soft reveal for cards ---------- */
  const revealTargets = document.querySelectorAll(
    ".market-card, .asset-card, .learn-card, .glossary-item"
  );

  revealTargets.forEach(function (el) {
    el.classList.add("reveal");
  });

  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" }
    );

    revealTargets.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }
})();
