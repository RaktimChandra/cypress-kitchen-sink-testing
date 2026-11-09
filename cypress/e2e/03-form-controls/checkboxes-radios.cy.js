import { tc } from '../../support/tc'

describe('03 · Form controls — checkboxes and radios', { tags: ['@forms'] }, () => {
  beforeEach(() => cy.visitPage('/commands/actions'))

  tc({ id: 'TC-FC-080', title: 'Check all enabled checkboxes', technique: 'ECP', req: 'REQ-FC-07', priority: 'P1',
    expected: 'checkbox1 and checkbox3 checked; disabled checkbox2 unchanged' }, () => {
    cy.get('.action-checkboxes [type="checkbox"]').not('[disabled]').check().should('be.checked')
    cy.get('.action-checkboxes [value="checkbox2"]').should('be.disabled').and('not.be.checked')
  })

  tc({ id: 'TC-FC-081', title: 'Disabled checkbox cannot be checked by a user', technique: 'ECP (invalid)', req: 'REQ-FC-07', priority: 'P1',
    expected: 'check() on a disabled box is refused' }, () => {
    cy.on('fail', (e) => { expect(e.message).to.include('disabled'); return false })
    cy.get('.action-checkboxes [value="checkbox2"]').check({ timeout: 500 })
  })

  tc({ id: 'TC-FC-082', title: 'force:true checks the disabled checkbox (test escape hatch)', technique: 'Error guessing', req: 'REQ-FC-07',
    expected: 'checkbox2 checked when forced' }, () => {
    cy.get('.action-checkboxes [value="checkbox2"]').check({ force: true }).should('be.checked')
  })

  // Decision table: 3 independent checkboxes → 2³ = 8 rules, each a test case
  const values = ['checkbox1', 'checkbox2', 'checkbox3']
  for (let rule = 0; rule < 8; rule++) {
    const chosen = values.filter((_, b) => rule & (1 << b))
    tc({ id: `TC-FC-${String(83 + rule).padStart(3, '0')}`, title: `Decision table rule R${rule + 1}: check {${chosen.join(', ') || '∅'}}`,
      technique: 'Decision table', req: 'REQ-FC-07', data: chosen.join(','),
      expected: values.map((v) => `${v}=${chosen.includes(v) ? 'Y' : 'N'}`).join(' ') }, () => {
      if (chosen.length) cy.get('.action-multiple-checkboxes [type="checkbox"]').check(chosen)
      values.forEach((v) => {
        cy.get(`.action-multiple-checkboxes [value="${v}"]`).should(chosen.includes(v) ? 'be.checked' : 'not.be.checked')
      })
    })
  }

  tc({ id: 'TC-FC-091', title: 'Uncheck all pre-checked enabled boxes', technique: 'ECP', req: 'REQ-FC-07', priority: 'P1',
    expected: 'checkbox1, checkbox3 unchecked; disabled checkbox2 stays checked' }, () => {
    cy.get('.action-check [type="checkbox"]').not('[disabled]').uncheck().should('not.be.checked')
    cy.get('.action-check [value="checkbox2"]').should('be.checked')
  })

  tc({ id: 'TC-FC-092', title: 'Uncheck a single box by value', technique: 'ECP', req: 'REQ-FC-07',
    expected: 'only checkbox1 unchecked' }, () => {
    cy.get('.action-check [type="checkbox"]').uncheck('checkbox1')
    cy.get('.action-check [value="checkbox1"]').should('not.be.checked')
    cy.get('.action-check [value="checkbox3"]').should('be.checked')
  })

  tc({ id: 'TC-FC-093', title: 'Clicking a label toggles its checkbox', technique: 'Use-case', req: 'REQ-FC-07',
    expected: 'click label once → checked; again → unchecked' }, () => {
    cy.contains('.action-multiple-checkboxes label', 'Checkbox three').click()
    cy.get('.action-multiple-checkboxes [value="checkbox3"]').should('be.checked')
    cy.contains('.action-multiple-checkboxes label', 'Checkbox three').click()
    cy.get('.action-multiple-checkboxes [value="checkbox3"]').should('not.be.checked')
  })

  // radios: state transition — at most one checked in the group
  tc({ id: 'TC-FC-094', title: 'Radio group starts with nothing selected', technique: 'State transition', req: 'REQ-FC-08',
    expected: 'no radio checked' }, () => {
    cy.get('.action-radios [type=radio]:checked').should('have.length', 0)
  })

  ;[['radio1', 'radio2'], ['radio2', 'radio1']].forEach(([first, second], i) => {
    tc({ id: `TC-FC-${String(95 + i).padStart(3, '0')}`, title: `Selecting ${second} after ${first} deselects ${first}`, technique: 'State transition',
      req: 'REQ-FC-08', priority: 'P1', expected: `${second} checked, ${first} unchecked, exactly 1 checked` }, () => {
      cy.get('.action-radios [type="radio"]').check(first)
      cy.get('.action-radios [type="radio"]').check(second)
      cy.get(`.action-radios [value="${first}"]`).should('not.be.checked')
      cy.get(`.action-radios [value="${second}"]`).should('be.checked')
      cy.get('.action-radios [type=radio]:checked').should('have.length', 1)
    })
  })

  tc({ id: 'TC-FC-097', title: 'Disabled radio3 cannot be selected', technique: 'ECP (invalid)', req: 'REQ-FC-08',
    expected: 'check("radio3") is refused; radio3 unchecked' }, () => {
    cy.get('#optionsRadios3').should('be.disabled')
    cy.on('fail', (e) => { expect(e.message).to.include('disabled'); return false })
    cy.get('#optionsRadios3').check({ timeout: 500 })
  })

  tc({ id: 'TC-FC-098', title: 'Re-checking the selected radio keeps it selected', technique: 'State transition', req: 'REQ-FC-08',
    expected: 'radio1 still checked' }, () => {
    cy.get('#optionsRadios1').check().check().should('be.checked')
  })

  tc({ id: 'TC-FC-099', title: 'Radios cannot be unchecked with uncheck() (only checkboxes can)', technique: 'Error guessing', req: 'REQ-FC-08',
    expected: 'Cypress refuses uncheck on a radio' }, () => {
    cy.get('#optionsRadios1').check()
    cy.on('fail', (e) => { expect(e.message).to.match(/radio|checkbox/i); return false })
    cy.get('#optionsRadios1').uncheck()
  })
})
