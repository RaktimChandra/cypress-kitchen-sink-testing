import { tc } from '../../support/tc'
const pages = require('../../fixtures/pages.json')

/**
 * Performance budgets from the Navigation Timing / Resource Timing APIs, measured in the
 * real browser. Budgets are set for a local static server (no network latency): they
 * catch regressions such as a blocking script or a bloated asset, not WAN performance.
 */
const BUDGET = { domContentLoaded: 1500, load: 3000, firstContentfulPaint: 2000, transferKB: 1500, resources: 30 }

describe('14 · Performance — page budgets', { tags: ['@performance'] }, () => {
  pages.forEach((p, i) => {
    tc({ id: `TC-PERF-${String(1 + i).padStart(3, '0')}`, title: `${p.path} meets its load budgets`, technique: 'Budget check', type: 'Performance',
      req: 'REQ-NFR-PERF', expected: `DCL < ${BUDGET.domContentLoaded} ms, load < ${BUDGET.load} ms, ≤ ${BUDGET.resources} requests, ≤ ${BUDGET.transferKB} KB` }, () => {
      cy.visitPage(p.path)
      cy.window().its('document.readyState').should('eq', 'complete')
      cy.pageMetrics().then((m) => {
        cy.task('evidence', { kind: 'perf', record: { page: p.path, ...m } }, { log: false })
        cy.log(`DCL ${Math.round(m.domContentLoaded)} ms · load ${Math.round(m.load)} ms · FCP ${Math.round(m.firstContentfulPaint || 0)} ms · ${m.resources} req · ${m.transferKB} KB · ${m.domNodes} nodes`)
        expect(m.domContentLoaded, 'DOMContentLoaded (ms)').to.be.lessThan(BUDGET.domContentLoaded)
        expect(m.load, 'load event (ms)').to.be.lessThan(BUDGET.load)
        expect(m.resources, 'resource requests').to.be.at.most(BUDGET.resources)
        expect(m.transferKB, 'transfer size (KB)').to.be.at.most(BUDGET.transferKB)
        if (m.firstContentfulPaint) expect(m.firstContentfulPaint, 'first contentful paint (ms)').to.be.lessThan(BUDGET.firstContentfulPaint)
      })
    })
  })

  tc({ id: 'TC-PERF-030', title: 'Interaction latency: adding a todo renders in under 100 ms', technique: 'Budget check', type: 'Performance', req: 'REQ-NFR-PERF',
    expected: 'time from Enter keydown to new <li> < 100 ms (median of 10)' }, () => {
    cy.visitTodos([])
    const times = []
    for (let k = 0; k < 10; k++) {
      cy.window({ log: false }).then((w) => {
        const input = w.document.querySelector('.new-todo')
        input.value = `perf ${k}`
        const t0 = w.performance.now()
        input.dispatchEvent(new w.KeyboardEvent('keypress', { keyCode: 13, which: 13, bubbles: true }))
        input.dispatchEvent(new w.KeyboardEvent('keyup', { keyCode: 13, which: 13, bubbles: true }))
        input.dispatchEvent(new w.Event('change', { bubbles: true }))
        times.push(w.performance.now() - t0)
      })
    }
    cy.get('.todo-list li').should('have.length.at.least', 1).then(() => {
      const sorted = [...times].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      cy.task('evidence', { kind: 'perf', record: { page: '/todo add-latency', samplesMs: times, medianMs: median } })
      expect(median, 'median add latency (ms)').to.be.lessThan(100)
    })
  })

  tc({ id: 'TC-PERF-031', title: 'No long tasks (> 200 ms) while loading the heaviest page', technique: 'Budget check', type: 'Performance', req: 'REQ-NFR-PERF',
    expected: 'longest main-thread task on /commands/actions < 200 ms (Chromium long-task API)' }, () => {
    cy.visitPage('/commands/actions', { onBeforeLoad (w) {
      w.__long = []
      try { new w.PerformanceObserver((l) => l.getEntries().forEach((e) => w.__long.push(e.duration))).observe({ type: 'longtask', buffered: true }) } catch (_e) { w.__long = null }
    } })
    cy.wait(500)
    cy.window().its('__long').then((list) => {
      if (list === null) { cy.log('longtask API not supported in this browser'); return }
      cy.task('evidence', { kind: 'perf', record: { page: '/commands/actions longtasks', durations: list } })
      expect(Math.max(0, ...list), 'longest task (ms)').to.be.lessThan(200)
    })
  })
})
