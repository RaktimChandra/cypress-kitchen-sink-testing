"""Diagrams for the report and deck (Graphviz). Output: docs/figures/*.png"""
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "docs" / "figures"
OUT.mkdir(parents=True, exist_ok=True)
FONT = 'fontname="Helvetica"'
TEAL, NAVY, CORAL, SAND, GREY = "#0F6E78", "#17202C", "#E8613C", "#F4EFE6", "#5B6770"


def render(name, dot):
    src = OUT / f"{name}.dot"
    src.write_text(dot)
    subprocess.run(["dot", "-Tpng", "-Gdpi=200", str(src), "-o", str(OUT / f"{name}.png")], check=True)
    src.unlink()


render("todo_state_machine", f"""digraph G {{
 rankdir=LR; bgcolor="white"; node [{FONT} shape=box style="rounded,filled" fillcolor="{SAND}" color="{NAVY}" fontsize=13 margin="0.18,0.1"];
 edge [{FONT} fontsize=11 color="{GREY}" fontcolor="{NAVY}"];
 S0 [label="S0\\nnot created" shape=circle fillcolor="white" width=1.1];
 S1 [label="S1\\nActive" fillcolor="#DCEFF0"]; S2 [label="S2\\nCompleted" fillcolor="#E3F1E3"];
 S3 [label="S3\\nEditing\\n(from Active)"]; S4 [label="S4\\nEditing\\n(from Completed)"];
 S5 [label="S5\\nDeleted" shape=doublecircle fillcolor="#FBE3DB" width=1.0];
 S0 -> S1 [label="T1 add"]; S1 -> S2 [label="T2 toggle"]; S2 -> S1 [label="T3 toggle"];
 S1 -> S3 [label="T4 dblclick"]; S2 -> S4 [label="T5 dblclick"];
 S3 -> S1 [label="T6 enter/blur (text)\\nT8 esc"]; S4 -> S2 [label="T7 enter/blur (text)\\nesc"];
 S3 -> S5 [label="T9 enter (empty)"]; S1 -> S5 [label="T10 ×"]; S2 -> S5 [label="T11 ×\\nT12 clear completed"];
}}""")

render("cause_effect_graph", f"""digraph G {{
 rankdir=LR; nodesep=0.35; ranksep=1.3; node [{FONT} fontsize=13]; edge [{FONT} color="{NAVY}" arrowsize=0.8 fontsize=13];
 {{ rank=same; node [shape=box style="rounded,filled" fillcolor="#DCEFF0" color="{TEAL}" width=2.3];
   C1 [label="C1  Enter pressed"]; C2 [label="C2  Field blurred"]; C4 [label="C4  Title non-empty\nafter trim"]; C3 [label="C3  Escape pressed"]; }}
 {{ rank=same; node [shape=circle style=filled fillcolor="white" color="{NAVY}" width=0.5 fixedsize=true fontsize=16];
   OR [label="∨"]; AND1 [label="∧"]; AND2 [label="∧"]; }}
 {{ rank=same; node [shape=box style="rounded,filled" fillcolor="#FBE3DB" color="{CORAL}" width=2.3];
   E1 [label="E1  Title updated\n(trimmed)"]; E2 [label="E2  Item deleted"]; E3 [label="E3  Original title\nrestored"]; }}
 C1 -> OR; C2 -> OR; OR -> AND1; OR -> AND2; C4 -> AND1; C4 -> AND2 [label="¬" fontcolor="{CORAL}" color="{CORAL}"];
 AND1 -> E1; AND2 -> E2; C3 -> E3 [color="{TEAL}"];
 C3 -> AND1 [label="¬ (masks)" style=dashed color="{CORAL}" fontcolor="{CORAL}" fontsize=11]; C3 -> AND2 [style=dashed color="{CORAL}"];
}}""")

render("radio_state_machine", f"""digraph G {{
 rankdir=LR; node [{FONT} shape=box style="rounded,filled" fillcolor="{SAND}" color="{NAVY}" fontsize=13]; edge [{FONT} fontsize=11 color="{GREY}"];
 N [label="none selected"]; R1 [label="radio1 ✓"]; R2 [label="radio2 ✓"];
 N -> R1 [label="check(radio1)"]; N -> R2 [label="check(radio2)"]; R1 -> R2 [label="check(radio2)"]; R2 -> R1 [label="check(radio1)"];
 R1 -> R1 [label="check(radio1)"]; R2 -> R2 [label="check(radio2)"];
 X [label="radio3 (disabled)\\nnever reachable" fillcolor="#FBE3DB" color="{CORAL}"]; N -> X [style=dashed color="{CORAL}" label="refused"];
}}""")

render("harness_architecture", f"""digraph G {{
 rankdir=LR; compound=true; node [{FONT} shape=box style="rounded,filled" fontsize=12 color="{NAVY}" fillcolor="white"]; edge [{FONT} fontsize=10 color="{GREY}"];
 subgraph cluster_specs {{ label="Test design (38 specs · 582 cases)"; style="rounded,filled"; fillcolor="#DCEFF0"; color="{TEAL}"; fontname="Helvetica";
   specs [label="cypress/e2e/*\\ntc({{id, technique, req, …}})"]; fx [label="fixtures\\npages · comment · a11y baseline"]; }}
 subgraph cluster_support {{ label="Support layer"; style="rounded,filled"; fillcolor="{SAND}"; color="{NAVY}"; fontname="Helvetica";
   cmds [label="custom commands\\nvisitPage · checkA11y · matchSnapshot\\npageMetrics · visitTodos"]; tcjs [label="tc.js\\nIDs · known-defect tests"]; }}
 subgraph cluster_runner {{ label="Cypress 16 runner"; style="rounded,filled"; fillcolor="white"; color="{NAVY}"; fontname="Helvetica";
   cy [label="Chrome · Firefox · Edge · Electron"]; net [label="cy.intercept\\n(stub third-party API)"]; }}
 sut [label="Kitchen Sink (pinned)\\nserved on :8080" fillcolor="#FBE3DB" color="{CORAL}"];
 subgraph cluster_node {{ label="Node side (setupNodeEvents)"; style="rounded,filled"; fillcolor="{SAND}"; color="{NAVY}"; fontname="Helvetica";
   tasks [label="tasks: tcMeta · evidence\\ncompareSnapshot (pixelmatch)"]; rep [label="reporters\\nspec · mochawesome · JUnit"]; }}
 agg [label="tools/aggregate.js\\nresults-<browser>.json" fillcolor="#E3F1E3"];
 docs [label="report · deck · workbook\\ndashboard · video" fillcolor="#E3F1E3"];
 specs -> cmds; fx -> specs; tcjs -> specs; cmds -> cy; cy -> sut [label="drives"]; net -> sut [style=dashed];
 cy -> tasks; cy -> rep; tasks -> agg; rep -> agg; agg -> docs;
}}""")

render("ci_pipeline", f"""digraph G {{
 rankdir=LR; node [{FONT} shape=box style="rounded,filled" fontsize=12 color="{NAVY}" fillcolor="white"]; edge [color="{GREY}"];
 push [label="git push" shape=circle fillcolor="{SAND}"];
 lint [label="Lint\\nESLint + cypress plugin"];
 subgraph cluster_m {{ label="E2E matrix"; style="rounded"; color="{TEAL}"; fontname="Helvetica"; chrome [label="Chrome"]; firefox [label="Firefox"]; msedge [label="Edge"]; electron [label="Electron"]; }}
 cov [label="Coverage\\n(instrumented app)"]; mut [label="Mutation testing\\n4 shards · 32 mutants"];
 pub [label="results branch\\nevidence" fillcolor="#E3F1E3"];
 push -> lint; push -> chrome; push -> firefox; push -> msedge; push -> electron; push -> cov; push -> mut;
 chrome -> pub; firefox -> pub; msedge -> pub; electron -> pub; cov -> pub; mut -> pub;
}}""")

render("vmodel", f"""digraph G {{
 rankdir=TB; nodesep=0.5; ranksep=0.35; node [{FONT} shape=box style="rounded,filled" fontsize=12 width=2.6 color="{NAVY}"]; edge [color="{GREY}"];
 {{rank=same; r [label="User needs\\n(assignment brief)" fillcolor="{SAND}"]; a [label="Acceptance testing\\n17-acceptance (UAT)" fillcolor="#E3F1E3"];}}
 {{rank=same; s [label="Requirements\\n53 REQ-* items" fillcolor="{SAND}"]; st [label="System testing\\nsmoke · nav · http · a11y · perf · sec" fillcolor="#E3F1E3"];}}
 {{rank=same; d [label="Page / component design\\n(Kitchen Sink sections)" fillcolor="{SAND}"]; it [label="Component-integration\\nUI ↔ JS ↔ storage ↔ network" fillcolor="#E3F1E3"];}}
 {{rank=same; c [label="Code\\nscripts.js · todo/*.js" fillcolor="{SAND}"]; u [label="Component tests\\nforms · todo logic · coverage · mutation" fillcolor="#E3F1E3"];}}
 r -> s -> d -> c; u -> it -> st -> a;
 r -> a [style=dashed constraint=false label=" validates" fontname="Helvetica" fontsize=10];
 s -> st [style=dashed constraint=false]; d -> it [style=dashed constraint=false]; c -> u [style=dashed constraint=false];
}}""")
print("diagrams written to", OUT)
