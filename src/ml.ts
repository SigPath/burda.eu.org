/**
 * Czysty rdzeń ML dla SYGNAŁ·LAB — bez DOM, testowalny w Node.
 * MLP 1–H–1 (tanh), strata MSE, pełna wsteczna propagacja, SGD pełną partią.
 */

export type TargetFn = (x: number) => number;

export const TARGETS: Record<string, { label: string; f: TargetFn }> = {
  sin: { label: 'sin(πx)·0,85', f: (x) => Math.sin(Math.PI * x) * 0.85 },
  square: { label: 'skok ±0,75', f: (x) => (Math.sin(Math.PI * x) >= 0 ? 0.75 : -0.75) },
  abs: { label: '|x| − 0,5', f: (x) => Math.abs(x) - 0.5 },
};

/** Deterministyczny RNG (mulberry32) — powtarzalny reset danych. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Net {
  nH: number;
  w1!: Float64Array; b1!: Float64Array;
  w2!: Float64Array; b2!: number;
  private r: () => number;

  constructor(nH: number, r: () => number) {
    this.nH = nH;
    this.r = r;
    this.reset();
  }

  reset(): void {
    const { nH, r } = this;
    this.w1 = new Float64Array(nH);
    this.b1 = new Float64Array(nH);
    this.w2 = new Float64Array(nH);
    for (let j = 0; j < nH; j++) {
      this.w1[j] = (r() * 2 - 1) * 1.6;
      this.b1[j] = (r() * 2 - 1) * 0.8;
      this.w2[j] = (r() * 2 - 1) / Math.sqrt(nH);
    }
    this.b2 = 0;
  }

  /** Zwraca stratę MSE i wykonuje jeden krok SGD pełną partią. */
  trainStep(xs: Float64Array, ts: Float64Array, lr: number): number {
    const { nH, w1, b1, w2, b2 } = this;
    const dw1 = new Float64Array(nH);
    const db1 = new Float64Array(nH);
    const dw2 = new Float64Array(nH);
    let db2 = 0;
    let loss = 0;
    const n = xs.length;

    for (let i = 0; i < n; i++) {
      const x = xs[i];
      // forward
      let y = b2;
      for (let j = 0; j < nH; j++) y += w2[j] * Math.tanh(w1[j] * x + b1[j]);
      const e = y - ts[i];
      loss += e * e;
      // backward
      const dy = (2 * e) / n;
      db2 += dy;
      for (let j = 0; j < nH; j++) {
        const h = Math.tanh(w1[j] * x + b1[j]);
        const dh = dy * w2[j] * (1 - h * h);
        dw2[j] += dy * h;
        dw1[j] += dh * x;
        db1[j] += dh;
      }
    }
    // update
    for (let j = 0; j < nH; j++) {
      this.w1[j] -= lr * dw1[j];
      this.b1[j] -= lr * db1[j];
      this.w2[j] -= lr * dw2[j];
    }
    this.b2 -= lr * db2;
    return loss / n;
  }

  predict(x: number): number {
    let y = this.b2;
    for (let j = 0; j < this.nH; j++) y += this.w2[j] * Math.tanh(this.w1[j] * x + this.b1[j]);
    return y;
  }
}
