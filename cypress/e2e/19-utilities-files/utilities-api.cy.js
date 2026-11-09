import { tc } from '../../support/tc'

describe('19 · Utilities, Cypress API, files', { tags: ['@utilities'] }, () => {
  tc({ id: 'TC-UT-001', title: 'Cypress._ (lodash) chains over a stubbed API response', technique: 'Use-case', req: 'REQ-AS-01',
    expected: 'ids of first 3 records = [1, 2, 3]' }, () => {
    const posts = [...Array(5).keys()].map((i) => ({ id: i + 1 }))
    expect(Cypress._.chain(posts).map('id').take(3).value()).to.deep.eq([1, 2, 3])
  })

  tc({ id: 'TC-UT-002', title: 'Cypress.$ queries the application DOM', technique: 'Use-case', req: 'REQ-QT-01',
    expected: 'clicking the first utilities item via jQuery marks it active' }, () => {
    cy.visitPage('/utilities')
    cy.document().then((d) => {
      const $li = Cypress.$('.utility-jquery li:first', d)
      cy.wrap($li).click().should('have.class', 'active')
    })
  })

  tc({ id: 'TC-UT-003', title: 'Cypress.Blob converts a base64 image to a blob URL shown in the page', technique: 'Use-case', req: 'REQ-UI-07',
    expected: 'an <img> with a blob: src is appended to .utility-blob' }, () => {
    cy.visitPage('/utilities')
    cy.get('.utility-blob').then(($div) => {
      const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      const blob = Cypress.Blob.base64StringToBlob(b64, 'image/png')
      const img = Cypress.$('<img />', { src: URL.createObjectURL(blob) })
      $div.append(img)
    })
    cy.get('.utility-blob img').should('have.attr', 'src').and('match', /^blob:/)
  })

  ;[['/users/1/comments', '/users/*/comments', true], ['/users/1/comments/2', '/users/*/comments', false], ['/some/deep/path', '/some/**', true]].forEach(([path, glob, match], i) => {
    tc({ id: `TC-UT-${String(4 + i).padStart(3, '0')}`, title: `Cypress.minimatch("${path}", "${glob}") = ${match}`, technique: 'ECP', req: 'REQ-NW-01',
      expected: String(match) }, () => {
      expect(Cypress.minimatch(path, glob, { matchBase: true })).to.eq(match)
    })
  })

  tc({ id: 'TC-UT-007', title: 'Cypress.Promise resolves inside a .then()', technique: 'Use-case', req: 'REQ-AS-01', expected: 'resolved value "foo"' }, () => {
    cy.then(() => new Cypress.Promise((res) => setTimeout(() => res('foo'), 100))).should('eq', 'foo')
  })

  tc({ id: 'TC-UT-008', title: 'Cypress API: config, platform, arch and version are available', technique: 'Use-case', req: 'REQ-NFR-COMPAT',
    expected: 'baseUrl http://localhost:8080; version 16.x' }, () => {
    expect(Cypress.config('baseUrl')).to.eq('http://localhost:8080')
    expect(Cypress.version).to.match(/^16\./)
    expect(Cypress.platform).to.be.oneOf(['linux', 'darwin', 'win32'])
    expect(Cypress.arch).to.be.a('string')
  })

  tc({ id: 'TC-UT-009', title: 'Cypress.dom.isHidden detects the hidden connectors div', technique: 'Use-case', req: 'REQ-AS-01', expected: 'isHidden = true' }, () => {
    cy.visitPage('/commands/connectors')
    cy.get('.connectors-div').then(($d) => expect(Cypress.dom.isHidden($d)).to.eq(true))
  })

  tc({ id: 'TC-UT-010', title: 'Files: fixture is read and parsed as JSON', technique: 'Use-case', req: 'REQ-NW-04', expected: 'comment.json has id 1' }, () => {
    cy.fixture('comment.json').its('id').should('eq', 1)
  })

  tc({ id: 'TC-UT-011', title: 'Files: writeFile then readFile round-trips JSON', technique: 'Use-case', req: 'REQ-NW-04',
    expected: 'object read back equals object written' }, () => {
    const data = { name: 'Raktim', course: 'SVV', at: 'SRMIST' }
    cy.writeFile('reports/tmp/roundtrip.json', data)
    cy.readFile('reports/tmp/roundtrip.json').should('deep.equal', data)
  })

  tc({ id: 'TC-UT-012', title: 'Files: reading a missing file fails with a clear error', technique: 'ECP (invalid)', req: 'REQ-NW-04',
    expected: 'readFile of a missing path errors "does not exist"' }, () => {
    cy.on('fail', (e) => { expect(e.message).to.match(/does not exist|ENOENT/i); return false })
    cy.readFile('reports/tmp/never-written.json', { timeout: 500 })
  })

  tc({ id: 'TC-UT-013', title: 'Location page: hash, url and location agree', technique: 'Use-case', req: 'REQ-NAV-04', expected: 'hash "" and url ends /commands/location' }, () => {
    cy.visitPage('/commands/location')
    cy.hash().should('be.empty')
    cy.url().should('match', /\/commands\/location$/)
  })

  tc({ id: 'TC-UT-014', title: 'Misc page: cy.wrap yields plain values and promises', technique: 'Use-case', req: 'REQ-AS-01', expected: 'wrap({a:1}).its("a") = 1; wrapped promise resolves' }, () => {
    cy.wrap({ a: 1 }).its('a').should('eq', 1)
    cy.wrap(Promise.resolve(42)).should('eq', 42)
  })

  tc({ id: 'TC-UT-015', title: 'Misc page: a screenshot of the form is captured as evidence', technique: 'Use-case', req: 'REQ-NFR-VIS', type: 'Visual',
    expected: 'screenshot file written (path reported by onAfterScreenshot)' }, () => {
    cy.visitPage('/commands/misc')
    let p
    cy.get('.misc-form').screenshot('evidence/misc-form', { overwrite: true, onAfterScreenshot (_e, props) { p = props.path } })
      .then(() => expect(p).to.match(/misc-form\.png$/))
  })
})
