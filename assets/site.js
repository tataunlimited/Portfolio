/* Taher Samadi Shal, portfolio
   Navigation, screenshot galleries, the image viewer, the trailer button,
   and the live A* hex-grid demo behind the hero. No dependencies. */
(() => {
  'use strict';

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = () => motionQuery.matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const chevron = dir => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${dir === 'left' ? 'M12.5 4 6.5 10l6 6' : 'm7.5 4 6 6-6 6'}" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>`;

  /* ------------------------------------------------------------------ */
  /* Navigation                                                          */
  /* ------------------------------------------------------------------ */
  function initNav() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;
    const toggle = nav.querySelector('.nav-toggle');
    const hero = document.querySelector('[data-hero]');

    const onScroll = () => {
      const threshold = hero ? Math.min(hero.offsetHeight * 0.45, 420) : 40;
      nav.classList.toggle('is-scrolled', window.scrollY > threshold);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const setOpen = open => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });

    // Highlight the section in view.
    const links = [...nav.querySelectorAll('.nav-links a[href^="#"]')];
    const targets = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if (!('IntersectionObserver' in window)) return;
    const mark = id => links.forEach(a => {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) mark(entry.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    targets.forEach(t => io.observe(t));
    if (hero) io.observe(hero);
  }

  /* ------------------------------------------------------------------ */
  /* Galleries                                                           */
  /* ------------------------------------------------------------------ */
  function initGalleries() {
    document.querySelectorAll('[data-gallery]').forEach(gallery => {
      const track = gallery.querySelector('.gallery-track');
      const slides = [...track.children];
      const videos = [...track.querySelectorAll('video')];
      if (slides.length < 2) return;

      const ui = document.createElement('div');
      ui.className = 'gallery-ui';
      ui.innerHTML = `<button type="button" class="g-prev" aria-label="Previous image">${chevron('left')}</button>` +
        `<span class="gallery-count" aria-live="polite"></span>` +
        `<button type="button" class="g-next" aria-label="Next image">${chevron('right')}</button>`;
      gallery.appendChild(ui);
      const prev = ui.querySelector('.g-prev');
      const next = ui.querySelector('.g-next');
      const count = ui.querySelector('.gallery-count');

      let index = -1;
      const update = () => {
        const i = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
        if (i === index) return;
        index = i;
        count.textContent = `${i + 1} / ${slides.length}`;
        prev.disabled = i === 0;
        next.disabled = i === slides.length - 1;
        videos.forEach(v => { if (!slides[i].contains(v) && !v.paused) v.pause(); });
        slides.forEach((s, k) => { if (k !== i && s.stopYouTube) s.stopYouTube(); });
      };
      const go = i => {
        i = Math.max(0, Math.min(slides.length - 1, i));
        track.scrollTo({ left: i * track.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' });
      };
      gallery.goTo = go;

      prev.addEventListener('click', () => go(index - 1));
      next.addEventListener('click', () => go(index + 1));
      let ticking = false;
      track.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { ticking = false; update(); });
      }, { passive: true });
      gallery.addEventListener('keydown', e => {
        if (e.target.closest('video')) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
      });
      window.addEventListener('resize', () => { const keep = index; index = -1; track.scrollLeft = keep * track.clientWidth; update(); });
      update();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Trailer                                                             */
  /* ------------------------------------------------------------------ */
  function initTrailers() {
    // YouTube slides load the player only when someone presses play.
    document.querySelectorAll('.slide-yt').forEach(slide => {
      const button = slide.querySelector('.video-play');
      const poster = slide.querySelector('.yt-poster');
      button.addEventListener('click', () => {
        const q = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1' });
        if (slide.dataset.start) q.set('start', slide.dataset.start);
        if (slide.dataset.end) q.set('end', slide.dataset.end);
        if (location.protocol.startsWith('http')) q.set('origin', location.origin);
        const frame = document.createElement('iframe');
        frame.src = `https://www.youtube-nocookie.com/embed/${slide.dataset.yt}?${q}`;
        frame.title = poster ? poster.alt : 'YouTube video';
        frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';  // YouTube rejects embeds with no referrer (error 153)
        button.hidden = true;
        if (poster) poster.hidden = true;
        slide.classList.add('is-playing');
        slide.insertBefore(frame, slide.firstChild);
        frame.focus();
      });
      slide.stopYouTube = () => {
        const frame = slide.querySelector('iframe');
        if (!frame) return;
        frame.remove();
        button.hidden = false;
        if (poster) poster.hidden = false;
        slide.classList.remove('is-playing');
      };
    });

    document.querySelectorAll('.slide-video').forEach(slide => {
      const video = slide.querySelector('video');
      const button = slide.querySelector('.video-play');
      if (!video || !button) return;
      video.removeAttribute('controls');
      button.hidden = false;
      button.addEventListener('click', () => {
        button.hidden = true;
        video.setAttribute('controls', '');
        const playing = video.play();
        if (playing && playing.catch) playing.catch(() => {});
        video.focus({ preventScroll: true });
      });
      video.addEventListener('click', () => { if (!video.hasAttribute('controls')) button.click(); });
      video.addEventListener('ended', () => { video.removeAttribute('controls'); video.load(); button.hidden = false; });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Image viewer                                                        */
  /* ------------------------------------------------------------------ */
  function initLightbox() {
    const dialog = document.querySelector('.lightbox');
    const supported = dialog && typeof dialog.showModal === 'function';
    let items = [];
    let idx = 0;
    let opener = null;
    let gallery = null;

    const img = supported && dialog.querySelector('img');
    const caption = supported && dialog.querySelector('.lb-caption');
    const counter = supported && dialog.querySelector('.lb-count');
    const btnPrev = supported && dialog.querySelector('.lb-prev');
    const btnNext = supported && dialog.querySelector('.lb-next');

    const show = i => {
      idx = (i + items.length) % items.length;
      const btn = items[idx];
      const source = btn.querySelector('img');
      img.src = source.currentSrc || source.src;
      img.alt = source.alt;
      caption.textContent = btn.dataset.caption || source.alt;
      counter.textContent = items.length > 1 ? `${idx + 1} / ${items.length}` : '';
      btnPrev.hidden = btnNext.hidden = items.length < 2;
    };

    document.addEventListener('click', e => {
      const btn = e.target.closest('.slide-zoom');
      if (!btn) return;
      if (!supported) { window.open(btn.querySelector('img').src, '_blank', 'noopener'); return; }
      gallery = btn.closest('[data-gallery]');
      items = [...gallery.querySelectorAll('.slide-zoom')];
      opener = btn;
      show(items.indexOf(btn));
      dialog.showModal();
      document.documentElement.style.overflow = 'hidden';
    });
    if (!supported) return;

    btnPrev.addEventListener('click', () => show(idx - 1));
    btnNext.addEventListener('click', () => show(idx + 1));
    dialog.querySelector('.lb-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => {
      if (e.target === dialog || e.target.classList.contains('lb-figure')) dialog.close();
    });
    dialog.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    dialog.addEventListener('close', () => {
      document.documentElement.style.overflow = '';
      // Leave the gallery on the image that was last viewed.
      const btn = items[idx];
      if (gallery && gallery.goTo && btn) {
        const slides = [...gallery.querySelector('.gallery-track').children];
        const slideIndex = slides.indexOf(btn.closest('.slide'));
        if (slideIndex >= 0) gallery.goTo(slideIndex);
        btn.focus({ preventScroll: true });
      } else if (opener) {
        opener.focus({ preventScroll: true });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hero: live A* pathfinding on a procedurally generated hex grid      */
  /* ------------------------------------------------------------------ */
  function initHero() {
    const hero = document.querySelector('[data-hero]');
    if (!hero) return;
    const gridCanvas = hero.querySelector('.hero-grid');
    const liveCanvas = hero.querySelector('.hero-live');
    const gctx = gridCanvas && gridCanvas.getContext('2d');
    const lctx = liveCanvas && liveCanvas.getContext('2d');
    if (!gctx || !lctx) return;

    if (!finePointer) {
      const p = hero.querySelector('[data-hint-pointer]');
      const t = hero.querySelector('[data-hint-touch]');
      if (p && t) { p.hidden = true; t.hidden = false; }
    }
    const out = {
      len: hero.querySelector('[data-r="len"]'),
      explored: hero.querySelector('[data-r="explored"]'),
      ms: hero.querySelector('[data-r="ms"]'),
    };

    const SIN60 = Math.sqrt(3) / 2;
    const WALL = 1;
    const ROUGH = 2;
    const ROUGH_COST = 3;
    const SPEED = 7.5;        // cells per second
    const IDLE_MS = 4000;     // pointer idle time before the agent wanders on its own
    // Neighbour offsets for an "odd-r" pointy-top layout: [dCol, dRow]
    const DIRS = [
      [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]],
      [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]],
    ];

    let W = 0, H = 0, dpr = 1, R = 20, HW = 0, VS = 0, cols = 0, rows = 0, N = 0;
    let cx, cy, terrain, reserved, inside, heat, gScore, came, openMark, closedMark;
    let stamp = 0;
    let heatLive = false;
    const agent = { x: 0, y: 0, cell: -1 };
    let route = [];           // cells still to visit; route[0] is the next one
    let goal = -1;
    let lastPointerAt = -1e9;
    let wanderAt = 0;
    let running = false, rafId = 0, sleepId = 0, lastT = 0;
    let inView = true;
    let built = false;
    let stageCells = [];  // open cells the agent may wander to
    let autoWanders = 0;  // ambient moves since the visitor last interacted
    const MAX_AUTO_WANDERS = 6;

    /* ---------- helpers ---------- */
    function mulberry32(a) {
      return () => {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function valueNoise(seed) {
      const rnd = mulberry32(seed);
      const S = 256;
      const lattice = new Float32Array(S * S);
      for (let i = 0; i < lattice.length; i++) lattice[i] = rnd();
      const fade = t => t * t * (3 - 2 * t);
      return (x, y) => {
        const xi = Math.floor(x), yi = Math.floor(y);
        const u = fade(x - xi), v = fade(y - yi);
        const x0 = xi & 255, x1 = (xi + 1) & 255, y0 = yi & 255, y1 = (yi + 1) & 255;
        const a = lattice[y0 * S + x0], b = lattice[y0 * S + x1], c = lattice[y1 * S + x0], d = lattice[y1 * S + x1];
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
      };
    }
    function addHex(path, x, y, r) {
      const w = r * SIN60, h = r * 0.5;
      path.moveTo(x, y - r);
      path.lineTo(x + w, y - h);
      path.lineTo(x + w, y + h);
      path.lineTo(x, y + r);
      path.lineTo(x - w, y + h);
      path.lineTo(x - w, y - h);
      path.closePath();
    }
    const passable = i => terrain[i] !== WALL && reserved[i] === 0 && inside[i] === 1;
    const onStage = i => cx[i] > R && cx[i] < W - R && cy[i] > R && cy[i] < H * 0.84;

    function neighbours(i, fn) {
      const r = (i / cols) | 0, c = i - r * cols, d = DIRS[r & 1];
      for (let k = 0; k < 6; k++) {
        const nc = c + d[k][0], nr = r + d[k][1];
        if (nc >= 0 && nr >= 0 && nc < cols && nr < rows) fn(nr * cols + nc);
      }
    }
    function hexDist(a, b) {
      const ar = (a / cols) | 0, ac = a - ar * cols;
      const br = (b / cols) | 0, bc = b - br * cols;
      const aq = ac - ((ar - (ar & 1)) >> 1), bq = bc - ((br - (br & 1)) >> 1);
      const dq = aq - bq, dr = ar - br;
      return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
    }
    function cellAt(x, y) {
      const rf = y / VS + 0.25;
      let best = -1, bestD = Infinity;
      for (let r = Math.floor(rf) - 1; r <= Math.floor(rf) + 2; r++) {
        if (r < 0 || r >= rows) continue;
        const cf = x / HW + 0.5 - 0.5 * (r & 1);
        for (let c = Math.floor(cf) - 1; c <= Math.floor(cf) + 2; c++) {
          if (c < 0 || c >= cols) continue;
          const i = r * cols + c;
          const d = (cx[i] - x) ** 2 + (cy[i] - y) ** 2;
          if (d < bestD) { bestD = d; best = i; }
        }
      }
      return best;
    }
    function nearestOpen(start) {
      if (start < 0) start = 0;
      if (passable(start) && onStage(start)) return start;
      const seen = new Uint8Array(N);
      const queue = [start];
      seen[start] = 1;
      for (let h = 0; h < queue.length; h++) {
        const i = queue[h];
        if (passable(i) && onStage(i)) return i;
        neighbours(i, n => { if (!seen[n]) { seen[n] = 1; queue.push(n); } });
      }
      return start;
    }

    /* ---------- A* with a binary heap ---------- */
    const heapN = [], heapF = [];
    function heapPush(n, f) {
      let i = heapN.length;
      heapN.push(n); heapF.push(f);
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heapF[p] <= f) break;
        heapN[i] = heapN[p]; heapF[i] = heapF[p];
        i = p;
      }
      heapN[i] = n; heapF[i] = f;
    }
    function heapPop() {
      const top = heapN[0];
      const n = heapN.pop(), f = heapF.pop();
      const len = heapN.length;
      if (len) {
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          if (l >= len) break;
          const r = l + 1;
          const c = (r < len && heapF[r] < heapF[l]) ? r : l;
          if (heapF[c] >= f) break;
          heapN[i] = heapN[c]; heapF[i] = heapF[c];
          i = c;
        }
        heapN[i] = n; heapF[i] = f;
      }
      return top;
    }
    function solve(start, target) {
      const t0 = performance.now();
      stamp++;
      heapN.length = 0; heapF.length = 0;
      const explored = [];
      gScore[start] = 0; came[start] = -1; openMark[start] = stamp;
      heapPush(start, hexDist(start, target));
      let best = start, bestH = hexDist(start, target);
      while (heapN.length) {
        const cur = heapPop();
        if (closedMark[cur] === stamp) continue;
        closedMark[cur] = stamp;
        explored.push(cur);
        if (cur === target) { best = cur; break; }
        const h = hexDist(cur, target);
        if (h < bestH) { bestH = h; best = cur; }
        const r = (cur / cols) | 0, c = cur - r * cols, d = DIRS[r & 1];
        for (let k = 0; k < 6; k++) {
          const nc = c + d[k][0], nr = r + d[k][1];
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          const nb = nr * cols + nc;
          if (closedMark[nb] === stamp || !passable(nb)) continue;
          const g = gScore[cur] + (terrain[nb] === ROUGH ? ROUGH_COST : 1);
          if (openMark[nb] !== stamp || g < gScore[nb]) {
            openMark[nb] = stamp; gScore[nb] = g; came[nb] = cur;
            heapPush(nb, g + hexDist(nb, target) * 1.001);
          }
        }
      }
      const path = [];
      for (let n = best; n !== -1; n = came[n]) path.push(n);
      path.reverse();
      return { path, explored, ms: performance.now() - t0 };
    }

    /* ---------- readout (throttled) ---------- */
    let readoutTimer = 0, readoutValue = null;
    function report(res) {
      readoutValue = res;
      if (readoutTimer) return;
      readoutTimer = setTimeout(() => {
        readoutTimer = 0;
        const v = readoutValue;
        if (out.len) out.len.textContent = String(Math.max(0, v.path.length - 1));
        if (out.explored) out.explored.textContent = String(v.explored.length);
        if (out.ms) out.ms.textContent = v.ms < 0.1 ? '<0.1' : v.ms.toFixed(1);
      }, 90);
    }

    /* ---------- goals ---------- */
    function setGoal(cell) {
      if (!built || cell < 0) return;
      cell = nearestOpen(cell);
      if (cell === goal && (route.length || reducedMotion())) return;
      const moving = !reducedMotion() && route.length > 0;
      const start = moving ? route[0] : agent.cell;
      const res = solve(start, cell);
      route = moving ? res.path : res.path.slice(1);
      goal = res.path[res.path.length - 1];
      if (!reducedMotion()) {
        for (const n of res.explored) if (heat[n] < 0.95) heat[n] = 0.95;
        heatLive = true;
      }
      report(res);
      wake();
    }
    function wander() {
      let best = -1, bestD = -1;
      for (let tries = 0; tries < 24 && stageCells.length; tries++) {
        const c = stageCells[(Math.random() * stageCells.length) | 0];
        const d = hexDist(c, agent.cell);
        if (d > 7) { setGoal(c); return; }
        if (d > bestD) { bestD = d; best = c; }
      }
      if (bestD >= 3) setGoal(best);
      else wanderAt = performance.now() + 1500;
    }

    /* ---------- drawing ---------- */
    function sizeCanvas(canvas) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    function drawGrid() {
      const ctx = gctx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const open = new Path2D(), dim = new Path2D(), walls = new Path2D(), dots = new Path2D();
      for (let i = 0; i < N; i++) {
        const x = cx[i], y = cy[i];
        if (x < -R || x > W + R || y < -R || y > H + R) continue;
        if (reserved[i]) { addHex(dim, x, y, R); continue; }
        addHex(open, x, y, R);
        if (terrain[i] === WALL) addHex(walls, x, y, R * 0.82);
        else if (terrain[i] === ROUGH) { dots.moveTo(x + 1.5, y); dots.arc(x, y, 1.5, 0, Math.PI * 2); }
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(132, 160, 196, 0.035)';
      ctx.stroke(dim);
      ctx.strokeStyle = 'rgba(132, 160, 196, 0.105)';
      ctx.stroke(open);
      ctx.fillStyle = 'rgba(30, 44, 62, 0.92)';
      ctx.fill(walls);
      ctx.strokeStyle = 'rgba(132, 160, 196, 0.2)';
      ctx.stroke(walls);
      ctx.fillStyle = 'rgba(132, 160, 196, 0.32)';
      ctx.fill(dots);
    }
    function drawLive() {
      const ctx = lctx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Nodes the search explored, fading out.
      if (heatLive) {
        const buckets = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
        for (let i = 0; i < N; i++) {
          const h = heat[i];
          if (h < 0.04) continue;
          addHex(buckets[h > 0.72 ? 3 : h > 0.48 ? 2 : h > 0.24 ? 1 : 0], cx[i], cy[i], R * 0.86);
        }
        const alpha = [0.04, 0.08, 0.12, 0.17];
        for (let b = 0; b < 4; b++) { ctx.fillStyle = `rgba(76, 141, 246, ${alpha[b]})`; ctx.fill(buckets[b]); }
      }

      // Path, smoothed through the cell centres.
      if (route.length) {
        const pts = [[agent.x, agent.y]];
        for (const n of route) pts.push([cx[n], cy[n]]);
        const line = new Path2D();
        line.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length - 1; i++) {
          line.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
        }
        line.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255, 181, 71, 0.16)';
        ctx.lineWidth = 8;
        ctx.stroke(line);
        ctx.strokeStyle = 'rgba(255, 181, 71, 0.95)';
        ctx.lineWidth = 2;
        ctx.stroke(line);

        const steps = new Path2D();
        for (let i = 0; i < route.length - 1; i++) {
          const n = route[i];
          steps.moveTo(cx[n] + 2, cy[n]);
          steps.arc(cx[n], cy[n], 2, 0, Math.PI * 2);
        }
        ctx.fillStyle = 'rgba(255, 181, 71, 0.6)';
        ctx.fill(steps);

        // Goal marker.
        const g = route[route.length - 1];
        const ring = new Path2D();
        addHex(ring, cx[g], cy[g], R * 0.9);
        ctx.fillStyle = 'rgba(255, 181, 71, 0.12)';
        ctx.fill(ring);
        ctx.strokeStyle = 'rgba(255, 181, 71, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke(ring);
      }

      // Agent.
      const glow = ctx.createRadialGradient(agent.x, agent.y, 0, agent.x, agent.y, R * 1.5);
      glow.addColorStop(0, 'rgba(255, 181, 71, 0.38)');
      glow.addColorStop(1, 'rgba(255, 181, 71, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, R * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFB547';
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, Math.max(4, R * 0.28), 0, Math.PI * 2);
      ctx.fill();
    }

    /* ---------- build the grid ---------- */
    function build() {
      const rect = hero.getBoundingClientRect();
      const prevW = W, prevH = H, prevX = agent.x, prevY = agent.y, hadAgent = built;
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      R = W < 560 ? 15 : W < 1000 ? 18 : W < 1700 ? 21 : 24;
      HW = Math.sqrt(3) * R;
      VS = 1.5 * R;
      cols = Math.ceil(W / HW) + 2;
      rows = Math.ceil(H / VS) + 2;
      N = cols * rows;

      cx = new Float32Array(N); cy = new Float32Array(N);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          cx[i] = (c - 0.5 + 0.5 * (r & 1)) * HW;
          cy[i] = (r - 0.25) * VS;
        }
      }

      // Terrain from two octaves of value noise; thresholds by quantile so density is stable.
      const noise = valueNoise(2013);
      const values = new Float32Array(N);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          values[r * cols + c] = noise(c * 0.17, r * 0.2) * 0.66 + noise(c * 0.45 + 31.7, r * 0.5 + 11.3) * 0.34;
        }
      }
      const sorted = Float32Array.from(values).sort();
      const wallAt = sorted[Math.floor(N * 0.8)];
      const roughAt = sorted[Math.floor(N * 0.68)];
      terrain = new Uint8Array(N);
      for (let i = 0; i < N; i++) terrain[i] = values[i] > wallAt ? WALL : values[i] > roughAt ? ROUGH : 0;

      // Text and controls are obstacles, so the path never runs behind them.
      reserved = new Uint8Array(N);
      const pad = R * 0.8;
      const mark = (x0, y0, x1, y1) => {
        const r0 = Math.max(0, Math.floor(y0 / VS) - 1), r1 = Math.min(rows - 1, Math.ceil(y1 / VS) + 2);
        const c0 = Math.max(0, Math.floor(x0 / HW) - 1), c1 = Math.min(cols - 1, Math.ceil(x1 / HW) + 2);
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const i = r * cols + c;
            if (cx[i] >= x0 && cx[i] <= x1 && cy[i] >= y0 && cy[i] <= y1) reserved[i] = 1;
          }
        }
      };
      hero.querySelectorAll('[data-avoid]').forEach(el => {
        for (const b of el.getClientRects()) {
          if (!b.width || !b.height) continue;
          mark(b.left - rect.left - pad, b.top - rect.top - pad, b.right - rect.left + pad, b.bottom - rect.top + pad);
        }
      });
      const nav = document.querySelector('.site-nav');
      mark(-HW, -VS, W + HW, (nav ? nav.offsetHeight : 64) + R * 0.3);

      // Keep paths inside the visible stage, above the fade at the bottom.
      inside = new Uint8Array(N);
      for (let i = 0; i < N; i++) inside[i] = (cx[i] > R * 1.1 && cx[i] < W - R * 1.1 && cy[i] > 0 && cy[i] < H * 0.86) ? 1 : 0;

      stageCells = [];
      for (let i = 0; i < N; i++) if (passable(i) && onStage(i)) stageCells.push(i);

      heat = new Float32Array(N);
      gScore = new Float32Array(N);
      came = new Int32Array(N);
      openMark = new Uint32Array(N);
      closedMark = new Uint32Array(N);
      stamp = 0;

      sizeCanvas(gridCanvas);
      sizeCanvas(liveCanvas);
      drawGrid();

      // Place the agent: keep its relative position across resizes.
      const wide = W >= 980;
      const ax = hadAgent && prevW ? prevX / prevW * W : W * (wide ? 0.8 : 0.7);
      const ay = hadAgent && prevH ? prevY / prevH * H : H * (wide ? 0.4 : 0.14);
      built = true;
      agent.cell = nearestOpen(cellAt(ax, ay));
      agent.x = cx[agent.cell];
      agent.y = cy[agent.cell];
      route = [];
      goal = -1;
      heatLive = false;

      if (reducedMotion()) {
        // A static example path; the pointer still moves the goal instantly.
        const target = cellAt(wide ? W * 0.66 : W * 0.3, wide ? H * 0.78 : H * 0.12);
        setGoal(target);
      } else {
        wanderAt = performance.now() + 500;
      }
      drawLive();
      wake();
    }

    /* ---------- loop ---------- */
    function tick(t) {
      rafId = 0;
      const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 1 / 60;
      lastT = t;
      const still = reducedMotion();
      let busy = false;

      if (!still && route.length) {
        let step = SPEED * HW * dt;
        while (step > 0 && route.length) {
          const n = route[0];
          const dx = cx[n] - agent.x, dy = cy[n] - agent.y;
          const d = Math.hypot(dx, dy);
          if (d <= step) {
            agent.x = cx[n]; agent.y = cy[n]; agent.cell = n;
            route.shift();
            step -= d;
          } else {
            agent.x += dx / d * step;
            agent.y += dy / d * step;
            step = 0;
          }
        }
        busy = true;
        if (!route.length) wanderAt = t + 1300;
      }

      if (heatLive) {
        const k = Math.exp(-dt / 0.5);
        let any = false;
        for (let i = 0; i < N; i++) {
          if (heat[i] > 0.04) { heat[i] *= k; any = true; } else heat[i] = 0;
        }
        heatLive = any;
        busy = busy || any;
      }

      if (!still && !route.length && t - lastPointerAt > IDLE_MS && t >= wanderAt && autoWanders < MAX_AUTO_WANDERS) {
        autoWanders++;
        wander();
        busy = true;
      }

      drawLive();

      if (!inView || document.hidden) { running = false; lastT = 0; return; }
      if (busy) { rafId = requestAnimationFrame(tick); return; }
      running = false;
      lastT = 0;
      if (!still && autoWanders < MAX_AUTO_WANDERS) {
        const wait = Math.max(150, Math.max(wanderAt, lastPointerAt + IDLE_MS) - performance.now());
        clearTimeout(sleepId);
        sleepId = setTimeout(wake, wait);
      }
    }
    function wake() {
      clearTimeout(sleepId);
      if (running || !built || !inView || document.hidden) return;
      running = true;
      lastT = 0;
      rafId = requestAnimationFrame(tick);
    }

    /* ---------- input ---------- */
    let pointerFrame = 0, pointerX = 0, pointerY = 0;
    function queueGoal(clientX, clientY) {
      const rect = hero.getBoundingClientRect();
      pointerX = clientX - rect.left;
      pointerY = clientY - rect.top;
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        setGoal(cellAt(pointerX, pointerY));
      });
    }
    hero.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      lastPointerAt = performance.now();
      autoWanders = 0;
      queueGoal(e.clientX, e.clientY);
    }, { passive: true });
    hero.addEventListener('pointerdown', e => {
      if (e.target.closest('a, button')) return;
      lastPointerAt = performance.now();
      autoWanders = 0;
      queueGoal(e.clientX, e.clientY);
    }, { passive: true });

    /* ---------- lifecycle ---------- */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        const entering = entry.isIntersecting && !inView;
        inView = entry.isIntersecting;
        if (entering) autoWanders = Math.min(autoWanders, MAX_AUTO_WANDERS - 2);
        if (inView) wake();
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

    let resizeTimer = 0, lastSize = '';
    const rebuild = () => {
      const size = `${hero.clientWidth}x${hero.clientHeight}`;
      if (size === lastSize) return;
      lastSize = size;
      build();
    };
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(rebuild, 120); }).observe(hero);
    } else {
      window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(rebuild, 120); });
    }
    const motionChanged = () => { lastSize = ''; rebuild(); };
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', motionChanged);

    rebuild();
    // Web fonts change the text's size, and the text is part of the obstacle map.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { lastSize = ''; rebuild(); });
  }

  initNav();
  initGalleries();
  initTrailers();
  initLightbox();
  initHero();
})();
