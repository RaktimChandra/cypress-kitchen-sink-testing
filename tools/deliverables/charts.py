"""Render the charts used by the report, the deck and the README.

    python3 tools/deliverables/charts.py      -> docs/figures/charts/*.png
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from model import load, AREA_NAMES, ROOT

OUT = os.path.join(ROOT, "docs", "figures", "charts")
INK, MUTED, GRID = "#1B1E2E", "#5A6072", "#E3E6EE"
GREEN, TEAL, AMBER, RED, BLUE = "#2E9E6E", "#1F7A8C", "#D98E04", "#C23B3B", "#3D5A99"

plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 11, "axes.edgecolor": GRID, "axes.labelcolor": INK,
    "xtick.color": MUTED, "ytick.color": MUTED, "axes.spines.top": False, "axes.spines.right": False,
    "axes.titleweight": "bold", "axes.titlesize": 14, "axes.titlecolor": INK, "axes.titlelocation": "left",
})


def save(fig, name):
    os.makedirs(OUT, exist_ok=True)
    fig.savefig(os.path.join(OUT, name), dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def hbar(items, title, name, color=GREEN, note=None, w=8, h=None):
    items = list(items)
    labels = [k for k, _ in items][::-1]
    vals = [v for _, v in items][::-1]
    fig, ax = plt.subplots(figsize=(w, h or max(2.6, 0.36 * len(items) + 1)))
    bars = ax.barh(labels, vals, color=color, height=0.62)
    ax.xaxis.grid(True, color=GRID)
    ax.set_axisbelow(True)
    for b, v in zip(bars, vals):
        ax.text(b.get_width() + max(vals) * 0.01, b.get_y() + b.get_height() / 2, str(v), va="center", color=INK, fontsize=10)
    ax.set_title(title)
    if note:
        fig.text(0.01, -0.02, note, color=MUTED, fontsize=9)
    save(fig, name)


def main():
    m = load()
    c = m["counts"]
    hbar(sorted(((AREA_NAMES[a], n) for a, n in c["area"].items()), key=lambda x: -x[1]),
         "Test cases by functional area", "cases_by_area.png", note=f"{len(m['cases'])} cases in {m['spec_count']} spec files")
    hbar(c["family"].most_common(), "Test cases by design technique", "cases_by_technique.png", color=TEAL)
    hbar(c["type"].most_common(), "Test cases by test type", "cases_by_type.png", color=BLUE)

    # priority donut
    fig, ax = plt.subplots(figsize=(4.6, 4.6))
    pr = sorted(c["priority"].items())
    ax.pie([v for _, v in pr], labels=[f"{k}  ({v})" for k, v in pr], colors=[RED, AMBER, TEAL, MUTED][: len(pr)],
           startangle=90, counterclock=False, wedgeprops=dict(width=0.38, edgecolor="white"), textprops={"color": INK})
    ax.set_title("Cases by priority")
    save(fig, "cases_by_priority.png")

    # requirement coverage: number of cases per requirement, grouped by area
    areas = {}
    for r in m["reqs"]:
        areas.setdefault(r["area"], []).append(len(m["by_req"][r["id"]]))
    hbar(sorted(((a, sum(v)) for a, v in areas.items()), key=lambda x: -x[1]),
         "Cases tracing to each requirement area", "rtm_by_area.png", color=GREEN,
         note=f"{len(m['reqs'])} requirements; every one is covered by at least one case")

    # defects by severity / area
    sev = {}
    for d in m["defects"]:
        sev[d["severity"]] = sev.get(d["severity"], 0) + 1
    hbar(sorted(sev.items(), key=lambda x: -x[1]), "Kitchen Sink defects by severity", "defects_by_severity.png", color=RED, h=2.2)

    # real results, only if present
    if m["results_available"]:
        import numpy as np
        bs = [b for b in ["chrome", "firefox", "edge", "electron"] if b in m["results"]]
        keys = [("pass", "Pass", GREEN), ("knownDefect", "Known defect reproduced", AMBER), ("fail", "Fail", RED), ("skipped", "Skipped", MUTED)]
        fig, ax = plt.subplots(figsize=(8, 3.6))
        left = np.zeros(len(bs))
        for k, lab, col in keys:
            vals = np.array([m["results"][b]["summary"].get(k, 0) for b in bs])
            ax.barh(bs, vals, left=left, color=col, label=lab, height=0.6)
            left += vals
        ax.legend(ncol=4, loc="upper center", bbox_to_anchor=(0.5, -0.15), frameon=False)
        ax.set_title("Results per browser (CI)")
        save(fig, "results_by_browser.png")
    print("charts ->", OUT)


if __name__ == "__main__":
    main()
