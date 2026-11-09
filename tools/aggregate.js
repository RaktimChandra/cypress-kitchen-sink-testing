#!/usr/bin/env node
/**
 * Merge mochawesome JSON (one file per spec) with the test-case catalogue written by
 * tc() into a single evidence file: reports/results-<browser>.json
 *
 *   node tools/aggregate.js --browser chrome [--dir reports]
 */
const fs = require('fs')
const path = require('path')

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d }
const dir = path.resolve(arg('dir', 'reports'))
const browser = arg('browser', 'electron')
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))

const meta = {}
const metaDir = path.join(dir, 'meta')
if (fs.existsSync(metaDir)) {
  for (const f of fs.readdirSync(metaDir)) for (const c of read(path.join(metaDir, f))) meta[c.id] = c
}

const tests = []
function walk (suite, file) {
  for (const t of suite.tests || []) tests.push({ ...t, file: file || suite.file })
  for (const s of suite.suites || []) walk(s, file || suite.file)
}
const mDir = path.join(dir, 'mochawesome')
let runInfo = null
if (fs.existsSync(mDir)) {
  for (const f of fs.readdirSync(mDir).filter((x) => x.endsWith('.json'))) {
    const j = read(path.join(mDir, f))
    runInfo = runInfo || j.stats
    for (const r of j.results || []) walk(r, r.file)
  }
}

const rows = []
const seen = new Set()
for (const t of tests) {
  const id = (t.title.match(/^(TC-[A-Z0-9]+-\d+)/) || [])[1]
  if (!id) continue
  if (seen.has(id)) continue // a retried test appears once with its final state
  seen.add(id)
  const m = meta[id] || {}
  let status = t.state === 'passed' ? 'PASS' : t.state === 'failed' ? 'FAIL' : 'SKIPPED'
  if (status === 'PASS' && m.knownDefect) status = 'KNOWN DEFECT'
  rows.push({
    id, title: t.title.replace(/^TC-[A-Z0-9]+-\d+ \| /, ''), browser, status, durationMs: t.duration || 0,
    spec: m.spec || t.file, technique: m.technique, type: m.type, level: m.level, priority: m.priority,
    req: m.req, expected: m.expected, data: m.data, defect: m.knownDefect || null,
    error: t.err && t.err.message ? t.err.message.split('\n')[0].slice(0, 300) : null,
  })
}
// catalogued cases that never ran (e.g. filtered by browser) are reported as SKIPPED, never silently dropped
for (const [id, m] of Object.entries(meta)) {
  if (!seen.has(id)) rows.push({ id, title: m.title, browser, status: 'SKIPPED', durationMs: 0, spec: m.spec, technique: m.technique, type: m.type, level: m.level, priority: m.priority, req: m.req, expected: m.expected, data: m.data, defect: m.knownDefect || null, error: 'not executed in this browser' })
}
rows.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
const count = (s) => rows.filter((r) => r.status === s).length
const summary = { browser, total: rows.length, pass: count('PASS'), fail: count('FAIL'), knownDefect: count('KNOWN DEFECT'), skipped: count('SKIPPED'),
  durationSec: Math.round(rows.reduce((s, r) => s + r.durationMs, 0) / 1000), generatedAt: new Date().toISOString() }
const out = path.join(dir, `results-${browser}.json`)
fs.writeFileSync(out, JSON.stringify({ summary, results: rows }, null, 1))
console.log(JSON.stringify(summary))
if (process.argv.includes('--strict') && summary.fail > 0) process.exit(1)
