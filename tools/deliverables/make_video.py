"""Cut a captioned demo video from the real Cypress run videos (Chrome) published to the results branch.

    python3 tools/deliverables/make_video.py <evidence_dir> [out.mp4]

<evidence_dir> is a checkout of the results branch's latest/ folder. Every clip is a real
recording of the suite; only title cards and captions are added.
"""
import glob
import json
import os
import subprocess
import sys
import tempfile

EV = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', '..', 'deliverables', 'CKS_Demo_Video.mp4')
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
W, H, FPS = 1280, 720, 30
INK, GREEN = '0x1B1E2E', '0x2E9E6E'

SEGMENTS = [
    ('02-navigation/navbar.cy.js', 'Navigation', 'Every Commands menu entry opens its page, in order', 'TC-NAV-001…034'),
    ('03-form-controls/text-inputs.cy.js', 'Form controls · text', 'Typing, special-key sequences, focus and blur styles', 'TC-FC-001…032'),
    ('03-form-controls/email-validation.cy.js', 'Form controls · ECP', '17 equivalence classes checked with the Constraint Validation API', 'TC-FC-040…056'),
    ('03-form-controls/checkboxes-radios.cy.js', 'Form controls · decision table', 'All 2³ checkbox rules and radio mutual exclusion', 'TC-FC-080…099'),
    ('03-form-controls/range-bva.cy.js', 'Form controls · BVA', 'Range slider: min−1, min, min+1 … max+1, robust and step values', 'TC-FC-140…161'),
    ('04-ui-interactions/click.cy.js', 'UI interactions', 'Clicks on 9 canvas positions, verified pixel by pixel', 'TC-UI-001…021'),
    ('05-assertions/assertions.cy.js', 'Assertions', 'should / and / expect / assert, retry-ability, custom chai', 'TC-AS-001…016'),
    ('07-todo-app/todo-state-transition.cy.js', 'Todo · state transitions', '12 valid transitions, invalid events and a 1-switch path', 'TC-TD-100…117'),
    ('17-acceptance/demo-journeys.cy.js', 'Acceptance', 'Given / When / Then user journeys', 'TC-UAT-001…005'),
]
MAX_CLIP = 22  # seconds of each recording kept (sped up 1.25x)


def esc(s):
    return s.replace('\\', '\\\\').replace(':', '\\:').replace("'", '’').replace('%', '\\%')


def run(args):
    subprocess.run(args, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def card(path, lines, secs):
    """lines: [(text, font, size, color, y)]"""
    vf = ','.join(f"drawtext=fontfile={f}:text='{esc(t)}':fontsize={s}:fontcolor={c}:x=(w-text_w)/2:y={y}" for t, f, s, c, y in lines)
    run(['ffmpeg', '-y', '-f', 'lavfi', '-i', f'color=c={INK}:s={W}x{H}:d={secs}:r={FPS}', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
         '-t', str(secs), '-vf', vf, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', path])


def clip(src, path, title, caption, ids):
    bar = (f"pad={W}:{H}:(ow-iw)/2:0:color={INK},"
           f"drawbox=x=0:y={H - 88}:w={W}:h=88:color={INK}@1:t=fill,"
           f"drawtext=fontfile={BOLD}:text='{esc(title)}':fontsize=26:fontcolor=white:x=32:y={H - 78},"
           f"drawtext=fontfile={FONT}:text='{esc(caption)}':fontsize=20:fontcolor=0xC9D1E3:x=32:y={H - 40},"
           f"drawtext=fontfile={MONO}:text='{esc(ids)}':fontsize=20:fontcolor={GREEN}:x=w-text_w-32:y={H - 74}")
    run(['ffmpeg', '-y', '-i', src, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', str(MAX_CLIP / 1.25),
         '-vf', f"setpts=PTS/1.25,scale={W}:-2:force_original_aspect_ratio=decrease,{bar},fps={FPS}",
         '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', path])


def main():
    vids = {p.split('/videos/')[-1].split('cypress/videos/')[-1]: p for p in glob.glob(os.path.join(EV, 'browsers', 'chrome', 'videos', '**', '*.mp4'), recursive=True)}
    summaries = {}
    for f in glob.glob(os.path.join(EV, 'browsers', '*', 'results-*.json')):
        j = json.load(open(f))
        summaries[j['summary']['browser']] = j['summary']
    tmp = tempfile.mkdtemp()
    parts = []
    p = os.path.join(tmp, '00.mp4')
    card(p, [('SVV · FT3 AUTOMATED TESTING · CYPRESS 16', BOLD, 22, GREEN, 230), ('Interactive Web Components Testing', BOLD, 48, 'white', 280),
             ('Cypress Kitchen Sink · real recordings from the CI run (Chrome)', FONT, 24, '0xC9D1E3', 360),
             ('Team 6 · Raktim Chandra · Juhi Hai · Rijit Ghosh · Shaurya Rathi', BOLD, 22, 'white', 450),
             ('SRMIST · B.Tech CSE (SE) · Faculty: Mr. Kaviyaraj R.', FONT, 20, '0xC9D1E3', 490)], 5)
    parts.append(p)
    for i, (spec, title, caption, ids) in enumerate(SEGMENTS, 1):
        src = next((v for k, v in vids.items() if k.endswith(spec + '.mp4')), None)
        if not src:
            print('missing video for', spec)
            continue
        c = os.path.join(tmp, f'{i:02d}c.mp4')
        card(c, [(f'{i:02d}', BOLD, 64, GREEN, 260), (title, BOLD, 40, 'white', 350), (caption, FONT, 22, '0xC9D1E3', 410)], 2.5)
        v = os.path.join(tmp, f'{i:02d}v.mp4')
        clip(src, v, title, caption, ids)
        parts += [c, v]
    lines = [('Results', BOLD, 44, 'white', 190)]
    y = 270
    for b in ['chrome', 'firefox', 'edge', 'electron']:
        s = summaries.get(b)
        if s:
            lines.append((f"{b.capitalize():9s}  {s['total']} cases · {s['pass']} pass · {s['knownDefect']} known defects · {s['fail']} fail · {s['skipped']} skipped", MONO, 22, '0xE6EAF2', y))
            y += 44
    lines.append(('github.com/RaktimChandra/cypress-kitchen-sink-testing', FONT, 22, GREEN, y + 40))
    p = os.path.join(tmp, '99.mp4')
    card(p, lines, 6)
    parts.append(p)
    lst = os.path.join(tmp, 'list.txt')
    open(lst, 'w').write(''.join(f"file '{x}'\n" for x in parts))
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    run(['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c:v', 'libx264', '-crf', '26', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', OUT])
    print('video ->', OUT)


if __name__ == '__main__':
    main()
