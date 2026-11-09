import { tc } from '../../support/tc'

/**
 * Decision table for the footer controls.
 * Conditions: C1 list non-empty · C2 at least one completed · C3 all completed
 * Actions:    A1 footer visible · A2 "Clear completed" visible · A3 toggle-all checked
 *
 *   Rule      R1   R2   R3   R4
 *   C1        N    Y    Y    Y
 *   C2        –    N    Y    Y
 *   C3        –    N    N    Y
 *   A1        N    Y    Y    Y
 *   A2        N    N    Y    Y
 *   A3        –    N    N    Y
 * (C2=N & C3=Y is impossible for a non-empty list and is excluded. For R1 the toggle-all control is
 *  hidden together with .main, so its checked state is not observable: A3 = don't care.)
 */
const rules = [
  ['R1', [], false, false, null],
  ['R2', ['a', 'b'], true, false, false],
  ['R3', [{ title: 'a', completed: true }, 'b'], true, true, false],
  ['R4', [{ title: 'a', completed: true }, { title: 'b', completed: true }], true, true, true],
]

describe('07 · TodoMVC — decision table: footer controls', { tags: ['@todo', '@decision-table'] }, () => {
  rules.forEach(([rule, list, footer, clear, all], i) => {
    tc({ id: `TC-TD-${String(70 + i).padStart(3, '0')}`, title: `Rule ${rule}: footer ${footer ? 'shown' : 'hidden'}, clear ${clear ? 'shown' : 'hidden'}, toggle-all ${all === null ? 'hidden' : all ? 'on' : 'off'}`,
      technique: 'Decision table', req: 'REQ-TD-06', priority: 'P1', data: JSON.stringify(list),
      expected: `A1=${footer ? 'Y' : 'N'} A2=${clear ? 'Y' : 'N'} A3=${all === null ? '– (hidden)' : all ? 'Y' : 'N'}` }, () => {
      cy.visitTodos(list)
      cy.get('.footer').should(footer ? 'be.visible' : 'not.be.visible')
      // check the rendered display too: an empty but displayed button is invisible yet still wrong (mutant M27)
      if (footer) cy.get('.clear-completed').should(clear ? 'be.visible' : 'not.be.visible').and('have.css', 'display', clear ? 'block' : 'none')
      if (all === null) cy.get('.main').should('not.be.visible')
      else cy.get('#toggle-all').should(all ? 'be.checked' : 'not.be.checked')
    })
  })

  // the same table driven dynamically: transitions between rules caused by user actions
  tc({ id: 'TC-TD-074', title: 'Rules are re-evaluated after each action (R2 → R3 → R4 → R2)', technique: 'Decision table', req: 'REQ-TD-06',
    expected: 'clear button and toggle-all follow the table after every toggle' }, () => {
    cy.visitTodos(['a', 'b'])
    cy.get('.clear-completed').should('not.be.visible')
    cy.get('.todo-list li').eq(0).find('.toggle').check()
    cy.get('.clear-completed').should('be.visible')
    cy.get('#toggle-all').should('not.be.checked')
    cy.get('.todo-list li').eq(1).find('.toggle').check()
    cy.get('#toggle-all').should('be.checked')
    cy.get('.clear-completed').click()
    cy.get('.footer').should('not.be.visible')
  })
})
