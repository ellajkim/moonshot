// js/event-animation.js — full-screen achievement animation on event add
// Depends on: data.js (SKILLS)

const EventAnimationModule = (() => {
  const COW_SWITCH  = 6;
  const BLUE_FILTER = 'hue-rotate(230deg) saturate(1.8) brightness(0.85)';
  const STAR_COUNT  = 22;
  const STAR_TINTS  = [
    'none',
    'brightness(1.15)',
    'sepia(0.3) saturate(1.6) brightness(1.1)',
    'sepia(0.6) saturate(2.2) brightness(1.08)',
    'sepia(0.85) saturate(3) brightness(1.05)',
    'sepia(1) saturate(4) brightness(1.05)',
  ];

  function dismiss() {
    const existing = document.getElementById('ev-anim-overlay');
    if (!existing) return;
    if (existing._dismissTimer) clearTimeout(existing._dismissTimer);
    existing.classList.add('ev-anim-overlay-out');
    setTimeout(() => { if (existing.parentNode) existing.parentNode.removeChild(existing); }, 380);
    const content = document.querySelector('.content');
    if (content) content.classList.remove('ev-anim-dimmed');
  }

  function play(level, positive, delta, skillDeltas) {
    dismiss();

    const overlay = document.createElement('div');
    overlay.id = 'ev-anim-overlay';
    overlay.className = 'ev-anim-overlay';
    overlay.addEventListener('click', () => dismiss());

    const stage = document.createElement('div');
    stage.className = 'ev-anim-stage';

    // Stars burst outward from center — rendered behind the cow (appended first)
    if (positive) {
      for (let i = 0; i < STAR_COUNT; i++) {
        const star = document.createElement('img');
        star.src = 'images/star.png';
        star.className = 'ev-anim-star';

        const angle  = (i / STAR_COUNT) * 360 + (Math.random() - 0.5) * (360 / STAR_COUNT) * 1.4;
        const dist   = 120 + Math.random() * 180;
        const tx     = (Math.cos(angle * Math.PI / 180) * dist).toFixed(1);
        const ty     = (Math.sin(angle * Math.PI / 180) * dist).toFixed(1);
        const size   = 18 + Math.random() * 46;
        const tint   = STAR_TINTS[Math.floor(Math.random() * STAR_TINTS.length)];
        const delay  = (Math.random() * 0.22).toFixed(3);
        const rotate = Math.round(Math.random() * 360);

        star.style.cssText = `width:${size.toFixed(0)}px;height:${size.toFixed(0)}px;filter:${tint};--tx:${tx}px;--ty:${ty}px;--tr:${rotate}deg;animation-delay:${delay}s`;
        stage.appendChild(star);
      }
    }

    // Cow
    const cowSrc = level < COW_SWITCH ? 'images/babycow.png' : 'images/cow.png';
    const img = document.createElement('img');
    img.src = cowSrc;
    img.className = 'ev-anim-cow' + (positive ? '' : ' ev-anim-cow-neg');
    if (!positive) img.style.filter = BLUE_FILTER;
    stage.appendChild(img);

    // Blurb
    const blurbWrap = document.createElement('div');
    blurbWrap.className = 'ev-anim-blurb' + (positive ? '' : ' ev-anim-blurb-neg');

    if (delta !== 0 && delta != null) {
      const scoreLine = document.createElement('div');
      scoreLine.className = 'ev-anim-score';
      scoreLine.textContent = (delta > 0 ? '+' : '') + delta + ' pts';
      blurbWrap.appendChild(scoreLine);
    }

    const skillEntries = skillDeltas ? Object.entries(skillDeltas).filter(([, v]) => v) : [];
    if (skillEntries.length) {
      const skillLine = document.createElement('div');
      skillLine.className = 'ev-anim-skills';
      skillEntries.forEach(([key, val], i) => {
        const skill = (typeof SKILLS !== 'undefined') ? SKILLS.find(s => s.key === key) : null;
        const label = skill ? skill.label : key;
        const span = document.createElement('span');
        span.textContent = (val > 0 ? '+' : '') + val + ' ' + label;
        if (skill) span.style.color = skill.color;
        skillLine.appendChild(span);
        if (i < skillEntries.length - 1) {
          const sep = document.createElement('span');
          sep.className = 'ev-anim-sep';
          sep.textContent = ' • ';
          skillLine.appendChild(sep);
        }
      });
      blurbWrap.appendChild(skillLine);
    }

    if (blurbWrap.children.length) stage.appendChild(blurbWrap);

    overlay.appendChild(stage);
    document.body.appendChild(overlay);

    const content = document.querySelector('.content');
    if (content) content.classList.add('ev-anim-dimmed');

    // dismissed by click only
  }

  return { play, dismiss };
})();
