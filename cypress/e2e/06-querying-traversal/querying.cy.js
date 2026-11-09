import { tc } from '../../support/tc'

describe('06 · Querying', { tags: ['@querying'] }, () => {
  beforeEach(() => cy.visitPage('/commands/querying'))

  const gets = [
    ['by id', '#query-btn', 'Button'],
    ['by class', '.query-btn', 'Button'],
    ['by element + attribute', 'button[id="query-btn"]', 'Button'],
    ['by data-cy (best practice)', '[data-cy=submit]', 'Submit'],
    ['by descendant combinator', '#querying .well>button:first', 'Button'],
  ]
  gets.forEach(([how, sel, text], i) => {
    tc({ id: `TC-QT-${String(1 + i).padStart(3, '0')}`, title: `cy.get ${how}: ${sel}`, technique: 'ECP', req: 'REQ-QT-01',
      expected: `one element containing "${text}"` }, () => {
      cy.get(sel).should('have.length', 1).and('contain', text)
    })
  })

  const contains = [
    ['plain text', ['bananas'], 'third'],
    ['regular expression', [/^b\w+/], 'third'],
    ['selector + text', ['ul', 'apples'], 'query-list'],
    ['prefers the deepest/first match', ['apples'], 'first'],
  ]
  contains.forEach(([how, args, cls], i) => {
    tc({ id: `TC-QT-${String(10 + i).padStart(3, '0')}`, title: `cy.contains with ${how}`, technique: 'ECP', req: 'REQ-QT-01',
      expected: `yields element with class ${cls}` }, () => {
      const q = args[0] === 'ul' ? cy.contains(...args) : cy.get('.query-list').contains(...args)
      q.should('have.class', cls)
    })
  })

  tc({ id: 'TC-QT-014', title: 'contains() is case-sensitive unless matchCase:false', technique: 'ECP', req: 'REQ-QT-01',
    expected: '"capital sentence" not found by default; found with matchCase false' }, () => {
    cy.get('.query-button').contains('Save Form').should('have.class', 'btn')
    cy.get('.query-button').contains('save form', { matchCase: false }).should('exist')
    cy.get('.query-button').contains('save form').should('not.exist')
  })

  tc({ id: 'TC-QT-015', title: 'cy.root() inside .within() is the scoped element', technique: 'Use-case', req: 'REQ-QT-01',
    expected: 'root matches .query-ul' }, () => {
    cy.root().should('match', 'html')
    cy.get('.query-ul').within(() => cy.root().should('have.class', 'query-ul'))
  })

  tc({ id: 'TC-QT-016', title: 'Selector best practice: data-cy is stable when classes change', technique: 'Error guessing', req: 'REQ-QT-01',
    expected: 'after removing classes, data-cy still finds the button' }, () => {
    cy.get('[data-cy=submit]').invoke('removeAttr', 'class')
    cy.get('[data-cy=submit]').should('contain', 'Submit')
  })
})
