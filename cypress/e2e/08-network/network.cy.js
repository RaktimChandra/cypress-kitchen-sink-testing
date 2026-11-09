import { tc } from '../../support/tc'

const API = 'https://jsonplaceholder.cypress.io'

describe('08 · Network — stubbing and observing requests', { tags: ['@network'] }, () => {
  beforeEach(() => cy.visitPage('/commands/network-requests'))

  tc({ id: 'TC-NW-001', title: 'Get Comment shows the body returned by the API (stubbed)', technique: 'Use-case', req: 'REQ-NW-01', priority: 'P1',
    expected: 'GET /comments/1 once; .network-comment shows stubbed body' }, () => {
    cy.intercept('GET', `${API}/comments/1`, { statusCode: 200, body: { id: 1, body: 'stubbed body' } }).as('getComment')
    cy.get('.network-btn').click()
    cy.wait('@getComment').its('request.method').should('eq', 'GET')
    cy.get('.network-comment').should('have.text', 'stubbed body')
  })

  tc({ id: 'TC-NW-002', title: 'Get Comment with a fixture response', technique: 'Use-case', req: 'REQ-NW-01',
    expected: 'body from comment.json displayed' }, () => {
    cy.intercept('GET', '**/comments/*', { fixture: 'comment.json' }).as('getComment')
    cy.get('.network-btn').click()
    cy.wait('@getComment')
    cy.fixture('comment.json').then((c) => cy.get('.network-comment').should('have.text', c.body))
  })

  tc({ id: 'TC-NW-003', title: 'Post Comment sends the documented form fields and shows success', technique: 'Use-case', req: 'REQ-NW-02', priority: 'P1',
    expected: 'POST /comments body has name/email/body; "POST successful!" shown' }, () => {
    cy.intercept('POST', `${API}/comments`, { statusCode: 201, body: { id: 501 } }).as('post')
    cy.get('.network-post').click()
    cy.wait('@post').then(({ request, response }) => {
      expect(request.body).to.include('email=hello%40cypress.io')
      expect(request.body).to.include('name=Using+POST+in+cy.intercept()')
      expect(request.headers).to.have.property('content-type').and.include('application/x-www-form-urlencoded')
      expect(response.statusCode).to.eq(201)
    })
    cy.get('.network-post-comment').should('have.text', 'POST successful!')
  })

  tc({ id: 'TC-NW-004', title: 'Update Comment shows the API error message on 404', technique: 'ECP (invalid)', req: 'REQ-NW-03', priority: 'P1',
    expected: '404 {error:"Hey Comment Not Found!"} → message shown' }, () => {
    cy.intercept('PUT', '**/comments/*', { statusCode: 404, body: { error: 'Hey Comment Not Found!' }, delay: 300 }).as('put')
    cy.get('.network-put').click()
    cy.wait('@put').its('response.statusCode').should('eq', 404)
    cy.get('.network-put-comment').should('contain', 'Hey Comment Not Found!')
  })

  tc({ id: 'TC-NW-005', title: 'Update Comment with 200 shows nothing (only 404 is handled)', technique: 'ECP', req: 'REQ-NW-03',
    expected: '.network-put-comment stays empty' }, () => {
    cy.intercept('PUT', '**/comments/*', { statusCode: 200, body: {} }).as('put')
    cy.get('.network-put').click()
    cy.wait('@put')
    cy.get('.network-put-comment').should('have.text', '')
  })

  ;[[500, 'server error'], [503, 'unavailable'], [429, 'rate limited']].forEach(([code, cls], i) => {
    tc({ id: `TC-NW-${String(6 + i).padStart(3, '0')}`, title: `Get Comment with HTTP ${code} (${cls}) leaves the comment area unchanged`,
      technique: 'ECP (invalid)', req: 'REQ-NW-01', expected: `.network-comment unchanged; no uncaught error` }, () => {
      cy.intercept('GET', '**/comments/1', { statusCode: code, body: { error: cls } }).as('err')
      cy.get('.network-comment').invoke('text').then((before) => {
        cy.get('.network-btn').click()
        cy.wait('@err')
        cy.get('.network-comment').should('have.text', before)
      })
    })
  })

  tc({ id: 'TC-NW-009', title: 'Network failure (connection dropped) is survived without a crash', technique: 'Error guessing', req: 'REQ-NW-01',
    expected: 'forceNetworkError → no comment, page still responsive' }, () => {
    cy.intercept('GET', '**/comments/1', { forceNetworkError: true }).as('down')
    cy.get('.network-btn').click()
    cy.wait('@down')
    cy.get('.network-post').should('be.enabled')
  })

  tc({ id: 'TC-NW-010', title: 'Slow API: comment appears after the stubbed 1.5 s delay', technique: 'Use-case', req: 'REQ-NW-01', type: 'Performance',
    expected: 'not shown before the response; shown after' }, () => {
    cy.intercept('GET', '**/comments/1', { body: { body: 'late' }, delay: 1500 }).as('slowComment')
    cy.get('.network-btn').click()
    cy.get('.network-comment').should('not.have.text', 'late')
    cy.wait('@slowComment')
    cy.get('.network-comment').should('have.text', 'late')
  })

  tc({ id: 'TC-NW-011', title: 'Each click issues exactly one request (no duplicate calls)', technique: 'BVA', req: 'REQ-NW-01',
    expected: '3 clicks → 3 requests' }, () => {
    cy.intercept('GET', '**/comments/1', { body: { body: 'x' } }).as('get')
    cy.get('.network-btn').click().click().click()
    cy.wait(['@get', '@get', '@get'])
    cy.get('@get.all').should('have.length', 3)
  })

  tc({ id: 'TC-NW-012', title: 'A real server response can be modified in flight (req.continue)', technique: 'Use-case', req: 'REQ-NW-01',
    expected: 'the local server\'s HTML for this page passes through a handler that rewrites its heading before the browser sees it' }, () => {
    // offline on purpose: the upstream is the local SUT server, not the third-party API
    cy.intercept('GET', '/commands/network-requests', (req) => {
      delete req.headers['if-none-match']
      delete req.headers['if-modified-since']
      req.continue((res) => {
        expect(res.statusCode, 'real upstream status').to.eq(200)
        expect(res.body, 'real upstream body').to.include('<h1>Network Requests</h1>')
        res.body = res.body.replace('<h1>Network Requests</h1>', '<h1>Rewritten by test</h1>')
      })
    }).as('page')
    cy.visit('/commands/network-requests')
    cy.wait('@page')
    cy.get('h1').should('have.text', 'Rewritten by test')
  })

  tc({ id: 'TC-NW-013', title: 'No un-stubbed third-party call is made on page load', technique: 'Error guessing', req: 'REQ-NFR-REL',
    expected: 'harness catch-all alias never hit' }, () => {
    cy.wait(500)
    cy.get('@unstubbedThirdParty.all').should('have.length', 0)
  })
})

describe('08 · Network — fixtures page and aliasing/waiting pages', { tags: ['@network'] }, () => {
  tc({ id: 'TC-NW-020', title: 'Files page: fixture button loads the comment', technique: 'Use-case', req: 'REQ-NW-04',
    expected: 'comment text from fixture' }, () => {
    cy.visitPage('/commands/files')
    cy.intercept('GET', '**/comments/*', { fixture: 'comment.json' }).as('fx')
    cy.get('.fixture-btn').click()
    cy.wait('@fx').its('response.body.name').should('eq', 'Fixture comment')
  })

  tc({ id: 'TC-NW-021', title: 'Waiting page: wait on an aliased route instead of a fixed time', technique: 'Use-case', req: 'REQ-NW-01',
    expected: 'cy.wait("@getComment") yields status 200' }, () => {
    cy.visitPage('/commands/waiting')
    cy.intercept('GET', '**/comments/*', { body: { body: 'waited' } }).as('getComment')
    cy.get('.network-btn').click()
    cy.wait('@getComment').its('response.statusCode').should('eq', 200)
    cy.get('.network-comment').should('have.text', 'waited')
  })

  tc({ id: 'TC-NW-022', title: 'Aliasing page: route alias with a spy (no stub) still counts calls', technique: 'Use-case', req: 'REQ-NW-01',
    expected: 'intercept without response, request reaches harness catch-all, alias counted once' }, () => {
    cy.visitPage('/commands/aliasing')
    cy.intercept('GET', '**/comments/*').as('spyOnly')
    cy.get('.network-btn').click()
    cy.wait('@spyOnly')
    cy.get('@spyOnly.all').should('have.length', 1)
  })
})
