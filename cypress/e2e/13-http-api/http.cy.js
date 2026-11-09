import { tc } from '../../support/tc'
const pages = require('../../fixtures/pages.json')

describe('13 · HTTP level — status codes, headers, assets', { tags: ['@api'] }, () => {
  pages.forEach((p, i) => {
    tc({ id: `TC-API-${String(1 + i).padStart(3, '0')}`, title: `GET ${p.path} → 200 text/html, no-cache, < 500 ms`, technique: 'ECP', type: 'API',
      req: 'REQ-NAV-04', priority: 'P1', expected: 'status 200; content-type text/html; cache-control no-cache; duration < 500 ms' }, () => {
      cy.request(p.path).then((r) => {
        expect(r.status).to.eq(200)
        expect(r.headers['content-type']).to.match(/^text\/html/)
        expect(r.headers['cache-control']).to.eq('no-cache')
        expect(r.duration).to.be.lessThan(500)
        expect(r.body).to.contain('<!DOCTYPE html>')
      })
    })
  })

  tc({ id: 'TC-API-030', title: 'Every stylesheet and script referenced by every page loads (no broken asset)', technique: 'ECP', type: 'API',
    req: 'REQ-NFR-REL', priority: 'P1', expected: 'each local href/src returns 200 with a matching content-type' }, () => {
    const seen = new Set()
    pages.forEach((p) => {
      cy.request(p.path).its('body').then((html) => {
        const refs = [...html.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
        refs.filter((u) => !seen.has(u)).forEach((u) => {
          seen.add(u)
          cy.request(u).then((r) => {
            expect(r.status, u).to.eq(200)
            if (u.endsWith('.css')) expect(r.headers['content-type'], u).to.match(/text\/css/)
            if (u.endsWith('.js')) expect(r.headers['content-type'], u).to.match(/javascript/)
          })
        })
      })
    })
    cy.then(() => expect(seen.size, 'distinct assets checked').to.be.greaterThan(5))
  })

  tc.knownDefect({ id: 'TC-API-031', title: 'Every internal link on every page resolves (link checker)', technique: 'ECP', type: 'API', req: 'REQ-NAV-04',
    priority: 'P3', defect: 'DEF-KS-005',
    expected: 'all distinct local <a href> targets return 200 (actual: /shirts and /pants on the Traversal page return 404)' }, () => {
    const seen = new Set()
    const broken = []
    pages.forEach((p) => {
      cy.request(p.path).its('body').then((html) => {
        const links = [...html.matchAll(/<a[^>]+href="(\/[^"#]*)"/g)].map((m) => m[1]).filter((u) => u && !seen.has(u))
        links.forEach((u) => {
          seen.add(u)
          cy.request({ url: u, failOnStatusCode: false }).then((r) => { if (r.status !== 200) broken.push(`${p.path} → ${u} (${r.status})`) })
        })
      })
    })
    cy.then(() => {
      cy.task('evidence', { kind: 'links', record: { checked: [...seen], broken } })
      expect(broken, 'broken internal links').to.deep.equal([])
    })
  })

  const negatives = [
    ['/does-not-exist', 404], ['/commands/unknown', 404], ['/assets/js/missing.js', 404], ['/assets/css/missing.css', 404],
  ]
  negatives.forEach(([url, code], i) => {
    tc({ id: `TC-API-${String(32 + i).padStart(3, '0')}`, title: `GET ${url} → ${code}`, technique: 'ECP (invalid)', type: 'API',
      req: 'REQ-NAV-04', expected: `status ${code}` }, () => {
      cy.request({ url, failOnStatusCode: false }).its('status').should('eq', code)
    })
  })

  ;['HEAD', 'POST', 'PUT', 'DELETE'].forEach((method, i) => {
    tc({ id: `TC-API-${String(36 + i).padStart(3, '0')}`, title: `${method} / never errors and never changes the served content`, technique: 'ECP', type: 'API',
      req: 'REQ-NAV-04', expected: `${method} → status < 500; ETag of GET / identical before and after (static content is immutable)` }, () => {
      cy.request('/').its('headers.etag').then((before) => {
        cy.request({ method, url: '/', failOnStatusCode: false }).then((r) => {
          expect(r.status, `${method} status`).to.be.lessThan(500)
          cy.task('evidence', { kind: 'security', record: { check: `HTTP ${method} /`, status: r.status, note: r.status === 200 ? 'static server answers non-GET methods with 200 (observation)' : 'rejected' } })
        })
        cy.request('/').its('headers.etag').should('eq', before)
      })
    })
  })

  tc({ id: 'TC-API-040', title: 'ETag supports conditional GET (304 Not Modified)', technique: 'Use-case', type: 'API', req: 'REQ-NFR-PERF',
    expected: 'second request with If-None-Match → 304' }, () => {
    cy.request('/').then((r) => {
      expect(r.headers).to.have.property('etag')
      cy.request({ url: '/', headers: { 'If-None-Match': r.headers.etag }, failOnStatusCode: false }).its('status').should('eq', 304)
    })
  })

  tc({ id: 'TC-API-041', title: 'Responses are compressed when the client accepts gzip', technique: 'Use-case', type: 'API', req: 'REQ-NFR-PERF',
    expected: 'Vary: Accept-Encoding present' }, () => {
    cy.request({ url: '/', headers: { 'Accept-Encoding': 'gzip' } }).its('headers.vary').should('match', /Accept-Encoding/i)
  })
})
