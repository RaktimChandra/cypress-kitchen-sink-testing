import { tc } from '../../support/tc'

const MSG = 'Your form has been submitted!'

describe('03 · Form controls — form submission', { tags: ['@forms'] }, () => {
  beforeEach(() => cy.visitPage('/commands/actions'))

  tc({ id: 'TC-FC-060', title: 'Submit the coupon form with .submit()', technique: 'Use-case', req: 'REQ-FC-06', priority: 'P1',
    expected: `"${MSG}" shown in green after the form; URL unchanged (no reload)` }, () => {
    cy.get('.action-form').find('[type="text"]').type('HALFOFF')
    cy.get('.action-form').submit()
      .next().should('have.text', MSG).and('have.css', 'color', 'rgb(32, 181, 32)')
    cy.url().should('not.contain', '?')
    cy.get('#couponCode1').should('have.value', 'HALFOFF')
  })

  tc({ id: 'TC-FC-061', title: 'Submit by clicking the Submit button', technique: 'Use-case', req: 'REQ-FC-06', priority: 'P1',
    expected: `"${MSG}" shown once` }, () => {
    cy.get('#couponCode1').type('SAVE10')
    cy.get('.action-form button[type=submit]').click()
    cy.get('.action-form').nextAll('p').should('have.length', 1).first().should('have.text', MSG)
  })

  tc({ id: 'TC-FC-062', title: 'Submit by pressing Enter in the coupon field (implicit submission)', technique: 'Use-case', req: 'REQ-FC-06',
    expected: `"${MSG}" shown; page not reloaded` }, () => {
    cy.get('#couponCode1').type('ENTER{enter}')
    cy.get('.action-form').next('p').should('have.text', MSG)
    cy.url().should('not.contain', '?')
  })

  // ECP on coupon code: the demo has no validation, so every class is accepted — documented as an observation
  ;[['empty', ''], ['whitespace', '   '], ['lowercase', 'halfoff'], ['very long', 'X'.repeat(300)], ['script-like', '<b>x</b>']].forEach(([cls, code], i) => {
    tc({ id: `TC-FC-${String(63 + i).padStart(3, '0')}`, title: `Coupon code class "${cls}" is accepted (no client validation)`, technique: 'ECP',
      req: 'REQ-FC-06', data: code, expected: `"${MSG}" shown; value kept verbatim` }, () => {
      if (code) cy.get('#couponCode1').type(code, { parseSpecialCharSequences: false, delay: 0 })
      cy.get('.action-form').submit()
      cy.get('.action-form').next('p').should('have.text', MSG)
      cy.get('#couponCode1').should('have.value', code)
    })
  })

  ;[1, 2, 5].forEach((n, i) => {
    tc({ id: `TC-FC-${String(68 + i).padStart(3, '0')}`, title: `Submitting ${n} time(s) appends ${n} confirmation(s)`, technique: 'BVA',
      req: 'REQ-FC-06', expected: `${n} confirmation paragraph(s) after the form` }, () => {
      for (let k = 0; k < n; k++) cy.get('.action-form').submit()
      cy.get('.action-form').nextAll('p').should('have.length', n)
    })
  })
})
