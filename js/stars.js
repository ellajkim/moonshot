// js/stars.js — procedurally places stars in the SVG background
// Tweak COUNT or SEED for a different star pattern.

(function () {
  const COUNT = 80;
  const svg = document.getElementById('stars-svg');
  svg.setAttribute('viewBox', '0 0 1000 700');

  // Deterministic pseudo-random so the field looks the same on every load
  let seed = 42;
  function rand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  for (let i = 0; i < COUNT; i++) {
    const cx   = Math.round(rand() * 1000);
    const cy   = Math.round(rand() * 700);
    const r    = +(0.5 + rand() * 0.9).toFixed(1);
    const a    = +(0.2 + rand() * 0.35).toFixed(2);
    const el   = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    el.setAttribute('cx', cx);
    el.setAttribute('cy', cy);
    el.setAttribute('r',  r);
    el.setAttribute('fill', `rgba(180,200,255,${a})`);
    svg.appendChild(el);
  }
})();
