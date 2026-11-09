#!/usr/bin/env node
/** Copy app/ to instrumented/ with Istanbul counters in the application's own JavaScript (vendor libraries excluded). */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '..')
const out = path.join(ROOT, 'instrumented')
fs.rmSync(out, { recursive: true, force: true })
execFileSync(path.join(ROOT, 'node_modules', '.bin', 'nyc'), [
  'instrument', '--complete-copy', '--exclude', 'assets/js/vendor/**', '--exclude', 'assets/js/**/*.min.js',
  '--source-map', 'false', '.', out,
], { cwd: path.join(ROOT, 'app'), stdio: 'inherit' })
fs.copyFileSync(path.join(ROOT, 'serve.json'), path.join(out, 'serve.json'))
// serve.json at the root points "public" at app/; inside instrumented/ the folder itself is public
const cfg = JSON.parse(fs.readFileSync(path.join(out, 'serve.json'), 'utf8'))
delete cfg.public
fs.writeFileSync(path.join(out, 'serve.json'), JSON.stringify(cfg, null, 2))
console.log('instrumented copy written to', out)
