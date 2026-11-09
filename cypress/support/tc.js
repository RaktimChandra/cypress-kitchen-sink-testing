/**
 * IEEE 829-style test-case metadata for Cypress.
 *
 *   tc({ id: 'TC-FC-BVA-001', title: 'Range at 0 shows 0', technique: 'BVA',
 *        req: 'REQ-FC-07', level: 'System', priority: 'P1', expected: '…' }, () => { … })
 *
 * The test title becomes "TC-FC-BVA-001 | Range at 0 shows 0" so every report line is
 * traceable, and the metadata is written to reports/meta/ after each spec.
 */
// Specs and the support file are separate bundles, so the catalogue lives on the shared window
// rather than in module scope (a module-level array would be a different instance in each bundle).
export const catalogue = (globalThis.__tcCatalogue = globalThis.__tcCatalogue || [])

const DEFAULTS = { level: 'System', priority: 'P2', type: 'Functional', technique: 'Use-case', tags: [] }

function register (meta, fn, itFn = it) {
  const m = { ...DEFAULTS, ...meta }
  if (!m.id || !m.title) throw new Error('tc() needs id and title')
  if (catalogue.some((c) => c.id === m.id)) throw new Error(`Duplicate test-case id ${m.id}`)
  catalogue.push({ ...m, spec: Cypress.spec.relative, tags: m.tags })
  const options = { tags: [`@${m.technique}`, `@${m.type}`, `@${m.priority}`, ...m.tags] }
  if (m.browser) options.browser = m.browser
  return itFn(`${m.id} | ${m.title}`, options, fn)
}

export function tc (meta, fn) { return register(meta, fn) }
/** Browser-specific case, e.g. real-events (CDP) only exist in Chromium browsers. */
tc.chromium = (meta, fn) => register({ ...meta, browser: ['chrome', 'chromium', 'edge', 'electron'] }, fn)

/**
 * Known defect ("expected failure"). The body states the CORRECT requirement. While the
 * defect reproduces, the failure is captured and the test passes as "known defect";
 * the moment the product is fixed the test fails with a message to promote it to a
 * normal test — so a defect can never be silently fixed or silently re-opened.
 */
tc.knownDefect = (meta, fn) => register({ ...meta, knownDefect: meta.defect }, function () {
  let reproduced = false
  cy.on('uncaught:exception', () => { reproduced = true; return false })
  cy.on('fail', (err) => {
    if (err.__defectFixed) throw err
    Cypress.log({ name: 'known defect', message: `${meta.defect} reproduced: ${err.message.split('\n')[0]}` })
    return false
  })
  fn.call(this)
  cy.then(() => {
    if (reproduced) throw new Error(`${meta.defect}: page raised an uncaught exception`)
    const e = new Error(`${meta.defect} no longer reproduces — the product was fixed; convert ${meta.id} to a normal tc()`)
    e.__defectFixed = true
    throw e
  })
})
