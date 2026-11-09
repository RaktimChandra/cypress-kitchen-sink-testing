# Changelog

All notable changes to this project. The version is cut by `.github/workflows/release.yml`
whenever a new heading appears here on `main`.

## [1.0.0] – 2026-11-09

First complete release: the suite is green in four browsers, every defect it found is
reproduced automatically, and every document is generated from the published CI evidence.

### Test suite
- 588 automated test cases in 38 Cypress specs across 22 functional areas, each case carrying
  an ID, a design technique, a requirement, a priority and an expected result.
- The four required demonstration areas in depth: form controls (130 cases), navigation (54),
  assertions and querying (53) and UI interactions (49).
- Design techniques: equivalence-class partitioning, boundary-value analysis (normal and
  robust), decision tables, cause-effect graphing, state transition (0-switch and 1-switch),
  pairwise, error guessing, fault injection, seeded monkey testing and scenario tests.
- Non-functional suites: accessibility (axe-core, WCAG 2.1 AA), visual regression against
  per-browser baselines, performance budgets, security (XSS and OWASP headers), responsive
  layout, HTTP behaviour and robustness.

### Harness
- `tc()` test-case metadata with duplicate-ID protection, grep tags and a generated catalogue.
- `tc.knownDefect()`: a case passes while its defect reproduces and fails once it is fixed.
- Custom commands for page errors, todo seeding, accessibility, visual diffing and timings.

### Continuous integration
- Four-browser matrix, coverage on an instrumented copy of the application, and mutation
  testing in four shards.
- All evidence published to the orphan `results` branch: per-browser results, JUnit, HTML
  reports, videos, screenshots, visual baselines, coverage, accessibility, performance and
  security findings.

### Results
- Chrome, Edge and Electron: 573 pass, 15 known defects reproduced, 0 failures.
  Firefox: 567 pass, 15 known defects, 0 failures, 6 skipped (CDP-only real events).
- Mutation score 100 %: 31 of 31 non-equivalent mutants killed, 1 equivalent and excluded.
- Coverage of the application's JavaScript: 97.9 % lines, 95.8 % functions, 86.8 % branches.
- 14 defects found in the Cypress Kitchen Sink, 4 of them Major; see `DEFECTS.md`.

### Deliverables
- One command (`make deliverables`) regenerates the workbook, the project report, the FT3
  preparation pack, the presentation and the demo video from the latest CI evidence.
