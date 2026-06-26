// js/stars.js — places star.png images across the fixed background container.
// Deterministic seed keeps the field identical on every load.

(function () {
  const COUNT = 70;
  const container = document.getElementById('stars-bg');
  if (!container) return;

  let seed = 42;
  function rand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  for (let i = 0; i < COUNT; i++) {
    const img = document.createElement('img');
    img.src = 'images/star.png';

    const size    = 8  + rand() * 24;          // 8–32 px
    const left    = rand() * 100;               // % across viewport
    const top     = rand() * 100;               // % down viewport
    const w       = rand();                     // 0 = white-ish, 1 = yellow-ish
    const opacity = (0.25 + rand() * 0.5).toFixed(2);

    img.style.cssText = [
      'position:absolute',
      `width:${size.toFixed(1)}px`,
      `left:${left.toFixed(2)}%`,
      `top:${top.toFixed(2)}%`,
      'pointer-events:none',
      `opacity:${opacity}`,
      `filter:sepia(${(w * 0.8).toFixed(2)}) saturate(${(1 + w).toFixed(2)}) brightness(${(1.3 - w * 0.15).toFixed(2)})`,
    ].join(';');

    container.appendChild(img);
  }
})();
