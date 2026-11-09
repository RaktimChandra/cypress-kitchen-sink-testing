#!/usr/bin/env node
/**
 * Build the presentation deck (.pptx) from repository data.
 *   node tools/deliverables/build_deck.js [out.pptx]
 */
const fs = require('fs')
const path = require('path')
const pptxgen = require('pptxgenjs')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const sharp = require('sharp')
const fa = require('react-icons/fa')
const { applyTheme } = require('/mnt/skills/public/pptx/scripts/apply_theme.js')

const ROOT = path.resolve(__dirname, '..', '..')
const OUT = process.argv[2] || path.join(ROOT, 'deliverables', 'CKS_Presentation.pptx')
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const cases = rd('reports/catalogue.json').cases
const reqs = rd('docs/requirements.json')
const defects = rd('docs/defects.json')
const fig = (f) => path.join(ROOT, 'docs', 'figures', f)
const areaOf = (c) => c.id.split('-')[1]
const n = (f) => cases.filter(f).length
const nA = (a) => n((c) => areaOf(c) === a)
const nSpecs = new Set(cases.map((c) => c.spec)).size

// optional CI evidence
const results = {}
;(function walk (d) {
  if (!fs.existsSync(d)) return
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (/^results-.*\.json$/.test(f)) { const j = JSON.parse(fs.readFileSync(p, 'utf8')); results[j.summary.browser] = j }
  }
})(process.env.EVIDENCE_DIR || path.join(ROOT, 'evidence'))
const haveResults = Object.keys(results).length > 0

const THEME = {
  name: 'Kitchen Sink QA', headFontFace: 'Arial', bodyFontFace: 'Calibri',
  colors: {
    dk1: '1B1E2E', lt1: 'FFFFFF', dk2: '2A3047', lt2: 'EEF3F6',
    accent1: '2E9E6E', accent2: '1F7A8C', accent3: 'D98E04', accent4: 'C23B3B', accent5: '3D5A99', accent6: '8A90A2',
    hlink: '1F7A8C', folHlink: '3D5A99',
  },
}
const HEX = THEME.colors

async function icon (Comp, color = '#FFFFFF') {
  const svg = renderToStaticMarkup(React.createElement(Comp, { size: 256, color }))
  const png = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer()
  return 'image/png;base64,' + png.toString('base64')
}
function pngSize (p) { const b = fs.readFileSync(p); return [b.readUInt32BE(16), b.readUInt32BE(20)] }

async function main () {
  const pres = new pptxgen()
  pres.layout = 'LAYOUT_WIDE' // 13.33 x 7.5
  pres.author = 'Raktim Chandra'
  pres.title = 'Interactive Web Components Testing'
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace }
  const C = pres.SchemeColor
  const SW = 13.333

  // ---- layouts ----------------------------------------------------------------------
  pres.defineSlideMaster({
    title: 'TITLE', background: { color: HEX.dk1 },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.8, y: 2.2, w: 11.7, h: 1.6, fontSize: 48, bold: true, color: C.background1, valign: 'bottom', align: 'left', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.8, y: 4.0, w: 11.7, h: 1.0, fontSize: 20, color: 'C9D1E3', valign: 'top', margin: 0 }, text: '' } },
    ],
  })
  pres.defineSlideMaster({
    title: 'SECTION', background: { color: HEX.dk1 },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.8, y: 3.0, w: 11.7, h: 1.2, fontSize: 40, bold: true, color: C.background1, valign: 'top', align: 'left', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.8, y: 4.2, w: 11.7, h: 0.8, fontSize: 18, color: 'C9D1E3', valign: 'top', margin: 0 }, text: '' } },
    ],
  })
  pres.defineSlideMaster({
    title: 'CONTENT', background: { color: HEX.lt1 },
    margin: [0.5, 0.6, 0.7, 0.6],
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.35, w: 10.2, h: 0.85, fontSize: 30, bold: true, color: C.text1, valign: 'middle', align: 'left', margin: 0 }, text: '' } },
      { text: { text: 'Interactive Web Components Testing  ·  SVV FT3  ·  Raktim Chandra', options: { x: 0.6, y: 7.05, w: 9, h: 0.3, fontSize: 10, color: HEX.accent6, margin: 0 } } },
    ],
    slideNumber: { x: 12.2, y: 7.05, w: 0.55, h: 0.3, fontSize: 10, color: HEX.accent6, align: 'right' },
  })

  let section = ''
  const sec = (title, sub, num) => {
    section = title
    pres.addSection({ title })
    const s = pres.addSlide({ masterName: 'SECTION', sectionTitle: title })
    s.addText(String(num).padStart(2, '0'), { x: 0.8, y: 1.6, w: 3, h: 1.3, fontSize: 72, bold: true, color: C.accent1, margin: 0, isTextBox: true, objectName: 'section-number' })
    s.addText(title, { placeholder: 'title' })
    s.addText(sub, { placeholder: 'body' })
    return s
  }
  const slide = (title, chip) => {
    const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: section })
    s.addText(title, { placeholder: 'title' })
    if (chip) chipAt(s, chip)
    return s
  }
  // motif: a monospace test-ID chip, top right
  function chipAt (s, text, x, y) {
    const w = Math.max(1.4, 0.105 * text.length + 0.4)
    s.addShape(pres.ShapeType.roundRect, { x: x ?? (12.73 - w), y: y ?? 0.55, w, h: 0.42, rectRadius: 0.21, fill: { color: C.background2 }, line: { color: C.accent2, width: 1 }, objectName: 'id-chip' })
    s.addText(text, { x: x ?? (12.73 - w), y: y ?? 0.55, w, h: 0.42, fontFace: 'Courier New', fontSize: 12, bold: true, color: C.accent2, align: 'center', valign: 'middle', margin: 0, isTextBox: true })
  }
  const txt = (s, text, o) => s.addText(text, { isTextBox: true, fontSize: 16, color: C.text1, valign: 'top', margin: 0, ...o })
  const bullets = (s, items, o) => s.addText(items.map((it, i) => ({ text: it, options: { bullet: { indent: 18 }, breakLine: i < items.length - 1, paraSpaceAfter: 8 } })), { isTextBox: true, fontSize: 16, color: C.text1, valign: 'top', margin: 0, ...o })
  function card (s, x, y, w, h, head, body, o = {}) {
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: o.fill || C.background2 }, line: { type: 'none' }, objectName: 'card' })
    if (o.icon) {
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: y + 0.25, w: 0.6, h: 0.6, fill: { color: o.iconBg || C.accent1 }, line: { type: 'none' } })
      s.addImage({ data: o.icon, x: x + 0.39, y: y + 0.39, w: 0.32, h: 0.32 })
    }
    const ix = o.icon ? 1.0 : 0.25
    txt(s, head, { x: x + ix, y: y + 0.22, w: w - ix - 0.2, h: 0.5, fontSize: o.headSize || 17, bold: true, color: o.headColor || C.text1, valign: 'middle' })
    if (body) txt(s, body, { x: x + 0.25, y: y + (o.icon ? 0.95 : 0.75), w: w - 0.5, h: h - (o.icon ? 1.1 : 0.9), fontSize: o.bodySize || 14, color: o.bodyColor || C.text2 })
  }
  function stat (s, x, y, w, value, label, color) {
    txt(s, String(value), { x, y, w, h: 1.0, fontSize: 54, bold: true, color: color || C.accent1, fontFace: THEME.headFontFace })
    txt(s, label, { x, y: y + 1.0, w, h: 0.6, fontSize: 14, color: C.text2 })
  }
  function table (s, head, rows, o) {
    const hdr = head.map((h) => ({ text: h, options: { bold: true, color: HEX.lt1, fill: { color: HEX.dk1 } } }))
    const body = rows.map((r, i) => r.map((v) => ({ text: String(v), options: { fill: { color: i % 2 ? 'F6F8FA' : 'FFFFFF' } } })))
    s.addTable([hdr, ...body], { x: 0.6, y: 1.45, w: 12.1, fontSize: 13, color: HEX.dk1, border: { type: 'solid', pt: 0.5, color: 'D5DAE3' }, margin: 0.08, rowH: 0.48, valign: 'middle', ...o })
  }
  function image (s, file, x, y, maxW, maxH) {
    const [w, h] = pngSize(file)
    let iw = maxW; let ih = maxW * h / w
    if (ih > maxH) { ih = maxH; iw = maxH * w / h }
    s.addImage({ path: file, x: x + (maxW - iw) / 2, y: y + (maxH - ih) / 2, w: iw, h: ih })
  }
  function code (s, src, x, y, w, h, size = 12) {
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.1, fill: { color: HEX.dk1 }, line: { type: 'none' }, objectName: 'code' })
    txt(s, src, { x: x + 0.25, y: y + 0.2, w: w - 0.5, h: h - 0.4, fontFace: 'Courier New', fontSize: size, color: 'E6EAF2' })
  }
  const barChart = (s, labels, values, o) => s.addChart(pres.ChartType.bar, [{ name: o.name || 'Cases', labels, values }], {
    x: 0.6, y: 1.45, w: 7.4, h: 5.4, barDir: 'bar', chartColors: [o.color || HEX.accent1], showValue: true, dataLabelPosition: 'outEnd',
    dataLabelFontSize: 11, dataLabelColor: HEX.dk1, dataLabelFontFace: '+mn-lt', catAxisLabelFontSize: 11, catAxisLabelColor: HEX.dk2, catAxisLabelFontFace: '+mn-lt',
    valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, catAxisOrientation: 'maxMin', showLegend: false,
    showTitle: !!o.title, title: o.title, titleFontSize: 14, titleColor: HEX.dk1, titleFontFace: '+mn-lt', barGapWidthPct: 40, ...o.extra,
  })

  const I = {
    check: await icon(fa.FaCheckCircle), bug: await icon(fa.FaBug), list: await icon(fa.FaListOl), code: await icon(fa.FaCode),
    globe: await icon(fa.FaGlobe), eye: await icon(fa.FaEye), bolt: await icon(fa.FaBolt), lock: await icon(fa.FaLock),
    mobile: await icon(fa.FaMobileAlt), keyboard: await icon(fa.FaKeyboard), route: await icon(fa.FaRoute), cogs: await icon(fa.FaCogs),
    flask: await icon(fa.FaFlask), chart: await icon(fa.FaChartBar), sitemap: await icon(fa.FaSitemap), random: await icon(fa.FaRandom),
    user: await icon(fa.FaUserCheck), mouse: await icon(fa.FaMousePointer), wpforms: await icon(fa.FaWpforms), compass: await icon(fa.FaCompass),
    balance: await icon(fa.FaBalanceScale), server: await icon(fa.FaServer), layer: await icon(fa.FaLayerGroup), shield: await icon(fa.FaShieldAlt),
  }

  // ===== 1 Title ===========================================================================
  pres.addSection({ title: 'Opening' }); section = 'Opening'
  let s = pres.addSlide({ masterName: 'TITLE', sectionTitle: section })
  s.addText('SVV  ·  FT3 AUTOMATED TESTING  ·  CYPRESS', { x: 0.8, y: 1.3, w: 11, h: 0.5, fontSize: 16, bold: true, color: C.accent1, charSpacing: 3, margin: 0, isTextBox: true })
  s.addText('Interactive Web Components Testing', { placeholder: 'title' })
  s.addText(`${cases.length} automated test cases against the Cypress Kitchen Sink — forms, navigation, assertions, UI interactions and far beyond`, { placeholder: 'body' })
  s.addText([
    { text: 'Raktim Chandra  ·  RA2311033010038', options: { bold: true, breakLine: true } },
    { text: 'B.Tech CSE (SE) · Year 4, Sem 7 · AI2 · CINTEL, SRMIST · 2026–27', options: { breakLine: true } },
    { text: 'Faculty: Mr. Kaviyaraj R.' },
  ], { x: 0.8, y: 5.6, w: 9, h: 1.1, fontSize: 14, color: 'C9D1E3', margin: 0, isTextBox: true })
  s.addNotes('Introduce the project: automated V&V of the Cypress Kitchen Sink with Cypress 16, going well beyond the four required areas.')

  // ===== 2 The brief vs delivered ==========================================================
  s = slide('The brief, and what was delivered', 'cypress run')
  card(s, 0.6, 1.45, 4.0, 5.3, 'Asked for (minimum)', null, { fill: C.background2 })
  bullets(s, ['Form controls', 'Navigation', 'Assertions', 'UI interactions'], { x: 0.9, y: 2.2, w: 3.5, h: 3, fontSize: 18 })
  const stats = [[cases.length, 'test cases with IDs'], [nSpecs, 'spec files'], [reqs.length, 'requirements, 100 % traced'], [defects.length, 'real defects found'], [4, 'browsers in CI'], [32, 'mutants to test the tests']]
  stats.forEach(([v, l], i) => stat(s, 5.0 + (i % 3) * 2.6, 1.6 + Math.floor(i / 3) * 2.5, 2.4, v, l, i === 3 ? C.accent4 : C.accent1))
  s.addNotes('Left: the minimum brief. Right: the scale actually delivered. Every number is generated from the repository.')

  // ===== 3 Agenda ===========================================================================
  s = slide('Agenda')
  ;[['01', 'Context', 'SUT, tool, scope'], ['02', 'Test plan', 'Approach, criteria, risks'], ['03', 'Test design', 'ECP · BVA · DT · CEG · STT'], ['04', 'Framework', 'tc(), known defects, CI'],
    ['05', 'Required areas', 'Forms · navigation · assertions · UI'], ['06', 'Beyond the brief', 'A11y · visual · perf · security · mutation'], ['07', 'Findings', 'Defects, results, traceability'], ['08', 'Close', 'Lessons and live demo']]
    .forEach(([num, h, b], i) => {
      const x = 0.6 + (i % 4) * 3.1; const y = 1.6 + Math.floor(i / 4) * 2.6
      s.addShape(pres.ShapeType.roundRect, { x, y, w: 2.9, h: 2.3, rectRadius: 0.12, fill: { color: C.background2 }, line: { type: 'none' } })
      txt(s, num, { x: x + 0.25, y: y + 0.2, w: 2, h: 0.7, fontSize: 32, bold: true, color: C.accent1 })
      txt(s, h, { x: x + 0.25, y: y + 0.95, w: 2.5, h: 0.5, fontSize: 18, bold: true })
      txt(s, b, { x: x + 0.25, y: y + 1.45, w: 2.5, h: 0.7, fontSize: 13, color: C.text2 })
    })

  // ===== Section 1 Context =====================================================================
  sec('Context', 'What we are testing, with what, and how far', 1)
  s = slide('System under test: the Cypress Kitchen Sink', 'f2cb767')
  txt(s, 'A 21-page static web app (Bootstrap 3 + jQuery) that Cypress uses to demonstrate every command, plus a TodoMVC app with routing and localStorage. Pinned at commit f2cb767 and served unmodified.', { x: 0.6, y: 1.4, w: 12.1, h: 0.8 })
  const pages = ['Home', 'Querying', 'Traversal', 'Actions', 'Window', 'Viewport', 'Location', 'Navigation', 'Assertions', 'Misc', 'Connectors', 'Aliasing', 'Waiting', 'Network', 'Files', 'Storage', 'Cookies', 'Spies & clocks', 'Utilities', 'Cypress API', 'Todo app']
  pages.forEach((p, i) => {
    const x = 0.6 + (i % 7) * 1.75; const y = 2.5 + Math.floor(i / 7) * 1.4
    const hot = ['Actions', 'Navigation', 'Assertions', 'Todo app'].includes(p)
    s.addShape(pres.ShapeType.roundRect, { x, y, w: 1.6, h: 1.15, rectRadius: 0.1, fill: { color: hot ? C.accent1 : C.background2 }, line: { type: 'none' } })
    txt(s, p, { x, y, w: 1.6, h: 1.15, fontSize: 14, bold: hot, color: hot ? C.background1 : C.text1, align: 'center', valign: 'middle' })
  })
  txt(s, 'Green: pages carrying the four required demonstration areas.', { x: 0.6, y: 6.6, w: 9, h: 0.35, fontSize: 12, color: C.text2 })

  s = slide('Why Cypress for interactive components')
  table(s, ['', 'Cypress 16', 'Selenium WebDriver', 'Playwright'], [
    ['Runs', 'Inside the browser, same loop as the app', 'Out of process, over HTTP', 'Out of process, over CDP/WS'],
    ['Waiting', 'Automatic retry of queries and assertions', 'Explicit waits', 'Auto-wait on actions'],
    ['Network control', 'cy.intercept stub/spy/modify', 'Needs a proxy', 'page.route'],
    ['Debugging', 'Time-travel snapshots, video, screenshots', 'Logs and screenshots', 'Trace viewer'],
    ['Browsers', 'Chrome, Edge, Firefox, Electron', 'All major', 'Chromium, Firefox, WebKit'],
    ['Fit for this SUT', 'Its own reference app; every command demonstrable', 'Possible, more boilerplate', 'Good, but not the assignment tool'],
  ], { colW: [2.2, 3.5, 3.2, 3.2], fontSize: 13 })

  s = slide('Objectives and scope')
  card(s, 0.6, 1.45, 5.9, 5.3, 'In scope', null, { icon: I.check })
  bullets(s, ['All 21 pages, navbar, history and hash routes', 'Every form control: text, email, checkbox, radio, select, range, submit', 'Clicks, dblclick, rightclick, hover, scroll, trigger, widgets', 'Assertions, querying, traversal', 'Todo functions, persistence and state machine', 'Accessibility, visual, performance, security, responsive, HTTP'], { x: 0.9, y: 2.45, w: 5.4, h: 4.1, fontSize: 15 })
  card(s, 6.8, 1.45, 5.9, 5.3, 'Out of scope', null, { icon: I.lock, iconBg: C.accent6 })
  bullets(s, ['Third-party API jsonplaceholder (stubbed; unstubbed calls fail fast with 503)', 'Load testing beyond single-user budgets', 'Server-side code (the SUT is static)', 'Legacy browser versions'], { x: 7.1, y: 2.45, w: 5.4, h: 4.1, fontSize: 15 })

  // ===== Section 2 Plan ======================================================================
  sec('Test plan', 'IEEE 829 / ISO 29119-3 structure', 2)
  s = slide('Where this work sits in the V-model')
  image(s, fig('vmodel.png'), 0.6, 1.4, 7.6, 5.5)
  card(s, 8.6, 1.6, 4.1, 2.4, 'System testing', `${n((c) => c.level === 'System')} cases through the real browser against the running app`, { icon: I.layer })
  card(s, 8.6, 4.2, 4.1, 2.4, 'Acceptance testing', `${n((c) => c.level === 'Acceptance')} Given/When/Then journeys a user would recognise`, { icon: I.user })

  s = slide('Test approach')
  ;[[I.list, 'Black-box design', 'Every case names its technique: ECP, BVA, decision table, cause-effect, state transition, pairwise'],
    [I.code, 'White-box measurement', 'nyc/Istanbul instruments the app JavaScript; coverage report per run'],
    [I.flask, 'Testing the tests', '32 mutants injected one at a time; a mutant must make a targeted spec fail'],
    [I.globe, 'Cross-browser', 'Chrome, Firefox, Edge, Electron in a GitHub Actions matrix'],
    [I.eye, 'Non-functional', 'axe-core WCAG 2.1 AA, pixel diffs, timing budgets, XSS and header audits'],
    [I.bug, 'Defects as tests', 'Each defect becomes a "known defect" test that flips when fixed']]
    .forEach(([ic, h, b], i) => card(s, 0.6 + (i % 3) * 4.1, 1.5 + Math.floor(i / 3) * 2.7, 3.9, 2.5, h, b, { icon: ic }))

  s = slide('Entry, exit and suspension criteria')
  table(s, ['Criterion', 'Definition'], [
    ['Entry', 'SUT served on :8080 and all 21 smoke tests pass'],
    ['Exit', 'All P1 cases pass in all 4 browsers · no FAIL · known defects reproduce or are closed · 100 % requirement coverage · mutation score ≥ 80 %'],
    ['Suspension', 'Any smoke failure, or SUT unreachable within 60 s'],
    ['Resumption', 'Smoke suite green again on the same commit'],
    ['Flaky test policy', 'One retry in run mode; pass-on-retry is logged to flaky-<browser>.json and treated as a test defect'],
  ], { colW: [2.6, 9.5], fontSize: 15 })

  s = slide('Risks and mitigations')
  table(s, ['Risk', 'Mitigation'], [
    ['Third-party API slow or down', 'Every network test stubs with cy.intercept; a global intercept returns 503 for anything unstubbed'],
    ['Rendering differs per browser', 'Visual baselines stored per browser; 0.2 % pixel threshold'],
    ['Timers and animations', 'Retrying assertions only, cy.clock for time, no fixed waits'],
    ['Cypress 16 visibility algorithm', 'Geometric in-box checks inside overflow containers'],
    ['SUT defects cascade into other tests', 'Known-defect pattern isolates each defect in exactly one case'],
  ], { colW: [3.8, 8.3], fontSize: 15 })

  s = slide('Tool stack')
  ;[['Cypress 16.2.1', 'Runner, retry-ability, intercept', I.cogs], ['@cypress/grep', 'Run by tag: @bva, @a11y, @smoke…', I.list], ['cypress-real-events', 'Native CDP keyboard and hover', I.keyboard], ['axe-core 4.11', 'WCAG 2.1 A/AA rules', I.eye],
    ['pixelmatch + pngjs', 'Visual baseline diffing', I.layer], ['nyc / Istanbul', 'Coverage of app JS', I.chart], ['mochawesome + JUnit', 'HTML and XML reports', I.list], ['GitHub Actions', '4-browser matrix, evidence branch', I.server]]
    .forEach(([h, b, ic], i) => card(s, 0.6 + (i % 4) * 3.1, 1.5 + Math.floor(i / 4) * 2.7, 2.9, 2.5, h, b, { icon: ic, headSize: 15 }))

  // ===== Section 3 Design =====================================================================
  sec('Test design', 'Every FT3 technique, applied to real components', 3)
  s = slide('Cases by design technique')
  const fam = {}
  cases.forEach((c) => {
    const t = c.technique || ''
    const k = /BVA/.test(t) ? 'BVA' : /ECP/.test(t) ? 'ECP' : /Decision/.test(t) ? 'Decision table' : /Cause/.test(t) ? 'Cause-effect graph' : /State/.test(t) ? 'State transition' : /WCAG/.test(t) ? 'WCAG checklist' : /OWASP/.test(t) ? 'OWASP checklist' : /Pairwise/.test(t) ? 'Pairwise' : /monkey/.test(t) ? 'Random (monkey)' : /Budget/.test(t) ? 'Performance budget' : /Visual/.test(t) ? 'Visual comparison' : t
    fam[k] = (fam[k] || 0) + 1
  })
  const famE = Object.entries(fam).sort((a, b) => b[1] - a[1])
  barChart(s, famE.map((e) => e[0]), famE.map((e) => e[1]), { color: HEX.accent2 })
  card(s, 8.4, 1.6, 4.3, 5.1, 'Reading the chart', 'ECP and BVA dominate because form controls are input-heavy. Decision tables, cause-effect graphs and state machines cover the logic-heavy todo app. Checklists bring WCAG and OWASP in as test oracles.', { icon: I.chart })

  s = slide('ECP: 17 equivalence classes for the email field', 'TC-FC-040…056')
  const ecp = cases.filter((c) => /^TC-FC-0(4\d|5[0-6])$/.test(c.id))
  table(s, ['Class', 'Representative', 'Valid?'], ecp.slice(0, 9).map((c) => [c.title.split('—')[0].replace('Email ', ''), c.data === '' ? '(empty)' : c.data, /invalid$/.test(c.title) ? 'Invalid' : 'Valid']), { x: 0.6, w: 6.0, colW: [1.3, 3.4, 1.3], fontSize: 13, rowH: 0.42 })
  table(s, ['Class', 'Representative', 'Valid?'], ecp.slice(9).map((c) => [c.title.split('—')[0].replace('Email ', ''), c.data, 'Invalid']), { x: 6.8, w: 5.9, colW: [1.3, 3.3, 1.3], fontSize: 13, rowH: 0.42 })
  txt(s, 'Oracle: HTML "valid e-mail address" grammar via checkValidity() / validity.typeMismatch — not RFC 5322. I9 ("quoted"@b.com) is RFC-valid but HTML-invalid.', { x: 0.6, y: 6.4, w: 12.1, h: 0.55, fontSize: 14, color: C.text2 })

  s = slide('BVA: the range slider, 0 to 100', 'TC-FC-140…154')
  // number line
  const lx = 1.0; const lw = 11.3; const ly = 3.0
  s.addShape(pres.ShapeType.line, { x: lx, y: ly, w: lw, h: 0, line: { color: HEX.dk1, width: 2 } })
  s.addShape(pres.ShapeType.rect, { x: lx + 2 * lw / 8, y: ly - 0.12, w: 4 * lw / 8, h: 0.24, fill: { color: C.accent1, transparency: 70 }, line: { type: 'none' } })
  const pts = [['-1000', 0, '0'], ['-1', 1, '0'], ['0', 2, '0'], ['1', 3, '1'], ['50', 4, '50'], ['99', 5, '99'], ['100', 6, '100'], ['101', 7, '100'], ['1e6', 8, '100']].map(([a, k, b]) => [a, k * lw / 8, b])
  pts.forEach(([inp, off, out]) => {
    const inside = !['-1000', '-1', '101', '1e6'].includes(inp)
    s.addShape(pres.ShapeType.ellipse, { x: lx + off - 0.12, y: ly - 0.12, w: 0.24, h: 0.24, fill: { color: inside ? C.accent1 : C.accent4 }, line: { color: 'FFFFFF', width: 1 } })
    txt(s, inp, { x: lx + off - 0.5, y: ly - 0.75, w: 1.0, h: 0.4, fontSize: 15, bold: true, align: 'center', fontFace: 'Courier New' })
    txt(s, '→ ' + out, { x: lx + off - 0.5, y: ly + 0.25, w: 1.0, h: 0.4, fontSize: 14, align: 'center', color: C.text2 })
  })
  card(s, 0.6, 4.2, 3.9, 2.5, 'Normal BVA', 'min−1, min, min+1, nominal, max−1, max, max+1 — 7 cases', { headSize: 16 })
  card(s, 4.7, 4.2, 3.9, 2.5, 'Robust and step BVA', '−1000, 1e6; 49.4 → 49 and 50.5 → 51 (ties round up)', { headSize: 16 })
  card(s, 8.8, 4.2, 3.9, 2.5, 'Invalid partitions', '"abc" and "" fall back to the default (min+max)/2 = 50; "1e2" → 100', { headSize: 16 })

  s = slide('Decision table: three checkboxes, 2³ rules', 'TC-FC-083…090')
  table(s, ['', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'], [
    ['C1 checkbox1 passed', 'N', 'Y', 'N', 'Y', 'N', 'Y', 'N', 'Y'], ['C2 checkbox2 passed', 'N', 'N', 'Y', 'Y', 'N', 'N', 'Y', 'Y'], ['C3 checkbox3 passed', 'N', 'N', 'N', 'N', 'Y', 'Y', 'Y', 'Y'],
    ['Action: exactly those boxes checked', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'], ['Test case', '083', '084', '085', '086', '087', '088', '089', '090'],
  ], { colW: [4.1, ...Array(8).fill(1.0)], fontSize: 15, align: 'center' })
  txt(s, 'Small and independent, so the full table is tested exhaustively; the same 2³ approach covers the multi-select (TC-FC-120…127).', { x: 0.6, y: 5.0, w: 12.1, h: 0.8, color: C.text2 })

  s = slide('Decision table: the todo footer collapses to 4 rules', 'TC-TD-070…074')
  table(s, ['Rule', 'Items', 'Completed', 'Footer shown', '"Clear completed"', 'Toggle-all checked', 'Case'], [
    ['R1', '0', '–', 'N', 'N', 'N', 'TC-TD-070'], ['R2', '≥ 1', 'none', 'Y', 'N', 'N', 'TC-TD-071'], ['R3', '≥ 1', 'some', 'Y', 'Y', 'N', 'TC-TD-072'], ['R4', '≥ 1', 'all', 'Y', 'Y', 'Y', 'TC-TD-073'],
  ], { colW: [1.0, 1.3, 1.6, 1.9, 2.2, 2.2, 1.9], fontSize: 15 })
  txt(s, '12 raw combinations minus impossible ones (completed > items) leave 4 rules. TC-TD-074 re-evaluates the table after each action: R2 → R3 → R4 → R2.', { x: 0.6, y: 4.3, w: 12.1, h: 0.9, color: C.text2 })

  s = slide('Cause-effect graph: finishing a todo edit', 'TC-TD-080…087')
  image(s, fig('cause_effect_graph.png'), 0.6, 1.4, 7.4, 5.5)
  card(s, 8.3, 1.5, 4.4, 5.2, 'Boolean model', 'Causes: C1 Enter · C2 blur · C3 Escape (exclusive) · C4 trimmed text non-empty\n\nE1 save = (C1 ∨ C2) ∧ C4\nE2 delete = (C1 ∨ C2) ∧ ¬C4\nE3 keep original = C3\n\nGraph → limited-entry decision table → 8 cases K1–K8', { icon: I.sitemap, bodySize: 14 })

  s = slide('State transitions of a todo item', 'TC-TD-100…117')
  image(s, fig('todo_state_machine.png'), 0.6, 1.4, 8.0, 5.4)
  card(s, 8.9, 1.5, 3.8, 1.6, '12 valid transitions', '0-switch coverage, T1–T12', { headSize: 16 })
  card(s, 8.9, 3.3, 3.8, 1.6, '2 invalid events', 'Nothing must happen', { headSize: 16 })
  card(s, 8.9, 5.1, 3.8, 1.6, '1-switch path', 'S0→S1→S2→S4→S2→S1→S5', { headSize: 16 })

  s = slide('More techniques in the suite')
  ;[[I.random, 'Pairwise', 'Device × page: 10 runs cover every pair (TC-RSP-001…010)'], [I.bug, 'Error guessing', '30 cases: Enter key, double submit, Unicode, very long text'],
    [I.bolt, 'Fault injection', 'Corrupt localStorage before load (TC-TD-134)'], [I.random, 'Seeded monkey', '200 random actions per seed, replayable (TC-ROB-001…003)'],
    [I.user, 'Scenario / UAT', 'Given/When/Then journeys (TC-UAT-001…005)'], [I.shield, 'Checklists', 'WCAG 2.1 AA and OWASP Secure Headers as oracles']]
    .forEach(([ic, h, b], i) => card(s, 0.6 + (i % 3) * 4.1, 1.5 + Math.floor(i / 3) * 2.7, 3.9, 2.5, h, b, { icon: ic }))

  // ===== Section 4 Framework ==================================================================
  sec('Framework', 'How 582 cases stay readable, traceable and honest', 4)
  s = slide('Harness architecture')
  image(s, fig('harness_architecture.png'), 0.6, 1.5, 12.1, 5.3)

  s = slide('Every test is a documented test case: tc()', 'TC-FC-040')
  code(s, `tc({ id: 'TC-FC-040',
     title: 'Email V1 — simple local@domain → valid',
     technique: 'ECP', req: 'REQ-FC-02', priority: 'P1',
     data: 'user@example.com',
     expected: 'checkValidity() = true; typeMismatch = false' },
() => {
  cy.get('.action-email').type('user@example.com')
    .then(($i) => {
      expect($i[0].checkValidity()).to.be.true
      expect($i[0].validity.typeMismatch).to.be.false
    })
})`, 0.6, 1.5, 7.3, 5.3, 13)
  bullets(s, ['Title becomes "TC-FC-040 | Email V1 …" in every report', 'Duplicate IDs fail at load time', 'Tags @ECP @Functional @P1 for grep', 'Metadata → catalogue JSON → workbook and report'], { x: 8.3, y: 1.6, w: 4.4, h: 5, fontSize: 16 })

  s = slide('Known-defect tests keep defects visible', 'tc.knownDefect')
  const flow = [['Defect reproduces', 'assertion fails or page throws', C.accent3], ['Test PASSES', 'logged as "known defect"', C.accent1], ['Developer fixes it', 'behaviour now correct', C.accent2], ['Test FAILS', '"DEF-KS-00x no longer reproduces"', C.accent4], ['Convert to tc()', 'becomes a regression test', C.accent1]]
  flow.forEach(([h, b, col], i) => {
    const x = 0.6 + i * 2.5
    s.addShape(pres.ShapeType.roundRect, { x, y: 2.0, w: 2.2, h: 2.2, rectRadius: 0.12, fill: { color: col }, line: { type: 'none' } })
    txt(s, h, { x: x + 0.15, y: 2.2, w: 1.9, h: 0.9, fontSize: 17, bold: true, color: C.background1, align: 'center', valign: 'middle' })
    txt(s, b, { x: x + 0.15, y: 3.1, w: 1.9, h: 0.9, fontSize: 13, color: C.background1, align: 'center' })
    if (i < flow.length - 1) s.addShape(pres.ShapeType.rightArrow, { x: x + 2.22, y: 2.95, w: 0.26, h: 0.3, fill: { color: HEX.accent6 }, line: { type: 'none' } })
  })
  txt(s, `${n((c) => c.knownDefect)} cases use this pattern, one per defect manifestation. CI stays green while every open defect is re-verified on every run.`, { x: 0.6, y: 4.8, w: 12.1, h: 0.8, color: C.text2 })

  s = slide('Custom commands keep specs short')
  table(s, ['Command', 'What it does'], [
    ['cy.visitPage(url)', 'Visit, spy on console.error and uncaught page errors'], ['cy.assertNoPageErrors()', 'Fail if the page logged an error during the test'],
    ['cy.visitTodos(items) · cy.storedTodos()', 'Seed and read the todo list through localStorage'], ['cy.checkA11y({ failOn })', 'Inject axe-core 4.11; fail on new serious/critical WCAG 2.1 AA violations'],
    ['cy.matchSnapshot(name)', 'Screenshot and pixel-diff against the per-browser baseline'], ['cy.pageMetrics()', 'TTFB, DCL, load, FCP, requests, KB, DOM nodes'],
  ], { colW: [4.3, 7.8], fontSize: 15 })

  s = slide('Continuous integration on every push')
  image(s, fig('ci_pipeline.png'), 0.6, 1.4, 6.0, 5.5)
  bullets(s, ['Lint (ESLint + eslint-plugin-cypress)', 'E2E matrix: Chrome · Firefox · Edge · Electron', 'Coverage job on an instrumented copy of the app', 'Mutation workflow: 32 mutants in 4 shards', 'Evidence committed to an orphan "results" branch: reports, videos, diffs, coverage', 'Markdown job summary on every run'], { x: 7.0, y: 1.7, w: 5.7, h: 5, fontSize: 16 })

  // ===== Section 5 Required areas ==============================================================
  sec('The four required areas', 'Form controls · Navigation · Assertions · UI interactions', 5)
  s = slide('Coverage of the required areas')
  ;[[nA('FC'), 'Form controls', 'text, email, checkbox, radio, select, range, submit', I.wpforms], [nA('NAV'), 'Navigation', 'navbar, history, anchors, clean URLs, hash routes', I.compass], [nA('AS'), 'Assertions', 'should/and, expect, assert, chai-jQuery, custom chai', I.check], [nA('UI'), 'UI interactions', 'click positions, dblclick, hover, scroll, trigger', I.mouse]]
    .forEach(([v, h, b, ic], i) => {
      const x = 0.6 + i * 3.1
      s.addShape(pres.ShapeType.roundRect, { x, y: 1.5, w: 2.9, h: 5.2, rectRadius: 0.12, fill: { color: C.background2 }, line: { type: 'none' } })
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: 1.75, w: 0.7, h: 0.7, fill: { color: C.accent1 }, line: { type: 'none' } })
      s.addImage({ data: ic, x: x + 0.42, y: 1.92, w: 0.36, h: 0.36 })
      txt(s, String(v), { x: x + 0.25, y: 2.7, w: 2.4, h: 1.0, fontSize: 54, bold: true, color: C.accent1 })
      txt(s, h, { x: x + 0.25, y: 3.8, w: 2.4, h: 0.5, fontSize: 18, bold: true })
      txt(s, b, { x: x + 0.25, y: 4.35, w: 2.4, h: 2.0, fontSize: 14, color: C.text2 })
    })

  s = slide('Form controls: what each case checks', 'TC-FC-001…181')
  table(s, ['Control', 'Technique', 'Highlights'], [
    ['Text inputs', 'ECP, error guessing', 'Special-key sequences, delay, focus/blur styles, clear, disabled/readonly'],
    ['Email', 'ECP (6 valid + 11 invalid)', 'Constraint Validation API as oracle'],
    ['Submit form', 'Use-case, error guessing', 'Success message colour rgb(32,181,32), double submit'],
    ['Checkbox / radio', 'Decision table, state transition', '2³ rules; radio group mutual exclusion'],
    ['Select / multi-select', 'ECP, decision table', 'By value, text and index; 2³ multi-select rules'],
    ['Range', 'BVA, robust BVA', 'Clamp, step rounding, default 50'],
  ], { colW: [2.6, 3.4, 6.1], fontSize: 15 })

  s = slide('Form controls in code: data-driven BVA', 'TC-FC-141…154')
  code(s, `const cases = [
  ['min − 1', -1, '0'],  ['min', 0, '0'],    ['min + 1', 1, '1'],
  ['nominal', 50, '50'], ['max − 1', 99, '99'],
  ['max', 100, '100'],   ['max + 1', 101, '100'],
]
cases.forEach(([label, input, expected], i) => {
  tc({ id: \`TC-FC-\${141 + i}\`, technique: 'BVA', req: 'REQ-FC-11',
       title: \`Range \${label}: set \${input} → shows \${expected}\` }, () => {
    cy.get('.trigger-input-range')
      .invoke('val', input).trigger('change')
      .should('have.value', expected)
      .next('p').should('have.text', expected)
  })
})`, 0.6, 1.5, 12.1, 5.2, 15)

  s = slide('Navigation', 'TC-NAV-001…085')
  ;[['Navbar', 'Every Commands entry in menu order opens the right page; active state; brand link'], ['History', 'cy.go back/forward, reload with and without cache'], ['Deep links', 'In-page anchors scroll their section into view'], ['Routes', 'Clean URLs, .html → 301, todo hash routes; unknown route = DEF-KS-001']]
    .forEach(([h, b], i) => card(s, 0.6 + (i % 2) * 6.1, 1.5 + Math.floor(i / 2) * 2.7, 5.9, 2.5, h, b, { icon: I.route }))

  s = slide('Assertions', 'TC-AS-001…035')
  code(s, `cy.get('.assertion-table tbody tr:last')
  .should('have.class', 'success')
  .find('td').first()
  .should('have.text', 'Column content')
  .and('contain', 'Column')

cy.get('.assertions-p').find('p')
  .should(($p) => {
    expect($p).to.have.length(3)
    expect($p.first()).to.contain('Some text')
  })`, 0.6, 1.5, 6.6, 5.2, 14)
  bullets(s, ['Implicit (should/and) vs explicit (expect, assert)', 'Callback assertions retry as one unit', 'Negative assertions and retry-ability', 'Custom chai method textTrimmed', 'Aliases and connectors (TC-AS-030…035)'], { x: 7.6, y: 1.6, w: 5.1, h: 5, fontSize: 16 })

  s = slide('UI interactions: clicks verified to the pixel', 'TC-UI-001…067')
  const cx = 0.9; const cy0 = 1.6; const cw = 4.6
  s.addShape(pres.ShapeType.rect, { x: cx, y: cy0, w: cw, h: cw, fill: { color: C.background2 }, line: { color: HEX.dk2, width: 1 } })
  ;[[0, 0, 'topLeft'], [0.5, 0, 'top'], [1, 0, 'topRight'], [0, 0.5, 'left'], [0.5, 0.5, 'center'], [1, 0.5, 'right'], [0, 1, 'bottomLeft'], [0.5, 1, 'bottom'], [1, 1, 'bottomRight']]
    .forEach(([fx, fy, l]) => {
      s.addShape(pres.ShapeType.ellipse, { x: cx + fx * cw - 0.13, y: cy0 + fy * cw - 0.13, w: 0.26, h: 0.26, fill: { color: C.accent4 }, line: { type: 'none' } })
      txt(s, l, { x: cx + fx * cw - 0.7 + (fx === 0 ? 0.75 : fx === 1 ? -0.75 : 0), y: cy0 + fy * cw + (fy === 1 ? -0.5 : 0.18), w: 1.4, h: 0.3, fontSize: 11, align: 'center', color: C.text2 })
    })
  bullets(s, ['Canvas 250 × 250 px: read back pixel data and assert a dot near each of the 9 named positions', 'Click by coordinates, multiple: true, force on covered elements', 'dblclick, rightclick, real hover with CDP events', 'Scroll into view and scroll positions inside 1000 × 1000 overflow boxes', 'Popover and tooltip widgets'], { x: 6.2, y: 1.6, w: 6.5, h: 5, fontSize: 16 })

  s = slide('The todo app: functional, persistence, logic', 'TC-TD-001…135')
  barChart(s, ['Functional', 'ECP and BVA', 'Decision table', 'Cause-effect', 'State transition', 'Persistence'], [
    n((c) => /^TC-TD-0(0|1)\d$/.test(c.id)), n((c) => /^TC-TD-0(3|4|5)\d$/.test(c.id)), n((c) => /^TC-TD-07\d$/.test(c.id)), n((c) => /^TC-TD-0(8|9)\d$/.test(c.id)), n((c) => /^TC-TD-1(0|1)\d$/.test(c.id)), n((c) => /^TC-TD-13\d$/.test(c.id)),
  ], { color: HEX.accent1 })
  card(s, 8.4, 1.6, 4.3, 5.1, 'Why so many', 'The todo app is the only part of the SUT with real logic: input trimming, plural rules, filters, edit semantics and persistence. Every FT3 technique applies to it, and it hid three of the eight defects.', { icon: I.list })

  // ===== Section 6 Beyond ==========================================================================
  sec('Beyond the brief', 'Non-functional quality and testing the tests', 6)
  s = slide('Non-functional coverage at a glance')
  ;[[I.eye, 'Accessibility', `${nA('A11Y')} cases`, 'axe-core on all 21 pages + keyboard'], [I.layer, 'Visual', `${nA('VIS')} cases`, 'per-browser pixel baselines'], [I.bolt, 'Performance', `${nA('PERF')} cases`, 'timing budgets on every page'], [I.shield, 'Security', `${nA('SEC')} cases`, 'XSS, headers, tab-nabbing'],
    [I.mobile, 'Responsive', `${nA('RSP')} cases`, 'pairwise device × page'], [I.server, 'HTTP / API', `${nA('API')} cases`, 'status, ETag, links, methods'], [I.random, 'Robustness', `${nA('ROB')} cases`, 'seeded monkey, faults'], [I.flask, 'Mutation', '32 mutants', 'are the tests strong enough?']]
    .forEach(([ic, h, v, b], i) => card(s, 0.6 + (i % 4) * 3.1, 1.5 + Math.floor(i / 4) * 2.7, 2.9, 2.5, `${h} · ${v}`, b, { icon: ic, headSize: 14 }))

  s = slide('Accessibility: WCAG 2.1 AA on every page', 'TC-A11Y-001…044')
  bullets(s, ['axe-core 4.11 injected into each page; rules tagged wcag2a, wcag2aa, wcag21a, wcag21aa', 'Fails on new serious or critical violations; known ones listed in a11y-known.json with a reason', 'Keyboard: tab order reaches every control, focus is visible, Escape closes the popover', 'Semantics: page language, titles, labels, alt text, landmark structure'], { x: 0.6, y: 1.6, w: 7.2, h: 5, fontSize: 16 })
  card(s, 8.2, 1.6, 4.5, 5.1, 'Why automate it', 'Manual a11y audits are rarely repeated. Here every push re-checks 21 pages in 4 browsers, so a regression in contrast or labelling is caught the day it lands.', { icon: I.eye })

  s = slide('Visual regression with pixelmatch', 'TC-VIS-001…012')
  ;[['1  Capture', 'cy.screenshot of a component (navbar, forms, tables, todo)'], ['2  Compare', 'pixelmatch against cypress/snapshots/baseline/<browser>/'], ['3  Judge', '≤ 0.2 % differing pixels = match; diff PNG saved otherwise'], ['4  Self-test', 'TC-VIS-012 changes the page on purpose and expects "mismatch"']]
    .forEach(([h, b], i) => card(s, 0.6 + i * 3.1, 1.6, 2.9, 3.0, h, b, { headSize: 18 }))
  txt(s, 'Baselines are kept per browser because font rendering differs; the self-test proves the detector can actually fail.', { x: 0.6, y: 5.0, w: 12.1, h: 0.8, color: C.text2 })

  s = slide('Performance budgets', 'TC-PERF-001…031')
  table(s, ['Metric', 'Budget', 'Source'], [['DOMContentLoaded', '< 1500 ms', 'Navigation Timing L2'], ['Load event', '< 3000 ms', 'Navigation Timing L2'], ['First Contentful Paint', '< 2000 ms', 'Paint Timing'], ['Requests', '≤ 30', 'Resource Timing'], ['Transfer size', '≤ 1500 KB', 'Resource Timing'], ['Add-todo latency', 'measured per action', 'performance.now()'], ['Long tasks', 'none > 200 ms', 'PerformanceObserver']], { w: 8.0, colW: [3.2, 2.4, 2.4], fontSize: 15 })
  card(s, 8.9, 1.5, 3.8, 5.2, 'Evidence', 'Every page\'s metrics are written to evidence/perf-<browser>.json, so budgets can be tuned from data instead of guesses.', { icon: I.bolt })

  s = slide('Security checks', 'TC-SEC-001…034')
  table(s, ['Check', 'Result'], [['8 XSS payloads into every text sink (todo, inputs)', 'Rendered as text, no script execution'], ['OWASP Secure Headers audit (CSP, X-Frame-Options, …)', 'Recorded as observations for a static demo'], ['target=_blank without rel=noopener', 'DEF-KS-007'], ['Directory listing on /assets/js/', 'DEF-KS-006'], ['Error pages leak no stack traces or server banner', 'No Server header']], { colW: [7.2, 4.9], fontSize: 15 })

  s = slide('Responsive and cross-browser', 'TC-RSP-001…032')
  bullets(s, ['Pairwise device × page: 10 runs cover all pairs of 5 viewports and the key pages', 'Overflow scan: document.scrollingElement.scrollWidth vs clientWidth at 320, 375, 768, 1280', 'Breakpoint BVA at Bootstrap\'s 768 px boundary', 'Whole suite in Chrome, Firefox, Edge and Electron'], { x: 0.6, y: 1.6, w: 7.2, h: 5, fontSize: 16 })
  card(s, 8.2, 1.6, 4.5, 5.1, 'Finding: DEF-KS-008', '/commands/actions overflows by about 178–201 px on phones and 13 px on a 768 px tablet; storage, misc, aliasing, assertions and traversal pages overflow too.', { icon: I.mobile, iconBg: C.accent4 })

  s = slide('Mutation testing: are the tests good enough?', 'M01…M32')
  table(s, ['Operator', 'Example mutant'], [['Relational / boundary', 'count === 1  →  count <= 1 (plural rule)'], ['Negate condition', 'if (title)  →  if (!title)'], ['Remove call', 'drop .trim() on the new title'], ['Remove persistence', 'skip localStorage save'], ['Swap state', 'completed class on the wrong items'], ['Equivalent (excluded)', 'M32: let → const, never reassigned']], { w: 7.6, colW: [3.0, 4.6], fontSize: 15 })
  card(s, 8.5, 1.5, 4.2, 5.2, 'How it runs', 'tools/mutation.js copies the app, applies one mutant, serves it on its own port and runs only the targeted specs via the Cypress module API. Killed = at least one test fails.', { icon: I.flask })

  s = slide('White-box: code coverage of the app')
  bullets(s, ['nyc instruments app/assets/js (vendor libraries excluded)', 'Suite runs with --expose coverage=true; @cypress/code-coverage collects window.__coverage__', 'Reports: lcov, HTML, json-summary — statement, branch, function, line', 'Coverage shows which branches no black-box case reached: a check on the design itself'], { x: 0.6, y: 1.6, w: 7.2, h: 5, fontSize: 16 })
  card(s, 8.2, 1.6, 4.5, 5.1, 'Black box + white box', 'Black-box design decides what to test; coverage and mutation measure how well it was done.', { icon: I.code })

  // ===== Section 7 Findings ===========================================================================
  sec('Findings', 'Eight real defects in the Kitchen Sink', 7)
  s = slide('Defects found', 'DEF-KS-001…008')
  table(s, ['ID', 'Defect', 'Severity', 'Found by'], defects.map((d) => [d.id, d.title, d.severity, d.technique]), { colW: [1.6, 6.0, 1.4, 3.1], fontSize: 13 })

  s = slide('Major: the todo app trusts its inputs', 'DEF-KS-001 · 003')
  card(s, 0.6, 1.5, 5.9, 5.2, 'DEF-KS-001  Unknown route', 'Changing the hash to #/unknown throws "this[activeRoute] is not a function" and the list goes blank.\n\nFix: whitelist routes, default to "All".', { icon: I.route, iconBg: C.accent4 })
  card(s, 6.8, 1.5, 5.9, 5.2, 'DEF-KS-003  Corrupt storage', 'localStorage "{not json" → JSON.parse throws; "{}" → "data.forEach is not a function". The app cannot be used.\n\nFix: try/catch and Array.isArray check.', { icon: I.bug, iconBg: C.accent4 })

  s = slide('Case study: the Enter key that erases input', 'DEF-KS-002')
  ;[['Symptom', 'A draft test typing "fake@email.com{enter}" failed for no obvious reason: the page had reloaded'], ['Root cause', 'A <form> with one text field and no submit handler: HTML implicit submission sends GET /commands/actions?'], ['Impact', 'Whatever the user typed is lost'], ['Response', 'Known-defect test TC-FC-032 plus a one-line fix: preventDefault in a submit handler']]
    .forEach(([h, b], i) => card(s, 0.6 + (i % 2) * 6.1, 1.5 + Math.floor(i / 2) * 2.7, 5.9, 2.5, h, b, { headSize: 18 }))

  s = slide('Defects by severity')
  const sev = {}; defects.forEach((d) => { sev[d.severity] = (sev[d.severity] || 0) + 1 })
  s.addChart(pres.ChartType.doughnut, [{ name: 'Defects', labels: Object.keys(sev), values: Object.values(sev) }], { x: 0.6, y: 1.5, w: 6, h: 5.2, holeSize: 60, chartColors: [HEX.accent4, HEX.accent3], showLegend: true, legendPos: 'b', legendFontSize: 13, legendFontFace: '+mn-lt', showPercent: false, showValue: true, dataLabelColor: 'FFFFFF', dataLabelFontSize: 14, dataLabelFontFace: '+mn-lt' })
  card(s, 7.2, 1.6, 5.5, 5.1, 'Pattern', 'Every defect was found by a negative, boundary, fault-injection or checklist case. None came from the happy path, which is exactly why the design techniques matter.', { icon: I.bug })

  s = slide('Execution results')
  if (haveResults) {
    const bs = Object.keys(results)
    s.addChart(pres.ChartType.bar, ['pass', 'knownDefect', 'fail', 'skipped'].map((k, i) => ({ name: ['Pass', 'Known defect', 'Fail', 'Skipped'][i], labels: bs, values: bs.map((b) => results[b].summary[k] || 0) })),
      { x: 0.6, y: 1.5, w: 12.1, h: 5.2, barDir: 'bar', barGrouping: 'stacked', chartColors: [HEX.accent1, HEX.accent3, HEX.accent4, HEX.accent6], showLegend: true, legendPos: 'b', showValue: true, dataLabelPosition: 'ctr', dataLabelColor: 'FFFFFF', dataLabelFontFace: '+mn-lt', catAxisLabelFontFace: '+mn-lt', valGridLine: { style: 'none' } })
  } else {
    card(s, 0.6, 1.5, 12.1, 2.2, 'Pending the first CI run', 'This deck is generated from the repository. When the GitHub Actions run publishes its evidence, rebuilding the deck fills this slide with real per-browser results. No figure here is estimated.', { icon: I.server })
    table(s, ['Browser', 'Cases', 'Pass', 'Known defect', 'Fail'], ['Chrome', 'Firefox', 'Edge', 'Electron'].map((b) => [b, cases.length, 'pending', 'pending', 'pending']), { y: 4.0, colW: [3, 2.3, 2.3, 2.3, 2.2], fontSize: 15 })
  }

  s = slide('Traceability: every requirement is covered')
  const g = {}; reqs.forEach((r) => { g[r.area] = (g[r.area] || 0) + cases.filter((c) => (c.req || '').split(/[,;]\s*/).includes(r.id)).length })
  const gE = Object.entries(g).sort((a, b) => b[1] - a[1])
  barChart(s, gE.map((e) => e[0]), gE.map((e) => e[1]), { color: HEX.accent5 })
  card(s, 8.4, 1.6, 4.3, 5.1, `${reqs.length} / ${reqs.length} covered`, 'Each requirement in docs/requirements.json maps to at least one case. The full matrix is in the workbook (Traceability sheet) and the report.', { icon: I.balance })

  // ===== Section 8 Close ================================================================================
  sec('Close', 'What this project shows', 8)
  s = slide('Lessons')
  ;[['Name the oracle', 'HTML vs RFC email rules: the wrong oracle invents defects'], ['Negative paths find bugs', 'All 8 defects came from boundary, error-guessing and fault cases'], ['Defects as tests', 'Green CI without hiding anything'], ['Measure the tests', 'Mutation and coverage verify the verification']]
    .forEach(([h, b], i) => card(s, 0.6 + (i % 2) * 6.1, 1.5 + Math.floor(i / 2) * 2.7, 5.9, 2.5, h, b, { icon: I.check, headSize: 18 }))

  s = slide('Live demo plan')
  table(s, ['Step', 'Command', 'What the audience sees'], [
    ['1', 'npm start', 'Kitchen Sink on localhost:8080'], ['2', 'npx cypress open', 'Spec list in 19 numbered areas'],
    ['3', 'Run 03-form-controls/range-bva', 'BVA cases running, time-travel on a boundary'], ['4', 'Run 02-navigation/navbar', 'Every menu entry opened in order'],
    ['5', 'Run 05-assertions', 'Retry-ability visible in the command log'], ['6', 'Run 04-ui-interactions/click', 'Canvas dots appearing at 9 positions'],
    ['7', 'npm run test:smoke -- --browser firefox', 'Same tests, another browser'], ['8', 'Open mochawesome report', 'TC IDs, techniques and known defects'],
  ], { colW: [0.8, 5.0, 6.3], fontSize: 14 })

  s = pres.addSlide({ masterName: 'TITLE', sectionTitle: section })
  s.addText('Thank you', { placeholder: 'title' })
  s.addText('Questions?   ·   github.com/RaktimChandra/cypress-kitchen-sink-testing', { placeholder: 'body' })

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  await pres.writeFile({ fileName: OUT })
  await applyTheme(OUT, THEME)
  console.log('deck ->', OUT)
}
main().catch((e) => { console.error(e); process.exit(1) })
