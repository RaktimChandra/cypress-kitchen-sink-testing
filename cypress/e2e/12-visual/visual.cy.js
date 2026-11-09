import { tc } from '../../support/tc'

/**
 * Visual regression. Baselines live in cypress/snapshots/baseline/<browser>/ and are
 * committed; a diff image is written to reports/visual/diff/ when pixels change.
 * Dynamic content (random number, clocks) is frozen or excluded before capture.
 */
const shots = [
  ['home-banner', '/', '.banner'],
  ['navbar', '/commands/actions', 'nav.navbar'],
  ['actions-type-form', '/commands/actions', '#type ~ * .well, .action-email', true],
  ['assertions-table', '/commands/assertions', '.assertion-table'],
  ['traversal-table', '/commands/traversal', '.traversal-table'],
  ['todo-app', '/todo', '.todoapp'],
]

describe('12 · Visual regression', { tags: ['@visual'] }, () => {
  shots.forEach(([name, path, sel, parentWell], i) => {
    tc({ id: `TC-VIS-${String(1 + i).padStart(3, '0')}`, title: `${name} matches its baseline`, technique: 'Visual comparison', type: 'Visual',
      req: 'REQ-NFR-VIS', expected: '≤ 0.2 % of pixels changed vs committed baseline (first run creates the baseline)' }, () => {
      cy.clock(Date.UTC(2026, 0, 1), ['Date'])
      cy.visitPage(path)
      cy.document().then((d) => { d.body.style.caretColor = 'transparent' })
      const el = parentWell ? cy.get('.action-email').closest('.well') : cy.get(sel).first()
      el.should('be.visible').matchSnapshot(name)
    })
  })

  ;[['mobile', 375, 667], ['tablet', 768, 1024]].forEach(([dev, w, h], i) => {
    tc({ id: `TC-VIS-${String(10 + i).padStart(3, '0')}`, title: `Home page above the fold on ${dev} (${w}×${h}) matches its baseline`, technique: 'Visual comparison',
      type: 'Visual', req: 'REQ-NFR-VIS', expected: '≤ 0.2 % changed' }, () => {
      cy.viewport(w, h)
      cy.visitPage('/')
      cy.matchSnapshot(`home-${dev}`)
    })
  })

  tc({ id: 'TC-VIS-012', title: 'Detector check: a deliberate CSS change IS reported as a visual difference', technique: 'Fault injection', type: 'Visual',
    req: 'REQ-NFR-VIS', expected: 'after recolouring the banner the comparison status is "mismatch" (proves the check can fail)' }, () => {
    cy.visitPage('/')
    cy.get('.banner').first().matchSnapshot('detector-banner')
    cy.get('.banner').first().invoke('attr', 'style', 'background:#ff00ff !important')
    let shot
    cy.get('.banner').first().screenshot('visual/detector-banner-mutated', { overwrite: true, onAfterScreenshot (_e, p) { shot = p.path } }).then(() => {
      cy.task('compareSnapshot', { name: 'detector-banner', actualPath: shot }).its('status').should('eq', 'mismatch')
    })
  })
})
