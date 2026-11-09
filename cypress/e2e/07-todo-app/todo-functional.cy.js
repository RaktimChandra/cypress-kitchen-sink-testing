import { tc } from '../../support/tc'

describe('07 · TodoMVC — functional behaviour', { tags: ['@todo'] }, () => {
  tc({ id: 'TC-TD-001', title: 'First visit seeds two example todos', technique: 'Use-case', req: 'REQ-TD-08', priority: 'P1',
    expected: '"Pay electric bill", "Walk the dog"; "2 items left"' }, () => {
    cy.visitPage('/todo')
    cy.get('.todo-list li label').then(($l) => [...$l].map((l) => l.textContent)).should('deep.equal', ['Pay electric bill', 'Walk the dog'])
    cy.get('.todo-count').should('have.text', '2 items left')
  })

  tc({ id: 'TC-TD-002', title: 'Add a todo with Enter', technique: 'Use-case', req: 'REQ-TD-01', priority: 'P1',
    expected: 'new item last in list; input cleared; counter 3' }, () => {
    cy.visitPage('/todo')
    cy.addTodo('Write Cypress tests')
    cy.get('.todo-list li').should('have.length', 3).last().should('have.text', 'Write Cypress tests')
    cy.get('.new-todo').should('have.value', '')
    cy.get('.todo-count').should('have.text', '3 items left')
  })

  tc({ id: 'TC-TD-003', title: 'New-todo input has autofocus on load', technique: 'Use-case', req: 'REQ-TD-01',
    expected: 'focused element is .new-todo' }, () => {
    cy.visitPage('/todo')
    cy.get('.new-todo').should('have.attr', 'autofocus')
    cy.document().its('activeElement').should('have.class', 'new-todo')
  })

  tc({ id: 'TC-TD-004', title: 'Items keep insertion order', technique: 'Use-case', req: 'REQ-TD-01',
    expected: 'A, B, C in that order' }, () => {
    cy.visitTodos([])
    ;['A', 'B', 'C'].forEach((t) => cy.addTodo(t))
    cy.get('.todo-list li label').then(($l) => [...$l].map((l) => l.textContent)).should('deep.equal', ['A', 'B', 'C'])
  })

  tc({ id: 'TC-TD-005', title: 'Toggle marks an item completed (class + checkbox)', technique: 'State transition', req: 'REQ-TD-03', priority: 'P1',
    expected: 'li.completed, checkbox checked, counter decremented' }, () => {
    cy.visitTodos(['a', 'b'])
    cy.get('.todo-list li').first().find('.toggle').check()
    cy.get('.todo-list li').first().should('have.class', 'completed').find('.toggle').should('be.checked')
    cy.get('.todo-count').should('have.text', '1 item left')
  })

  tc({ id: 'TC-TD-006', title: 'Un-toggle returns the item to active', technique: 'State transition', req: 'REQ-TD-03',
    expected: 'class completed removed; counter back to 2' }, () => {
    cy.visitTodos([{ title: 'a', completed: true }, 'b'])
    cy.get('.todo-list li').first().find('.toggle').uncheck()
    cy.get('.todo-list li').first().should('not.have.class', 'completed')
    cy.get('.todo-count').should('have.text', '2 items left')
  })

  tc({ id: 'TC-TD-007', title: '"Mark all as complete" completes every item', technique: 'Use-case', req: 'REQ-TD-03', priority: 'P1',
    expected: 'all li.completed; counter 0; toggle-all checked' }, () => {
    cy.visitTodos(['a', 'b', 'c'])
    cy.get('label[for=toggle-all]').click()
    cy.get('.todo-list li').each(($li) => expect($li).to.have.class('completed'))
    cy.get('.todo-count').should('have.text', '0 items left')
    cy.get('#toggle-all').should('be.checked')
  })

  tc({ id: 'TC-TD-008', title: 'Toggle-all again re-activates every item', technique: 'State transition', req: 'REQ-TD-03',
    expected: 'no completed items; counter 3' }, () => {
    cy.visitTodos([{ title: 'a', completed: true }, { title: 'b', completed: true }, { title: 'c', completed: true }])
    cy.get('#toggle-all').should('be.checked')
    cy.get('label[for=toggle-all]').click()
    cy.get('.todo-list li.completed').should('have.length', 0)
    cy.get('.todo-count').should('have.text', '3 items left')
  })

  tc({ id: 'TC-TD-009', title: 'Delete an item with its × button', technique: 'Use-case', req: 'REQ-TD-05', priority: 'P1',
    expected: 'item removed from list and storage' }, () => {
    cy.visitTodos(['keep', 'remove me'])
    cy.contains('.todo-list li', 'remove me').find('.destroy').invoke('show').click()
    cy.get('.todo-list li').should('have.length', 1).and('contain', 'keep')
    cy.storedTodos().should((t) => expect(t.map((x) => x.title)).to.deep.equal(['keep']))
  })

  tc.chromium({ id: 'TC-TD-010', title: 'Delete button appears only on hover (real mouse hover)', technique: 'Use-case', req: 'REQ-TD-05',
    expected: '× hidden before hover, visible while hovering' }, () => {
    cy.visitTodos(['hover me'])
    cy.get('.todo-list li .destroy').should('not.be.visible')
    cy.get('.todo-list li').realHover()
    cy.get('.todo-list li .destroy').should('be.visible').click()
    cy.get('.todo-list li').should('have.length', 0)
  })

  tc({ id: 'TC-TD-011', title: 'Clear completed removes only completed items', technique: 'Use-case', req: 'REQ-TD-06', priority: 'P1',
    expected: 'remaining: b, d' }, () => {
    cy.visitTodos([{ title: 'a', completed: true }, 'b', { title: 'c', completed: true }, 'd'])
    cy.get('.clear-completed').should('be.visible').and('have.text', 'Clear completed').click()
    cy.get('.todo-list li label').then(($l) => [...$l].map((l) => l.textContent)).should('deep.equal', ['b', 'd'])
    cy.get('.clear-completed').should('not.be.visible')
  })

  ;[['All', '#/', ['a', 'b', 'c']], ['Active', '#/active', ['b']], ['Completed', '#/completed', ['a', 'c']]].forEach(([label, hash, shown], i) => {
    tc({ id: `TC-TD-${String(12 + i).padStart(3, '0')}`, title: `Filter "${label}" shows ${shown.join(', ')}`, technique: 'ECP', req: 'REQ-TD-07', priority: 'P1',
      expected: `visible items ${shown.join(', ')}; hash ${hash}` }, () => {
      cy.visitTodos([{ title: 'a', completed: true }, 'b', { title: 'c', completed: true }])
      cy.contains('.filters a', label).click()
      cy.hash().should('eq', hash)
      cy.get('.todo-list li label').then(($l) => [...$l].map((l) => l.textContent)).should('deep.equal', shown)
    })
  })

  tc({ id: 'TC-TD-015', title: 'Completing an item while on "Active" removes it from the view', technique: 'State transition', req: 'REQ-TD-07',
    expected: 'Active view goes from 2 to 1 item' }, () => {
    cy.visitTodos(['a', 'b'])
    cy.contains('.filters a', 'Active').click()
    cy.get('.todo-list li').first().find('.toggle').check()
    cy.get('.todo-list li').should('have.length', 1).and('contain', 'b')
  })

  tc({ id: 'TC-TD-016', title: 'Adding an item while on "Completed" keeps it out of that view', technique: 'State transition', req: 'REQ-TD-07',
    expected: 'Completed view unchanged; counter increments' }, () => {
    cy.visitTodos([{ title: 'done', completed: true }])
    cy.contains('.filters a', 'Completed').click()
    cy.addTodo('new active')
    cy.get('.todo-list li').should('have.length', 1).and('contain', 'done')
    cy.get('.todo-count').should('have.text', '1 item left')
  })
})
