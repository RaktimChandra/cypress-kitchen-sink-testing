#!/usr/bin/env node
/**
 * Static test-case catalogue: loads every spec with stubbed Mocha/Cypress globals and
 * records each tc() call WITHOUT running a browser. Used to validate IDs (unique,
 * well-formed) and to count cases per area/technique before a run.
 *   node tools/catalogue.js [--out reports/catalogue.json]
 */
const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')

const ROOT = path.resolve(__dirname, '..')
const specs = []
;(function walk (d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.cy.js')) specs.push(p) } })(path.join(ROOT, 'cypress', 'e2e'))
specs.sort()

const cases = []
const ids = new Set()
for (const spec of specs) {
  const rel = path.relative(ROOT, spec)
  const register = (meta, extra = {}) => {
    const m = { level: 'System', priority: 'P2', type: 'Functional', technique: 'Use-case', ...meta, ...extra, spec: rel }
    if (!/^TC-[A-Z0-9]+-\d{3}$/.test(m.id)) throw new Error(`${rel}: malformed id ${m.id}`)
    if (ids.has(m.id)) throw new Error(`${rel}: duplicate id ${m.id}`)
    ids.add(m.id)
    cases.push(m)
  }
  const tc = (m) => register(m)
  tc.chromium = (m) => register(m, { browser: 'chromium-only' })
  tc.knownDefect = (m) => register(m, { knownDefect: m.defect })
  const noop = () => {}
  const describe = (name, opts, fn) => (typeof opts === 'function' ? opts : fn)()
  const src = fs.readFileSync(spec, 'utf8').replace(/^import .*$/mg, '')
  const req = createRequire(spec)
  const sandboxChai = { Assertion: { addMethod: noop } }
  new Function('describe', 'it', 'before', 'beforeEach', 'after', 'afterEach', 'tc', 'require', 'chai', 'cy', 'Cypress', src)(
    describe, noop, noop, noop, noop, noop, tc, req, sandboxChai, {}, { expose: () => undefined })
}
const by = (k) => cases.reduce((a, c) => { a[c[k]] = (a[c[k]] || 0) + 1; return a }, {})
const area = cases.reduce((a, c) => { const k = c.id.split('-')[1]; a[k] = (a[k] || 0) + 1; return a }, {})
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : path.join(ROOT, 'reports', 'catalogue.json')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify({ total: cases.length, specs: specs.length, byArea: area, byTechnique: by('technique'), byType: by('type'), byPriority: by('priority'), cases }, null, 1))
console.log(`${cases.length} test cases in ${specs.length} specs`)
console.log('by area', area)
console.log('known defects', cases.filter((c) => c.knownDefect).map((c) => `${c.id}:${c.knownDefect}`).join(' '))
