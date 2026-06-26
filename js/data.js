// js/data.js
// ─────────────────────────────────────────────────────────────────────────────
// EDIT THIS FILE to customize the ledger for your own journey.
//
// SKILLS — add, remove, or rename skills here.
//   key:   used internally (no spaces)
//   label: displayed on the donut
//   color: stroke color of the donut ring
//
// EVENTS — each milestone on the timeline.
//   label:       short tick label below the timeline (≤6 chars)
//   month:       displayed in the event detail card
//   title:       headline for the event
//   desc:        2–3 sentence description
//   delta:       score change — positive or negative integer
//   positive:    true = upward trend / happy companion, false = downward / sad
//   goalAchieved: string if this event hits a goal, otherwise null
//   speech:      companion dialogue — wrap key words in <b>tags</b>
//   milestone:   short phrase shown in the journey log
//   todo:        "next step" shown under the milestone in the log
//   skillDeltas: how much each skill grows at this event (omit a key = no change)
//
// SKILL_MAX — the score at which a donut is considered 100% full.
// ─────────────────────────────────────────────────────────────────────────────

const SKILL_MAX = 100;

const SKILLS = [
  { key: 'python',  label: 'Python',  color: '#4e9de0' },
  { key: 'sql',     label: 'SQL',     color: '#7c6fe0' },
  { key: 'ml',      label: 'ML',      color: '#3db88a' },
  { key: 'finance', label: 'Finance', color: '#e0a030' },
  { key: 'nlp',     label: 'NLP',     color: '#d06090' },
  { key: 'stats',   label: 'Stats',   color: '#60b0d0' },
  { key: 'systems', label: 'Systems', color: '#a070e0' },
];

const EVENTS = [
  {
    label: 'Start',
    month: "2025-08-15",
    title: 'First day of college',
    desc: 'Moved into dorms at Northeastern. Overwhelmed but excited. No idea what CS even meant.',
    delta: 5,
    positive: true,
    goalAchieved: null,
    speech: 'A brand new <b>beginning</b>! Every expert started exactly here. The sky\'s the limit ✨',
    milestone: 'Started college journey',
    todo: 'Find a club and make one real connection in CS.',
    skillDeltas: { python: 4, finance: 2 },
  },
  {
    label: 'Club',
    month: "2025-09-01",
    title: 'Joined Data Club & AI Club',
    desc: 'Signed up during club fair. Felt like an imposter surrounded by upperclassmen.',
    delta: 8,
    positive: true,
    goalAchieved: null,
    speech: 'Taking initiative this early shows real <b>courage</b>. Community accelerates growth.',
    milestone: 'Joined technical clubs',
    todo: 'Build something small to show at a club meeting.',
    skillDeltas: { python: 5, ml: 3, stats: 3 },
  },
  {
    label: 'Fail',
    month: "2025-10-04",
    title: 'Failed first algorithms quiz',
    desc: "Bombed the recursion section. Spent a week feeling like I didn't belong in CS.",
    delta: -12,
    positive: false,
    goalAchieved: null,
    speech: 'This <b>setback</b> is data, not a verdict. What matters is what comes next.',
    milestone: 'Hit first academic wall',
    todo: 'Go to office hours every week. Master recursion before midterms.',
    skillDeltas: {},
  },
  {
    label: 'Project',
    month: "2025-11-01",
    title: 'Built first Python project',
    desc: 'A simple stock price fetcher using yfinance. Ugly code but it worked. Sent it to 3 friends.',
    delta: 15,
    positive: true,
    goalAchieved: 'Build a project',
    speech: 'Your <b>first real build</b>! Shipping anything is 100x better than planning everything.',
    milestone: 'Shipped first project',
    todo: 'Add a data viz layer and put it on GitHub.',
    skillDeltas: { python: 12, finance: 8, stats: 4 },
  },
  {
    label: 'Cert',
    month: "2025-12-01",
    title: 'Passed Bloomberg BMC',
    desc: 'Grinded Bloomberg Market Concepts over winter break. Took 3 tries on currencies.',
    delta: 10,
    positive: true,
    goalAchieved: null,
    speech: 'Industry <b>certifications</b> signal commitment before you have experience. Smart move.',
    milestone: 'Earned Bloomberg BMC cert',
    todo: 'Complete Akuna Options 101 before spring.',
    skillDeltas: { finance: 15, stats: 5 },
  },
  {
    label: 'Reject',
    month: "2026-01-01",
    title: 'Rejected from 14 internships',
    desc: 'Applied to Microsoft Explore, NVIDIA Ignite, and 12 others. All automated rejections.',
    delta: -18,
    positive: false,
    goalAchieved: null,
    speech: 'Fourteen <b>rejections</b> is fourteen data points. Your pitch wasn\'t ready — yet.',
    milestone: 'Faced internship rejection wave',
    todo: 'Cold email 5 startups directly. Bypass the ATS.',
    skillDeltas: {},
  },
  {
    label: 'Akuna',
    month: "2026-02-01",
    title: 'Completed Akuna Options 101',
    desc: 'Finally understood put/call options and the Greeks. Connected it to the quant track.',
    delta: 8,
    positive: true,
    goalAchieved: 'Finish Akuna cert',
    speech: "Options theory is <b>hard</b>. You now have vocabulary most undergrads don't have for years.",
    milestone: 'Mastered options foundations',
    todo: "Pitch to join Disrupt FinTech's quant team.",
    skillDeltas: { finance: 18, stats: 8 },
  },
  {
    label: 'Quant',
    month: "2026-03-01",
    title: 'Joined FinTech quant team',
    desc: 'Cold emailed the Disrupt FinTech president. Got onto a 15-person team covering stat arb.',
    delta: 20,
    positive: true,
    goalAchieved: 'Join a quant team',
    speech: 'Cold outreach <b>worked</b>. This separates curious students from builders.',
    milestone: 'Joined quant research team',
    todo: 'Contribute a live analysis to the team within 60 days.',
    skillDeltas: { python: 8, finance: 10, stats: 12, sql: 6 },
  },
  {
    label: 'Lead',
    month: "2026-04-01",
    title: 'Became Data Club Tech Lead',
    desc: 'Proposed and got approved to lead an ML classification project on Fed rate impacts.',
    delta: 18,
    positive: true,
    goalAchieved: null,
    speech: 'Leading a <b>technical team</b> as a freshman is rare. Your credibility just compounded.',
    milestone: 'First technical leadership role',
    todo: 'Ship the Fed rate ML model with F1 > 0.60.',
    skillDeltas: { python: 6, ml: 12, stats: 8, sql: 8 },
  },
  {
    label: 'Deploy',
    month: "2026-05-01",
    title: 'Fed Rate ML model live',
    desc: 'Gradient Boosting model (F1=0.661) deployed to Streamlit Cloud. 3 weeks, team of 4.',
    delta: 22,
    positive: true,
    goalAchieved: 'Ship ML to production',
    speech: 'A <b>deployed model</b> with real F1 score is resume gold. This changes your story.',
    milestone: 'Deployed first ML system (F1=0.661)',
    todo: 'Cold pitch 10 firms with this project.',
    skillDeltas: { python: 10, ml: 18, stats: 10, sql: 6, systems: 10 },
  },
  {
    label: 'Intern',
    month: "2026-06-01",
    title: 'Secured Checkit Analytics internship',
    desc: 'Cold pitched Yi Wang with two feature ideas. Got the role without applying through a portal.',
    delta: 30,
    positive: true,
    goalAchieved: 'Land first internship',
    speech: "You <b>built your way in</b>. No referral, no luck — just a strong pitch and real work. 🌟",
    milestone: 'Landed first ML internship via cold pitch',
    todo: 'Build a production NLP pipeline. Make Yi proud.',
    skillDeltas: { python: 6, ml: 8, nlp: 14, systems: 8, finance: 6 },
  },
  {
    label: 'NLP',
    month: "2026-07-01",
    title: 'Reddit Sentiment Analyzer ships',
    desc: 'FastAPI + Next.js app using DistilRoBERTa for financial sentiment. Running on real data at Checkit.',
    delta: 25,
    positive: true,
    goalAchieved: null,
    speech: 'A <b>production NLP pipeline</b> as a freshman intern. This is exceptional output.',
    milestone: 'Shipped production NLP system at Checkit',
    todo: 'Get a testimonial from Yi. Prep for co-op applications.',
    skillDeltas: { python: 10, nlp: 28, ml: 10, systems: 14, sql: 8 },
  },
];
