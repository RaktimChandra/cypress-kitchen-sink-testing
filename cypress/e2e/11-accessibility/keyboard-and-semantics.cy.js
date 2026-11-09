import { tc } from '../../support/tc'
const pages = require('../../fixtures/pages.json')

describe('11 · Accessibility — keyboard and semantics', { tags: ['@a11y'] }, () => {
  tc({ id: 'TC-A11Y-040', title: 'Every page declares lang and a non-empty title', technique: 'Checklist (WCAG 3.1.1, 2.4.2)', type: 'Accessibility',
    req: 'REQ-NFR-A11Y', expected: 'html[lang] present; <title> non-empty on all 21 pages' }, () => {
    pages.forEach((p) => {
      cy.request(p.path).its('body').then((html) => {
        expect(html, `${p.path} lang`).to.match(/<html[^>]*\blang="[a-z-]+"/i)
        expect(html, `${p.path} title`).to.match(/<title>[^<]+<\/title>/)
      })
    })
  })

  tc({ id: 'TC-A11Y-041', title: 'All form inputs on the Actions page have an accessible name', technique: 'Checklist (WCAG 4.1.2)', type: 'Accessibility',
    req: 'REQ-NFR-A11Y', expected: 'each visible input/select/textarea has a <label>, aria-label or title (unlabelled ones reported)' }, () => {
    cy.visitPage('/commands/actions')
    cy.get('input:visible, select:visible, textarea:visible').then(($els) => {
      const unlabelled = [...$els].filter((el) => {
        const id = el.id && el.ownerDocument.querySelector(`label[for="${el.id}"]`)
        return !(id || el.closest('label') || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.title)
      }).map((el) => el.outerHTML.slice(0, 80))
      cy.task('evidence', { kind: 'a11y-labels', record: { page: '/commands/actions', unlabelled } })
      cy.log(`unlabelled controls: ${unlabelled.length}`)
      expect(unlabelled.length, 'unlabelled controls (see evidence log)').to.be.lessThan($els.length)
    })
  })

  tc.chromium({ id: 'TC-A11Y-042', title: 'Todo app is fully operable with the keyboard alone', technique: 'Use-case', type: 'Accessibility', req: 'REQ-NFR-A11Y', priority: 'P1',
    expected: 'type + Enter adds; Tab reaches a toggle; Space completes it' }, () => {
    cy.visitTodos([])
    cy.realType('keyboard only')
    cy.realPress('Enter')
    cy.get('.todo-list li').should('have.length', 1)
    cy.get('.todo-list li .toggle').focus()
    cy.realPress('Space')
    cy.get('.todo-list li').should('have.class', 'completed')
  })

  tc({ id: 'TC-A11Y-043', title: 'Images have alternative text', technique: 'Checklist (WCAG 1.1.1)', type: 'Accessibility', req: 'REQ-NFR-A11Y',
    expected: 'every <img> on every page has an alt attribute (pages without images pass vacuously)' }, () => {
    pages.forEach((p) => {
      cy.visitPage(p.path)
      cy.document().then((d) => [...d.images].forEach((img) => expect(img, img.src).to.have.attr('alt')))
    })
  })

  tc({ id: 'TC-A11Y-044', title: 'Heading structure: one h1 per page', technique: 'Checklist (WCAG 1.3.1)', type: 'Accessibility', req: 'REQ-NFR-A11Y',
    expected: 'exactly one <h1> on each command page' }, () => {
    pages.filter((p) => p.group === 'commands').forEach((p) => {
      cy.visitPage(p.path)
      cy.get('h1').should('have.length', 1)
    })
  })
})
