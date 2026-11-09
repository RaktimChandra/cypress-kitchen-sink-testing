# Changelog

## [1.0.0] – unreleased
### Added
- 582 automated test cases in 38 specs across 22 areas, each with ID, technique, requirement, priority and expected result.
- Custom harness: `tc()` metadata, known-defect pattern, axe-core accessibility, pixelmatch visual diffs, performance metrics.
- CI on GitHub Actions:
  - 4-browser matrix
  - coverage job
  - sharded mutation testing (32 mutants)
  - evidence published to the `results` branch
- 8 Kitchen Sink defects logged and reproduced automatically.
- Deliverable generators: workbook (xlsx), report (docx), deck (pptx), FT3 preparation pack, charts.
