"""Render DEFECTS.md from docs/defects.json.   python3 tools/defects_md.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
d = json.load(open(os.path.join(ROOT, 'docs', 'defects.json'), encoding='utf-8'))
L = ["# Defect log", "",
     "Defects found in the Cypress Kitchen Sink (commit `f2cb767`). Each one is reproduced on every CI run by a *known-defect* test (`tc.knownDefect`). That test passes while the defect is present and fails once the defect is fixed.",
     "", "| ID | Title | Severity | Priority | Test |", "|---|---|---|---|---|"]
L += [f"| {x['id']} | {x['title']} | {x['severity']} | {x['priority']} | `{x['test']}` |" for x in d]
for x in d:
    L += ["", f"## {x['id']} — {x['title']}", "", f"- **Area:** {x['area']}", f"- **Found by:** {x['technique']}",
          f"- **Steps:** {x['steps']}", f"- **Expected:** {x['expected']}", f"- **Actual:** {x['actual']}", f"- **Suggested fix:** {x['fix']}"]
open(os.path.join(ROOT, 'DEFECTS.md'), 'w', encoding='utf-8').write("\n".join(L) + "\n")
print(len(d), 'defects -> DEFECTS.md')
