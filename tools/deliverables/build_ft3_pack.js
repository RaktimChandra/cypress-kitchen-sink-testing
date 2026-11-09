#!/usr/bin/env node
/**
 * FT3 preparation pack (.docx): every FT3 topic solved on real Kitchen Sink examples.
 *   node tools/deliverables/build_ft3_pack.js [out.docx]
 */
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, ImageRun, LevelFormat, Footer, PageNumber, TabStopType,
} = require('docx')

const ROOT = path.resolve(__dirname, '..', '..')
const TEAM = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'team.json'), 'utf8'))
const OUT = process.argv[2] || path.join(ROOT, 'deliverables', 'FT3_Prep_Pack.docx')
const FONT = 'Arial'; const INK = '1B1E2E'; const ACCENT = '1F7A8C'; const MUTED = '5A6072'; const RULE = 'D5DAE3'; const LIGHT = 'EEF3F6'
const W = 9638
const bd = { style: BorderStyle.SINGLE, size: 4, color: RULE }
const borders = { top: bd, bottom: bd, left: bd, right: bd }
const t = (s, o = {}) => new TextRun({ text: String(s), font: FONT, ...o })
const P = (x, o = {}) => new Paragraph({ spacing: { after: 120, line: 300 }, ...o, children: Array.isArray(x) ? x : [t(x)] })
const H1 = (s, first) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: !first, children: [t(s)] })
const H2 = (s) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(s)] })
const B = (x) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60, line: 280 }, children: Array.isArray(x) ? x : [t(x)] })
const b = (s) => t(s, { bold: true })
const Code = (src) => src.split('\n').map((l, i, a) => new Paragraph({ shading: { type: ShadingType.CLEAR, fill: 'F4F6F8' }, indent: { left: 200 }, spacing: { after: i === a.length - 1 ? 160 : 0 }, children: [t(l || ' ', { font: 'Courier New', size: 18 })] }))
const Box = (title, lines) => new Table({
  width: { size: W, type: WidthType.DXA }, columnWidths: [W],
  rows: [new TableRow({ children: [new TableCell({ borders, width: { size: W, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: LIGHT }, margins: { top: 120, bottom: 120, left: 180, right: 180 },
    children: [new Paragraph({ spacing: { after: 80 }, children: [t(title, { bold: true, color: ACCENT })] }), ...lines.map((l) => new Paragraph({ spacing: { after: 60 }, children: Array.isArray(l) ? l : [t(l, { size: 20 })] }))] })] })],
})
function table (head, rows, widths) {
  const c = (v, w, o = {}) => new TableCell({ borders, width: { size: w, type: WidthType.DXA }, shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined, margins: { top: 50, bottom: 50, left: 90, right: 90 }, children: [new Paragraph({ children: [t(v, { size: 18, bold: o.bold, color: o.color })] })] })
  return new Table({ width: { size: widths.reduce((a, x) => a + x, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: head.map((h, i) => c(h, widths[i], { bold: true, color: 'FFFFFF', fill: INK })) }), ...rows.map((r) => new TableRow({ children: r.map((v, i) => c(v, widths[i])) }))] })
}
const gap = () => new Paragraph({ spacing: { after: 80 }, children: [] })
function png (p, width) {
  const buf = fs.readFileSync(path.join(ROOT, p)); const w = buf.readUInt32BE(16); const h = buf.readUInt32BE(20)
  return new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: buf, transformation: { width, height: Math.round(width * h / w) } })] })
}
const QA = (q, a) => [new Paragraph({ spacing: { before: 120, after: 40 }, keepNext: true, children: [t('Q. ', { bold: true, color: ACCENT }), t(q, { bold: true })] }), P([t('A. ', { bold: true, color: ACCENT }), t(a)])]

const k = []
const add = (...x) => k.push(...x.flat())

add(
  new Paragraph({ spacing: { before: 600, after: 80 }, children: [t('SVV · FT3 PREPARATION PACK', { bold: true, color: ACCENT, size: 20 })] }),
  new Paragraph({ spacing: { after: 120 }, children: [t('Test-design and white-box techniques, solved on the Cypress Kitchen Sink', { bold: true, size: 40, color: INK })] }),
  P([t(`${TEAM.team}: ${TEAM.members.map((m) => `${m.name} (${m.reg})`).join(' · ')}`, { color: MUTED, bold: true })]),
  P([t('B.Tech CSE (SE) · Year 4, Sem 7 · AI2 · CINTEL, SRMIST · Faculty: Mr. Kaviyaraj R.', { color: MUTED })]),
  P('Every example uses real components and real test-case IDs from the project, so each answer can be checked against running code. Each section has the rule, a worked example, and a practice question with its answer.'),
  Box('Syllabus map', [
    [b('BVA '), t('§1 · '), b('ECP '), t('§2 · '), b('Decision tables '), t('§3 · '), b('Cause-effect graphing '), t('§4 · '), b('State transition '), t('§5')],
    [b('White-box coverage '), t('(statement, branch, condition, MC/DC, path, cyclomatic complexity) §6 · '), b('Mutation testing '), t('§7 · '), b('Testing levels '), t('§8 · '), b('Viva questions '), t('§9')],
  ]),
)

// 1 BVA
add(
  H1('1. Boundary-value analysis'),
  P('For a variable with range [min, max], test at and around the boundaries. With n independent variables (the single-fault assumption: only one variable is at an extreme at a time):'),
  table(['Variant', 'Values per variable', 'Number of cases'], [
    ['Normal BVA', 'min, min+, nom, max−, max', '4n + 1'], ['Robust BVA', 'min−, min, min+, nom, max−, max, max+', '6n + 1'],
    ['Worst-case BVA', '5 values, all combinations', '5ⁿ'], ['Robust worst-case', '7 values, all combinations', '7ⁿ'],
  ], [2600, 4400, 2638]),
  H2('Worked example: the range slider (n = 1)'),
  P('Range 0–100, step 1 (TC-FC-140…154). Normal: 4(1)+1 = 5 → {0, 1, 50, 99, 100}. Robust: 6(1)+1 = 7 → add −1 and 101.'),
  table(['Input', 'Class', 'Expected (HTML sanitisation)', 'Case'], [
    ['−1', 'min−', '0 (clamped)', 'TC-FC-141'], ['0', 'min', '0', 'TC-FC-142'], ['1', 'min+', '1', 'TC-FC-143'], ['50', 'nom', '50', 'TC-FC-144'],
    ['99', 'max−', '99', 'TC-FC-145'], ['100', 'max', '100', 'TC-FC-146'], ['101', 'max+', '100 (clamped)', 'TC-FC-147'],
  ], [1600, 1600, 4000, 2438]),
  H2('Worked example: two variables'),
  P('The responsive suite varies viewport width W ∈ [320, 1920] and height H ∈ [480, 1080]. Nominal W = 1120, H = 780.'),
  B('Normal BVA: 4(2)+1 = 9 cases: (320,780) (321,780) (1919,780) (1920,780) (1120,480) (1120,481) (1120,1079) (1120,1080) (1120,780).'),
  B('Robust BVA: 6(2)+1 = 13 cases, adding (319,780) (1921,780) (1120,479) (1120,1081).'),
  B('Worst-case: 5² = 25; robust worst-case: 7² = 49.'),
  Box('Practice', ['A todo title has 1–200 characters after trimming, and the list may hold 0–50 items. How many cases do normal, robust and worst-case BVA give?',
    [b('Answer: '), t('n = 2 → normal 9, robust 13, worst-case 25 (robust worst-case 49).')]]),
)

// 2 ECP
add(
  H1('2. Equivalence-class partitioning'),
  P('Partition each input into classes the program should treat the same, then pick one representative per class. With several variables:'),
  table(['Variant', 'Rule', 'Cases for variables with a, b valid classes'], [
    ['Weak normal', 'Cover every valid class at least once', 'max(a, b)'], ['Strong normal', 'Every combination of valid classes', 'a × b'],
    ['Weak robust', 'Weak normal + each invalid class once, others valid', 'max(a, b) + #invalid'], ['Strong robust', 'All combinations, valid and invalid', '(a + i₁)(b + i₂)'],
  ], [2000, 4400, 3238]),
  H2('Worked example: the email field (TC-FC-040…056)'),
  P('Oracle: the HTML "valid e-mail address" grammar. 6 valid classes (simple, single-label domain, dots and plus, upper case, digits, empty when not required) and 11 invalid classes (no @, no domain, no local part, space, consecutive dots, two @, trailing dot, label starting with -, quoted local part, non-ASCII, underscore in the domain).'),
  H2('Worked example: two variables'),
  P('The Actions page select has 3 fruits (apples, oranges, bananas) and the multi-select allows choosing them by value, by text or by index (3 ways). Strong normal = 3 × 3 = 9; weak normal = max(3,3) = 3. Adding 1 invalid class each (unknown value, out-of-range index) gives weak robust 3 + 2 = 5 and strong robust 4 × 4 = 16.'),
  Box('Practice', ['Why is "quoted"@b.com an invalid class here when RFC 5322 allows it?',
    [b('Answer: '), t('the oracle is the HTML specification, which deliberately uses a stricter grammar. The class is defined by the specification being tested, not by general knowledge.')]]),
)

// 3 Decision tables
add(
  H1('3. Decision tables'),
  P('List conditions and actions; each column (rule) is a combination of conditions with its actions. n binary conditions give 2ⁿ rules before "don\'t care" (–) entries merge rules and impossible rules are removed.'),
  H2('Worked example: todo footer (TC-TD-070…073)'),
  table(['', 'R1', 'R2', 'R3', 'R4'], [
    ['C1 list has items', 'N', 'Y', 'Y', 'Y'], ['C2 some completed', '–', 'N', 'Y', 'Y'], ['C3 all completed', '–', 'N', 'N', 'Y'],
    ['A1 show footer', '', 'X', 'X', 'X'], ['A2 show "Clear completed"', '', '', 'X', 'X'], ['A3 check toggle-all', '', '', '', 'X'],
  ], [3638, 1500, 1500, 1500, 1500]),
  P('Counting: 2³ = 8 combinations. "All completed" without "some completed" is impossible (2 rules); when the list is empty, C2 and C3 do not matter, so 4 more collapse into R1. 8 → 4 rules → 4 test cases.'),
  Box('Practice', ['Three checkboxes can each be passed or not to .check([...]). How many rules, and why can they all be tested?',
    [b('Answer: '), t('2³ = 8 rules (TC-FC-083…090). The boxes are independent, there are no don\'t-cares or impossible rules, and 8 cases are cheap, so the table is tested exhaustively.')]]),
)

// 4 CEG
add(
  H1('4. Cause-effect graphing'),
  P('Steps: (1) identify causes (input conditions) and effects (outputs); (2) connect them with Boolean operators (∧, ∨, ¬); (3) add constraints (E exclusive, I inclusive, O one-and-only-one, R requires, M masks); (4) convert the graph to a limited-entry decision table; (5) one test per column.'),
  png('docs/figures/cause_effect_graph.png', 520),
  table(['Element', 'Meaning'], [
    ['C1', 'Enter pressed'], ['C2', 'Field blurred'], ['C3', 'Escape pressed'], ['C4', 'Title non-empty after trim'], ['Constraint', 'E (exclusive) over C1, C2, C3'],
    ['E1 = (C1 ∨ C2) ∧ C4', 'Title saved (trimmed)'], ['E2 = (C1 ∨ C2) ∧ ¬C4', 'Item deleted'], ['E3 = C3', 'Original title restored'],
  ], [3800, 5838]),
  gap(),
  table(['Test', 'C1', 'C2', 'C3', 'C4', 'Effect', 'Case'], [
    ['K1', '1', '0', '0', '1', 'E1', 'TC-TD-080'], ['K3', '1', '0', '0', '0', 'E2', 'TC-TD-082'], ['K5', '0', '1', '0', '1', 'E1', 'TC-TD-084'],
    ['K6', '0', '1', '0', '0', 'E2', 'TC-TD-085'], ['K7', '0', '0', '1', '1', 'E3', 'TC-TD-086'], ['K8', '0', '0', '1', '0', 'E3', 'TC-TD-087'],
  ], [900, 900, 900, 900, 900, 1600, 3538]),
  P('K2 and K4 add boundary data on C4 (padded text; whitespace only), which tests the trim inside C4.'),
)

// 5 State transition
add(
  H1('5. State-transition testing'),
  png('docs/figures/todo_state_machine.png', 560),
  table(['State \\ Event', 'add', 'toggle', 'dblclick', 'enter (text)', 'enter (empty)', 'esc', 'destroy'], [
    ['S0 absent', 'S1', '–', '–', '–', '–', '–', '–'], ['S1 active', '–', 'S2', 'S3', '–', '–', '–', 'S5'], ['S2 completed', '–', 'S1', 'S4', '–', '–', '–', 'S5'],
    ['S3 editing (active)', '–', '–', '–', 'S1', 'S5', 'S1', '–'], ['S4 editing (completed)', '–', '–', '–', 'S2', 'S5', 'S2', '–'],
  ], [2238, 900, 1000, 1100, 1200, 1200, 900, 1100]),
  P('"–" cells are invalid (null) transitions; testing some of them is part of the technique (TC-TD-115, 116).'),
  B([b('0-switch coverage: '), t('every valid transition once → T1–T12 (TC-TD-100…111).')]),
  B([b('1-switch coverage: '), t('every valid pair of consecutive transitions; TC-TD-117 walks S0→S1→S2→S4→S2→S1→S5.')]),
  B([b('Radio buttons: '), t('a second machine with three states, where checking one unchecks the others (radio_state_machine.png).')]),
)

// 6 White box
add(
  H1('6. White-box coverage on the todo controller'),
  H2('6.1 editItemSave – statement, branch and cyclomatic complexity'),
  ...Code(`Controller.prototype.editItemSave = function (id, title) {
  let self = this                                      // n1
  title = title.trim()                                 // n1
  if (title.length !== 0) {                            // n2  decision
    self.model.update(id, { title }, function () {     // n3
      self.view.render('editItemDone', { id, title })
    })
  } else {
    self.removeItem(id)                                // n4
  }
}                                                      // n5 exit`),
  table(['Measure', 'Value', 'Tests that achieve it'], [
    ['Cyclomatic complexity V(G)', 'E − N + 2 = 5 − 5 + 2 = 2 (= decisions + 1)', '—'],
    ['Statement coverage', '100 % needs both branches (n3 and n4)', 'K1 "renamed" + K3 ""'],
    ['Branch (decision) coverage', '2 outcomes of n2', 'K1 (true) + K3 (false)'],
    ['Basis paths', 'V(G) = 2 independent paths', 'n1-n2-n3-n5 · n1-n2-n4-n5'],
  ], [2800, 3600, 3238]),
  H2('6.2 _filter – condition coverage and MC/DC'),
  ...Code(`if (force || this._lastActiveRoute !== 'All' || this._lastActiveRoute !== activeRoute) {
  this[\`show\${activeRoute}\`]()          // line 264: dynamic dispatch
}`),
  P('Let A = force, B = last route ≠ "All", C = last route ≠ current route. The decision is A ∨ B ∨ C.'),
  table(['Test', 'A', 'B', 'C', 'Decision', 'Shows independence of'], [
    ['T1', 'F', 'F', 'F', 'F', 'baseline'], ['T2', 'T', 'F', 'F', 'T', 'A (T1 vs T2)'], ['T3', 'F', 'T', 'F', 'T', 'B (T1 vs T3)'], ['T4', 'F', 'F', 'T', 'T', 'C (T1 vs T4)'],
  ], [1200, 900, 900, 900, 1600, 4138]),
  P('Decision coverage needs the decision true once and false once: 2 tests (T1, T2). Condition coverage needs every condition true and false at least once: T1 (all false) plus a test with A, B and C all true is enough, yet that pair never shows which condition caused the outcome. MC/DC fixes this: each condition must flip the decision on its own, which for an n-condition OR takes n + 1 = 4 tests (T1–T4).'),
  Box('White-box root cause of DEF-KS-001', ['Line 264 builds a method name from the route and calls it without checking that it exists. The route "#/unknown" produces this.showUnknown, which is undefined, so the call throws "this[activeRoute] is not a function". A black-box error-guessing test found the failure; reading the code locates the fault.']),
  H2('6.3 Model.getCount – loop and decision'),
  P('The forEach callback contains one if/else; counting the loop as a decision, V(G) = 3. Loop testing: empty list, loop skipped (TC-TD-056); one iteration (TC-TD-050, TC-TD-051); two iterations (TC-TD-052, TC-TD-053); many (99 items, TC-TD-054; 100 items, TC-TD-059). TC-TD-050 takes the completed branch and TC-TD-051 the active branch, so both outcomes of "if (todo.completed)" are covered.'),
)

// 7 Mutation
add(
  H1('7. Mutation testing'),
  P('Mutation score = killed mutants ÷ (total mutants − equivalent mutants) × 100 %. A mutant is killed when at least one test fails on it. An equivalent mutant cannot be killed because it does not change behaviour.'),
  table(['Mutant', 'Change', 'Killed by'], [
    ['Negate (relational)', 'title.length !== 0  →  title.length === 0', 'K1 (saves become deletes) and K3'], ['Remove call', 'title.trim() removed', 'K2 (padded text) / K4 (spaces only)'],
    ['Negate condition', 'if (todo.completed) → if (!todo.completed)', 'counter BVA TC-TD-050…054'], ['Equivalent', 'let self → const self', 'cannot be killed; excluded'],
  ], [2000, 4200, 3438]),
  Box('Practice', ['32 mutants, 1 equivalent, 28 killed. What is the score?', [b('Answer: '), t('28 ÷ (32 − 1) = 90.3 %.')]]),
)

// 8 Levels
add(
  H1('8. Testing levels and types in this project'),
  table(['Level', 'Focus', 'Here'], [
    ['Unit', 'One function in isolation', 'Mutation targets single functions (editItemSave, getCount)'], ['Integration', 'Interfaces between parts', 'Controller ↔ Model ↔ Store via localStorage (TC-TD-130…135)'],
    ['System', 'The whole application against requirements', '577 browser cases'], ['Acceptance', 'User goals, Given/When/Then', 'TC-UAT-001…005'],
  ], [1800, 3400, 4438]),
  gap(),
  table(['Type', 'Example'], [
    ['Smoke', 'TC-SMK-001…021: every page loads without errors'], ['Regression', 'Whole suite on every push'], ['Compatibility', '4-browser matrix'],
    ['Accessibility', 'axe-core WCAG 2.1 AA'], ['Performance', 'Navigation Timing budgets'], ['Security', 'XSS, headers'], ['Visual', 'pixelmatch baselines'],
  ], [2800, 6838]),
  P('Verification asks "are we building the product right?" (reviews, static analysis, conformance to the spec). Validation asks "are we building the right product?" (acceptance journeys, usability). This project does both: lint and code review on one side, UAT and requirement traceability on the other.'),
)

// 9 Viva
add(
  H1('9. Viva questions with answers'),
  ...QA('Why Cypress instead of Selenium for this project?', 'Cypress runs inside the browser, retries queries and assertions automatically, controls the network with cy.intercept, and records video and snapshots. The Kitchen Sink is Cypress\'s own reference app, so every command can be shown on it.'),
  ...QA('What is retry-ability?', 'Queries such as cy.get and assertions such as .should are retried until they pass or time out (4 s by default). Actions such as .click are not retried. This removes most fixed waits.'),
  ...QA('Difference between .should() and expect()?', '.should() is chained and retried with the query before it; expect() inside .then() runs once. A callback .should(($el) => { expect(...) }) gives retried, multi-assertion checks.'),
  ...QA('How did you avoid flaky tests?', 'No cy.wait(ms); stub all third-party calls; cy.clock for timers; one retry in CI, with pass-on-retry logged as a flaky-test defect; stable selectors.'),
  ...QA('What is a known-defect test?', 'A test that passes while a defect reproduces and fails once it is fixed, so CI stays green and the defect stays visible. It then becomes a normal regression test.'),
  ...QA('How is traceability maintained?', 'Each tc() declares a requirement ID; tools/catalogue.js validates IDs and the workbook\'s Traceability sheet lists the cases for each of the 53 requirements.'),
  ...QA('BVA vs ECP?', 'ECP picks one value per class; BVA picks values at and next to class edges, where off-by-one faults cluster. They are used together.'),
  ...QA('Why did the decision table for the todo footer have 4 rules, not 8?', 'Impossible combinations (all completed but none completed) and don\'t-care entries (empty list) were removed.'),
  ...QA('What does MC/DC require?', 'Each condition is shown to change the decision on its own while the others are fixed. For n conditions, at least n + 1 tests.'),
  ...QA('What is an equivalent mutant?', 'A change that does not alter observable behaviour (let → const on a variable that is never reassigned). No test can kill it, so it is excluded from the score.'),
  ...QA('How do you test accessibility automatically, and what can\'t you test?', 'axe-core checks rules such as labels, contrast, ARIA and landmarks. It cannot judge whether alt text is meaningful or whether a flow makes sense to a screen-reader user; that needs manual review.'),
  ...QA('How does the visual test avoid false failures across browsers?', 'Baselines are stored per browser and a 0.2 % pixel threshold absorbs anti-aliasing noise. A self-test proves the comparison can detect a real change.'),
  ...QA('What defects did you find, and how?', 'Eight. Examples: an unknown route crashes the router (error guessing), corrupt storage breaks the app (fault injection), Enter reloads a form (error guessing), overflow on phones (breakpoint BVA), broken links (HTTP link check).'),
  ...QA('Where does verification end and validation start in your project?', 'Lint, static catalogue validation and spec conformance are verification. The Given/When/Then journeys and requirement coverage against user needs are validation.'),
)

const doc = new Document({
  creator: TEAM.team, title: 'FT3 Preparation Pack',
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 32, bold: true, color: INK }, paragraph: { spacing: { before: 120, after: 200 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 24, bold: true, color: ACCENT }, paragraph: { spacing: { before: 240, after: 100 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [t(`FT3 Preparation Pack · ${TEAM.team}`, { size: 16, color: MUTED }), t('\tPage ', { size: 16, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED })] })] }) },
    children: k,
  }],
})
Packer.toBuffer(doc).then((buf) => { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, buf); console.log('ft3 pack ->', OUT) })
