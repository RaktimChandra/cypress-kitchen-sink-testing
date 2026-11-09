#!/usr/bin/env node
/** Markdown job summary for GitHub Actions from a results-<browser>.json file. */
const fs = require('fs')
const f = process.argv[2]
if (!fs.existsSync(f)) { console.log(`No results file ${f}`); process.exit(0) }
const { summary: s, results } = JSON.parse(fs.readFileSync(f, 'utf8'))
console.log(`### ${s.browser}: ${s.total} test cases — ${s.pass} passed · ${s.knownDefect} known defects reproduced · ${s.skipped} skipped · ${s.fail} failed\n`)
const by = {}
results.forEach((r) => { const k = r.spec ? r.spec.split('/')[2] || r.spec : 'other'; by[k] = by[k] || { n: 0, p: 0, f: 0 }; by[k].n++; if (r.status === 'PASS' || r.status === 'KNOWN DEFECT') by[k].p++; if (r.status === 'FAIL') by[k].f++ })
console.log('| Suite | Cases | Passed | Failed |\n|---|---:|---:|---:|')
Object.entries(by).sort().forEach(([k, v]) => console.log(`| ${k} | ${v.n} | ${v.p} | ${v.f} |`))
const failed = results.filter((r) => r.status === 'FAIL')
if (failed.length) {
  console.log('\n#### Failures\n')
  failed.slice(0, 40).forEach((r) => console.log(`- **${r.id}** ${r.title} — \`${(r.error || '').replace(/`/g, "'")}\``))
}
