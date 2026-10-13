/**
 * Interfejs przyrządu: kursor-probnik, zegar bezela, rok w stopce,
 * oraz wjazdy sekcji (IntersectionObserver + kaskadowe opóźnienia).
 */

/* ---------- Kursor-probnik ---------- */
export function initProbe(): void {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  const root = document.querySelector('.probe');
  const tag = root?.querySelector<HTMLElement>('.probe-tag');
  if (!root || !tag) return;

  const pad = (n: number) => String(Math.max(0, Math.round(n))).padStart(4, '0');
  let live = false;

  document.addEventListener('pointermove', (e) => {
    const { clientX: x, clientY: y } = e;
    if (!live) {
      live = true;
      root.classList.add('is-live');
    }
    const hx = root.querySelector<HTMLElement>('.probe-x');
    const hy = root.querySelector<HTMLElement>('.probe-y');
    if (hx) hx.style.transform = `translateY(${y}px)`;
    if (hy) hy.style.transform = `translateX(${x}px)`;
    tag.style.transform = `translate(${x + 14}px, ${y + 16}px)`;
    tag.textContent = `x:${pad(x)} y:${pad(y)}`;
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => {
    live = false;
    root.classList.remove('is-live');
  });
}

/* ---------- Zegar bezela + rok ---------- */
export function initClock(): void {
  const clocks = document.querySelectorAll<HTMLElement>('[data-clock]');
  const tick = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    for (const c of clocks) c.textContent = `${hh}:${mm}:${ss}`;
  };
  if (clocks.length) {
    tick();
    setInterval(tick, 1000);
  }
  const year = String(new Date().getFullYear());
  for (const el of document.querySelectorAll<HTMLElement>('[data-year]')) el.textContent = year;
}

/* ---------- Wjazdy sekcji ---------- */
export function initReveal(): void {
  const items = Array.from(document.querySelectorAll<HTMLElement>('.rv'));
  if (!items.length) return;

  // Kaskada: elementy w obrębie tego samego rodzica wchodzą po kolei
  const groups = new Map<Element, number>();
  for (const el of items) {
    const parent = el.closest('main, .foot, .bezel') ?? document.body;
    const idx = groups.get(parent) ?? 0;
    groups.set(parent, idx + 1);
    el.style.setProperty('--rv-delay', `${Math.min(idx * 55, 330)}ms`);
  }

  if (!('IntersectionObserver' in window)) {
    for (const el of items) el.classList.add('in');
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        (entry.target as HTMLElement).classList.add('in');
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
  for (const el of items) io.observe(el);
}
