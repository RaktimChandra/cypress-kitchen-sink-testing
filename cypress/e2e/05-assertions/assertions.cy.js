import { tc } from '../../support/tc'

// custom Chai assertion: expect($el).to.be.inViewportBox — demonstrates extending the assertion library
chai.Assertion.addMethod('textTrimmed', function (expected) {
  const actual = Cypress.$(this._obj).text().replace(/\s+/g, ' ').trim()
  this.assert(actual === expected, 'expected #{this} trimmed text to be #{exp} but was #{act}', 'expected #{this} trimmed text not to be #{act}', expected, actual)
})

describe('05 · Assertions — implicit, explicit, retry-ability', { tags: ['@assertions'] }, () => {
  beforeEach(() => cy.visitPage('/commands/assertions'))

  tc({ id: 'TC-AS-001', title: 'Implicit .should(): row class, cell text, cell html', technique: 'Use-case', req: 'REQ-AS-01', priority: 'P1',
    expected: 'last row has class success; first cell text "Column content"' }, () => {
    cy.get('.assertion-table').find('tbody tr:last').should('have.class', 'success')
      .find('td').first()
      .should('have.text', 'Column content')
      .should('contain', 'Column content')
      .should('have.html', 'Column content')
      .should('match', 'td')
      .invoke('text').should('match', /column content/i)
  })

  tc({ id: 'TC-AS-002', title: 'Chained .and() assertions on the docs link', technique: 'Use-case', req: 'REQ-AS-01', priority: 'P1',
    expected: 'class active, href includes cypress.io, text "Cypress Docs"' }, () => {
    cy.get('.assertions-link').should('have.class', 'active').and('have.attr', 'href').and('include', 'cypress.io')
    cy.get('.assertions-link').should('have.text', 'Cypress Docs')
  })

  tc({ id: 'TC-AS-003', title: 'BDD expect: equality, deep equality, regex, type', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'all expectations hold' }, () => {
    expect(true).to.be.true
    const o = { foo: 'bar' }
    expect(o).to.equal(o)
    expect(o).to.deep.equal({ foo: 'bar' })
    expect('FooBar').to.match(/bar$/i)
    expect([1, 2, 3]).to.be.an('array').that.includes(2).and.has.length(3)
  })

  tc({ id: 'TC-AS-004', title: 'TDD assert style', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'assert.isObject, assert.equal, assert.notEqual pass' }, () => {
    const person = { name: 'Joe', age: 20 }
    assert.isObject(person, 'value is object')
    assert.equal(person.age, 20)
    assert.notEqual(person.name, 'Jane')
    assert.isAbove(person.age, 18, 'adult')
  })

  tc({ id: 'TC-AS-005', title: 'Callback .should() checks all three paragraphs in one retried assertion', technique: 'Use-case', req: 'REQ-AS-01', priority: 'P1',
    expected: '3 paragraphs with the documented texts' }, () => {
    cy.get('.assertions-p').find('p').should(($p) => {
      const texts = $p.map((i, el) => Cypress.$(el).text()).get()
      expect(texts).to.have.length(3)
      expect(texts).to.deep.eq(['Some text from first p', 'More text from second p', 'And even more text from third p'])
    })
  })

  tc({ id: 'TC-AS-006', title: 'Class name matched with a regular expression', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'docs header first div class matches /heading-/' }, () => {
    cy.get('.docs-header').find('div').should(($div) => {
      expect($div).to.have.length(1)
      expect($div[0].className).to.match(/heading-/)
    })
  })

  tc({ id: 'TC-AS-007', title: 'Retry-ability: random number replaces the 🎁 placeholder within the timeout', technique: 'Use-case', req: 'REQ-AS-01', priority: 'P1',
    expected: 'text becomes an integer 1…10 (retried until true)' }, () => {
    cy.get('#random-number', { timeout: 10000 }).should(($el) => {
      const n = parseFloat($el.text())
      expect(n).to.be.gte(1).and.be.lte(10)
    })
  })

  tc({ id: 'TC-AS-008', title: 'Case-insensitive, whitespace-insensitive text comparison', technique: 'Use-case', req: 'REQ-AS-01',
    expected: '"Foo Bar" equals "foo b a r" after normalisation' }, () => {
    const norm = (s) => s.replace(/\s/g, '').toLowerCase()
    cy.get('.two-elements').find('.first').then(($a) => {
      const a = norm($a.text())
      cy.get('.two-elements').find('.second').should(($b) => expect(norm($b.text())).to.eq(a))
    })
  })

  tc({ id: 'TC-AS-009', title: 'Custom Chai assertion textTrimmed', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'first p trimmed text equals "Some text from first p"' }, () => {
    cy.get('.assertions-p p').first().should('textTrimmed', 'Some text from first p')
  })

  tc({ id: 'TC-AS-010', title: 'Negative assertions: absent element, missing class, not visible', technique: 'ECP (invalid)', req: 'REQ-AS-01',
    expected: 'all negative assertions hold' }, () => {
    cy.get('.does-not-exist').should('not.exist')
    cy.get('.assertion-table tbody tr:first').should('not.have.class', 'success')
    cy.get('.assertions-link').should('not.have.attr', 'target')
  })

  tc({ id: 'TC-AS-011', title: 'CSS assertions on computed style', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'table has border-collapse "collapse"; link has a non-transparent colour' }, () => {
    cy.get('.assertion-table').should('have.css', 'border-collapse', 'collapse')
    cy.get('.assertions-link').should('have.css', 'color').and('not.eq', 'rgba(0, 0, 0, 0)')
  })

  tc({ id: 'TC-AS-012', title: 'Length assertions on table rows', technique: 'BVA', req: 'REQ-AS-01',
    expected: 'exactly 3 rows; at least 1; at most 3' }, () => {
    cy.get('.assertion-table tbody tr').should('have.length', 3).and('have.length.gte', 1).and('have.length.lte', 3)
  })

  ;[1, 2, 3].forEach((row) => {
    tc({ id: `TC-AS-${String(12 + row).padStart(3, '0')}`, title: `Row ${row}: number cell is "${row}" and both content cells say "Column content"`,
      technique: 'ECP', req: 'REQ-AS-01', expected: `th "${row}", 2 × td "Column content"` }, () => {
      cy.get('.assertion-table tbody tr').eq(row - 1).within(() => {
        cy.get('th').should('have.text', String(row))
        cy.get('td').should('have.length', 2).each(($td) => expect($td.text()).to.eq('Column content'))
      })
    })
  })

  tc({ id: 'TC-AS-016', title: 'An assertion that can never pass fails within the configured timeout (assertion of the assertion)', technique: 'Error guessing',
    req: 'REQ-AS-01', expected: 'Cypress reports "Timed out retrying" after ~400 ms' }, () => {
    const start = Date.now()
    cy.on('fail', (e) => {
      expect(e.message).to.include('Timed out retrying')
      expect(Date.now() - start).to.be.lessThan(3000)
      return false
    })
    cy.get('.assertions-link', { timeout: 400 }).should('have.text', 'This text is never shown')
  })
})
