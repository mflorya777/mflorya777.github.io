(() => {
  const header = document.getElementById("header");
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");
  const form = document.getElementById("callbackForm");
  const formNote = document.getElementById("formNote");
  const phoneInput = document.getElementById("phone");

  /* Sticky header */
  const onScroll = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile menu */
  burger?.addEventListener("click", () => {
    const open = header.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("is-open");
      burger?.classList.remove("is-open");
      burger?.setAttribute("aria-expanded", "false");
    });
  });

  /* Reveal on scroll */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* Hero reveals on load */
  requestAnimationFrame(() => {
    document.querySelectorAll(".hero .reveal").forEach((el) => {
      el.classList.add("is-visible");
    });
  });

  /* Counters */
  const counters = document.querySelectorAll("[data-count]");
  const animateCount = (el) => {
    const target = Number(el.dataset.count || 0);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = `${prefix}${value}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  if ("IntersectionObserver" in window) {
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
    counters.forEach(animateCount);
  }

  /* Reviews slider */
  const reviews = [...document.querySelectorAll("#reviewsSlider .review")];
  const dotsWrap = document.getElementById("reviewDots");
  const prevBtn = document.getElementById("reviewPrev");
  const nextBtn = document.getElementById("reviewNext");
  let reviewIndex = 0;
  let reviewTimer;

  const renderDots = () => {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = "";
    reviews.forEach((_, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", `Отзыв ${i + 1}`);
      if (i === reviewIndex) btn.classList.add("is-active");
      btn.addEventListener("click", () => goToReview(i));
      dotsWrap.appendChild(btn);
    });
  };

  const goToReview = (index) => {
    reviewIndex = (index + reviews.length) % reviews.length;
    reviews.forEach((review, i) => {
      review.classList.toggle("is-active", i === reviewIndex);
    });
    renderDots();
    restartReviewTimer();
  };

  const restartReviewTimer = () => {
    clearInterval(reviewTimer);
    reviewTimer = setInterval(() => goToReview(reviewIndex + 1), 6500);
  };

  if (reviews.length) {
    renderDots();
    restartReviewTimer();
    prevBtn?.addEventListener("click", () => goToReview(reviewIndex - 1));
    nextBtn?.addEventListener("click", () => goToReview(reviewIndex + 1));
  }

  /* Phone mask */
  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    let normalized = digits;
    if (normalized.startsWith("8")) normalized = `7${normalized.slice(1)}`;
    if (!normalized.startsWith("7") && normalized.length) normalized = `7${normalized}`;

    const parts = [
      normalized.slice(1, 4),
      normalized.slice(4, 7),
      normalized.slice(7, 9),
      normalized.slice(9, 11),
    ];

    let result = "+7";
    if (parts[0]) result += ` (${parts[0]}`;
    if (parts[0]?.length === 3) result += ")";
    if (parts[1]) result += ` ${parts[1]}`;
    if (parts[2]) result += `-${parts[2]}`;
    if (parts[3]) result += `-${parts[3]}`;
    return result;
  };

  phoneInput?.addEventListener("input", () => {
    phoneInput.value = formatPhone(phoneInput.value);
  });

  /* Form */
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const consent = form.consent.checked;

    if (!name || phone.replace(/\D/g, "").length < 11 || !consent) {
      formNote.hidden = false;
      formNote.textContent = "Проверьте имя, телефон и согласие на обработку данных.";
      formNote.style.background = "#ffe8f0";
      formNote.style.color = "#9b1248";
      return;
    }

    formNote.hidden = false;
    formNote.textContent = "Спасибо! Мы свяжемся с вами в ближайшее время.";
    formNote.style.background = "";
    formNote.style.color = "";
    form.reset();
  });

  /* Parallax-ish geometric drift on hero */
  const heroGeo = document.querySelector(".hero__geo");
  if (heroGeo && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.addEventListener(
      "pointermove",
      (event) => {
        const x = (event.clientX / window.innerWidth - 0.5) * 12;
        const y = (event.clientY / window.innerHeight - 0.5) * 8;
        heroGeo.style.transform = `translate(${x}px, ${y}px)`;
      },
      { passive: true }
    );
  }
})();
