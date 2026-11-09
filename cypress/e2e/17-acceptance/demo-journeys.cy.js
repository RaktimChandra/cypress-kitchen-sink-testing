import { tc } from '../../support/tc'

/**
 * Acceptance-level journeys written Given / When / Then. These are the scenarios shown
 * live in the viva: each one exercises form controls, navigation, assertions and UI
 * interactions together, the way a real user would.
 */
describe('17 · Acceptance — demonstration journeys', { tags: ['@acceptance', '@demo'] }, () => {
  tc({ id: 'TC-UAT-001', title: 'Given a visitor on the home page, When they use the menu to reach Actions and fill every form control, Then each control reflects the input',
    technique: 'Scenario', type: 'Acceptance', level: 'Acceptance', req: 'REQ-FC-01..13, REQ-NAV-01', priority: 'P1',
    expected: 'navigation via menu; email, focus/blur, clear, submit, checkbox, radio, select, range all verified' }, () => {
    // Given
    cy.visitPage('/')
    // When — navigation
    cy.contains('.dropdown-toggle', 'Commands').click()
    cy.get('.dropdown-menu').contains('Actions').click()
    cy.location('pathname').should('eq', '/commands/actions')
    // When — text controls
    cy.get('.action-email').type('student@srmist.edu.in').should('have.value', 'student@srmist.edu.in')
    cy.get('.action-focus').focus().should('have.class', 'focus')
    cy.get('.action-blur').type('Raktim Chandra').blur().should('have.class', 'error')
    cy.get('.action-clear').type('temporary').clear().should('have.value', '')
    cy.get('#couponCode1').type('SVV2026')
    cy.get('.action-form').submit().next().should('contain', 'Your form has been submitted!')
    // When — choice controls
    cy.get('.action-multiple-checkboxes [type=checkbox]').check(['checkbox1', 'checkbox3'])
    cy.get('.action-radios [type=radio]').check('radio2').should('be.checked')
    cy.get('.action-select').select('bananas').should('have.value', 'fr-bananas')
    cy.get('.action-select-multiple').select(['apples', 'oranges'])
    cy.get('.trigger-input-range').invoke('val', 75).trigger('change').next('p').should('have.text', '75')
    // Then — summary assertion over the whole form state
    cy.get('.action-multiple-checkboxes :checked').should('have.length', 2)
    cy.get('.action-select-multiple').should(($s) => expect([...$s[0].selectedOptions].map((o) => o.value)).to.deep.equal(['fr-apples', 'fr-oranges']))
  })

  tc({ id: 'TC-UAT-002', title: 'Given the Actions page, When the user clicks, double-clicks, right-clicks and scrolls, Then every interaction gives visible feedback',
    technique: 'Scenario', type: 'Acceptance', level: 'Acceptance', req: 'REQ-UI-01..06', priority: 'P1',
    expected: 'popover, canvas dot, edit fields, scrolled buttons' }, () => {
    cy.visitPage('/commands/actions')
    cy.get('.action-btn').click()
    cy.get('.popover').should('be.visible')
    cy.get('#action-canvas').click('center')
    cy.get('.action-div').dblclick()
    cy.get('.action-input-hidden').should('be.visible')
    cy.get('.rightclick-action-div').rightclick()
    cy.get('.rightclick-action-input-hidden').should('be.visible')
    cy.get('#scroll-both button').scrollIntoView()
    cy.get('#scrollable-both').scrollTo('bottomRight')
  })

  tc({ id: 'TC-UAT-003', title: 'Given an empty todo list, When a user plans their day, Then the list, counter, filters and storage agree',
    technique: 'Scenario', type: 'Acceptance', level: 'Acceptance', req: 'REQ-TD-01..10', priority: 'P1',
    expected: '3 added, 1 edited, 1 completed, filtered, cleared; storage matches' }, () => {
    cy.visitTodos([])
    ;['Revise BVA and ECP', 'Write Cypress specs', 'Prepare viva'].forEach((t) => cy.addTodo(t))
    cy.get('.todo-count').should('have.text', '3 items left')
    cy.contains('.todo-list li', 'Prepare viva').find('label').dblclick()
    cy.get('.todo-list li.editing .edit').clear().type('Prepare viva answers{enter}')
    cy.contains('.todo-list li', 'Revise BVA and ECP').find('.toggle').check()
    cy.contains('.filters a', 'Active').click()
    cy.get('.todo-list li').should('have.length', 2)
    cy.contains('.filters a', 'Completed').click()
    cy.get('.todo-list li').should('have.length', 1).and('contain', 'Revise BVA and ECP')
    cy.contains('.filters a', 'All').click()
    cy.get('.clear-completed').click()
    cy.storedTodos().should((t) => expect(t.map((x) => x.title)).to.deep.equal(['Write Cypress specs', 'Prepare viva answers']))
  })

  tc({ id: 'TC-UAT-004', title: 'Given any page, When the user browses with back/forward and reload, Then they always land on the expected page',
    technique: 'Scenario', type: 'Acceptance', level: 'Acceptance', req: 'REQ-NAV-01..04', priority: 'P1',
    expected: 'five-page tour, history and reload consistent' }, () => {
    const tour = ['/commands/querying', '/commands/traversal', '/commands/assertions', '/utilities']
    cy.visitPage('/')
    tour.forEach((p) => { cy.visitPage(p); cy.location('pathname').should('eq', p) })
    cy.go('back'); cy.location('pathname').should('eq', '/commands/assertions')
    cy.go('back'); cy.location('pathname').should('eq', '/commands/traversal')
    cy.reload(); cy.get('.banner h1').should('contain', 'Traversal')
    cy.go('forward'); cy.location('pathname').should('eq', '/commands/assertions')
  })

  tc({ id: 'TC-UAT-005', title: 'Given a comments API, When the user triggers GET/POST/PUT, Then the page reports each outcome (API stubbed)',
    technique: 'Scenario', type: 'Acceptance', level: 'Acceptance', req: 'REQ-NW-01..03',
    expected: 'comment text, "POST successful!", 404 message' }, () => {
    cy.intercept('GET', '**/comments/1', { body: { body: 'Hello from the stub' } }).as('get')
    cy.intercept('POST', '**/comments', { statusCode: 201, body: {} }).as('post')
    cy.intercept('PUT', '**/comments/1', { statusCode: 404, body: { error: 'Not Found' } }).as('put')
    cy.visitPage('/commands/network-requests')
    cy.get('.network-btn').click(); cy.wait('@get')
    cy.get('.network-post').click(); cy.wait('@post')
    cy.get('.network-put').click(); cy.wait('@put')
    cy.get('.network-comment').should('have.text', 'Hello from the stub')
    cy.get('.network-post-comment').should('have.text', 'POST successful!')
    cy.get('.network-put-comment').should('have.text', 'Not Found')
  })
})
