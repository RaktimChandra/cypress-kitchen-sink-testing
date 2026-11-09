import { tc } from '../../support/tc'

/**
 * Equivalence class partitioning of the <input type="email"> field. The Kitchen Sink has
 * no custom validation, so the oracle is the HTML Living Standard "valid e-mail address"
 * rule, checked through the browser's constraint-validation API (checkValidity()).
 */
const classes = [
  // [class id, description, value, valid?]
  ['V1', 'simple local@domain', 'user@example.com', true],
  ['V2', 'single-label domain (allowed by HTML)', 'a@b', true],
  ['V3', 'dots and plus tag, multi-level domain', 'a.b+tag@sub.example.co.in', true],
  ['V4', 'upper case', 'A@B.COM', true],
  ['V5', 'digits only', '1@2.3', true],
  ['V6', 'empty (field is not required)', '', true],
  ['I1', 'no @', 'plain', false],
  ['I2', 'missing domain', 'a@', false],
  ['I3', 'missing local part', '@b.com', false],
  ['I4', 'space in local part', 'a b@c.com', false],
  ['I5', 'consecutive dots in domain', 'a@b..com', false],
  ['I6', 'two @ signs', 'a@@b.com', false],
  ['I7', 'trailing dot', 'a@b.com.', false],
  ['I8', 'label starting with hyphen', 'a@-b.com', false],
  ['I9', 'quoted local part (RFC-valid, HTML-invalid)', '"quoted"@b.com', false],
  ['I10', 'non-ASCII local part', 'üñî@b.com', false],
  ['I11', 'underscore in domain', 'a@b_c.com', false],
]

describe('03 · Form controls — email field equivalence classes', { tags: ['@forms', '@ecp'] }, () => {
  beforeEach(() => cy.visitPage('/commands/actions'))

  classes.forEach(([cls, desc, value, valid], i) => {
    tc({ id: `TC-FC-${String(40 + i).padStart(3, '0')}`, title: `Email ${cls} — ${desc} → ${valid ? 'valid' : 'invalid'}`,
      technique: 'ECP', req: 'REQ-FC-02', priority: valid ? 'P2' : 'P1', data: value,
      expected: `checkValidity() = ${valid}; typeMismatch = ${!valid}` }, () => {
      if (value) cy.get('.action-email').type(value, { parseSpecialCharSequences: false })
      cy.get('.action-email').should('have.value', value).then(($i) => {
        expect($i[0].checkValidity(), 'checkValidity').to.eq(valid)
        expect($i[0].validity.typeMismatch, 'typeMismatch').to.eq(!valid)
      })
    })
  })
})
