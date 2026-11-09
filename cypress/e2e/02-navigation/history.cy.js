import { tc } from '../../support/tc'

describe('02 · Navigation — history, reload, location', { tags: ['@navigation'] }, () => {
  tc({ id: 'TC-NAV-040', title: 'Back and forward move through visited pages (cy.go)', technique: 'State transition', req: 'REQ-NAV-03', priority: 'P1',
    expected: 'home → navigation → back = home → forward = navigation' }, () => {
    cy.visitPage('/')
    cy.contains('.dropdown-toggle', 'Commands').click()
    cy.get('.dropdown-menu').contains('Navigation').click()
    cy.location('pathname').should('eq', '/commands/navigation')
    cy.go('back')
    cy.location('pathname').should('eq', '/')
    cy.go('forward')
    cy.location('pathname').should('eq', '/commands/navigation')
    cy.go(-1)
    cy.location('pathname').should('eq', '/')
    cy.go(1)
    cy.location('pathname').should('eq', '/commands/navigation')
  })

  tc({ id: 'TC-NAV-041', title: 'Reload resets un-submitted form input (no state kept in page)', technique: 'State transition', req: 'REQ-NAV-03',
    expected: 'typed text gone after reload' }, () => {
    cy.visitPage('/commands/actions')
    cy.get('.action-email').type('fake@email.com').should('have.value', 'fake@email.com')
    cy.reload()
    cy.get('.action-email').should('have.value', '')
  })

  tc({ id: 'TC-NAV-042', title: 'Hard reload (forceReload) re-fetches the document', technique: 'Use-case', req: 'REQ-NAV-03',
    expected: 'page reloads, marker property set on old window is gone' }, () => {
    cy.visitPage('/commands/navigation')
    cy.window().then((w) => { w.__marker = 1 })
    cy.reload(true)
    cy.window().its('__marker').should('be.undefined')
  })

  tc({ id: 'TC-NAV-043', title: 'cy.location exposes every URL component of the page', technique: 'Use-case', req: 'REQ-NAV-04',
    expected: 'protocol http:, hostname localhost, port 8080, pathname /commands/location, hash and search empty' }, () => {
    cy.visitPage('/commands/location')
    cy.location().should((loc) => {
      expect(loc.protocol).to.eq('http:')
      expect(loc.hostname).to.eq('localhost')
      expect(loc.port).to.eq('8080')
      expect(loc.pathname).to.eq('/commands/location')
      expect(loc.hash).to.eq('')
      expect(loc.search).to.eq('')
      expect(loc.origin).to.eq('http://localhost:8080')
    })
  })

  tc({ id: 'TC-NAV-044', title: 'Query string and hash are preserved on visit', technique: 'ECP', req: 'REQ-NAV-04',
    expected: 'search "?q=cypress&page=2", hash "#hash"' }, () => {
    cy.visitPage('/commands/location?q=cypress&page=2#hash')
    cy.location('search').should('eq', '?q=cypress&page=2')
    cy.hash().should('eq', '#hash')
    cy.url().should('eq', 'http://localhost:8080/commands/location?q=cypress&page=2#hash')
  })

  tc({ id: 'TC-NAV-045', title: '.html URLs redirect to the clean URL (301)', technique: 'Error guessing', req: 'REQ-NAV-04',
    expected: 'request /commands/actions.html → 301 → /commands/actions' }, () => {
    cy.request({ url: '/commands/actions.html', followRedirect: false }).then((r) => {
      expect(r.status).to.eq(301)
      expect(r.redirectedToUrl).to.match(/\/commands\/actions$/)
    })
    cy.visitPage('/commands/actions.html')
    cy.location('pathname').should('eq', '/commands/actions')
  })

  tc({ id: 'TC-NAV-046', title: 'Unknown URL is answered with 404, not the home page', technique: 'ECP (invalid)', req: 'REQ-NAV-04', priority: 'P1',
    expected: 'GET /does-not-exist → 404; visiting with failOnStatusCode:false shows no banner' }, () => {
    cy.request({ url: '/does-not-exist', failOnStatusCode: false }).its('status').should('eq', 404)
    cy.visit('/does-not-exist', { failOnStatusCode: false })
    cy.get('.banner').should('not.exist')
  })

  tc({ id: 'TC-NAV-047', title: 'visit() onBeforeLoad / onLoad callbacks fire in order', technique: 'Use-case', req: 'REQ-NAV-03',
    expected: 'onBeforeLoad called before onLoad, both once' }, () => {
    const order = []
    cy.visit('/commands/navigation', {
      onBeforeLoad () { order.push('before') },
      onLoad () { order.push('load') },
    }).then(() => expect(order).to.deep.equal(['before', 'load']))
  })

  tc({ id: 'TC-NAV-048', title: 'History length grows by one per navigation', technique: 'BVA', req: 'REQ-NAV-03',
    expected: 'length after 2 more navigations = initial + 2' }, () => {
    cy.visitPage('/')
    cy.window().its('history.length').then((start) => {
      cy.get('.navbar-nav > li > a').contains('Utilities').click()
      cy.get('.navbar-nav > li > a').contains('Cypress API').click()
      cy.window().its('history.length').should('eq', start + 2)
    })
  })
})
