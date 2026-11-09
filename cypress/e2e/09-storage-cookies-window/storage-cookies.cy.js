import { tc } from '../../support/tc'

const LS = { prop1: 'red', prop2: 'blue', prop3: 'magenta' }
const SS = { prop4: 'cyan', prop5: 'yellow', prop6: 'black' }

describe('09 · Storage', { tags: ['@storage'] }, () => {
  beforeEach(() => cy.visitPage('/commands/storage'))

  tc({ id: 'TC-ST-001', title: 'Populate button writes three localStorage and three sessionStorage keys', technique: 'Use-case', req: 'REQ-ST-01', priority: 'P1',
    expected: 'localStorage prop1..3, sessionStorage prop4..6 with documented colours' }, () => {
    cy.get('.ls-btn').click()
    cy.getAllLocalStorage().should((all) => expect(all['http://localhost:8080']).to.deep.equal(LS))
    cy.getAllSessionStorage().should((all) => expect(all['http://localhost:8080']).to.deep.equal(SS))
  })

  tc({ id: 'TC-ST-002', title: 'Storage is empty before the button is clicked', technique: 'BVA', req: 'REQ-ST-01',
    expected: 'no entries for this origin' }, () => {
    cy.window().its('localStorage.length').should('eq', 0)
  })

  const clears = [
    ['all keys', [], []],
    ['one key', ['prop1'], ['prop2', 'prop3']],
    ['keys matching a regex', [/prop1|prop2/], ['prop3']],
  ]
  clears.forEach(([what, args, remaining], i) => {
    tc({ id: `TC-ST-${String(3 + i).padStart(3, '0')}`, title: `clearLocalStorage(${what}) leaves ${remaining.join(', ') || 'nothing'}`, technique: 'ECP',
      req: 'REQ-ST-01', expected: `remaining keys: [${remaining.join(', ')}]` }, () => {
      cy.get('.ls-btn').click()
      cy.window().its('localStorage.length').should('eq', 3)
      cy.clearLocalStorage(...args)
      cy.window().should((w) => expect(Object.keys(w.localStorage).sort()).to.deep.equal(remaining))
    })
  })

  tc({ id: 'TC-ST-006', title: 'clearAllSessionStorage empties sessionStorage only', technique: 'ECP', req: 'REQ-ST-01',
    expected: 'session 0 keys; local still 3' }, () => {
    cy.get('.ls-btn').click()
    cy.clearAllSessionStorage()
    cy.window().its('sessionStorage.length').should('eq', 0)
    cy.window().its('localStorage.length').should('eq', 3)
  })

  tc({ id: 'TC-ST-007', title: 'Test isolation: storage written in one test is gone in the next', technique: 'Error guessing', req: 'REQ-ST-01',
    expected: 'fresh test starts with 0 keys (testIsolation)' }, () => {
    cy.window().its('localStorage.length').should('eq', 0)
  })
})

describe('09 · Cookies', { tags: ['@storage'] }, () => {
  beforeEach(() => cy.visitPage('/commands/cookies'))

  tc({ id: 'TC-CK-001', title: 'Set-a-cookie button sets token=123ABC', technique: 'Use-case', req: 'REQ-ST-02', priority: 'P1',
    expected: 'cookie token with value 123ABC on localhost' }, () => {
    cy.get('#getCookie .set-a-cookie').click()
    cy.getCookie('token').should('have.property', 'value', '123ABC')
    cy.getCookie('token').should('have.property', 'domain', 'localhost')
  })

  tc({ id: 'TC-CK-002', title: 'getCookies returns exactly the one cookie', technique: 'BVA', req: 'REQ-ST-02',
    expected: '0 cookies before, 1 after' }, () => {
    cy.getCookies().should('have.length', 0)
    cy.get('#getCookies .set-a-cookie').click()
    cy.getCookies().should('have.length', 1).its('0.name').should('eq', 'token')
  })

  tc({ id: 'TC-CK-003', title: 'clearCookie removes only the named cookie', technique: 'ECP', req: 'REQ-ST-02',
    expected: 'token removed, extra cookie kept' }, () => {
    cy.setCookie('keep', 'me')
    cy.get('#clearCookie .set-a-cookie').click()
    cy.clearCookie('token')
    cy.getCookie('token').should('be.null')
    cy.getCookie('keep').should('have.property', 'value', 'me')
  })

  tc({ id: 'TC-CK-004', title: 'clearCookies removes all cookies of the domain', technique: 'ECP', req: 'REQ-ST-02',
    expected: '0 cookies' }, () => {
    cy.setCookie('a', '1')
    cy.get('#clearCookies .set-a-cookie').click()
    cy.clearCookies()
    cy.getCookies().should('have.length', 0)
  })

  tc({ id: 'TC-CK-005', title: 'setCookie with attributes round-trips', technique: 'Use-case', req: 'REQ-ST-02',
    expected: 'path /, sameSite lax, not httpOnly' }, () => {
    cy.setCookie('pref', 'dark', { path: '/', sameSite: 'lax' })
    cy.getCookie('pref').should('include', { value: 'dark', path: '/', sameSite: 'lax', httpOnly: false })
  })

  tc({ id: 'TC-CK-006', title: 'Cookie set by page script is readable from document.cookie (not HttpOnly)', technique: 'Error guessing', req: 'REQ-NFR-SEC', type: 'Security',
    expected: 'document.cookie contains token=123ABC — a session token must never be script-readable (observation SEC-OBS-03)' }, () => {
    cy.get('#getCookie .set-a-cookie').click()
    cy.document().its('cookie').should('contain', 'token=123ABC')
  })
})
