// js/autofill.js — rule-based autofill for event label, speech, milestone, and todo
// Depends on nothing. Exposed as window.AutofillModule.

const AutofillModule = (() => {

  // Deterministic pick so the same title always maps to the same response.
  function pick(arr, seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    return arr[Math.abs(h) % arr.length];
  }

  // ── Response bank ─────────────────────────────────────────────────────────────

  const BANK = {
    internship: {
      speech: [
        'Landing an <b>internship</b> changes everything — real experience beats any course.',
        'This <b>offer</b> is what all the grinding was for. Make every day count.',
        'Your first <b>professional role</b> in the field. The resume gap just closed.',
        'Cold outreach, applications, interviews — and you <b>broke through</b>. This is huge.',
      ],
      milestone: [
        'Secured first industry internship',
        'Landed professional role in the field',
        'Broke into the industry with a real offer',
        'Got first hands-on work experience',
      ],
      todo: [
        'Set three goals for what you want to learn by the end of the internship.',
        'Connect with your manager before day one — ask what success looks like.',
        'Document everything you build so it goes straight onto your resume.',
        'Find one person at the company to learn from beyond your direct team.',
      ],
    },

    rejection: {
      speech: [
        'Every <b>rejection</b> is data. What does it tell you to do differently?',
        'This <b>setback</b> is not a verdict — it\'s a redirect. Keep moving.',
        'The door closed. That means you\'re now looking for the <b>right door</b>.',
        'Fourteen rejections built the story of one yes. Stay in the <b>process</b>.',
      ],
      milestone: [
        'Faced and processed a rejection',
        'Worked through a significant setback',
        'Absorbed rejection and stayed in the game',
        'Turned a no into a next step',
      ],
      todo: [
        'Write down three things you\'d do differently and act on one this week.',
        'Cold email three people in your target field directly — skip the portal.',
        'Do a post-mortem: what\'s the single most important thing to fix?',
        'Ask for feedback if possible, then update your approach before the next try.',
      ],
    },

    project: {
      speech: [
        'Shipping <b>anything real</b> puts you ahead of everyone still planning.',
        'A working project is 100x more convincing than a perfect one in your head.',
        'You <b>built something</b>. That\'s the whole game at this stage.',
        'Every great portfolio started with something small and <b>shipped</b>. This is it.',
      ],
      milestone: [
        'Shipped first working project',
        'Built and deployed a real product',
        'Completed first end-to-end build',
        'Turned an idea into working software',
      ],
      todo: [
        'Put it on GitHub with a clear README — make it easy for anyone to find.',
        'Show it to three people and write down every piece of feedback they give.',
        'Add one meaningful feature and push a v2 within two weeks.',
        'Write a short post-mortem: what worked, what didn\'t, what you\'d change.',
      ],
    },

    deployment: {
      speech: [
        'A <b>deployed system</b> is proof — it\'s not just code, it\'s a product.',
        'Running in production changes how people talk about your work. <b>Ship more</b>.',
        'This is <b>resume gold</b>. Real deployment with real traffic tells a real story.',
        'Most people only talk about building things. You actually <b>launched</b> one. 🚀',
      ],
      milestone: [
        'Deployed first production system',
        'Shipped working app to production',
        'Launched live product for real users',
        'Took project from local to live',
      ],
      todo: [
        'Add basic monitoring or logging so you know when something breaks.',
        'Share the live link with five people and watch them use it.',
        'Write up the architecture in your notes — you\'ll want this for interviews.',
        'Set a goal for your first real metric: users, uptime, or accuracy.',
      ],
    },

    certification: {
      speech: [
        'Industry <b>certifications</b> signal commitment before you have experience. Smart.',
        'You now have <b>credentials</b> most people your level haven\'t bothered to get.',
        'Passing this cert puts <b>vocabulary</b> in your toolkit that opens real doors.',
        'The knowledge is permanent. The <b>credential</b> opens the first conversation.',
      ],
      milestone: [
        'Earned industry certification',
        'Passed professional credentialing exam',
        'Completed structured certification program',
        'Added verified credential to the toolkit',
      ],
      todo: [
        'Add the certification to your resume and LinkedIn today — don\'t sit on it.',
        'Find the next logical cert in the same area and set a target date.',
        'Teach someone else one concept from the material — it locks it in.',
        'Connect with three people in the field who hold the same credential.',
      ],
    },

    hackathon: {
      speech: [
        'A <b>hackathon</b> compresses a semester of learning into one weekend. Worth it.',
        'You built something under pressure and time constraint. That\'s <b>real skill</b>.',
        'Every project you ship at a hackathon is a story you can tell in an <b>interview</b>.',
        'Most people watch. You <b>built something</b> under pressure. That sets you apart.',
      ],
      milestone: [
        'Competed and shipped at a hackathon',
        'Built a project under competition conditions',
        'Completed first hackathon submission',
        'Delivered working product in time-constrained sprint',
      ],
      todo: [
        'Write up what you built and add it to your portfolio while it\'s fresh.',
        'Keep in touch with your team — hackathon networks often lead to real opportunities.',
        'Take the best idea from the weekend and extend it into a real project.',
        'Find the next hackathon in your area or school and put it on the calendar.',
      ],
    },

    club: {
      speech: [
        'Taking initiative this early shows real <b>courage</b>. Community accelerates growth.',
        'The best technical networks are built in <b>clubs</b> before anyone is impressive.',
        'Being around people who care about the same things <b>compounds fast</b>.',
        'You showed up. Most don\'t. That\'s the first cut in any <b>community</b>.',
      ],
      milestone: [
        'Joined a technical club or organization',
        'Connected with a community in the field',
        'Took first step into professional network',
        'Found peers who share technical interests',
      ],
      todo: [
        'Introduce yourself to one person you don\'t know at the next meeting.',
        'Find one small thing you can contribute — a workshop, a project, a post.',
        'Show up consistently for a full semester before evaluating whether it\'s worth it.',
        'Ask a senior member what they wish they\'d done in their first year.',
      ],
    },

    leadership: {
      speech: [
        'Leading a <b>technical team</b> at this stage is rare. Your credibility just compounded.',
        'People follow those who <b>take ownership</b>. You just proved you\'re one of them.',
        'A <b>leadership role</b> means your mistakes teach others too — embrace that.',
        'You\'re not just growing your own skills now. You\'re <b>multiplying</b> a team\'s.',
      ],
      milestone: [
        'Stepped into first technical leadership role',
        'Took ownership of a team or project',
        'Earned leadership position in the field',
        'Led peers in a structured technical setting',
      ],
      todo: [
        'Have a one-on-one with each team member this month — understand what they need.',
        'Define a concrete goal for the team and write it down where everyone can see it.',
        'Ship something small with the team in the first 30 days to build momentum.',
        'Ask for feedback on your leadership style from someone you trust.',
      ],
    },

    academic: {
      speech: [
        'Grades are feedback, not identity. What does this one tell you to <b>do differently</b>?',
        'The gap between where you are and where you want to be is just <b>deliberate practice</b>.',
        'Every hard exam is a forced <b>learning sprint</b>. What did you actually retain?',
        'Academic struggles are normal. The ones who <b>push through</b> them are not.',
      ],
      milestone: [
        'Completed a key academic milestone',
        'Worked through a challenging course moment',
        'Finished an important academic assessment',
        'Got feedback on academic performance',
      ],
      todo: [
        'Go to office hours at least once before the next exam — it changes the dynamic.',
        'Find one person to study with — explaining the material is the best way to learn it.',
        'Identify the one concept you\'re weakest on and spend focused time this week.',
        'Reach out to the professor by email — most are more accessible than they seem.',
      ],
    },

    networking: {
      speech: [
        'Cold outreach <b>works</b>. This is what separates curious students from builders.',
        'The right <b>conversation</b> can accelerate you by years. Keep meeting people.',
        'Most opportunities are handed to someone\'s <b>network</b>. You\'re building yours.',
        'One real connection in the right room can change the entire <b>trajectory</b>.',
      ],
      milestone: [
        'Made a meaningful professional connection',
        'Successfully cold-reached a person in the field',
        'Expanded network with intentional outreach',
        'Started a professional relationship from scratch',
      ],
      todo: [
        'Follow up within 48 hours — send something useful, not just a thank-you.',
        'Ask if they\'d be open to a 15-minute call about their path.',
        'Add them on LinkedIn with a personalized note about what you talked about.',
        'Turn this contact into an introduction to one more person in their circle.',
      ],
    },

    research: {
      speech: [
        '<b>Research</b> teaches you to ask better questions — that skill compounds forever.',
        'Working on unsolved problems is a completely different kind of <b>growth</b>.',
        'Most students never touch <b>research</b>. You\'re already differentiating.',
        'The ability to read, synthesize, and produce new knowledge is <b>rare</b>. Develop it.',
      ],
      milestone: [
        'Started or contributed to research work',
        'Engaged with open-ended research problem',
        'Joined or contributed to research project',
        'Took first step into academic research',
      ],
      todo: [
        'Read three papers in your area this month — write one paragraph on each.',
        'Ask your advisor what a successful semester looks like from their perspective.',
        'Start a research log to track what you try and what you learn each week.',
        'Present your current progress to one person outside the lab for fresh eyes.',
      ],
    },

    presentation: {
      speech: [
        'The ability to <b>communicate your work</b> is as valuable as the work itself.',
        'Public speaking compounds over time. Every <b>stage</b> gets a little easier.',
        'You showed your work. That takes more courage than building in <b>private</b> forever.',
        'Clear communication is the skill that amplifies everything else you <b>build</b>.',
      ],
      milestone: [
        'Presented work to an audience',
        'Delivered first technical presentation',
        'Showed and explained work publicly',
        'Communicated project to external audience',
      ],
      todo: [
        'Record yourself presenting and watch it back — you\'ll spot the fix immediately.',
        'Seek out the next opportunity to present, even informally.',
        'Ask one attendee for specific feedback on what was most and least clear.',
        'Turn the talk into a written post or README while the material is fresh.',
      ],
    },

    // ── GitHub-specific ──────────────────────────────────────────────────────────

    commit: {
      speech: [
        'Showing up every day is how <b>real skills</b> compound. Another commit, another rep.',
        'The diff is small. The <b>habit</b> is everything. Keep pushing.',
        'Code that ships beats code that\'s perfect. You\'re in the <b>build mode</b> that matters.',
        'Every push is proof you\'re making progress — not just <b>planning</b> to.',
      ],
      milestone: [
        'Shipped code to a live repo',
        'Kept the build cadence going',
        'Committed progress to the codebase',
        'Pushed real work to GitHub',
      ],
      todo: [
        'Write a commit message that explains *why*, not just what you changed.',
        'Run your tests before the next push — catch the bug before it catches you.',
        'Review your own diff before pushing: read it like a code reviewer would.',
        'Add one piece of documentation for what you just built while the context is fresh.',
      ],
    },

    pull_request: {
      speech: [
        'A <b>pull request</b> is how professionals collaborate. You\'re practicing the real workflow.',
        'Code review is a superpower. Every PR you open is a chance to get <b>sharper</b>.',
        'Getting code merged is a <b>professional skill</b>. Every PR builds that muscle.',
        'Collaboration through PRs separates solo coders from <b>team engineers</b>. Keep going.',
      ],
      milestone: [
        'Opened a pull request in a real repo',
        'Contributed via pull request',
        'Got code merged via PR workflow',
        'Practiced professional code collaboration',
      ],
      todo: [
        'Write a clear PR description — what changed, why, and how to test it.',
        'Ask someone to review it. A second pair of eyes catches more than you think.',
        'Respond to every review comment, even if you don\'t change the code.',
        'Check the CI status before merging — a green build is a habit worth keeping.',
      ],
    },

    repo_created: {
      speech: [
        'A blank repo is full of <b>potential</b>. The first commit is the hardest one.',
        'Starting a new project is a commitment to seeing it through. Make the <b>first push</b> count.',
        'Every great open source project started with a single <b>init commit</b>. This is yours.',
        'Ideas are free. Repos with code in them are <b>rare</b>. You made one.',
      ],
      milestone: [
        'Initialized a new GitHub repository',
        'Started a fresh project from scratch',
        'Created a new codebase to build on',
        'Kicked off a new project with a real repo',
      ],
      todo: [
        'Write a README before you write the second feature — future you will thank you.',
        'Set up a .gitignore right now so you never accidentally commit credentials.',
        'Push your first working commit within 48 hours — don\'t let the repo stay empty.',
        'Add a license file if this is meant to be open source.',
      ],
    },

    issue: {
      speech: [
        'Filing an issue is the first step in <b>fixing</b> it. You\'re already ahead.',
        'Tracking work in issues is how <b>professional teams</b> stay aligned. Good habit.',
        'Every closed issue is a small <b>victory</b> worth logging.',
        '<b>Issue-driven development</b> keeps you focused on what actually matters. Keep it up.',
      ],
      milestone: [
        'Tracked work through a GitHub issue',
        'Filed or resolved a real code issue',
        'Managed project work through issue tracking',
        'Closed an issue and moved the project forward',
      ],
      todo: [
        'Add a label and milestone to the issue so you can filter later.',
        'Reproduce the bug with a minimal example before you try to fix it.',
        'Link the issue to the PR that closes it — `Closes #N` in the PR description.',
        'Write a clear issue title that explains the expected vs. actual behavior.',
      ],
    },

    fork: {
      speech: [
        '<b>Open source</b> is where the real world lives. Forking is how you get in.',
        'Learning from a real codebase beats any tutorial. You\'re in the <b>source now</b>.',
        'Forking says: I want to <b>understand how this works</b>. That curiosity compounds.',
        'Every open source contributor started with a fork. You\'re one step <b>closer</b>.',
      ],
      milestone: [
        'Forked an open source repository',
        'Explored a real-world codebase via fork',
        'Took first step toward open source contribution',
        'Engaged with the open source ecosystem',
      ],
      todo: [
        'Read the CONTRIBUTING.md before making changes — every project has rules.',
        'Find one small open issue you could fix and put up a PR.',
        'Clone it locally and run the tests — understand how it works before you change it.',
        'Note what you learn from reading this code — it belongs in your portfolio.',
      ],
    },

    release: {
      speech: [
        'A versioned <b>release</b> is a line in the sand. You shipped something worth tagging.',
        'Most projects never make it to a release. You\'re in the <b>minority that ships</b>.',
        'Tagging a release says: this version is <b>real and stable</b>. That\'s a real milestone.',
        'Releases are what turn a project into a <b>product</b>. This one counts.',
      ],
      milestone: [
        'Published a versioned GitHub release',
        'Shipped a tagged release to the world',
        'Reached a stable release milestone',
        'Delivered a production-ready release',
      ],
      todo: [
        'Write release notes that explain what changed and why users should upgrade.',
        'Announce the release where your users are — GitHub, Reddit, LinkedIn, Discord.',
        'Tag any open issues that this release closes so the tracker stays clean.',
        'Plan what goes into the next version before the momentum fades.',
      ],
    },

    // ── Fallbacks ───────────────────────────────────────────────────────────────

    positive: {
      speech: [
        'Every step forward <b>compounds</b>. This one matters more than it looks.',
        'Progress is rarely linear, but you\'re moving in the <b>right direction</b>.',
        'Small wins stack. This is another <b>brick in the wall</b> you\'re building.',
        'You did the thing. That sounds simple, but most people <b>don\'t</b>.',
      ],
      milestone: [
        'Made meaningful forward progress',
        'Completed an important personal milestone',
        'Moved the needle in a positive direction',
        'Took a step that will matter later',
      ],
      todo: [
        'Capture what made this work — repeat that approach on the next challenge.',
        'Tell someone about it. Articulating a win cements what you learned.',
        'Set the next milestone before the momentum fades.',
        'Rest, then define what you\'re optimizing for next.',
      ],
    },

    negative: {
      speech: [
        'This <b>setback</b> is data, not a verdict. What does it tell you to change?',
        'Hard moments are part of every real journey. What matters is the <b>response</b>.',
        'The path was never going to be straight. Keep your <b>direction</b> clear.',
        'Everyone who succeeded hit walls like this. What you do <b>next</b> is the story.',
      ],
      milestone: [
        'Encountered and processed a setback',
        'Worked through a difficult challenge',
        'Faced a hard moment in the journey',
        'Documented a lesson from a rough patch',
      ],
      todo: [
        'Write down the one concrete change you\'ll make before trying again.',
        'Give yourself 24 hours, then make a plan — don\'t sit with it too long.',
        'Find someone who\'s been through something similar and ask how they got past it.',
        'Separate what you can control from what you can\'t, then act on the former.',
      ],
    },
  };

  // ── Label map ─────────────────────────────────────────────────────────────────

  const LABEL_RULES = [
    [/\bstart\b|first day|begin|orientation/,        'Start'],
    [/intern|co-?op|offer letter|got the job|hired/,  'Intern'],
    [/reject|denial|waitlist|turned down|no offer/,   'Reject'],
    [/fail|bombed|failed|tanked/,                     'Fail'  ],
    [/deploy|launched|live|production|in prod/,       'Deploy'],
    [/ship|shipped|released|published|went live/,     'Ship'  ],
    [/project|built|built a|created|made a/,          'Proj'  ],
    [/hackathon|hacks|hacked/,                        'Hack'  ],
    [/competition|contest|challenge|placed|won/,      'Comp'  ],
    [/cert|certif|badge|credential|passed.*course/,   'Cert'  ],
    [/club|society|org\b|chapter|student group/,      'Club'  ],
    [/team\b|joined.*team|squad/,                     'Team'  ],
    [/lead|led\b|officer|president|director|founded/, 'Lead'  ],
    [/research|lab\b|paper|publication|professor/,    'Rsrch' ],
    [/present|demo|talk\b|showcase|pitch/,            'Demo'  ],
    [/exam|quiz|midterm|final|test\b|scored/,         'Exam'  ],
    [/network|coffee chat|cold email|linkedin|referr/, 'Net'  ],
    [/award|prize|scholarship|honor|fellowship/,      'Award' ],
    [/job|full.?time|return offer|converted/,         'Job'   ],
    [/nlp|bert|gpt|transformer|sentiment/,            'NLP'   ],
    [/ml|machine learning|model|train|sklearn/,       'ML'    ],
    [/sql|database|query|postgres|mysql/,             'SQL'   ],
    [/python|pandas|numpy|flask|fastapi/,             'Py'    ],
    [/finance|stock|trading|quant|option|market/,     'Fin'   ],
  ];

  function generateLabel(title) {
    const t = title.toLowerCase();
    for (const [re, label] of LABEL_RULES) {
      if (re.test(t)) return label;
    }
    // Fall back to first word, capped at 6 chars
    const first = title.trim().split(/\s+/)[0] || '';
    return first.charAt(0).toUpperCase() + first.slice(1, 6);
  }

  // ── Category detection ────────────────────────────────────────────────────────

  const CATEGORY_RULES = [
    // GitHub-imported event titles are detected first (specific patterns)
    ['commit',       /^pushed to |pushed to .+\+\d+ more push/],
    ['pull_request', /merged pr:|opened pr:|closed pr:/],
    ['repo_created', /created repo:/],
    ['issue',        /opened issue:|closed issue:/],
    ['release',      /^released .+—|published release/],
    ['fork',         /^forked /],

    ['internship',   /intern|co-?op|offer letter|got the job|hired|job offer/],
    ['rejection',    /reject|denied|waitlist|turned down|no offer|didn.t get/],
    ['deployment',   /deploy|live|production|in prod|launched.*app|streamlit|heroku|vercel/],
    ['project',      /project|built|shipped|created|made a|finished building/],
    ['hackathon',    /hackathon|hack.*weekend|hacked|hacks/],
    ['certification',/cert|certif|badge|credential|bloomberg|akuna|aws|google cert/],
    ['leadership',   /lead|led\b|officer|president|director|founded|became.*head|tech lead/],
    ['research',     /research|lab\b|paper|publication|professor|thesis|dissertation/],
    ['presentation', /present|demo\b|talk\b|showcase|pitched|keynote|seminar/],
    ['networking',   /coffee chat|cold email|cold outreach|linkedin|network|referral|met with/],
    ['club',         /club|society|org\b|chapter|student group|joined.*group/],
    ['academic',     /exam|quiz|midterm|final|test\b|grade|assignment|scored|gpa|class/],
    ['hackathon',    /competition|contest|placed|won.*award|first place/],
  ];

  function detectCategory(title, desc, delta) {
    const text = (title + ' ' + desc).toLowerCase();
    for (const [cat, re] of CATEGORY_RULES) {
      if (re.test(text)) return cat;
    }
    return delta >= 0 ? 'positive' : 'negative';
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  function generate(title, desc, delta) {
    const category = detectCategory(title, desc, delta);
    const bucket   = BANK[category];
    const seed     = title + desc;

    return {
      label:     generateLabel(title),
      speech:    pick(bucket.speech,     seed),
      milestone: pick(bucket.milestone,  seed + 'm'),
      todo:      pick(bucket.todo,       seed + 't'),
    };
  }

  return { generate };
})();
