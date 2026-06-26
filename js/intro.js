(function () {
  'use strict';

  const FAST_MODE = true;

  const CHAR_MS    = FAST_MODE ? 40   : 135;
  const PHASE_PAUSE = FAST_MODE ? 300  : 950;
  const LOAD_DELAY  = FAST_MODE ? 200  : 700;
  const START_DELAY = FAST_MODE ? 400  : 1400;
  const STAR_INTERVAL = FAST_MODE ? 200 : 520;
  const EXIT_DELAY  = FAST_MODE ? 1200 : 3500;

  // --- Build overlay ---
  const overlay = document.createElement('div');
  overlay.id = 'intro-overlay';

  const moonImg = document.createElement('img');
  moonImg.id = 'intro-moon-img';
  moonImg.src = 'images/moon.png';
  moonImg.alt = '';

  const titleEl = document.createElement('div');
  titleEl.id = 'intro-title';
  titleEl.textContent = 'Moonshot';

  const line1El = document.createElement('div');
  line1El.className = 'intro-line';
  const line2El = document.createElement('div');
  line2El.className = 'intro-line';
  const line3El = document.createElement('div');
  line3El.className = 'intro-line';

  const skipBtn = document.createElement('button');
  skipBtn.id = 'intro-skip';
  skipBtn.textContent = 'skip >';

  overlay.append(moonImg, titleEl, line1El, line2El, line3El, skipBtn);
  document.body.appendChild(overlay);

  // Cow lives outside the overlay so it can float above everything
  const cow = document.createElement('img');
  cow.id = 'intro-cow-img';
  cow.src = 'images/cow.png';
  cow.alt = '';
  document.body.appendChild(cow);

  // Wait for both images to load before starting
  let started = false;
  function maybeStart() {
    if (!started && moonImg.complete && cow.complete) {
      started = true;
      setTimeout(run, LOAD_DELAY);
    }
  }
  moonImg.addEventListener('load',  maybeStart);
  moonImg.addEventListener('error', maybeStart);
  cow.addEventListener('load',  maybeStart);
  cow.addEventListener('error', maybeStart);
  maybeStart();

  // --- Main animation sequence ---
  function run() {
    const moonRect = moonImg.getBoundingClientRect();
    const mW = moonRect.width;
    const mH = moonRect.height;
    const mCX = moonRect.left + mW / 2;

    const cowW = mW / 4;

    // Reveal cow off-screen to measure rendered height
    cow.style.cssText = [
      'position:fixed',
      'z-index:10000',
      'pointer-events:none',
      `width:${cowW}px`,
      'height:auto',
      'left:-9999px',
      'top:-9999px',
      'display:block',
      'transform:scaleX(-1)',
    ].join(';');

    requestAnimationFrame(() => {
      const cowH = cow.getBoundingClientRect().height || cowW * 0.8;

      // Quadratic bezier control points (cow top-left corner coords)
      //   P0 = left of moon, cow bottom aligned with moon bottom
      //   P1 = control point high above moon center (shapes the arc)
      //   P2 = right of moon, cow bottom aligned with moon bottom
      const p0 = { x: moonRect.left - mW * 1.1,  y: moonRect.bottom - cowH };
      const p2 = { x: moonRect.right + mW * 1.1, y: moonRect.bottom - cowH };
      const p1 = { x: mCX - cowW / 2,            y: moonRect.top - mH * 1.5 };

      function bz(t, a, b, c) {
        const m = 1 - t;
        return m * m * a + 2 * m * t * b + t * t * c;
      }

      function placeCow(t) {
        cow.style.left = bz(t, p0.x, p1.x, p2.x) + 'px';
        cow.style.top  = bz(t, p0.y, p1.y, p2.y) + 'px';
      }

      function animCow(from, to, dur) {
        const t0 = performance.now();
        function tick(now) {
          const p = Math.min((now - t0) / dur, 1);
          placeCow(from + (to - from) * p);
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }

      function type(el, text, dur, cb) {
        const delay = dur / text.length;
        let i = 0;
        (function next() {
          el.textContent = text.slice(0, i);
          if (i++ < text.length) setTimeout(next, delay);
          else if (cb) cb();
        })();
      }

      const T1 = 'Shoot for the moon';
      const T2 = 'Even if you miss,';
      const T3 = "You'll land among the stars";
      const d1 = T1.length * CHAR_MS;
      const d2 = T2.length * CHAR_MS;
      const d3 = T3.length * CHAR_MS;

      // Place cow at start position, then hide until typing begins
      placeCow(0);
      cow.style.display = 'none';

      setTimeout(() => {
        // Single continuous cow arc covering both typing phases + the pause between them
        cow.style.display = 'block';
        animCow(0, 1, d1 + PHASE_PAUSE + d2);

        // Phase 1: "Shoot for the moon"
        type(line1El, T1, d1, () => {

          setTimeout(() => {
            // Phase 2: "Even if you miss,"
            type(line2El, T2, d2, () => {
              // Stars begin immediately when "Even if you miss," finishes
              const starTimer = setInterval(() => {
                  const n = 2 + Math.floor(Math.random() * 3); // 2–4 stars per burst
                  for (let i = 0; i < n; i++) addStar();
                }, STAR_INTERVAL);

              setTimeout(() => {
                // Phase 3: "You'll land among the stars"
                type(line3El, T3, d3, () => {
                  clearInterval(starTimer);
                  setTimeout(exitIntro, EXIT_DELAY);
                });
              }, PHASE_PAUSE);
            });
          }, PHASE_PAUSE);
        });
      }, START_DELAY);
    });
  }

  function addStar() {
    const img = document.createElement('img');
    img.src = 'images/star.png';
    img.className = 'intro-star-img';

    const size = 10 + Math.random() * 28;
    const w = Math.random(); // 0 = white-ish, 1 = yellow-ish

    Object.assign(img.style, {
      position:      'absolute',
      width:         size + 'px',
      left:          (Math.random() * (window.innerWidth  - size)) + 'px',
      top:           (Math.random() * (window.innerHeight - size)) + 'px',
      zIndex:        '1',
      pointerEvents: 'none',
      opacity:       '0',
      transition:    'opacity 0.5s ease-in',
      filter: `sepia(${(w * 0.8).toFixed(2)}) saturate(${(1 + w).toFixed(2)}) brightness(${(1.3 - w * 0.15).toFixed(2)})`,
    });

    overlay.appendChild(img);
    // Double rAF ensures transition fires after element is in the DOM
    requestAnimationFrame(() => requestAnimationFrame(() => {
      img.style.opacity = (0.4 + Math.random() * 0.6).toFixed(2);
    }));
  }

  function exitIntro() {
    skipBtn.style.display = 'none';
    overlay.style.transition = 'opacity 0.8s ease';
    overlay.style.opacity = '0';
    cow.style.transition = 'opacity 0.8s ease';
    cow.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      cow.remove();
    }, 800);
  }

  skipBtn.addEventListener('click', exitIntro);
})();
