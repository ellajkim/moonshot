// js/companion.js — renders the tamagotchi SVG and manages the speech bubble
// Depends on: data.js (EVENTS)

const CompanionModule = (() => {
  const LEVELS = [
    'Egg', 'Hatchling', 'Fledgling', 'Explorer', 'Builder',
    'Achiever', 'Pro', 'Expert', 'Veteran', 'Master', 'Legend', 'Champion',
  ];

  // Body radius grows with level
  const BODY_RADII = [14, 15.5, 17, 18.5, 20, 21.5, 23, 24, 25, 26, 27, 28];

  /**
   * Draw the tamagotchi SVG at a given growth level.
   * @param {number} level     — 0 (egg) to 11 (champion)
   * @param {boolean} positive — true = happy face, false = sad face
   */
  function draw(level, positive) {
    const clampedLevel = Math.min(level, LEVELS.length - 1);
    const r  = BODY_RADII[clampedLevel];
    const cx = 36, cy = 40;

    // Body color darkens as the creature grows
    const blue = Math.max(160, 200 - clampedLevel * 4);
    const col  = `rgb(30, 50, ${blue})`;

    let s = '';

    // Body
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}"/>`;

    // Shine highlight
    s += `<ellipse cx="${cx - r * .32}" cy="${cy - r * .3}"
                   rx="${r * .28}" ry="${r * .2}"
                   fill="rgba(160,200,255,.18)"/>`;

    // Legs (appear at level 3+)
    if (clampedLevel >= 3) {
      const legY  = cy + r * .65;
      const legX1 = cx - r * .55;
      const legX2 = cx + r * .55;
      s += `<line x1="${legX1}" y1="${legY}" x2="${legX1}" y2="${legY + 8}"
                  stroke="${col}" stroke-width="3" stroke-linecap="round"/>`;
      s += `<line x1="${legX2}" y1="${legY}" x2="${legX2}" y2="${legY + 8}"
                  stroke="${col}" stroke-width="3" stroke-linecap="round"/>`;
    }

    // Eyes
    const ey   = cy - r * .1;
    const eoff = r * .38;

    if (positive) {
      // Happy: upward arc eyes
      [-1, 1].forEach(side => {
        const ex = cx + side * eoff;
        s += `<path d="M${ex - r * .28},${ey} Q${ex},${ey - r * .32} ${ex + r * .28},${ey}"
                    fill="rgba(160,210,255,.85)"/>`;
      });
      // Smile
      s += `<path d="M${cx - r * .22},${cy + r * .32}
                     Q${cx},${cy + r * .5} ${cx + r * .22},${cy + r * .32}"
                  fill="none" stroke="rgba(140,190,255,.8)"
                  stroke-width="1.5" stroke-linecap="round"/>`;
    } else {
      // Sad: dot eyes with drooping brows
      [-1, 1].forEach(side => {
        const ex = cx + side * eoff;
        s += `<circle cx="${ex}" cy="${ey}" r="${r * .22}" fill="rgba(130,170,255,.7)"/>`;
        // Brow droops inward
        const bx1 = ex - r * .3, bx2 = ex + r * .3;
        const by1 = ey - r * .4 + (side > 0 ? 3 : -3);
        const by2 = ey - r * .4 + (side > 0 ? -3 : 3);
        s += `<line x1="${bx1}" y1="${by1}" x2="${bx2}" y2="${by2}"
                    stroke="rgba(130,170,255,.7)"
                    stroke-width="1.5" stroke-linecap="round"/>`;
      });
      // Frown
      s += `<path d="M${cx - r * .22},${cy + r * .42}
                     Q${cx},${cy + r * .28} ${cx + r * .22},${cy + r * .42}"
                  fill="none" stroke="rgba(140,190,255,.7)"
                  stroke-width="1.5" stroke-linecap="round"/>`;
    }

    // Orbit stars at max levels (9+)
    if (clampedLevel >= 9) {
      for (let i = 0; i < 3; i++) {
        const angle = i * 120 * Math.PI / 180;
        const sx = cx + Math.cos(angle) * (r + 8);
        const sy = cy + Math.sin(angle) * (r + 8);
        s += `<circle cx="${sx}" cy="${sy}" r="2" fill="#f0c030"/>`;
      }
    }

    document.getElementById('tama-svg').innerHTML = s;
  }

  /** Update the level label, progress bar, and speech bubble. */
  function update(idx, scorePercent, positive) {
    const clampedLevel = Math.min(idx, LEVELS.length - 1);
    document.getElementById('tama-level').textContent   = LEVELS[clampedLevel];
    document.getElementById('sbar-fill').style.width    = scorePercent + '%';
    document.getElementById('sbar-pct').textContent     = scorePercent + '%';
    document.getElementById('speech').innerHTML         = EVENTS[idx].speech;
    draw(clampedLevel, positive);
  }

  return { draw, update };
})();
