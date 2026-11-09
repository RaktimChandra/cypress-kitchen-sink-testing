# Contributing

1. Use Node 22 or newer, then run `npm ci`.
2. Every test is declared with `tc({ id, title, technique, req, priority, expected })`. Choose the next free ID in the area, for example `TC-FC-182`.
3. Run `node tools/catalogue.js`. It rejects duplicate or malformed IDs and unknown requirement IDs.
4. Run `npm run lint` before committing.
5. Commit messages follow Conventional Commits (`feat(tests):`, `fix(tests):`, `docs:`, `ci:`).
6. A new SUT defect needs an entry in `docs/defects.json` and a `tc.knownDefect` case. Never weaken an assertion to make it pass.
