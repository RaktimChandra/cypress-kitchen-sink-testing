<div align="center">

# Interactive Web Components Testing with Cypress

**The Cypress Kitchen Sink, tested like a production product: form controls, navigation, assertions and UI interactions — plus black-box, white-box, accessibility, visual, performance, security and mutation testing.**

[![CI](https://github.com/RaktimChandra/cypress-kitchen-sink-testing/actions/workflows/ci.yml/badge.svg)](https://github.com/RaktimChandra/cypress-kitchen-sink-testing/actions/workflows/ci.yml)
[![Mutation testing](https://github.com/RaktimChandra/cypress-kitchen-sink-testing/actions/workflows/mutation.yml/badge.svg)](https://github.com/RaktimChandra/cypress-kitchen-sink-testing/actions/workflows/mutation.yml)
![Cypress](https://img.shields.io/badge/Cypress-16.2.1-17202C?logo=cypress)
![Test cases](https://img.shields.io/badge/test%20cases-582-0F6E78)
![Browsers](https://img.shields.io/badge/browsers-Chrome%20·%20Firefox%20·%20Edge%20·%20Electron-2A78D6)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

</div>

## What this is

An end-to-end automated test campaign for the [Cypress Kitchen Sink](https://github.com/cypress-io/cypress-example-kitchensink) (a pinned copy lives in `app/`, MIT licence kept). Every test case has an ID and IEEE 829 metadata (technique, requirement, priority, expected result), every result in the documents comes from a real run, and defects found in the application are tracked as executable **known-defect tests** that fail the moment the product is fixed.

| Area | What is tested | Techniques |
|---|---|---|
| **Form controls** | text, email, password, textarea, submit, checkboxes, radios, single & multi select, range slider, editable regions | ECP, BVA (robust), decision tables, state transition |
| **Navigation** | navbar menu, deep links, history back/forward, reload, clean URLs, 404, hash routes, collapsed mobile menu | ECP, state transition, BVA on breakpoints |
| **Assertions** | implicit/explicit, BDD/TDD, retry-ability, negative, custom Chai assertion, assertion timeouts | use-case, error guessing |
| **UI interactions** | click positions (verified on canvas pixels), popovers, covered elements, dblclick/right-click, scrolling, triggered & real (CDP) events | BVA, use-case |
| **TodoMVC** | add, edit, toggle, delete, filters, clear completed, persistence | ECP, BVA, decision table, **cause-effect graph**, **state transition (0- and 1-switch)** |
| **Network** | stubbed GET/POST/PUT, fixtures, error codes, network failure, latency, request assertions | ECP, error guessing |
| **Non-functional** | accessibility (axe-core WCAG 2.1 AA), visual regression, performance budgets, security (XSS, headers), responsive (10 devices), HTTP/link checking, monkey testing | checklist, budgets, fault injection |
| **Test quality** | code coverage of the app's JavaScript, mutation testing (32 injected faults) | white-box, mutation analysis |

## Quick start

```bash
npm ci                    # installs Cypress 16 and the plugins
npm test                  # starts the app on :8080 and runs all specs headless (Electron)
npm run test:chrome       # same in Chrome   (test:firefox, test:edge)
npm run test:demo         # headed Chrome: form controls, navigation, assertions, UI interactions
npm run cy:open           # interactive Test Runner (start the app first with `npm start`)
```

Run a group by tag with `@cypress/grep`:

```bash
npx start-server-and-test start http://localhost:8080 "cypress run --expose grepTags=@forms"
```

## Repository layout

```
app/                    the application under test (pinned Kitchen Sink, unmodified)
cypress/
  e2e/01-smoke … 19-*   38 spec files, 582 test cases, grouped by area
  support/tc.js         tc() — test-case IDs + IEEE 829 metadata, known-defect tests
  support/commands.js   custom commands: visitPage, checkA11y, matchSnapshot, pageMetrics, visitTodos …
  plugins/              visual diff (pixelmatch), evidence log
  fixtures/             pages, comment, accessibility baseline
tools/                  aggregate · catalogue · mutation · instrument · publish
docs/                   requirements, test plan
.github/workflows/      CI (4 browsers + coverage), mutation testing
```

## Evidence

CI publishes every run (results per browser, JUnit, mochawesome, coverage, accessibility/performance/security evidence, screenshots and demo videos) to the [`results`](../../tree/results) branch.

## Author

**Raktim Chandra** (RA2311033010038) — B.Tech CSE (Software Engineering), SRM Institute of Science and Technology. Software Verification & Validation, automated-testing component, 2026–27. Built with AI pair-programming assistance (Claude); all numbers come from the automated runs.
