(() => {
  const doc = document;
  const header = doc.getElementById("header");
  const burger = doc.getElementById("burger");
  const nav = doc.getElementById("nav");

  /* Header scroll state */
  const onScroll = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile menu */
  burger?.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-active", open);
    nav.classList.toggle("is-open", open);
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    doc.body.style.overflow = open ? "hidden" : "";
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      burger?.classList.remove("is-open");
      burger?.setAttribute("aria-expanded", "false");
      doc.body.style.overflow = "";
    });
  });

  /* Working hours status (approx NN local time UTC+3) */
  const statusEl = doc.querySelector("[data-status]");
  if (statusEl) {
    const hour = Number(
      new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow",
        hour: "numeric",
        hour12: false,
      }).format(new Date())
    );
    const open = hour >= 9 && hour < 21;
    statusEl.innerHTML = open
      ? `<span class="status-pill__dot"></span> Сейчас работаем`
      : `<span class="status-pill__dot" style="background:#9b968c;box-shadow:none"></span> Откроемся в 09:00`;
    if (!open) {
      statusEl.style.background = "rgba(155,150,140,0.12)";
      statusEl.style.borderColor = "rgba(155,150,140,0.35)";
      statusEl.style.color = "#d2cdc2";
    }
  }

  /* Hero crossfade */
  const heroImgs = [...doc.querySelectorAll(".hero__img")];
  if (heroImgs.length > 1) {
    let i = 0;
    setInterval(() => {
      heroImgs[i].classList.remove("is-active");
      i = (i + 1) % heroImgs.length;
      heroImgs[i].classList.add("is-active");
    }, 5500);
  }

  /* About gallery */
  const aboutImgs = [...doc.querySelectorAll("[data-about-slider] img")];
  if (aboutImgs.length > 1) {
    let i = 0;
    setInterval(() => {
      aboutImgs[i].classList.remove("is-active");
      i = (i + 1) % aboutImgs.length;
      aboutImgs[i].classList.add("is-active");
    }, 4200);
  }

  /* Reveal on scroll */
  const reveals = [...doc.querySelectorAll("[data-reveal]")];
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el, idx) => {
      el.style.transitionDelay = `${Math.min(idx % 6, 5) * 60}ms`;
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* Counters */
  const counters = [...doc.querySelectorAll("[data-count]")];
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || "";
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = target * eased;
      el.textContent = `${value.toFixed(decimals)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = `${target.toFixed(decimals)}${suffix}`;
    };
    requestAnimationFrame(tick);
  };

  if (counters.length && "IntersectionObserver" in window) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            cio.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => cio.observe(el));
  }

  /* City tabs */
  const cityBtns = [...doc.querySelectorAll("[data-city]")];
  const locationBlocks = [...doc.querySelectorAll("[data-locations]")];
  cityBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const city = btn.dataset.city;
      cityBtns.forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", String(b === btn));
      });
      locationBlocks.forEach((block) => {
        block.classList.toggle("is-active", block.dataset.locations === city);
      });
    });
  });

  /* Reviews highlight rotation */
  const reviews = [...doc.querySelectorAll(".review")];
  let reviewIndex = 0;
  const setReview = (next) => {
    if (!reviews.length) return;
    reviews[reviewIndex]?.classList.remove("is-active");
    reviewIndex = (next + reviews.length) % reviews.length;
    reviews[reviewIndex]?.classList.add("is-active");
  };

  doc.querySelector("[data-review-prev]")?.addEventListener("click", () => setReview(reviewIndex - 1));
  doc.querySelector("[data-review-next]")?.addEventListener("click", () => setReview(reviewIndex + 1));

  if (reviews.length > 1) {
    setInterval(() => setReview(reviewIndex + 1), 7000);
  }

  /* FAQ: only one open */
  const faqItems = [...doc.querySelectorAll("[data-faq] details")];
  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      faqItems.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });

  /* Soft parallax for geometry */
  const geos = [...doc.querySelectorAll(".geo")];
  if (geos.length && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.addEventListener(
      "pointermove",
      (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 12;
        const y = (e.clientY / window.innerHeight - 0.5) * 12;
        geos.forEach((geo, i) => {
          const k = (i + 1) * 0.35;
          geo.style.translate = `${x * k}px ${y * k}px`;
        });
      },
      { passive: true }
    );
  }
})();
