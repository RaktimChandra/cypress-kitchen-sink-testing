# Defect log

Defects found in the Cypress Kitchen Sink (commit `f2cb767`). Each one is reproduced on every CI run by a *known-defect* test (`tc.knownDefect`). That test passes while the defect is present and fails once the defect is fixed.

| ID | Title | Severity | Priority | Test |
|---|---|---|---|---|
| DEF-KS-001 | Unknown todo route throws and blanks the list | Major | P2 | `TC-NAV-085` |
| DEF-KS-002 | Enter in the one-field email form reloads the page and loses input | Minor | P3 | `TC-FC-032` |
| DEF-KS-003 | Corrupt localStorage makes the todo app unusable | Major | P2 | `TC-TD-134` |
| DEF-KS-004 | Deleting every todo brings the demo items back on reload | Minor | P3 | `TC-TD-133` |
| DEF-KS-005 | Broken links on the Traversal page | Minor | P4 | `TC-API-031` |
| DEF-KS-006 | Directory listing exposed for /assets/js/ | Minor | P3 | `TC-SEC-033` |
| DEF-KS-007 | target=_blank links without rel=noopener | Minor | P3 | `TC-SEC-032` |
| DEF-KS-008 | Horizontal overflow on phone and tablet widths | Minor | P3 | `TC-RSP-030, TC-RSP-031` |
| DEF-KS-009 | Todo IDs are millisecond timestamps, so items can share an ID and toggle the wrong item | Major | P2 | `TC-TD-136` |
| DEF-KS-010 | Text colour contrast below 4.5:1 on every page | Minor | P3 | `TC-A11Y-050 (and the axe audit of all 21 pages)` |
| DEF-KS-011 | Form fields without an accessible name | Major | P2 | `TC-A11Y-051` |
| DEF-KS-012 | Links inside text are distinguished by colour alone | Minor | P3 | `TC-A11Y-052` |
| DEF-KS-013 | Scrollable demo boxes cannot be reached with the keyboard | Minor | P3 | `TC-A11Y-053` |
| DEF-KS-014 | The "cy.fixture or require" section has no documentation link | Trivial | P4 | `TC-NAV-086` |

## DEF-KS-001 — Unknown todo route throws and blanks the list

- **Area:** Todo app / routing
- **Found by:** Error guessing (invalid route)
- **Steps:** 1. Open /todo with two items. 2. Change the URL hash to #/unknown.
- **Expected:** The app falls back to the 'All' view (or ignores the route) and keeps listing items.
- **Actual:** Uncaught TypeError: this[activeRoute] is not a function. The list renders empty until a valid route is chosen.
- **Suggested fix:** Whitelist routes ('', 'active', 'completed') and default unknown hashes to ''.

## DEF-KS-002 — Enter in the one-field email form reloads the page and loses input

- **Area:** Form controls / Actions page
- **Found by:** Error guessing (keyboard path)
- **Steps:** 1. Open /commands/actions. 2. Type an address in .action-email. 3. Press Enter.
- **Expected:** Nothing is submitted, or the submission is handled in-page.
- **Actual:** HTML implicit submission sends a GET; the page reloads at /commands/actions? and the typed value is lost.
- **Suggested fix:** Add a submit handler that calls preventDefault(), or remove the <form> wrapper.

## DEF-KS-003 — Corrupt localStorage makes the todo app unusable

- **Area:** Todo app / persistence
- **Found by:** Fault injection
- **Steps:** 1. Set localStorage['todos-vanillajs'] = '{not json'. 2. Open /todo.
- **Expected:** The app discards unreadable data and starts with an empty or demo list.
- **Actual:** JSON.parse throws (SyntaxError); no items render and new items cannot be added. The value '{}' gives 'data.forEach is not a function'.
- **Suggested fix:** Wrap the read in try/catch and validate that the parsed value is an array.

## DEF-KS-004 — Deleting every todo brings the demo items back on reload

- **Area:** Todo app / persistence
- **Found by:** State transition (S-empty -> reload)
- **Steps:** 1. Open /todo. 2. Delete both items. 3. Reload.
- **Expected:** The list stays empty; the user's choice persists.
- **Actual:** The two seed items ('Pay electric bill', 'Walk the dog') reappear because an empty array is treated as 'no data'.
- **Suggested fix:** Seed only when the storage key is absent, not when the list is empty.

## DEF-KS-005 — Broken links on the Traversal page

- **Area:** Content / links
- **Found by:** Link checking (HTTP)
- **Steps:** Request every same-origin href on /commands/traversal.
- **Expected:** Every link resolves with a 2xx/3xx status.
- **Actual:** /shirts and /pants return 404.
- **Suggested fix:** Use '#' or real targets for the example breadcrumb links.

## DEF-KS-006 — Directory listing exposed for /assets/js/

- **Area:** Security / hosting
- **Found by:** Checklist (OWASP)
- **Steps:** GET /assets/js/
- **Expected:** 403/404, no file index.
- **Actual:** 200 with an HTML index of the script files.
- **Suggested fix:** Disable directory listing in the static server ('directoryListing': false).

## DEF-KS-007 — target=_blank links without rel=noopener

- **Area:** Security / home page
- **Found by:** Checklist (OWASP)
- **Steps:** Inspect a[target=_blank] on /.
- **Expected:** Each has rel containing noopener (reverse-tabnabbing protection).
- **Actual:** Two external links open a new tab without noopener/noreferrer.
- **Suggested fix:** Add rel="noopener noreferrer".

## DEF-KS-008 — Horizontal overflow on phone and tablet widths

- **Area:** Responsive layout
- **Found by:** BVA (breakpoints)
- **Steps:** Open /commands/actions at 375x667 and 768x1024; compare scrollWidth with clientWidth.
- **Expected:** No horizontal scrolling (scrollWidth <= clientWidth).
- **Actual:** Actions overflows by about 178-201 px at 320-375 px and 13 px at 768 px; storage, misc, aliasing, assertions and traversal pages also overflow.
- **Suggested fix:** Wrap long <pre> code samples (overflow-x:auto on the block) and constrain fixed-width tables.

## DEF-KS-009 — Todo IDs are millisecond timestamps, so items can share an ID and toggle the wrong item

- **Area:** Todo app / data model
- **Found by:** Error guessing + white-box review (found while debugging TC-TD-132 in CI)
- **Steps:** 1. Open /todo with empty storage (the two demo items are created in the same millisecond). 2. Inspect localStorage. 3. Tick the second item.
- **Expected:** Every item has a unique id; ticking the second item completes only the second item.
- **Actual:** Both demo items get the same id (store.js line 103: id = new Date().getTime()). Ticking 'Walk the dog' marks 'Pay electric bill' as completed instead, and the wrong state is persisted.
- **Suggested fix:** Generate ids with a counter or crypto.randomUUID() instead of the current timestamp.

## DEF-KS-010 — Text colour contrast below 4.5:1 on every page

- **Area:** Accessibility (WCAG 1.4.3)
- **Found by:** Checklist (WCAG 2.1 AA, axe-core)
- **Steps:** Run axe-core 4.11 with WCAG 2.1 AA rules on any page, e.g. /commands/actions.
- **Expected:** 0 color-contrast violations.
- **Actual:** Serious color-contrast violations on 20 of 21 pages (113 nodes on /commands/actions alone), mostly grey code comments and muted text.
- **Suggested fix:** Darken the muted text and syntax-highlighting colours to reach 4.5:1.

## DEF-KS-011 — Form fields without an accessible name

- **Area:** Accessibility (WCAG 4.1.2, 1.3.1)
- **Found by:** Checklist (WCAG 2.1 AA, axe-core)
- **Steps:** Run axe rules label and select-name on /commands/actions, /commands/waiting and /todo.
- **Expected:** Every input, textarea and select has a label or aria-label.
- **Actual:** Critical violations: inputs and selects on Actions and Waiting, and the new-todo/edit inputs on the Todo app, rely on placeholders only. Screen readers announce them as unlabeled fields.
- **Suggested fix:** Add <label for> or aria-label to each control.

## DEF-KS-012 — Links inside text are distinguished by colour alone

- **Area:** Accessibility (WCAG 1.4.1)
- **Found by:** Checklist (WCAG 2.1 AA, axe-core)
- **Steps:** Run axe rule link-in-text-block on /commands/assertions (also querying, waiting, spies-stubs-clocks).
- **Expected:** Inline links have a non-colour cue such as an underline.
- **Actual:** Inline links have no underline and too little contrast with the surrounding text.
- **Suggested fix:** Underline links in body text.

## DEF-KS-013 — Scrollable demo boxes cannot be reached with the keyboard

- **Area:** Accessibility (WCAG 2.1.1)
- **Found by:** Checklist (WCAG 2.1 AA, axe-core)
- **Steps:** Run axe rule scrollable-region-focusable on /commands/actions; try to scroll #scrollable-horizontal with the keyboard.
- **Expected:** Scrollable regions are focusable (tabindex=0) so keyboard users can scroll them.
- **Actual:** The overflow boxes used by the scrollTo demos are not focusable.
- **Suggested fix:** Add tabindex="0" and an accessible name to the scroll containers.

## DEF-KS-014 — The "cy.fixture or require" section has no documentation link

- **Area:** Content / navigation
- **Found by:** Error guessing (consistency check across all sections)
- **Steps:** Open /commands/files#require and look for an on.cypress.io link in the heading or its paragraph.
- **Expected:** Like every other documented section, a link to the command's documentation.
- **Actual:** Neither the heading nor the paragraph links anywhere; every other h4 section on the 13 documented pages does.
- **Suggested fix:** Link the heading to https://on.cypress.io/fixture.
