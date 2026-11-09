import { tc } from '../../support/tc'
const pages = require('../../fixtures/pages.json')
const known = require('../../fixtures/a11y-known.json')

describe('11 · Accessibility — axe-core WCAG 2.1 A/AA audit of every page', { tags: ['@a11y'] }, () => {
  pages.forEach((p, i) => {
    tc({ id: `TC-A11Y-${String(1 + i).padStart(3, '0')}`, title: `${p.path} has no new serious/critical WCAG 2.1 AA violations`, technique: 'Checklist (WCAG 2.1)',
      type: 'Accessibility', req: 'REQ-NFR-A11Y', priority: 'P2',
      expected: 'axe-core: 0 serious/critical violations beyond the documented known-issue baseline' }, () => {
      cy.visitPage(p.path)
      cy.checkA11y({ page: p.path, known: [...known.global, ...(known[p.path] || [])] })
    })
  })

  tc({ id: 'TC-A11Y-030', title: 'Todo app in a populated, edited state is audited too', technique: 'Checklist (WCAG 2.1)', type: 'Accessibility', req: 'REQ-NFR-A11Y',
    expected: 'no new serious/critical violations with completed + editing items' }, () => {
    cy.visitTodos([{ title: 'done', completed: true }, 'active'])
    cy.get('.todo-list li').last().find('label').dblclick()
    cy.checkA11y({ page: '/todo (state)', known: [...known.global, ...(known['/todo'] || [])] })
  })
})

/** Run one axe rule and return the nodes that violate it (no assertion). */
function axeRule (rule) {
  return cy.readFile('node_modules/axe-core/axe.min.js', { log: false }).then((src) => cy.window({ log: false }).then((win) => {
    if (!win.axe) win.eval(src)
    return win.axe.run(win.document, { runOnly: { type: 'rule', values: [rule] }, resultTypes: ['violations'] })
  })).then((res) => res.violations.reduce((n, v) => n + v.nodes.length, 0))
}

// Each known accessibility defect is pinned by a test that states the WCAG requirement. It passes
// while the defect reproduces and fails once the Kitchen Sink is fixed (see support/tc.js).
describe('11 · Accessibility — known WCAG defects', { tags: ['@a11y', '@known-defect'] }, () => {
  ;[
    ['TC-A11Y-050', 'DEF-KS-010', '/commands/actions', 'color-contrast', 'Text meets the 4.5:1 contrast minimum (WCAG 1.4.3)'],
    ['TC-A11Y-051', 'DEF-KS-011', '/commands/actions', 'label', 'Every form field has an accessible name (WCAG 4.1.2, 1.3.1)'],
    ['TC-A11Y-052', 'DEF-KS-012', '/commands/assertions', 'link-in-text-block', 'Links in text are not distinguished by colour alone (WCAG 1.4.1)'],
    ['TC-A11Y-053', 'DEF-KS-013', '/commands/actions', 'scrollable-region-focusable', 'Scrollable regions can be reached with the keyboard (WCAG 2.1.1)'],
  ].forEach(([id, defect, page, rule, title]) => {
    tc.knownDefect({ id, title: `${title} on ${page}`, technique: 'Checklist (WCAG 2.1)', type: 'Accessibility', req: 'REQ-NFR-A11Y',
      defect, priority: 'P2', data: rule, expected: `axe rule "${rule}" reports 0 violating nodes` }, () => {
      cy.visitPage(page)
      axeRule(rule).should('eq', 0)
    })
  })
})
