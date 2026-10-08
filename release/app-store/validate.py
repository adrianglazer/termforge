#!/usr/bin/env python3
"""Validate publishing fields/media and refresh counts and the asset manifest."""
from pathlib import Path
import csv
import hashlib
import json
import subprocess
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FIELDS = {
    'name': (30, 'characters'), 'subtitle': (30, 'characters'),
    'promotional-text': (170, 'characters'), 'description': (4000, 'characters'),
    'keywords': (100, 'bytes'), 'review-notes': (4000, 'characters'),
    'iap-trial-name': (30, 'characters'), 'iap-lifetime-name': (30, 'characters'),
    'iap-trial-description': (45, 'characters'), 'iap-lifetime-description': (45, 'characters'),
}
counts = []
for field, (limit, unit) in FIELDS.items():
    value = (HERE/'en-US'/f'{field}.txt').read_text(encoding='utf-8')
    chars, size = len(value), len(value.encode('utf-8'))
    assert (size if unit == 'bytes' else chars) <= limit, field
    assert value and value == value.strip() and 'CAPTURE REQUIRED' not in value, field
    counts.append({'field': field, 'characters': chars, 'utf8_bytes': size, 'limit': limit, 'limit_unit': unit})
keywords = (HERE/'en-US/keywords.txt').read_text().split(',')
assert all(len(word) > 2 and word.strip() == word for word in keywords)
assert len(set(keywords)) == len(keywords)
assert 'termforge' not in keywords
(HERE/'field-counts.json').write_text(json.dumps(counts, indent=2)+'\n')

def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)
    ]))

def decode(path):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-xerror',
                    '-i', str(path), '-f', 'null', '-'], check=True, stdout=subprocess.DEVNULL)

source = {'terminal': 'IMG_7880.PNG', 'workspace': 'IMG_7887.PNG',
          'files': 'IMG_7882.PNG', 'servers': 'IMG_7879.PNG', 'keys': 'IMG_7883.PNG'}
rows = []
def add(path, purpose, provenance, status, replacement, expected=None):
    p = probe(path)
    v = next(s for s in p['streams'] if s['codec_type'] == 'video')
    dims = (v['width'], v['height'])
    if expected: assert dims == expected, (path, dims)
    assert v['pix_fmt'] in {'rgb24','yuvj420p','yuv420p','yuvj444p','yuvj422p'}, (path,v['pix_fmt'])
    decode(path)
    duration = p['format'].get('duration', '') if path.suffix == '.mp4' else ''
    rows.append({'filename': str(path.relative_to(ROOT)), 'purpose': purpose, 'locale': 'en-US',
        'dimensions': f'{dims[0]}x{dims[1]}', 'format': path.suffix[1:], 'bytes': path.stat().st_size,
        'duration_seconds': duration, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'source_provenance': provenance, 'status': status, 'replacement': replacement})
    return p

apple = ROOT/'promo-assets/promo-app-store'
for display, portrait, landscape in [
    ('large-display',(1320,2868),(2868,1320)),
    ('medium-display',(1179,2556),(2556,1179))
]:
    for name in ['terminal','workspace','files','servers','keys']:
        path = apple/display/(name+'.jpg')
        add(path, f'{display} screenshot: {name}',
            'Owner iPhone capture promo-assets/promo/'+source[name]+'; FFmpeg exact redaction and caption composition',
            'ready-media; owner must confirm build match',
            'Regenerate website/prepare-promo.py; retain originals and validate both display sets',
            landscape if name == 'workspace' else portrait)
for name, dims in [('header',(3840,1646)),('search-results',(1920,1280))]:
    add(apple/name/(name+'.png'), f'Apple creative {name} slot',
        'Existing app icon, ImageGen decorative background, genuine redacted captures; FFmpeg composition',
        'ready-media', 'Regenerate promo-assets/prepare-creative.py', dims)
v = add(apple/'app-preview/preview.mp4','Optional App Store preview (both Dynamic Island slots)',
    'Owner recording 1791468217117748.MP4 at 56–58,64–68,138–142s; exact FFmpeg masks, 2/3-speed playback',
    'ready-media; owner must confirm build match', 'Regenerate promo-assets/prepare-app-store.py', (886,1920))
video = next(s for s in v['streams'] if s['codec_type']=='video')
audio = next(s for s in v['streams'] if s['codec_type']=='audio')
assert 15 <= float(v['format']['duration']) <= 30
assert int(v['format']['size']) < 500_000_000
assert video['codec_name']=='h264' and video['profile']=='High' and video['level']==40
assert video['r_frame_rate']=='30/1' and video['field_order']=='progressive'
assert audio['codec_name']=='aac' and audio['channels']==2 and audio['sample_rate']=='48000'
add(apple/'app-preview/poster.png','Preview poster reference at 5 seconds',
    'Frame extracted from completed preview', 'ready-media; choose frame in Apple UI',
    'Regenerate promo-assets/prepare-app-store.py', (886,1920))
add(apple/'icon/icon.png','1024px app icon reference; app bundle manages listing icon',
    'Existing assets/icon.png; FFmpeg RGB export, no redesign', 'ready-media',
    'Re-export existing icon only if brand source changes', (1024,1024))
add(ROOT/'promo-assets/web-social/social-preview.jpg','Website/social sharing artwork, not Apple screenshot',
    'Same licensed/supplied icon, decorative background and redacted app capture compositions',
    'ready-media; outside Apple upload directory','Regenerate promo-assets/prepare-app-store.py',(1200,630))
for path in sorted((ROOT/'website/assets/media').glob('*')):
    if path.suffix not in {'.mp4','.webp'}:continue
    # WebP is opaque yuv420p here; the same decode/probe checks apply.
    add(path, 'Existing optimized website image/demo',
        'Owner captures/recording; website/prepare-promo.py masks/compositions',
        'ready-website-media; not Apple upload', 'Regenerate website/prepare-promo.py')
for path in sorted((HERE/'drafts').glob('*.svg')):
    tree = ET.parse(path)
    assert 'CAPTURE REQUIRED' in path.read_text()
    rows.append({'filename':str(path.relative_to(ROOT)), 'purpose':'Optional editable screenshot slot',
        'locale':'en-US','dimensions':'1320x2868','format':'svg','bytes':path.stat().st_size,
        'duration_seconds':'','sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
        'source_provenance':'Code-native typography and empty capture slot; no fabricated app UI',
        'status':'draft; never upload','replacement':'Supply genuine capture per capture-checklist.md; compose with FFmpeg'})
for folder in HERE.joinpath('ready').iterdir():
    assert folder.is_dir() and folder.is_symlink() and folder.resolve().is_relative_to(apple)
    assert all(p.suffix in {'.jpg','.png','.mp4'} for p in folder.iterdir())
with (HERE/'asset-manifest.csv').open('w', newline='') as f:
    writer=csv.DictWriter(f, fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
print(json.dumps({'fields':counts,'manifest_assets':len(rows),'apple_media':15,
                  'preview_seconds':v['format']['duration'],'preview_bytes':v['format']['size']},indent=2))
