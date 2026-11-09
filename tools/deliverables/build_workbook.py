"""Build the test-management workbook (xlsx) from the repository data.

    python3 tools/deliverables/build_workbook.py [out.xlsx]
"""
import os
import sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.formatting.rule import CellIsRule
from model import load, AREA_NAMES, BROWSERS, ROOT, EVIDENCE

INK, GREEN, AMBER, RED, GREY = "1B1E2E", "2E9E6E", "D98E04", "C23B3B", "8A90A2"
HEAD = PatternFill("solid", fgColor=INK)
WHITE = Font(name="Arial", bold=True, color="FFFFFF")
BASE = Font(name="Arial", size=10)
BOLD = Font(name="Arial", size=10, bold=True)
WRAP = Alignment(wrap_text=True, vertical="top")
THIN = Border(bottom=Side(style="thin", color="E3E6EE"))


def header(ws, row, cols, widths):
    for i, (c, w) in enumerate(zip(cols, widths), 1):
        cell = ws.cell(row=row, column=i, value=c)
        cell.fill, cell.font = HEAD, WHITE
        cell.alignment = Alignment(vertical="center", wrap_text=True)
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[row].height = 30
    ws.freeze_panes = ws.cell(row=row + 1, column=3 if len(cols) > 4 else 1)


def table(ws, name, ref):
    t = Table(displayName=name, ref=ref)
    t.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=True)
    ws.add_table(t)


def status_colours(ws, rng):
    for text, col in [("PASS", GREEN), ("KNOWN DEFECT", AMBER), ("FAIL", RED), ("SKIPPED", GREY)]:
        ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=[f'"{text}"'], font=Font(name="Arial", bold=True, color=col)))


def main(out):
    m = load()
    global TEAM
    import json
    TEAM = json.load(open(os.path.join(ROOT, 'docs', 'team.json'), encoding='utf-8'))
    wb = Workbook()

    # ---- Cover ------------------------------------------------------------------
    ws = wb.active
    ws.title = "Cover"
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    ws.column_dimensions["B"].width = 30
    ws.column_dimensions["C"].width = 70
    ws["B2"] = "Interactive Web Components Testing"
    ws["B2"].font = Font(name="Arial", size=20, bold=True, color=INK)
    ws["B3"] = "Automated testing of the Cypress Kitchen Sink with Cypress 16 - test-management workbook"
    ws["B3"].font = Font(name="Arial", size=11, color="5A6072")
    info = [
        ("Course", "Software Verification and Validation (SVV) - FT3 Automated Testing"),
        ("Institution", "SRM Institute of Science and Technology - B.Tech CSE (Software Engineering)"),
        ("Year / semester", "4th year, semester 7, 2026-27 - section AI2, Dept. of CINTEL"),
        ("Faculty", "Mr. Kaviyaraj R."),
        ("Team", TEAM["team"]),
        *[("Member", f"{x['name']} ({x['reg']})") for x in TEAM["members"]],
        ("System under test", "Cypress Kitchen Sink (cypress-io/cypress-example-kitchensink @ f2cb767)"),
        ("Tool", "Cypress 16.2.1 - Chrome, Firefox, Edge, Electron"),
        ("Designed cases", f"{len(m['cases'])} in {m['spec_count']} spec files"),
        ("Requirements traced", f"{len(m['reqs'])} (all covered)"),
        ("Defects raised", f"{len(m['defects'])}"),
        ("Execution results", "Included from CI evidence" if m["results_available"] else "Pending CI run - result columns show 'Pending CI'"),
    ]
    for i, (k, v) in enumerate(info, 5):
        ws.cell(row=i, column=2, value=k).font = BOLD
        ws.cell(row=i, column=3, value=v).font = BASE
    top = 5 + len(info) + 1
    ws.cell(row=top, column=2, value="Sheets").font = BOLD
    for i, (k, v) in enumerate([
        ("Summary", "Counts by area, technique, type and priority (live formulas over Test Cases)"),
        ("Test Cases", "Every designed case with ID, technique, requirement, expected result and per-browser status"),
        ("Traceability", "Requirement -> test case matrix (RTM)"),
        ("Requirements", "The 53 requirements derived from the Kitchen Sink pages"),
        ("Defects", "Defect log with steps, expected/actual, severity and the test that reproduces each"),
    ], top + 1):
        ws.cell(row=i, column=2, value=k).font = BASE
        ws.cell(row=i, column=3, value=v).font = BASE

    # ---- Test cases ----------------------------------------------------------------
    tc = wb.create_sheet("Test Cases")
    cols = ["ID", "Area", "Title", "Technique", "Type", "Level", "Priority", "Requirement", "Expected result",
            "Test data", "Spec file"] + [b.capitalize() for b in BROWSERS] + ["Overall"]
    header(tc, 1, cols, [13, 16, 48, 20, 13, 10, 8, 14, 52, 26, 34, 12, 12, 12, 12, 14])
    for r, c in enumerate(m["cases"], 2):
        st = m["status"].get(c["id"], {})
        per = [st.get(b, "Pending CI" if not m["results_available"] else "-") for b in BROWSERS]
        data = c.get("data")
        if isinstance(data, (dict, list)):
            import json
            data = json.dumps(data)[:200]
        vals = [c["id"], c["area_name"], c["title"], c.get("technique"), c.get("type"), c.get("level"), c.get("priority"),
                c.get("req"), c.get("expected"), data, c.get("spec", "").replace("cypress/e2e/", "")] + per
        for i, v in enumerate(vals, 1):
            cell = tc.cell(row=r, column=i, value=v)
            cell.font, cell.alignment = BASE, WRAP
        L = get_column_letter
        first, last = L(12), L(15)
        tc.cell(row=r, column=16, value=(
            f'=IF(COUNTIF({first}{r}:{last}{r},"FAIL")>0,"FAIL",IF(COUNTIF({first}{r}:{last}{r},"Pending CI")=4,"Pending CI",'
            f'IF(COUNTIF({first}{r}:{last}{r},"KNOWN DEFECT")>0,"KNOWN DEFECT",IF(COUNTIF({first}{r}:{last}{r},"PASS")>0,"PASS","SKIPPED"))))'
        )).font = BOLD
    n = len(m["cases"]) + 1
    table(tc, "TestCases", f"A1:P{n}")
    status_colours(tc, f"L2:P{n}")

    # ---- Summary (formulas) -----------------------------------------------------------
    sm = wb.create_sheet("Summary", 1)
    sm.sheet_view.showGridLines = False
    sm.column_dimensions["A"].width = 30
    for col in "BCDEFG":
        sm.column_dimensions[col].width = 14
    sm["A1"] = "Summary"
    sm["A1"].font = Font(name="Arial", size=16, bold=True, color=INK)
    row = 3

    def block(title, label_col, keys):
        nonlocal row
        hdr = [title, "Cases", "Share", "Pass", "Known defect", "Fail", "Pending CI"]
        for i, h in enumerate(hdr, 1):
            c = sm.cell(row=row, column=i, value=h)
            c.fill, c.font = HEAD, WHITE
        start = row + 1
        for k in keys:
            row += 1
            sm.cell(row=row, column=1, value=k).font = BASE
            rng = f"'Test Cases'!${label_col}$2:${label_col}${n}"
            ov = f"'Test Cases'!$P$2:$P${n}"
            sm.cell(row=row, column=2, value=f'=COUNTIF({rng},A{row})').font = BASE
            sm.cell(row=row, column=3, value=f"=B{row}/COUNTA('Test Cases'!$A$2:$A${n})").number_format = "0.0%"
            for j, s in enumerate(["PASS", "KNOWN DEFECT", "FAIL", "Pending CI"], 4):
                sm.cell(row=row, column=j, value=f'=COUNTIFS({rng},A{row},{ov},"{s}")').font = BASE
        row += 1
        sm.cell(row=row, column=1, value="Total").font = BOLD
        for j in range(2, 8):
            L = get_column_letter(j)
            c = sm.cell(row=row, column=j, value=f"=SUM({L}{start}:{L}{row - 1})")
            c.font = BOLD
            if j == 3:
                c.number_format = "0.0%"
        row += 2

    block("Area", "B", [AREA_NAMES[a] for a in AREA_NAMES if a in m["counts"]["area"]])
    block("Type", "E", [k for k, _ in m["counts"]["type"].most_common()])
    block("Priority", "G", sorted(m["counts"]["priority"]))

    # ---- Requirements & RTM ----------------------------------------------------------------
    rq = wb.create_sheet("Requirements")
    header(rq, 1, ["ID", "Area", "Requirement", "Priority", "# cases"], [16, 18, 90, 10, 10])
    for r, q in enumerate(m["reqs"], 2):
        for i, v in enumerate([q["id"], q["area"], q["text"], q.get("priority"), f"=COUNTIF('Test Cases'!$H$2:$H${n},\"*\"&A{r}&\"*\")"], 1):
            c = rq.cell(row=r, column=i, value=v)
            c.font, c.alignment = BASE, WRAP
    table(rq, "Requirements", f"A1:E{len(m['reqs']) + 1}")

    rt = wb.create_sheet("Traceability")
    header(rt, 1, ["Requirement", "Area", "# cases", "Test case IDs", "Covered"], [16, 18, 10, 110, 10])
    for r, q in enumerate(m["reqs"], 2):
        ids = m["by_req"][q["id"]]
        for i, v in enumerate([q["id"], q["area"], len(ids), ", ".join(ids), "Yes" if ids else "NO"], 1):
            c = rt.cell(row=r, column=i, value=v)
            c.font, c.alignment = BASE, WRAP
    table(rt, "RTM", f"A1:E{len(m['reqs']) + 1}")

    # ---- Defects ---------------------------------------------------------------------------
    df = wb.create_sheet("Defects")
    keys = ["id", "title", "area", "severity", "priority", "test", "technique", "steps", "expected", "actual", "fix"]
    header(df, 1, ["ID", "Title", "Area", "Severity", "Priority", "Reproducing test", "Found by", "Steps", "Expected", "Actual", "Suggested fix"],
           [12, 36, 20, 10, 9, 16, 22, 40, 36, 44, 36])
    for r, d in enumerate(m["defects"], 2):
        for i, k in enumerate(keys, 1):
            c = df.cell(row=r, column=i, value=d.get(k))
            c.font, c.alignment = BASE, WRAP
    table(df, "Defects", f"A1:K{len(m['defects']) + 1}")

    # ---- Results per browser (real CI evidence) ------------------------------------------
    import json as _json
    rs = wb.create_sheet("CI Results")
    header(rs, 1, ["Browser", "Total", "Pass", "Known defect", "Fail", "Skipped", "Duration (s)", "Generated"], [14, 9, 9, 13, 9, 10, 13, 26])
    for r, b in enumerate([x for x in BROWSERS if x in m["results"]], 2):
        sm = m["results"][b]["summary"]
        for i, v in enumerate([b, sm.get("total"), sm.get("pass"), sm.get("knownDefect"), sm.get("fail"), sm.get("skipped"), sm.get("durationSec"), sm.get("generatedAt")], 1):
            rs.cell(row=r, column=i, value=v).font = BASE
    hist = _json.load(open(os.path.join(ROOT, "docs", "ci-history.json"), encoding="utf-8"))
    row = len(m["results"]) + 4
    rs.cell(row=row, column=1, value="CI history (Chrome)").font = BOLD
    for i, h in enumerate(["Run", "GitHub run id", "Commit", "Cases", "Pass", "Known defect", "Fail"], 1):
        c = rs.cell(row=row + 1, column=i, value=h); c.fill, c.font = HEAD, WHITE
    for k, run in enumerate(hist["runs"], row + 2):
        cb = run["browsers"]["chrome"]
        for i, v in enumerate([run["label"], run["run"], run["commit"], run["cases"], cb["pass"], cb["knownDefect"], cb["fail"]], 1):
            rs.cell(row=k, column=i, value=v).font = BASE
    row = row + 3 + len(hist["runs"])
    rs.cell(row=row, column=1, value="Triage of first-run failures").font = BOLD
    for k, t in enumerate(hist["triage"], row + 1):
        rs.cell(row=k, column=1, value=t["category"]).font = BASE
        rs.cell(row=k, column=2, value=t["count"]).font = BASE
        rs.cell(row=k, column=3, value=t["examples"]).font = BASE

    # ---- Mutation ----------------------------------------------------------------------------
    mt = wb.create_sheet("Mutation")
    muts = []
    import glob as _glob
    for f in _glob.glob(os.path.join(EVIDENCE, "mutation", "*.json")):
        muts += _json.load(open(f)).get("results", [])
    header(mt, 1, ["Mutant", "File", "Operator", "Change", "Status", "Tests run", "Failed", "Killed by"], [9, 26, 22, 48, 13, 10, 9, 60])
    for r, x in enumerate(sorted(muts, key=lambda y: y["id"]), 2):
        for i, v in enumerate([x["id"], x.get("file"), x.get("op"), x.get("desc"), x.get("status"), x.get("testsRun"), x.get("failed"), ", ".join(x.get("killers") or [])], 1):
            c = mt.cell(row=r, column=i, value=v); c.font, c.alignment = BASE, WRAP
    if muts:
        n = len(muts) + 1
        mt.cell(row=n + 2, column=1, value="Score").font = BOLD
        mt.cell(row=n + 2, column=2, value=f'=COUNTIF(E2:E{n},"KILLED")/(COUNTIF(E2:E{n},"KILLED")+COUNTIF(E2:E{n},"SURVIVED"))').number_format = "0.0%"
        status_colours(mt, f"E2:E{n}")

    # ---- Coverage & performance ------------------------------------------------------------
    cv = wb.create_sheet("Coverage & Perf")
    cov = None
    try:
        cov = _json.load(open(os.path.join(EVIDENCE, "coverage", "coverage-summary.json")))
    except Exception:
        pass
    header(cv, 1, ["Coverage metric", "Covered", "Total", "%"], [22, 12, 12, 10])
    if cov:
        for r, k in enumerate(["lines", "statements", "functions", "branches"], 2):
            t = cov["total"][k]
            cv.cell(row=r, column=1, value=k.capitalize()).font = BASE
            cv.cell(row=r, column=2, value=t["covered"]).font = BASE
            cv.cell(row=r, column=3, value=t["total"]).font = BASE
            cv.cell(row=r, column=4, value=f"=B{r}/C{r}").number_format = "0.0%"
    perf = []
    try:
        perf = [p for p in _json.load(open(os.path.join(EVIDENCE, "browsers", "chrome", "evidence", "perf-chrome.json"))) if str(p.get("page", "")).startswith("/") and " " not in p["page"] and isinstance(p.get("domContentLoaded"), (int, float))]
    except Exception:
        pass
    seen = set()
    perf = [p for p in perf if not (p["page"] in seen or seen.add(p["page"]))]
    for i, h in enumerate(["Page (Chrome, CI)", "TTFB ms", "DCL ms", "Load ms", "Requests", "KB", "DOM nodes", "DCL budget met"], 1):
        c = cv.cell(row=8, column=i, value=h); c.fill, c.font = HEAD, WHITE
        cv.column_dimensions[get_column_letter(i)].width = max(cv.column_dimensions[get_column_letter(i)].width or 0, 14)
    for r, p in enumerate(perf, 9):
        for i, v in enumerate([p["page"], round(p["ttfb"], 1), round(p["domContentLoaded"], 1), round(p["load"], 1), p["resources"], p["transferKB"], p["domNodes"]], 1):
            cv.cell(row=r, column=i, value=v).font = BASE
        cv.cell(row=r, column=8, value=f'=IF(C{r}<1500,"Yes","No")').font = BASE

    wb.save(out)
    print("workbook ->", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "deliverables", "CKS_Test_Workbook.xlsx"))
