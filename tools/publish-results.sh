#!/usr/bin/env bash
# Copy CI evidence into the orphan "results" branch so it can be fetched with plain git
# (used to build the report/workbook from real runs). Usage: publish-results.sh <sha> <run-id> [kind]
set -euo pipefail
SHA="$1"; RUN="$2"; KIND="${3:-e2e}"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
WORK=$(mktemp -d)
if git ls-remote --exit-code --heads origin results >/dev/null 2>&1; then
  git fetch --depth 1 origin results
  git worktree add "$WORK" FETCH_HEAD
  (cd "$WORK" && git checkout -B results)
else
  git worktree add --detach "$WORK"
  (cd "$WORK" && git checkout --orphan results && git rm -rqf . && git clean -fdq)
fi
DEST="$WORK/latest"
if [ "$KIND" = "mutation" ]; then
  mkdir -p "$DEST/mutation"
  find artifacts -path '*mutation*' -name '*.json' -exec cp {} "$DEST/mutation/" \;
else
  rm -rf "$DEST/browsers" "$DEST/coverage"
  mkdir -p "$DEST/browsers" "$DEST/coverage"
  for d in artifacts/evidence-*; do
    [ -d "$d" ] || continue
    b="${d#artifacts/evidence-}"
    mkdir -p "$DEST/browsers/$b"
    cp -r "$d/reports/." "$DEST/browsers/$b/" 2>/dev/null || true
    rm -rf "$DEST/browsers/$b/tmp"
    # keep screenshots and the demo videos (acceptance + form/UI suites) from Chrome only, to bound size
    if [ "$b" = "chrome" ]; then
      mkdir -p "$DEST/browsers/chrome/screenshots" "$DEST/browsers/chrome/videos"
      cp -r "$d/cypress/screenshots/." "$DEST/browsers/chrome/screenshots/" 2>/dev/null || true
      find "$d/cypress/videos" -name '*.mp4' \( -path '*17-acceptance*' -o -path '*03-form-controls*' -o -path '*04-ui-interactions*' -o -path '*07-todo-app*' -o -path '*02-navigation*' -o -path '*05-assertions*' \) -exec cp --parents {} "$DEST/browsers/chrome/videos/" \; 2>/dev/null || true
    fi
    if [ -d "$d/cypress/snapshots" ]; then mkdir -p "$DEST/snapshots" && cp -r "$d/cypress/snapshots/." "$DEST/snapshots/"; fi
  done
  [ -d artifacts/coverage ] && cp -r artifacts/coverage/. "$DEST/coverage/"
fi
printf '{"sha":"%s","run":"%s","kind":"%s","at":"%s"}\n' "$SHA" "$RUN" "$KIND" "$(date -u +%FT%TZ)" > "$DEST/run-$KIND.json"
cd "$WORK"
git add -A
git commit -qm "evidence: $KIND run $RUN for $SHA [skip ci]" || { echo "nothing to commit"; exit 0; }
for i in 1 2 3; do git push origin results && exit 0; git pull --rebase origin results || true; done
