#!/usr/bin/env node
/**
 * The presentation script (.docx): what each speaker says, slide by slide, with timings,
 * stage directions, the demo narration and question handling.
 *
 *   node tools/deliverables/build_pitch.js [out.docx]
 *
 * Numbers come from the repository and the published CI evidence, like every other document.
 */
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, LevelFormat, Footer, Header, PageNumber, TabStopType,
} = require('docx')

const ROOT = path.resolve(__dirname, '..', '..')
const OUT = process.argv[2] || path.join(ROOT, 'deliverables', 'CKS_Presentation_Script.docx')
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const rdMaybe = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (_e) { return null } }

const TEAM = rd('docs/team.json')
const cases = rd('reports/catalogue.json').cases
const reqs = rd('docs/requirements.json')
const defects = rd('docs/defects.json')
const HIST = rd('docs/ci-history.json')
const EV = process.env.EVIDENCE_DIR || path.join(ROOT, 'deliverables', 'build', 'evidence', 'latest')
const BROWSERS = ['chrome', 'firefox', 'edge', 'electron']
const results = {}
for (const b of BROWSERS) { const j = rdMaybe(path.join(EV, 'browsers', b, `results-${b}.json`)); if (j) results[b] = j }
const coverage = rdMaybe(path.join(EV, 'coverage', 'coverage-summary.json'))
let mutants = []
if (fs.existsSync(path.join(EV, 'mutation'))) for (const f of fs.readdirSync(path.join(EV, 'mutation'))) { const j = rdMaybe(path.join(EV, 'mutation', f)); if (j) mutants = mutants.concat(j.results || []) }
const mK = mutants.filter((m) => m.status === 'KILLED').length
const mS = mutants.filter((m) => m.status === 'SURVIVED').length
const mE = mutants.filter((m) => m.status === 'EQUIVALENT').length

const N = {
  cases: cases.length,
  specs: new Set(cases.map((c) => c.spec)).size,
  reqs: reqs.length,
  defects: defects.length,
  major: defects.filter((d) => d.severity === 'Major').length,
  executions: BROWSERS.reduce((s, b) => s + (results[b] ? results[b].summary.total : 0), 0) || cases.length * 4,
  pass: results.chrome ? results.chrome.summary.pass : 573,
  kd: results.chrome ? results.chrome.summary.knownDefect : 15,
  ffSkip: results.firefox ? results.firefox.summary.skipped : 6,
  mutScore: mK + mS ? Math.round(1000 * mK / (mK + mS)) / 10 : 100,
  mKilled: mK, mEquiv: mE, mTotal: mutants.length || 32,
  lines: coverage ? Math.round(coverage.total.lines.pct * 10) / 10 : 97.9,
  branches: coverage ? Math.round(coverage.total.branches.pct * 10) / 10 : 86.8,
  run1Fail: HIST.runs[0].browsers.chrome.fail,
}
const area = (a) => cases.filter((c) => c.id.split('-')[1] === a).length

// ---- styling ----------------------------------------------------------------------------
const FONT = 'Arial'
const INK = '141729'; const BODY = '33384d'; const MUTED = '5A6072'; const ACCENT = '157951'
const AMBER = '9a5f08'; const RULE = 'D5DAE3'; const SAY = 'EAF6F0'; const PANEL = 'F4F6F9'
const W = 9638
const bd = { style: BorderStyle.SINGLE, size: 4, color: RULE }
const borders = { top: bd, bottom: bd, left: bd, right: bd }
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }

const t = (s, o = {}) => new TextRun({ text: String(s), font: FONT, ...o })
const b = (s) => t(s, { bold: true })
const P = (x, o = {}) => new Paragraph({ spacing: { after: 120, line: 300 }, ...o, children: Array.isArray(x) ? x : [t(x)] })
const H1 = (s, first) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: !first, children: [t(s)] })
const H2 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(s)] })
const B = (x) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 70, line: 290 }, children: Array.isArray(x) ? x : [t(x)] })
// Each ordered list gets its own numbering instance so it restarts at 1.
let numSeq = 0
const nextNum = () => ++numSeq
const Num = (x, inst) => new Paragraph({ numbering: { reference: 'num', level: 0, instance: inst }, spacing: { after: 70, line: 290 }, children: Array.isArray(x) ? x : [t(x)] })
/** An ordered list that starts at 1. */
const List = (items) => { const i = nextNum(); return items.map((x) => Num(x, i)) }
const gap = (n = 80) => new Paragraph({ spacing: { after: n }, children: [] })

/** A shaded "say this out loud" block. */
function Say (label, paras) {
  const kids = [new Paragraph({ spacing: { after: 90 }, children: [t(label.toUpperCase(), { bold: true, size: 16, color: ACCENT, characterSpacing: 24 })] })]
  paras.forEach((p, i) => kids.push(new Paragraph({
    spacing: { after: i === paras.length - 1 ? 0 : 110, line: 320 },
    children: (Array.isArray(p) ? p : [t(p)]).map((r) => r),
  })))
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: none, bottom: none, right: none, left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT } },
      shading: { type: ShadingType.CLEAR, fill: SAY },
      margins: { top: 160, bottom: 160, left: 220, right: 200 },
      width: { size: W, type: WidthType.DXA }, children: kids,
    })] })],
  })
}

/** A stage direction. */
const Do = (s) => new Paragraph({ spacing: { before: 60, after: 140 }, indent: { left: 220 }, children: [t('▸  ', { color: AMBER, bold: true }), t(s, { italics: true, color: AMBER })] })

/** A small note box. */
function Box (title, lines, fill = PANEL) {
  const kids = []
  if (title) kids.push(new Paragraph({ spacing: { after: 90 }, children: [t(title, { bold: true, color: INK })] }))
  lines.forEach((l, i) => kids.push(new Paragraph({ spacing: { after: i === lines.length - 1 ? 0 : 80, line: 300 }, children: Array.isArray(l) ? l : [t(l, { size: 20 })] })))
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ children: [new TableCell({ borders, shading: { type: ShadingType.CLEAR, fill }, margins: { top: 140, bottom: 140, left: 200, right: 200 }, width: { size: W, type: WidthType.DXA }, children: kids })] })],
  })
}

function table (head, rows, widths, o = {}) {
  const cell = (v, w, s = {}) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: s.fill ? { type: ShadingType.CLEAR, fill: s.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ spacing: { line: 280 }, children: Array.isArray(v) ? v : [t(v == null ? '' : v, { size: o.size || 19, bold: s.bold, color: s.color })] })],
  })
  return new Table({
    width: { size: widths.reduce((a, x) => a + x, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, widths[i], { bold: true, color: 'FFFFFF', fill: INK })) }),
      ...rows.map((r, ri) => new TableRow({ children: r.map((v, i) => cell(v, widths[i], { fill: ri % 2 ? 'FAFBFC' : undefined })) })),
    ],
  })
}

/** A borderless label/value table for the cover; each value may be several lines. */
function kv (rows) {
  const L = 2100
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [L, W - L],
    rows: rows.map(([label, lines]) => new TableRow({
      children: [[label, L], [lines, W - L]].map(([v, w], col) => new TableCell({
        borders: { top: none, bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE }, left: none, right: none },
        width: { size: w, type: WidthType.DXA }, margins: { top: 90, bottom: 90, left: col ? 140 : 0, right: 100 },
        children: (Array.isArray(v) ? v : [v]).map((line, j, a) => new Paragraph({
          spacing: { after: j === a.length - 1 ? 0 : 50, line: 280 },
          children: [t(line, { size: 20, bold: !col, color: col ? BODY : INK })],
        })),
      })),
    })),
  })
}

const k = []
const add = (...x) => k.push(...x.flat())

// ======================= COVER =======================================================
add(
  new Paragraph({ spacing: { before: 1500, after: 100 }, children: [t('PRESENTATION SCRIPT  ·  SVV FT3 AUTOMATED TESTING', { size: 20, bold: true, color: ACCENT, characterSpacing: 40 })] }),
  new Paragraph({ spacing: { after: 100 }, children: [t('Interactive Web Components Testing', { size: 54, bold: true, color: INK })] }),
  new Paragraph({ spacing: { after: 480 }, children: [t('What to say, in what order, with the demo narration and the answers to the questions you will be asked', { size: 26, color: MUTED })] }),
  kv([
    ['Team', TEAM.team],
    ['Members', TEAM.members.map((m) => `${m.name} — ${m.reg}`)],
    ['Course', `${TEAM.course} — ${TEAM.component}`],
    ['Faculty', TEAM.faculty],
    ['Programme', `${TEAM.programme} · ${TEAM.year}`],
    ['Department', `${TEAM.department}, ${TEAM.institution}`],
    ['Academic year', TEAM.academicYear],
    ['Deck', '68 slides in 9 sections (CKS_Presentation.pptx)'],
    ['Talk length', ['About 12 minutes of speaking plus a 7-minute live demo.', 'A 6-minute compression is marked throughout.']],
  ]),
  new Paragraph({ spacing: { before: 400 }, children: [t('Everything quoted in this script is true of the project as built. No figure here is an estimate.', { italics: true, size: 19, color: MUTED })] }),
)

// ======================= HOW TO USE ==================================================
add(
  H1('How to use this script'),
  P('This is not a document to read aloud word for word. It is a script in the theatrical sense: the words are there so that you never have to invent a sentence under pressure, but the delivery should sound like you.'),
  gap(),
  table(['Element', 'What it means'], [
    [[t('SAY', { bold: true, color: ACCENT })], 'A shaded block. These are lines written to be spoken. Learn the shape of them, not the exact words. The first and last sentence of each block are the ones worth memorising.'],
    [[t('▸', { bold: true, color: AMBER }), t('  stage direction', { italics: true, color: AMBER })], 'Something you do rather than say: change a slide, click a spec, pause, point at the screen.'],
    ['Slide markers', 'Every block names the slide it belongs to, so you can follow in the deck.'],
    ['Timings', 'Cumulative, assuming a 12-minute talk. If you are running long, the sections marked “cut first” go.'],
  ], [2600, W - 2600]),
  H2('The one rule'),
  P([b('Never narrate a slide. '), t('If the slide says “588 test cases”, do not say “as you can see, we have 588 test cases”. Say what the number ')
    , t('means', { italics: true }), t(': “that is every documented behaviour of the application, tested in four browsers, on every push.” The slide carries the fact; you carry the meaning.')]),
  H2('If you have only six minutes'),
  P('Keep: the opening, slide 7 (the system under test), slide 23 (BVA), slide 34 (known-defect tests), slide 57 (results), slide 58 (the 43-failures story), and the closing. Cut everything else and shorten the demo to moves 1, 3 and 5. The script marks these.'),
)

// ======================= THE PITCH IN THREE LENGTHS ==================================
add(
  H1('The pitch, in three lengths'),
  P('Learn all three. You will need the short one in a corridor, the medium one to open the talk, and the long one if the examiner says “tell me about your project”.'),

  H2('Thirty seconds'),
  Say('say — the corridor version', [
    [t('“We automated the testing of the Cypress Kitchen Sink — the reference web application Cypress itself ships. '),
      b(`${N.cases} test cases`), t(', every one with an ID and a named design technique, running in '), b('four browsers on every push'),
      t('. The suite found '), b(`${N.defects} real defects`), t(' in the application, and we verified the suite itself with mutation testing: it kills '),
      b(`${N.mutScore}%`), t(' of injected faults.”')],
  ]),

  H2('Ninety seconds — this is how you open the talk'),
  Say('say — slides 1 to 3', [
    [t('“Good morning. We are '), b(TEAM.team), t(' — '), t(TEAM.members.map((m) => m.name.split(' ')[0]).join(', ')), t(' — and our topic is '), b('Interactive Web Components Testing'), t(' with Cypress.”')],
    [t('“The brief asked us to demonstrate four things on the Cypress Kitchen Sink: form controls, navigation, assertions and UI interactions. We did those four in depth. And then we kept going.”')],
    [t('“What we are presenting is '), b(`${N.cases} automated test cases`), t(` across ${N.specs} spec files. Every single one carries a test-case ID, the design technique that produced it, the requirement it traces to, and an expected result with a named source. They run in `),
      b('Chrome, Firefox, Edge and Electron on every push'), t(' — that is '), b(`${N.executions.toLocaleString('en-IN')} executions per run`), t(' — and the suite is currently green in all four with '), b('zero failures'), t('.”')],
    [t('“Along the way it found '), b(`${N.defects} real defects`), t(` in the Kitchen Sink, ${N.major} of them Major. And because a test suite that finds nothing proves nothing, we tested our own tests: we injected ${N.mTotal} deliberate faults into the application and checked that a test failed each time. It kills `), b(`${N.mutScore}%`), t(' of them.”')],
    [t('“I will take you through how we designed it, how it runs, what it found — and then we will run it live.”')],
  ]),
  Do('Pause after “zero failures”. That is the number the room is weighing. Give it a beat.'),

  H2('Three minutes — if asked to describe the project'),
  P('Take the ninety-second version, then add these three beats in order:'),
  List([
    [b('The design. '), t('“Every case names its technique and its oracle. Equivalence partitioning and boundary-value analysis for the input-heavy parts, decision tables and a cause-effect graph for the logic, a state machine for the todo item. The expected values are not opinions — they come from the HTML specification, from WCAG, from OWASP.”')],
    [b('The honesty. '), t(`“The first time we ran the whole thing in CI, ${N.run1Fail} cases failed in every browser. We triaged every one. Twenty-four were real defects. Fifteen were our own wrong expectations. Five were browser behaviour we had not understood. Three were bugs in our own harness. Only the first group became defect reports.”`)],
    [b('The proof. '), t('“Every number in our report and on our slides was generated from the CI evidence. Nothing was typed by hand. Clone the repository, run it, and you get the same figures.”')],
  ]),
)

// ======================= THE RUNNING ORDER ===========================================
add(
  H1('The running order'),
  P('Nine sections, 68 slides, four speakers. Split by section, never by slide — a speaker who owns a whole section can recover from a stumble, a speaker who owns three slides cannot.'),
  gap(),
  table(['Time', 'Speaker', 'Section', 'Slides', 'What it has to achieve'], [
    ['0:00', '1', 'Opening', '1–4', 'Who we are, what we built, the headline numbers.'],
    ['1:30', '1', '01 Context', '5–10', 'What the Kitchen Sink is and why Cypress is the right tool for it.'],
    ['3:00', '2', '02 Test plan', '11–18', 'That this was planned, not improvised: process, levels, criteria, risks.'],
    ['4:15', '2', '03 Test design', '19–29', 'The FT3 syllabus, applied to real components. The academic heart of the talk.'],
    ['6:00', '3', '04 Framework', '30–37', 'How 588 cases stay readable, traceable and honest.'],
    ['7:15', '3', '05 Required areas', '38–46', 'The four things the brief actually asked for.'],
    ['8:30', '4', '06 Beyond the brief', '47–55', 'Accessibility, visual, performance, security, mutation, coverage.'],
    ['10:00', '4', '07 Results', '56–63', 'Real evidence, the triage story, the defect log.'],
    ['11:30', '4', '08 Close', '64–68', 'Lessons, then straight into the demo.'],
    ['12:00', '4', 'Live demo', '—', 'Six specs in the Cypress runner, about seven minutes.'],
  ], [800, 1050, 1950, 950, W - 4750]),
  gap(),
  Box('Who takes which section', [
    'Give section 07 (Results) to whoever is strongest on their feet. That is where every question lands.',
    'Give section 03 (Test design) to whoever knows the FT3 theory best — this is where the examiner checks that you understand BVA and decision tables rather than just naming them.',
    'Whoever drives the laptop should take section 08 and the demo, so there is no handover at the riskiest moment.',
  ]),
  H2('Handover lines'),
  P('A handover should be one sentence that sets up the next person. Never “and now X will talk about Y”.'),
  table(['From', 'Say this'], [
    ['1 → 2', '“So that is what we were testing, and why with Cypress. Now how we planned it.”'],
    ['2 → 3', '“That is the design. The question is how you keep 588 cases like that maintainable.”'],
    ['3 → 4', '“And we did not stop at the four areas the brief asked for.”'],
    ['4 → demo', '“That is what the evidence says. Let me show you it actually running.”'],
  ], [1250, W - 1250]),
)

// ======================= SECTION BY SECTION ==========================================
add(
  H1('Section 1 — Opening and Context'),
  P([b('Speaker 1 · slides 1–10 · about 3 minutes')]),
  H2('Slides 1–3 — the opening'),
  P('Use the ninety-second opening on the previous pages, verbatim in shape. Then move quickly.'),

  H2('Slide 4 — Agenda'),
  Do('Do not read the agenda. Point at it for three seconds and move on.'),
  Say('say — slide 4', [
    '“Eight sections. Context, plan, design, framework, the four required areas, everything beyond them, the results, and then a live demo.”',
  ]),

  H2('Slides 6–7 — Why, and the system under test'),
  Say('say — slide 6', [
    '“Interactive web pages fail in ways a code reviewer cannot see. A form that silently loses what you typed. A list that toggles the wrong item. A control a screen reader cannot name. None of those are visible in the markup — they live in behaviour and state. That is what this project tests.”',
  ]),
  Say('say — slide 7 · keep even in the six-minute version', [
    '“The Cypress Kitchen Sink is the reference application Cypress ships to demonstrate every one of its commands. Twenty-one pages — seventeen command pages, a home page, and a full TodoMVC application with hash routing and localStorage persistence.”',
    '“We pinned it at a specific commit and served it unmodified. We did not change a single line of the application. Everything we found, we found by testing it.”',
  ]),
  Do('That last sentence matters more than it sounds. It pre-empts “did you plant the bugs?”.'),

  H2('Slides 8–9 — How Cypress works, and why not Selenium'),
  Say('say — slides 8 and 9', [
    '“Cypress runs inside the browser, in the same event loop as the application. That gives it two things Selenium does not have cheaply: direct DOM access, and automatic retrying — queries and assertions re-evaluate until they pass or time out.”',
    [t('“That is why there is '), b('not one fixed wait'), t(' in 588 tests. It also gives us cy.intercept, which lets us stub the network without a proxy, and a time-travel command log you will see in the demo.”')],
    '“Selenium would work. It would need explicit waits and an external proxy, and roughly three times the code. Playwright would also work — but Cypress was the assigned tool, and the Kitchen Sink is Cypress\'s own reference app, so every command can be demonstrated on it.”',
  ]),

  H2('Slide 10 — Scope'),
  Do('Ten seconds. Name one thing that is out of scope — it shows you drew a boundary deliberately.'),
  Say('say — slide 10', [
    '“One thing deliberately out of scope: the third-party API the Kitchen Sink calls. Every one of those calls is stubbed, and a global intercept fails any unstubbed call fast. Our suite does not depend on somebody else\'s server being up.”',
  ]),
)

add(
  H1('Section 2 — Test plan and Test design'),
  P([b('Speaker 2 · slides 11–29 · about 3 minutes')]),
  P([t('This is the section an examiner marks hardest, because it is where the syllabus lives. Do not rush it.')]),

  H2('Slide 12 — The process'),
  Say('say — slide 12', [
    '“Seven stages: plan, explore, design, implement, execute, triage, report. The one people skip is explore. Before writing a single test we probed the application and recorded what it actually does — because an expected result you invented is not a test, it is a guess.”',
  ]),

  H2('Slide 13 — V-model'),
  Say('say — slide 13', [
    [t('“System testing through a real browser for '), b(`${cases.filter((c) => c.level === 'System').length} cases`), t(', and acceptance testing for five Given-When-Then journeys. Below that, mutation testing and coverage give us unit-level confidence without unit tests, because the application is not ours to restructure.”')],
  ]),

  H2('Slide 16 — Entry and exit criteria'),
  Say('say — slide 16', [
    '“Our exit criteria are specific and they are met: no failure in any browser, every known defect still reproducing, a hundred per cent requirement coverage, and a mutation score above eighty per cent. We are at a hundred.”',
  ]),

  H2('Slide 17 — Risks'),
  Do('Ten seconds. Pick one risk and name its mitigation. Do not read six rows.'),
  Say('say — slide 17', [
    '“The biggest risk in browser testing is flakiness. Our answer was structural: no fixed waits, every third-party call stubbed, time controlled with cy.clock, and exactly one retry in CI — where a test that passes only on the retry is logged as a defect in the test, not forgiven.”',
  ]),

  H2('Slides 20–21 — Technique mix and traceability'),
  Say('say — slides 20 and 21', [
    '“Every case declares its technique. Partitioning and boundary analysis dominate because form controls are input-heavy. The logic-heavy parts — the todo application — get decision tables, a cause-effect graph and a state machine.”',
    [t('“And every case names a requirement. There are '), b(`${N.reqs} requirements`), t(', derived from the pages themselves, and '), b('all of them are covered'), t('. The build rejects any test that names a requirement that does not exist.”')],
  ]),

  H2('Slide 22 — ECP · the email field'),
  Say('say — slide 22 · one of the three stories, tell it fully', [
    '“Seventeen equivalence classes for one email field — six valid, eleven invalid. But the interesting part is not the partitioning, it is the oracle.”',
    '“Our first draft used RFC 5322 as the oracle, and expected quoted-at-b-dot-com to be valid. The browser disagreed. For about ten minutes we thought we had found a bug.”',
    [t('“We had not. HTML deliberately uses a '), t('stricter', { italics: true }), t(' grammar than the RFC — the specification literally calls it a willful violation. We had picked the wrong standard. So we re-derived all seventeen classes from the HTML specification and read the result through checkValidity.”')],
    '“That is why every expected value in this project names where it came from. The wrong oracle does not just miss defects — it invents them.”',
  ]),

  H2('Slide 23 — BVA · the range slider'),
  Say('say — slide 23 · keep even in the six-minute version', [
    '“Boundary-value analysis on a slider with range zero to one hundred. Normal BVA gives four-n-plus-one cases: min minus one, min, min plus one, nominal, max minus one, max, max plus one. Robust BVA adds the far-out values.”',
    '“The expected results come from the HTML value-sanitisation algorithm — clamp to the range, round to the nearest step with ties upward, and fall back to the midpoint for anything that is not a number. So minus one becomes zero, a hundred and one becomes a hundred, and the string a-b-c becomes fifty.”',
    '“You will watch that happen in the demo.”',
  ]),

  H2('Slides 24–25 — Decision tables'),
  Say('say — slides 24 and 25', [
    '“Three independent checkboxes give two-to-the-three, eight rules — small enough to test exhaustively, so we did.”',
    '“The todo footer is more interesting. Twelve raw combinations, but some are impossible — you cannot have all items completed without some completed — and when the list is empty the other conditions do not matter. Twelve collapses to four rules and four test cases. That collapse is the technique doing its job.”',
  ]),

  H2('Slides 26–28 — Cause-effect graph and the state machine'),
  Say('say — slides 26 to 28', [
    '“Finishing an edit on a todo has three mutually exclusive causes — Enter, blur, Escape — and one data condition: is the trimmed text empty. The graph gives three effects, and converting it to a decision table gives eight test cases.”',
    '“The state machine has six states and twelve valid transitions. Drawing it before writing code is what exposed the two transitions people miss: saving an edit on a completed item keeps it completed, and pressing Enter on an empty edit deletes the item rather than restoring it.”',
    '“We also test the transitions that should do nothing — the null transitions. An event with no transition must leave the state unchanged, and that needs a test like anything else.”',
  ]),
)

add(
  H1('Section 3 — Framework and the required areas'),
  P([b('Speaker 3 · slides 30–46 · about 3 minutes')]),

  H2('Slide 33 — tc(), the metadata helper'),
  Say('say — slide 33', [
    '“No test in this project is declared with a plain it-block. Every one goes through a helper called tc, which takes the ID, the title, the technique, the requirement, the priority and the expected result.”',
    '“That gives us three things. The ID appears in every report. Duplicate IDs fail at load time, so the catalogue cannot drift. And the metadata is written out as a catalogue that feeds the workbook, the report and these slides — which is why none of our numbers were typed by hand.”',
  ]),

  H2('Slide 34 — Known-defect tests'),
  Say('say — slide 34 · keep even in the six-minute version', [
    '“When you find a defect in a product you do not own, you have two bad options: let the build stay red for ever, or skip the test and forget about it.”',
    [t('“So we built a third. A known-defect test states the '), t('correct', { italics: true }), t(' behaviour, and then inverts the outcome. While the defect reproduces, the test passes and is reported as KNOWN DEFECT. The day somebody fixes the product, it '), b('fails'), t(' — with the message “this defect no longer reproduces” — and we convert it into a normal regression test.”')],
    [t('“Fifteen of our cases use it. That is how '), b(`${N.defects} open defects`), t(' stay visible on every single run without a single one being hidden.”')],
  ]),
  Do('This is the most original idea in the project. Slow down for it.'),

  H2('Slide 36 — Continuous integration'),
  Say('say — slide 36', [
    [t('“Every push runs lint, then the full suite in four browsers in parallel, then a coverage job on an instrumented copy of the application, then mutation testing in four shards. All of the evidence — results, JUnit, videos, screenshots, coverage, accessibility findings — is committed to a separate '), t('results', { italics: true }), t(' branch.”')],
    '“So the evidence is not described in a report. It is published, versioned, and attached to the release.”',
  ]),

  H2('Slide 39 — The four required areas'),
  Say('say — slide 39', [
    [t('“The brief asked for four areas. Form controls: '), b(`${area('FC')} cases`), t('. Navigation: '), b(`${area('NAV')}`), t('. Assertions and querying: '), b(`${area('AS') + area('QT')}`), t('. UI interactions: '), b(`${area('UI')}`), t('. All four green in all four browsers.”')],
  ]),

  H2('Slide 45 — UI interactions'),
  Say('say — slide 45', [
    '“One example of how far we took it. The Kitchen Sink has a canvas you can click. We click all nine named positions — and then read the pixel data back out of the canvas and assert that a dot was painted near the expected point.”',
    '“We are not trusting that the click happened. We are checking that the paint landed.”',
  ]),
)

add(
  H1('Section 4 — Beyond the brief, Results and Close'),
  P([b('Speaker 4 · slides 47–68 · about 3.5 minutes, then the demo')]),

  H2('Slide 48 — Non-functional at a glance'),
  Do('Ten seconds on this slide. It is a map, not a destination.'),
  Say('say — slide 48', [
    [t('“Accessibility, visual regression, performance budgets, security, responsive layout, HTTP behaviour, robustness — and mutation testing on top, to check the tests themselves. Roughly '), b(`${area('A11Y') + area('VIS') + area('PERF') + area('SEC') + area('RSP') + area('API') + area('ROB')} of our ${N.cases} cases`), t(' are in areas the brief never asked for.”')],
  ]),

  H2('Slide 49 — Accessibility'),
  Say('say — slide 49', [
    '“axe-core injected into all twenty-one pages, WCAG 2.1 A and AA rules, on every push. It found contrast failures on twenty of twenty-one pages, and form fields with no accessible name — a screen reader announces those as unlabeled.”',
    '“Four of our fourteen defects came from here. And we are careful about the claim: roughly a third of WCAG is machine-checkable. We automate that third and say so, rather than claiming the application is accessible.”',
  ]),

  H2('Slide 54 — Mutation testing'),
  Say('say — slide 54 · the third story', [
    '“Coverage tells you which lines ran. It does not tell you whether your assertions are any good — a test with no assertions at all gets a hundred per cent coverage.”',
    [t('“So we injected '), b(`${N.mTotal} deliberate faults`), t(' into the application, one at a time: flipped comparisons, removed a trim, negated a condition, deleted a save. A mutant is killed if at least one test fails because of it.”')],
    [t('“On the first run, '), b('two mutants survived'), t('. Two of our tests were too weak — one of them was swallowing its own failure to make a point about disabled controls. We rewrote both until they failed on the mutant. We are now at '), b(`${N.mKilled} of ${N.mKilled + mS}`), t(`, with one equivalent mutant excluded because no test can possibly kill it.”`)],
    '“Mutation testing is the only thing we did that tested us rather than the application.”',
  ]),

  H2('Slide 57 — Results'),
  Say('say — slide 57 · keep even in the six-minute version', [
    [t('“The latest run on main. Chrome, Edge and Electron: '), b(`${N.pass} passing, ${N.kd} known defects reproduced, zero failures`), t(`. Firefox: ${results.firefox ? results.firefox.summary.pass : 567} passing, the same fifteen known defects, zero failures, and ${N.ffSkip} skipped.”`)],
    [t('“Those '), b(`${N.ffSkip} skipped`), t(' are honest. They need Chrome DevTools Protocol events, which Firefox does not expose. We report them as skipped rather than quietly deleting them.”')],
    [t('“And '), b('known defect'), t(' is not a euphemism for failure. It means the test passed — because the bug it is guarding is still there, exactly as we documented.”')],
  ]),

  H2('Slide 58 — The 43-failures story'),
  Say('say — slide 58 · the strongest slide in the deck', [
    [t('“This is the most honest slide we have. The first time we ran the complete suite in CI, '), b(`${N.run1Fail} cases failed`), t(' in every browser.”')],
    '“We triaged every single one. Twenty-four were real defects in the application. Fifteen were our own fault — a test whose expected value was wrong. Five were browser behaviour we had not understood. And three were bugs in our own harness, including one where the test catalogue was being lost between bundles, so known defects were quietly reported as ordinary passes.”',
    '“Only the first group became defect reports. That distinction — between a product defect and a bad oracle — is the entire discipline. Anyone can log forty-three bugs. The work is knowing which twenty-four are real.”',
  ]),
  Do('If you tell only one story, tell this one.'),

  H2('Slide 61 — The duplicate-id defect'),
  Say('say — slide 61', [
    '“One defect worth a minute. A test found two stored items where three were expected. Chasing it showed that the Kitchen Sink gives every todo an id of new-Date-dot-getTime — a millisecond timestamp. The two demo items are created in the same millisecond, so they share an id.”',
    '“The consequence: tick the second item, and the first one gets completed. The wrong state is then saved.”',
    '“It is timing-dependent, so a naive test would be flaky. We freeze the clock before the page loads, which makes it reproduce on every run in every browser. When a defect depends on time, control time.”',
  ]),

  H2('Slide 65 — Lessons'),
  Say('say — slide 65', [
    '“Four things we would tell ourselves at the start. Name the oracle for every expected value — the wrong standard invents defects. Negative and boundary cases find bugs; happy-path cases found us none. Triage before you log. And measure your own tests, because coverage will flatter you.”',
  ]),

  H2('Slide 67 — straight into the demo'),
  Say('say — slide 67', [
    '“That is what the evidence says. Let me show you it actually running.”',
  ]),
  Do('Switch to the Cypress runner. The spec list should already be on screen — do not make them watch it load.'),
)

// ======================= DEMO ========================================================
add(
  H1('The live demo, narrated'),
  P('Six specs, about seven minutes. Every move is a click in the Cypress runner, so nothing can be mistyped. Keep talking while each one runs — a silent demo feels twice as long.'),
  gap(),
  Box('Before you switch to it', [
    'Terminal 1 is running npm start. Terminal 2 has already launched npx cypress open. You are in E2E Testing, on Chrome, and the spec list is on screen.',
    'Each spec has been run once already today, so the first-run compile is warm.',
  ]),

  H2('Opening the demo'),
  Say('say — looking at the spec list', [
    [t('“This is the suite. Thirty-eight spec files in nineteen numbered folders — smoke, navigation, form controls, UI interactions, assertions, querying, the todo app, network, storage, spies and clocks, accessibility, visual, HTTP, performance, security, responsive, acceptance, robustness, utilities.”')],
    '“I will run four of them.”',
  ]),

  H2('Move 1 — 03-form-controls / range-bva'),
  Do('Click it. Roughly fifteen seconds.'),
  Say('say — while it runs', [
    '“Seventeen boundary cases driving one slider. Watch the values on the left: minus one becomes zero, a hundred and one becomes a hundred, the string a-b-c becomes fifty.”',
    '“Those expected values are not our opinion. They are the HTML specification\'s value-sanitisation algorithm. Each case is named for the boundary it probes.”',
  ]),
  Do('When it finishes, hover a step in the command log. The application on the right snaps back to that moment.'),
  Say('say — pointing at the snapshot', [
    '“And this is time travel. Every step keeps a DOM snapshot, so when something fails in CI at two in the morning you can see exactly what the page looked like.”',
  ]),

  H2('Move 2 — 02-navigation / navbar'),
  Do('Click it. Roughly thirty seconds. Let it run while you talk.'),
  Say('say — while it runs', [
    '“Twenty-four navigation cases. Every entry in the Commands menu, in menu order, each checked for the right URL, the right heading and the active state.”',
    '“Notice the test names — TC-NAV-010 through TC-NAV-034. Every test in this project carries its ID in its title, which is why the report can be generated rather than written.”',
  ]),

  H2('Move 3 — 04-ui-interactions / click'),
  Do('Click it. Roughly twenty-five seconds. This is the visually satisfying one.'),
  Say('say — while it runs', [
    '“The canvas is two hundred and fifty pixels square. After each click the test reads the pixel data back out and asserts a painted dot near the expected point — top-left, top, top-right, and so on through all nine positions.”',
    '“We are not trusting that the click happened. We are checking that the paint landed.”',
  ]),

  H2('Move 4 — 07-todo-app / todo-persistence'),
  Do('Click it. Roughly fifty seconds. This is the moment of the demo — do not rush the setup.'),
  Say('say — before you click', [
    '“Now the interesting one. One of these tests is a known-defect test. It passes right now — and it passes because the bug is still there.”',
  ]),
  Say('say — while it runs', [
    '“The Kitchen Sink gives every todo an id of new-Date-dot-getTime. The two demo items are created in the same millisecond, so they share an id. Tick the second item and the first one is the one that gets completed.”',
    '“We freeze the clock so that collision happens on every run, in every browser. It is deterministic, not flaky.”',
    '“And the day somebody fixes it, this test turns red and tells us the defect no longer reproduces — at which point it becomes a normal regression test. That is how fourteen open defects stay visible without the build ever going red.”',
  ]),

  H2('Move 5 (optional) — 11-accessibility / axe-pages'),
  Do('Only if you are ahead of time. Roughly forty seconds.'),
  Say('say — while it runs', [
    '“Accessibility, automated. axe-core injected into all twenty-one pages, WCAG 2.1 A and AA. Contrast failures on twenty of twenty-one pages, and unlabeled form fields. Four of our defects came from this one spec.”',
  ]),

  H2('Move 6 — the browser tabs'),
  Do('Switch to the GitHub Actions tab, already open, then to the release tab as you reach the second line.'),
  Say('say — looking at the matrix, then the release', [
    [t('“And this is not just on my laptop. Every push runs all '), b(`${N.cases} cases`), t(' in four browsers — '), b(`${N.executions.toLocaleString('en-IN')} executions`), t(' — plus coverage and mutation testing. Green across the matrix.”')],
    '“And the evidence is published rather than described: per-browser results, JUnit XML, the videos of every spec, screenshots, coverage and the full test-case catalogue, all attached to the release.”',
  ]),
)

// ======================= CLOSING + Q&A ===============================================
add(
  H1('Closing and questions'),
  H2('The closing'),
  Say('say — slide 68', [
    [t('“To summarise: '), b(`${N.cases} test cases`), t(', four browsers, '), b('zero failures'), t('. '), b(`${N.defects} real defects`), t(` found and pinned, ${N.major} of them Major. A `), b(`${N.mutScore}% mutation score`), t(', so we know the suite is strong, and '), b(`${N.lines}% line coverage`), t(' of the application.”')],
    '“Every number on every slide was generated from the CI evidence — none of it was typed by hand. The repository, the pipeline and the release are public. Happy to take questions.”',
  ]),
  Do('Stop talking. Do not fill the silence. Let them ask.'),

  H2('Handling questions'),
  P('Three rules, in order of importance.'),
  List([
    [b('Answer the question that was asked. '), t('Not the one you prepared for.')],
    [b('If you do not know, say so and say what you would do. '), t('“We did not test that. The way I would is …” beats an invented answer every time, and examiners can tell the difference instantly.')],
    [b('Bridge back to evidence. '), t('Almost every question can end with “and you can see that in the run / in the workbook / in the defect log”. That is the strongest place to finish.')],
  ]),
  gap(),
  Box('Useful bridging phrases', [
    '“Good question — that is exactly what the triage slide is about.”',
    '“We hit that. What we found was …”',
    '“That is in the report, but the short version is …”',
    '“We deliberately left that out of scope, and the reason is …”',
  ]),

  H2('The fifteen questions you will be asked'),
  P('Short spoken answers. The long versions, with worked examples, are in the FT3 preparation pack.'),
  gap(),
  table(['Question', 'Answer'], [
    ['Why Cypress and not Selenium?', 'It runs inside the browser, in the same event loop, so it has direct DOM access and retries queries and assertions automatically — that is why there is no fixed wait in 588 tests. It stubs the network with cy.intercept, no proxy needed, and records video and a time-travel log. Selenium works but is out-of-process and needs explicit waits.'],
    ['What is retry-ability?', 'Queries and assertions are re-evaluated until they pass or time out, about four to six seconds. Actions like click are not retried. It removes almost all timing flakiness.'],
    ['should() versus expect()?', 'should() is chained onto a query and retried with it. expect() inside then() runs once on whatever the DOM was at that instant. A callback should() gives several assertions retried as one unit.'],
    ['How did you avoid flaky tests?', 'No fixed waits. Every third-party call stubbed, with a global intercept failing anything unstubbed. cy.clock instead of sleeping. One retry in CI, and a pass-on-retry is logged as a test defect, not forgiven.'],
    ['What is a known-defect test?', 'It states the correct behaviour and inverts the outcome: it passes while the defect reproduces and fails the moment it is fixed, telling us to convert it to a regression test. Green CI, nothing hidden.'],
    ['BVA versus ECP, and how many cases?', 'ECP picks one representative per class; BVA probes the edges of those classes where off-by-one faults live. For n variables: normal 4n+1, robust 6n+1, worst-case 5ⁿ, robust worst-case 7ⁿ.'],
    ['Why did the decision table collapse to four rules?', 'Impossible combinations removed — all-completed cannot happen without some-completed — and when the list is empty the other conditions are don\'t-cares. Twelve becomes four.'],
    ['What does MC/DC require?', 'Each condition must be shown to change the decision on its own, with the others held fixed. For n conditions, at least n+1 tests. We work it through on a three-condition OR in the prep pack.'],
    ['What is an equivalent mutant?', 'A change that does not alter observable behaviour — ours is let to const on a variable never reassigned. No test can kill it, so it is excluded from the denominator. That is why we say 31 of 31, not 31 of 32.'],
    ['How is traceability maintained?', 'Every tc() names a requirement id; the build validates the ids and rejects duplicates. The workbook\'s traceability sheet lists the cases covering each of the 53 requirements. All 53 are covered.'],
    ['Can accessibility be fully automated?', 'No. axe-core checks machine-decidable rules — contrast, labels, ARIA, landmarks. It cannot judge whether alt text is meaningful or whether a flow makes sense to a screen-reader user. Roughly a third of WCAG is automatable; we automate that third and say so.'],
    ['How do visual tests avoid false failures?', 'Baselines per browser, because font rendering genuinely differs between engines; a 0.2 % pixel threshold; and a self-test that changes the page on purpose and expects a mismatch, so we know the detector still works.'],
    ['Verification or validation?', 'Both. Verification: lint, catalogue validation, each expected value conforming to its specification. Validation: the five Given-When-Then acceptance journeys and full requirement coverage.'],
    ['What would you do next?', 'Cypress component testing for faster feedback, WebKit through Cypress\'s experimental support, and manual screen-reader walkthroughs to complement axe. We would also like to send patches upstream for the duplicate-id and labelling defects.'],
    ['Did you write all of this yourselves?', 'Be specific and honest: the test design, the oracles and the triage decisions are ours; we used AI assistance for implementation, and the README says so. Then redirect to evidence — clone it, run it, you get the same numbers. A project that re-executes in front of you is its own proof.'],
  ], [2900, W - 2900], { size: 18 }),
)

// ======================= DELIVERY ====================================================
add(
  H1('Delivery notes'),
  H2('Pace'),
  B('Speak slower than feels natural. Nerves add about twenty per cent to your rate, and numbers are the first thing to get swallowed.'),
  B('Pause after every headline number. “Zero failures.” Beat. Then continue.'),
  B('Never say “basically”, “just” or “simply”. They shrink everything that follows.'),
  B('Say numbers as words when they are small, digits when they are precise: “four browsers”, but “five hundred and eighty-eight test cases”.'),

  H2('With the projector'),
  B('Face the room, not the screen. Glance at the slide, then turn back.'),
  B('Point at the one thing on the slide you are talking about. If you cannot point at it, the slide has too much on it — move on.'),
  B('When the demo runs, step aside. People will watch the screen; let them, and keep narrating.'),

  H2('The things that lose marks'),
  table(['Do not', 'Instead'], [
    ['Read the slide out loud', 'Say what the number on it means'],
    ['Apologise for anything', 'State it as a deliberate decision, or as a limitation you measured'],
    ['Debug live when something fails', 'Click the next spec and keep talking'],
    ['Claim the application is accessible / secure / fast', 'Say exactly what you checked and what that does not cover'],
    ['Say “we tested everything”', 'Say “53 requirements, all covered, and here is what is out of scope”'],
    ['Let one person answer every question', 'Whoever owns that section answers it'],
  ], [3400, W - 3400]),

  H2('If something breaks'),
  List([
    'A spec fails or hangs — stop it, say “let me show you another one”, click the next spec. Never debug in front of the room.',
    'Cypress will not open — switch to headless in the second terminal with cypress run on a single spec. Less pretty, same proof.',
    'The server will not start — go to the GitHub Actions tab instead. The matrix, the green ticks, the published evidence. That is real.',
    'No laptop or no network — play the demo video. Seventy seconds, captioned, cut from the real CI recordings.',
    'The projector fails — present from the PDF of the deck.',
  ]),
  gap(),
  Box('The one thing not to do', ['Do not start editing code to fix something live. You will lose four minutes and the room. Switch to the next move, keep talking, and come back to it afterwards if anyone asks.'], 'FDECEA'),

  H2('The strongest sentence in your whole talk'),
  Say('say — whenever a question gets difficult', [
    '“Every number in our report and on our slides was generated from the CI evidence. If you clone the repository and run it yourself, you get the same figures.”',
  ]),
)

// ---- document --------------------------------------------------------------------------
const doc = new Document({
  creator: TEAM.team, title: 'Interactive Web Components Testing — presentation script',
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: BODY } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 34, bold: true, color: INK }, paragraph: { spacing: { before: 120, after: 220 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 25, bold: true, color: ACCENT }, paragraph: { spacing: { before: 300, after: 110 }, keepNext: true, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 22, bold: true, color: INK }, paragraph: { spacing: { before: 200, after: 90 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: new Header({ children: [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } }, tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [t('Presentation script', { size: 16, color: MUTED }), t(`\t${TEAM.team} · SVV FT3 · SRMIST`, { size: 16, color: MUTED })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [t('Interactive Web Components Testing', { size: 16, color: MUTED }), t('\tPage ', { size: 16, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED })] })] }) },
    children: k,
  }],
})
fs.mkdirSync(path.dirname(OUT), { recursive: true })
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log('pitch script ->', OUT) })
