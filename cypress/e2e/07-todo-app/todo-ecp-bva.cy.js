import { tc } from '../../support/tc'

const titles = (sel = '.todo-list li label') => cy.get(sel).then(($l) => [...$l].map((l) => l.textContent))

describe('07 · TodoMVC — equivalence classes of the todo title', { tags: ['@todo', '@ecp'] }, () => {
  // valid classes: stored trimmed; invalid classes: ignored (nothing added)
  const classes = [
    ['V1', 'ordinary text', 'Buy milk', 'Buy milk'],
    ['V2', 'single character (min length)', 'x', 'x'],
    ['V3', 'leading/trailing spaces trimmed', '   padded   ', 'padded'],
    ['V4', 'inner spaces preserved', 'a   b', 'a   b'],
    ['V5', 'digits', '2026', '2026'],
    ['V6', 'Unicode (Hindi)', 'दूध खरीदो', 'दूध खरीदो'],
    ['V7', 'emoji', '🎉 party', '🎉 party'],
    ['V8', 'HTML-looking text shown literally', '<b>bold</b>', '<b>bold</b>'],
    ['V9', 'very long (500 chars)', 'L'.repeat(500), 'L'.repeat(500)],
    ['I1', 'empty string', '', null],
    ['I2', 'only spaces', '     ', null],
    ['I3', 'only non-breaking spaces (String.trim removes them)', '\u00a0\u00a0', null],
  ]
  classes.forEach(([cls, desc, input, stored], i) => {
    tc({ id: `TC-TD-${String(30 + i).padStart(3, '0')}`, title: `Title ${cls} — ${desc} → ${stored === null ? 'ignored' : 'added'}`,
      technique: 'ECP', req: 'REQ-TD-01', priority: cls === 'V1' || cls.startsWith('I') ? 'P1' : 'P2', data: JSON.stringify(input),
      expected: stored === null ? 'list unchanged (0 items), input keeps no item' : `one item with title ${JSON.stringify(stored.length > 40 ? stored.slice(0, 20) + '…' : stored)}` }, () => {
      cy.visitTodos([])
      cy.get('.new-todo').type(`${input}{enter}`, { parseSpecialCharSequences: true, delay: 0 })
      if (stored === null) {
        cy.get('.todo-list li').should('have.length', 0)
        cy.storedTodos().should('have.length', 0)
      } else {
        titles().should('deep.equal', [stored])
        cy.storedTodos().its('0.title').should('eq', stored)
      }
    })
  })
})

describe('07 · TodoMVC — boundary values of the active-item counter', { tags: ['@todo', '@bva'] }, () => {
  // pluralisation rule: "item" only when exactly 1 → boundaries at 0, 1, 2
  const counts = [
    [0, 1, '0 items left'], [1, 0, '1 item left'], [1, 1, '1 item left'], [2, 0, '2 items left'], [99, 0, '99 items left'],
  ]
  counts.forEach(([active, completed, text], i) => {
    tc({ id: `TC-TD-${String(50 + i).padStart(3, '0')}`, title: `${active} active + ${completed} completed → "${text}"`, technique: 'BVA',
      req: 'REQ-TD-02', priority: active <= 2 ? 'P1' : 'P2', expected: `counter "${text}"; number in <strong>` }, () => {
      const list = [...Array(active).keys()].map((k) => `active ${k}`).concat([...Array(completed).keys()].map((k) => ({ title: `done ${k}`, completed: true })))
      cy.visitTodos(list)
      cy.get('.todo-count').should('have.text', text).find('strong').should('have.text', String(active))
    })
  })

  // list-size boundaries for main/footer visibility (0 vs 1)
  tc({ id: 'TC-TD-056', title: 'With 0 todos the list and footer are hidden', technique: 'BVA', req: 'REQ-TD-10', priority: 'P1',
    expected: '.main and .footer display:none' }, () => {
    cy.visitTodos([])
    cy.get('.main').should('not.be.visible')
    cy.get('.footer').should('not.be.visible')
  })

  tc({ id: 'TC-TD-057', title: 'Adding the first todo (0 → 1) shows list and footer', technique: 'BVA', req: 'REQ-TD-10', priority: 'P1',
    expected: '.main and .footer visible; "1 item left"' }, () => {
    cy.visitTodos([])
    cy.addTodo('first')
    cy.get('.main').should('be.visible')
    cy.get('.footer').should('be.visible')
    cy.get('.todo-count').should('have.text', '1 item left')
  })

  tc({ id: 'TC-TD-058', title: 'Deleting the last todo (1 → 0) hides list and footer again', technique: 'BVA', req: 'REQ-TD-10',
    expected: '.footer hidden' }, () => {
    cy.visitTodos(['only'])
    cy.get('.todo-list li .destroy').invoke('show').click()
    cy.get('.footer').should('not.be.visible')
  })

  tc({ id: 'TC-TD-059', title: 'Stress boundary: 100 todos are added and counted correctly', technique: 'BVA', req: 'REQ-TD-02', type: 'Performance',
    expected: '100 items; "100 items left"; finishes within the default timeouts' }, () => {
    cy.visitTodos([])
    for (let k = 1; k <= 100; k++) cy.get('.new-todo', { log: false }).type(`todo ${k}{enter}`, { delay: 0, log: false })
    cy.get('.todo-list li').should('have.length', 100)
    cy.get('.todo-count').should('have.text', '100 items left')
  })
})
