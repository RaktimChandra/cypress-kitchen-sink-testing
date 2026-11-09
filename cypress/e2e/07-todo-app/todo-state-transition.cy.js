import { tc } from '../../support/tc'

/**
 * State-transition model of ONE todo item.
 *   States : S0 not-created · S1 Active · S2 Completed · S3 Editing(from Active) · S4 Editing(from Completed) · S5 Deleted
 *   Events : add · toggle · dblclick · enter/blur(non-empty) · enter(empty) · esc · destroy · clear-completed
 * 0-switch coverage: every valid transition once; plus invalid events that must not change state.
 */
const visit = (completed = false) => cy.visitTodos([{ title: 'item', completed }])
const li = () => cy.get('.todo-list li').first()

const transitions = [
  ['T1', 'S0 —add→ S1', () => { cy.visitTodos([]); cy.addTodo('item') }, () => li().should('not.have.class', 'completed')],
  ['T2', 'S1 —toggle→ S2', () => { visit(false); li().find('.toggle').check() }, () => li().should('have.class', 'completed')],
  ['T3', 'S2 —toggle→ S1', () => { visit(true); li().find('.toggle').uncheck() }, () => li().should('not.have.class', 'completed')],
  ['T4', 'S1 —dblclick→ S3', () => { visit(false); li().find('label').dblclick() }, () => li().should('have.class', 'editing').and('not.have.class', 'completed')],
  ['T5', 'S2 —dblclick→ S4', () => { visit(true); li().find('label').dblclick() }, () => li().should('have.class', 'editing')],
  ['T6', 'S3 —enter(non-empty)→ S1', () => { visit(false); li().find('label').dblclick(); li().find('.edit').type(' 2{enter}') }, () => li().should('not.have.class', 'editing').find('label').should('have.text', 'item 2')],
  ['T7', 'S4 —enter(non-empty)→ S2 (completion kept)', () => { visit(true); li().find('label').dblclick(); li().find('.edit').type(' 2{enter}') }, () => li().should('have.class', 'completed').find('label').should('have.text', 'item 2')],
  ['T8', 'S3 —esc→ S1 (unchanged)', () => { visit(false); li().find('label').dblclick(); li().find('.edit').type('zzz{esc}') }, () => li().should('not.have.class', 'editing').find('label').should('have.text', 'item')],
  ['T9', 'S3 —enter(empty)→ S5', () => { visit(false); li().find('label').dblclick(); li().find('.edit').clear().type('{enter}') }, () => cy.get('.todo-list li').should('have.length', 0)],
  ['T10', 'S1 —destroy→ S5', () => { visit(false); li().find('.destroy').invoke('show').click() }, () => cy.get('.todo-list li').should('have.length', 0)],
  ['T11', 'S2 —destroy→ S5', () => { visit(true); li().find('.destroy').invoke('show').click() }, () => cy.get('.todo-list li').should('have.length', 0)],
  ['T12', 'S2 —clear-completed→ S5', () => { visit(true); cy.get('.clear-completed').click() }, () => cy.get('.todo-list li').should('have.length', 0)],
]

describe('07 · TodoMVC — state transitions of a todo item', { tags: ['@todo', '@state-transition'] }, () => {
  transitions.forEach(([t, label, act, check], i) => {
    tc({ id: `TC-TD-${String(100 + i).padStart(3, '0')}`, title: `${t}: ${label}`, technique: 'State transition', req: 'REQ-TD-03',
      priority: ['T1', 'T2', 'T3', 'T10'].includes(t) ? 'P1' : 'P2', expected: label.split('→').pop().trim() }, () => {
      act()
      check()
    })
  })

  // invalid / null transitions: event does not apply in that state → state unchanged
  tc({ id: 'TC-TD-115', title: 'Invalid: clear-completed while S1 (active) leaves the item', technique: 'State transition (invalid)', req: 'REQ-TD-06',
    expected: 'item still present (button not even visible)' }, () => {
    visit(false)
    cy.get('.clear-completed').should('not.be.visible')
    cy.get('.clear-completed').click({ force: true })
    cy.get('.todo-list li').should('have.length', 1)
  })

  tc({ id: 'TC-TD-116', title: 'Invalid: single click on a label does not enter edit mode', technique: 'State transition (invalid)', req: 'REQ-TD-04',
    expected: 'no editing class' }, () => {
    visit(false)
    li().find('label').click()
    li().should('not.have.class', 'editing')
  })

  tc({ id: 'TC-TD-117', title: '1-switch sequence: add → complete → edit → save → un-complete → delete', technique: 'State transition (1-switch)', req: 'REQ-TD-03',
    expected: 'S0→S1→S2→S4→S2→S1→S5, storage empty at the end' }, () => {
    cy.visitTodos([])
    cy.addTodo('journey')
    li().find('.toggle').check()
    li().find('label').dblclick()
    li().find('.edit').clear().type('journey v2{enter}')
    li().should('have.class', 'completed').find('label').should('have.text', 'journey v2')
    li().find('.toggle').uncheck()
    li().should('not.have.class', 'completed')
    li().find('.destroy').invoke('show').click()
    cy.storedTodos().should('have.length', 0)
  })
})
