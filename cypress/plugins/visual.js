const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')
const pixelmatch = require('pixelmatch')

/**
 * Visual regression: compares a fresh screenshot with the committed baseline for the
 * same browser. A missing baseline is created (status "baseline-created") so the first
 * run on a new browser establishes it; later runs fail when the changed-pixel ratio
 * exceeds the threshold.
 */
function compareSnapshot ({ name, actualPath, root, browser, threshold = 0.002 }) {
  const baseDir = path.join(root, 'cypress', 'snapshots', 'baseline', browser || 'unknown')
  const diffDir = path.join(root, 'reports', 'visual', 'diff', browser || 'unknown')
  fs.mkdirSync(baseDir, { recursive: true })
  fs.mkdirSync(diffDir, { recursive: true })
  const basePath = path.join(baseDir, `${name}.png`)
  if (!fs.existsSync(actualPath)) return { status: 'missing-actual', ratio: 1 }
  if (!fs.existsSync(basePath) || process.env.UPDATE_SNAPSHOTS === '1') {
    fs.copyFileSync(actualPath, basePath)
    return { status: 'baseline-created', ratio: 0 }
  }
  const a = PNG.sync.read(fs.readFileSync(basePath))
  const b = PNG.sync.read(fs.readFileSync(actualPath))
  if (a.width !== b.width || a.height !== b.height) {
    return { status: 'size-mismatch', ratio: 1, baseline: `${a.width}x${a.height}`, actual: `${b.width}x${b.height}` }
  }
  const diff = new PNG({ width: a.width, height: a.height })
  const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 })
  const ratio = changed / (a.width * a.height)
  if (changed > 0) fs.writeFileSync(path.join(diffDir, `${name}.png`), PNG.sync.write(diff))
  return { status: ratio <= threshold ? 'match' : 'mismatch', ratio, changed }
}

module.exports = { compareSnapshot }
