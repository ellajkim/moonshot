# Moonshot 🌙

> *"Shoot for the moon. Even if you miss, you'll land among the stars."*
> *And if the arc dips along the way — those dips? That's where the real learning lives.*

---

## What Is This?

Your GPA is a snapshot. Your resume is a highlight reel. But your **learning journey** — the late-night debugging sessions, the moment a hard concept finally clicks, the project that almost broke you before it made you — that story deserves to be told.

**Moonshot** is a living, visual dashboard that captures the full arc of your first year: the moon-sized goals you're reaching for, the stars you collect along the way, and yes, the dips in the graph — the setbacks that turn out to be the most important moments of all.

Your arc won't be a straight line upward. It'll curve, dip, recover, and surge. That shape *is* your story.

And through all of it, your companion is watching — a steadfast cow who has seen every high, every dip, every 2am compile error, and still believes you're going to make it.

---

## The Philosophy Behind It

### Shoot for the Moon 🌙
Every journey needs a north star. Moonshot lets you name your big, audacious goals and tracks your arc toward them. Not just *did you get there*, but *how did you grow trying*.

### Collect the Stars ⭐
Big goals are made of micro-wins. Finishing your first group project. Learning a new tool in an afternoon. Getting a PR merged. These small moments are the stars — and this ledger makes sure they don't disappear.

### Trust the Dips 📉
Setbacks aren't failures. They're inflection points. When the arc dips — when a project stalls, when something just doesn't work, when you feel like you're going backwards — Moonshot doesn't hide that. It marks it, names it, and asks: *what did you learn?* Because growth isn't a straight line upward. It's an arc, and the dips are part of the shape. The graph shows them honestly, because honest arcs are more beautiful than fake ones.

### Your Companion Is Rooting for You 🐄
Meet Moo — your growth companion, and the emotional heart of Moonshot.

Moo is a cow. She doesn't have deadlines. She doesn't care about your GPA. She just shows up every day, watches your arc, and offers a word when you need it most.

When you hit a milestone, Moo celebrates. When the arc dips, Moo doesn't panic — she's seen plenty of dips, and she knows they're not the end of the story. When you're grinding through something hard and can't see progress yet, Moo reminds you: *every cow was once just a calf learning to walk.*

She evolves alongside you. The more you grow, the more she does too. She's not just a mascot — she's a mirror, reflecting back the version of you that's becoming.

*Keep going. Moo believes in you.*

---

## What It Tracks

- **Micro-wins** — small but meaningful achievements that deserve recognition
- **Technical breakthroughs** — the moment a concept finally clicks
- **Projects & experiments** — what you built, what you tried, what you shipped
- **Skill milestones** — watching your donut charts fill up over time
- **Dips** — marked honestly on the arc, reframed as learning
- **Companion reflections** — Moo speaks to every moment, win or stumble

---

## Project Structure

```
index.html          # Entry point — HTML structure
css/
├── base.css        # Resets, layout, header
├── skills.css      # Donut chart section
├── timeline.css    # Journey arc, ticks, event detail card
├── companion.css   # Companion card and speech bubble
└── ledger.css      # Journey log entries
js/
├── data.js         # ← YOUR MAIN EDIT FILE: all events and skill definitions
├── stars.js        # Procedural star field background
├── skills.js       # Donut chart rendering and updates
├── timeline.js     # SVG arc drawing and tick labels
├── companion.js    # Companion SVG and growth logic
├── ledger.js       # Journey log entry rendering
└── app.js          # Entry point — wires all modules together
```

---

## How to Run

No build step. No dependencies. Just open it.

```bash
# Option 1: open directly
open index.html

# Option 2: local server (avoids file:// quirks)
npx serve .
# or
python3 -m http.server 8080
```

---

## How to Make It Yours

### Adding events (your story)
Edit `js/data.js`. Every moment — win or dip — gets an entry:

```js
{
  label: 'Intern',              // Short tick label (≤6 chars)
  month: "2025-06-01",          // Timestamp (YYYY-MM-DD) — shown in the detail card
  title: 'Got my first internship',
  desc: '2–3 sentences about what happened and what it meant.',
  delta: 30,                    // Score change — positive or negative
  positive: true,               // true = upward arc + happy companion
  goalAchieved: 'Land first internship',   // null if no goal hit
  speech: 'You <b>built your way in</b>!', // Companion dialogue
  milestone: 'Landed first ML internship', // Journey log headline
  todo: 'Ship the NLP pipeline.',          // Journey log next step
  skillDeltas: { python: 6, ml: 8, nlp: 14 }, // Skill growth this event
}
```

**Dip events** (setbacks) use `positive: false` and a negative `delta` — the arc visibly drops, and Moo responds with support rather than celebration. Don't skip them. The dips make the story real, and the recovery makes it powerful.

### Adding or renaming skills
Edit the `SKILLS` array in `js/data.js`:

```js
{ key: 'rust', label: 'Rust', color: '#e07040' },
```

Then reference `rust` in `skillDeltas` wherever it grows.

### Tuning skill fill speed
`SKILL_MAX` (default: `100`) is the cumulative total at which a donut fills completely. Raise it to slow progression; lower it to fill faster.

---

## Who Owns What

| File | Role |
|---|---|
| `js/data.js` | Everyone — add your own events and skills |
| `js/companion.js` | Companion artist / animator |
| `js/timeline.js` | Timeline visual / arc shape |
| `js/skills.js` | Donut chart logic |
| `css/*.css` | Styling and theming |
| `js/app.js` | Integration and wiring |

---

## Tech Stack

Vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, no dependencies.

Simple by design. Because sometimes the most powerful thing you can build is something that just *works*.

---

## Judging Criteria (How We Thought About This)

| Criteria | Our Approach |
|---|---|
| **Innovation & Theme** | Moon/stars/dips model reframes failure as inflection, not defeat |
| **Problem Scope** | Focused on first-year students; generic enough to personalize |
| **Technical Effort** | Procedural star field, SVG arc, animated donut charts — all from scratch |
| **UI/UX** | One screen, no login, zero friction — just your story |
| **Reflection & Growth** | Moo speaks. The ledger listens. Every dip has a lesson. |

---

*Built at FidHacks. Every bug was a dip. Every fix was a star.*
*The moon is still up there — Moo's watching, and we're on our way.* 🐄
