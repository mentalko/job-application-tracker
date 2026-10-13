// The landing page's motion and small interactions. Everything works without it: content is
// in the HTML, and with prefers-reduced-motion the page stays still.

const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T & Element>(sel)) as T[];

// Run `fn` once when `el` first scrolls into view.
function onView(el: Element, fn: () => void, threshold = 0.2) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          fn();
          io.disconnect();
        }
      }
    },
    { threshold },
  );
  io.observe(el);
}

// Fade and lift sections in as they arrive.
const revealer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealer.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
);
$$(".reveal").forEach((el) => revealer.observe(el));

// The nav gains a glass background once you scroll.
const nav = document.querySelector(".nav");
const onScroll = () => nav?.classList.toggle("scrolled", scrollY > 12);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// A light that follows the pointer over cards.
if (fine) {
  $$(".spotlight").forEach((el) => {
    el.addEventListener("pointermove", (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--x", `${ev.clientX - r.left}px`);
      el.style.setProperty("--y", `${ev.clientY - r.top}px`);
    });
  });
}

// Buttons that lean towards the pointer.
if (fine && !still) {
  $$("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (ev.clientX - r.left - r.width / 2) * 0.25;
      const y = (ev.clientY - r.top - r.height / 2) * 0.35;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });
}

// The hero screenshot tilts a little with the pointer.
if (fine && !still) {
  $$("[data-tilt]").forEach((el) => {
    const inner = el.firstElementChild as HTMLElement | null;
    if (!inner) return;
    addEventListener(
      "pointermove",
      (ev) => {
        const x = ev.clientX / innerWidth - 0.5;
        const y = ev.clientY / innerHeight - 0.5;
        inner.style.setProperty("--rx", `${-y * 5}deg`);
        inner.style.setProperty("--ry", `${x * 7}deg`);
      },
      { passive: true },
    );
  });
}

// Numbers that count up when they arrive.
$$("[data-count]").forEach((el) => {
  const to = Number(el.dataset.count);
  const suffix = el.dataset.suffix ?? "";
  if (still || to === 0) {
    el.textContent = `${to}${suffix}`;
    return;
  }
  el.textContent = `0${suffix}`;
  onView(el, () => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1400);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = `${Math.round(to * eased)}${suffix}`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
});

// "Track every application / recruiter / …": the word changes every couple of seconds.
$$("[data-rotate]").forEach((el) => {
  const words = $$("span", el);
  if (still || words.length < 2) return;
  // One full cycle, back to the first word, then it stops; hovering pauses it.
  let i = 0;
  let steps = 0;
  let paused = false;
  el.closest("p")?.addEventListener("pointerenter", () => (paused = true));
  el.closest("p")?.addEventListener("pointerleave", () => (paused = false));
  const timer = setInterval(() => {
    if (paused) return;
    words[i].classList.remove("on");
    words[i].classList.add("off");
    const prev = words[i];
    setTimeout(() => prev.classList.remove("off"), 600);
    i = (i + 1) % words.length;
    words[i].classList.add("on");
    if (++steps >= words.length) clearInterval(timer);
  }, 2200);
});

// Copy buttons.
$$<HTMLButtonElement>("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy ?? "");
      btn.classList.add("copied");
      const announce = document.getElementById("announce");
      if (announce) announce.textContent = "Copied to the clipboard";
      setTimeout(() => {
        btn.classList.remove("copied");
        if (announce) announce.textContent = "";
      }, 1600);
    } catch {
      // No clipboard (an insecure context or a refusal): the text is still there to select.
    }
  });
});

// Terminals that type their commands out the first time you see them.
function typeOut(term: HTMLElement) {
  const lines = $$(".line", term);
  if (still || term.dataset.typed) return;
  term.dataset.typed = "1";
  const texts = lines.map((l) => l.querySelector(".cmd")?.textContent ?? "");
  lines.forEach((l) => {
    l.classList.add("pending");
    const cmd = l.querySelector(".cmd");
    if (cmd) cmd.textContent = "";
  });
  let li = 0;
  const next = () => {
    if (li >= lines.length) return;
    const line = lines[li];
    const cmd = line.querySelector(".cmd");
    const text = texts[li];
    line.classList.remove("pending");
    line.classList.add("typing");
    if (!cmd || line.classList.contains("out")) {
      line.classList.remove("typing");
      li++;
      setTimeout(next, 120);
      return;
    }
    let ci = 0;
    const step = () => {
      ci += Math.max(1, Math.round(text.length / 40));
      cmd.textContent = text.slice(0, ci);
      if (ci < text.length) setTimeout(step, 18);
      else {
        line.classList.remove("typing");
        li++;
        setTimeout(next, 260);
      }
    };
    step();
  };
  next();
}
$$("[data-type]").forEach((term) => {
  if (term.closest("[hidden]")) return;
  onView(term, () => typeOut(term), 0.4);
});

// Tabs (the quick start terminal).
$$("[data-tabs]").forEach((root) => {
  const tabs = $$<HTMLButtonElement>('[role="tab"]', root);
  const panels = $$('[role="tabpanel"]', root);
  const select = (i: number, focus = false) => {
    tabs.forEach((t, k) => {
      t.setAttribute("aria-selected", String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    panels.forEach((p, k) => {
      const was = p.hidden;
      p.hidden = k !== i;
      if (was && !p.hidden && p.matches("[data-type]")) typeOut(p);
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(i));
    t.addEventListener("keydown", (ev) => {
      const d = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : 0;
      if (d) select((i + d + tabs.length) % tabs.length, true);
      else if (ev.key === "Home") select(0, true);
      else if (ev.key === "End") select(tabs.length - 1, true);
      else return;
      ev.preventDefault();
    });
  });
});

// The manifesto lights up word by word as it scrolls through the middle of the screen.
$$("[data-words]").forEach((el) => {
  const words = $$(".w", el);
  if (still) {
    words.forEach((w) => w.classList.add("lit"));
    return;
  }
  let raf = 0;
  const update = () => {
    raf = 0;
    const line = innerHeight * 0.62;
    for (const w of words) w.classList.toggle("lit", w.getBoundingClientRect().top < line);
  };
  addEventListener("scroll", () => (raf ||= requestAnimationFrame(update)), { passive: true });
  update();
});

// The sticky showcase: the picture follows whichever step is in the middle of the screen.
$$("[data-showcase]").forEach((root) => {
  const steps = $$("[data-step]", root);
  const pics = $$("[data-pic]", root);
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const i = (e.target as HTMLElement).dataset.step;
        steps.forEach((s) => s.classList.toggle("active", s.dataset.step === i));
        pics.forEach((p) => p.classList.toggle("active", p.dataset.pic === i));
      }
    },
    { rootMargin: "-45% 0px -45% 0px" },
  );
  steps.forEach((s) => io.observe(s));
});
