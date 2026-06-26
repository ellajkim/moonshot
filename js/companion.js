// js/companion.js — renders the companion cow image and manages the speech bubble
// Depends on: data.js (EVENTS)

const CompanionModule = (() => {
  const LEVELS = [
    'Egg', 'Hatchling', 'Fledgling', 'Explorer', 'Builder',
    'Achiever', 'Pro', 'Expert', 'Veteran', 'Master', 'Legend', 'Champion',
  ];

  // Levels 0-5: babycow, levels 6-11: cow
  const COW_SWITCH = 6;

  // Size in px for each level
  const SIZES = [120, 136, 152, 164, 176, 192, 192, 208, 220, 234, 246, 256];

  // CSS filter applied when status is negative (sad purple-blue tint)
  const BLUE_FILTER = 'hue-rotate(230deg) saturate(1.8) brightness(0.85)';

  function draw(level, positive) {
    const clampedLevel = Math.min(level, LEVELS.length - 1);
    const img = document.getElementById('tama-img');

    img.src = clampedLevel < COW_SWITCH ? 'images/babycow.png' : 'images/cow.png';

    img.style.width     = SIZES[clampedLevel] + 'px';
    img.style.height    = 'auto';
    img.style.filter    = positive ? 'none' : BLUE_FILTER;
    img.style.transform = positive ? 'none' : 'rotate(90deg)';
  }

  function update(idx, scorePercent, positive) {
    const clampedLevel = Math.min(idx, LEVELS.length - 1);
    document.getElementById('tama-level').textContent = LEVELS[clampedLevel];
    document.getElementById('sbar-fill').style.width  = scorePercent + '%';
    document.getElementById('sbar-pct').textContent   = scorePercent + '%';
    document.getElementById('speech').innerHTML       = EVENTS[idx].speech;
    draw(clampedLevel, positive);
  }

  return { draw, update };
})();
