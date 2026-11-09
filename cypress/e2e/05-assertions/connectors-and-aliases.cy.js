import { tc } from '../../support/tc'

describe('05 · Assertions — subjects, connectors and aliases', { tags: ['@assertions'] }, () => {
  tc({ id: 'TC-AS-030', title: '.invoke() calls a function on the subject', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'invoke("show") makes the hidden div visible; invoke("text") yields "This is a div"' }, () => {
    cy.visitPage('/commands/connectors')
    cy.get('.connectors-div').invoke('show').invoke('text').invoke('trim').should('eq', 'This is a div')
  })

  tc({ id: 'TC-AS-031', title: '.spread() unpacks an array subject into arguments', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'arguments foo, bar, baz' }, () => {
    cy.wrap(['foo', 'bar', 'baz']).spread((a, b, c) => {
      expect([a, b, c]).to.deep.equal(['foo', 'bar', 'baz'])
    })
  })

  tc({ id: 'TC-AS-032', title: '.then() return value becomes the next subject; undefined keeps the old one', technique: 'Use-case', req: 'REQ-AS-01',
    expected: '1 → 2 (returned) → 2 (undefined returned keeps subject)' }, () => {
    cy.wrap(1).then((n) => n + 1).should('eq', 2).then(() => undefined).should('eq', 2)
  })

  tc({ id: 'TC-AS-033', title: '.its() reads nested properties', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'its("a.b.c") = 42' }, () => {
    cy.wrap({ a: { b: { c: 42 } } }).its('a.b.c').should('eq', 42)
  })

  tc({ id: 'TC-AS-034', title: 'Aliases of elements and of values (this.*)', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'aliased cell re-queried; aliased value available on this' }, function () {
    cy.visitPage('/commands/aliasing')
    cy.get('.as-table').find('tbody>tr').first().find('td').first().find('button').as('firstBtn')
    cy.wrap(7).as('seven')
    cy.get('@firstBtn').click().should('contain', 'Changed')
    cy.then(function () { expect(this.seven).to.eq(7) })
  })

  tc({ id: 'TC-AS-035', title: 'Snapshot of a structured object with deep equality', technique: 'Use-case', req: 'REQ-QT-01',
    expected: 'traversal table read into objects equals the expected list' }, () => {
    cy.visitPage('/commands/traversal')
    cy.get('.traversal-table tbody tr').then(($rows) => [...$rows].map((r) => [...r.children].map((c) => c.textContent.trim())))
      .should('deep.equal', [['1', 'Jane', 'Lane'], ['2', 'John', 'Doe']])
  })
})
