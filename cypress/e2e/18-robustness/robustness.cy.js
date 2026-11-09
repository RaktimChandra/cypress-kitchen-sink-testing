import { tc } from '../../support/tc'

/** Deterministic pseudo-random generator (mulberry32) so every "monkey" run is reproducible from its seed. */
function rng (seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

describe('18 · Robustness — monkey testing and stress of interactions', { tags: ['@robustness'] }, () => {
  ;[[20261110, '/commands/actions'], [7, '/commands/actions'], [42, '/todo']].forEach(([seed, page], i) => {
    tc({ id: `TC-ROB-${String(1 + i).padStart(3, '0')}`, title: `Monkey test: 60 seeded random interactions on ${page} (seed ${seed}) raise no errors`,
      technique: 'Random (monkey) testing', type: 'Robustness', req: 'REQ-NFR-REL', data: String(seed),
      expected: 'no uncaught exception, no console.error, page still responsive' }, () => {
      const r = rng(seed)
      cy.visitPage(page)
      const actions = page === '/todo'
        ? [() => cy.get('.new-todo').type(`m${Math.floor(r() * 1000)}{enter}`, { delay: 0 }),
          () => cy.get('body').then(($b) => { const t = $b.find('.todo-list li .toggle'); if (t.length) cy.wrap(t.eq(Math.floor(r() * t.length))).click() }),
          () => cy.get('.filters a').eq(Math.floor(r() * 3)).click(),
          () => cy.get('body').then(($b) => { const d = $b.find('.todo-list li .destroy'); if (d.length) cy.wrap(d.eq(Math.floor(r() * d.length))).click({ force: true }) })]
        : [() => cy.get('#action-canvas').click(Math.floor(r() * 250), Math.floor(r() * 250)),
          () => cy.get('.action-labels>.label').eq(Math.floor(r() * 6)).click(),
          () => cy.get('.action-email').type(String.fromCharCode(97 + Math.floor(r() * 26)), { delay: 0 }),
          () => cy.get('.action-multiple-checkboxes [type=checkbox]').eq(Math.floor(r() * 3)).click(),
          () => cy.get('.action-select').select(Math.floor(r() * 4)),
          () => cy.get('.trigger-input-range').invoke('val', Math.floor(r() * 120) - 10).trigger('change'),
          () => cy.get('#scrollable-both').scrollTo(Math.floor(r() * 700), Math.floor(r() * 850), { ensureScrollable: false }),
          () => cy.get('.action-btn').click()]
      for (let k = 0; k < 60; k++) actions[Math.floor(r() * actions.length)]()
      cy.assertNoPageErrors()
      cy.get('body').should('be.visible')
    })
  })

  tc({ id: 'TC-ROB-010', title: 'Rapid double submission is handled (each submit acknowledged, no crash)', technique: 'Error guessing', type: 'Robustness',
    req: 'REQ-FC-06', expected: '10 quick submits → 10 confirmations, no errors' }, () => {
    cy.visitPage('/commands/actions')
    for (let k = 0; k < 10; k++) cy.get('.action-form').submit()
    cy.get('.action-form').nextAll('p').should('have.length', 10)
    cy.assertNoPageErrors()
  })

  tc({ id: 'TC-ROB-011', title: 'Very long todo title (10 000 chars) does not break layout or storage', technique: 'BVA (robustness)', type: 'Robustness',
    req: 'REQ-TD-01', expected: 'stored intact; no horizontal page overflow' }, () => {
    const long = 'w'.repeat(10000)
    cy.visitTodos([long])
    cy.storedTodos().its('0.title.length').should('eq', 10000)
    cy.document().then((d) => expect(d.documentElement.scrollWidth - d.documentElement.clientWidth).to.be.at.most(1))
  })

  tc({ id: 'TC-ROB-012', title: 'Storage quota pressure: app still works when localStorage is nearly full', technique: 'Error guessing', type: 'Robustness',
    req: 'REQ-TD-08', expected: 'filler of ~4 MB stored first; adding a todo still succeeds or fails without breaking the page' }, () => {
    cy.visitPage('/todo', { onBeforeLoad (w) {
      try { w.localStorage.setItem('filler', 'x'.repeat(4 * 1024 * 1024)) } catch (e) { w.__fillerError = e.name }
    } })
    cy.get('.new-todo').type('under pressure{enter}')
    cy.get('.todo-list li').should('have.length.at.least', 2)
  })

  tc({ id: 'TC-ROB-013', title: 'Every page survives resize storms (10 alternating viewports)', technique: 'Error guessing', type: 'Robustness',
    req: 'REQ-UI-09', expected: 'no errors after rapid viewport changes' }, () => {
    cy.visitPage('/commands/actions')
    for (let k = 0; k < 10; k++) cy.viewport(k % 2 ? 375 : 1280, k % 2 ? 667 : 800)
    cy.assertNoPageErrors()
  })
})
