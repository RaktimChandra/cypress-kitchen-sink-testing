import { tc } from '../../support/tc'

describe('07 · TodoMVC — persistence in localStorage', { tags: ['@todo'] }, () => {
  tc({ id: 'TC-TD-130', title: 'Added items survive a reload', technique: 'Use-case', req: 'REQ-TD-08', priority: 'P1',
    expected: 'after reload the list still has the new item' }, () => {
    cy.visitPage('/todo')
    cy.addTodo('persist me')
    cy.reload()
    cy.get('.todo-list li').should('have.length', 3).last().should('contain', 'persist me')
  })

  tc({ id: 'TC-TD-131', title: 'Completed state survives a reload', technique: 'Use-case', req: 'REQ-TD-08',
    expected: 'first item still completed' }, () => {
    cy.visitPage('/todo')
    cy.get('.todo-list li').first().find('.toggle').check()
    cy.reload()
    cy.get('.todo-list li').first().should('have.class', 'completed')
  })

  tc({ id: 'TC-TD-132', title: 'Storage record schema: {title, completed, id}', technique: 'Use-case', req: 'REQ-TD-08',
    expected: 'every record has a string title, boolean completed, numeric id; ids unique' }, () => {
    cy.visitTodos(['first', 'second'])
    cy.addTodo('schema check')
    cy.storedTodos().should((list) => {
      expect(list).to.have.length(3)
      list.forEach((t) => {
        expect(t).to.have.all.keys('title', 'completed', 'id')
        expect(t.title).to.be.a('string')
        expect(t.completed).to.be.a('boolean')
        expect(t.id).to.be.a('number')
      })
      expect(new Set(list.map((t) => t.id)).size).to.eq(3)
    })
  })

  tc.knownDefect({ id: 'TC-TD-133', title: 'Deleting all items keeps an empty list (seed items are not re-added)', technique: 'BVA', req: 'REQ-TD-08',
    defect: 'DEF-KS-004', expected: 'after reload: 0 items (actual: the two demo items come back whenever the list is empty)' }, () => {
    cy.visitTodos([])
    cy.reload()
    cy.get('.todo-list li').should('have.length', 0)
  })

  tc.knownDefect({ id: 'TC-TD-134', title: 'Corrupt storage value is handled gracefully', technique: 'Error guessing', req: 'REQ-TD-08', defect: 'DEF-KS-003',
    expected: 'app starts (fresh list or empty) without an uncaught exception (actual: JSON.parse throws, app does not initialise)' }, () => {
    cy.visit('/todo', { onBeforeLoad (w) { w.localStorage.setItem('todos-vanillajs', '{not json') } })
    cy.get('.todo-list li').should('have.length.at.least', 0)
    cy.get('.new-todo').type('still works{enter}')
    cy.get('.todo-list li').should('contain', 'still works')
  })

  tc({ id: 'TC-TD-135', title: 'Storage written for every mutation (add, toggle, edit, delete)', technique: 'Use-case', req: 'REQ-TD-08',
    expected: 'storage mirrors the UI after each step' }, () => {
    cy.visitTodos(['a'])
    cy.addTodo('b')
    cy.storedTodos().should((t) => expect(t.map((x) => x.title)).to.deep.equal(['a', 'b']))
    cy.get('.todo-list li').eq(1).find('.toggle').check()
    cy.storedTodos().its('1.completed').should('eq', true)
    cy.get('.todo-list li').eq(0).find('label').dblclick()
    cy.get('.todo-list li.editing .edit').clear().type('A{enter}')
    cy.storedTodos().its('0.title').should('eq', 'A')
    cy.get('.todo-list li').eq(0).find('.destroy').invoke('show').click()
    cy.storedTodos().should((t) => expect(t.map((x) => x.title)).to.deep.equal(['b']))
  })
})

describe('07 · TodoMVC — identity of items', { tags: ['@todo', '@known-defect'] }, () => {
  tc.knownDefect({ id: 'TC-TD-136', title: 'Two items created in the same millisecond can still be toggled independently', technique: 'Error guessing',
    req: 'REQ-TD-08', defect: 'DEF-KS-009', priority: 'P2',
    expected: 'ids are unique; toggling the 2nd item completes only the 2nd (actual: ids are millisecond timestamps, so both share one id and the 1st item is toggled)' }, () => {
    // freeze only Date so both demo items are created in the same millisecond, deterministically
    cy.clock(Date.UTC(2026, 0, 1), ['Date'])
    cy.visitPage('/todo')
    cy.get('.todo-list li').should('have.length', 2)
    cy.get('.todo-list li').eq(1).find('.toggle').click()
    cy.get('.todo-list li').eq(0).should('not.have.class', 'completed')
    cy.get('.todo-list li').eq(1).should('have.class', 'completed')
  })
})
