import { register as registerGrep } from '@cypress/grep'
import 'cypress-real-events'
import './commands'
import { catalogue } from './tc'

registerGrep()

if (Cypress.expose('coverage')) {
  require('@cypress/code-coverage/support')
}

// write the test-case catalogue for this spec (consumed by tools/aggregate.js)
after(() => {
  cy.task('tcMeta', { spec: Cypress.spec.relative, cases: catalogue }, { log: false })
})

// The Kitchen Sink calls a public REST API (jsonplaceholder.cypress.io). Tests never depend on
// it: any un-stubbed call is answered locally so a third-party outage cannot fail the suite.
beforeEach(() => {
  cy.intercept({ hostname: 'jsonplaceholder.cypress.io' }, (req) => {
    req.reply({ statusCode: 503, body: { error: 'unstubbed third-party call blocked by test harness' } })
  }).as('unstubbedThirdParty')
})
