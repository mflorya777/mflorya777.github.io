(() => {
  const header = document.getElementById("header");
  const nav = document.getElementById("nav");
  const navToggle = document.getElementById("navToggle");
  const year = document.getElementById("year");
  const form = document.getElementById("feedbackForm");
  const formStatus = document.getElementById("formStatus");
  const filters = document.querySelectorAll(".loc-filter");
  const cards = document.querySelectorAll(".loc-card");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const closeNav = () => {
    nav?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  navToggle?.addEventListener("click", () => {
    const open = !nav?.classList.contains("is-open");
    nav?.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    reveals.forEach((el, index) => {
      if (el.closest(".hero")) {
        el.style.setProperty("--delay", String(index));
      }
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter || "all";

      filters.forEach((item) => {
        const active = item === btn;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
      });

      cards.forEach((card) => {
        const type = card.dataset.type;
        const show = filter === "all" || type === filter;
        card.classList.toggle("is-hidden", !show);
      });
    });
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!formStatus) return;

    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const contact = String(data.get("contact") || "").trim();
    const message = String(data.get("message") || "").trim();

    if (!name || !contact || !message) {
      formStatus.textContent = "Пожалуйста, заполните обязательные поля.";
      formStatus.classList.add("is-error");
      return;
    }

    formStatus.classList.remove("is-error");
    formStatus.textContent = "Спасибо! Сообщение принято — мы скоро ответим.";
    form.reset();

    window.setTimeout(() => {
      if (formStatus.textContent.includes("Спасибо")) {
        formStatus.textContent = "";
      }
    }, 5000);
  });
})();
