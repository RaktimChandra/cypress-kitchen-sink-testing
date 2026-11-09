import { tc } from '../../support/tc'

describe('03 · Form controls — editable regions and other forms', { tags: ['@forms'] }, () => {
  tc({ id: 'TC-FC-170', title: 'Double-click turns the label into a focused input', technique: 'State transition', req: 'REQ-UI-04', priority: 'P1',
    expected: 'div hidden, input visible and focused with value "Double click to edit"' }, () => {
    cy.visitPage('/commands/actions')
    cy.get('.action-input-hidden').should('not.be.visible')
    cy.get('.action-div').dblclick().should('not.be.visible')
    cy.get('.action-input-hidden').should('be.visible').and('have.focus').and('have.value', 'Double click to edit')
  })

  tc({ id: 'TC-FC-171', title: 'Edited value can be typed after double-click', technique: 'Use-case', req: 'REQ-UI-04',
    expected: 'value replaced with "edited"' }, () => {
    cy.visitPage('/commands/actions')
    cy.get('.action-div').dblclick()
    cy.get('.action-input-hidden').clear().type('edited').should('have.value', 'edited')
  })

  tc({ id: 'TC-FC-172', title: 'Single click does NOT open the editor (only dblclick)', technique: 'ECP (invalid)', req: 'REQ-UI-04',
    expected: 'input stays hidden after one click' }, () => {
    cy.visitPage('/commands/actions')
    cy.get('.action-div').click()
    cy.get('.action-input-hidden').should('not.be.visible')
  })

  tc({ id: 'TC-FC-173', title: 'Right-click turns the label into a focused input', technique: 'State transition', req: 'REQ-UI-05', priority: 'P1',
    expected: 'input visible, focused, value "Right click to edit"' }, () => {
    cy.visitPage('/commands/actions')
    cy.get('.rightclick-action-div').rightclick().should('not.be.visible')
    cy.get('.rightclick-action-input-hidden').should('be.visible').and('have.focus').and('have.value', 'Right click to edit')
  })

  tc({ id: 'TC-FC-174', title: 'Left click on the right-click region does nothing', technique: 'ECP (invalid)', req: 'REQ-UI-05',
    expected: 'input stays hidden' }, () => {
    cy.visitPage('/commands/actions')
    cy.get('.rightclick-action-div').click()
    cy.get('.rightclick-action-input-hidden').should('not.be.visible')
  })

  tc({ id: 'TC-FC-175', title: 'Querying page: .within() scopes typing to the query form', technique: 'Use-case', req: 'REQ-FC-13',
    expected: 'email/password typed inside .query-form only' }, () => {
    cy.visitPage('/commands/querying')
    cy.get('.query-form').within(() => {
      cy.get('input:first').should('have.attr', 'placeholder', 'Email').type('within@test.com')
      cy.get('input:last').should('have.attr', 'placeholder', 'Password').type('pass')
    })
    cy.get('#inputEmail').should('have.value', 'within@test.com')
    cy.get('#inputPassword').should('have.value', 'pass')
  })

  tc({ id: 'TC-FC-176', title: 'Misc page: name and description fields accept input and report focus', technique: 'Use-case', req: 'REQ-FC-13',
    expected: 'focused element follows clicks' }, () => {
    cy.visitPage('/commands/misc')
    cy.get('.misc-form #name').click()
    cy.focused().should('have.id', 'name')
    cy.get('.misc-form #description').type('Some description')
    cy.focused().should('have.id', 'description').and('have.value', 'Some description')
  })

  ;[1, 2, 3].forEach((n) => {
    tc({ id: `TC-FC-${String(176 + n).padStart(3, '0')}`, title: `Waiting page: input ${n} accepts text`, technique: 'ECP', req: 'REQ-FC-13',
      expected: `wait-input${n} value "Wait ${n}"` }, () => {
      cy.visitPage('/commands/waiting')
      cy.get(`.wait-input${n}`).type(`Wait ${n}`).should('have.value', `Wait ${n}`)
    })
  })

  tc.chromium({ id: 'TC-FC-180', title: 'Tab order through the Actions forms follows visual order', technique: 'Use-case', req: 'REQ-NFR-A11Y',
    type: 'Accessibility', expected: 'email → password (skipping disabled textarea)' }, () => {
    cy.visitPage('/commands/actions')
    cy.get('.action-email').focus()
    cy.realPress('Tab')
    cy.focused().should('not.have.class', 'action-disabled')
    cy.get('.action-focus').focus()
    cy.realPress('Tab')
    cy.focused().should('have.class', 'action-blur')
  })

  tc.chromium({ id: 'TC-FC-181', title: 'Real keyboard typing (CDP) matches simulated typing', technique: 'Use-case', req: 'REQ-FC-01',
    expected: 'value "real@keys.io"' }, () => {
    cy.visitPage('/commands/actions')
    cy.get('.action-email').realClick()
    cy.realType('real@keys.io')
    cy.get('.action-email').should('have.value', 'real@keys.io')
  })
})
