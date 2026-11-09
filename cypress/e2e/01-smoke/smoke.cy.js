import { tc } from '../../support/tc'
const pages = require('../../fixtures/pages.json')

/**
 * Build-verification (smoke) suite: every page of the Kitchen Sink loads, shows its
 * heading and raises no console or uncaught errors. Run first; if it fails the
 * rest of the campaign is suspended (see docs/TEST_PLAN.md, suspension criteria).
 */
describe('01 · Smoke — every page is up', { tags: ['@smoke'] }, () => {
  pages.forEach((p, i) => {
    const n = String(i + 1).padStart(3, '0')
    tc({
      id: `TC-SMK-${n}`, title: `${p.path} loads with its heading and no errors`,
      technique: 'Smoke', type: 'Smoke', level: 'System', priority: 'P1', req: 'REQ-NFR-REL',
      expected: `HTTP 200, document title "Cypress.io: Kitchen Sink", ${p.banner ? `banner "${p.banner}"` : 'todo app rendered'}, no console/page errors`,
    }, () => {
      cy.visitPage(p.path)
      cy.title().should('eq', 'Cypress.io: Kitchen Sink')
      if (p.banner) {
        cy.get('.banner h1').should('be.visible').and('contain.text', p.banner.replace('&', '&'))
      } else {
        cy.get('.todoapp h1').should('have.text', 'todos')
      }
      cy.get('nav.navbar').should('be.visible')
      cy.assertNoPageErrors()
    })
  })
})
