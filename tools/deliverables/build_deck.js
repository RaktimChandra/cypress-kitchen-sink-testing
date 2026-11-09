#!/usr/bin/env node
/**
 * Team 6 presentation deck (.pptx), built from repository data and real CI evidence.
 *   EVIDENCE_DIR=<results latest/> FRAMES_DIR=<frames> node tools/deliverables/build_deck.js [out.pptx]
 * Then: python3 tools/deliverables/animate_pptx.py <out.pptx>   (transitions + entrance animations)
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
const EV = process.env.EVIDENCE_DIR || path.join(ROOT, 'deliverables', 'build', 'evidence', 'latest')
const FR = process.env.FRAMES_DIR || path.join(ROOT, 'deliverables', 'build', 'frames')
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const rdMaybe = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch (_e) { return null } }

const cases = rd('reports/catalogue.json').cases
const reqs = rd('docs/requirements.json')
const defects = rd('docs/defects.json')
const TEAM = rd('docs/team.json')
const HIST = rd('docs/ci-history.json')
const fig = (f) => path.join(ROOT, 'docs', 'figures', f)
const frame = (f) => { const p = path.join(FR, f + '.png'); return fs.existsSync(p) ? p : null }
const areaOf = (c) => c.id.split('-')[1]
const n = (f) => cases.filter(f).length
const nA = (a) => n((c) => areaOf(c) === a)
const nSpecs = new Set(cases.map((c) => c.spec)).size
const BROWSERS = ['chrome', 'firefox', 'edge', 'electron']

// ---- evidence ----------------------------------------------------------------------------
const results = {}
for (const b of BROWSERS) { const j = rdMaybe(path.join(EV, 'browsers', b, `results-${b}.json`)); if (j) results[b] = j }
const have = Object.keys(results).length > 0
const coverage = rdMaybe(path.join(EV, 'coverage', 'coverage-summary.json'))
const a11y = rdMaybe(path.join(EV, 'browsers', 'chrome', 'evidence', 'a11y-chrome.json')) || []
const perf = (rdMaybe(path.join(EV, 'browsers', 'chrome', 'evidence', 'perf-chrome.json')) || []).filter((p) => p.page && p.page.startsWith('/') && !/\s/.test(p.page) && Number.isFinite(p.domContentLoaded))
const compat = {}
for (const b of BROWSERS) { const j = rdMaybe(path.join(EV, 'browsers', b, 'evidence', `compat-${b}.json`)); if (j) compat[b] = j }
let mutants = []
const mdir = path.join(EV, 'mutation')
if (fs.existsSync(mdir)) for (const f of fs.readdirSync(mdir)) { const j = rdMaybe(path.join(mdir, f)); if (j) mutants = mutants.concat(j.results || j.mutants || []) }
const mKilled = mutants.filter((m) => m.status === 'KILLED').length
const mSurv = mutants.filter((m) => m.status === 'SURVIVED').length
const mEq = mutants.filter((m) => m.status === 'EQUIVALENT').length
const mScore = mutants.length ? Math.round(1000 * mKilled / (mKilled + mSurv)) / 10 : null
const sum = (k) => BROWSERS.reduce((s, b) => s + (results[b] ? results[b].summary[k] || 0 : 0), 0)
const executions = sum('total')
const pct = (x) => `${Math.round(x * 10) / 10}%`

const THEME = {
  name: 'Team 6 Kitchen Sink QA', headFontFace: 'Arial', bodyFontFace: 'Calibri',
  colors: { dk1: '141729', lt1: 'FFFFFF', dk2: '3A4160', lt2: 'EEF2F7', accent1: '1E9E6A', accent2: '1A7F9A', accent3: 'E09A1A', accent4: 'D2453B', accent5: '4659A8', accent6: '8C93A8', hlink: '1A7F9A', folHlink: '4659A8' },
}
const HEX = THEME.colors
const MUTE_ON_DARK = 'B9C2D8'

async function icon (Comp, color = '#FFFFFF') {
  const svg = renderToStaticMarkup(React.createElement(Comp, { size: 256, color }))
  return 'image/png;base64,' + (await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer()).toString('base64')
}
function pngSize (p) { const b = fs.readFileSync(p); return [b.readUInt32BE(16), b.readUInt32BE(20)] }

async function main () {
  const pres = new pptxgen()
  pres.layout = 'LAYOUT_WIDE'
  pres.author = TEAM.team
  pres.company = 'SRMIST'
  pres.title = 'Interactive Web Components Testing'
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace }
  const C = pres.SchemeColor

  // ---- layouts --------------------------------------------------------------------------
  pres.defineSlideMaster({ title: 'TITLE', background: { color: HEX.dk1 }, objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.8, y: 2.0, w: 11.7, h: 1.7, fontSize: 50, bold: true, color: C.background1, valign: 'bottom', align: 'left', margin: 0 }, text: '' } },
  ] })
  pres.defineSlideMaster({ title: 'SECTION', background: { color: HEX.dk1 }, objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.8, y: 3.15, w: 8.2, h: 1.1, fontSize: 42, bold: true, color: C.background1, valign: 'top', align: 'left', margin: 0 }, text: '' } },
  ] })
  pres.defineSlideMaster({ title: 'CONTENT', background: { color: HEX.lt1 }, margin: [0.5, 0.6, 0.7, 0.6], objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.62, w: 10.3, h: 0.72, fontSize: 28, bold: true, color: C.text1, valign: 'middle', align: 'left', margin: 0 }, text: '' } },
    { text: { text: `${TEAM.team}  ·  Interactive Web Components Testing  ·  SVV FT3`, options: { x: 0.6, y: 7.05, w: 9, h: 0.3, fontSize: 10, color: HEX.accent6, margin: 0 } } },
  ], slideNumber: { x: 12.2, y: 7.05, w: 0.55, h: 0.3, fontSize: 10, color: HEX.accent6, align: 'right' } })

  // ---- helpers -------------------------------------------------------------------------------
  let section = ''; let secNo = 0; let g = 0
  const A = () => `anim-${++g}`
  const txt = (s, text, o = {}) => s.addText(text, { isTextBox: true, fontSize: 15, color: C.text1, valign: 'top', margin: 0, ...o })
  const sec = (title, sub, points) => {
    secNo += 1; section = title; pres.addSection({ title })
    const s = pres.addSlide({ masterName: 'SECTION', sectionTitle: title }); g = 0
    s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.01, h: 0.01, fill: { color: HEX.dk1 }, line: { type: 'none' }, objectName: 'transition-push' })
    txt(s, String(secNo).padStart(2, '0'), { x: 0.8, y: 1.2, w: 4, h: 1.8, fontSize: 110, bold: true, color: C.accent1, fontFace: THEME.headFontFace, objectName: A() })
    s.addText(title, { placeholder: 'title' })
    txt(s, sub, { x: 0.8, y: 4.3, w: 7.8, h: 0.9, fontSize: 19, color: MUTE_ON_DARK, objectName: A() })
    if (points) {
      const nm = A()
      s.addShape(pres.ShapeType.roundRect, { x: 9.3, y: 1.4, w: 3.4, h: 4.9, rectRadius: 0.14, fill: { color: '1E2238' }, line: { color: '2C3352', width: 1 }, objectName: nm })
      txt(s, 'IN THIS SECTION', { x: 9.6, y: 1.65, w: 3, h: 0.3, fontSize: 11, bold: true, color: C.accent1, charSpacing: 2, objectName: nm })
      txt(s, points.map((p, i) => ({ text: p, options: { bullet: { indent: 14 }, breakLine: i < points.length - 1, paraSpaceAfter: 9 } })), { x: 9.6, y: 2.1, w: 2.9, h: 4, fontSize: 14, color: 'E6EAF2', objectName: nm })
    }
    return s
  }
  const slide = (title, chip, eyebrow) => {
    const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: section }); g = 0
    txt(s, (eyebrow || `${String(secNo).padStart(2, '0')} · ${section}`).toUpperCase(), { x: 0.6, y: 0.3, w: 8, h: 0.3, fontSize: 11, bold: true, color: C.accent1, charSpacing: 2 })
    s.addText(title, { placeholder: 'title' })
    if (chip) {
      const w = Math.max(1.5, 0.1 * chip.length + 0.45)
      s.addShape(pres.ShapeType.roundRect, { x: 12.73 - w, y: 0.78, w, h: 0.42, rectRadius: 0.21, fill: { color: C.background2 }, line: { color: C.accent2, width: 1 } })
      txt(s, chip, { x: 12.73 - w, y: 0.78, w, h: 0.42, fontFace: 'Courier New', fontSize: 12, bold: true, color: C.accent2, align: 'center', valign: 'middle' })
    }
    return s
  }
  const bullets = (s, items, o = {}) => txt(s, items.map((it, i) => {
    const [head, rest] = Array.isArray(it) ? it : [null, it]
    const runs = head ? [{ text: head + '  ', options: { bold: true, bullet: { indent: 16 }, color: HEX.dk1 } }, { text: rest, options: { breakLine: i < items.length - 1 } }]
      : [{ text: rest, options: { bullet: { indent: 16 }, breakLine: i < items.length - 1 } }]
    runs[runs.length - 1].options.paraSpaceAfter = o.gap || 8
    return runs
  }).flat(), { fontSize: 15, color: C.text2, ...o })
  function card (s, x, y, w, h, head, body, o = {}) {
    const nm = o.name || A()
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: o.fill || C.background2 }, line: o.line ? { color: o.line, width: 1.25 } : { type: 'none' }, objectName: nm })
    let ix = 0.28
    if (o.icon) {
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.28, y: y + 0.28, w: 0.58, h: 0.58, fill: { color: o.iconBg || C.accent1 }, line: { type: 'none' }, objectName: nm })
      s.addImage({ data: o.icon, x: x + 0.42, y: y + 0.42, w: 0.3, h: 0.3, objectName: nm })
      ix = 1.02
    }
    txt(s, head, { x: x + ix, y: y + 0.27, w: w - ix - 0.25, h: 0.6, fontSize: o.headSize || 16, bold: true, color: o.headColor || C.text1, valign: 'middle', objectName: nm })
    if (body) {
      const by = y + 1.0
      if (Array.isArray(body)) bullets(s, body, { x: x + 0.28, y: by, w: w - 0.5, h: h - 1.1, fontSize: o.bodySize || 13, objectName: nm, gap: 5 })
      else txt(s, body, { x: x + 0.28, y: by, w: w - 0.5, h: h - 1.1, fontSize: o.bodySize || 13, color: o.bodyColor || C.text2, objectName: nm })
    }
  }
  function stat (s, x, y, w, value, label, sub, color) {
    const nm = A()
    txt(s, String(value), { x, y, w, h: 0.95, fontSize: 46, bold: true, color: color || C.accent1, fontFace: THEME.headFontFace, objectName: nm })
    txt(s, label, { x, y: y + 0.95, w, h: 0.35, fontSize: 14, bold: true, objectName: nm })
    if (sub) txt(s, sub, { x, y: y + 1.3, w, h: 0.5, fontSize: 11.5, color: C.text2, objectName: nm })
  }
  function table (s, head, rows, o = {}) {
    const hdr = head.map((h) => ({ text: String(h), options: { bold: true, color: HEX.lt1, fill: { color: HEX.dk1 } } }))
    const body = rows.map((r, i) => r.map((v) => (v && typeof v === 'object' && v.text !== undefined ? v : { text: String(v), options: { fill: { color: i % 2 ? 'F5F7FA' : 'FFFFFF' } } })))
    s.addTable([hdr, ...body], { x: 0.6, y: 1.6, w: 12.1, fontSize: 12.5, color: HEX.dk1, border: { type: 'solid', pt: 0.5, color: 'D5DAE3' }, margin: 0.07, rowH: 0.4, valign: 'middle', objectName: A(), ...o })
  }
  function image (s, file, x, y, maxW, maxH, nm) {
    if (!file) return
    const [w, h] = pngSize(file)
    let iw = maxW; let ih = maxW * h / w
    if (ih > maxH) { ih = maxH; iw = maxH * w / h }
    s.addImage({ path: file, x: x + (maxW - iw) / 2, y: y + (maxH - ih) / 2, w: iw, h: ih, objectName: nm || A() })
  }
  // real Cypress runner screenshot in a browser-window frame
  function browserShot (s, file, x, y, w, caption) {
    if (!file) return
    const [pw, ph] = pngSize(file)
    const ih = w * ph / pw
    const nm = A()
    s.addShape(pres.ShapeType.roundRect, { x: x - 0.06, y: y - 0.36, w: w + 0.12, h: ih + 0.42, rectRadius: 0.08, fill: { color: '262B44' }, line: { type: 'none' }, shadow: { type: 'outer', blur: 8, offset: 3, angle: 90, color: '000000', opacity: 0.25 }, objectName: nm })
    ;['D2453B', 'E09A1A', '1E9E6A'].forEach((c) => s.addShape(pres.ShapeType.ellipse, { x: x + 0.1 + ['D2453B', 'E09A1A', '1E9E6A'].indexOf(c) * 0.2, y: y - 0.25, w: 0.12, h: 0.12, fill: { color: c }, line: { type: 'none' }, objectName: nm }))
    s.addImage({ path: file, x, y, w, h: ih, objectName: nm })
    if (caption) txt(s, caption, { x, y: y + ih + 0.12, w, h: 0.3, fontSize: 11, italic: true, color: C.text2, objectName: nm })
  }
  function code (s, src, x, y, w, h, size = 12.5) {
    const nm = A()
    s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.1, fill: { color: HEX.dk1 }, line: { type: 'none' }, objectName: nm })
    txt(s, src, { x: x + 0.28, y: y + 0.22, w: w - 0.5, h: h - 0.4, fontFace: 'Courier New', fontSize: size, color: 'E6EAF2', objectName: nm })
  }
  const chartBase = { catAxisLabelColor: HEX.dk2, valAxisLabelColor: HEX.dk2, catAxisLabelFontFace: '+mn-lt', valAxisLabelFontFace: '+mn-lt', dataLabelFontFace: '+mn-lt', titleFontFace: '+mn-lt', legendFontFace: '+mn-lt', catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, dataLabelFontSize: 10, valGridLine: { color: 'E3E7EE', size: 0.5 }, catGridLine: { style: 'none' } }
  const hbar = (s, labels, values, o = {}) => s.addChart(pres.ChartType.bar, [{ name: o.name || 'Value', labels, values }], {
    x: o.x ?? 0.6, y: o.y ?? 1.6, w: o.w ?? 7.4, h: o.h ?? 5.2, barDir: 'bar', chartColors: [o.color || HEX.accent1], showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: HEX.dk1,
    valAxisHidden: true, catAxisOrientation: 'maxMin', showLegend: false, barGapWidthPct: 45, ...chartBase, valGridLine: { style: 'none' }, showTitle: !!o.title, title: o.title, titleFontSize: 13, titleColor: HEX.dk1, ...o.extra })

  const I = {}
  for (const [k, comp] of Object.entries({ check: fa.FaCheckCircle, bug: fa.FaBug, list: fa.FaListOl, code: fa.FaCode, globe: fa.FaGlobe, eye: fa.FaEye, bolt: fa.FaBolt, lock: fa.FaLock, mobile: fa.FaMobileAlt, keyboard: fa.FaKeyboard, route: fa.FaRoute, cogs: fa.FaCogs, flask: fa.FaFlask, chart: fa.FaChartBar, sitemap: fa.FaSitemap, random: fa.FaRandom, user: fa.FaUserCheck, users: fa.FaUsers, mouse: fa.FaMousePointer, forms: fa.FaWpforms, compass: fa.FaCompass, balance: fa.FaBalanceScale, server: fa.FaServer, layer: fa.FaLayerGroup, shield: fa.FaShieldAlt, search: fa.FaSearch, git: fa.FaCodeBranch, rocket: fa.FaRocket, book: fa.FaBook, graduate: fa.FaUserGraduate, stethoscope: fa.FaStethoscope, magic: fa.FaMagic, sync: fa.FaSyncAlt, image: fa.FaImage, tachometer: fa.FaTachometerAlt })) I[k] = await icon(comp)

  // ============ OPENING ============================================================================
  pres.addSection({ title: 'Opening' }); section = 'Opening'
  let s = pres.addSlide({ masterName: 'TITLE', sectionTitle: section }); g = 0
  txt(s, 'SVV  ·  FT3 AUTOMATED TESTING  ·  CYPRESS 16', { x: 0.8, y: 1.15, w: 11, h: 0.45, fontSize: 16, bold: true, color: C.accent1, charSpacing: 3, objectName: A() })
  s.addText('Interactive Web Components Testing', { placeholder: 'title' })
  txt(s, `${cases.length} automated test cases against the Cypress Kitchen Sink: form controls, navigation, assertions and UI interactions, then accessibility, security, performance, visual and mutation testing, run in 4 browsers on every push.`, { x: 0.8, y: 3.85, w: 10.5, h: 0.9, fontSize: 18, color: MUTE_ON_DARK, objectName: A() })
  const tn = A()
  txt(s, TEAM.team.toUpperCase(), { x: 0.8, y: 5.2, w: 3, h: 0.35, fontSize: 14, bold: true, color: C.accent1, charSpacing: 2, objectName: tn })
  TEAM.members.forEach((m, i) => txt(s, [{ text: m.name, options: { bold: true, color: 'FFFFFF', breakLine: true } }, { text: m.reg, options: { color: MUTE_ON_DARK } }], { x: 0.8 + i * 2.95, y: 5.6, w: 2.85, h: 0.65, fontSize: 13, objectName: tn }))
  txt(s, `${TEAM.programme} · ${TEAM.year} · CINTEL, SRMIST · ${TEAM.academicYear} · Faculty: ${TEAM.faculty}`, { x: 0.8, y: 6.55, w: 11.8, h: 0.35, fontSize: 12, color: MUTE_ON_DARK, objectName: A() })
  s.addNotes('Opening: Team 6 presents automated verification of the Cypress Kitchen Sink. The four required areas are covered in depth, then we go beyond them.')

  s = slide('Team 6', null, 'Who we are')
  TEAM.members.forEach((m, i) => {
    const x = 0.6 + i * 3.08; const nm = A()
    s.addShape(pres.ShapeType.roundRect, { x, y: 1.65, w: 2.88, h: 2.6, rectRadius: 0.14, fill: { color: C.background2 }, line: { type: 'none' }, objectName: nm })
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.98, y: 1.9, w: 0.92, h: 0.92, fill: { color: [HEX.accent1, HEX.accent2, HEX.accent5, HEX.accent3][i] }, line: { type: 'none' }, objectName: nm })
    txt(s, m.name.split(' ').map((w) => w[0]).join(''), { x: x + 0.98, y: 1.9, w: 0.92, h: 0.92, fontSize: 24, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', objectName: nm })
    txt(s, m.name, { x, y: 3.0, w: 2.88, h: 0.45, fontSize: 18, bold: true, align: 'center', objectName: nm })
    txt(s, m.reg, { x, y: 3.45, w: 2.88, h: 0.4, fontSize: 13, fontFace: 'Courier New', color: C.accent2, align: 'center', objectName: nm })
  })
  card(s, 0.6, 4.6, 6.0, 2.2, 'Course', [['Subject', TEAM.course], ['Component', TEAM.component], ['Faculty', TEAM.faculty]], { icon: I.graduate })
  card(s, 6.75, 4.6, 5.95, 2.2, 'Programme', [['Degree', 'B.Tech CSE (Software Engineering)'], ['Class', `${TEAM.year} · CINTEL`], ['Institution', 'SRMIST, Kattankulathur · 2026–27']], { icon: I.users })

  s = slide('The brief, and what Team 6 delivered', 'cypress run')
  card(s, 0.6, 1.6, 3.7, 5.2, 'Assigned (minimum)', null, { line: HEX.accent6, fill: 'FFFFFF' })
  bullets(s, [['Tool', 'Cypress'], ['Title', 'Interactive web components testing'], ['Application', 'Cypress Kitchen Sink'], ['Show', 'form controls, navigation, assertions, UI interactions']], { x: 0.9, y: 2.55, w: 3.2, h: 4, fontSize: 14, objectName: 'anim-1' })
  const stats = [
    [cases.length, 'test cases', `${nSpecs} spec files, each case with ID, technique, requirement`],
    [have ? executions.toLocaleString('en-IN') : '—', 'executions per CI run', '4 browsers: Chrome, Firefox, Edge, Electron'],
    [defects.length, 'real defects found', `${defects.filter((d) => d.severity === 'Major').length} Major, each pinned by a test`],
    [reqs.length, 'requirements traced', '100 % have at least one case'],
    [coverage ? pct(coverage.total.lines.pct) : '—', 'line coverage', coverage ? `of the app's JavaScript; ${pct(coverage.total.branches.pct)} branches` : 'Istanbul / nyc'],
    [mScore !== null ? pct(mScore) : '—', 'mutation score', mutants.length ? `${mKilled}/${mKilled + mSurv} mutants killed (${mEq} equivalent)` : '32 hand-written mutants'],
  ]
  stats.forEach(([v, l, sub], i) => stat(s, 4.75 + (i % 3) * 2.75, 1.65 + Math.floor(i / 3) * 2.6, 2.55, v, l, sub, i === 2 ? C.accent4 : C.accent1))

  s = slide('Agenda', null, 'Roadmap')
  ;[['01', 'Context', 'System under test, tool choice, scope'], ['02', 'Test plan', 'Process, levels, criteria, risks'], ['03', 'Test design', 'ECP · BVA · DT · CEG · STT and more'], ['04', 'Framework', 'Harness, known defects, CI, evidence'],
    ['05', 'Required areas', 'Forms · navigation · assertions · UI'], ['06', 'Beyond the brief', 'A11y · visual · perf · security · mutation'], ['07', 'Results & findings', 'CI results, triage, 14 defects'], ['08', 'Close', 'Lessons, future work, live demo']]
    .forEach(([num, h, b], i) => {
      const x = 0.6 + (i % 4) * 3.08; const y = 1.65 + Math.floor(i / 4) * 2.6; const nm = A()
      s.addShape(pres.ShapeType.roundRect, { x, y, w: 2.88, h: 2.35, rectRadius: 0.14, fill: { color: i % 2 ? C.background2 : 'E7F5EF' }, line: { type: 'none' }, objectName: nm })
      txt(s, num, { x: x + 0.28, y: y + 0.22, w: 2, h: 0.75, fontSize: 34, bold: true, color: C.accent1, objectName: nm })
      txt(s, h, { x: x + 0.28, y: y + 1.0, w: 2.4, h: 0.45, fontSize: 18, bold: true, objectName: nm })
      txt(s, b, { x: x + 0.28, y: y + 1.48, w: 2.4, h: 0.75, fontSize: 13, color: C.text2, objectName: nm })
    })

  // ============ 01 CONTEXT =========================================================================
  sec('Context', 'What we test, why it matters, and why Cypress', ['Problem and objectives', 'Anatomy of the Kitchen Sink', 'How Cypress works', 'Tool comparison', 'Scope'])
  s = slide('Why test interactive components?')
  card(s, 0.6, 1.6, 5.9, 2.45, 'The problem', 'Interactive pages fail in ways a reviewer does not see: a form that loses input on Enter, a list that toggles the wrong item, a control a screen reader cannot name. These bugs live in behaviour and state, not in markup.', { icon: I.search, bodySize: 14 })
  card(s, 0.6, 4.3, 5.9, 2.5, 'Our objectives', [['Verify', 'every documented behaviour of the 21 pages'], ['Design', 'cases with named techniques and oracles'], ['Automate', 'in 4 browsers on every push'], ['Measure', 'the tests themselves: coverage and mutation']], { icon: I.check })
  card(s, 6.8, 1.6, 5.9, 5.2, 'Questions we answer', [['Q1', 'Do form controls accept, reject and sanitise input exactly as the HTML standard says?'], ['Q2', 'Does every navigation path land where it should, including history and hash routes?'], ['Q3', 'Do assertions retry correctly against a live, changing DOM?'], ['Q4', 'Do clicks, hovers, scrolls and keyboard input reach the right element?'], ['Q5', 'Is the app accessible, secure, fast and stable across browsers?'], ['Q6', 'How good are our own tests? (coverage, mutation score)']], { icon: I.stethoscope })

  s = slide('System under test: the Cypress Kitchen Sink', 'f2cb767')
  txt(s, 'A 21-page static web application (Bootstrap 3, jQuery 1.12) built by Cypress to demonstrate every command, plus a TodoMVC app with hash routing and localStorage. Pinned at commit f2cb767 and served unmodified on localhost:8080.', { x: 0.6, y: 1.55, w: 7.0, h: 1.1, fontSize: 14, color: C.text2, objectName: A() })
  const pages = ['Home', 'Querying', 'Traversal', 'Actions', 'Window', 'Viewport', 'Location', 'Navigation', 'Assertions', 'Misc', 'Connectors', 'Aliasing', 'Waiting', 'Network', 'Files', 'Storage', 'Cookies', 'Spies & clocks', 'Utilities', 'Cypress API', 'Todo app']
  pages.forEach((p, i) => {
    const x = 0.6 + (i % 4) * 1.78; const y = 2.75 + Math.floor(i / 4) * 0.6
    const hot = ['Actions', 'Navigation', 'Assertions', 'Todo app'].includes(p)
    const nm = `anim-${3 + Math.floor(i / 4)}`
    s.addShape(pres.ShapeType.roundRect, { x, y, w: 1.66, h: 0.5, rectRadius: 0.08, fill: { color: hot ? C.accent1 : C.background2 }, line: { type: 'none' }, objectName: nm })
    txt(s, p, { x, y, w: 1.66, h: 0.5, fontSize: 12.5, bold: hot, color: hot ? C.background1 : C.text1, align: 'center', valign: 'middle', objectName: nm })
  })
  g = 8
  txt(s, 'Green: pages that carry the four required demonstration areas.', { x: 0.6, y: 6.6, w: 7, h: 0.3, fontSize: 11, italic: true, color: C.text2, objectName: A() })
  browserShot(s, frame('navbar'), 7.95, 2.0, 4.75, 'Real CI frame: the navbar suite opening each Commands entry')

  s = slide('How Cypress works, and why it suits this app')
  const arch = [['Test runner (Node)', 'Bundles specs, runs plugins, tasks and reporters; records video', HEX.accent5], ['Browser', 'Chrome · Firefox · Edge · Electron, launched and controlled by Cypress', HEX.accent2], ['Spec iframe', 'Our tests run in the same event loop as the app: direct DOM access', HEX.accent1], ['AUT iframe', 'The Kitchen Sink, proxied so cy.intercept can stub or rewrite traffic', HEX.accent3]]
  arch.forEach(([h, b, col], i) => {
    const y = 1.65 + i * 1.3; const nm = A()
    s.addShape(pres.ShapeType.roundRect, { x: 0.6, y, w: 5.6, h: 1.1, rectRadius: 0.1, fill: { color: col }, line: { type: 'none' }, objectName: nm })
    txt(s, h, { x: 0.85, y: y + 0.12, w: 5.1, h: 0.4, fontSize: 16, bold: true, color: 'FFFFFF', objectName: nm })
    txt(s, b, { x: 0.85, y: y + 0.52, w: 5.1, h: 0.5, fontSize: 12.5, color: 'FFFFFF', objectName: nm })
  })
  card(s, 6.55, 1.65, 6.15, 5.1, 'What this gives us', [['Retry-ability', 'queries and assertions retry for up to 6 s, so no fixed waits'], ['Network control', 'cy.intercept stubs the third-party comments API; unstubbed calls fail fast with 503'], ['Time travel', 'command log snapshots, screenshots and a video for every spec'], ['Real events', 'cypress-real-events drives native keyboard and hover through CDP'], ['Cypress 16', 'Cypress.expose replaces Cypress.env; modern visibility algorithm; native network path in Chromium']], { icon: I.cogs, bodySize: 13.5 })

  s = slide('Cypress against the alternatives')
  table(s, ['', 'Cypress 16 (chosen)', 'Selenium WebDriver', 'Playwright'], [
    ['Execution model', 'In-browser, same loop as the app', 'Out of process over the W3C protocol', 'Out of process over CDP/WebSocket'],
    ['Waiting', 'Automatic retry of queries and assertions', 'Explicit/implicit waits by hand', 'Auto-wait on actions'],
    ['Network stubbing', 'cy.intercept: stub, spy, rewrite in flight', 'Needs an external proxy', 'page.route'],
    ['Debugging', 'Time-travel log, video, screenshots', 'Logs and screenshots', 'Trace viewer'],
    ['Browsers', 'Chrome, Edge, Firefox, Electron', 'All major', 'Chromium, Firefox, WebKit'],
    ['Multi-tab / origin', 'Limited (cy.origin)', 'Full', 'Full'],
    ['Fit for this SUT', 'The SUT is Cypress\'s own reference app', 'Works, much more boilerplate', 'Good, but not the assigned tool'],
  ], { colW: [2.3, 3.4, 3.2, 3.2], fontSize: 13, rowH: 0.62 })

  s = slide('Scope')
  card(s, 0.6, 1.6, 7.3, 5.2, 'In scope', [['Pages', 'all 21, including the navbar, history and todo hash routes'], ['Form controls', 'text, email, password, textarea, disabled/readonly, checkbox, radio, select, multi-select, range, submit'], ['Interactions', 'click positions, dblclick, rightclick, hover, focus/blur, scroll, trigger, popover, tooltip'], ['Assertions', 'implicit, explicit, chai-jQuery, custom chai; querying and traversal'], ['Todo app', 'functions, persistence, state machine, decision logic'], ['Quality attributes', 'accessibility, visual, performance, security, responsive, compatibility, robustness']], { icon: I.check, bodySize: 13.5 })
  card(s, 8.2, 1.6, 4.5, 5.2, 'Out of scope', [['Third-party API', 'jsonplaceholder is stubbed, never depended on'], ['Load testing', 'single-user budgets only'], ['Server code', 'the SUT is static'], ['Legacy browsers', 'current stable channels only']], { icon: I.lock, iconBg: C.accent6, bodySize: 13.5 })

  // ============ 02 PLAN ===========================================================================
  sec('Test plan', 'IEEE 829 / ISO/IEC/IEEE 29119-3 structure', ['Process we followed', 'V-model and levels', 'Approach', 'Types × areas', 'Criteria', 'Risks', 'Environment'])
  s = slide('Our process, end to end')
  const steps = [['Plan', 'Scope, 53 requirements, entry/exit criteria'], ['Explore', 'Probe the SUT, record real behaviour'], ['Design', 'ECP, BVA, DT, CEG, STT, pairwise'], ['Implement', `${cases.length} cases in ${nSpecs} specs`], ['Execute', '4-browser CI on every push'], ['Triage', 'Fix oracles, log defects'], ['Report', 'Generated from evidence']]
  steps.forEach(([h, b], i) => {
    const x = 0.6 + i * 1.75; const nm = A()
    s.addShape(pres.ShapeType.chevron, { x, y: 1.9, w: 1.7, h: 1.0, fill: { color: [HEX.accent5, HEX.accent2, HEX.accent1, HEX.accent1, HEX.accent2, HEX.accent3, HEX.accent5][i] }, line: { type: 'none' }, objectName: nm })
    txt(s, h, { x: x + 0.22, y: 1.9, w: 1.36, h: 1.0, fontSize: 12.5, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', objectName: nm })
    txt(s, b, { x, y: 3.05, w: 1.65, h: 1.0, fontSize: 12, color: C.text2, align: 'center', objectName: nm })
  })
  card(s, 0.6, 4.4, 12.1, 2.4, 'Iterative by design', `The first CI run failed ${HIST.runs[0].browsers.chrome.fail} cases in Chrome. Triage split them into real SUT defects, wrong oracles and browser behaviour. Each oracle was corrected against the specification and each defect was logged and pinned by a test. That loop (execute → triage → fix → re-run) is what turned a first draft into a trustworthy suite.`, { icon: I.sync, bodySize: 14 })

  s = slide('V-model: where each activity sits')
  image(s, fig('vmodel.png'), 0.6, 1.55, 7.4, 5.3)
  card(s, 8.3, 1.6, 4.4, 1.6, `System · ${n((c) => c.level === 'System')} cases`, 'Real browser against the served app', { icon: I.layer, bodySize: 12.5 })
  card(s, 8.3, 3.35, 4.4, 1.6, `Acceptance · ${n((c) => c.level === 'Acceptance')} cases`, 'Given / When / Then user journeys', { icon: I.user, bodySize: 12.5 })
  card(s, 8.3, 5.1, 4.4, 1.7, 'Unit-level adequacy', '32 mutants and Istanbul coverage measure how strong the suite is', { icon: I.flask, bodySize: 12.5 })

  s = slide('Test approach')
  ;[[I.list, 'Black-box design', 'Every case names its technique and its oracle (HTML standard, WCAG, OWASP, page text)'], [I.code, 'White-box measurement', 'nyc instruments app JavaScript; branch and line coverage per run'], [I.flask, 'Testing the tests', 'Mutation testing: 32 faults injected one at a time'],
    [I.globe, 'Cross-browser', 'Same suite in Chrome, Firefox, Edge and Electron'], [I.eye, 'Non-functional', 'axe-core WCAG 2.1 AA, pixel diffs, timing budgets, XSS and header audits'], [I.bug, 'Defects as tests', 'Each defect becomes a known-defect test that flips when fixed']]
    .forEach(([ic, h, b], i) => card(s, 0.6 + (i % 3) * 4.08, 1.6 + Math.floor(i / 3) * 2.65, 3.9, 2.45, h, b, { icon: ic, bodySize: 13.5 }))

  s = slide('Test types across functional areas')
  const types = ['Functional', 'Accessibility', 'Performance', 'Security', 'Visual', 'API', 'Compatibility', 'Robustness']
  const areas = [['NAV', 'Navigation'], ['FC', 'Form controls'], ['UI', 'UI interactions'], ['AS', 'Assertions'], ['TD', 'Todo app'], ['NW', 'Network'], ['A11Y', 'Accessibility'], ['PERF', 'Performance'], ['SEC', 'Security'], ['RSP', 'Responsive'], ['API', 'HTTP / API']]
  table(s, ['Area', ...types, 'Total'], areas.map(([a, nm]) => {
    const row = types.map((t) => n((c) => areaOf(c) === a && c.type === t))
    return [nm, ...row.map((v) => ({ text: v ? String(v) : '·', options: { align: 'center', bold: v > 0, color: v ? HEX.dk1 : 'B0B6C4', fill: { color: v >= 20 ? 'C9EBDD' : v > 0 ? 'E7F5EF' : 'FFFFFF' } } })), { text: String(nA(a)), options: { bold: true, align: 'center' } }]
  }), { colW: [2.0, 1.25, 1.25, 1.15, 1.05, 0.9, 0.85, 1.25, 1.2, 1.2], fontSize: 12, rowH: 0.42 })

  s = slide('Entry, exit and suspension criteria')
  table(s, ['Criterion', 'Definition', 'Status'], [
    ['Entry', 'SUT served on :8080 and all 21 smoke tests pass', have ? 'Met in every run' : 'Pending'],
    ['Exit', 'No FAIL in any browser · every known defect still reproduces · 100 % requirement coverage · mutation score ≥ 80 %', have ? `${sum('fail') === 0 ? 'Met' : `${sum('fail')} failing executions`}${mScore !== null ? ` · mutation ${pct(mScore)}` : ''}` : 'Pending'],
    ['Suspension', 'Any smoke failure, or the SUT unreachable within 60 s', 'Never triggered'],
    ['Resumption', 'Smoke suite green again on the same commit', '—'],
    ['Flaky-test policy', 'One retry in run mode; a pass-on-retry is logged to flaky-<browser>.json and treated as a test defect', 'Tracked per run'],
  ], { colW: [2.3, 7.0, 2.8], fontSize: 13.5, rowH: 0.75 })

  s = slide('Risks and how we handled them')
  table(s, ['Risk', 'Likelihood', 'Impact', 'Mitigation'], [
    ['Third-party API slow or down', 'Medium', 'Flaky network tests', 'All calls stubbed; global intercept answers unstubbed calls with 503'],
    ['Rendering differs per browser', 'High', 'False visual failures', 'Baselines per browser; 0.2 % pixel threshold'],
    ['Timers and animations', 'Medium', 'Flaky tests', 'Retrying assertions, cy.clock, no fixed waits'],
    ['Cypress 16 visibility changes', 'Medium', 'False negatives', 'Geometric in-box checks in overflow containers'],
    ['SUT defects cascade', 'High', 'Unreadable reports', 'Known-defect pattern isolates each defect in one case'],
    ['Wrong oracle', 'Medium', 'False defects', 'Every expected value cites its source; triage before logging'],
  ], { colW: [3.1, 1.4, 2.2, 5.4], fontSize: 13, rowH: 0.62 })

  s = slide('Environment and tool stack')
  ;[['Cypress 16.2.1', 'Runner, retry-ability, intercept', I.cogs], ['@cypress/grep 7', 'Run by tag: @bva, @a11y, @smoke', I.list], ['cypress-real-events', 'Native CDP keyboard and hover', I.keyboard], ['axe-core 4.11', 'WCAG 2.1 A/AA rules', I.eye],
    ['pixelmatch + pngjs', 'Visual baseline diffs', I.image], ['nyc / Istanbul', 'Coverage of app JS', I.chart], ['mochawesome + JUnit', 'HTML and XML reports', I.book], ['GitHub Actions', 'ubuntu-24.04 · Node 24 · 4 browsers', I.server]]
    .forEach(([h, b, ic], i) => card(s, 0.6 + (i % 4) * 3.08, 1.6 + Math.floor(i / 4) * 2.65, 2.88, 2.45, h, b, { icon: ic, headSize: 15, bodySize: 13 }))

  // ============ 03 DESIGN ==========================================================================
  sec('Test design', 'Every FT3 technique, applied to real components', ['Technique mix', 'Traceability', 'ECP', 'BVA', 'Decision tables', 'Cause-effect graph', 'State transition', 'Other techniques'])
  const fam = {}
  cases.forEach((c) => {
    const t = c.technique || ''
    const k = /BVA/.test(t) ? 'BVA' : /ECP/.test(t) ? 'ECP' : /Decision/.test(t) ? 'Decision table' : /Cause/.test(t) ? 'Cause-effect graph' : /State/.test(t) ? 'State transition' : /WCAG/.test(t) ? 'WCAG checklist' : /OWASP/.test(t) ? 'OWASP checklist' : /Pairwise/.test(t) ? 'Pairwise' : /monkey/.test(t) ? 'Random (monkey)' : /Budget/.test(t) ? 'Performance budget' : /Visual/.test(t) ? 'Visual comparison' : t
    fam[k] = (fam[k] || 0) + 1
  })
  const famE = Object.entries(fam).sort((a, b) => b[1] - a[1])
  s = slide('Technique mix across all cases')
  hbar(s, famE.map((e) => e[0]), famE.map((e) => e[1]), { color: HEX.accent2, name: 'Cases' })
  card(s, 8.3, 1.6, 4.4, 2.45, 'Why ECP and BVA lead', 'Form controls are input-heavy: each field has classes and edges. Partitioning first, then probing edges, finds most input faults with the fewest cases.', { icon: I.chart, bodySize: 13 })
  card(s, 8.3, 4.3, 4.4, 2.5, 'Logic gets logic techniques', 'The todo app has rules and state, so it gets decision tables, a cause-effect graph and a state machine. Checklists bring WCAG and OWASP in as oracles.', { icon: I.sitemap, bodySize: 13 })

  s = slide('Requirements and traceability', `${reqs.length} REQ`)
  const gR = {}; reqs.forEach((r) => { gR[r.area] = (gR[r.area] || 0) + cases.filter((c) => (c.req || '').split(/[,;]\s*/).includes(r.id)).length })
  const gE = Object.entries(gR).sort((a, b) => b[1] - a[1])
  hbar(s, gE.map((e) => e[0]), gE.map((e) => e[1]), { color: HEX.accent5, name: 'Cases' })
  card(s, 8.3, 1.6, 4.4, 5.2, `${reqs.length} / ${reqs.length} covered`, [['Source', 'requirements derived from each page and the TodoMVC spec'], ['Link', 'every tc() names its REQ id; the build rejects unknown ids'], ['Matrix', 'full RTM in the workbook and the report'], ['Example', 'REQ-FC-11 (range slider) → TC-FC-140…161']], { icon: I.balance, bodySize: 13 })

  const ecp = cases.filter((c) => /^TC-FC-0(4\d|5[0-6])$/.test(c.id))
  s = slide('ECP: 17 equivalence classes for the email field', 'TC-FC-040…056')
  table(s, ['Class', 'Representative', 'Valid?'], ecp.slice(0, 9).map((c) => [c.title.split('—')[0].replace('Email ', '').trim(), c.data === '' ? '(empty)' : c.data, /invalid$/.test(c.title) ? 'Invalid' : 'Valid']), { x: 0.6, w: 4.3, colW: [0.8, 2.5, 1.0], fontSize: 12, rowH: 0.42 })
  table(s, ['Class', 'Representative', 'Valid?'], ecp.slice(9).map((c) => [c.title.split('—')[0].replace('Email ', '').trim(), c.data, 'Invalid']), { x: 5.05, w: 4.1, colW: [0.8, 2.3, 1.0], fontSize: 12, rowH: 0.42 })
  card(s, 9.35, 1.6, 3.35, 5.2, 'The oracle matters', 'Expected values come from the HTML "valid e-mail address" grammar, read through checkValidity() and validity.typeMismatch.\n\nI9 ("quoted"@b.com) is valid under RFC 5322 but invalid in HTML. Using the wrong standard would invent a defect.', { icon: I.book, bodySize: 12.5 })

  s = slide('BVA: rules and the range slider', 'TC-FC-140…154')
  table(s, ['Variant', 'Values per variable', 'Cases (n vars)'], [['Normal', 'min, min+, nom, max−, max', '4n + 1'], ['Robust', '+ min−, max+', '6n + 1'], ['Worst-case', '5 values, all combinations', '5ⁿ'], ['Robust worst-case', '7 values, all combinations', '7ⁿ']], { x: 0.6, y: 1.6, w: 6.4, colW: [1.9, 3.0, 1.5], fontSize: 12.5, rowH: 0.4 })
  const lx = 0.9; const lw = 11.4; const ly = 4.55
  s.addShape(pres.ShapeType.line, { x: lx, y: ly, w: lw, h: 0, line: { color: HEX.dk1, width: 2 }, objectName: 'anim-3' })
  s.addShape(pres.ShapeType.rect, { x: lx + 2 * lw / 8, y: ly - 0.11, w: 4 * lw / 8, h: 0.22, fill: { color: HEX.accent1, transparency: 70 }, line: { type: 'none' }, objectName: 'anim-3' })
  ;[['-1000', '0'], ['-1', '0'], ['0', '0'], ['1', '1'], ['50', '50'], ['99', '99'], ['100', '100'], ['101', '100'], ['1e6', '100']].forEach(([inp, out], k) => {
    const off = k * lw / 8; const inside = k >= 2 && k <= 6; const nm = `anim-${4 + k}`
    s.addShape(pres.ShapeType.ellipse, { x: lx + off - 0.13, y: ly - 0.13, w: 0.26, h: 0.26, fill: { color: inside ? HEX.accent1 : HEX.accent4 }, line: { color: 'FFFFFF', width: 1 }, objectName: nm })
    txt(s, inp, { x: lx + off - 0.6, y: ly - 0.72, w: 1.2, h: 0.4, fontSize: 15, bold: true, align: 'center', fontFace: 'Courier New', objectName: nm })
    txt(s, '→ ' + out, { x: lx + off - 0.6, y: ly + 0.24, w: 1.2, h: 0.4, fontSize: 13, align: 'center', color: C.text2, objectName: nm })
  })
  g = 13
  card(s, 7.3, 1.6, 5.4, 2.0, 'Oracle: HTML value sanitisation', 'Clamp to [min, max], round to the nearest step (ties up), default (min+max)/2 = 50 for non-numbers. Robust and step cases: 49.4 → 49, 50.5 → 51, "abc" → 50.', { bodySize: 12.5 })
  txt(s, 'Green: inside the valid range · red: robustness values outside it (clamped)', { x: 0.6, y: 5.35, w: 12, h: 0.3, fontSize: 11.5, italic: true, color: C.text2, objectName: A() })
  const cn = A()
  s.addShape(pres.ShapeType.roundRect, { x: 0.6, y: 5.8, w: 12.1, h: 1.0, rectRadius: 0.12, fill: { color: 'FFF8EA' }, line: { color: HEX.accent3, width: 1 }, objectName: cn })
  txt(s, 'Cross-browser finding · TC-FC-152', { x: 0.85, y: 5.85, w: 3.8, h: 0.9, fontSize: 14, bold: true, valign: 'middle', objectName: cn })
  const cv = Object.entries(compat).map(([b, v]) => `${b} "${(Array.isArray(v) ? v[0] : v).value}"`).join(', ')
  txt(s, `"1e2" is a valid floating-point number, so the sanitiser may keep it. Firefox keeps the string, Chromium normalises it to "100"; valueAsNumber is 100 in both.${cv ? ` Recorded: ${cv}.` : ''}`, { x: 4.7, y: 5.85, w: 7.8, h: 0.9, fontSize: 12, color: C.text2, valign: 'middle', objectName: cn })

  s = slide('Decision table: three checkboxes, 2³ rules', 'TC-FC-083…090')
  const Y = (v) => ({ text: v, options: { align: 'center', bold: v === 'Y' || v === 'X', color: v === 'Y' ? HEX.accent1 : v === 'X' ? HEX.accent2 : HEX.dk2 } })
  table(s, ['', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'], [
    ['C1  checkbox1 passed to .check()', ...'NYNYNYNY'.split('').map(Y)], ['C2  checkbox2 passed', ...'NNYYNNYY'.split('').map(Y)], ['C3  checkbox3 passed', ...'NNNNYYYY'.split('').map(Y)],
    ['A1  exactly those boxes checked', ...'XXXXXXXX'.split('').map(Y)], ['Test case', ...['083', '084', '085', '086', '087', '088', '089', '090'].map((v) => ({ text: v, options: { align: 'center', fontFace: 'Courier New' } }))],
  ], { colW: [4.1, ...Array(8).fill(1.0)], fontSize: 14, rowH: 0.52 })
  card(s, 0.6, 4.6, 5.9, 2.2, 'Why exhaustive here', 'Three independent conditions, no don\'t-cares, no impossible rules: all 8 combinations cost 8 short tests. The same 2³ table covers the multi-select (TC-FC-123…130).', { icon: I.list, bodySize: 13 })
  card(s, 6.8, 4.6, 5.9, 2.2, 'Disabled boxes', 'A disabled box must never change. The test clicks it natively and asserts nothing moved. A mutation run proved the first version too weak (mutant M31) and it was strengthened.', { icon: I.lock, bodySize: 13 })

  s = slide('Decision table: the todo footer', 'TC-TD-070…074')
  table(s, ['Rule', 'Items', 'Completed', 'A1 footer', 'A2 "Clear completed"', 'A3 toggle-all', 'Case'], [
    ['R1', '0', '–', 'N', 'N', '– (hidden)', 'TC-TD-070'], ['R2', '≥ 1', 'none', 'Y', 'N', 'N', 'TC-TD-071'], ['R3', '≥ 1', 'some', 'Y', 'Y', 'N', 'TC-TD-072'], ['R4', '≥ 1', 'all', 'Y', 'Y', 'Y', 'TC-TD-073'],
  ], { colW: [0.9, 1.1, 1.5, 1.6, 2.6, 2.2, 2.2], fontSize: 14, rowH: 0.52 })
  card(s, 0.6, 4.4, 3.9, 2.4, 'Collapsing', '12 raw combinations minus impossible ones (completed > items) and don\'t-cares (empty list) leave 4 rules.', { bodySize: 13 })
  card(s, 4.7, 4.4, 3.9, 2.4, 'Lesson from CI', 'R1 first expected toggle-all unchecked. With 0 items, 0 of 0 counts as "all done", but the control is hidden, so A3 became a don\'t-care.', { bodySize: 13, line: HEX.accent3, fill: 'FFF8EA' })
  card(s, 8.8, 4.4, 3.9, 2.4, 'Dynamic check', 'TC-TD-074 re-evaluates the table after every action: R2 → R3 → R4 → R2.', { bodySize: 13 })

  s = slide('Cause-effect graph: finishing a todo edit', 'TC-TD-080…087')
  image(s, fig('cause_effect_graph.png'), 0.6, 1.55, 6.9, 5.3)
  card(s, 7.8, 1.6, 4.9, 2.55, 'Boolean model', 'C1 Enter · C2 blur · C3 Escape (exclusive) · C4 trimmed text non-empty\nE1 save = (C1 ∨ C2) ∧ C4\nE2 delete = (C1 ∨ C2) ∧ ¬C4\nE3 keep original = C3', { icon: I.sitemap, bodySize: 12.5 })
  table(s, ['Test', 'Event', 'Text', 'Effect'], [['K1', 'Enter', '"renamed"', 'E1 save'], ['K3', 'Enter', '""', 'E2 delete'], ['K5', 'blur', '"blurred"', 'E1 save'], ['K6', 'blur', '""', 'E2 delete'], ['K7', 'Esc', '"discarded"', 'E3 restore']], { x: 7.8, y: 4.35, w: 4.9, colW: [0.8, 1.1, 1.5, 1.5], fontSize: 12, rowH: 0.4 })

  s = slide('State machine of a todo item', 'TC-TD-100…117')
  image(s, fig('todo_state_machine.png'), 0.6, 1.55, 8.1, 5.3)
  card(s, 9.0, 1.6, 3.7, 1.6, '6 states', 'S0 absent · S1 active · S2 completed · S3/S4 editing · S5 deleted', { bodySize: 12 })
  card(s, 9.0, 3.35, 3.7, 1.6, '12 valid transitions', '0-switch coverage: T1–T12, one case each', { bodySize: 12 })
  card(s, 9.0, 5.1, 3.7, 1.7, 'Invalid + 1-switch', 'Null transitions do nothing; a path S0→S1→S2→S4→S2→S1→S5 covers transition pairs', { bodySize: 12 })

  s = slide('State-transition table and cases', 'TC-TD-100…111')
  table(s, ['State \\ Event', 'add', 'toggle', 'dblclick', 'Enter (text)', 'Enter (empty)', 'Esc', 'destroy', 'clear done'], [
    ['S0 absent', 'S1 (T1)', '–', '–', '–', '–', '–', '–', '–'], ['S1 active', '–', 'S2 (T2)', 'S3 (T4)', '–', '–', '–', 'S5 (T10)', '–'], ['S2 completed', '–', 'S1 (T3)', 'S4 (T5)', '–', '–', '–', 'S5 (T11)', 'S5 (T12)'],
    ['S3 editing active', '–', '–', '–', 'S1 (T6)', 'S5 (T9)', 'S1 (T8)', '–', '–'], ['S4 editing done', '–', '–', '–', 'S2 (T7)', 'S5', 'S2', '–', '–'],
  ], { colW: [2.2, 1.1, 1.25, 1.25, 1.35, 1.4, 1.1, 1.25, 1.2], fontSize: 12.5, rowH: 0.55 })
  card(s, 0.6, 5.0, 12.1, 1.8, 'Easy-to-miss transitions found by drawing the machine first', 'T7: saving an edit of a completed item keeps it completed. T9: Enter on an empty edit deletes the item instead of restoring it. Both are now explicit cases, and mutants that break them are killed.', { icon: I.route, bodySize: 13.5 })

  s = slide('More techniques in the suite')
  ;[[I.random, 'Pairwise', 'Device × page in 10 runs covers every pair of 5 viewports and the key pages (TC-RSP-001…010)'], [I.bug, 'Error guessing', '30 cases: Enter key, double submit, Unicode, very long text. Found DEF-KS-002'],
    [I.bolt, 'Fault injection', 'Corrupt localStorage before load (TC-TD-134). Found DEF-KS-003'], [I.magic, 'Seeded monkey testing', '200 random actions per seed; the seed is logged so failures replay (TC-ROB-001…003)'],
    [I.user, 'Scenario / UAT', 'Given / When / Then journeys a user would recognise (TC-UAT-001…005)'], [I.shield, 'Checklists', 'WCAG 2.1 AA and OWASP Secure Headers act as oracles']]
    .forEach(([ic, h, b], i) => card(s, 0.6 + (i % 3) * 4.08, 1.6 + Math.floor(i / 3) * 2.65, 3.9, 2.45, h, b, { icon: ic, bodySize: 13 }))

  // ============ 04 FRAMEWORK =========================================================================
  sec('Framework', `How ${cases.length} cases stay readable, traceable and honest`, ['Architecture', 'Repository layout', 'tc() metadata', 'Known-defect pattern', 'Custom commands', 'CI pipeline', 'Evidence flow'])
  s = slide('Harness architecture')
  image(s, fig('harness_architecture.png'), 0.6, 1.5, 12.1, 3.2)
  ;[['Specs', `${nSpecs} files in 19 numbered areas, tagged for grep`], ['Support', 'tc(), custom commands, global network guard'], ['Plugins', 'tasks for metadata, evidence, visual diff, flaky detection'], ['Tools', 'catalogue, aggregate, mutation, coverage, documents']]
    .forEach(([h, b], i) => card(s, 0.6 + i * 3.08, 4.95, 2.88, 1.85, h, b, { headSize: 15, bodySize: 12.5 }))

  s = slide('Repository layout')
  code(s, `cypress-kitchen-sink-testing/
├─ app/                      Kitchen Sink @ f2cb767 (unmodified SUT)
├─ cypress/
│  ├─ e2e/01-smoke … 19-utilities-files/   ${nSpecs} specs
│  ├─ support/  tc.js · commands.js · e2e.js
│  ├─ plugins/  evidence.js · visual.js
│  ├─ fixtures/ pages.json · a11y-known.json
│  └─ snapshots/baseline/<browser>/
├─ tools/  catalogue · aggregate · mutants · mutation
│          instrument · publish-results · deliverables/
├─ docs/   requirements · defects · team · figures
└─ .github/workflows/  ci.yml · mutation.yml`, 0.6, 1.6, 7.6, 5.2, 12.5)
  card(s, 8.5, 1.6, 4.2, 5.2, 'Conventions', [['IDs', 'TC-AREA-NNN, unique, validated'], ['Tags', '@technique @type @priority'], ['Commits', 'Conventional Commits'], ['Docs', 'generated, never typed by hand'], ['Lint', 'ESLint + eslint-plugin-cypress, 0 errors']], { icon: I.git, bodySize: 13 })

  s = slide('Every test is a documented test case: tc()', 'TC-FC-040')
  code(s, `tc({ id: 'TC-FC-040',
     title: 'Email V1 — simple local@domain → valid',
     technique: 'ECP', req: 'REQ-FC-02', priority: 'P1',
     data: 'user@example.com',
     expected: 'checkValidity() = true; typeMismatch = false' },
() => {
  cy.get('.action-email').type('user@example.com')
  cy.get('.action-email').should(($i) => {
    expect($i[0].checkValidity()).to.be.true
    expect($i[0].validity.typeMismatch).to.be.false
  })
})`, 0.6, 1.6, 7.3, 5.2, 13)
  card(s, 8.2, 1.6, 4.5, 5.2, 'What tc() adds', [['Title', '"TC-FC-040 | Email V1 …" in every report'], ['Guard', 'duplicate IDs fail at load time'], ['Tags', '@ECP @Functional @P1 for grep'], ['Catalogue', 'metadata → JSON → workbook, report, deck'], ['Bug we fixed', 'the catalogue now lives on globalThis because spec and support files are separate bundles']], { icon: I.code, bodySize: 12.5 })

  s = slide('Known-defect tests keep defects visible', 'tc.knownDefect')
  const flow = [['Defect reproduces', 'an assertion fails or the page throws', HEX.accent3], ['Test PASSES', 'reported as KNOWN DEFECT', HEX.accent1], ['Developer fixes it', 'behaviour is now correct', HEX.accent2], ['Test FAILS', '"DEF-KS-0xx no longer reproduces"', HEX.accent4], ['Convert to tc()', 'it becomes a regression test', HEX.accent5]]
  flow.forEach(([h, b, col], i) => {
    const x = 0.6 + i * 2.5; const nm = A()
    s.addShape(pres.ShapeType.roundRect, { x, y: 1.75, w: 2.2, h: 2.1, rectRadius: 0.14, fill: { color: col }, line: { type: 'none' }, objectName: nm })
    txt(s, h, { x: x + 0.15, y: 1.95, w: 1.9, h: 0.85, fontSize: 16, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', objectName: nm })
    txt(s, b, { x: x + 0.15, y: 2.85, w: 1.9, h: 0.85, fontSize: 12, color: 'FFFFFF', align: 'center', objectName: nm })
    if (i < flow.length - 1) s.addShape(pres.ShapeType.rightArrow, { x: x + 2.22, y: 2.65, w: 0.26, h: 0.3, fill: { color: HEX.accent6 }, line: { type: 'none' }, objectName: nm })
  })
  code(s, `tc.knownDefect({ id: 'TC-TD-136', defect: 'DEF-KS-009', … }, () => {
  cy.clock(Date.UTC(2026, 0, 1), ['Date'])   // both demo items, same ms
  cy.visitPage('/todo')
  cy.get('.todo-list li').eq(1).find('.toggle').click()
  cy.get('.todo-list li').eq(0).should('not.have.class', 'completed')
})`, 0.6, 4.2, 8.0, 2.6, 12)
  card(s, 8.9, 4.2, 3.8, 2.6, `${n((c) => c.knownDefect)} known-defect cases`, have ? `${results.chrome ? results.chrome.summary.knownDefect : ''} reproduced in every browser in the latest run` : 'One per defect manifestation', { icon: I.bug, iconBg: C.accent4, bodySize: 13 })

  s = slide('Custom commands keep specs short')
  table(s, ['Command', 'What it does', 'Used by'], [
    ['cy.visitPage(url)', 'Visit, spy on console.error and uncaught page errors', 'every spec'], ['cy.assertNoPageErrors()', 'Fail if the page logged an error during the test', 'smoke, robustness'],
    ['cy.visitTodos(items) · cy.storedTodos()', 'Seed and read the todo list through localStorage', 'todo, security'], ['cy.checkA11y({ known })', 'Inject axe-core 4.11; fail only on NEW serious/critical violations', 'accessibility'],
    ['cy.matchSnapshot(name)', 'Screenshot and pixel-diff against the per-browser baseline', 'visual'], ['cy.pageMetrics()', 'TTFB, DCL, load, FCP, requests, KB, DOM nodes', 'performance'],
  ], { colW: [3.6, 6.2, 2.3], fontSize: 13, rowH: 0.62 })

  s = slide('Continuous integration on every push')
  image(s, fig('ci_pipeline.png'), 0.6, 1.5, 5.6, 5.4)
  card(s, 6.5, 1.6, 6.2, 5.2, 'Pipeline', [['Lint', 'ESLint with eslint-plugin-cypress'], ['E2E matrix', 'Chrome · Firefox · Edge · Electron in parallel'], ['Coverage', 'instrumented copy of the app, nyc report'], ['Mutation', '32 mutants in 4 shards (separate workflow)'], ['Publish', 'all evidence committed to an orphan "results" branch'], ['Review', 'fixes go through a pull request whose CI must pass']], { icon: I.server, bodySize: 13.5 })

  s = slide('Evidence to documents, no hand-typed numbers')
  ;[['Cypress run', 'mochawesome JSON, JUnit XML, video, screenshots'], ['aggregate.js', 'merge with tc() metadata → results-<browser>.json'], ['results branch', 'per-browser results, a11y, perf, security, coverage, mutation'], ['Generators', 'workbook · report · deck · FT3 pack · video'], ['Deliverables', 'every figure traceable to a run']]
    .forEach(([h, b], i) => {
      const x = 0.6 + i * 2.5; const nm = A()
      s.addShape(pres.ShapeType.roundRect, { x, y: 1.9, w: 2.25, h: 2.3, rectRadius: 0.12, fill: { color: i % 2 ? C.background2 : 'E7F5EF' }, line: { type: 'none' }, objectName: nm })
      txt(s, h, { x: x + 0.2, y: 2.05, w: 1.9, h: 0.6, fontSize: 15, bold: true, objectName: nm })
      txt(s, b, { x: x + 0.2, y: 2.7, w: 1.9, h: 1.4, fontSize: 12.5, color: C.text2, objectName: nm })
      if (i < 4) s.addShape(pres.ShapeType.rightArrow, { x: x + 2.25, y: 2.9, w: 0.24, h: 0.3, fill: { color: HEX.accent6 }, line: { type: 'none' }, objectName: nm })
    })
  card(s, 0.6, 4.6, 12.1, 2.2, 'Why this matters for an SVV project', 'A report that is typed by hand drifts from the code. Here every count, percentage and chart is regenerated from the latest CI evidence, so a reviewer can trace any number on any slide back to a run and a test-case ID.', { icon: I.balance, bodySize: 14 })

  // ============ 05 REQUIRED AREAS ====================================================================
  sec('The four required areas', 'Form controls · Navigation · Assertions · UI interactions', ['Coverage overview', 'Form controls', 'Navigation', 'Assertions', 'UI interactions', 'Todo app'])
  s = slide('Coverage of the required areas')
  ;[[nA('FC'), 'Form controls', 'Text, email, password, textarea, checkbox, radio, select, range, submit', I.forms], [nA('NAV'), 'Navigation', 'Navbar, history, anchors, clean URLs, hash routes', I.compass], [nA('AS') + nA('QT'), 'Assertions & querying', 'should / and / expect / assert, chai-jQuery, traversal', I.check], [nA('UI'), 'UI interactions', 'Click positions, dblclick, hover, scroll, trigger, widgets', I.mouse]]
    .forEach(([v, h, b, ic], i) => {
      const x = 0.6 + i * 3.08; const nm = A()
      s.addShape(pres.ShapeType.roundRect, { x, y: 1.6, w: 2.88, h: 5.2, rectRadius: 0.14, fill: { color: C.background2 }, line: { type: 'none' }, objectName: nm })
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.28, y: 1.88, w: 0.7, h: 0.7, fill: { color: C.accent1 }, line: { type: 'none' }, objectName: nm })
      s.addImage({ data: ic, x: x + 0.45, y: 2.05, w: 0.36, h: 0.36, objectName: nm })
      txt(s, String(v), { x: x + 0.28, y: 2.8, w: 2.4, h: 1.0, fontSize: 54, bold: true, color: C.accent1, objectName: nm })
      txt(s, h, { x: x + 0.28, y: 3.85, w: 2.4, h: 0.5, fontSize: 17, bold: true, objectName: nm })
      txt(s, b, { x: x + 0.28, y: 4.4, w: 2.4, h: 1.4, fontSize: 13, color: C.text2, objectName: nm })
    })

  s = slide('Form controls: what each group checks', 'TC-FC-001…181')
  table(s, ['Control', 'Technique', 'Cases', 'Highlights'], [
    ['Text inputs', 'ECP, error guessing', n((c) => /^TC-FC-0[0-3]\d$/.test(c.id)), 'Special-key sequences, delay, focus/blur styles, clear, disabled and readonly'],
    ['Email', 'ECP: 6 valid + 11 invalid', 17, 'Constraint Validation API as oracle'],
    ['Submit form', 'Use-case, error guessing', n((c) => /^TC-FC-0[67]\d$/.test(c.id)), 'Success message colour rgb(32, 181, 32); double submit'],
    ['Checkbox / radio', 'Decision table, state transition', n((c) => /^TC-FC-0[89]\d$/.test(c.id)), '2³ rules; radio mutual exclusion; disabled controls'],
    ['Select / multi-select', 'ECP, decision table', n((c) => /^TC-FC-1[1-3]\d$/.test(c.id)), 'By value, text and index; 2³ multi-select subsets; invalid options'],
    ['Range', 'BVA, robust BVA', n((c) => /^TC-FC-1[4-6]\d$/.test(c.id)), 'Clamp, step rounding, default 50, keyboard arrows'],
    ['Other forms', 'Use-case', n((c) => /^TC-FC-1[78]\d$/.test(c.id)), 'Tab order, real CDP typing, editable regions'],
  ], { colW: [2.3, 2.9, 0.9, 6.0], fontSize: 13, rowH: 0.6 })

  s = slide('Form controls in action', 'TC-FC-001…032')
  browserShot(s, frame('text-inputs'), 0.75, 1.95, 7.3, 'Real CI frame (Chrome): text-input cases with their TC IDs in the command log')
  card(s, 8.4, 1.6, 4.3, 5.2, 'Found while testing forms', [['DEF-KS-002', 'pressing Enter in the one-field email form submits it, reloads the page and erases the input'], ['Tool insight', 'Cypress types into type=email by re-setting the value on each key, and the browser strips trailing spaces each time; inner spaces are therefore set in one step'], ['Oracle', 'every expected value cites the HTML standard']], { icon: I.forms, bodySize: 12.5 })

  s = slide('Data-driven BVA in code', 'TC-FC-141…154')
  code(s, `const cases = [
  ['min − 1', -1, '0'],   ['min', 0, '0'],
  ['min + 1', 1, '1'],    ['nominal', 50, '50'],
  ['max − 1', 99, '99'],  ['max', 100, '100'],
  ['max + 1', 101, '100'], ['far above', 1e6, '100'],
]
cases.forEach(([label, input, expected], i) => {
  tc({ id: \`TC-FC-\${141 + i}\`, technique: 'BVA',
       req: 'REQ-FC-11', title: \`Range \${label}\` }, () => {
    cy.get('.trigger-input-range')
      .invoke('val', input).trigger('change')
      .should('have.value', expected)
      .next('p').should('have.text', expected)
  })
})`, 0.6, 1.6, 7.6, 5.2, 12.5)
  browserShot(s, frame('range-bva'), 8.55, 1.95, 4.15, 'BVA suite running in CI')

  s = slide('Navigation', 'TC-NAV-001…086')
  ;[['Navbar', 'Every Commands entry, in menu order, opens the right page; active state; brand and external links'], ['History', 'cy.go back and forward, reload with and without cache, location checks'], ['Deep links', 'In-page anchors scroll their section into view; every section links to its docs'], ['Routes', 'Clean URLs, .html → 301, todo hash routes #/, #/active, #/completed']]
    .forEach(([h, b], i) => card(s, 0.6, 1.6 + i * 1.33, 5.6, 1.2, h, b, { headSize: 15, bodySize: 12 }))
  browserShot(s, frame('anchors-and-routes'), 6.6, 1.95, 6.1, 'CI frame: TC-NAV-085 reproducing DEF-KS-001 ("this[activeRoute] is not a function")')

  s = slide('Assertions', 'TC-AS-001…035')
  code(s, `// implicit, retried with the query
cy.get('.assertion-table tbody tr:last')
  .should('have.class', 'success')
  .find('td').first()
  .should('have.text', 'Column content')

// callback: several checks retried as one unit
cy.get('.assertions-p').find('p').should(($p) => {
  expect($p).to.have.length(3)
  expect($p.first()).to.contain('Some text')
})

// negative: each starts from the element subject
cy.get('.assertions-link').should('not.have.class', 'disabled')`, 0.6, 1.6, 7.0, 5.2, 12.5)
  card(s, 7.9, 1.6, 4.8, 5.2, 'What we cover', [['Styles', 'implicit (should / and) vs explicit (expect, assert)'], ['Retry-ability', 'callback assertions retry as one unit'], ['Negative', 'absent elements, missing classes'], ['Custom chai', 'textTrimmed method'], ['Aliases', 'connectors, wrap, invoke, its (TC-AS-030…035)'], ['CI lesson', 'not.have.attr changes the subject, so the next assertion starts from cy.get again']], { icon: I.check, bodySize: 12.5 })

  s = slide('UI interactions: clicks verified to the pixel', 'TC-UI-001…067')
  const cx = 0.9; const cyy = 1.75; const cw = 3.6; const nmC = A()
  s.addShape(pres.ShapeType.rect, { x: cx, y: cyy, w: cw, h: cw, fill: { color: C.background2 }, line: { color: HEX.dk2, width: 1 }, objectName: nmC })
  ;[[0, 0, 'topLeft'], [0.5, 0, 'top'], [1, 0, 'topRight'], [0, 0.5, 'left'], [0.5, 0.5, 'center'], [1, 0.5, 'right'], [0, 1, 'bottomLeft'], [0.5, 1, 'bottom'], [1, 1, 'bottomRight']]
    .forEach(([fx, fy, l], k) => {
      const nm = `anim-${2 + k}`
      s.addShape(pres.ShapeType.ellipse, { x: cx + fx * cw - 0.12, y: cyy + fy * cw - 0.12, w: 0.24, h: 0.24, fill: { color: C.accent4 }, line: { type: 'none' }, objectName: nm })
      txt(s, l, { x: cx + fx * cw - 0.7 + (fx === 0 ? 0.75 : fx === 1 ? -0.75 : 0), y: cyy + fy * cw + (fy === 1 ? -0.45 : 0.16), w: 1.4, h: 0.3, fontSize: 10.5, align: 'center', color: C.text2, objectName: nm })
    })
  g = 11
  txt(s, 'Canvas 250 × 250 px: after each click the test reads the pixel data back and asserts a painted dot near the expected point.', { x: 0.6, y: 5.6, w: 4.4, h: 1.2, fontSize: 12.5, color: C.text2, objectName: A() })
  browserShot(s, frame('click'), 5.4, 1.95, 7.3, 'CI frame: click positions, coordinates, multiple:true and force:true')

  s = slide('The todo app: where the logic lives', 'TC-TD-001…136')
  hbar(s, ['Functional', 'ECP and BVA', 'Decision table', 'Cause-effect', 'State transition', 'Persistence & identity'], [
    n((c) => /^TC-TD-0[01]\d$/.test(c.id)), n((c) => /^TC-TD-0[345]\d$/.test(c.id)), n((c) => /^TC-TD-07\d$/.test(c.id)), n((c) => /^TC-TD-0[89]\d$/.test(c.id)), n((c) => /^TC-TD-1[01]\d$/.test(c.id)), n((c) => /^TC-TD-13\d$/.test(c.id)),
  ], { color: HEX.accent1, w: 6.0, name: 'Cases' })
  browserShot(s, frame('todo-state-transition'), 6.95, 1.95, 5.75, 'CI frame: state-transition suite T7–T12, invalid events, 1-switch path')
  txt(s, 'Five of the 14 defects live here: unknown route, corrupt storage, re-seeding, duplicate ids, unlabeled inputs.', { x: 6.95, y: 5.4, w: 5.75, h: 0.9, fontSize: 13, bold: true, color: C.accent4, objectName: A() })

  // ============ 06 BEYOND ===========================================================================
  sec('Beyond the brief', 'Quality attributes, and testing the tests themselves', ['Accessibility', 'Visual regression', 'Performance', 'Security', 'Responsive & compatibility', 'Mutation testing', 'Code coverage'])
  s = slide('Non-functional coverage at a glance')
  ;[[I.eye, 'Accessibility', `${nA('A11Y')} cases`, 'axe-core on all 21 pages + keyboard'], [I.image, 'Visual', `${nA('VIS')} cases`, 'per-browser pixel baselines'], [I.tachometer, 'Performance', `${nA('PERF')} cases`, 'timing budgets on every page'], [I.shield, 'Security', `${nA('SEC')} cases`, 'XSS, headers, tab-nabbing'],
    [I.mobile, 'Responsive', `${nA('RSP')} cases`, 'pairwise device × page'], [I.server, 'HTTP / API', `${nA('API')} cases`, 'status, ETag, links, methods'], [I.random, 'Robustness', `${nA('ROB')} cases`, 'seeded monkey, faults'], [I.flask, 'Mutation', `${mutants.length || 32} mutants`, 'are the tests strong enough?']]
    .forEach(([ic, h, v, b], i) => card(s, 0.6 + (i % 4) * 3.08, 1.6 + Math.floor(i / 4) * 2.65, 2.88, 2.45, `${h} · ${v}`, b, { icon: ic, headSize: 13.5, bodySize: 12.5 }))

  s = slide('Accessibility: what axe-core found', 'TC-A11Y-001…053')
  if (a11y.length) {
    const seen = new Set()
    const byPage = a11y.filter((r) => !/state/.test(r.page) && !seen.has(r.page) && seen.add(r.page)).map((r) => [r.page.replace('/commands/', ''), r.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).reduce((s2, v) => s2 + v.nodes, 0)]).sort((a, b) => b[1] - a[1]).slice(0, 12)
    hbar(s, byPage.map((x) => x[0]), byPage.map((x) => x[1]), { color: HEX.accent4, w: 6.6, name: 'Violating nodes', title: 'Serious + critical violating nodes per page (Chrome)' })
  }
  card(s, 7.5, 1.6, 5.2, 5.2, 'Four WCAG defects, pinned', [['DEF-KS-010', 'contrast below 4.5:1 on 20 of 21 pages (1.4.3)'], ['DEF-KS-011', 'inputs and selects with no accessible name (4.1.2) — critical'], ['DEF-KS-012', 'links in text distinguished by colour alone (1.4.1)'], ['DEF-KS-013', 'scroll boxes keyboard users cannot reach (2.1.1)'], ['Policy', 'known rules are baselined per page; any NEW serious/critical violation fails the build']], { icon: I.eye, bodySize: 12.5 })

  s = slide('Visual regression with pixelmatch', 'TC-VIS-001…012')
  ;[['1  Capture', 'cy.screenshot of a component: navbar, forms, tables, todo'], ['2  Compare', 'pixelmatch against snapshots/baseline/<browser>/'], ['3  Judge', '≤ 0.2 % differing pixels = match; diff PNG saved otherwise'], ['4  Self-test', 'TC-VIS-012 changes the page on purpose and must report "mismatch"']]
    .forEach(([h, b], i) => card(s, 0.6 + i * 3.08, 1.6, 2.88, 2.6, h, b, { headSize: 17, bodySize: 13 }))
  card(s, 0.6, 4.5, 12.1, 2.3, 'Why per-browser baselines', 'Font rasterising and anti-aliasing differ between Chromium and Firefox, so one shared baseline would fail for the wrong reason. The first CI run exposed that the plugin did not know the browser name; it now records it from before:run, and every browser keeps its own reference images.', { icon: I.image, bodySize: 13.5 })

  s = slide('Performance budgets', 'TC-PERF-001…031')
  if (perf.length) {
    const seen = new Set()
    const pr = perf.filter((p) => !seen.has(p.page) && seen.add(p.page)).map((p) => [p.page.replace('/commands/', ''), Math.round(p.domContentLoaded)])
    hbar(s, pr.map((x) => x[0]), pr.map((x) => x[1]), { color: HEX.accent2, w: 7.0, name: 'ms', title: 'DOMContentLoaded per page, ms (Chrome, CI runner)' })
  }
  table(s, ['Metric', 'Budget'], [['DOMContentLoaded', '< 1500 ms'], ['Load event', '< 3000 ms'], ['First Contentful Paint', '< 2000 ms'], ['Requests', '≤ 30'], ['Transfer size', '≤ 1500 KB'], ['Long tasks', 'none > 200 ms']], { x: 7.9, y: 1.6, w: 4.8, colW: [2.8, 2.0], fontSize: 13, rowH: 0.45 })
  if (perf.length) txt(s, `Slowest page: ${perf.reduce((a, b) => (a.domContentLoaded > b.domContentLoaded ? a : b)).page} at ${Math.round(Math.max(...perf.map((p) => p.domContentLoaded)))} ms DCL, well inside budget. Largest transfer: ${Math.max(...perf.map((p) => p.transferKB))} KB (first load, includes vendor scripts).`, { x: 7.9, y: 5.0, w: 4.8, h: 1.8, fontSize: 13, color: C.text2, objectName: A() })

  s = slide('Security checks', 'TC-SEC-001…034')
  table(s, ['Check', 'Method', 'Result'], [
    ['Stored XSS through todo titles', '8 payloads: script, img onerror, svg onload, javascript: URL, attribute break-out, template literal, entity smuggling, iframe srcdoc', 'Rendered as text, nothing executed, also after reload'],
    ['XSS through the edit path', 'Payload saved by editing an item', 'Escaped'],
    ['OWASP Secure Headers', 'CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy …', 'Recorded as observations for a static demo'],
    ['Reverse tab-nabbing', 'a[target=_blank] without rel=noopener', 'DEF-KS-007'],
    ['Directory listing', 'GET /assets/js/', 'DEF-KS-006'],
    ['Information leak', 'Server header, error pages', 'No Server header, no stack traces'],
  ], { colW: [3.0, 5.6, 3.5], fontSize: 12.5, rowH: 0.7 })

  s = slide('Responsive and cross-browser', 'TC-RSP-001…032')
  card(s, 0.6, 1.6, 6.0, 5.2, 'How', [['Pairwise', '10 runs cover all pairs of 5 viewports and the key pages'], ['Overflow scan', 'scrollWidth vs clientWidth at 320, 375, 768 and 1280 px'], ['Breakpoint BVA', 'either side of Bootstrap\'s 768 px boundary'], ['Matrix', `the whole suite in ${BROWSERS.length} browsers${have ? `, ${executions.toLocaleString('en-IN')} executions per run` : ''}`]], { icon: I.mobile, bodySize: 13.5 })
  card(s, 6.9, 1.6, 5.8, 2.5, 'DEF-KS-008: horizontal overflow', '/commands/actions overflows by about 178–201 px on phones and 13 px on a 768 px tablet; storage, misc, aliasing, assertions and traversal overflow too.', { icon: I.bug, iconBg: C.accent4, bodySize: 13 })
  card(s, 6.9, 4.3, 5.8, 2.5, 'Browser differences we met', '"1e2" in a range input (Firefox keeps the string). CDP-only real events skip in Firefox (6 cases, reported as SKIPPED, never hidden).', { icon: I.globe, bodySize: 13 })

  s = slide('Mutation testing: are the tests good enough?', 'M01…M32')
  if (mutants.length) {
    s.addChart(pres.ChartType.doughnut, [{ name: 'Mutants', labels: ['Killed', 'Survived', 'Equivalent'], values: [mKilled, mSurv, mEq] }], { x: 0.6, y: 1.6, w: 4.4, h: 4.2, holeSize: 62, chartColors: [HEX.accent1, HEX.accent4, HEX.accent6], showLegend: true, legendPos: 'b', legendFontSize: 12, legendFontFace: '+mn-lt', showValue: true, showPercent: false, dataLabelColor: 'FFFFFF', dataLabelFontSize: 13, dataLabelFontFace: '+mn-lt' })
    txt(s, pct(mScore), { x: 0.6, y: 5.9, w: 4.4, h: 0.6, fontSize: 30, bold: true, color: C.accent1, align: 'center', objectName: A() })
    txt(s, 'mutation score (equivalent excluded)', { x: 0.6, y: 6.45, w: 4.4, h: 0.35, fontSize: 12, color: C.text2, align: 'center', objectName: A() })
  }
  const ops = {}; mutants.forEach((m) => { ops[m.op] = (ops[m.op] || 0) + 1 })
  table(s, ['Operator', 'Mutants'], Object.entries(ops).sort((a, b) => b[1] - a[1]).slice(0, 9).map(([k, v]) => [k, v]), { x: 5.3, y: 1.6, w: 3.6, colW: [2.8, 0.8], fontSize: 12, rowH: 0.42 })
  const m0 = HIST.mutation && HIST.mutation[0]
  card(s, 9.2, 1.6, 3.5, 5.2, 'Survivors → stronger tests', m0 ? `First run: ${m0.killed} killed, ${m0.survived} survived (${m0.survivors}).\n\nBoth tests were rewritten: the footer test now checks the rendered display, and the disabled-control tests no longer swallow failures with cy.on('fail').` : '', { icon: I.flask, bodySize: 12 })

  s = slide('White-box: code coverage of the app')
  if (coverage) {
    const t = coverage.total
    s.addChart(pres.ChartType.bar, [{ name: 'Coverage %', labels: ['Lines', 'Statements', 'Functions', 'Branches'], values: [t.lines.pct, t.statements.pct, t.functions.pct, t.branches.pct] }], { x: 0.6, y: 1.6, w: 6.6, h: 5.2, barDir: 'col', chartColors: [HEX.accent1], showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: HEX.dk1, valAxisMaxVal: 100, valAxisMinVal: 0, showLegend: false, ...chartBase, showTitle: true, title: 'Istanbul coverage of app/assets/js (vendor excluded)', titleFontSize: 13, titleColor: HEX.dk1 })
    card(s, 7.5, 1.6, 5.2, 5.2, 'Reading the numbers', [['Lines', `${t.lines.covered} of ${t.lines.total} executed by the suite`], ['Branches', `${t.branches.covered} of ${t.branches.total}; the rest are defensive paths the UI cannot reach`], ['Functions', `${t.functions.covered} of ${t.functions.total}`], ['Use', 'coverage shows which branches no black-box case reached: a check on the design itself']], { icon: I.code, bodySize: 13 })
  }

  // ============ 07 RESULTS & FINDINGS =================================================================
  sec('Results and findings', `Real CI evidence, triage and ${defects.length} defects`, ['Results per browser', 'From 43 failures to 0', 'Triage categories', 'Defect log', 'Major defects', 'Case studies'])
  s = slide('Latest results per browser', have ? `${executions} runs` : null)
  if (have) {
    const bs = BROWSERS.filter((b) => results[b])
    s.addChart(pres.ChartType.bar, [['pass', 'Pass'], ['knownDefect', 'Known defect reproduced'], ['fail', 'Fail'], ['skipped', 'Skipped (CDP-only in Firefox)']].map(([k, l]) => ({ name: l, labels: bs.map((b) => b[0].toUpperCase() + b.slice(1)), values: bs.map((b) => results[b].summary[k] || 0) })),
      { x: 0.6, y: 1.6, w: 8.0, h: 5.2, barDir: 'bar', barGrouping: 'stacked', chartColors: [HEX.accent1, HEX.accent3, HEX.accent4, HEX.accent6], showLegend: true, legendPos: 'b', legendFontSize: 11, showValue: true, dataLabelPosition: 'ctr', dataLabelColor: 'FFFFFF', valAxisMinVal: 0, ...chartBase })
    table(s, ['Browser', 'Pass', 'KD', 'Fail', 'Skip', 'Time'], bs.map((b) => { const m = results[b].summary; return [b, m.pass, m.knownDefect, m.fail, m.skipped, `${Math.round(m.durationSec / 6) / 10} min`] }), { x: 8.9, y: 1.6, w: 3.8, colW: [1.05, 0.6, 0.5, 0.5, 0.5, 0.65], fontSize: 11.5, rowH: 0.45 })
    txt(s, 'KD = known defect reproduced: the test passed because the defect is still there, exactly as intended.', { x: 8.9, y: 4.3, w: 3.8, h: 1.2, fontSize: 12, italic: true, color: C.text2, objectName: A() })
  }

  s = slide('From 43 failures to zero: the triage story')
  const hr = HIST.runs.map((r) => ({ label: r.label, fail: r.browsers.chrome.fail, kd: r.browsers.chrome.knownDefect }))
  s.addChart(pres.ChartType.bar, [{ name: 'Failing cases (Chrome)', labels: hr.map((r) => r.label), values: hr.map((r) => r.fail) }, { name: 'Known defects reproduced', labels: hr.map((r) => r.label), values: hr.map((r) => r.kd) }],
    { x: 0.6, y: 1.6, w: 6.4, h: 5.2, barDir: 'col', barGrouping: 'clustered', chartColors: [HEX.accent4, HEX.accent3], showLegend: true, legendPos: 'b', legendFontSize: 11, showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: HEX.dk1, ...chartBase })
  HIST.triage.forEach((t, i) => card(s, 7.3, 1.6 + i * 1.75, 5.4, 1.6, `${t.count} · ${t.category}`, t.examples, { headSize: 13.5, bodySize: 11.5, fill: ['FDECEA', 'EEF2F7', 'FFF8EA'][i] }))

  s = slide('Defect log', `DEF-KS-001…${String(defects.length).padStart(3, '0')}`)
  const sevCol = { Major: HEX.accent4, Minor: HEX.accent3, Trivial: HEX.accent6 }
  table(s, ['ID', 'Defect', 'Severity', 'Found by', 'Pinned by'], defects.map((d) => [d.id, d.title, { text: d.severity, options: { bold: true, color: sevCol[d.severity] || HEX.dk1 } }, d.technique.replace(/ \(.*\)/, ''), d.test.split(' ')[0]]), { colW: [1.35, 5.6, 1.05, 2.4, 1.7], fontSize: 10.5, rowH: 0.34 })

  s = slide('The Major defects')
  defects.filter((d) => d.severity === 'Major').slice(0, 4).forEach((d, i) => card(s, 0.6 + (i % 2) * 6.1, 1.6 + Math.floor(i / 2) * 2.65, 5.95, 2.45, `${d.id}  ${d.title}`, `${d.actual}\nFix: ${d.fix}`, { icon: I.bug, iconBg: C.accent4, headSize: 13, bodySize: 11.5 }))

  s = slide('Case study: the todo item that toggled its neighbour', 'DEF-KS-009')
  ;[['Symptom', 'In CI, TC-TD-132 found 2 stored items where 3 were expected. Chasing it showed the two demo items share one id.'], ['Root cause', 'store.js sets id = new Date().getTime(). Items created in the same millisecond collide.'], ['Impact', 'Ticking "Walk the dog" marks "Pay electric bill" done instead, and the wrong state is saved.'], ['Proof', 'TC-TD-136 freezes Date with cy.clock, so the collision reproduces deterministically in every run.']]
    .forEach(([h, b], i) => card(s, 0.6 + (i % 2) * 6.1, 1.6 + Math.floor(i / 2) * 2.65, 5.95, 2.45, h, b, { headSize: 17, bodySize: 13.5 }))

  s = slide('Case study: the Enter key that erases input', 'DEF-KS-002')
  ;[['Symptom', 'A draft test typing "fake@email.com{enter}" failed for no visible reason: the page had reloaded.'], ['Root cause', 'One text field inside a <form> with no submit handler. HTML "implicit submission" sends GET /commands/actions?'], ['Impact', 'Whatever the user typed is lost.'], ['Response', 'Known-defect test TC-FC-032 plus a one-line fix: preventDefault in a submit handler.']]
    .forEach(([h, b], i) => card(s, 0.6 + (i % 2) * 6.1, 1.6 + Math.floor(i / 2) * 2.65, 5.95, 2.45, h, b, { headSize: 17, bodySize: 13.5 }))

  s = slide('Defects by severity and by how they were found')
  const sev = {}; defects.forEach((d) => { sev[d.severity] = (sev[d.severity] || 0) + 1 })
  s.addChart(pres.ChartType.doughnut, [{ name: 'Defects', labels: Object.keys(sev), values: Object.values(sev) }], { x: 0.6, y: 1.6, w: 5.2, h: 5.2, holeSize: 60, chartColors: Object.keys(sev).map((k) => sevCol[k] || HEX.accent6), showLegend: true, legendPos: 'b', legendFontSize: 12, legendFontFace: '+mn-lt', showValue: true, showPercent: false, dataLabelColor: 'FFFFFF', dataLabelFontSize: 14, dataLabelFontFace: '+mn-lt' })
  const how = {}; defects.forEach((d) => { const k = /WCAG|axe/.test(d.technique) ? 'WCAG checklist' : /OWASP/.test(d.technique) ? 'OWASP checklist' : /Error guessing/.test(d.technique) ? 'Error guessing' : /Fault/.test(d.technique) ? 'Fault injection' : /BVA/.test(d.technique) ? 'BVA' : /State/.test(d.technique) ? 'State transition' : /Link/.test(d.technique) ? 'Link checking' : 'Other'; how[k] = (how[k] || 0) + 1 })
  const howE = Object.entries(how).sort((a, b) => b[1] - a[1])
  hbar(s, howE.map((x) => x[0]), howE.map((x) => x[1]), { x: 6.2, w: 6.5, color: HEX.accent2, name: 'Defects', title: 'Technique that found each defect' })

  // ============ 08 CLOSE ===========================================================================
  sec('Close', 'What this project shows', ['Lessons learned', 'Future work', 'Live demo plan'])
  s = slide('Lessons learned')
  const tri = HIST.triage
  ;[['Name the oracle', 'HTML vs RFC email rules: the wrong standard invents defects.'], ['Negative paths find bugs', 'Every defect came from boundary, error-guessing, fault or checklist cases. None came from the happy path.'], ['Triage before you log', `Of ${tri.reduce((a, t) => a + t.count, 0)} first-run failures, ${tri[1].count + tri[2].count} were test or tool issues, not product defects.`], ['Test the tests', 'Mutation testing exposed two weak tests that coverage alone would never show.'], ['Defects as tests', 'Green CI without hiding anything; every fix becomes a regression test.'], ['Generate the report', 'Numbers flow from CI evidence into every document, so nothing drifts.']]
    .forEach(([h, b], i) => card(s, 0.6 + (i % 3) * 4.08, 1.6 + Math.floor(i / 3) * 2.65, 3.9, 2.45, h, b, { icon: I.check, headSize: 15, bodySize: 13 }))

  s = slide('Future work')
  ;[[I.rocket, 'Component testing', 'Mount the todo View in Cypress component tests for faster feedback'], [I.globe, 'WebKit coverage', 'Run the suite in WebKit through Cypress\' experimental support'], [I.eye, 'Manual a11y review', 'Screen-reader walkthroughs to complement axe-core'], [I.sync, 'Upstream fixes', 'Offer patches for DEF-KS-009, 011 and 002 to the Kitchen Sink repository']]
    .forEach(([ic, h, b], i) => card(s, 0.6 + (i % 2) * 6.1, 1.6 + Math.floor(i / 2) * 2.65, 5.95, 2.45, h, b, { icon: ic, headSize: 17, bodySize: 14 }))

  s = slide('Live demo plan')
  table(s, ['Step', 'Command', 'What the audience sees'], [
    ['1', 'npm start', 'Kitchen Sink on localhost:8080'], ['2', 'npx cypress open', 'Spec list in 19 numbered areas'],
    ['3', 'Run 03-form-controls/range-bva', 'BVA cases; time-travel to a boundary'], ['4', 'Run 02-navigation/navbar', 'Every menu entry opened in order'],
    ['5', 'Run 05-assertions/assertions', 'Retry-ability visible in the command log'], ['6', 'Run 04-ui-interactions/click', 'Dots appearing on the canvas at 9 positions'],
    ['7', 'Run 07-todo-app/todo-persistence', 'TC-TD-136 reproducing DEF-KS-009'], ['8', 'Open the mochawesome report', 'TC IDs, techniques, known defects'],
  ], { colW: [0.8, 5.0, 6.3], fontSize: 13, rowH: 0.56 })

  s = pres.addSlide({ masterName: 'TITLE', sectionTitle: section }); g = 0
  s.addText('Thank you', { placeholder: 'title' })
  txt(s, 'Questions?', { x: 0.8, y: 3.85, w: 10, h: 0.6, fontSize: 22, color: MUTE_ON_DARK, objectName: A() })
  txt(s, TEAM.members.map((m) => `${m.name} (${m.reg})`).join('   ·   '), { x: 0.8, y: 5.3, w: 11.8, h: 0.4, fontSize: 13, bold: true, color: 'FFFFFF', objectName: A() })
  txt(s, `${TEAM.team} · github.com/RaktimChandra/cypress-kitchen-sink-testing · Faculty: ${TEAM.faculty}`, { x: 0.8, y: 5.8, w: 11.8, h: 0.4, fontSize: 12, color: MUTE_ON_DARK, objectName: A() })

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  await pres.writeFile({ fileName: OUT })
  await applyTheme(OUT, THEME)
  console.log('deck ->', OUT)
}
main().catch((e) => { console.error(e); process.exit(1) })
