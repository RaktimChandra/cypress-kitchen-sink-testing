import { tc } from '../../support/tc'

/** Red pixel within a small window around canvas coordinate (x, y)? */
function expectDotNear (x, y) {
  cy.get('#action-canvas').should(($c) => {
    const ctx = $c[0].getContext('2d')
    const r = 6
    const x0 = Math.max(0, Math.round(x) - r)
    const y0 = Math.max(0, Math.round(y) - r)
    const { data } = ctx.getImageData(x0, y0, 2 * r + 1, 2 * r + 1)
    let red = 0
    for (let i = 0; i < data.length; i += 4) if (data[i] > 200 && data[i + 1] < 60 && data[i + 2] < 60 && data[i + 3] > 200) red++
    expect(red, `red pixels near (${x}, ${y})`).to.be.greaterThan(0)
  })
}
function expectCanvasBlank () {
  cy.get('#action-canvas').should(($c) => {
    const { data } = $c[0].getContext('2d').getImageData(0, 0, $c[0].width, $c[0].height)
    expect([...data].some((v, i) => i % 4 === 3 && v > 0), 'any painted pixel').to.eq(false)
  })
}

describe('04 · UI interactions — click', { tags: ['@ui'] }, () => {
  beforeEach(() => cy.visitPage('/commands/actions'))

  tc({ id: 'TC-UI-001', title: 'Canvas is blank before any click', technique: 'State transition', req: 'REQ-UI-01',
    expected: 'no painted pixel' }, () => { expectCanvasBlank() })

  // the 9 named click positions: canvas is 250×250 inside a 1 px border
  const W = 250
  const positions = {
    topLeft: [0, 0], top: [W / 2, 0], topRight: [W, 0], left: [0, W / 2], center: [W / 2, W / 2],
    right: [W, W / 2], bottomLeft: [0, W], bottom: [W / 2, W], bottomRight: [W, W],
  }
  Object.entries(positions).forEach(([pos, [x, y]], i) => {
    tc({ id: `TC-UI-${String(2 + i).padStart(3, '0')}`, title: `Click canvas at "${pos}" paints a dot there`, technique: 'BVA',
      req: 'REQ-UI-01', priority: pos === 'center' ? 'P1' : 'P2', expected: `red dot near canvas (${x}, ${y})` }, () => {
      cy.get('#action-canvas').click(pos)
      expectDotNear(Math.min(Math.max(x, 1), W - 1), Math.min(Math.max(y, 1), W - 1))
    })
  })

  ;[[80, 75], [170, 75], [80, 165], [170, 165]].forEach(([x, y], i) => {
    tc({ id: `TC-UI-${String(11 + i).padStart(3, '0')}`, title: `Click canvas at coordinates (${x}, ${y})`, technique: 'ECP', req: 'REQ-UI-01',
      expected: 'red dot at the clicked point' }, () => {
      cy.get('#action-canvas').click(x, y)
      expectDotNear(x - 1, y - 1)
    })
  })

  tc({ id: 'TC-UI-015', title: 'Four clicks draw four separate dots (smiley demo)', technique: 'Use-case', req: 'REQ-UI-01',
    expected: 'dots at all four points' }, () => {
    const pts = [[80, 75], [170, 75], [80, 165], [170, 165]]
    pts.forEach(([x, y]) => cy.get('#action-canvas').click(x, y))
    pts.forEach(([x, y]) => expectDotNear(x - 1, y - 1))
  })

  tc({ id: 'TC-UI-016', title: 'Click toggles the popover open and closed', technique: 'State transition', req: 'REQ-UI-02', priority: 'P1',
    expected: 'click → popover "This popover shows up on click" visible; click again → removed' }, () => {
    cy.get('.action-btn').click()
    cy.get('.popover').should('be.visible').and('contain.text', 'This popover shows up on click')
    cy.get('.action-btn').click()
    cy.get('.popover').should('not.exist')
  })

  tc({ id: 'TC-UI-017', title: 'Click multiple labels with {multiple:true}', technique: 'Use-case', req: 'REQ-UI-02',
    expected: '6 labels → 6 popovers saying "clicked"' }, () => {
    cy.get('.action-labels>.label').should('have.length', 6).click({ multiple: true })
    cy.get('.popover').should('have.length', 6).each(($p) => expect($p.text()).to.contain('clicked'))
  })

  tc({ id: 'TC-UI-018', title: 'Covered button is not clickable by a user', technique: 'ECP (invalid)', req: 'REQ-UI-03', priority: 'P1',
    expected: 'click() refused: element covered by .opacity-cover' }, () => {
    cy.on('fail', (e) => { expect(e.message).to.match(/covered|being covered/i); return false })
    cy.get('.action-opacity>.btn').click({ timeout: 500 })
  })

  tc({ id: 'TC-UI-019', title: 'force:true clicks the covered button and opens its popover', technique: 'Error guessing', req: 'REQ-UI-03',
    expected: 'popover text "This popover shows up because we forced the click on the button"' }, () => {
    cy.get('.action-opacity>.btn').click({ force: true })
    cy.get('.popover').should('contain.text', 'we forced the click')
  })

  tc({ id: 'TC-UI-020', title: 'Opacity cover is semi-transparent red overlay', technique: 'Use-case', req: 'REQ-UI-03',
    expected: 'position absolute, opacity 0.7' }, () => {
    cy.get('.opacity-cover').should('have.css', 'position', 'absolute').and('have.css', 'opacity', '0.7')
  })

  tc({ id: 'TC-UI-021', title: 'Click with modifier keys sets the event flags', technique: 'Use-case', req: 'REQ-UI-01',
    expected: 'click event has ctrlKey and shiftKey true' }, () => {
    const spy = cy.spy().as('clk')
    cy.get('#action-canvas').then(($c) => $c.on('click', (e) => spy({ ctrl: e.ctrlKey, shift: e.shiftKey })))
    cy.get('#action-canvas').click({ ctrlKey: true, shiftKey: true })
    cy.get('@clk').should('have.been.calledWith', { ctrl: true, shift: true })
  })
})
