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
