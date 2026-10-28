(() => {
  const doc = document;
  const header = doc.querySelector("[data-header]");
  const burger = doc.querySelector("[data-burger]");
  const nav = doc.querySelector("[data-nav]");
  const cursor = doc.querySelector(".cursor-ring");
  const year = doc.querySelector("[data-year]");

  if (year) year.textContent = String(new Date().getFullYear());

  /* Header scroll state */
  const onScrollHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* Mobile menu */
  if (burger && nav) {
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      doc.body.style.overflow = open ? "hidden" : "";
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        burger.classList.remove("is-open");
        doc.body.style.overflow = "";
      });
    });
  }

  /* Smooth scroll helpers */
  doc.querySelectorAll("[data-scroll-to]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = doc.querySelector(btn.getAttribute("data-scroll-to"));
      target?.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* Reveal on scroll */
  const reveals = [...doc.querySelectorAll(".reveal")];
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
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* Timber draw line */
  const drawLine = doc.querySelector("[data-draw]");
  if (drawLine && "IntersectionObserver" in window) {
    const dio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            drawLine.classList.add("is-drawn");
            dio.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    dio.observe(drawLine);
  }

  /* Counters */
  const counters = [...doc.querySelectorAll("[data-count]")];
  const animateCount = (el) => {
    const end = Number(el.getAttribute("data-count")) || 0;
    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(end * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
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

  /* Atmosphere parallax on horizontal track */
  const track = doc.querySelector("[data-parallax-track]");
  if (track) {
    const shots = [...track.querySelectorAll(".atm-shot")];
    const updateParallax = () => {
      const rect = track.getBoundingClientRect();
      const view = window.innerHeight;
      if (rect.bottom < 0 || rect.top > view) return;
      const progress = (view - rect.top) / (view + rect.height);
      shots.forEach((shot, i) => {
        const dir = i % 2 === 0 ? -1 : 1;
        const y = dir * progress * 28;
        shot.style.transform = `translateY(${y}px)`;
      });
    };
    window.addEventListener("scroll", updateParallax, { passive: true });
    updateParallax();
  }

  /* Soft mouse parallax for hero geometry */
  const hero = doc.querySelector("[data-hero]");
  const rings = hero?.querySelector(".geo--rings-wrap");
  if (hero && rings && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    hero.addEventListener("pointermove", (e) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      rings.style.transform = `translate(${x * 28}px, ${y * 18}px)`;
    });
  }

  /* Custom cursor */
  if (cursor && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let mx = 0;
    let my = 0;
    let cx = 0;
    let cy = 0;

    window.addEventListener(
      "pointermove",
      (e) => {
        mx = e.clientX;
        my = e.clientY;
      },
      { passive: true }
    );

    const tick = () => {
      cx += (mx - cx) * 0.18;
      cy += (my - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    tick();

    doc.querySelectorAll("a, button, .room, .terra, .well-card").forEach((el) => {
      el.addEventListener("pointerenter", () => cursor.classList.add("is-hot"));
      el.addEventListener("pointerleave", () => cursor.classList.remove("is-hot"));
    });
  }

  /* Marquee pause on hover */
  const marquee = doc.querySelector("[data-marquee]");
  if (marquee) {
    marquee.addEventListener("pointerenter", () => {
      marquee.style.animationPlayState = "paused";
    });
    marquee.addEventListener("pointerleave", () => {
      marquee.style.animationPlayState = "running";
    });
  }
})();
