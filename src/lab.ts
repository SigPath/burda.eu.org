/**
 * CH·02 — SYGNAŁ·LAB
 * Prawdziwa, minimalna sieć neuronowa (1–H–1, tanh) uczona na żywo.
 * Czysta matematyka (MLP, backprop, SGD) mieszka w ml.ts — z testami w tools/.
 */

import { Net, TARGETS, rng } from './ml';

const DATA_N = 64;
const TAU = Math.PI * 2;
const MAX_LOSS_HISTORY = 420;

/* --------------------------- Renderowanie --------------------------- */

const C = {
  bg: '#ECE8DA', ink: '#181610', ink2: 'rgba(24,22,16,0.55)', line: 'rgba(24,22,16,0.14)',
  sig: '#E8490C', blue: '#2E45D8', grid: 'rgba(24,22,16,0.07)',
};

export function initLab(canvas: HTMLCanvasElement): void {
  const ctxOrNull = canvas.getContext('2d');
  if (!ctxOrNull) return;
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 600, H = 400;

  // --- Stan ---
  const rand = rng(20261013);
  let net = new Net(12, rand);
  let lr = 0.03;
  let targetKey = 'sin';
  let noise = false;
  let xs = new Float64Array(DATA_N);
  let ts = new Float64Array(DATA_N);
  let epoch = 0;
  let loss = NaN;
  const lossHistory: number[] = [];
  let training = false;
  let diverged = false;
  let visible = true;
  let stepsThisSecond = 0;
  let lastSpsStamp = performance.now();
  let sps = 0;

  const resampleData = () => {
    const r = rng(Date.now() & 0xffffffff);
    const f = TARGETS[targetKey].f;
    for (let i = 0; i < DATA_N; i++) {
      const x = r() * 2 - 1;
      xs[i] = x;
      ts[i] = f(x) + (noise ? (r() - 0.5) * 0.3 : 0);
    }
  };
  resampleData();

  // --- DOM ---
  const scope = canvas.closest('.lab') ?? document;
  const q = <T extends HTMLElement>(sel: string) => scope.querySelector(sel) as T | null;
  const el = {
    toggle: q<HTMLButtonElement>('#lab-toggle'),
    reset: q<HTMLButtonElement>('#lab-reset'),
    units: q<HTMLInputElement>('#lab-units'),
    unitsOut: q<HTMLOutputElement>('#lab-units-out'),
    lr: q<HTMLSelectElement>('#lab-lr'),
    target: q<HTMLSelectElement>('#lab-target'),
    noise: q<HTMLInputElement>('#lab-noise'),
    epoch: q<HTMLElement>('[data-lab="epoch"]'),
    loss: q<HTMLElement>('[data-lab="loss"]'),
    lrOut: q<HTMLElement>('[data-lab="lr"]'),
    unitsStat: q<HTMLElement>('[data-lab="units"]'),
    sps: q<HTMLElement>('[data-lab="sps"]'),
  };

  const fmtLoss = (v: number) =>
    !isFinite(v) ? '∞' : v < 0.0001 ? v.toExponential(1).replace('.', ',') : v.toFixed(4).replace('.', ',');

  const syncStats = () => {
    if (el.epoch) el.epoch.textContent = String(epoch);
    if (el.loss) el.loss.textContent = Number.isNaN(loss) ? '—' : fmtLoss(loss);
    if (el.lrOut) el.lrOut.textContent = String(lr).replace('.', ',');
    if (el.unitsStat) el.unitsStat.textContent = String(net.nH);
    if (el.sps) el.sps.textContent = String(sps);
  };

  // --- Rozmiar ---
  const resize = () => {
    W = Math.max(320, canvas.clientWidth);
    H = Math.max(240, Math.round(W * 0.625));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    draw();
  };
  new ResizeObserver(resize).observe(canvas);

  // --- Render ---
  const font = (px: number, weight = 500) =>
    `${weight} ${px}px "JetBrains Mono", ui-monospace, monospace`;

  function drawNet(g: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number) {
    const midY = (y0 + y1) / 2;
    const inX = x0 + 34;
    const outX = x1 - 34;
    const hidX = (inX + outX) / 2;
    const span = (y1 - y0) * 0.72;
    const hy = (j: number) => y0 + (y1 - y0) * (net.nH === 1 ? 0.5 : 0.14 + (0.72 * j) / (net.nH - 1));

    // krawędzie: kolor = znak wagi, grubość = |waga|
    const edge = (xa: number, ya: number, xb: number, yb: number, w: number) => {
      const mag = Math.min(3, Math.abs(w) * 1.6);
      g.strokeStyle = w >= 0 ? C.sig : C.blue;
      g.globalAlpha = 0.22 + Math.min(0.62, Math.abs(w) * 0.42);
      g.lineWidth = Math.max(0.6, mag);
      g.beginPath();
      g.moveTo(xa, ya);
      g.lineTo(xb, yb);
      g.stroke();
      g.globalAlpha = 1;
    };
    for (let j = 0; j < net.nH; j++) {
      edge(inX, midY, hidX, hy(j), net.w1[j]);
      edge(hidX, hy(j), outX, midY, net.w2[j]);
    }
    // węzły
    const node = (x: number, y: number, r: number, fill = C.bg) => {
      g.fillStyle = fill;
      g.strokeStyle = C.ink;
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
      g.stroke();
    };
    node(inX, midY, 8);
    for (let j = 0; j < net.nH; j++) {
      const act = Math.tanh(net.w1[j] * 0 + net.b1[j]);
      node(hidX, hy(j), 9, act >= 0 ? '#F6D7C8' : '#D9DDF2');
      g.fillStyle = C.ink2;
      g.font = font(8);
      g.textAlign = 'left';
      g.fillText(net.w2[j] >= 0 ? '+' : '−', hidX + 15, hy(j) + 3);
    }
    node(outX, midY, 8);
    g.fillStyle = C.ink2;
    g.font = font(9);
    g.textAlign = 'left';
    g.fillText('x', inX - 16, midY + 3);
    g.fillText('ŷ', outX + 12, midY + 3);
    void span;
  }

  function drawFit(g: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number) {
    const px = (v: number) => x0 + ((v + 1) / 2) * (x1 - x0);
    const py = (v: number) => y1 - ((v + 1) / 2) * (y1 - y0);

    // ramka + osie
    g.strokeStyle = C.ink;
    g.lineWidth = 1;
    g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = C.grid;
    g.beginPath();
    for (const v of [-0.5, 0, 0.5]) {
      g.moveTo(px(v), y0); g.lineTo(px(v), y1);
      g.moveTo(x0, py(v)); g.lineTo(x1, py(v));
    }
    g.stroke();
    g.fillStyle = C.ink2;
    g.font = font(8.5);
    g.textAlign = 'center';
    g.fillText('−1', px(-1), y1 + 12);
    g.fillText('0', px(0), y1 + 12);
    g.fillText('1', px(1), y1 + 12);
    g.textAlign = 'right';
    g.fillText('+1', x0 - 6, py(1) + 3);
    g.fillText('−1', x0 - 6, py(-1) + 3);

    // funkcja celu (linia przerywana)
    const f = TARGETS[targetKey].f;
    g.strokeStyle = C.ink2;
    g.globalAlpha = 0.5;
    g.setLineDash([4, 4]);
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = -1 + (2 * i) / 120;
      const v = Math.max(-1, Math.min(1, f(x)));
      i ? g.lineTo(px(x), py(v)) : g.moveTo(px(x), py(v));
    }
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;

    // dane treningowe
    g.fillStyle = C.ink;
    for (let i = 0; i < DATA_N; i++) {
      g.globalAlpha = 0.5;
      g.beginPath();
      g.arc(px(xs[i]), Math.max(y0, Math.min(y1, py(ts[i]))), 2.4, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;

    // predykcja modelu
    g.strokeStyle = C.sig;
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 140; i++) {
      const x = -1 + (2 * i) / 140;
      const v = Math.max(-1.05, Math.min(1.05, net.predict(x)));
      i ? g.lineTo(px(x), py(v)) : g.moveTo(px(x), py(v));
    }
    g.stroke();
  }

  function drawLoss(g: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number) {
    g.fillStyle = C.ink2;
    g.font = font(8.5);
    g.textAlign = 'left';
    g.fillText('STRATA · MSE (skala liniowa)', x0, y0 - 5);
    if (lossHistory.length < 2) return;
    const max = Math.max(...lossHistory);
    const n = lossHistory.length;
    g.strokeStyle = C.sig;
    g.lineWidth = 1.4;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const x = x0 + (i / (MAX_LOSS_HISTORY - 1)) * (x1 - x0);
      const y = y1 - Math.min(1, lossHistory[i] / (max || 1)) * (y1 - y0);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    const last = lossHistory[n - 1];
    g.fillStyle = C.sig;
    g.beginPath();
    g.arc(x0 + ((n - 1) / (MAX_LOSS_HISTORY - 1)) * (x1 - x0), y1 - Math.min(1, last / (max || 1)) * (y1 - y0), 2.6, 0, TAU);
    g.fill();
  }

  function draw() {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    const m = 16;
    const splitX = Math.round(W * 0.42);
    const mainH = Math.round(H * 0.70);

    // podziały paneli
    ctx.strokeStyle = C.line;
    ctx.beginPath();
    ctx.moveTo(splitX, m - 6); ctx.lineTo(splitX, mainH - m + 6);
    ctx.moveTo(m - 6, mainH); ctx.lineTo(W - m + 6, mainH);
    ctx.stroke();

    ctx.fillStyle = C.ink2;
    ctx.font = font(8.5);
    ctx.textAlign = 'left';
    ctx.fillText(`SIEĆ 1–${net.nH}–1 · tanh`, m, m - 4);
    ctx.fillText(`DOPASOWANIE · ${TARGETS[targetKey].label}`, splitX + m, m - 4);

    drawNet(ctx, m, splitX - m * 0.5, m + 8, mainH - m - 4);
    drawFit(ctx, splitX + m, W - m, m + 8, mainH - m - 4);
    drawLoss(ctx, m, W - m, mainH + m + 6, H - m - 4);

    if (diverged) {
      ctx.fillStyle = C.sig;
      ctx.font = font(11, 700);
      ctx.textAlign = 'center';
      ctx.fillText('∇ ROZBIEŻNOŚĆ — ZMNIEJSZ LR I ZRÓB RESET WAG', W / 2, mainH / 2);
    }
    ctx.restore();
  }

  // --- Trening ---
  let raf = 0;
  const frame = (now: number) => {
    raf = 0;
    if (!training) return;
    for (let k = 0; k < 2; k++) {
      loss = net.trainStep(xs, ts, lr);
      epoch++;
      stepsThisSecond++;
      if (!isFinite(loss)) {
        diverged = true;
        setTraining(false);
        break;
      }
      lossHistory.push(loss);
      if (lossHistory.length > MAX_LOSS_HISTORY) lossHistory.shift();
    }
    if (now - lastSpsStamp >= 1000) {
      sps = Math.round((stepsThisSecond * 1000) / (now - lastSpsStamp));
      stepsThisSecond = 0;
      lastSpsStamp = now;
    }
    draw();
    syncStats();
    if (training && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const loop = () => { if (!raf && training) raf = requestAnimationFrame(frame); };

  function setTraining(on: boolean) {
    training = on && !diverged;
    if (el.toggle) el.toggle.textContent = training ? 'Wstrzymaj' : diverged ? 'Reset wag' : 'Rozpocznij trening';
    if (!training && raf) { cancelAnimationFrame(raf); raf = 0; }
    if (training) {
      lastSpsStamp = performance.now();
      stepsThisSecond = 0;
      loop();
    }
  }

  // --- Sterowanie ---
  el.toggle?.addEventListener('click', () => {
    if (diverged) return;
    setTraining(!training);
  });
  el.reset?.addEventListener('click', () => {
    net.reset();
    epoch = 0; loss = NaN; diverged = false; lossHistory.length = 0; sps = 0;
    setTraining(false);
    if (el.toggle) el.toggle.textContent = 'Rozpocznij trening';
    draw();
    syncStats();
  });
  el.units?.addEventListener('input', () => {
    const n = Number(el.units?.value ?? 12);
    net = new Net(n, rand);
    epoch = 0; loss = NaN; diverged = false; lossHistory.length = 0;
    if (el.unitsOut) el.unitsOut.textContent = String(n);
    if (!diverged) setTraining(training);
    else setTraining(false);
    draw();
    syncStats();
  });
  el.lr?.addEventListener('change', () => {
    lr = Number(el.lr?.value ?? 0.03);
    syncStats();
  });
  el.target?.addEventListener('change', () => {
    targetKey = el.target?.value ?? 'sin';
    resampleData();
    lossHistory.length = 0;
    draw();
  });
  el.noise?.addEventListener('change', () => {
    noise = el.noise?.checked ?? false;
    resampleData();
    lossHistory.length = 0;
    draw();
  });

  new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    if (visible && training) loop();
  }, { threshold: 0.05 }).observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visible && training) loop();
  });

  resize();
  syncStats();
}
