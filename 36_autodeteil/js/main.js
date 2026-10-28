(() => {
  const header = document.querySelector("[data-header]");
  const burger = document.querySelector("[data-burger]");
  const nav = document.querySelector("[data-nav]");
  const form = document.querySelector("[data-form]");
  const success = document.querySelector("[data-form-success]");

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (burger && nav) {
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        burger.classList.remove("is-open");
        document.body.style.overflow = "";
      });
    });
  }

  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    revealItems.forEach((el) => revealObserver.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add("is-in"));
  }

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

  const counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window) {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => countObserver.observe(el));
  } else {
    counters.forEach(animateCount);
  }

  const phoneInput = form?.querySelector('input[name="phone"]');
  if (phoneInput) {
    phoneInput.addEventListener("input", () => {
      let digits = phoneInput.value.replace(/\D/g, "");
      if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
      if (!digits.startsWith("7") && digits.length) digits = `7${digits}`;
      digits = digits.slice(0, 11);

      const parts = [
        digits.slice(1, 4),
        digits.slice(4, 7),
        digits.slice(7, 9),
        digits.slice(9, 11),
      ];

      let formatted = "";
      if (digits.length) formatted = "+7";
      if (parts[0]) formatted += ` (${parts[0]}`;
      if (parts[0]?.length === 3) formatted += ")";
      if (parts[1]) formatted += ` ${parts[1]}`;
      if (parts[2]) formatted += `-${parts[2]}`;
      if (parts[3]) formatted += `-${parts[3]}`;
      phoneInput.value = formatted;
    });
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();

    if (!name || phone.replace(/\D/g, "").length < 11) {
      form.reportValidity();
      return;
    }

    form.reset();
    if (success) {
      success.hidden = false;
      success.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  // Soft parallax for floating geometry
  const rings = document.querySelectorAll(".geo-ring, .geo-hex");
  if (rings.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.addEventListener(
      "pointermove",
      (event) => {
        const x = (event.clientX / window.innerWidth - 0.5) * 12;
        const y = (event.clientY / window.innerHeight - 0.5) * 12;
        rings.forEach((el, index) => {
          const factor = index % 2 === 0 ? 1 : -1;
          el.style.translate = `${x * factor}px ${y * factor}px`;
        });
      },
      { passive: true }
    );
  }
})();
