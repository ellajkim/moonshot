# Proof-of-Skill Ledger

A dynamic visual dashboard that transforms a learning journey into a living, shareable story.

## Project Structure

```
index.html          # Entry point — just HTML structure, no logic
css/
├── base.css        # Resets, layout, header
├── skills.css      # Donut chart section
├── timeline.css    # Journey arc, ticks, event detail card
├── companion.css   # Tamagotchi card and speech bubble
└── ledger.css      # Journey log entries
js/
├── data.js         # ← YOUR MAIN EDIT FILE: all events and skill definitions
├── stars.js        # Procedural star field background
├── skills.js       # Donut chart rendering and updates
├── timeline.js     # SVG arc drawing and tick labels
├── companion.js    # Tamagotchi SVG and growth logic
├── ledger.js       # Journey log entry rendering
└── app.js          # Entry point — wires all modules together
```

## How to Run

No build step needed. Just open `index.html` in a browser:

```bash
# Option 1: open directly
open index.html

# Option 2: use a local server (avoids any file:// quirks)
npx serve .
# or
python3 -m http.server 8080
```

## How to Customize

### Adding your own events
Edit `js/data.js`. Each event in the `EVENTS` array looks like:

```js
{
  label: 'Intern',           // Short tick label (≤6 chars)
  month: "Jun '25",          // Shown in the detail card
  title: 'Got my first internship',
  desc: '2–3 sentence description of what happened.',
  delta: 30,                 // Score change — positive or negative
  positive: true,            // true = upward arc + happy companion
  goalAchieved: 'Land first internship',  // null if no goal hit
  speech: 'You <b>built your way in</b>!',  // Companion dialogue
  milestone: 'Landed first ML internship',  // Journey log headline
  todo: 'Ship the NLP pipeline.',           // Journey log next step
  skillDeltas: { python: 6, ml: 8, nlp: 14 },  // Skill growth this event
}
```

### Adding or renaming skills
Edit the `SKILLS` array in `js/data.js`:

```js
{ key: 'rust', label: 'Rust', color: '#e07040' },
```

Then add `rust` as a key in the `skillDeltas` of any events where it grows.

### Tuning how fast skills fill
`SKILL_MAX` (default: 100) is the cumulative total at which a donut is full.
Raise it to make skills fill more slowly; lower it to fill faster.

## Who Owns What

| File | Suggested owner |
|---|---|
| `js/data.js` | Everyone — add your own events |
| `js/companion.js` | Tamagotchi artist / animator |
| `js/timeline.js` | Timeline visual person |
| `js/skills.js` | Skills / donut chart person |
| `css/*.css` | Styling / theming person |
| `js/app.js` | Whoever integrates new features |

## Tech Stack

Vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, no dependencies.
