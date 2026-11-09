import { tc } from '../../support/tc'

/**
 * Boundary value analysis on <input type="range"> (min 0, max 100, step 1 — HTML defaults).
 * The page echoes the value into the next <p> on "change". Oracle: the HTML value
 * sanitisation algorithm — clamp to [min,max], round to the nearest step (ties up),
 * and use the default (min+max)/2 = 50 for anything that is not a valid number.
 */
const cases = [
  // [label, input, expected, technique]
  ['min − 1', -1, '0', 'BVA'],
  ['min', 0, '0', 'BVA'],
  ['min + 1', 1, '1', 'BVA'],
  ['nominal', 50, '50', 'BVA'],
  ['max − 1', 99, '99', 'BVA'],
  ['max', 100, '100', 'BVA'],
  ['max + 1', 101, '100', 'BVA'],
  ['far below (robustness)', -1000, '0', 'Robust BVA'],
  ['far above (robustness)', 1e6, '100', 'Robust BVA'],
  ['between steps, below .5', 49.4, '49', 'BVA'],
  ['between steps, exactly .5 (tie rounds up)', 50.5, '51', 'BVA'],
  ['exponent notation', '1e2', '100', 'ECP'],
  ['non-numeric text', 'abc', '50', 'ECP (invalid)'],
  ['empty string', '', '50', 'ECP (invalid)'],
]

describe('03 · Form controls — range slider boundary values', { tags: ['@forms', '@bva'] }, () => {
  beforeEach(() => cy.visitPage('/commands/actions'))

  tc({ id: 'TC-FC-140', title: 'Range starts at 0 and shows 0', technique: 'BVA', req: 'REQ-FC-11', priority: 'P1',
    expected: 'value 0; echo "0"' }, () => {
    cy.get('.trigger-input-range').should('have.value', '0').next('p').should('have.text', '0')
  })

  cases.forEach(([label, input, expected, technique], i) => {
    tc({ id: `TC-FC-${String(141 + i).padStart(3, '0')}`, title: `Range ${label}: set ${JSON.stringify(input)} → shows ${expected}`, technique,
      req: 'REQ-FC-11', priority: /min|max/.test(label) ? 'P1' : 'P2', data: String(input), expected: `value ${expected}; echo "${expected}"` }, () => {
      cy.get('.trigger-input-range').invoke('val', input).trigger('change')
        .should('have.value', expected)
        .next('p').should('have.text', expected)
    })
  })

  tc({ id: 'TC-FC-160', title: 'Echo updates only on "change", not on "input"', technique: 'Error guessing', req: 'REQ-FC-11',
    expected: 'after input event echo still "0"; after change "25"' }, () => {
    cy.get('.trigger-input-range').invoke('val', 25).trigger('input').next('p').should('have.text', '0')
    cy.get('.trigger-input-range').trigger('change').next('p').should('have.text', '25')
  })

  tc.chromium({ id: 'TC-FC-161', title: 'Keyboard arrows move the slider one step (real key events)', technique: 'BVA', req: 'REQ-FC-11',
    expected: '0 → ArrowRight ×3 → 3; ArrowLeft at 0 stays 0' }, () => {
    cy.get('.trigger-input-range').focus().realPress('ArrowLeft')
    cy.get('.trigger-input-range').should('have.value', '0')
    cy.get('.trigger-input-range').realPress('ArrowRight').realPress('ArrowRight').realPress('ArrowRight')
    cy.get('.trigger-input-range').should('have.value', '3')
  })
})
