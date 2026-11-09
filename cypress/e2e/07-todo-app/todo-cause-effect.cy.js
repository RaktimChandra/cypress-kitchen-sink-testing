import { tc } from '../../support/tc'

/**
 * Cause-effect graph for finishing an edit (double-click a label to edit).
 * Causes:  C1 Enter pressed · C2 focus leaves the field (blur) · C3 Escape pressed
 *          C4 new title is non-empty after trimming
 * Effects: E1 title updated (trimmed) · E2 item deleted · E3 original title restored
 * Graph:   E1 = (C1 ∨ C2) ∧ C4 ∧ ¬C3      E2 = (C1 ∨ C2) ∧ ¬C4 ∧ ¬C3      E3 = C3
 * Converted to a limited-entry decision table, one test per feasible column.
 */
const columns = [
  ['K1', 'Enter + non-empty', '{enter}', 'renamed', 'E1', 'renamed'],
  ['K2', 'Enter + spaces padded', '{enter}', '  trimmed  ', 'E1', 'trimmed'],
  ['K3', 'Enter + empty', '{enter}', '', 'E2', null],
  ['K4', 'Enter + whitespace only', '{enter}', '    ', 'E2', null],
  ['K5', 'Blur + non-empty', 'blur', 'blurred', 'E1', 'blurred'],
  ['K6', 'Blur + empty', 'blur', '', 'E2', null],
  ['K7', 'Escape + non-empty', '{esc}', 'discarded', 'E3', 'original'],
  ['K8', 'Escape + empty', '{esc}', '', 'E3', 'original'],
]

describe('07 · TodoMVC — cause-effect graph: finishing an edit', { tags: ['@todo', '@cause-effect'] }, () => {
  columns.forEach(([col, desc, how, text, effect, result], i) => {
    tc({ id: `TC-TD-${String(80 + i).padStart(3, '0')}`, title: `${col} ${desc} → ${effect}`, technique: 'Cause-effect graph', req: 'REQ-TD-04',
      priority: ['K1', 'K3', 'K7'].includes(col) ? 'P1' : 'P2', data: JSON.stringify({ how, text }),
      expected: effect === 'E2' ? 'item deleted' : `title "${result}", editing class removed` }, () => {
      cy.visitTodos(['original', 'other'])
      cy.get('.todo-list li').first().find('label').dblclick()
      cy.get('.todo-list li').first().should('have.class', 'editing')
      cy.get('.todo-list li.editing .edit').should('have.focus').and('have.value', 'original').clear()
      if (text) cy.get('.todo-list li.editing .edit').type(text)
      if (how === 'blur') cy.get('.todo-list li.editing .edit').blur()
      else cy.get('.todo-list li.editing .edit').type(how)
      if (effect === 'E2') {
        cy.get('.todo-list li').should('have.length', 1).and('contain', 'other')
      } else {
        cy.get('.todo-list li').should('have.length', 2).first().should('not.have.class', 'editing').find('label').should('have.text', result)
        cy.storedTodos().its('0.title').should('eq', result)
      }
    })
  })

  tc({ id: 'TC-TD-090', title: 'Only one item is in edit mode at a time', technique: 'Error guessing', req: 'REQ-TD-04',
    expected: 'editing a second item ends the first edit' }, () => {
    cy.visitTodos(['a', 'b'])
    cy.get('.todo-list li').eq(0).find('label').dblclick()
    cy.get('.todo-list li').eq(1).find('label').dblclick()
    cy.get('.todo-list li.editing').should('have.length', 1)
  })

  tc({ id: 'TC-TD-091', title: 'While editing, the toggle and × controls are hidden', technique: 'Use-case', req: 'REQ-TD-04',
    expected: '.view hidden inside li.editing' }, () => {
    cy.visitTodos(['a'])
    cy.get('.todo-list li label').dblclick()
    cy.get('.todo-list li.editing .view').should('not.be.visible')
  })
})
