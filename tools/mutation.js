#!/usr/bin/env node
/**
 * Mutation testing of the SUT: for every mutant in tools/mutants.js, copy the app,
 * inject the fault, serve it on its own port and run the relevant Cypress specs.
 * A mutant is KILLED when at least one test fails, SURVIVED otherwise.
 *
 *   node tools/mutation.js            all mutants
 *   node tools/mutation.js M19 M25    selected mutants
 *   SHARD=1/4 node tools/mutation.js  CI sharding
 */
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const cypress = require('cypress')
const mutants = require('./mutants')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'reports', 'mutation')
fs.mkdirSync(OUT, { recursive: true })

function copyDir (src, dst) {
  fs.mkdirSync(dst, { recursive: true })
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name)
    const d = path.join(dst, e.name)
    if (e.isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

function build (m) {
  const dir = path.join(ROOT, 'mutants', m.id)
  fs.rmSync(dir, { recursive: true, force: true })
  copyDir(path.join(ROOT, 'app'), dir)
  const f = path.join(dir, m.file)
  const src = fs.readFileSync(f, 'utf8')
  const count = src.split(m.find).length - 1
  if (count !== 1) throw new Error(`${m.id}: pattern must occur exactly once in ${m.file}, found ${count}`)
  fs.writeFileSync(f, src.replace(m.find, m.replace))
  return dir
}

function serve (dir, port) {
  const bin = path.join(ROOT, 'node_modules', '.bin', 'serve')
  const p = spawn(bin, [dir, '--listen', String(port), '--no-request-logging', '--no-clipboard'], { stdio: 'ignore' })
  return new Promise((resolve) => setTimeout(() => resolve(p), 1500))
}

async function run () {
  let list = mutants
  const pick = process.argv.slice(2)
  if (pick.length) list = list.filter((m) => pick.includes(m.id))
  if (process.env.SHARD) {
    const [k, n] = process.env.SHARD.split('/').map(Number)
    list = list.filter((_, i) => i % n === k - 1)
  }
  const results = []
  let port = 8100
  for (const m of list) {
    const t0 = Date.now()
    const dir = build(m)
    const server = await serve(dir, port)
    const spec = m.specs.map((s) => `cypress/e2e/${s}.cy.js`).join(',')
    let res
    try {
      res = await cypress.run({
        spec,
        browser: process.env.MUTATION_BROWSER || 'electron',
        config: { baseUrl: `http://localhost:${port}`, video: false, screenshotOnRunFailure: false, retries: 0 },
        reporter: 'spec',
        quiet: true,
      })
    } finally {
      server.kill()
    }
    const failed = res && res.totalFailed !== undefined ? res.totalFailed : -1
    const killers = []
    if (res && res.runs) {
      res.runs.forEach((r) => r.tests.filter((t) => t.state === 'failed').forEach((t) => killers.push(t.title[t.title.length - 1].split(' | ')[0])))
    }
    const status = failed > 0 ? 'KILLED' : failed === 0 ? (m.equivalent ? 'EQUIVALENT' : 'SURVIVED') : 'ERROR'
    results.push({ ...m, find: undefined, replace: undefined, status, testsRun: res ? res.totalTests : 0, failed, killers: [...new Set(killers)], seconds: Math.round((Date.now() - t0) / 1000) })
    console.log(`${m.id} ${status.padEnd(10)} ${m.desc}  ← ${killers.slice(0, 4).join(', ')}`)
    port++
    fs.rmSync(dir, { recursive: true, force: true })
  }
  const killed = results.filter((r) => r.status === 'KILLED').length
  const equivalent = results.filter((r) => r.status === 'EQUIVALENT').length
  const summary = { total: results.length, killed, survived: results.filter((r) => r.status === 'SURVIVED').length, equivalent,
    errors: results.filter((r) => r.status === 'ERROR').length, score: Math.round(1000 * killed / Math.max(1, results.length - equivalent)) / 10 }
  const name = process.env.SHARD ? `mutation-shard-${process.env.SHARD.replace('/', 'of')}.json` : 'mutation.json'
  fs.writeFileSync(path.join(OUT, name), JSON.stringify({ summary, results }, null, 1))
  console.log(`\nmutation score ${summary.score} %  (${killed} killed / ${summary.total - equivalent} non-equivalent)`)
}

run().catch((e) => { console.error(e); process.exit(1) })
