#!/usr/bin/env bash
# Rebuild every Team 6 deliverable from the latest CI evidence.
#   tools/deliverables/build_all.sh            (run from the repository root)
# Needs: git, node (docx, pptxgenjs, react-icons, sharp), python3 (openpyxl, matplotlib), ffmpeg, LibreOffice for PDFs.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
OUT=deliverables; BUILD=$OUT/build
rm -rf "$BUILD" && mkdir -p "$BUILD/evidence"

echo "› fetching evidence from the results branch"
git fetch -q origin results
git archive FETCH_HEAD latest | tar -x -C "$BUILD/evidence"
export EVIDENCE_DIR="$ROOT/$BUILD/evidence/latest" FRAMES_DIR="$ROOT/$BUILD/frames"

echo "› catalogue, charts, frames"
node tools/catalogue.js >/dev/null
(cd tools/deliverables && python3 charts.py)
python3 tools/deliverables/frames.py "$EVIDENCE_DIR" "$FRAMES_DIR"

echo "› documents"
(cd tools/deliverables && python3 build_workbook.py "$ROOT/$OUT/CKS_Test_Workbook.xlsx")
RECALC=${RECALC:-/mnt/skills/public/xlsx/scripts/recalc.py}
[ -f "$RECALC" ] && python3 "$RECALC" "$OUT/CKS_Test_Workbook.xlsx" 90 >/dev/null || echo "  (workbook formulas will calculate when opened)"
node tools/deliverables/build_report.js "$OUT/CKS_Project_Report.docx"
node tools/deliverables/build_ft3_pack.js "$OUT/FT3_Prep_Pack.docx"
node tools/deliverables/build_pitch.js "$OUT/CKS_Presentation_Script.docx"
node tools/deliverables/build_deck.js "$OUT/CKS_Presentation.pptx"
python3 tools/deliverables/animate_pptx.py "$OUT/CKS_Presentation.pptx"
python3 tools/deliverables/make_video.py "$EVIDENCE_DIR" "$OUT/CKS_Demo_Video.mp4"

echo "› PDFs"
SOFFICE=${SOFFICE:-/mnt/skills/public/docx/scripts/office/soffice.py}
for f in CKS_Project_Report.docx FT3_Prep_Pack.docx CKS_Presentation_Script.docx CKS_Presentation.pptx; do
  if [ -f "$SOFFICE" ]; then (cd "$OUT" && python3 "$SOFFICE" --headless --convert-to pdf "$f" >/dev/null 2>&1 || true)
  elif command -v soffice >/dev/null; then (cd "$OUT" && soffice --headless --convert-to pdf "$f" >/dev/null 2>&1 || true); fi
done
ls -la "$OUT"
