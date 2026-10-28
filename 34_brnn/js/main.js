(() => {
  const header = document.getElementById("header");
  const nav = document.getElementById("nav");
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = [...document.querySelectorAll(".nav a")];
  const sections = [...document.querySelectorAll("main section[id]")];
  const reveals = [...document.querySelectorAll("[data-reveal]")];
  const counters = [...document.querySelectorAll("[data-count]")];
  const parallaxNodes = [...document.querySelectorAll("[data-parallax]")];
  const geoLayer = document.querySelector(".geo-layer");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header scroll state */
  const onScrollHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  /* Mobile menu */
  menuToggle?.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("menu-open");
      menuToggle?.setAttribute("aria-expanded", "false");
    });
  });

  /* Active nav section */
  const setActiveNav = () => {
    const y = window.scrollY + 120;
    let current = sections[0]?.id;

    for (const section of sections) {
      if (section.offsetTop <= y) current = section.id;
    }

    navLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      link.classList.toggle("is-active", href === `#${current}`);
    });
  };

  /* Reveal on scroll */
  if (!reduceMotion && "IntersectionObserver" in window) {
    reveals.forEach((el, i) => {
      el.style.setProperty("--reveal-delay", `${(i % 4) * 70}ms`);
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    reveals.forEach((el) => revealObserver.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* Counters */
  const animateCount = (el) => {
    const target = Number(el.dataset.count || 0);
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  if (!reduceMotion && "IntersectionObserver" in window) {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((el) => countObserver.observe(el));
  } else {
    counters.forEach((el) => {
      el.textContent = el.dataset.count || "0";
    });
  }

  /* Soft parallax */
  let ticking = false;

  const updateParallax = () => {
    ticking = false;
    if (reduceMotion) return;

    const vh = window.innerHeight;

    parallaxNodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const offset = ((center - vh / 2) / vh) * -36;
      const media = node.querySelector("img");
      if (media) {
        media.style.transform = `translate3d(0, ${offset}px, 0) scale(1.1)`;
      }
    });
  };

  const onScroll = () => {
    onScrollHeader();
    setActiveNav();
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateParallax);
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScrollHeader);
  onScroll();

  /* Hero brand entrance stagger via CSS class timing */
  const heroBrand = document.querySelector(".hero-brand");
  if (heroBrand && !reduceMotion) {
    requestAnimationFrame(() => heroBrand.classList.add("is-in"));
  }

  /* Cursor-reactive geo layer tilt on desktop */
  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    let mx = 0;
    let my = 0;

    window.addEventListener(
      "pointermove",
      (e) => {
        mx = (e.clientX / window.innerWidth - 0.5) * 12;
        my = (e.clientY / window.innerHeight - 0.5) * 12;
        if (geoLayer) {
          geoLayer.style.translate = `${mx}px ${my + window.scrollY * 0.04}px`;
        }
      },
      { passive: true }
    );
  }
})();
