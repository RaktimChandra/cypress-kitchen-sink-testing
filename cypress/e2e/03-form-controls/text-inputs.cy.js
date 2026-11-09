import { tc } from '../../support/tc'

describe('03 · Form controls — text, email, password, textarea', { tags: ['@forms'] }, () => {
  beforeEach(() => cy.visitPage('/commands/actions'))

  tc({ id: 'TC-FC-001', title: 'Type into the email field', technique: 'ECP', req: 'REQ-FC-01', priority: 'P1',
    expected: 'value = "fake@email.com"' }, () => {
    cy.get('.action-email').type('fake@email.com').should('have.value', 'fake@email.com')
  })

  // special-character sequences: one equivalence class each
  const seqs = [
    ['arrow keys + delete', 'abc{leftarrow}{leftarrow}{del}', 'ac'],
    ['backspace', 'abcd{backspace}{backspace}', 'ab'],
    ['select-all then type replaces text', 'old text{selectall}new', 'new'],
    ['home / end movement', 'bc{movetostart}a{movetoend}d', 'abcd'],
    ['literal braces escaped with {{}', '{{}braces}', '{braces}'],
    ['backspace past the start is harmless', 'ab{backspace}{backspace}{backspace}', ''],
    ['leading and inner spaces preserved', '  lead in', '  lead in'],
  ]
  seqs.forEach(([name, input, expected], i) => {
    tc({ id: `TC-FC-${String(2 + i).padStart(3, '0')}`, title: `Special keys: ${name}`, technique: 'ECP', req: 'REQ-FC-01',
      expected: `value = "${expected}"`, data: input }, () => {
      // spaces are checked on the text field: typing into type=email re-sanitises the value after each key
      cy.get(/ spaces /.test(name) ? '#fullName1' : '.action-email').type(input).should('have.value', expected)
    })
  })

  tc({ id: 'TC-FC-010', title: 'Typing with a per-key delay produces the same value', technique: 'Use-case', req: 'REQ-FC-01',
    expected: 'value = "slow.typing@email.com"' }, () => {
    cy.get('.action-email').type('slow.typing@email.com', { delay: 50 }).should('have.value', 'slow.typing@email.com')
  })

  const strings = [
    ['Unicode (Devanagari)', 'नमस्ते'],
    ['Unicode (Bengali)', 'নমস্কার'],
    ['emoji', 'test 🚀✅'],
    ['digits only', '0123456789'],
    ['punctuation', '!#$%&*+-/=?^_`|~'],
  ]
  strings.forEach(([cls, text], i) => {
    tc({ id: `TC-FC-${String(11 + i).padStart(3, '0')}`, title: `Full-name field accepts ${cls}`, technique: 'ECP', req: 'REQ-FC-01',
      expected: `value equals the typed string exactly`, data: text }, () => {
      cy.get('.action-blur').type(text).should('have.value', text)
    })
  })

  ;[0, 1, 255, 256, 1000].forEach((len, i) => {
    tc({ id: `TC-FC-${String(16 + i).padStart(3, '0')}`, title: `Description accepts a ${len}-character value (no maxlength)`, technique: 'BVA',
      req: 'REQ-FC-01', expected: `value length = ${len}` }, () => {
      const v = 'x'.repeat(len)
      if (len) cy.get('.action-clear').invoke('val', v.slice(0, -1)).type('x')
      cy.get('.action-clear').invoke('val').its('length').should('eq', len)
      cy.get('.action-clear').should('not.have.attr', 'maxlength')
    })
  })

  tc({ id: 'TC-FC-021', title: 'Password field masks input', technique: 'ECP', req: 'REQ-FC-01', priority: 'P1',
    expected: 'type=password, value kept, rendered text not shown' }, () => {
    cy.get('.action-focus').should('have.attr', 'type', 'password').type('S3cret!').should('have.value', 'S3cret!')
  })

  tc({ id: 'TC-FC-022', title: 'Focus highlights the password field and turns its label orange', technique: 'State transition', req: 'REQ-FC-03', priority: 'P1',
    expected: 'class "focus" added; label style "color: orange;"' }, () => {
    cy.get('.action-focus').focus().should('have.class', 'focus')
      .prev('label').should('have.attr', 'style', 'color: orange;')
    cy.focused().should('have.class', 'action-focus')
  })

  tc({ id: 'TC-FC-023', title: 'Blur marks the full-name field as error and turns its label red', technique: 'State transition', req: 'REQ-FC-04', priority: 'P1',
    expected: 'class "error" added; label style "color: red;"' }, () => {
    cy.get('.action-blur').type('About to blur').blur().should('have.class', 'error')
      .prev().should('have.attr', 'style', 'color: red;')
  })

  tc({ id: 'TC-FC-024', title: 'Blur without typing still marks error (blur handler is unconditional)', technique: 'ECP', req: 'REQ-FC-04',
    expected: 'class "error" after focus→blur with empty value' }, () => {
    cy.get('.action-blur').focus().blur().should('have.class', 'error')
  })

  tc({ id: 'TC-FC-025', title: 'Field is not marked before the first blur', technique: 'State transition', req: 'REQ-FC-04',
    expected: 'no "error" class while focused' }, () => {
    cy.get('.action-blur').focus().should('not.have.class', 'error')
  })

  tc({ id: 'TC-FC-026', title: 'Tabbing away (focus moves) also triggers blur', technique: 'State transition', req: 'REQ-FC-04',
    expected: 'focusing another field adds "error" to full-name' }, () => {
    cy.get('.action-blur').focus()
    cy.get('.action-clear').focus()
    cy.get('.action-blur').should('have.class', 'error')
  })

  tc({ id: 'TC-FC-027', title: 'Clear empties a filled description', technique: 'Use-case', req: 'REQ-FC-05', priority: 'P1',
    expected: 'value "" after clear' }, () => {
    cy.get('.action-clear').type('Clear this text').should('have.value', 'Clear this text').clear().should('have.value', '')
  })

  tc({ id: 'TC-FC-028', title: 'Clear on an already-empty field is harmless', technique: 'BVA', req: 'REQ-FC-05',
    expected: 'value stays ""' }, () => {
    cy.get('.action-clear').clear().should('have.value', '')
  })

  tc({ id: 'TC-FC-029', title: 'Disabled textarea cannot be typed into by a user', technique: 'ECP (invalid)', req: 'REQ-FC-12', priority: 'P1',
    expected: 'element is disabled; normal type() is refused by Cypress actionability' }, () => {
    cy.get('.action-disabled').should('be.disabled')
    cy.on('fail', (err) => {
      expect(err.message).to.include('disabled')
      return false
    })
    cy.get('.action-disabled').type('should not work', { timeout: 500 })
  })

  tc({ id: 'TC-FC-030', title: 'force:true bypasses the disabled check (test-only escape hatch)', technique: 'Error guessing', req: 'REQ-FC-12',
    expected: 'value set when forced — documents that disabled is UI-only' }, () => {
    cy.get('.action-disabled').type('forced', { force: true }).should('have.value', 'forced')
  })

  tc.knownDefect({ id: 'TC-FC-032', title: 'Pressing Enter in the email field keeps what the user typed', technique: 'Error guessing',
    req: 'REQ-FC-01', defect: 'DEF-KS-002', priority: 'P3',
    expected: 'value kept, page not reloaded (actual: implicit submission of the one-field form reloads /commands/actions? and the input is lost)' }, () => {
    cy.get('.action-email').type('keep.me@email.com{enter}')
    cy.url().should('not.contain', '?')
    cy.get('.action-email').should('have.value', 'keep.me@email.com')
  })

  tc({ id: 'TC-FC-031', title: 'Placeholders describe each field', technique: 'Use-case', req: 'REQ-FC-01',
    expected: 'Email / Password / Enter your name' }, () => {
    cy.get('.action-email').should('have.attr', 'placeholder', 'Email')
    cy.get('.action-focus').should('have.attr', 'placeholder', 'Password')
    cy.get('.action-blur').should('have.attr', 'placeholder', 'Enter your name')
  })
})
