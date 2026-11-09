import { tc } from '../../support/tc'
const pages = require('../../fixtures/pages.json')
const commands = pages.filter((p) => p.group === 'commands')

describe('02 · Navigation — navbar menu', { tags: ['@navigation'] }, () => {
  beforeEach(() => cy.visitPage('/'))

  tc({ id: 'TC-NAV-001', title: 'Commands dropdown lists all 17 command pages in documented order', technique: 'ECP', req: 'REQ-NAV-01', priority: 'P1',
    expected: '17 menu entries in the order Querying … Spies, Stubs & Clocks' }, () => {
    cy.contains('.navbar .dropdown-toggle', 'Commands').click()
    cy.get('.dropdown-menu').should('be.visible')
    cy.get('.dropdown-menu li a').should('have.length', 17)
      .then(($a) => [...$a].map((a) => a.textContent.trim()))
      .should('deep.equal', commands.map((c) => c.menu))
  })

  tc({ id: 'TC-NAV-002', title: 'Dropdown closes when clicking outside it', technique: 'State transition', req: 'REQ-NAV-01',
    expected: 'menu open → click on body → menu hidden' }, () => {
    cy.contains('.dropdown-toggle', 'Commands').click()
    cy.get('.dropdown-menu').should('be.visible')
    cy.get('.banner').click()
    cy.get('.dropdown-menu').should('not.be.visible')
  })

  commands.forEach((c, i) => {
    tc({ id: `TC-NAV-${String(10 + i).padStart(3, '0')}`, title: `Menu → "${c.menu}" opens ${c.path}`, technique: 'ECP',
      req: 'REQ-NAV-01', priority: 'P1', expected: `URL path ${c.path}, banner "${c.banner}"` }, () => {
      cy.contains('.dropdown-toggle', 'Commands').click()
      cy.get('.dropdown-menu').contains('a', c.menu).click()
      cy.location('pathname').should('eq', c.path)
      cy.get('.banner h1').should('contain.text', c.banner)
    })
  })

  ;[['Utilities', '/utilities', 'Utilities'], ['Cypress API', '/cypress-api', 'Cypress API']].forEach(([label, path, banner], i) => {
    tc({ id: `TC-NAV-${String(30 + i).padStart(3, '0')}`, title: `Top-level link "${label}" opens ${path}`, technique: 'ECP', req: 'REQ-NAV-02',
      priority: 'P1', expected: `URL path ${path}` }, () => {
      cy.get('.navbar-nav > li > a').contains(label).click()
      cy.location('pathname').should('eq', path)
      cy.get('.banner h1').should('contain.text', banner)
    })
  })

  tc({ id: 'TC-NAV-032', title: 'Brand "cypress.io" returns to the home page from a deep page', technique: 'Use-case', req: 'REQ-NAV-02',
    expected: 'URL path /' }, () => {
    cy.visitPage('/commands/traversal')
    cy.get('.navbar-brand').should('have.text', 'cypress.io').click()
    cy.location('pathname').should('eq', '/')
  })

  tc({ id: 'TC-NAV-033', title: 'GitHub link points at the upstream repository (not followed — external)', technique: 'Error guessing',
    req: 'REQ-NAV-02', expected: 'href = https://github.com/cypress-io/cypress-example-kitchensink' }, () => {
    cy.contains('.navbar a', 'GitHub').should('have.attr', 'href', 'https://github.com/cypress-io/cypress-example-kitchensink')
  })

  tc({ id: 'TC-NAV-034', title: 'Home page lists every command page as a link that resolves', technique: 'ECP', req: 'REQ-NAV-01', priority: 'P1',
    expected: 'each /commands/* link on the home page returns HTTP 200' }, () => {
    cy.get('#commands a[href^="/commands/"]').should('have.length.at.least', 17).each(($a) => {
      cy.request($a.attr('href')).its('status').should('eq', 200)
    })
  })
})
