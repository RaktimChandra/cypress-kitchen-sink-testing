import { tc } from '../../support/tc'

/** One test per traversal command — each command is an equivalence class of DOM navigation. */
const cases = [
  ['children', () => cy.get('.traversal-breadcrumb').children('.active'), 'Data'],
  ['closest', () => cy.get('.traversal-badge').closest('ul'), null, ($e) => expect($e).to.have.class('list-group')],
  ['eq', () => cy.get('.traversal-list>li').eq(1), 'siamese'],
  ['filter', () => cy.get('.traversal-nav>li').filter('.active'), 'About'],
  ['find', () => cy.get('.traversal-pagination').find('li').find('a'), null, ($e) => expect($e).to.have.length(7)],
  ['first', () => cy.get('.traversal-table td').first(), '1'],
  ['last', () => cy.get('.traversal-buttons .btn').last(), null, ($e) => expect($e.val() || $e.text()).to.eq('Submit')],
  ['next', () => cy.get('.traversal-ul').contains('apples').next(), 'oranges'],
  ['nextAll', () => cy.get('.traversal-next-all').contains('oranges').nextAll(), null, ($e) => expect($e).to.have.length(3)],
  ['nextUntil', () => cy.get('#veggies').nextUntil('#nuts'), null, ($e) => expect($e).to.have.length(3)],
  ['not', () => cy.get('.traversal-disabled .btn').not('[disabled]'), 'Button'],
  ['parent', () => cy.get('.traversal-mark').parent(), null, ($e) => expect($e.text()).to.contain('Morbi leo risus')],
  ['parents', () => cy.get('.traversal-cite').parents(), null, ($e) => expect($e.is('blockquote') || $e.filter('blockquote').length).to.be.ok],
  ['parentsUntil', () => cy.get('.clothes-nav').find('.active').parentsUntil('.clothes-nav'), null, ($e) => expect($e).to.have.length(2)],
  ['prev', () => cy.get('.birds').find('.active').prev(), 'Lorikeets'],
  ['prevAll', () => cy.get('.fruits-list').find('.third').prevAll(), null, ($e) => expect($e).to.have.length(2)],
  ['prevUntil', () => cy.get('.foods-list').find('#nuts').prevUntil('#veggies'), null, ($e) => expect($e).to.have.length(3)],
  ['siblings', () => cy.get('.traversal-pills .active').siblings(), null, ($e) => expect($e).to.have.length(2)],
]

describe('06 · Traversal', { tags: ['@querying'] }, () => {
  beforeEach(() => cy.visitPage('/commands/traversal'))

  cases.forEach(([cmd, query, text, check], i) => {
    tc({ id: `TC-QT-${String(30 + i).padStart(3, '0')}`, title: `.${cmd}() navigates to the documented element(s)`, technique: 'ECP', req: 'REQ-QT-01',
      expected: text ? `yields element containing "${text}"` : 'yields the documented set' }, () => {
      const q = query()
      if (text) q.should('contain', text)
      if (check) q.should(check)
    })
  })

  tc({ id: 'TC-QT-050', title: 'Badge inside the list item shows 54', technique: 'Use-case', req: 'REQ-QT-01', expected: 'text "54"' }, () => {
    cy.get('.traversal-badge').should('have.text', '54')
  })
})
