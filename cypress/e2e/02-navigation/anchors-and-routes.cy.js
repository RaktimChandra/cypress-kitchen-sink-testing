import { tc } from '../../support/tc'
const pages = require('../../fixtures/pages.json')

describe('02 · Navigation — deep links and hash routes', { tags: ['@navigation'] }, () => {
  // one deep-link test per documented section anchor on the Actions page (equivalence class per command)
  const actions = pages.find((p) => p.path === '/commands/actions')
  actions.anchors.forEach((a, i) => {
    tc({ id: `TC-NAV-${String(60 + i).padStart(3, '0')}`, title: `Deep link /commands/actions#${a} scrolls its section into view`, technique: 'ECP',
      req: 'REQ-NAV-05', expected: `heading #${a} exists and is within the viewport` }, () => {
      cy.visitPage(`/commands/actions#${a}`)
      cy.hash().should('eq', `#${a}`)
      cy.get(`h4#${a}`).should('be.visible').then(($h) => {
        const top = $h[0].getBoundingClientRect().top
        expect(top, 'heading near top of viewport').to.be.within(-5, Cypress.config('viewportHeight'))
      })
    })
  })

  tc({ id: 'TC-NAV-080', title: 'Every documented section heading on every page has a working "on.cypress.io" docs link', technique: 'ECP',
    req: 'REQ-NAV-05', expected: 'each h4[id] section links to https://on.cypress.io (in the heading, or in the first paragraph for chai helpers such as expect/assert)' }, () => {
    pages.filter((p) => p.anchors && p.anchors.length).forEach((p) => {
      cy.visitPage(p.path)
      p.anchors.forEach((a) => {
        cy.get(`h4[id="${a}"]`).then(($h) => {
          const $link = $h.find('a').length ? $h.find('a') : $h.nextAll('p').first().find('a')
          expect($link.attr('href'), `docs link for #${a}`).to.match(/^https:\/\/on\.cypress\.io\//)
        })
      })
    })
  })

  ;[['#/', 'All', 3], ['#/active', 'Active', 2], ['#/completed', 'Completed', 1]].forEach(([hash, label, count], i) => {
    tc({ id: `TC-NAV-${String(81 + i).padStart(3, '0')}`, title: `Todo route ${hash} selects "${label}" and shows ${count} item(s)`, technique: 'ECP',
      req: 'REQ-NAV-07', priority: 'P1', expected: `filter "${label}" has class selected; ${count} items listed` }, () => {
      cy.visitPage('/todo', { onBeforeLoad (w) {
        w.localStorage.setItem('todos-vanillajs', JSON.stringify([
          { id: 1, title: 'one', completed: false }, { id: 2, title: 'two', completed: true }, { id: 3, title: 'three', completed: false }]))
      } })
      cy.visitPage(`/todo${hash}`)
      cy.get('.filters a.selected').should('have.text', label)
      cy.get('.todo-list li').should('have.length', count)
    })
  })

  tc({ id: 'TC-NAV-084', title: 'Clicking filters updates the hash and the back button restores the previous filter', technique: 'State transition',
    req: 'REQ-NAV-07', expected: 'All → Active → Completed; back → Active' }, () => {
    cy.visitPage('/todo')
    cy.contains('.filters a', 'Active').click()
    cy.hash().should('eq', '#/active')
    cy.contains('.filters a', 'Completed').click()
    cy.hash().should('eq', '#/completed')
    cy.go('back')
    cy.hash().should('eq', '#/active')
    cy.get('.filters a.selected').should('have.text', 'Active')
  })

  tc.knownDefect({ id: 'TC-NAV-085', title: 'Unknown todo route falls back to showing all items', technique: 'ECP (invalid)', req: 'REQ-NAV-07',
    defect: 'DEF-KS-001', priority: 'P2',
    expected: '#/unknown shows the 2 seed items and raises no error (actual: uncaught "this[activeRoute] is not a function", empty list)' }, () => {
    cy.visit('/todo#/unknown')
    cy.get('.todo-list li').should('have.length', 2)
  })
})
