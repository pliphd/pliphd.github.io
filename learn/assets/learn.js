/* LSDH Learning — shared engine
   Plotting, controls, signal generators, entropy measures (SampEn, FuzzyEn, DistEn),
   spectral analysis and small stats helpers. No dependencies (KaTeX optional). */
(function (global) {
  'use strict';
  const L = {};

  /* ------------------------------------------------------------------ *
   * Site structure
   * ------------------------------------------------------------------ */
  L.MODULES = [
    { file: 'index.html', short: 'Home' },
    { file: '01-signals.html', n: 1, short: 'Signals', title: 'What is a signal?' },
    { file: '02-chaos-entropy.html', n: 2, short: 'Chaos & entropy', title: 'Beyond Fourier: chaos, and what entropy means' },
    { file: '03-mean-sd-entropy.html', n: 3, short: 'Mean & SD', title: 'From mean & SD to entropy' },
    { file: '04-sampen-fuzzyen.html', n: 4, short: 'SampEn / FuzzyEn', title: 'Sample entropy and fuzzy entropy' },
    { file: '05-ksampen-distEn.html', n: 5, short: 'kSampEn & DistEn', title: 'Kernel sample entropy and distribution entropy' },
    { file: '06-ecg-ppg.html', n: 6, short: 'ECG & PPG', title: 'From ECG and PPG to heartbeat series' },
  ];

  L.chrome = function () {
    const here = (location.pathname.split('/').pop() || 'index.html');
    const bar = document.createElement('header');
    bar.className = 'topbar';
    bar.innerHTML =
      '<div class="topbar-inner"><a class="brand" href="index.html">LSDH <span>Learning</span> · Signals, Time Series &amp; Entropy</a>' +
      '<nav class="modnav">' +
      L.MODULES.map(m => `<a href="${m.file}" class="${m.file === here ? 'on' : ''}">${m.n ? m.n + ' · ' : ''}${m.short}</a>`).join('') +
      '</nav></div>';
    document.body.prepend(bar);
    const i = L.MODULES.findIndex(m => m.file === here);
    const main = document.querySelector('main');
    if (main && i > 0) {
      const prev = L.MODULES[i - 1], next = L.MODULES[i + 1];
      const pg = document.createElement('div');
      pg.className = 'pager';
      pg.innerHTML =
        `<a href="${prev.file}"><small>Previous</small>← ${prev.title || 'All modules'}</a>` +
        (next ? `<a href="${next.file}" style="text-align:right"><small>Next</small>${next.title} →</a>` : '<span></span>');
      main.appendChild(pg);
    }
    if (main) {
      const f = document.createElement('footer');
      f.className = 'foot';
      f.innerHTML = '<a href="../">← Back to the lab website</a> · Laboratory for Sleep and Digital Health (LSDH), Massachusetts General Hospital · Internal teaching material. ' +
        'All example signals on these pages are generated in your browser; none are patient data.';
      main.appendChild(f);
    }
  };

  L.math = function (root) {
    if (!global.renderMathInElement) return;
    global.renderMathInElement(root || document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
    });
  };

  /* ------------------------------------------------------------------ *
   * Random numbers (seeded so figures are reproducible)
   * ------------------------------------------------------------------ */
  L.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const u = () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let spare = null;
    const n = () => {
      if (spare !== null) { const s = spare; spare = null; return s; }
      let x, y, s;
      do { x = 2 * u() - 1; y = 2 * u() - 1; s = x * x + y * y; } while (s === 0 || s >= 1);
      const k = Math.sqrt(-2 * Math.log(s) / s);
      spare = y * k; return x * k;
    };
    return { u, n };
  };

  /* ------------------------------------------------------------------ *
   * Basic statistics
   * ------------------------------------------------------------------ */
  L.mean = x => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i]; return s / x.length; };
  L.sd = x => {
    const m = L.mean(x); let s = 0;
    for (let i = 0; i < x.length; i++) s += (x[i] - m) ** 2;
    return Math.sqrt(s / (x.length - 1));
  };
  L.rmssd = x => { let s = 0; for (let i = 1; i < x.length; i++) s += (x[i] - x[i - 1]) ** 2; return Math.sqrt(s / (x.length - 1)); };
  L.zscore = x => { const m = L.mean(x), s = L.sd(x) || 1; return x.map(v => (v - m) / s); };
  L.minmax = x => { let lo = Infinity, hi = -Infinity; for (const v of x) { if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi]; };

  /* ------------------------------------------------------------------ *
   * Entropy measures
   * ------------------------------------------------------------------ */
  /* Conventions follow the lab's own implementation:
     min-max normalisation, tau = 1, Chebyshev distances between all i < j state
     vectors, r = r0 x SD, SampEn/FuzzyEn counts at m and m+1 each divided by their
     own number of pairs, DistEn on fixed bins over [0, 1], kernel SampEn as in
     Yan et al., Physiol Meas 2026. Every function takes r in the units of x;
     because r is set relative to the SD, results equal those on min-max data. */
  L.EPS = 2.220446049250313e-16;                       // MATLAB eps
  L.mmNorm = x => { const [lo, hi] = L.minmax(x), w = (hi - lo) || 1; return x.map(v => (v - lo) / w); };

  // Chebyshev (max-norm) distance between the state vectors starting at i and j, length m
  L.cheb = (x, i, j, m) => { let d = 0; for (let k = 0; k < m; k++) { const a = Math.abs(x[i + k] - x[j + k]); if (a > d) d = a; } return d; };

  // Sample entropy: N-m+1 vectors of length m and N-m vectors of length m+1;
  // B and A count the pairs within r (d <= r) and each is divided by its own number of pairs.
  L.sampEn = function (x, m, r) {
    const N = x.length, n1 = N - m + 1, n2 = N - m;
    let B = 0, A = 0;
    for (let i = 0; i < n1 - 1; i++) {
      for (let j = i + 1; j < n1; j++) {
        let ok = true;
        for (let k = 0; k < m; k++) { if (Math.abs(x[i + k] - x[j + k]) > r) { ok = false; break; } }
        if (!ok) continue;
        B++;
        if (j < n2 && Math.abs(x[i + m] - x[j + m]) <= r) A++;
      }
    }
    const pairsM = n1 * (n1 - 1) / 2, pairsM1 = n2 * (n2 - 1) / 2, pm = B / pairsM, pm1 = A / pairsM1;
    return { value: (A > 0 && B > 0) ? -Math.log(pm1 / pm) : NaN, A, B, pairsM, pairsM1, pm, pm1 };
  };

  // Fuzzy entropy: membership mu(d) = exp(-ln2 (d/r)^n), so mu(r) = 1/2; the lab uses n = 2.
  // baseline = true subtracts each template's mean (Chen et al. 2007); the lab's implementation does not.
  L.fuzzyEn = function (x, m, r, n, baseline) {
    n = n || 2;
    const phi = len => {
      const nT = x.length - len + 1, T = new Array(nT);
      for (let i = 0; i < nT; i++) {
        const t = new Float64Array(len); let mu = 0;
        for (let k = 0; k < len; k++) { t[k] = x[i + k]; mu += t[k]; }
        if (baseline) { mu /= len; for (let k = 0; k < len; k++) t[k] -= mu; }
        T[i] = t;
      }
      let s = 0;
      for (let i = 0; i < nT - 1; i++) {
        const a = T[i];
        for (let j = i + 1; j < nT; j++) {
          const b = T[j]; let d = 0;
          for (let k = 0; k < len; k++) { const v = Math.abs(a[k] - b[k]); if (v > d) d = v; }
          s += Math.exp(-Math.LN2 * Math.pow(d / r, n));
        }
      }
      return s / (nT * (nT - 1) / 2);
    };
    const pm = phi(m), pm1 = phi(m + 1);
    return { value: -Math.log(pm1 / pm), pm, pm1 };
  };

  // All pairwise Chebyshev distances between the N-m+1 state vectors (i < j)
  L.distances = function (x, m) {
    const nV = x.length - m + 1, out = new Float64Array(nV * (nV - 1) / 2);
    let c = 0;
    for (let i = 0; i < nV - 1; i++) for (let j = i + 1; j < nV; j++) out[c++] = L.cheb(x, i, j, m);
    return out;
  };

  // Histogram with B equal bins on [lo, hi] (default: data range); [e_k, e_k+1), last bin closed
  L.histogram = function (v, B, lo, hi) {
    if (lo === undefined) { [lo, hi] = L.minmax(v); }
    const w = (hi - lo) || 1, step = w / B, e = new Float64Array(B + 1), h = new Float64Array(B);
    for (let k = 0; k <= B; k++) e[k] = lo + k * step; e[B] = hi;
    for (let i = 0; i < v.length; i++) {
      const x = v[i]; if (x < lo || x > hi) continue;
      let b = Math.min(B - 1, Math.max(0, Math.floor((x - lo) / step)));
      while (b > 0 && x < e[b]) b--;
      while (b < B - 1 && x >= e[b + 1]) b++;
      h[b]++;
    }
    return { counts: h, lo, hi, width: step };
  };

  // Shannon entropy of a probability vector; base 2 by default; zeros ignored
  L.shannon = function (p, base) {
    const lb = Math.log(base || 2); let H = 0;
    for (const q of p) if (q > 0) H -= q * Math.log(q) / lb;
    return H;
  };

  // Distribution entropy: min-max normalise, Chebyshev distances between the
  // N-m+1 state vectors, B bins on the fixed range [0, 1], -sum p log2(p + eps) / log2(B).
  // Lab defaults: m = 3, B = 256.
  L.distEn = function (x, m, B) {
    const ts = L.mmNorm(x), d = L.distances(ts, m), h = L.histogram(d, B, 0, 1);
    const p = Array.from(h.counts, c => c / d.length);
    let H = 0; for (const q of p) H -= q * Math.log2(q + L.EPS);
    return { value: H / Math.log2(B), p, hist: h, d };
  };

  // Complementary error function to ~1e-15 
  L.erfc = function (x) {
    const z = Math.abs(x); let out;
    if (z >= 6) return x >= 0 ? 0 : 2;
    if (z < 2) {
      let term = z, acc = z; const z2 = 2 * z * z;
      for (let n = 1; n < 30; n++) { term = term * z2 / (2 * n + 1); acc += term; }
      out = 1 - 2 / Math.sqrt(Math.PI) * Math.exp(-z * z) * acc;
    } else {
      const depth = z < 3 ? 60 : z < 4 ? 30 : 20; let f = z;
      for (let k = depth; k > 0; k--) f = z + (k / 2) / f;
      out = Math.exp(-z * z) / Math.sqrt(Math.PI) / f;
    }
    return x >= 0 ? out : 2 - out;
  };
  L.normCdf = z => 0.5 * L.erfc(-z / Math.SQRT2);
  const median = a => { const s = Float64Array.from(a).sort(), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

  // Kernel sample entropy (Yan et al., Physiol Meas 2026): the same N-m template
  // pairs at m and m+1, reflected Gaussian-kernel CDF of the Chebyshev distances at r, one bandwidth
  // h = MAD/0.6745 * (4/(3n))^(1/5) from the m-dimensional distances. Never negative; finite even if A = 0.
  L.kSampEn = function (x, m, r) {
    const nT = x.length - m; if (nT < 2) return { value: NaN };
    const P = nT * (nT - 1) / 2, dm = new Float64Array(P), dm1 = new Float64Array(P); let c = 0;
    for (let i = 0; i < nT - 1; i++) for (let j = i + 1; j < nT; j++) {
      let d = 0; for (let k = 0; k < m; k++) { const a = Math.abs(x[i + k] - x[j + k]); if (a > d) d = a; }
      dm[c] = d; dm1[c] = Math.max(d, Math.abs(x[i + m] - x[j + m])); c++;
    }
    const med = median(dm); let sig = median(dm.map(v => Math.abs(v - med))) / 0.6745;
    if (!(sig > 0)) { const mu = L.mean(dm); sig = Math.sqrt(dm.reduce((a, v) => a + (v - mu) ** 2, 0) / P); }
    const h = sig > 0 ? sig * Math.pow(4 / (3 * P), 0.2) : NaN;
    if (!(h > 0)) return { value: NaN, h };
    const psi = d => { let s = 0; for (let k = 0; k < d.length; k++) s += L.normCdf((r - d[k]) / h) + L.normCdf((r + d[k]) / h) - 1; return s / d.length; };
    const cm = psi(dm), ca = psi(dm1);
    return { value: (cm > 0 && ca > 0) ? Math.max(0, -Math.log(ca / cm)) : NaN, cm, ca, h, dm, dm1 };
  };

  /* ------------------------------------------------------------------ *
   * Spectral analysis
   * ------------------------------------------------------------------ */
  L.fft = function (re, im) { // in-place radix-2
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ar = re[i + k], ai = im[i + k];
          const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
          const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ar + br; im[i + k] = ai + bi;
          re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  };

  // Welch PSD of an evenly sampled series; returns one-sided density (units^2/Hz)
  L.welch = function (x, fs, seg) {
    const n = x.length; seg = Math.min(seg, 1 << Math.floor(Math.log2(n)));
    const step = seg / 2, win = new Float64Array(seg);
    let U = 0;
    for (let i = 0; i < seg; i++) { win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (seg - 1)); U += win[i] ** 2; }
    const psd = new Float64Array(seg / 2 + 1); let K = 0;
    for (let s = 0; s + seg <= n; s += step) {
      let mu = 0; for (let i = 0; i < seg; i++) mu += x[s + i]; mu /= seg;
      const re = new Float64Array(seg), im = new Float64Array(seg);
      for (let i = 0; i < seg; i++) re[i] = (x[s + i] - mu) * win[i];
      L.fft(re, im);
      for (let k = 0; k <= seg / 2; k++) {
        let v = (re[k] ** 2 + im[k] ** 2) / (fs * U);
        if (k > 0 && k < seg / 2) v *= 2;
        psd[k] += v;
      }
      K++;
    }
    const f = new Float64Array(seg / 2 + 1);
    for (let k = 0; k <= seg / 2; k++) { psd[k] /= K; f[k] = k * fs / seg; }
    return { f, psd, df: fs / seg };
  };
  L.bandPower = (spec, lo, hi) => { let s = 0; for (let k = 0; k < spec.f.length; k++) if (spec.f[k] >= lo && spec.f[k] < hi) s += spec.psd[k] * spec.df; return s; };

  // Resample an RR series (seconds) onto an even grid (fs Hz) by linear interpolation
  L.resampleRR = function (rr, fs) {
    const t = []; let c = 0; for (const v of rr) { c += v; t.push(c); }
    const out = []; let j = 0;
    for (let tt = t[0]; tt <= t[t.length - 1]; tt += 1 / fs) {
      while (j < t.length - 2 && t[j + 1] < tt) j++;
      const a = (tt - t[j]) / (t[j + 1] - t[j]);
      out.push(rr[j] + a * (rr[j + 1] - rr[j]));
    }
    return out;
  };

  /* ------------------------------------------------------------------ *
   * Signal generators
   * ------------------------------------------------------------------ */
  L.gen = {};
  L.gen.white = (N, R) => Array.from({ length: N }, () => R.n());
  // 1/f^beta noise by spectral synthesis
  L.gen.powerLaw = function (N, R, beta) {
    let n = 1; while (n < 2 * N) n <<= 1;
    const re = new Float64Array(n), im = new Float64Array(n);
    for (let k = 1; k < n / 2; k++) {
      const a = Math.pow(k, -beta / 2), ph = 2 * Math.PI * R.u(), g = Math.abs(R.n());
      re[k] = a * g * Math.cos(ph); im[k] = a * g * Math.sin(ph);
      re[n - k] = re[k]; im[n - k] = -im[k];
    }
    L.fft(re, im); // real because of Hermitian symmetry (up to sign of im)
    const out = Array.from(re.slice(0, N));
    return L.zscore(out);
  };
  L.gen.pink = (N, R) => L.gen.powerLaw(N, R, 1);
  L.gen.sine = (N, period, phase) => Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * i / period + (phase || 0)));
  L.gen.logistic = function (N, R) { let v = 0.1 + 0.8 * R.u(); const o = []; for (let i = 0; i < N + 100; i++) { v = 4 * v * (1 - v); if (i >= 100) o.push(v); } return L.zscore(o); };
  // A small library of contrasting test signals, all z-scored
  L.gen.kinds = {
    periodic: { label: 'Periodic (sine)', f: (N, R) => L.zscore(L.gen.sine(N, 12.3, R.u() * 6.28)) },
    noisySine: { label: 'Sine + noise', f: (N, R) => { const s = L.gen.sine(N, 12.3, R.u() * 6.28); return L.zscore(s.map(v => v + 0.35 * R.n())); } },
    pink: { label: '1/f (pink) noise', f: (N, R) => L.gen.pink(N, R) },
    white: { label: 'White noise', f: (N, R) => L.zscore(L.gen.white(N, R)) },
    chaos: { label: 'Chaotic (logistic map)', f: (N, R) => L.gen.logistic(N, R) },
  };

  // Synthetic RR-interval series (seconds). opts: mean, lf, hf, noise, resp, slow, slowF
  L.gen.rr = function (N, R, o) {
    o = Object.assign({ mean: 0.85, lf: 0.02, hf: 0.025, noise: 0.025, resp: 0.25, slow: 0, slowF: 0.025, white: 0.004 }, o);
    const pink = L.gen.pink(N, R);
    const ph1 = R.u() * 6.28, ph2 = R.u() * 6.28, ph3 = R.u() * 6.28;
    const out = []; let t = 0;
    for (let i = 0; i < N; i++) {
      let v = o.mean + o.lf * Math.sin(2 * Math.PI * 0.1 * t + ph1) + o.hf * Math.sin(2 * Math.PI * o.resp * t + ph2)
        + o.slow * Math.sin(2 * Math.PI * o.slowF * t + ph3) + o.noise * pink[i] + o.white * R.n();
      v = Math.max(0.35, v);
      out.push(v); t += v;
    }
    return out;
  };
  // Two illustrative "phenotypes" with subject-to-subject variation
  L.gen.subject = function (group, N, R) {
    const j = () => 0.75 + 0.5 * R.u();
    if (group === 'healthy') return L.gen.rr(N, R, { mean: 0.88 + 0.08 * R.n(), lf: 0.018 * j(), hf: 0.022 * j(), noise: 0.03 * j(), resp: 0.22 + 0.06 * R.u(), slow: 0.004 * j() });
    return L.gen.rr(N, R, { mean: 0.74 + 0.06 * R.n(), lf: 0.004 * j(), hf: 0.003 * j(), noise: 0.009 * j(), resp: 0.25, slow: 0.016 * j(), slowF: 0.02 + 0.015 * R.u(), white: 0.0015 });
  };

  /* ------------------------------------------------------------------ *
   * Statistics for group comparison
   * ------------------------------------------------------------------ */
  function betacf(a, b, x) {
    const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300;
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  function lgamma(z) {
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
      12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
    z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  function ibeta(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  L.lgamma = lgamma;
  // Welch two-sample t-test, two-sided p
  L.ttest = function (a, b) {
    const ma = L.mean(a), mb = L.mean(b), va = L.sd(a) ** 2 / a.length, vb = L.sd(b) ** 2 / b.length;
    const t = (ma - mb) / Math.sqrt(va + vb);
    const df = (va + vb) ** 2 / (va * va / (a.length - 1) + vb * vb / (b.length - 1));
    return { t, df, p: ibeta(df / (df + t * t), df / 2, 0.5) };
  };
  // ROC for "higher score = positive"; returns points and AUC (Mann–Whitney)
  L.roc = function (pos, neg) {
    const th = Array.from(new Set([...pos, ...neg])).sort((a, b) => b - a);
    const pts = [[0, 0]];
    for (const t of th) pts.push([neg.filter(v => v >= t).length / neg.length, pos.filter(v => v >= t).length / pos.length]);
    pts.push([1, 1]);
    let auc = 0; for (const p of pos) for (const q of neg) auc += p > q ? 1 : p === q ? 0.5 : 0;
    return { pts, auc: auc / (pos.length * neg.length) };
  };

  /* ------------------------------------------------------------------ *
   * Plot: a minimal HiDPI canvas plotter with data <-> pixel mapping
   * ------------------------------------------------------------------ */
  L.niceTicks = function (lo, hi, n) {
    if (hi < lo) { const t = lo; lo = hi; hi = t; }
    const span = hi - lo; if (!(span > 0)) return [lo];
    const step0 = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const err = step0 / mag; const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
    const out = []; for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9 * step; v += step) out.push(+v.toFixed(12));
    return out;
  };
  L.fmt = (v, d) => {
    if (!isFinite(v)) return v !== v ? 'undefined' : (v > 0 ? '∞' : '−∞');
    const s = v.toFixed(d === undefined ? 2 : d);
    return s.replace('-', '−');
  };

  class Plot {
    constructor(canvas, opt) {
      this.c = typeof canvas === 'string' ? document.querySelector(canvas) : canvas;
      this.o = Object.assign({ height: 220, pad: [12, 14, 34, 46] /* t r b l */, aspect: null }, opt || {});
      this.ctx = this.c.getContext('2d');
      this.x0 = 0; this.x1 = 1; this.y0 = 0; this.y1 = 1;
      this.drawFn = null;
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(this.c);
      this.resize(true);
    }
    resize(silent) {
      const w = this.c.clientWidth || 600;
      const h = this.o.aspect ? Math.round(w * this.o.aspect) : this.o.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      if (this.c.width !== Math.round(w * dpr) || this.c.height !== Math.round(h * dpr)) {
        this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
        this.c.style.height = h + 'px';
      }
      this.W = w; this.H = h; this.dpr = dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!silent && this.drawFn) this.drawFn(this);
    }
    draw(fn) { this.drawFn = fn; this.resize(true); fn(this); return this; }
    redraw() { if (this.drawFn) this.drawFn(this); }
    get L() { return this.o.pad[3]; } get R() { return this.W - this.o.pad[1]; }
    get T() { return this.o.pad[0]; } get B() { return this.H - this.o.pad[2]; }
    dom(x0, x1, y0, y1) { this.x0 = x0; this.x1 = x1; this.y0 = y0; this.y1 = y1; return this; }
    px(x) { return this.L + (x - this.x0) / (this.x1 - this.x0) * (this.R - this.L); }
    py(y) { return this.B - (y - this.y0) / (this.y1 - this.y0) * (this.B - this.T); }
    ix(px) { return this.x0 + (px - this.L) / (this.R - this.L) * (this.x1 - this.x0); }
    iy(py) { return this.y0 + (this.B - py) / (this.B - this.T) * (this.y1 - this.y0); }
    clear() { this.ctx.clearRect(0, 0, this.W, this.H); return this; }
    axes(o) {
      o = Object.assign({ xticks: 5, yticks: 4, grid: true, xfmt: null, yfmt: null }, o || {});
      const g = this.ctx; g.save();
      g.font = '11.5px ' + getComputedStyle(document.body).fontFamily; g.fillStyle = '#7a7f87';
      g.strokeStyle = '#ecebe6'; g.lineWidth = 1;
      const xt = Array.isArray(o.xticks) ? o.xticks : o.xticks ? L.niceTicks(this.x0, this.x1, o.xticks) : [];
      const yt = Array.isArray(o.yticks) ? o.yticks : o.yticks ? L.niceTicks(this.y0, this.y1, o.yticks) : [];
      g.textAlign = 'center'; g.textBaseline = 'top';
      for (const t of xt) {
        const X = Math.round(this.px(t)) + .5; if (X < this.L - 1 || X > this.R + 1) continue;
        if (o.grid) { g.beginPath(); g.moveTo(X, this.T); g.lineTo(X, this.B); g.stroke(); }
        g.fillText(o.xfmt ? o.xfmt(t) : String(t).replace('-', '−'), X, this.B + 5);
      }
      g.textAlign = 'right'; g.textBaseline = 'middle';
      for (const t of yt) {
        const Y = Math.round(this.py(t)) + .5; if (Y < this.T - 1 || Y > this.B + 1) continue;
        if (o.grid) { g.beginPath(); g.moveTo(this.L, Y); g.lineTo(this.R, Y); g.stroke(); }
        g.fillText(o.yfmt ? o.yfmt(t) : String(t).replace('-', '−'), this.L - 6, Y);
      }
      g.strokeStyle = '#9a9ea5'; g.beginPath();
      g.moveTo(this.L + .5, this.T); g.lineTo(this.L + .5, this.B + .5); g.lineTo(this.R, this.B + .5); g.stroke();
      g.fillStyle = '#4a4e55'; g.font = '12px ' + getComputedStyle(document.body).fontFamily;
      if (o.xlabel) { g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(o.xlabel, this.R, this.H - 1); }
      if (o.ylabel) { g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(o.ylabel, 4, 0); }
      g.restore(); return this;
    }
    line(xs, ys, o) {
      o = Object.assign({ color: '#2a78d6', width: 2, dash: null, alpha: 1 }, o || {});
      const g = this.ctx; g.save(); g.globalAlpha = o.alpha; g.strokeStyle = o.color; g.lineWidth = o.width;
      g.lineJoin = 'round'; g.lineCap = 'round'; if (o.dash) g.setLineDash(o.dash);
      g.beginPath(); let started = false;
      for (let i = 0; i < ys.length; i++) {
        const xv = xs ? xs[i] : i, yv = ys[i];
        if (!isFinite(yv)) { started = false; continue; }
        const X = this.px(xv), Y = this.py(yv);
        if (!started) { g.moveTo(X, Y); started = true; } else g.lineTo(X, Y);
      }
      g.stroke(); g.restore(); return this;
    }
    pts(xs, ys, o) {
      o = Object.assign({ color: '#2a78d6', r: 3.5, ring: '#fff', alpha: 1 }, o || {});
      const g = this.ctx; g.save(); g.globalAlpha = o.alpha;
      for (let i = 0; i < ys.length; i++) {
        const xv = xs ? xs[i] : i; if (!isFinite(ys[i])) continue;
        g.beginPath(); g.arc(this.px(xv), this.py(ys[i]), o.r, 0, 7);
        g.fillStyle = Array.isArray(o.color) ? o.color[i] : o.color; g.fill();
        if (o.ring) { g.lineWidth = 1.5; g.strokeStyle = o.ring; g.stroke(); }
      }
      g.restore(); return this;
    }
    rect(x0, y0, x1, y1, fill, stroke) {
      const g = this.ctx, X0 = this.px(x0), X1 = this.px(x1), Y0 = this.py(y0), Y1 = this.py(y1);
      g.save(); if (fill) { g.fillStyle = fill; g.fillRect(Math.min(X0, X1), Math.min(Y0, Y1), Math.abs(X1 - X0), Math.abs(Y1 - Y0)); }
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.strokeRect(Math.min(X0, X1), Math.min(Y0, Y1), Math.abs(X1 - X0), Math.abs(Y1 - Y0)); }
      g.restore(); return this;
    }
    bar(x0, x1, y, color, base) { // rounded data end
      base = base || 0; const g = this.ctx, X0 = this.px(x0), X1 = this.px(x1), Y = this.py(y), YB = this.py(base);
      const w = Math.max(1, X1 - X0), h = YB - Y, r = Math.min(3, w / 2, Math.abs(h));
      g.save(); g.fillStyle = color; g.beginPath();
      if (h >= 0) { g.moveTo(X0, YB); g.lineTo(X0, Y + r); g.quadraticCurveTo(X0, Y, X0 + r, Y); g.lineTo(X1 - r, Y); g.quadraticCurveTo(X1, Y, X1, Y + r); g.lineTo(X1, YB); }
      else { g.rect(X0, YB, w, -h); }
      g.closePath(); g.fill(); g.restore(); return this;
    }
    hline(y, o) { o = o || {}; return this.line([this.x0, this.x1], [y, y], Object.assign({ color: '#9a9ea5', width: 1, dash: [4, 4] }, o)); }
    vline(x, o) { o = o || {}; return this.line([x, x], [this.y0, this.y1], Object.assign({ color: '#9a9ea5', width: 1, dash: [4, 4] }, o)); }
    text(x, y, s, o) {
      o = Object.assign({ color: '#17191c', size: 12.5, align: 'left', base: 'middle', weight: 400, dx: 0, dy: 0, halo: true, font: null }, o || {});
      const g = this.ctx; g.save();
      g.font = `${o.weight} ${o.size}px ${o.font || getComputedStyle(document.body).fontFamily}`;
      g.textAlign = o.align; g.textBaseline = o.base;
      const X = (o.raw ? x : this.px(x)) + o.dx, Y = (o.raw ? y : this.py(y)) + o.dy;
      if (o.halo) { g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.92)'; g.strokeText(s, X, Y); }
      g.fillStyle = o.color; g.fillText(s, X, Y); g.restore(); return this;
    }
    // pointer helpers: callbacks receive data coords {x,y,px,py,e}
    pointer(h) {
      const pos = e => { const b = this.c.getBoundingClientRect(); const px = e.clientX - b.left, py = e.clientY - b.top; return { px, py, x: this.ix(px), y: this.iy(py), e }; };
      let down = false;
      this.c.addEventListener('pointerdown', e => { down = true; try { this.c.setPointerCapture(e.pointerId); } catch (_) {} h.down && h.down(pos(e)); });
      this.c.addEventListener('pointermove', e => { const p = pos(e); if (down) h.drag && h.drag(p); else h.hover && h.hover(p); });
      const up = e => { if (!down) return; down = false; h.up && h.up(pos(e)); };
      this.c.addEventListener('pointerup', up); this.c.addEventListener('pointercancel', up);
      this.c.addEventListener('pointerleave', e => { if (!down) h.leave && h.leave(pos(e)); });
      return this;
    }
  }
  L.Plot = Plot;

  /* ------------------------------------------------------------------ *
   * Controls
   * ------------------------------------------------------------------ */
  // slider(container, {label, min, max, step, value, fmt}, onInput) -> {get, set}
  L.slider = function (box, o, cb) {
    const d = document.createElement('div'); d.className = 'ctl';
    const id = 's' + Math.random().toString(36).slice(2, 8);
    d.innerHTML = `<label for="${id}">${o.label}</label><input id="${id}" type="range" min="${o.min}" max="${o.max}" step="${o.step || 1}" value="${o.value}"><output></output>`;
    const inp = d.querySelector('input'), out = d.querySelector('output');
    const fmt = o.fmt || (v => v);
    const show = () => { out.textContent = fmt(+inp.value); };
    inp.addEventListener('input', () => { show(); cb && cb(+inp.value); });
    show(); (typeof box === 'string' ? document.querySelector(box) : box).appendChild(d);
    return { get: () => +inp.value, set: v => { inp.value = v; show(); }, el: inp };
  };
  // seg(container, [[value,label],...], value, cb)
  L.seg = function (box, items, val, cb, label) {
    const w = document.createElement('div'); w.className = 'ctl';
    if (label) { const l = document.createElement('label'); l.textContent = label; w.appendChild(l); }
    const s = document.createElement('div'); s.className = 'seg'; w.appendChild(s);
    let cur = val;
    const bs = items.map(([v, t]) => {
      const b = document.createElement('button'); b.type = 'button'; b.innerHTML = t; b.className = v === val ? 'on' : '';
      b.onclick = () => { cur = v; bs.forEach(x => x.classList.toggle('on', x === b)); cb && cb(v); };
      s.appendChild(b); return b;
    });
    (typeof box === 'string' ? document.querySelector(box) : box).appendChild(w);
    return { get: () => cur, set: v => { cur = v; bs.forEach((b, i) => b.classList.toggle('on', items[i][0] === v)); } };
  };
  L.button = function (box, label, cb) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.innerHTML = label; b.onclick = cb;
    (typeof box === 'string' ? document.querySelector(box) : box).appendChild(b); return b;
  };
  // readout(container, [[key,label,hl],...]) -> set(key, value)
  L.readout = function (box, items) {
    const el = typeof box === 'string' ? document.querySelector(box) : box;
    el.classList.add('readout');
    const map = {};
    for (const [k, lab, hl] of items) {
      const d = document.createElement('div'); d.className = 'stat' + (hl ? ' hl' : '');
      d.innerHTML = `<div class="k">${lab}</div><div class="v">–</div>`; el.appendChild(d); map[k] = d.querySelector('.v');
    }
    return (k, v) => { if (map[k]) map[k].textContent = v; };
  };

  // simple tooltip
  let tipEl = null;
  L.tip = function (e, html) {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; document.body.appendChild(tipEl); }
    if (!html) { tipEl.style.opacity = 0; return; }
    tipEl.innerHTML = html; tipEl.style.opacity = 1;
    const x = e.clientX + 14, y = e.clientY + 14, w = tipEl.offsetWidth;
    tipEl.style.left = Math.min(x, window.innerWidth - w - 8) + 'px'; tipEl.style.top = y + 'px';
  };

  L.C = { s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a', red: '#d93a3a', mag: '#c8329a', cyan: '#22a6c8', green: '#2f9e44', ink: '#17191c', ink2: '#4a4e55', ink3: '#9a9ea5', soft: '#ecebe6' };

  // boot helper
  L.ready = function (fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); };
  L.ready(() => { L.chrome(); L.math(); });

  global.LSDH = L;
})(window);
