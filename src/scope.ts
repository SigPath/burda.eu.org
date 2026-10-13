/**
 * CH·01 — HERO.SCOPE
 * Oscyloskop w hero: WebGL1 (fragment shader) z pełnym fallbackiem Canvas2D.
 * Renderuje tylko, gdy sekcja jest w viewporcie i karta jest aktywna.
 */

const TAU = Math.PI * 2;

/** Wspólny sygnał — ta sama funkcja w GLSL i w fallbacku 2D. */
function traceJS(x: number, t: number, freq: number, speed: number, phase: number): number {
  const w1 = Math.sin(TAU * (x * freq + t * speed) + phase);
  const w2 = Math.sin(TAU * (x * freq * 0.53 - t * speed * 0.71) + phase * 1.7);
  const w3 = Math.sin(TAU * (x * freq * 2.17 + t * speed * 1.33)) * 0.35;
  return w1 * 0.55 + w2 * 0.45 + w3;
}

interface Hud {
  amp?: HTMLElement | null;
  t?: HTMLElement | null;
  fps?: HTMLElement | null;
}

export function initScope(canvas: HTMLCanvasElement): void {
  const hud: Hud = {
    amp: canvas.closest('.scope')?.querySelector('[data-readout="amp"]'),
    t: canvas.closest('.scope')?.querySelector('[data-readout="t"]'),
    fps: canvas.closest('.scope')?.querySelector('[data-readout="fps"]'),
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Stan wejścia (wspólny dla obu rendererów)
  const mouse = { x: 0.62, y: 0.5, inside: false };
  let energy = 0.25;

  // --- Renderer ---
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  const renderer = gl ? createGL(canvas, gl, dpr) : create2D(canvas, dpr);
  if (!renderer) return;

  // --- Rozmiar ---
  const scopeEl = canvas.parentElement ?? canvas;
  const resize = () => {
    const w = Math.max(1, Math.round(scopeEl.clientWidth * dpr));
    const h = Math.max(1, Math.round(scopeEl.clientHeight * dpr));
    renderer.resize(w, h);
  };
  new ResizeObserver(resize).observe(scopeEl);
  resize();

  // --- Wskaźnik ---
  scopeEl.addEventListener('pointermove', (e) => {
    const r = scopeEl.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width;
    mouse.y = 1 - (e.clientY - r.top) / r.height;
    mouse.inside = true;
  }, { passive: true });
  scopeEl.addEventListener('pointerleave', () => { mouse.inside = false; }, { passive: true });

  // --- Pętla ---
  let raf = 0;
  let visible = true;
  let t0 = performance.now();
  let lastHud = 0;
  let frames = 0;
  let fpsWindow = performance.now();

  const frame = (now: number) => {
    raf = 0;
    const t = (now - t0) / 1000;
    // Energia: rośnie, gdy kursor jest nad przyrządem; wygasa bez niego
    energy += ((mouse.inside ? 1 : 0.25) - energy) * 0.06;

    renderer.draw(t, mouse, energy);

    frames++;
    if (now - fpsWindow > 500) {
      if (hud.fps) hud.fps.textContent = `${Math.round(frames * 1000 / (now - fpsWindow))} FPS`;
      if (hud.t) hud.t.textContent = `t ${t.toFixed(1)} s`;
      const amp = 0.15 * (1 + energy * 1.1);
      if (hud.amp) hud.amp.textContent = `A ${amp.toFixed(2)}`;
      frames = 0;
      fpsWindow = now;
    }
    if (visible && !document.hidden && !reduced.matches) {
      raf = requestAnimationFrame(frame);
    }
  };

  const start = () => { if (!raf) { t0 = performance.now() - lastHud; raf = requestAnimationFrame(frame); } };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  const trackTime = () => { lastHud = 0; };

  new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    if (visible && !reduced.matches) start(); else stop();
  }, { threshold: 0.02 }).observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else if (visible && !reduced.matches) start();
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) { stop(); renderer.draw(0, { x: 0.62, y: 0.5, inside: false }, 0.25); }
    else start();
  });

  if (reduced.matches) {
    renderer.draw(0, mouse, 0.25);
  } else {
    reduced.addEventListener('change', trackTime);
    start();
  }
}

interface ScopeRenderer {
  resize(w: number, h: number): void;
  draw(t: number, mouse: { x: number; y: number; inside: boolean }, energy: number): void;
}

/* ---------------- WebGL ---------------- */

const VERT = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_energy;

float trace(float x, float t, float freq, float speed, float phase){
  float w1 = sin(6.2831853 * (x * freq + t * speed) + phase);
  float w2 = sin(6.2831853 * (x * freq * 0.53 - t * speed * 0.71) + phase * 1.7);
  float w3 = sin(6.2831853 * (x * freq * 2.17 + t * speed * 1.33)) * 0.35;
  return w1 * 0.55 + w2 * 0.45 + w3;
}

float lineMask(float y, float c, float lw){
  return 1.0 - smoothstep(lw * 0.5, lw * 1.6, abs(y - c));
}

void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / u_res;
  vec3 col = vec3(0.925, 0.910, 0.855);           /* papier przyrządu */
  vec3 ink = vec3(0.094, 0.086, 0.063);
  vec3 sig = vec3(0.910, 0.286, 0.047);
  vec3 blu = vec3(0.180, 0.271, 0.847);

  /* siatka pomiarowa */
  vec2 g = mod(px, 44.0);
  float grid = (g.x < 1.0 ? 1.0 : 0.0) + (g.y < 1.0 ? 1.0 : 0.0);
  col = mix(col, ink, clamp(grid, 0.0, 1.0) * 0.05);
  float axis = 1.0 - smoothstep(0.0, 1.4, abs(px.y - u_res.y * 0.5));
  col = mix(col, ink, axis * 0.07);

  /* amplituda lokalna — kursor jak sonda */
  float dx = uv.x - u_mouse.x;
  float bump = exp(-dx * dx / 0.016);
  float amp = 0.15 * (1.0 + u_energy * 1.1 * bump);
  float shift = (u_mouse.y - 0.5) * 0.15 * bump;

  float y0 = 0.5 + trace(uv.x, u_time, 2.35, 0.55, 0.0) * amp + shift * 0.9;
  float y1 = 0.5 + trace(uv.x, u_time, 3.60, 0.80, 2.1) * amp * 0.70 + shift * 0.4;
  float y2 = 0.5 + trace(uv.x, u_time, 1.45, 0.38, 4.2) * amp * 1.30 + shift * 1.15;

  float lw = 1.7 / u_res.y;
  col = mix(col, blu, lineMask(uv.y, y2, lw) * 0.5);
  col = mix(col, ink, lineMask(uv.y, y1, lw) * 0.8);
  col = mix(col, sig, lineMask(uv.y, y0, lw));

  /* bramka pomiarowa pod kursorem */
  float gx = u_mouse.x * u_res.x;
  float gate = 1.0 - smoothstep(0.0, 1.4, abs(px.x - gx));
  col = mix(col, sig, gate * 0.13 * u_energy);

  /* punkty pomiarowe na przebiegach */
  float gy0 = y0 * u_res.y;
  float gy1 = y1 * u_res.y;
  float gy2 = y2 * u_res.y;
  float dm = 0.0;
  dm = max(dm, (1.0 - smoothstep(2.2, 5.0, length(px - vec2(gx, gy0)))) * u_energy);
  dm = max(dm, (1.0 - smoothstep(2.2, 5.0, length(px - vec2(gx, gy1)))) * u_energy * 0.8);
  dm = max(dm, (1.0 - smoothstep(2.2, 5.0, length(px - vec2(gx, gy2)))) * u_energy * 0.6);
  col = mix(col, sig, dm);

  gl_FragColor = vec4(col, 1.0);
}
`;

function createGL(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, dpr: number): ScopeRenderer | null {
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('SIG·LAB scope shader:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('SIG·LAB scope link:', gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');
  const uEnergy = gl.getUniformLocation(prog, 'u_energy');

  return {
    resize(w: number, h: number) {
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      void dpr;
    },
    draw(t, mouse, energy) {
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uEnergy, energy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

/* ---------------- Canvas2D fallback ---------------- */

function create2D(canvas: HTMLCanvasElement, dpr: number): ScopeRenderer | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  let W = 1, H = 1;
  const SIG = '#E8490C', INK = '#181610', BLU = '#2E45D8';

  return {
    resize(w, h) { W = w; H = h; canvas.width = w; canvas.height = h; },
    draw(t, mouse, energy) {
      ctx.fillStyle = '#ECE8DA';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(24,22,16,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < W; x += 44) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0; y < H; y += 44) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(24,22,16,0.08)';
      ctx.beginPath();
      ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
      ctx.stroke();

      const dx = mouse.x - 0; // uv x kursora
      const bump = (x: number) => Math.exp(-((x - mouse.x) ** 2) / 0.016);
      const traces: Array<{ f: number; s: number; p: number; m: number; sh: number; c: string; a: number }> = [
        { f: 1.45, s: 0.38, p: 4.2, m: 1.30, sh: 1.15, c: BLU, a: 0.5 },
        { f: 3.60, s: 0.80, p: 2.1, m: 0.70, sh: 0.40, c: INK, a: 0.8 },
        { f: 2.35, s: 0.55, p: 0.0, m: 1.00, sh: 0.90, c: SIG, a: 1.0 },
      ];
      const gx = mouse.x * W;
      for (const tr of traces) {
        ctx.strokeStyle = tr.c;
        ctx.globalAlpha = tr.a;
        ctx.lineWidth = Math.max(1.2, 1.7 * dpr * 0.8);
        ctx.beginPath();
        const pts: Array<[number, number]> = [];
        for (let px = 0; px <= W; px += Math.max(2, Math.round(3 * dpr))) {
          const uvx = px / W;
          const amp = 0.15 * (1 + energy * 1.1 * bump(uvx));
          const shift = (mouse.y - 0.5) * 0.15 * bump(uvx) * tr.sh;
          const w = traceJS(uvx, t, tr.f, tr.s, tr.p) * amp * tr.m + shift;
          pts.push([px, H / 2 + w * H]);
        }
        pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.stroke();
        // punkt pomiarowy na bramce
        const uvAtGate = mouse.x;
        const ampG = 0.15 * (1 + energy * 1.1 * bump(uvAtGate));
        const yG = H / 2 + (traceJS(uvAtGate, t, tr.f, tr.s, tr.p) * ampG * tr.m + (mouse.y - 0.5) * 0.15 * bump(uvAtGate) * tr.sh) * H;
        ctx.fillStyle = tr.c;
        ctx.beginPath();
        ctx.arc(gx, yG, 2.6 * dpr, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 0.13 * energy;
      ctx.strokeStyle = SIG;
      ctx.lineWidth = Math.max(1, dpr);
      ctx.beginPath();
      ctx.moveTo(gx, 0); ctx.lineTo(gx, H);
      ctx.stroke();
      ctx.globalAlpha = 1;
      void dx;
    },
  };
}
