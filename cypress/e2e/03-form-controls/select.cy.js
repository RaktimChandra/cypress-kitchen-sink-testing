import { tc } from '../../support/tc'

const fruits = [['apples', 'fr-apples'], ['oranges', 'fr-oranges'], ['bananas', 'fr-bananas']]

describe('03 · Form controls — select lists', { tags: ['@forms'] }, () => {
  beforeEach(() => cy.visitPage('/commands/actions'))

  tc({ id: 'TC-FC-110', title: 'Single select defaults to the "--Select a fruit--" placeholder', technique: 'ECP', req: 'REQ-FC-09', priority: 'P1',
    expected: 'value "--Select a fruit--", 4 options' }, () => {
    cy.get('.action-select').should('have.value', '--Select a fruit--').find('option').should('have.length', 4)
  })

  fruits.forEach(([text, value], i) => {
    tc({ id: `TC-FC-${String(111 + i).padStart(3, '0')}`, title: `Select "${text}" by visible text`, technique: 'ECP', req: 'REQ-FC-09',
      priority: 'P1', expected: `value = ${value}` }, () => {
      cy.get('.action-select').select(text).should('have.value', value)
    })
    tc({ id: `TC-FC-${String(114 + i).padStart(3, '0')}`, title: `Select "${text}" by value ${value}`, technique: 'ECP', req: 'REQ-FC-09',
      expected: `selected option text = ${text}` }, () => {
      cy.get('.action-select').select(value).find(':selected').should('have.text', text)
    })
  })

  ;[[0, '--Select a fruit--'], [1, 'fr-apples'], [3, 'fr-bananas']].forEach(([idx, val], i) => {
    tc({ id: `TC-FC-${String(117 + i).padStart(3, '0')}`, title: `Select by index ${idx} (boundary of the option list)`, technique: 'BVA', req: 'REQ-FC-09',
      expected: `value = ${val}` }, () => {
      cy.get('.action-select').select(idx).should('have.value', val)
    })
  })

  tc({ id: 'TC-FC-120', title: 'Selecting a non-existent option fails (index 4 is out of range)', technique: 'BVA (invalid)', req: 'REQ-FC-09',
    expected: 'select(4) raises "did not find" error' }, () => {
    cy.on('fail', (e) => { expect(e.message).to.match(/did not find|index/i); return false })
    cy.get('.action-select').select(4, { timeout: 500 })
  })

  tc({ id: 'TC-FC-121', title: 'Selecting a non-existent text fails', technique: 'ECP (invalid)', req: 'REQ-FC-09',
    expected: 'select("mangoes") raises an error' }, () => {
    cy.on('fail', (e) => { expect(e.message).to.match(/did not find/i); return false })
    cy.get('.action-select').select('mangoes', { timeout: 500 })
  })

  tc({ id: 'TC-FC-122', title: 'Change event fires once per selection', technique: 'Use-case', req: 'REQ-FC-09',
    expected: 'change listener called 2 times for 2 selections' }, () => {
    const spy = cy.spy().as('change')
    cy.get('.action-select').then(($s) => $s.on('change', spy))
    cy.get('.action-select').select('apples').select('oranges')
    cy.get('@change').should('have.been.calledTwice')
  })

  // multi-select: all 2³ subsets (decision table over the three options)
  for (let mask = 0; mask < 8; mask++) {
    const chosen = fruits.filter((_, b) => mask & (1 << b))
    tc({ id: `TC-FC-${String(123 + mask).padStart(3, '0')}`, title: `Multi-select subset {${chosen.map((c) => c[0]).join(', ') || '∅'}}`,
      technique: 'Decision table', req: 'REQ-FC-10', data: chosen.map((c) => c[1]).join(','),
      expected: `selected values = [${chosen.map((c) => c[1]).join(', ')}]` }, () => {
      cy.get('.action-select-multiple').select(chosen.map((c) => c[0]))
      cy.get('.action-select-multiple').should(($s) => {
        expect([...$s[0].selectedOptions].map((o) => o.value)).to.deep.equal(chosen.map((c) => c[1]))
      })
    })
  }

  tc({ id: 'TC-FC-131', title: 'Re-selecting in a multi-select replaces the previous selection', technique: 'State transition', req: 'REQ-FC-10',
    expected: 'after [apples, oranges] then [bananas] → only fr-bananas' }, () => {
    cy.get('.action-select-multiple').select(['apples', 'oranges']).select(['bananas'])
      .invoke('val').should('deep.equal', ['fr-bananas'])
  })
})
