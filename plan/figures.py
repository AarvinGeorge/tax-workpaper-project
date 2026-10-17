"""Plan-page figure: where the workpaper sits in a tax return's season.

Mirrors the published one-page visual (docs/design/pipeline/tax-return-pipeline.html,
https://claude.ai/artifact/BBe8JBbSwWdtDz8MNnE71Y). Colors derive from currentColor so the
figure reads in either page theme.
"""

STEPS = [
    ("1", "Engage", "organizer questionnaire", "before"),
    ("2", "Collect", "74 documents", "before"),
    ("3", "Extract", "~3,000 values (not ours)", "before"),
    ("4", "Compute", "v1, v2, v3 (not ours)", "before"),
    ("5", "Prove and review", "our workpaper", "us"),
    ("6", "Approve", "each spouse e-signs 8879", "us"),
    ("7", "E-file", "extension, rejection fixed", "us"),
    ("8", "Freeze", "client copy, amend on top", "us"),
    ("9", "Defend", "answer the 2028 letter", "us"),
    ("10", "Next year", "carry forward, plan 2026", "us"),
]

CSS = """
.pl-fig{display:flex;flex-direction:column;gap:10px;margin:8px 0 20px}
.pl-row{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:6px}
.pl-st{border:1px solid color-mix(in oklab,currentColor 22%,transparent);border-radius:6px;padding:8px;display:flex;flex-direction:column;gap:2px;min-width:0}
.pl-st.before{background:color-mix(in oklab,currentColor 5%,transparent)}
.pl-st.us{border:2px solid currentColor;font-weight:600}
.pl-n{font-family:ui-monospace,Menlo,monospace;font-size:11px;opacity:.7}
.pl-t{font-size:13px;line-height:1.2}
.pl-s{font-size:11.5px;opacity:.75;font-weight:400}
.pl-firm{font-size:12.5px;border:1px dashed color-mix(in oklab,currentColor 30%,transparent);border-radius:6px;padding:6px 10px}
.pl-cap{font-size:13px;opacity:.85}
@media (max-width:900px){.pl-row{grid-template-columns:repeat(2,minmax(0,1fr))}}
"""


def build(data):
    cells = "".join(
        '<div class="pl-st %s"><span class="pl-n">%s</span><span class="pl-t">%s</span>'
        '<span class="pl-s">%s</span></div>' % (band, n, title, sub)
        for n, title, sub, band in STEPS
    )
    return (
        '<div class="pl-fig" role="figure" aria-label="Where the workpaper sits in the tax return pipeline">'
        '<p class="pl-cap"><strong>Where the workpaper sits.</strong> Steps 1 to 4 are a draft machines made '
        '(extraction and the tax engine are not ours); steps 5 to 10 are our app: people prove the return, the clients sign, '
        'it is filed, frozen, defended and carried into next year.</p>'
        '<div class="pl-row">%s</div>'
        '<div class="pl-firm">Firm layer across every step: standards, roles, sensitive data masked and every view logged, '
        'time against budget, status and search.</div>'
        '<p class="pl-cap">Full one-page visual: '
        '<a href="https://claude.ai/artifact/BBe8JBbSwWdtDz8MNnE71Y">Tax Return Pipeline</a> '
        '(source in docs/design/pipeline/).</p></div>' % cells
    )
