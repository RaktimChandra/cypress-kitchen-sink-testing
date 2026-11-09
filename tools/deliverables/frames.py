"""Extract still frames from the real CI recordings (Chrome) for the deck and report.

    python3 tools/deliverables/frames.py <evidence latest/ dir> [out_dir]
"""
import glob
import os
import subprocess
import sys

EV = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', '..', 'deliverables', 'build', 'frames')
PICKS = {  # spec -> fraction of the recording
    '03-form-controls/text-inputs.cy.js': 0.55, '03-form-controls/range-bva.cy.js': 0.45, '03-form-controls/checkboxes-radios.cy.js': 0.7,
    '03-form-controls/select.cy.js': 0.6, '02-navigation/navbar.cy.js': 0.5, '02-navigation/anchors-and-routes.cy.js': 0.85,
    '04-ui-interactions/click.cy.js': 0.95, '04-ui-interactions/scroll-trigger.cy.js': 0.6, '07-todo-app/todo-state-transition.cy.js': 0.9,
    '07-todo-app/todo-functional.cy.js': 0.75, '17-acceptance/demo-journeys.cy.js': 0.9, '05-assertions/assertions.cy.js': 0.7,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    vids = glob.glob(os.path.join(EV, 'browsers', 'chrome', 'videos', '**', '*.mp4'), recursive=True)
    for spec, frac in PICKS.items():
        v = next((x for x in vids if x.endswith(spec + '.mp4')), None)
        if not v:
            print('no video for', spec)
            continue
        frames = int(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', v]).decode().strip().split(',')[0] or 1)
        k = max(0, min(frames - 1, int(frames * frac)))
        name = spec.split('/')[-1].replace('.cy.js', '') + '.png'
        # pick by frame index: container durations are longer than the stream for short recordings
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', v, '-vf', f'select=eq(n\\,{k})', '-frames:v', '1', os.path.join(OUT, name)], check=True)
    print('frames ->', OUT)


if __name__ == '__main__':
    main()
