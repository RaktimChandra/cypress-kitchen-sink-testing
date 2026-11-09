const fs = require('fs')
const path = require('path')

/** Append one record to a JSON array file (created on first use). */
function appendJson (file, record) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []
  list.push({ ...record, at: new Date().toISOString() })
  fs.writeFileSync(file, JSON.stringify(list, null, 1))
}

module.exports = { appendJson }
