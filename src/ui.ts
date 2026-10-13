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

/* ---------- E-mail odkrywany klikiem (ochrona przed harvesterami) ---------- */
export function initMail(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-mail]');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const addr = (btn.dataset.mail ?? '').split('').reverse().join('');
    if (!addr) return;

    const link = document.createElement('a');
    link.className = 'ch-val';
    link.href = `mailto:${addr}`;
    link.textContent = addr;

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn btn-sm ch-copy';
    copy.textContent = 'Kopiuj adres';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(addr);
      } catch {
        // fallback dla kontekstów bez Clipboard API
        const ta = document.createElement('textarea');
        ta.value = addr;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      copy.textContent = 'Skopiowano ✓';
      window.setTimeout(() => { copy.textContent = 'Kopiuj adres'; }, 1800);
    });

    const wrap = document.createElement('span');
    wrap.style.display = 'contents';
    wrap.append(link, copy);
    btn.replaceWith(wrap);
    link.focus();
  }, { once: true });
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
