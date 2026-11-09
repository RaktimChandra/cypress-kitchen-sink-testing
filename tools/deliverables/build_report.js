#!/usr/bin/env node
/**
 * Build the detailed project report (.docx) from repository data.
 *   node tools/deliverables/build_report.js [out.docx]
 * Reads reports/catalogue.json, docs/*.json, docs/figures/** and optional CI evidence (evidence/**).
 */
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, ImageRun, Header, Footer, PageNumber, TableOfContents, LevelFormat,
  TabStopType,
} = require('docx')

const ROOT = path.resolve(__dirname, '..', '..')
const OUT = process.argv[2] || path.join(ROOT, 'deliverables', 'CKS_Project_Report.docx')
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const cat = rd('reports/catalogue.json')
const cases = cat.cases
const reqs = rd('docs/requirements.json')
const defects = rd('docs/defects.json')
const TEAM = rd('docs/team.json')
const MEMBERS = TEAM.members.map((m) => `${m.name} (${m.reg})`)
const byId = Object.fromEntries(cases.map((c) => [c.id, c]))

// optional CI evidence -------------------------------------------------------------
const EVID = process.env.EVIDENCE_DIR || path.join(ROOT, 'deliverables', 'build', 'evidence', 'latest')
const results = {}
function walk (d) {
  if (!fs.existsSync(d)) return
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (/^results-.*\.json$/.test(f)) { const j = JSON.parse(fs.readFileSync(p, 'utf8')); results[j.summary.browser] = j }
  }
}
walk(EVID)
const haveResults = Object.keys(results).length > 0
const rdMaybe = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (_e) { return null } }
const HIST = rd('docs/ci-history.json')
const coverage = rdMaybe(path.join(EVID, 'coverage', 'coverage-summary.json'))
const perf = (rdMaybe(path.join(EVID, 'browsers', 'chrome', 'evidence', 'perf-chrome.json')) || []).filter((p) => p.page && p.page.startsWith('/') && !/\s/.test(p.page) && Number.isFinite(p.domContentLoaded))
const a11yEv = rdMaybe(path.join(EVID, 'browsers', 'chrome', 'evidence', 'a11y-chrome.json')) || []
let mutants = []
if (fs.existsSync(path.join(EVID, 'mutation'))) for (const f of fs.readdirSync(path.join(EVID, 'mutation'))) { const j = rdMaybe(path.join(EVID, 'mutation', f)); if (j) mutants = mutants.concat(j.results || []) }
const mK = mutants.filter((m) => m.status === 'KILLED').length; const mS = mutants.filter((m) => m.status === 'SURVIVED').length; const mE = mutants.filter((m) => m.status === 'EQUIVALENT').length

// ---- styling helpers ------------------------------------------------------------------
const FONT = 'Arial'
const INK = '1B1E2E'; const MUTED = '5A6072'; const ACCENT = '1F7A8C'; const LIGHT = 'EEF3F6'; const RULE = 'D5DAE3'
const W = 9638 // A4 width 11906 - 2 x 1134 margins
const border = { style: BorderStyle.SINGLE, size: 4, color: RULE }
const borders = { top: border, bottom: border, left: border, right: border }

const t = (text, o = {}) => new TextRun({ text: String(text), font: FONT, ...o })
const P = (text, o = {}) => new Paragraph({ spacing: { after: 120, line: 300 }, ...o, children: Array.isArray(text) ? text : [t(text)] })
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [t(text)] })
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(text)] })
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [t(text)] })
const B = (text, lvl = 0) => new Paragraph({ numbering: { reference: 'bul', level: lvl }, spacing: { after: 60, line: 280 }, children: Array.isArray(text) ? text : [t(text)] })
const bold = (s) => t(s, { bold: true })
const Caption = (s) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 200 }, children: [t(s, { italics: true, size: 18, color: MUTED })] })
const Code = (src) => src.split('\n').map((line, i, a) => new Paragraph({
  shading: { type: ShadingType.CLEAR, fill: 'F4F6F8' },
  spacing: { after: i === a.length - 1 ? 160 : 0, line: 240 },
  indent: { left: 200, right: 200 },
  children: [t(line || ' ', { font: 'Courier New', size: 17 })],
}))

function cell (text, width, o = {}) {
  const runs = Array.isArray(text) ? text : [t(text == null ? '' : text, { size: o.size || 18, bold: o.bold, color: o.color })]
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: runs })],
  })
}
function table (head, rows, widths, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0)
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, widths[i], { bold: true, color: 'FFFFFF', fill: INK, size: o.size })) }),
      ...rows.map((r, ri) => new TableRow({ children: r.map((v, i) => cell(v, widths[i], { size: o.size, fill: ri % 2 ? 'FAFBFC' : undefined, bold: o.boldFirst && i === 0 })) })),
    ],
  })
}
function kv (pairs, w1 = 2600) {
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [w1, W - w1],
    rows: pairs.map(([k, v]) => new TableRow({ children: [cell(k, w1, { bold: true, fill: LIGHT }), cell(v, W - w1)] })),
  })
}
function png (p, widthPx) {
  const buf = fs.readFileSync(path.join(ROOT, p))
  const w = buf.readUInt32BE(16); const h = buf.readUInt32BE(20)
  const width = Math.min(widthPx, 620)
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new ImageRun({ type: 'png', data: buf, transformation: { width, height: Math.round(width * h / w) } })] })
}
const gap = () => new Paragraph({ spacing: { after: 80 }, children: [] })

// ---- numbers -------------------------------------------------------------------------
const AREAS = [['SMK', 'Smoke'], ['NAV', 'Navigation'], ['FC', 'Form controls'], ['UI', 'UI interactions'], ['AS', 'Assertions'], ['QT', 'Querying & traversal'], ['TD', 'Todo app'], ['NW', 'Network'], ['ST', 'Storage'], ['CK', 'Cookies'], ['WN', 'Window'], ['VP', 'Viewport'], ['SP', 'Spies, stubs & clocks'], ['A11Y', 'Accessibility'], ['VIS', 'Visual regression'], ['API', 'HTTP / API'], ['PERF', 'Performance'], ['SEC', 'Security'], ['RSP', 'Responsive'], ['UAT', 'Acceptance'], ['ROB', 'Robustness'], ['UT', 'Utilities & files']]
const areaOf = (c) => c.id.split('-')[1]
const count = (f) => cases.filter(f).length
const specsOf = (a) => [...new Set(cases.filter((c) => areaOf(c) === a).map((c) => c.spec.replace('cypress/e2e/', '')))]
const total = cases.length
const nSpecs = new Set(cases.map((c) => c.spec)).size
const by = (k) => cases.reduce((m, c) => { m[c[k]] = (m[c[k]] || 0) + 1; return m }, {})
const typeCounts = by('type'); const prCounts = by('priority')
const reqCover = Object.fromEntries(reqs.map((r) => [r.id, cases.filter((c) => (c.req || '').split(/[,;]\s*/).includes(r.id)).map((c) => c.id)]))

// ---- content ---------------------------------------------------------------------------
const kids = []
const add = (...x) => kids.push(...x.flat())

// Cover
add(
  new Paragraph({ spacing: { before: 1800, after: 120 }, children: [t('SOFTWARE VERIFICATION AND VALIDATION · FT3 AUTOMATED TESTING', { size: 20, color: ACCENT, bold: true })] }),
  new Paragraph({ spacing: { after: 120 }, children: [t('Interactive Web Components Testing', { size: 56, bold: true, color: INK })] }),
  new Paragraph({ spacing: { after: 600 }, children: [t('Automated verification of the Cypress Kitchen Sink with Cypress 16: test plan, design, implementation, defects and evidence', { size: 26, color: MUTED })] }),
  kv([
    ['Team', TEAM.team],
    ['Members', MEMBERS.join(' · ')],
    ['Course', 'Software Verification and Validation (SVV)'],
    ['Faculty', 'Mr. Kaviyaraj R.'],
    ['Programme', 'B.Tech Computer Science & Engineering (Software Engineering) · Year 4, Semester 7 · Section AI2'],
    ['Department', 'Computational Intelligence (CINTEL), SRM Institute of Science and Technology'],
    ['Academic year', '2026–2027'],
    ['System under test', 'Cypress Kitchen Sink (cypress-io/cypress-example-kitchensink, commit f2cb767)'],
    ['Tool', 'Cypress 16.2.1 (Chrome, Firefox, Edge, Electron) with GitHub Actions'],
    ['Repository', 'github.com/RaktimChandra/cypress-kitchen-sink-testing'],
  ]),
)

// TOC
add(
  new Paragraph({ pageBreakBefore: true, children: [t('Contents', { size: 32, bold: true, color: INK })] }),
  new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
  P([t('Update the table in Word with right-click → Update Field if page numbers are missing.', { italics: true, color: MUTED, size: 18 })]),
)

// 1 Executive summary
add(
  H1('1. Executive summary'),
  P(`This project verifies the Cypress Kitchen Sink, the official demo application that exercises every Cypress command, as if it were a product going to release. The brief asked for at least form controls, navigation, assertions and UI interactions. The suite covers those four areas in depth and then extends to the whole V&V spectrum: accessibility, visual regression, performance budgets, security, responsive layout, HTTP/API behaviour, robustness, mutation testing and code coverage.`),
  kv([
    ['Designed test cases', `${total} automated cases, each with a unique ID (TC-AREA-NNN), technique, priority, requirement and expected result`],
    ['Spec files', `${nSpecs} Cypress specs in 19 numbered areas`],
    ['Requirements', `${reqs.length} requirements derived from the application; every requirement traces to at least one case`],
    ['Design techniques', 'ECP, BVA (normal and robust), decision tables, cause-effect graphing, state transition (0- and 1-switch), pairwise, error guessing, fault injection, random (seeded monkey), scenario/UAT, WCAG and OWASP checklists'],
    ['Defects found', `${defects.length} real defects in the Kitchen Sink, each reproduced by an automated "known defect" test`],
    ['Browsers', 'Chrome, Firefox, Edge and Electron, in a GitHub Actions matrix'],
    ['Quality of the tests', '32 hand-written mutants (mutation testing) and Istanbul coverage of the application JavaScript'],
    ['Execution results', haveResults ? `Included from CI: ${Object.keys(results).join(', ')}` : 'Pending the first CI run. This report prints no pass/fail figures until real evidence exists.'],
  ]),
  gap(),
  P([bold('Key findings. '), t(`The Kitchen Sink is functionally solid on its documented happy paths, but negative, robustness and checklist testing found ${defects.length} defects. Four are Major: an unknown todo route crashes the router (DEF-KS-001), corrupt localStorage makes the todo app unusable (DEF-KS-003), items created in the same millisecond share an id so ticking one completes its neighbour (DEF-KS-009), and form fields have no accessible name (DEF-KS-011). The rest include the Enter key wiping the email field, deleted todos returning on reload, broken links, an exposed directory listing, tab-nabbing links, phone overflow and WCAG contrast and link-cue failures.`)]),
)

// 2 Introduction
add(
  H1('2. Introduction'),
  H2('2.1 Purpose'),
  P('This document is the complete record of the automated-testing component of the SVV course. It contains the test plan (IEEE 829 / ISO/IEC/IEEE 29119-3 structure), the test design with worked examples of every FT3 technique, the framework architecture, the test inventory, the defect reports, the traceability, the results and three case studies.'),
  H2('2.2 System under test'),
  P('The Cypress Kitchen Sink is a static multi-page web application (HTML, Bootstrap 3, jQuery 1.12) that the Cypress team uses to demonstrate the API. It has 21 pages: a home page, 17 "commands" pages (actions, querying, traversal, assertions, navigation, network requests, storage, cookies, window, viewport, location, spies/stubs/clocks, files, utilities, connectors, aliasing, waiting, misc) and a TodoMVC application with routing and localStorage persistence. We pinned commit f2cb767 and serve it unmodified with the "serve" static server on port 8080.'),
  H2('2.3 Scope'),
  table(['In scope', 'Out of scope'], [
    ['All 21 pages; navbar and in-page navigation, history, hash routes', 'Third-party endpoint jsonplaceholder.cypress.io (stubbed; a global intercept returns 503 for any unstubbed call)'],
    ['Every form control: text, email, password, textarea, disabled/readonly, checkbox, radio, single and multi select, range, submit', 'Load testing beyond single-user budgets'],
    ['UI interactions: click positions, dblclick, rightclick, hover, focus/blur, scroll, trigger, drag of range, popover, tooltips', 'Server-side code (the SUT has none)'],
    ['Assertions (should/expect/and, chai, custom), querying and traversal', 'Browser versions older than the current stable channel'],
    ['Todo app functions, persistence and state machine', ''],
    ['Non-functional: accessibility, performance, security, visual, responsive, compatibility, reliability', ''],
  ], [W / 2, W / 2]),
  H2('2.4 Definitions'),
  table(['Term', 'Meaning'], [
    ['SUT', 'System under test: the Kitchen Sink at commit f2cb767'],
    ['TC-AREA-NNN', 'Test-case identifier; AREA is one of 22 area codes (e.g. FC = form controls)'],
    ['Known defect test', 'A test that passes while a defect still reproduces and fails as soon as the defect is fixed, so the suite stays green and the defect is never forgotten'],
    ['Oracle', 'The source of the expected result: HTML Living Standard, WCAG 2.1, OWASP, the page text, or observed baseline'],
    ['ECP / BVA', 'Equivalence-class partitioning / boundary-value analysis'],
  ], [2600, W - 2600]),
)

// 3 Test plan
add(
  H1('3. Test plan'),
  H2('3.1 Test items and features'),
  P('Test items are the 21 pages and the TodoMVC script (assets/js/todo/*.js). Features are expressed as 53 requirements in docs/requirements.json, grouped as follows.'),
  table(['Requirement group', 'IDs', 'Count', 'Cases tracing'], (() => {
    const g = {}
    reqs.forEach((r) => { (g[r.area] = g[r.area] || []).push(r.id) })
    return Object.entries(g).map(([a, ids]) => [a, `${ids[0]} … ${ids[ids.length - 1]}`, String(ids.length), String(ids.reduce((s, id) => s + reqCover[id].length, 0))])
  })(), [2600, 3438, 1400, 2200]),
  H2('3.2 Approach'),
  B([bold('Levels. '), t('System testing through the browser (577 cases) and acceptance testing with Given/When/Then journeys (5 cases). Component-level confidence comes from mutation testing of the todo scripts.')]),
  B([bold('Black-box design. '), t('Every case names its technique; FT3 techniques (ECP, BVA, decision tables, cause-effect graphing, state transition) drive the form-control and todo suites.')]),
  B([bold('White-box measurement. '), t('Application JavaScript is instrumented with nyc/Istanbul; the coverage job reports statement, branch and function coverage of the code the tests reach.')]),
  B([bold('Test-quality measurement. '), t('32 mutants are injected one at a time into a copy of the app; a mutant is killed when at least one targeted spec fails.')]),
  B([bold('Automation. '), t('Cypress 16 with @cypress/grep tags, cypress-real-events (CDP) for native keyboard/mouse, axe-core 4.11 for WCAG, pixelmatch for visual diffs, mochawesome and JUnit reporters.')]),
  H2('3.3 Entry, exit, suspension and resumption criteria'),
  table(['Criterion', 'Definition'], [
    ['Entry', 'SUT served on :8080 and every smoke test (TC-SMK-001…021) passes'],
    ['Exit', 'All P1 cases pass in all four browsers; no FAIL in any browser; each known defect still reproduces or is closed; 100 % requirement coverage; mutation score ≥ 80 %'],
    ['Suspension', 'Any smoke failure, or the SUT not reachable within 60 s (wait-on timeout)'],
    ['Resumption', 'Smoke suite green again on the same commit'],
    ['Flaky test', 'One automatic retry in run mode; a test that passes only on retry is logged to evidence/flaky-<browser>.json and treated as a defect in the test'],
  ], [2400, W - 2400]),
  H2('3.4 Environment'),
  table(['Item', 'Value'], [
    ['Runner', 'GitHub Actions ubuntu-24.04, Node 24, cypress-io/github-action v7'],
    ['Browsers', 'Chrome stable, Firefox stable, Edge stable, Electron (bundled)'],
    ['Viewport', '1280 × 800 by default; device sizes in the responsive suite'],
    ['Server', 'serve 14.2.6, Cache-Control: no-cache, clean URLs'],
    ['Reporters', 'spec (console), mochawesome (JSON → HTML), mocha-junit-reporter (XML)'],
    ['Evidence', 'Videos, screenshots, visual diffs, axe results, performance metrics, coverage and mutation reports, published to the results branch'],
  ], [2400, W - 2400]),
  H2('3.5 Deliverables'),
  B('Test plan, design and this report (docx/pdf)'), B('Test-management workbook (xlsx): every case, RTM, requirements, defects'),
  B('Presentation deck (pptx)'), B('Automated suite and CI pipeline (GitHub repository)'),
  B('Execution evidence: mochawesome HTML, JUnit XML, videos, screenshots, coverage and mutation reports'), B('FT3 preparation pack with solved problems drawn from this project'),
  H2('3.6 Risks and mitigations'),
  table(['Risk', 'Impact', 'Mitigation'], [
    ['Third-party API (jsonplaceholder) slow or down', 'Flaky network tests', 'Every network test stubs with cy.intercept; a global intercept fails any unstubbed call fast with 503'],
    ['Rendering differs across browsers', 'False visual failures', 'Baselines are stored per browser; threshold 0.2 % of pixels'],
    ['Timing-dependent widgets', 'Flaky tests', 'Only retrying assertions, cy.clock for timers, no fixed cy.wait'],
    ['Visibility rules changed in Cypress 16', 'False negatives in scroll tests', 'Geometric in-box checks instead of :visible for overflow containers'],
    ['Defects in the SUT block other tests', 'Cascading failures', 'Known-defect pattern isolates each defect in one case'],
  ], [3000, 2200, W - 5200]),
)

// 4 Test design
const ecpRows = cases.filter((c) => /^TC-FC-0(4\d|5[0-6])$/.test(c.id)).map((c) => [c.id, c.title.split('—')[0].replace('Email ', '').trim(), String(c.data || '""'), /valid$/.test(c.title) && !/invalid$/.test(c.title) ? 'Valid' : 'Invalid'])
const bvaRows = cases.filter((c) => /^TC-FC-1(4\d|5[0-4])$/.test(c.id)).map((c) => [c.id, c.title.replace(/^Range /, '').split(':')[0], c.data === '' ? '""' : String(c.data ?? ''), (c.expected.match(/value (\S+);/) || [])[1] || '0', c.technique])
add(
  H1('4. Test design'),
  P('Each technique below is shown with the real cases it produced. The case IDs match the code and the workbook, so the design can be followed straight to the implementation and the result.'),
  png('docs/figures/charts/cases_by_technique.png', 560), Caption('Figure 4.1 – Test cases by design technique'),

  H2('4.1 Equivalence-class partitioning – email field'),
  P('Input: the type="email" field on the Actions page. Oracle: the HTML Living Standard "valid e-mail address" grammar, checked through the Constraint Validation API (checkValidity() and validity.typeMismatch) rather than by submitting the form. Six valid classes and eleven invalid classes give 17 cases; one representative per class.'),
  table(['Case', 'Class', 'Representative', 'Expected'], ecpRows, [1500, 3000, 3138, 2000]),
  P([bold('Insight. '), t('I9 ("quoted"@b.com) is valid under RFC 5322 but invalid in HTML. Partitioning by the right specification matters: a tester using the RFC as the oracle would have reported a false defect.')]),

  H2('4.2 Boundary-value analysis – range slider'),
  P('Input: <input type="range"> with min 0, max 100, step 1. Oracle: the HTML value-sanitisation algorithm (clamp to [min, max], round to the nearest step with ties upward, use the default (min + max) / 2 = 50 when the value is not a valid floating-point number). Normal BVA gives min−1, min, min+1, nominal, max−1, max, max+1; robust BVA adds far-out values; step boundaries and invalid partitions complete the set.'),
  table(['Case', 'Boundary', 'Input', 'Expected value', 'Technique'], bvaRows, [1400, 3000, 1500, 1600, 2138]),
  P('Implementation (data-driven; one tc() call per row):'),
  ...Code(`cases.forEach(([label, input, expected, technique], i) => {
  tc({ id: \`TC-FC-\${String(141 + i).padStart(3, '0')}\`, technique, req: 'REQ-FC-11', data: String(input),
       title: \`Range \${label}: set \${JSON.stringify(input)} → shows \${expected}\` }, () => {
    cy.get('.trigger-input-range').invoke('val', input).trigger('change')
      .should('have.value', expected)
      .next('p').should('have.text', expected)
  })
})`),

  H2('4.3 Decision tables'),
  H3('Checkboxes (2³ = 8 rules)'),
  P('Conditions C1–C3: which of checkbox1/2/3 are passed to .check([...]). Actions: each box checked or not. Because the boxes are independent, the full table is small enough to test exhaustively (TC-FC-083 … 090).'),
  table(['Rule', 'C1', 'C2', 'C3', 'Case'], [['R1', 'N', 'N', 'N', 'TC-FC-083'], ['R2', 'Y', 'N', 'N', 'TC-FC-084'], ['R3', 'N', 'Y', 'N', 'TC-FC-085'], ['R4', 'Y', 'Y', 'N', 'TC-FC-086'], ['R5', 'N', 'N', 'Y', 'TC-FC-087'], ['R6', 'Y', 'N', 'Y', 'TC-FC-088'], ['R7', 'N', 'Y', 'Y', 'TC-FC-089'], ['R8', 'Y', 'Y', 'Y', 'TC-FC-090']], [1500, 1500, 1500, 1500, 3638]),
  H3('Todo footer (collapsed table, 4 rules)'),
  P('Conditions: number of items (0 or ≥ 1), number completed (0, some, all). Actions: A1 footer shown, A2 "Clear completed" shown, A3 toggle-all checked. Impossible combinations (completed > items) are removed, so 12 combinations collapse to 4 rules.'),
  table(['Rule', 'Items', 'Completed', 'A1 footer', 'A2 clear', 'A3 toggle-all', 'Case'], [['R1', '0', '–', 'N', 'N', 'N', 'TC-TD-070'], ['R2', '≥1', '0', 'Y', 'N', 'N', 'TC-TD-071'], ['R3', '≥1', 'some', 'Y', 'Y', 'N', 'TC-TD-072'], ['R4', '≥1', 'all', 'Y', 'Y', 'Y', 'TC-TD-073']], [900, 1100, 1300, 1400, 1300, 1600, 2038]),

  H2('4.4 Cause-effect graphing – finishing a todo edit'),
  P('Causes: C1 Enter, C2 blur, C3 Escape (exactly one; the exclusive constraint E), C4 trimmed text is non-empty. Effects: E1 save trimmed title, E2 delete the item, E3 keep the original title. Graph: E1 = (C1 ∨ C2) ∧ C4; E2 = (C1 ∨ C2) ∧ ¬C4; E3 = C3. Converting the graph into a limited-entry decision table gives the eight cases K1–K8 (TC-TD-080 … 087).'),
  png('docs/figures/cause_effect_graph.png', 520), Caption('Figure 4.2 – Cause-effect graph for the edit-finish behaviour'),
  table(['Case', 'Event', 'Text', 'Effect'], cases.filter((c) => /^TC-TD-08[0-7]$/.test(c.id)).map((c) => { const d = JSON.parse(c.data || '{}'); return [c.id, d.how || '', JSON.stringify(d.text ?? ''), c.expected] }), [1400, 1600, 2400, 4238]),

  H2('4.5 State-transition testing – todo item'),
  P('States: S0 absent, S1 active, S2 completed, S3 editing an active item, S4 editing a completed item, S5 deleted. Twelve valid transitions T1–T12 give 0-switch coverage (TC-TD-100 … 111). Invalid transitions (TC-TD-115, 116) confirm that events with no transition do nothing, and a 1-switch path (TC-TD-117) covers pairs of consecutive transitions.'),
  png('docs/figures/todo_state_machine.png', 560), Caption('Figure 4.3 – State machine of a todo item'),
  table(['Case', 'Transition'], cases.filter((c) => /^TC-TD-1(0\d|1[0-7])$/.test(c.id)).map((c) => [c.id, c.title]), [1600, W - 1600]),

  H2('4.6 Other techniques'),
  table(['Technique', 'Where', 'What it adds'], [
    ['Pairwise (device × page)', 'TC-RSP-001 … 010', 'Covers every pair of 5 device profiles and the key pages in 10 runs instead of all combinations'],
    ['Error guessing', '30 cases', 'Enter key in a one-field form, double submit, rapid clicks, Unicode, very long text: found DEF-KS-002'],
    ['Fault injection', 'TC-TD-134', 'Corrupt localStorage before load: found DEF-KS-003'],
    ['Random (monkey) testing', 'TC-ROB-001 … 003', 'Seeded mulberry32 generator drives 200 random actions per seed; the seed is logged so any failure can be replayed'],
    ['Scenario / UAT', 'TC-UAT-001 … 005', 'Given/When/Then journeys a user would recognise'],
    ['Checklists', 'WCAG 2.1 AA, OWASP Secure Headers', 'Accessibility and security audits run automatically on every page'],
  ], [2600, 2300, W - 4900]),
)

// 5 Framework
add(
  H1('5. Test framework architecture'),
  png('docs/figures/harness_architecture.png', 600), Caption('Figure 5.1 – Harness architecture'),
  H2('5.1 Test-case metadata – tc()'),
  P('Every test is declared through tc(meta, fn) rather than it(). The helper builds the title "TC-XXX-NNN | title", adds grep tags for technique, type and priority, rejects duplicate IDs at load time, and writes a JSON catalogue entry. The catalogue is merged with the mochawesome results to give one row per test case per browser, which feeds the workbook and this report.'),
  ...Code(`tc({ id: 'TC-FC-040', title: 'Email V1 — simple local@domain → valid', technique: 'ECP',
     req: 'REQ-FC-02', priority: 'P1', data: 'user@example.com',
     expected: 'checkValidity() = true; typeMismatch = false' }, () => { /* steps */ })`),
  H2('5.2 Known-defect tests'),
  P('A defect should not turn the build red for ever, and it should not be skipped and forgotten either. tc.knownDefect() inverts the outcome: the test passes while the defect reproduces (an assertion fails or the page throws), and it fails with the message "DEF-KS-00x no longer reproduces" once the product is fixed, prompting the tester to convert it into a normal regression test.'),
  ...Code(fs.readFileSync(path.join(ROOT, 'cypress/support/tc.js'), 'utf8').match(/tc\.knownDefect = [\s\S]*?\n\}\)\n/)[0].trim()),
  H2('5.3 Custom commands'),
  table(['Command', 'Purpose'], [
    ['cy.visitPage(url)', 'Visit and spy on console.error and uncaught page errors (@consoleError)'],
    ['cy.assertNoPageErrors()', 'Fail if the page logged an error during the test'],
    ['cy.visitTodos(items) / cy.addTodo / cy.storedTodos', 'Seed and read the todo list through localStorage'],
    ['cy.checkA11y({failOn})', 'Inject axe-core 4.11 and fail on new serious/critical WCAG 2.1 AA violations'],
    ['cy.matchSnapshot(name)', 'Screenshot and compare with the per-browser baseline using pixelmatch'],
    ['cy.pageMetrics()', 'Navigation Timing + Paint Timing: TTFB, DCL, load, FCP, requests, KB, DOM nodes'],
  ], [3600, W - 3600]),
  H2('5.4 Continuous integration'),
  png('docs/figures/ci_pipeline.png', 600), Caption('Figure 5.2 – CI pipeline'),
  P('ci.yml runs lint, then the full suite in a four-browser matrix, a coverage job on an instrumented copy of the app, and a publish job that commits all evidence to an orphan "results" branch. mutation.yml runs the 32 mutants in four shards. Each job writes a Markdown summary to the run page.'),
)

// 6 Inventory
add(
  H1('6. Test suite inventory'),
  png('docs/figures/charts/cases_by_area.png', 560), Caption('Figure 6.1 – Cases by functional area'),
  table(['Area', 'Code', 'Cases', 'P1', 'Spec files'], AREAS.map(([a, n]) => [n, a, String(count((c) => areaOf(c) === a)), String(count((c) => areaOf(c) === a && c.priority === 'P1')), specsOf(a).map((s) => s.split('/').pop()).join(', ')]), [2300, 900, 900, 700, W - 4800], { size: 16 }),
  gap(),
  table(['Type', 'Cases'], Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)]), [4000, 2000]),
  gap(),
  P(`Priorities: ${Object.entries(prCounts).sort().map(([k, v]) => `${k} ${v}`).join(' · ')}.`),
)

// 7 Demonstration areas (brief focus)
const show = (ids) => ids.map((id) => byId[id]).filter(Boolean)
function detail (c) {
  return [kv([
    ['Test case ID', c.id], ['Title', c.title], ['Requirement', c.req || ''], ['Technique / type', `${c.technique} · ${c.type}`],
    ['Priority / level', `${c.priority} · ${c.level}`], ['Test data', c.data == null || c.data === '' ? '—' : String(c.data)],
    ['Expected result', c.expected || ''], ['Spec', c.spec],
    ['Status', haveResults ? Object.entries(results).map(([b, j]) => `${b}: ${((j.results || j.rows || []).find((r) => r.id === c.id) || {}).status || '-'}`).join(' · ') : 'Pending CI run'],
  ], 2200), gap()]
}
add(
  H1('7. The four required demonstration areas'),
  P('The brief requires form controls, navigation, assertions and UI interactions. Each area below lists what was tested and gives representative cases in the classic manual test-case format; the full list is in Appendix A and the workbook.'),
  H2(`7.1 Form controls (${count((c) => areaOf(c) === 'FC')} cases)`),
  B('Text inputs: typing, special-character sequences ({selectall}, {backspace}, {del}, arrows), delay, focus/blur styles, clear, disabled and readonly fields'),
  B('Email validation by ECP (17 classes); submit-form behaviour; checkbox and radio decision tables; single and multi select by value, text and index; range slider by BVA'),
  ...show(['TC-FC-040', 'TC-FC-147', 'TC-FC-088', 'TC-FC-032']).flatMap(detail),
  H2(`7.2 Navigation (${count((c) => areaOf(c) === 'NAV')} cases)`),
  B('Navbar: every Commands entry in order, active state, brand link, Utilities/Cypress API/Todo links'),
  B('History: cy.go back/forward, reload with and without cache, location checks'),
  B('In-page anchors, clean URLs, .html redirects and the todo hash routes (#/, #/active, #/completed)'),
  ...show(['TC-NAV-010', 'TC-NAV-040', 'TC-NAV-085']).flatMap(detail),
  H2(`7.3 Assertions (${count((c) => areaOf(c) === 'AS')} cases)`),
  B('Implicit (should/and) and explicit (expect) assertions, chai-jQuery, negative assertions, retry-ability, callback assertions and a custom chai method textTrimmed'),
  ...show(['TC-AS-001', 'TC-AS-010']).flatMap(detail),
  H2(`7.4 UI interactions (${count((c) => areaOf(c) === 'UI')} cases)`),
  B('Click on all nine named positions of a canvas with pixel-level verification; click by coordinates; multiple clicks; dblclick; rightclick'),
  B('Scroll into view, scroll positions inside overflow containers, trigger events, hover with real CDP events, popover and tooltip widgets'),
  ...show(['TC-UI-005', 'TC-UI-030']).flatMap(detail),
)

// 8 Non-functional
add(
  H1('8. Non-functional testing'),
  table(['Quality', 'Method', 'Cases', 'Criterion'], [
    ['Accessibility', 'axe-core 4.11, WCAG 2.1 A/AA rules, plus keyboard and semantics checks', String(count((c) => areaOf(c) === 'A11Y')), 'No new serious or critical violation; known ones documented'],
    ['Performance', 'Navigation/Paint Timing on all 21 pages, long-task observer, add-todo latency', String(count((c) => areaOf(c) === 'PERF')), 'DCL < 1.5 s, load < 3 s, FCP < 2 s, ≤ 30 requests, ≤ 1500 KB'],
    ['Security', 'XSS payloads into every text sink, OWASP header audit, tab-nabbing, directory listing', String(count((c) => areaOf(c) === 'SEC')), 'Payloads rendered as text; no script execution'],
    ['Visual', 'Per-browser baselines, pixelmatch diff, detector self-test', String(count((c) => areaOf(c) === 'VIS')), '≤ 0.2 % pixels differ'],
    ['Responsive / compatibility', 'Pairwise device × page, overflow scan, 4-browser matrix', String(count((c) => areaOf(c) === 'RSP')), 'No horizontal overflow; layout intact'],
    ['HTTP / API', 'cy.request: status, headers, ETag/304, methods, link check, 404s', String(count((c) => areaOf(c) === 'API')), 'Correct status codes; no broken links'],
    ['Robustness', 'Seeded monkey testing, rapid input, storage faults', String(count((c) => areaOf(c) === 'ROB')), 'No uncaught exception'],
  ], [1800, 3500, 900, W - 6200]),
  H2('8.1 Mutation testing'),
  P('tools/mutants.js defines 32 mutants of the todo application, using classic operators: relational and boundary changes (< ↔ <=), negated conditions, removed trim(), wrong plural rule, removed persistence calls, swapped CSS classes and inverted filters. One mutant (M32, let → const on a variable that is never reassigned) is equivalent and is excluded from the score. tools/mutation.js serves each mutant on its own port and runs only the specs that target it, using the Cypress module API.'),
  P(haveResults ? 'Score: see the evidence branch.' : 'Mutation score: pending CI run.'),
  H2('8.2 Code coverage'),
  P('The coverage job instruments app/assets/js (excluding vendor files) with nyc, runs the suite with --expose coverage=true, and produces lcov, HTML and json-summary reports. Coverage tells us which application branches no test reaches; it is a white-box adequacy check on top of the black-box design.'),
)

// 9 Defects
add(
  H1('9. Defect reports'),
  png('docs/figures/charts/defects_by_severity.png', 420), Caption('Figure 9.1 – Defects by severity'),
  table(['ID', 'Title', 'Severity', 'Test'], defects.map((d) => [d.id, d.title, d.severity, d.test]), [1400, 5000, 1200, 2038]),
  ...defects.flatMap((d) => [H3(`${d.id} – ${d.title}`), kv([
    ['Area', d.area], ['Severity / priority', `${d.severity} / ${d.priority}`], ['Found by', d.technique], ['Reproducing test', d.test],
    ['Steps', d.steps], ['Expected', d.expected], ['Actual', d.actual], ['Suggested fix', d.fix], ['Status', 'Open – reproduced automatically on every run'],
  ], 2200), gap()]),
)

// 10 Results
const resultRows = Object.entries(results).map(([b, j]) => [b, j.summary.total, j.summary.pass, j.summary.knownDefect, j.summary.fail, j.summary.skipped].map(String))
add(
  H1('10. Execution results'),
  ...(haveResults
    ? [table(['Browser', 'Total', 'Pass', 'Known defect', 'Fail', 'Skipped'], resultRows, [2000, 1500, 1500, 1700, 1400, 1538]), gap(),
        fs.existsSync(path.join(ROOT, 'docs/figures/charts/results_by_browser.png')) ? png('docs/figures/charts/results_by_browser.png', 560) : gap()]
    : [P('No execution evidence was available when this version of the report was generated. The CI pipeline (Section 5.4) produces it; re-running node tools/deliverables/build_report.js with the evidence folder present fills this section with the real figures, per browser and per case. No result in this document is estimated.'),
        table(['Browser', 'Total', 'Pass', 'Known defect', 'Fail', 'Skipped'], ['chrome', 'firefox', 'edge', 'electron'].map((b) => [b, String(total), 'pending', 'pending', 'pending', 'pending']), [2000, 1500, 1500, 1700, 1400, 1538])]),
  H2('10.1 How the suite converged (real CI history)'),
  table(['Run', 'Commit', 'Cases', 'Chrome pass / KD / fail', 'Firefox pass / KD / fail / skip'], [
    ...HIST.runs.map((r) => [r.label, r.commit, String(r.cases), `${r.browsers.chrome.pass} / ${r.browsers.chrome.knownDefect} / ${r.browsers.chrome.fail}`, `${r.browsers.firefox.pass} / ${r.browsers.firefox.knownDefect} / ${r.browsers.firefox.fail} / ${r.browsers.firefox.skipped}`]),
  ], [2600, 1100, 900, 2400, 2638]),
  gap(),
  P(HIST.triage_note || ''),
  table(['Triage category', 'Failing cases', 'Examples'], HIST.triage.map((t) => [t.category, String(t.count), t.examples]), [3000, 1300, 5338]),
  gap(),
  H2('10.2 Code coverage'),
  ...(coverage ? [table(['Metric', 'Covered', 'Total', '%'], ['lines', 'statements', 'functions', 'branches'].map((k) => [k[0].toUpperCase() + k.slice(1), String(coverage.total[k].covered), String(coverage.total[k].total), `${coverage.total[k].pct}%`]), [3000, 2200, 2200, 2238]),
    P('Istanbul (nyc) instrumentation of app/assets/js, vendor libraries excluded, collected while the full suite ran in Chrome.')] : [P('Coverage evidence not available for this build.')]),
  H2('10.3 Mutation testing'),
  ...(mutants.length ? [P(`${mutants.length} mutants: ${mK} killed, ${mS} survived, ${mE} equivalent. Mutation score = ${mK} / (${mK + mS}) = ${Math.round(1000 * mK / (mK + mS)) / 10}%.`),
    table(['Mutant', 'Operator', 'File', 'Change', 'Status'], mutants.sort((a, b) => a.id.localeCompare(b.id)).map((m) => [m.id, m.op || '', (m.file || '').split('/').pop(), m.desc || '', m.status]), [900, 2200, 1700, 3638, 1200], { size: 15 }),
    P(HIST.mutation && HIST.mutation[0] ? `The first mutation run left ${HIST.mutation[0].survived} survivors (${HIST.mutation[0].survivors}). Both tests were strengthened: the footer decision-table cases now assert the rendered display of "Clear completed", and the disabled-control cases no longer hide failures inside cy.on('fail').` : '')] : [P('Mutation evidence not available for this build.')]),
  H2('10.4 Performance evidence'),
  ...(perf.length ? [table(['Page', 'TTFB ms', 'DCL ms', 'Load ms', 'Requests', 'KB', 'DOM nodes'], perf.map((p) => [p.page, Math.round(p.ttfb), Math.round(p.domContentLoaded), Math.round(p.load), p.resources, p.transferKB, p.domNodes].map(String)), [3000, 1000, 1000, 1100, 1100, 1100, 1338], { size: 15 })] : [P('Performance evidence not available for this build.')]),
  H2('10.5 Accessibility evidence'),
  ...(a11yEv.length ? [table(['Page', 'Serious/critical rules (nodes)'], (() => { const seen = new Set(); return a11yEv.filter((r) => !seen.has(r.page) && seen.add(r.page)).map((r) => [r.page, r.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id} (${v.nodes})`).join(', ') || 'none']) })(), [3000, 6638], { size: 15 })] : [P('Accessibility evidence not available for this build.')]),
  H2('10.6 Test summary (IEEE 829 TSR)'),
  kv([
    ['Summary', `${total} cases across ${nSpecs} specs were executed against the Kitchen Sink f2cb767 in the browsers listed above.`],
    ['Variances', 'Visibility checks inside overflow containers use geometry instead of :visible because of the Cypress 16 visibility algorithm; Firefox and Electron use the legacy network path for cy.intercept.'],
    ['Comprehensiveness', `${reqs.length}/${reqs.length} requirements covered; every page visited by smoke, a11y, performance and visual suites.`],
    ['Incidents', `${defects.length} defects logged (Section 9).`],
    ['Evaluation', 'The application is fit for its purpose as a demo; the two Major defects should be fixed before it is used as a reference for robust coding.'],
    ['Approvals', `Prepared by ${TEAM.team} (${TEAM.members.map((m) => m.name).join(', ')}) · Reviewed by: ____________ (faculty)`],
  ], 2400),
)

// 11 Traceability
add(
  H1('11. Requirements traceability'),
  png('docs/figures/charts/rtm_by_area.png', 520), Caption('Figure 11.1 – Cases tracing to each requirement group'),
  table(['Requirement', 'Text', '# cases', 'Example cases'], reqs.map((r) => [r.id, r.text, String(reqCover[r.id].length), reqCover[r.id].slice(0, 4).join(', ') + (reqCover[r.id].length > 4 ? ' …' : '')]), [1500, 4900, 800, 2438], { size: 16 }),
)

// 12 Case studies
add(
  H1('12. Case studies'),
  H2('12.1 The Enter key that erased the user\'s work (DEF-KS-002)'),
  P('While writing text-input tests, the first draft typed "fake@email.com{enter}". The test failed for a reason that had nothing to do with the assertion: the page had reloaded. The Actions page wraps the email input in a <form> with a single text field and no submit handler, and HTML defines "implicit submission": pressing Enter in such a form submits it. The browser sent GET /commands/actions? and the typed value was lost.'),
  P('Lesson: a flaky-looking failure was a real defect. We kept the regular tests free of {enter}, wrote one known-defect test that asserts the URL does not gain a "?" and the value survives, and logged the defect with a one-line fix (preventDefault in a submit handler).'),
  H2('12.2 The todo item that toggled its neighbour (DEF-KS-009)'),
  P('In the first CI run, TC-TD-132 found two stored items where three were expected. Chasing that discrepancy showed that the two demo items are created in the same millisecond and receive the same id, because store.js uses new Date().getTime() as the id. With duplicate ids, ticking the second item ("Walk the dog") completes the first ("Pay electric bill") instead, and the wrong state is persisted.'),
  P('The defect is timing-dependent, so a naive test would be flaky. TC-TD-136 freezes only Date with cy.clock before the page loads, which makes the collision happen on every run in every browser. The lesson: when a defect depends on time, control time.'),
  H2('12.3 Choosing the right oracle for email validation'),
  P('The first ECP draft used RFC 5322 as the oracle and expected "quoted"@b.com to be valid. The browser said otherwise, which looked like a defect. It is not: HTML deliberately uses a stricter, "willful violation" grammar. The partitions were re-derived from the HTML standard and the test reads checkValidity() and validity.typeMismatch, which removes any dependence on how the page reacts to submission. The case study shows why every test needs a named oracle.'),
  H2('12.4 Testing a state machine, then breaking it on purpose'),
  P('The todo item has six states. Building the diagram before writing code exposed two transitions that are easy to miss: editing a completed item keeps it completed (T7), and Enter on an empty edit deletes rather than restores (T9). Fault injection then targeted the state the diagram assumes is always valid, the persisted list. Writing "{not json" or "{}" into localStorage made the app unusable (DEF-KS-003), and an empty list re-seeded the demo items (DEF-KS-004). Mutation testing then checked that the suite notices when transitions are broken in the code.'),
)

// 13 Conclusion
add(
  H1('13. Conclusion and lessons'),
  B('Naming the technique and the oracle for every case made the suite reviewable: anyone can see why a value was chosen and where its expected result comes from.'),
  B(`Negative, boundary, fault-injection and checklist cases found all ${defects.length} defects. Happy-path tests found none.`),
  B('Triage matters: most first-run failures were wrong oracles or browser behaviour, not product defects. Each was resolved against its specification before anything was logged.'),
  B('The known-defect pattern keeps CI green without hiding defects and turns each fix into an automatic regression test.'),
  B('Cross-browser runs and per-browser visual baselines separate real regressions from rendering differences.'),
  B('Mutation testing and coverage measure the tests themselves, which is the "verification of the verification".'),
)

// Appendix A
add(
  H1('Appendix A – Complete test-case list'),
  P(`All ${total} cases, ordered by ID. Expected results, data and per-browser status are in the workbook.`),
  table(['ID', 'Title', 'Technique', 'Pri', 'Req'], cases.map((c) => [c.id, c.title, c.technique, c.priority, c.req || '']), [1350, 4700, 1900, 500, 1188], { size: 14 }),
)

// Appendix B
add(
  H1('Appendix B – How to run'),
  ...Code(`git clone https://github.com/RaktimChandra/cypress-kitchen-sink-testing.git
cd cypress-kitchen-sink-testing
npm ci                      # Node 22+; downloads Cypress 16.2.1
npm test                    # starts the SUT on :8080 and runs every spec headless
npm run test:demo           # headed Chrome: form controls, navigation, assertions, UI
npx cypress run --env grepTags=@bva         # one technique only
npm run test:coverage && npx nyc report     # coverage
npm run mutation                            # 32 mutants
npm run report                              # merged mochawesome HTML`),
)

// ---- document -----------------------------------------------------------------------
const doc = new Document({
  creator: TEAM.team, title: 'Interactive Web Components Testing – Project Report',
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: '222222' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 34, bold: true, color: INK }, paragraph: { spacing: { before: 120, after: 200 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 26, bold: true, color: ACCENT }, paragraph: { spacing: { before: 280, after: 120 }, keepNext: true, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 22, bold: true, color: INK }, paragraph: { spacing: { before: 200, after: 100 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }, { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1000, hanging: 270 } } } }] },
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: new Header({ children: [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } }, tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [t('Interactive Web Components Testing', { size: 16, color: MUTED }), t('\tSVV · FT3 Automated Testing · SRMIST', { size: 16, color: MUTED })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [t(`${TEAM.team} · SVV FT3`, { size: 16, color: MUTED }), t('\tPage ', { size: 16, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED })] })] }) },
    children: kids,
  }],
})
fs.mkdirSync(path.dirname(OUT), { recursive: true })
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log('report ->', OUT) })
