# Test strategy

## Objectives
Verify the Cypress Kitchen Sink against 53 requirements (`docs/requirements.json`). The minimum brief is form controls, navigation, assertions and UI interactions. Coverage is then extended to accessibility, visual appearance, performance, security, responsive layout, HTTP behaviour and robustness.

## Levels
| Level | How |
|---|---|
| System | 577 browser cases against the served, unmodified app |
| Acceptance | 5 Given/When/Then journeys (`17-acceptance`) |
| Unit-level adequacy | 32 mutants of the todo scripts (`tools/mutants.js`) |

## Design techniques
Every case declares its technique in `tc({ technique })`. The techniques used are:
- ECP and BVA, both normal and robust
- decision tables and cause-effect graphs
- state transition, with 0-switch and 1-switch coverage
- pairwise testing, error guessing, fault injection and seeded monkey testing
- scenario testing
- WCAG 2.1 and OWASP checklists

## Oracles
- HTML Living Standard: constraint validation and value sanitisation
- WCAG 2.1 AA, through axe-core
- OWASP Secure Headers
- text and behaviour documented on the page
- per-browser visual baselines

## Entry and exit criteria
| Criterion | Rule |
|---|---|
| Entry | Smoke suite green |
| Exit | All of: all P1 cases pass in 4 browsers; no FAIL; known defects reproduce or are closed; 100 % requirement coverage; mutation score ≥ 80 % |

## Flakiness policy
- There are no fixed waits; `cy.clock` controls time.
- Every third-party call is stubbed.
- CI allows one retry. A test that passes only on retry is recorded as a test defect.

## Defect handling
A defect found in the SUT is handled as follows:
1. It is logged in `DEFECTS.md` and `docs/defects.json`.
2. It is encoded as a `tc.knownDefect` case.
3. When the defect is fixed, that case fails, which prompts its conversion to a normal regression test.
