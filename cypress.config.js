const { defineConfig } = require('cypress')
const fs = require('fs')
const path = require('path')
const { compareSnapshot } = require('./cypress/plugins/visual')
const { appendJson } = require('./cypress/plugins/evidence')

module.exports = defineConfig({
  projectId: null,
  reporter: 'cypress-multi-reporters',
  reporterOptions: { configFile: 'reporter-config.json' },
  video: true,
  videoCompression: 32,
  screenshotOnRunFailure: true,
  trashAssetsBeforeRuns: true,
  viewportWidth: 1280,
  viewportHeight: 800,
  defaultCommandTimeout: 6000,
  retries: { runMode: 1, openMode: 0 },
  e2e: {
    baseUrl: 'http://localhost:8080',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents (on, config) {
      require('@cypress/grep/plugin').plugin(config)
      if (config.expose && config.expose.coverage) {
        require('@cypress/code-coverage/task')(on, config)
      }
      const reports = path.join(config.projectRoot, 'reports')
      // config.browser is not populated inside setupNodeEvents, so learn the browser from the run itself
      let browserName = (config.browser && config.browser.name) || 'unknown'
      on('before:run', (details) => { if (details && details.browser) browserName = details.browser.name })
      on('before:browser:launch', (browser, launchOptions) => { browserName = browser.name; return launchOptions })
      on('task', {
        log (msg) { console.log(msg); return null },
        // test-case catalogue: IEEE 829 metadata written by every spec
        tcMeta ({ spec, cases }) {
          const dir = path.join(reports, 'meta')
          fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(path.join(dir, `${spec.replace(/[\\/]/g, '__')}.json`), JSON.stringify(cases, null, 1))
          return null
        },
        // evidence collectors (accessibility findings, performance timings, security findings)
        evidence ({ kind, record }) {
          appendJson(path.join(reports, 'evidence', `${kind}-${browserName}.json`), record)
          return null
        },
        compareSnapshot: (args) => compareSnapshot({ ...args, root: config.projectRoot, browser: browserName }),
        readFileMaybe (p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null },
      })
      // flaky-test detection: record every test that needed a retry
      on('after:spec', (spec, results) => {
        if (!results || !results.tests) return
        const flaky = results.tests.filter((t) => t.attempts && t.attempts.length > 1 && t.state === 'passed')
        flaky.forEach((t) => appendJson(path.join(reports, 'evidence', `flaky-${browserName}.json`),
          { spec: spec.relative, title: t.title.join(' › '), attempts: t.attempts.length }))
      })
      return config
    },
  },
})
