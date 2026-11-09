import { tc } from '../../support/tc'

const payloads = [
  ['script tag', '<script>window.__xss=1</script>'],
  ['img onerror', '<img src=x onerror="window.__xss=1">'],
  ['svg onload', '<svg onload="window.__xss=1">'],
  ['javascript: URL in anchor', '<a href="javascript:window.__xss=1">x</a>'],
  ['attribute break-out', '" onmouseover="window.__xss=1'],
  ['template literal', '${window.__xss=1}'],
  ['HTML entity smuggling', '&lt;script&gt;window.__xss=1&lt;/script&gt;'],
  ['iframe srcdoc', '<iframe srcdoc="<script>parent.__xss=1</script>">'],
]

describe('15 · Security — stored XSS through todo titles', { tags: ['@security'] }, () => {
  payloads.forEach(([name, payload], i) => {
    tc({ id: `TC-SEC-${String(1 + i).padStart(3, '0')}`, title: `XSS payload "${name}" is stored and shown as plain text, never executed`, technique: 'Error guessing',
      type: 'Security', req: 'REQ-TD-09', priority: 'P1', data: payload,
      expected: 'label textContent equals the payload; no element injected; window.__xss undefined (also after reload from storage)' }, () => {
      cy.visitTodos([])
      cy.get('.new-todo').type(payload, { parseSpecialCharSequences: false, delay: 0 })
      cy.get('.new-todo').type('{enter}')
      cy.get('.todo-list li label').should('have.text', payload)
      cy.get('.todo-list li label').children().should('have.length', 0)
      cy.window().its('__xss').should('be.undefined')
      cy.reload()
      cy.get('.todo-list li label').should('have.text', payload)
      cy.window().its('__xss').should('be.undefined')
    })
  })

  tc({ id: 'TC-SEC-010', title: 'Edited titles are escaped too (edit path, not only create)', technique: 'Error guessing', type: 'Security', req: 'REQ-TD-09',
    expected: 'payload saved via edit shows as text' }, () => {
    cy.visitTodos(['safe'])
    cy.get('.todo-list li label').dblclick()
    cy.get('.todo-list li .edit').clear().type('<b id="inj">bold</b>{enter}', { parseSpecialCharSequences: true })
    cy.get('#inj').should('not.exist')
    cy.get('.todo-list li label').should('have.text', '<b id="inj">bold</b>')
  })
})

describe('15 · Security — response headers and page hygiene', { tags: ['@security'] }, () => {
  // headers a production deployment should send; the demo server sends none → recorded as observations
  const headers = [
    ['content-security-policy', 'Content-Security-Policy'],
    ['x-frame-options', 'X-Frame-Options (clickjacking)'],
    ['x-content-type-options', 'X-Content-Type-Options: nosniff'],
    ['referrer-policy', 'Referrer-Policy'],
    ['strict-transport-security', 'Strict-Transport-Security (HTTPS only)'],
  ]
  headers.forEach(([h, label], i) => {
    tc({ id: `TC-SEC-${String(20 + i).padStart(3, '0')}`, title: `Security header audit: ${label}`, technique: 'Checklist (OWASP Secure Headers)', type: 'Security',
      req: 'REQ-NFR-SEC', priority: 'P3', expected: 'presence recorded; absence logged as observation (not a failure for a local demo server)' }, () => {
      cy.request('/').then((r) => {
        const present = Object.prototype.hasOwnProperty.call(r.headers, h)
        cy.task('evidence', { kind: 'security', record: { check: label, present, value: r.headers[h] || null } })
        cy.log(`${label}: ${present ? r.headers[h] : 'MISSING (observation)'}`)
        expect(r.status).to.eq(200)
      })
    })
  })

  tc({ id: 'TC-SEC-030', title: 'Server does not disclose its software version', technique: 'Checklist (OWASP)', type: 'Security', req: 'REQ-NFR-SEC',
    expected: 'no Server / X-Powered-By header' }, () => {
    cy.request('/').its('headers').should((h) => {
      expect(h).not.to.have.property('x-powered-by')
      expect(h).not.to.have.property('server')
    })
  })

  tc({ id: 'TC-SEC-031', title: 'No mixed or insecure third-party script sources', technique: 'Checklist (OWASP)', type: 'Security', req: 'REQ-NFR-SEC',
    expected: 'every <script src> is same-origin (no http:// CDN)' }, () => {
    cy.visitPage('/commands/actions')
    cy.get('script[src]').each(($s) => expect($s.attr('src')).to.match(/^\//))
  })

  tc.knownDefect({ id: 'TC-SEC-032', title: 'External links opened in new tabs use rel="noopener"', technique: 'Checklist (OWASP)', type: 'Security', req: 'REQ-NFR-SEC',
    defect: 'DEF-KS-007', priority: 'P4',
    expected: 'every a[target=_blank] has rel noopener/noreferrer (actual: 2 links on the home page lack it — reverse-tabnabbing in old browsers)' }, () => {
    cy.visitPage('/')
    cy.get('body').then(($b) => {
      const bad = [...$b[0].querySelectorAll('a[target=_blank]')].filter((a) => !/noopener|noreferrer/.test(a.rel || '')).map((a) => a.href)
      cy.task('evidence', { kind: 'security', record: { check: 'target=_blank without noopener', offenders: bad } })
      expect(bad).to.deep.equal([])
    })
  })

  tc.knownDefect({ id: 'TC-SEC-033', title: 'Directory listing is not exposed for asset folders', technique: 'Error guessing', type: 'Security', req: 'REQ-NFR-SEC',
    defect: 'DEF-KS-006', priority: 'P3',
    expected: 'GET /assets/js/ does not list files (actual: the dev server returns an HTML index of the folder)' }, () => {
    cy.request({ url: '/assets/js/', failOnStatusCode: false }).then((r) => {
      cy.task('evidence', { kind: 'security', record: { check: 'directory listing /assets/js/', status: r.status, listsFiles: /scripts\.js/.test(r.body) } })
      expect(r.status === 404 || !/scripts\.js/.test(r.body), 'directory listing exposed').to.eq(true)
    })
  })

  tc({ id: 'TC-SEC-034', title: 'No secrets or tokens left in page source', technique: 'Error guessing', type: 'Security', req: 'REQ-NFR-SEC',
    expected: 'no strings resembling API keys / passwords in any page' }, () => {
    const pages = require('../../fixtures/pages.json')
    pages.forEach((p) => {
      cy.request(p.path).its('body').then((html) => {
        expect(html, p.path).not.to.match(/(api[_-]?key|secret|password)\s*[:=]\s*["'][A-Za-z0-9_\-]{12,}/i)
        expect(html, p.path).not.to.match(/AKIA[0-9A-Z]{16}/)
      })
    })
  })
})
