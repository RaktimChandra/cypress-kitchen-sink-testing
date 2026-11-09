/// <reference types="cypress" />

/**
 * Visit a Kitchen Sink page with instrumentation:
 * - spies console.error (asserted by smoke/robustness tests)
 * - records uncaught page errors
 */
Cypress.Commands.add('visitPage', (url, options = {}) => {
  return cy.visit(url, {
    ...options,
    onBeforeLoad (win) {
      cy.spy(win.console, 'error').as('consoleError')
      win.__pageErrors = []
      win.addEventListener('error', (e) => win.__pageErrors.push(String(e.message)))
      if (options.onBeforeLoad) options.onBeforeLoad(win)
    },
  })
})

/** Assert that the page produced no console errors and no uncaught errors. */
Cypress.Commands.add('assertNoPageErrors', () => {
  cy.get('@consoleError').should('not.have.been.called')
  cy.window().its('__pageErrors').should('have.length', 0)
})

/** TodoMVC helpers */
Cypress.Commands.add('addTodo', (text) => {
  cy.get('.new-todo').type(`${text}{enter}`)
})
Cypress.Commands.add('resetTodos', (titles) => {
  // start from a known list: clear storage, reload, optionally replace the two seed items
  cy.clearLocalStorage()
  cy.visitPage('/todo')
  cy.get('.todo-list li').should('have.length', 2)
  if (titles) {
    cy.get('.todo-list li .destroy').each(($b) => cy.wrap($b).invoke('show').click())
    cy.get('.todo-list li').should('have.length', 0)
    titles.forEach((t) => cy.addTodo(t))
  }
})

/**
 * Accessibility audit with axe-core (WCAG 2.1 A/AA). Every violation is written to the
 * evidence log; the test fails only on impacts listed in `failOn` that are not in the
 * documented known-issue baseline for this page.
 */
Cypress.Commands.add('checkA11y', ({ page, context = 'html', failOn = ['critical', 'serious'], known = [] } = {}) => {
  cy.readFile('node_modules/axe-core/axe.min.js', { log: false }).then((src) => {
    cy.window({ log: false }).then((win) => {
      if (!win.axe) win.eval(src)
      return win.axe.run(win.document.querySelector(context) || win.document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
        resultTypes: ['violations'],
      })
    }).then((res) => {
      const violations = res.violations.map((v) => ({
        id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,
        targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
      }))
      cy.task('evidence', { kind: 'a11y', record: { page, violations } }, { log: false })
      violations.forEach((v) => cy.log(`a11y ${v.impact}: ${v.id} (${v.nodes})`))
      const blocking = violations.filter((v) => failOn.includes(v.impact) && !known.includes(v.id))
      expect(blocking.map((v) => `${v.id} [${v.impact}] ×${v.nodes}`), `new ${failOn.join('/')} accessibility violations on ${page}`).to.deep.equal([])
    })
  })
})

/** Visual regression against the per-browser baseline (see cypress/plugins/visual.js). */
Cypress.Commands.add('matchSnapshot', { prevSubject: 'optional' }, (subject, name, { threshold = 0.002 } = {}) => {
  let shotPath
  const opts = { overwrite: true, capture: 'viewport', onAfterScreenshot (_el, props) { shotPath = props.path } }
  const target = subject ? cy.wrap(subject) : cy
  target.screenshot(`visual/${name}`, opts).then(() => {
    cy.task('compareSnapshot', { name, actualPath: shotPath, threshold }).then((r) => {
      cy.task('evidence', { kind: 'visual', record: { name, ...r } }, { log: false })
      expect(['match', 'baseline-created'], `visual diff ${name}: ${(r.ratio * 100).toFixed(3)} % changed`).to.include(r.status)
    })
  })
})

/** Navigation Timing metrics of the current page. */
Cypress.Commands.add('pageMetrics', () => {
  return cy.window({ log: false }).then((win) => {
    const nav = win.performance.getEntriesByType('navigation')[0]
    const res = win.performance.getEntriesByType('resource')
    const paint = Object.fromEntries(win.performance.getEntriesByType('paint').map((p) => [p.name, p.startTime]))
    return {
      domContentLoaded: nav ? nav.domContentLoadedEventEnd : null,
      load: nav ? nav.loadEventEnd : null,
      ttfb: nav ? nav.responseStart : null,
      firstContentfulPaint: paint['first-contentful-paint'] || null,
      resources: res.length,
      transferKB: Math.round(res.reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0) / 1024),
      domNodes: win.document.getElementsByTagName('*').length,
    }
  })
})

/** Is the element fully inside its scroll container / viewport? (used by scroll tests) */
Cypress.Commands.add('isInViewport', { prevSubject: true }, (subject) => {
  const rect = subject[0].getBoundingClientRect()
  return cy.window({ log: false }).then((win) => {
    expect(rect.top, 'top edge visible').to.be.at.least(0)
    expect(rect.bottom, 'bottom edge visible').to.be.at.most(win.innerHeight)
    return cy.wrap(subject, { log: false })
  })
})

/** Open the todo app with an exact list (no seed items). Each entry: string or {title, completed}. */
Cypress.Commands.add('visitTodos', (items = []) => {
  const todos = items.map((t, i) => (typeof t === 'string' ? { title: t, completed: false, id: i + 1 } : { completed: false, id: i + 1, ...t }))
  if (todos.length) {
    return cy.visitPage('/todo', { onBeforeLoad (w) { w.localStorage.setItem('todos-vanillajs', JSON.stringify(todos)) } })
  }
  // an empty list cannot be seeded (the app re-adds its two demo items), so delete them as setup
  cy.visitPage('/todo')
  cy.get('.todo-list li').should('have.length', 2)
  cy.get('.todo-list li .destroy').each(($b) => cy.wrap($b).click({ force: true }))
  return cy.get('.todo-list li').should('have.length', 0)
})

/** Read the persisted todo list. */
Cypress.Commands.add('storedTodos', () =>
  cy.window({ log: false }).then((w) => JSON.parse(w.localStorage.getItem('todos-vanillajs') || '[]')))
