"""Add slide transitions and staggered entrance animations to a pptxgenjs deck.

    python3 tools/deliverables/animate_pptx.py deck.pptx

Shapes whose name starts with "anim-<n>" fade in automatically after the slide opens,
grouped by <n> (all shapes of one card share a number) in ascending order, 180 ms apart.
Every slide gets a fade transition; slides whose first shape is named "transition-push"
get a push transition instead. Nothing waits for a click, so the deck still runs as a
normal click-through presentation.
"""
import re
import shutil
import sys
import tempfile
import zipfile

P_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main'


def timing_xml(groups):
    ids = iter(range(3, 100000))
    pars = []
    for i, (_, spids) in enumerate(groups):
        effects = []
        for spid in spids:
            a, b, c = next(ids), next(ids), next(ids)
            effects.append(
                f'<p:par><p:cTn id="{a}" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" nodeType="withEffect">'
                f'<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
                f'<p:set><p:cBhvr><p:cTn id="{b}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
                f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
                f'<p:to><p:strVal val="visible"/></p:to></p:set>'
                f'<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="{c}" dur="450"/>'
                f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:animEffect>'
                f'</p:childTnLst></p:cTn></p:par>')
        g = next(ids)
        pars.append(f'<p:par><p:cTn id="{g}" fill="hold"><p:stCondLst><p:cond delay="{i * 180}"/></p:stCondLst>'
                    f'<p:childTnLst>{"".join(effects)}</p:childTnLst></p:cTn></p:par>')
    outer = next(ids)
    return ('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
            '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
            f'<p:par><p:cTn id="{outer}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>'
            '<p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst>'
            f'<p:childTnLst>{"".join(pars)}</p:childTnLst></p:cTn></p:par>'
            '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
            '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
            '</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>')


def process(xml):
    groups = {}
    push = 'name="transition-push"' in xml
    for m in re.finditer(r'<p:cNvPr id="(\d+)" name="anim-(\d+)[^"]*"', xml):
        groups.setdefault(int(m.group(2)), []).append(m.group(1))
    xml = re.sub(r'<p:transition\b.*?</p:transition>|<p:transition\b[^>]*/>', '', xml, flags=re.S)
    xml = re.sub(r'<p:timing>.*?</p:timing>', '', xml, flags=re.S)
    trans = '<p:transition spd="med"><p:push dir="u"/></p:transition>' if push else '<p:transition spd="med"><p:fade/></p:transition>'
    tail = trans + (timing_xml(sorted(groups.items())) if groups else '')
    # transition and timing follow clrMapOvr (or cSld) and precede extLst
    if '<p:extLst>' in xml.split('</p:cSld>', 1)[1]:
        head, rest = xml.split('</p:cSld>', 1)
        i = rest.index('<p:extLst>')
        rest = rest[:i] + tail + rest[i:]
        return head + '</p:cSld>' + rest, sum(len(v) for v in groups.values())
    return xml.replace('</p:sld>', tail + '</p:sld>'), sum(len(v) for v in groups.values())


def main(path):
    tmp = tempfile.mktemp(suffix='.pptx')
    total = 0
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if re.match(r'ppt/slides/slide\d+\.xml$', item.filename):
                xml, n = process(data.decode('utf-8'))
                total += n
                data = xml.encode('utf-8')
            zout.writestr(item, data)
    shutil.move(tmp, path)
    print(f'animated {total} shapes in {path}')


if __name__ == '__main__':
    main(sys.argv[1])
