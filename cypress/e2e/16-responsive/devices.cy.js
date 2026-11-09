import { tc } from '../../support/tc'

const devices = [
  ['iphone-se2', 375, 667], ['iphone-x', 375, 812], ['samsung-s10', 360, 760], ['ipad-mini', 768, 1024],
  ['ipad-2', 768, 1024], ['macbook-13', 1280, 800], ['macbook-16', 1536, 960], ['custom 320 (smallest)', 320, 568],
  ['custom 1920 (full HD)', 1920, 1080], ['custom 2560 (QHD)', 2560, 1440],
]
const keyPages = ['/', '/commands/navigation', '/todo']

describe('16 · Responsive / compatibility — devices', { tags: ['@responsive'] }, () => {
  devices.forEach(([name, w, h], i) => {
    tc({ id: `TC-RSP-${String(1 + i).padStart(3, '0')}`, title: `${name} (${w}×${h}): no horizontal overflow and correct navbar mode`, technique: 'Pairwise (device × page)',
      type: 'Compatibility', req: 'REQ-UI-09', priority: w < 768 ? 'P1' : 'P2',
      expected: `document width ≤ viewport on ${keyPages.join(', ')}; hamburger ${w < 768 ? 'shown' : 'hidden'}` }, () => {
      cy.viewport(w, h)
      keyPages.forEach((p) => {
        cy.visitPage(p)
        cy.document().then((d) => {
          const overflow = d.documentElement.scrollWidth - d.documentElement.clientWidth
          cy.task('evidence', { kind: 'responsive', record: { device: name, page: p, overflow } }, { log: false })
          expect(overflow, `horizontal overflow on ${p} (px)`).to.be.at.most(1)
        })
        cy.get('.navbar-toggle').should(w < 768 ? 'be.visible' : 'not.be.visible')
      })
    })
  })

  // site-wide scan at the three common breakpoints — the Kitchen Sink overflows on several command pages
  ;[[375, 667, 'phone'], [768, 1024, 'tablet'], [1280, 800, 'laptop']].forEach(([w, h, cls], i) => {
    const meta = { id: `TC-RSP-${String(30 + i).padStart(3, '0')}`, title: `All 21 pages fit a ${cls} viewport (${w} px) without horizontal scrolling`,
      technique: 'BVA (breakpoints)', type: 'Compatibility', req: 'REQ-UI-09', priority: 'P2' }
    const body = () => {
      const pages = require('../../fixtures/pages.json')
      const offenders = []
      cy.viewport(w, h)
      pages.forEach((p) => {
        cy.visitPage(p.path)
        cy.document().then((d) => {
          const o = d.documentElement.scrollWidth - d.documentElement.clientWidth
          if (o > 1) offenders.push(`${p.path} +${o}px`)
        })
      })
      cy.then(() => {
        cy.task('evidence', { kind: 'responsive', record: { scan: `${w}px`, offenders } })
        expect(offenders, `pages wider than ${w}px`).to.deep.equal([])
      })
    }
    if (w < 1280) tc.knownDefect({ ...meta, defect: 'DEF-KS-008', expected: `no page wider than the viewport (actual: e.g. /commands/actions overflows by ~180 px at 375 px)` }, body)
    else tc({ ...meta, expected: 'no page wider than the viewport' }, body)
  })

  tc({ id: 'TC-RSP-020', title: 'Todo app stays usable on the smallest phone', technique: 'Use-case', type: 'Compatibility', req: 'REQ-UI-09',
    expected: 'add/complete works at 320 px' }, () => {
    cy.viewport(320, 568)
    cy.visitTodos([])
    cy.addTodo('mobile')
    cy.get('.todo-list li .toggle').check()
    cy.get('.todo-count').should('have.text', '0 items left')
  })

  tc({ id: 'TC-RSP-021', title: 'Browser identity is recorded for the compatibility matrix', technique: 'Use-case', type: 'Compatibility', req: 'REQ-NFR-COMPAT',
    expected: 'Cypress.browser name/version/family logged to evidence' }, () => {
    cy.visitPage('/')
    cy.task('evidence', { kind: 'browsers', record: { name: Cypress.browser.name, version: Cypress.browser.version, family: Cypress.browser.family, isHeadless: Cypress.browser.isHeadless } })
    expect(Cypress.browser.name).to.be.a('string')
  })
})
