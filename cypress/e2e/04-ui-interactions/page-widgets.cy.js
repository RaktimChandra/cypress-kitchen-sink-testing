import { tc } from '../../support/tc'

describe('04 · UI interactions — widgets on other pages', { tags: ['@ui'] }, () => {
  tc({ id: 'TC-UI-060', title: 'Querying page button is found by id and class and is clickable', technique: 'Use-case', req: 'REQ-QT-01',
    expected: '#query-btn has text "Button" and classes query-btn btn btn-primary' }, () => {
    cy.visitPage('/commands/querying')
    cy.get('#query-btn').should('contain', 'Button').and('have.class', 'query-btn').click()
  })

  tc({ id: 'TC-UI-061', title: 'Utilities list items become active when clicked', technique: 'State transition', req: 'REQ-UI-07', priority: 'P1',
    expected: 'clicked <li> gets class active; others unaffected' }, () => {
    cy.visitPage('/utilities')
    cy.get('.utility-jquery li').should('have.length.at.least', 2)
    cy.get('.utility-jquery li').eq(1).click().should('have.class', 'active')
    cy.get('.utility-jquery li').eq(0).should('not.have.class', 'active')
  })

  tc({ id: 'TC-UI-062', title: 'Clicking every utilities item activates all of them (no single-selection)', technique: 'Decision table',
    req: 'REQ-UI-07', expected: 'all items active' }, () => {
    cy.visitPage('/utilities')
    cy.get('.utility-jquery li').click({ multiple: true }).each(($li) => expect($li).to.have.class('active'))
  })

  tc({ id: 'TC-UI-063', title: 'Aliasing page: table buttons change to "Changed" when clicked', technique: 'State transition', req: 'REQ-UI-07',
    expected: 'button text "Changed" and class btn-success' }, () => {
    cy.visitPage('/commands/aliasing')
    cy.get('.as-table').find('tbody>tr').first().find('td').first().find('button').as('firstBtn')
    cy.get('@firstBtn').click()
    cy.get('@firstBtn').should('have.class', 'btn-success').and('contain', 'Changed')
  })

  tc({ id: 'TC-UI-064', title: 'Aliasing table: each row button changes independently', technique: 'Decision table', req: 'REQ-UI-07',
    expected: 'clicking row 2 leaves row 1 unchanged' }, () => {
    cy.visitPage('/commands/aliasing')
    cy.get('.as-table tbody tr').eq(1).find('button').first().click().should('contain', 'Changed')
    cy.get('.as-table tbody tr').eq(0).find('button').first().should('not.contain', 'Changed')
  })

  tc({ id: 'TC-UI-065', title: 'Hidden connectors div can be shown with jQuery .show()', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'div hidden on load → visible after invoke("show")' }, () => {
    cy.visitPage('/commands/connectors')
    cy.get('.connectors-div').should('be.hidden').invoke('show').should('be.visible')
  })

  tc({ id: 'TC-UI-066', title: 'Connectors list items can be iterated with .each()', technique: 'Use-case', req: 'REQ-AS-01',
    expected: '3 items: Lara Williams, William Grey, Monica Pharrel' }, () => {
    cy.visitPage('/commands/connectors')
    const names = []
    cy.get('.connectors-each-ul>li').each(($li) => names.push($li.text().trim())).then(() => {
      expect(names).to.deep.equal(['Lara Williams', 'William Grey', 'Monica Pharrel'])
    })
  })

  tc({ id: 'TC-UI-067', title: 'Connectors .its("length") and .invoke() on lists', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'its-ul has 3 items' }, () => {
    cy.visitPage('/commands/connectors')
    cy.get('.connectors-its-ul>li').its('length').should('be.gt', 2)
  })
})
