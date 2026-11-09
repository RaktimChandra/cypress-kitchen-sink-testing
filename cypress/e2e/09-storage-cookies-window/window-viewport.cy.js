import { tc } from '../../support/tc'

describe('09 · Window and document', { tags: ['@window'] }, () => {
  beforeEach(() => cy.visitPage('/commands/window'))

  tc({ id: 'TC-WN-001', title: 'Window exposes the top-level app object (jQuery loaded)', technique: 'Use-case', req: 'REQ-NFR-REL',
    expected: 'window.$ and window.jQuery defined; version 1.12.0' }, () => {
    cy.window().should('have.property', 'top')
    cy.window().its('jQuery.fn.jquery').should('eq', '1.12.0')
  })

  tc({ id: 'TC-WN-002', title: 'Document charset is UTF-8 and language is English', technique: 'Use-case', req: 'REQ-NFR-A11Y',
    expected: 'charset UTF-8; html[lang=en]' }, () => {
    cy.document().should('have.property', 'charset').and('eq', 'UTF-8')
    cy.get('html').should('have.attr', 'lang', 'en')
  })

  tc({ id: 'TC-WN-003', title: 'Title is the product name', technique: 'Use-case', req: 'REQ-NFR-REL', expected: 'title "Cypress.io: Kitchen Sink"' }, () => {
    cy.title().should('include', 'Kitchen Sink')
  })

  tc({ id: 'TC-WN-004', title: 'Viewport meta tag enables responsive layout', technique: 'Use-case', req: 'REQ-UI-09',
    expected: 'meta viewport content "width=device-width, initial-scale=1"' }, () => {
    cy.get('meta[name=viewport]').should('have.attr', 'content', 'width=device-width, initial-scale=1')
  })
})

describe('09 · Viewport page', { tags: ['@window'] }, () => {
  const sizes = [[320, 480], [767, 1024], [768, 1024], [1280, 800], [1920, 1080]]
  sizes.forEach(([w, h], i) => {
    tc({ id: `TC-VP-${String(1 + i).padStart(3, '0')}`, title: `cy.viewport(${w}, ${h}) is applied to the window`, technique: 'BVA', req: 'REQ-UI-09',
      expected: `innerWidth ${w}, innerHeight ${h}` }, () => {
      cy.viewport(w, h)
      cy.visitPage('/commands/viewport')
      cy.window().its('innerWidth').should('eq', w)
      cy.window().its('innerHeight').should('eq', h)
    })
  })

  tc({ id: 'TC-VP-006', title: 'Navbar collapses below 768 px (Bootstrap xs breakpoint)', technique: 'BVA', req: 'REQ-NAV-06', priority: 'P1',
    expected: '767 px: toggle visible, links hidden; 768 px: toggle hidden, links visible' }, () => {
    cy.viewport(767, 900)
    cy.visitPage('/commands/viewport')
    cy.get('.navbar-toggle').should('be.visible')
    cy.get('#navbar').should('not.be.visible')
    cy.viewport(768, 900)
    cy.get('.navbar-toggle').should('not.be.visible')
    cy.get('#navbar').should('be.visible')
  })

  tc({ id: 'TC-VP-007', title: 'Collapsed navbar opens with the hamburger and shows the Commands menu', technique: 'State transition', req: 'REQ-NAV-06', priority: 'P1',
    expected: 'toggle click → #navbar visible → Commands → Actions navigates' }, () => {
    cy.viewport('iphone-6')
    cy.visitPage('/commands/viewport')
    cy.get('.navbar-toggle').click()
    cy.get('#navbar').should('be.visible')
    cy.contains('.dropdown-toggle', 'Commands').click()
    cy.get('.dropdown-menu').contains('Actions').click()
    cy.location('pathname').should('eq', '/commands/actions')
  })

  tc({ id: 'TC-VP-008', title: 'Orientation change (portrait → landscape) via preset', technique: 'ECP', req: 'REQ-UI-09',
    expected: 'ipad-2 portrait 768×1024; landscape 1024×768' }, () => {
    cy.visitPage('/commands/viewport')
    cy.viewport('ipad-2')
    cy.window().its('innerWidth').should('eq', 768)
    cy.viewport('ipad-2', 'landscape')
    cy.window().its('innerWidth').should('eq', 1024)
  })
})
