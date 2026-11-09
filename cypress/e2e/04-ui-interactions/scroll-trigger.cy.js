import { tc } from '../../support/tc'

describe('04 · UI interactions — scrolling and triggered events', { tags: ['@ui'] }, () => {
  beforeEach(() => cy.visitPage('/commands/actions'))

  ;['#scroll-horizontal', '#scroll-vertical', '#scroll-both'].forEach((sel, i) => {
    tc({ id: `TC-UI-${String(30 + i).padStart(3, '0')}`, title: `scrollIntoView reveals the hidden button in ${sel}`, technique: 'Use-case',
      req: 'REQ-UI-06', priority: 'P1', expected: 'button outside the container viewport → after scrollIntoView fully inside it' }, () => {
      const insideBox = (expected) => ($b) => {
        const b = $b[0].getBoundingClientRect()
        const c = $b.closest(sel)[0].getBoundingClientRect()
        const inside = b.left >= c.left - 1 && b.right <= c.right + 1 && b.top >= c.top - 1 && b.bottom <= c.bottom + 1
        expect(inside, 'button inside the visible box of its container').to.eq(expected)
      }
      cy.get(`${sel} button`).should(insideBox(false))
      cy.get(`${sel} button`).scrollIntoView().should(insideBox(true))
      cy.get(sel).then(($c) => expect($c[0].scrollLeft + $c[0].scrollTop, 'container scrolled').to.be.greaterThan(0))
    })
  })

  // scrollTo named positions on the 2-D scrollable box: BVA on scrollLeft/scrollTop (0, middle, max)
  const named = {
    topLeft: [0, 0], top: [0.5, 0], topRight: [1, 0], left: [0, 0.5], center: [0.5, 0.5],
    right: [1, 0.5], bottomLeft: [0, 1], bottom: [0.5, 1], bottomRight: [1, 1],
  }
  Object.entries(named).forEach(([pos, [fx, fy]], i) => {
    tc({ id: `TC-UI-${String(33 + i).padStart(3, '0')}`, title: `scrollTo("${pos}") on #scrollable-both`, technique: 'BVA', req: 'REQ-UI-06',
      expected: `scrollLeft ≈ ${fx}·maxX, scrollTop ≈ ${fy}·maxY` }, () => {
      cy.get('#scrollable-both').scrollTo(pos).should(($el) => {
        const el = $el[0]
        const maxX = el.scrollWidth - el.clientWidth
        const maxY = el.scrollHeight - el.clientHeight
        expect(el.scrollLeft).to.be.closeTo(fx * maxX, 2)
        expect(el.scrollTop).to.be.closeTo(fy * maxY, 2)
      })
    })
  })

  ;[['250px', 250], ['75%', null]].forEach(([arg, px], i) => {
    tc({ id: `TC-UI-${String(42 + i).padStart(3, '0')}`, title: `scrollTo("${arg}") horizontally`, technique: 'ECP', req: 'REQ-UI-06',
      expected: px ? `scrollLeft = ${px}` : 'scrollLeft = 75 % of max' }, () => {
      cy.get('#scrollable-horizontal').scrollTo(arg).should(($el) => {
        const max = $el[0].scrollWidth - $el[0].clientWidth
        expect($el[0].scrollLeft).to.be.closeTo(px != null ? px : 0.75 * max, 2)
      })
    })
  })

  tc({ id: 'TC-UI-044', title: 'scrollTo beyond the maximum clamps at the end', technique: 'BVA (invalid)', req: 'REQ-UI-06',
    expected: 'scrollTop = scrollHeight − clientHeight' }, () => {
    cy.get('#scrollable-vertical').scrollTo(0, 100000, { ensureScrollable: false }).should(($el) => {
      expect($el[0].scrollTop).to.be.closeTo($el[0].scrollHeight - $el[0].clientHeight, 1)
    })
  })

  tc({ id: 'TC-UI-045', title: 'Animated scroll (duration 300 ms) reaches the target', technique: 'Use-case', req: 'REQ-UI-06',
    expected: 'scrollTop at max after the animation' }, () => {
    cy.get('#scrollable-vertical').scrollTo('bottom', { duration: 300 }).should(($el) => {
      expect($el[0].scrollTop).to.be.closeTo($el[0].scrollHeight - $el[0].clientHeight, 2)
    })
  })

  tc({ id: 'TC-UI-046', title: 'Window scroll to bottom and back to top', technique: 'BVA', req: 'REQ-UI-06',
    expected: 'window.scrollY = max then 0' }, () => {
    cy.scrollTo('bottom')
    cy.window().its('scrollY').should('be.greaterThan', 0)
    cy.scrollTo('top')
    cy.window().its('scrollY').should('eq', 0)
  })

  tc({ id: 'TC-UI-047', title: 'trigger("change") on the range updates the echo', technique: 'Use-case', req: 'REQ-FC-11', priority: 'P1',
    expected: 'echo "25"' }, () => {
    cy.get('.trigger-input-range').invoke('val', 25).trigger('change').get('input[type=range]').siblings('p').should('have.text', '25')
  })

  tc({ id: 'TC-UI-048', title: 'Synthetic mouse events reach handlers (mouseover/mousedown/mouseup)', technique: 'Use-case', req: 'REQ-UI-02',
    expected: 'each listener called once' }, () => {
    const events = ['mouseover', 'mousedown', 'mouseup']
    cy.get('.action-btn').then(($b) => events.forEach((ev) => $b.on(ev, cy.spy().as(ev))))
    events.forEach((ev) => cy.get('.action-btn').trigger(ev))
    events.forEach((ev) => cy.get(`@${ev}`).should('have.been.calledOnce'))
  })

  tc.chromium({ id: 'TC-UI-049', title: 'Real hover (CDP) fires mouseenter on the popover button', technique: 'Use-case', req: 'REQ-UI-02',
    expected: 'mouseenter listener called' }, () => {
    cy.get('.action-btn').then(($b) => $b.on('mouseenter', cy.spy().as('enter')))
    cy.get('.action-btn').realHover()
    cy.get('@enter').should('have.been.called')
  })
})
