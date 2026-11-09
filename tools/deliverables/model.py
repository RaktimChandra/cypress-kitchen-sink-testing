"""Shared data model for every generated deliverable.

Everything comes from files in the repository:
  reports/catalogue.json        (node tools/catalogue.js)  - the 582 designed test cases
  docs/requirements.json        - requirements used for traceability
  docs/defects.json             - defects found against the Kitchen Sink
  evidence/**/results-*.json    - optional: real CI results (tools/aggregate.js output)
  evidence/**/mutation*.json    - optional: mutation-testing results
  evidence/**/coverage-summary.json - optional: nyc summary

When no CI evidence is present the model says so (results_available = False) and the
documents print "pending CI run" instead of numbers. Nothing is invented.
"""
import glob
import json
import os
from collections import Counter, OrderedDict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
EVIDENCE = os.environ.get("EVIDENCE_DIR", os.path.join(ROOT, "evidence"))

AREA_NAMES = OrderedDict([
    ("SMK", "Smoke"), ("NAV", "Navigation"), ("FC", "Form controls"), ("UI", "UI interactions"),
    ("AS", "Assertions"), ("QT", "Querying & traversal"), ("TD", "Todo app"), ("NW", "Network"),
    ("ST", "Storage"), ("CK", "Cookies"), ("WN", "Window"), ("VP", "Viewport"),
    ("SP", "Spies, stubs & clocks"), ("A11Y", "Accessibility"), ("VIS", "Visual regression"),
    ("API", "HTTP / API"), ("PERF", "Performance"), ("SEC", "Security"), ("RSP", "Responsive"),
    ("UAT", "Acceptance (UAT)"), ("ROB", "Robustness"), ("UT", "Utilities & files"),
])

BROWSERS = ["chrome", "firefox", "edge", "electron"]


def _read(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def technique_family(t):
    t = t or ""
    for key, fam in [("Robust BVA", "BVA"), ("BVA", "BVA"), ("ECP", "ECP"), ("Decision", "Decision table"),
                     ("Cause", "Cause-effect graph"), ("State", "State transition"), ("WCAG", "Accessibility checklist"),
                     ("OWASP", "Security checklist"), ("Pairwise", "Pairwise"), ("Visual", "Visual comparison"),
                     ("Budget", "Performance budget"), ("monkey", "Random / monkey"), ("Error", "Error guessing"),
                     ("Fault", "Fault injection"), ("Scenario", "Scenario (UAT)"), ("Smoke", "Smoke"),
                     ("Use-case", "Use-case")]:
        if key.lower() in t.lower():
            return fam
    return t


def load():
    cat = _read(os.path.join(ROOT, "reports", "catalogue.json"))
    cases = cat["cases"]
    for c in cases:
        c["area"] = c["id"].split("-")[1]
        c["area_name"] = AREA_NAMES.get(c["area"], c["area"])
        c["family"] = technique_family(c.get("technique"))
    reqs = _read(os.path.join(ROOT, "docs", "requirements.json"))
    defects = _read(os.path.join(ROOT, "docs", "defects.json"))

    # ---- optional CI evidence ------------------------------------------------
    results = {}
    for f in glob.glob(os.path.join(EVIDENCE, "**", "results-*.json"), recursive=True):
        j = _read(f)
        b = j.get("summary", {}).get("browser") or os.path.basename(f)[8:-5]
        results[b] = j
    mutation = None
    for f in glob.glob(os.path.join(EVIDENCE, "**", "mutation*.json"), recursive=True):
        j = _read(f)
        if mutation is None:
            mutation = j
        else:  # merge shards
            mutation.setdefault("mutants", []).extend(j.get("mutants", []))
    coverage = None
    for f in glob.glob(os.path.join(EVIDENCE, "**", "coverage-summary.json"), recursive=True):
        coverage = _read(f)

    by_req = {r["id"]: [] for r in reqs}
    for c in cases:
        for rid in (c.get("req") or "").replace(";", ",").split(","):
            rid = rid.strip()
            if rid in by_req:
                by_req[rid].append(c["id"])

    status = {}  # id -> {browser: status}
    for b, j in results.items():
        for r in (j.get("results") or j.get("rows") or []):
            status.setdefault(r["id"], {})[b] = r["status"]

    return {
        "cases": cases,
        "specs": cat.get("specs"),
        "spec_count": len({c["spec"] for c in cases}),
        "reqs": reqs,
        "by_req": by_req,
        "defects": defects,
        "results": results,
        "status": status,
        "results_available": bool(results),
        "mutation": mutation,
        "coverage": coverage,
        "counts": {
            "area": Counter(c["area"] for c in cases),
            "family": Counter(c["family"] for c in cases),
            "type": Counter(c["type"] for c in cases),
            "priority": Counter(c["priority"] for c in cases),
            "level": Counter(c["level"] for c in cases),
        },
    }


if __name__ == "__main__":
    m = load()
    print(len(m["cases"]), m["spec_count"], "results:", list(m["results"]), dict(m["counts"]["family"]))
    print("uncovered reqs:", [k for k, v in m["by_req"].items() if not v])
