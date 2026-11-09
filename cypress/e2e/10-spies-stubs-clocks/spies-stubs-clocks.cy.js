import { tc } from '../../support/tc'

describe('10 · Spies, stubs and clocks', { tags: ['@spies'] }, () => {
  tc({ id: 'TC-SP-001', title: 'cy.clock freezes Date: clicking the clock div shows the frozen epoch', technique: 'Use-case', req: 'REQ-UI-08', priority: 'P1',
    expected: 'Date frozen at 2017-03-14 → div shows 1489449600' }, () => {
    const now = new Date(Date.UTC(2017, 2, 14)).getTime()
    cy.clock(now)
    cy.visitPage('/commands/spies-stubs-clocks')
    cy.get('#clock-div').click().should('have.text', '1489449600')
  })

  ;[[0, '1489449600'], [10000, '1489449610'], [999, '1489449600.999']].forEach(([ms, text], i) => {
    tc({ id: `TC-SP-${String(2 + i).padStart(3, '0')}`, title: `cy.tick(${ms}) advances the clock by ${ms} ms`, technique: 'BVA', req: 'REQ-UI-08',
      expected: `tick div shows ${text}` }, () => {
      cy.clock(new Date(Date.UTC(2017, 2, 14)).getTime())
      cy.visitPage('/commands/spies-stubs-clocks')
      cy.tick(ms)
      cy.get('#tick-div').click().should('have.text', text)
    })
  })

  tc({ id: 'TC-SP-005', title: 'Without cy.clock the div shows the real current epoch (±60 s)', technique: 'ECP', req: 'REQ-UI-08',
    expected: 'number close to Date.now()/1000' }, () => {
    cy.visitPage('/commands/spies-stubs-clocks')
    cy.get('#clock-div').click().invoke('text').then((t) => expect(parseFloat(t)).to.be.closeTo(Date.now() / 1000, 60))
  })

  tc({ id: 'TC-SP-006', title: 'Spy observes calls without changing behaviour', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'spy called once with arg 1; original return kept' }, () => {
    const obj = { foo (x) { return x * 2 } }
    const spy = cy.spy(obj, 'foo').as('foo')
    expect(obj.foo(1)).to.eq(2)
    expect(spy).to.be.calledOnceWith(1)
  })

  tc({ id: 'TC-SP-007', title: 'Stub replaces behaviour and can branch on arguments', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'withArgs(1) → 10, withArgs(2) → 20, other → undefined' }, () => {
    const obj = { calc: () => 0 }
    const stub = cy.stub(obj, 'calc')
    stub.withArgs(1).returns(10)
    stub.withArgs(2).returns(20)
    expect([obj.calc(1), obj.calc(2), obj.calc(3)]).to.deep.equal([10, 20, undefined])
  })

  tc({ id: 'TC-SP-008', title: 'Sinon matchers check argument types', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'calledWith(match.number, match.string)' }, () => {
    const obj = { add: (a, b) => a + b }
    const spy = cy.spy(obj, 'add')
    obj.add(2, 'x')
    expect(spy).to.be.calledWith(Cypress.sinon.match.number, Cypress.sinon.match.string)
  })

  tc({ id: 'TC-SP-009', title: 'Stubbing window.alert and window.confirm (browser dialogs)', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'alert stub called with text; confirm stub returns false' }, () => {
    cy.visitPage('/commands/spies-stubs-clocks')
    cy.window().then((w) => {
      cy.stub(w, 'alert').as('alert')
      cy.stub(w, 'confirm').returns(false).as('confirm')
      w.alert('hello')
      expect(w.confirm('sure?')).to.eq(false)
    })
    cy.get('@alert').should('have.been.calledWith', 'hello')
    cy.get('@confirm').should('have.been.calledOnce')
  })
})
