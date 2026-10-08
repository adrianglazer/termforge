#!/usr/bin/env python3
"""Build task 11 additions with FFmpeg; retain originals and existing upload sets."""
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
OUT = ROOT / 'promo-app-store/app-preview'
OUT.mkdir(parents=True, exist_ok=True)

def run(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)], check=True)

def box(x, y, w, h, color):
    return f'drawbox=x={x}:y={y}:w={w}:h={h}:color={color}:t=fill'

def label(value, x, y, size, color='0xe4ebef', bold=False):
    return f"drawtext=fontfile={BOLD if bold else FONT}:text='{value}':x={x}:y={y}:fontsize={size}:fontcolor={color}"

# Exact safe excerpts already used for the website. Playback is 2/3 speed to
# give the screen text time to read; no connections or UI actions are invented.
segments = [
    (56, 2, [box(8,108,249,42,'0x202b39'), label('admin@ [host hidden]',14,120,18),
             box(89,331,88,1035,'black'), label('admin',95,334,19)], 'Remote tools. Live output.'),
    (64, 4, [box(8,108,249,42,'0x202b39'), label('admin@ [host hidden]',14,120,18),
             box(124,202,300,51,'0x111827'), label('/home/admin',131,215,25)], 'Browse remote files.'),
    (138, 4, [box(10,165,200,39,'0x111827'), label('Terminal 1',22,173,22),
              box(10,507,200,40,'0x111827'), label('Terminal 2',22,516,22),
              box(0,562,270,63,'black'), label('admin@ [host hidden]',6,572,18),
              box(87,439,88,37,'black')], 'Two panes. One workspace.'),
]
with tempfile.TemporaryDirectory(prefix='termforge-preview-') as tmp:
    tmp = Path(tmp)
    for i, (start, duration, masks, caption) in enumerate(segments):
        filters = masks + [
            'setpts=1.5*(PTS-STARTPTS)', 'fps=30',
            'pad=720:1678:0:72:color=0x101213',
            label(caption, '(w-text_w)/2', 22, 28, bold=True),
            label('Full access requires trial or lifetime unlock.', '(w-text_w)/2', 1643, 22, '0xaab0b1'),
            'scale=886:1920:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=lanczos',
            'pad=886:1920:(ow-iw)/2:(oh-ih)/2:color=0x101213', 'setsar=1'
        ]
        run('-ss', start, '-t', duration, '-i', ROOT/'promo/1791468217117748.MP4',
            '-vf', ','.join(filters), '-an', '-frames:v', int(duration*1.5*30),
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
            '-map_metadata', '-1', tmp/f'clip-{i}.mp4')
    (tmp/'clips.txt').write_text(''.join(f"file '{tmp}/clip-{i}.mp4'\n" for i in range(3)))
    run('-f', 'concat', '-safe', '0', '-i', tmp/'clips.txt',
        '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '15',
        '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'slow',
        '-profile:v', 'high', '-level:v', '4.0', '-b:v', '10M', '-minrate', '10M',
        '-maxrate', '10M', '-bufsize', '20M', '-x264-params', 'nal-hrd=cbr:filler=1',
        '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '256k',
        '-ar', '48000', '-ac', '2', '-map_metadata', '-1', '-movflags', '+faststart',
        OUT/'preview.mp4')
run('-ss', '5', '-i', OUT/'preview.mp4', '-frames:v', '1', '-pix_fmt', 'rgb24',
    '-map_metadata', '-1', OUT/'poster.png')

# Social artwork belongs outside Apple upload directories. Reuse the existing
# exact app icon and sanitized real captures, with no price or fake UI.
social = ROOT/'web-social'
social.mkdir(exist_ok=True)
filters = [
    '[0:v]scale=1200:630:flags=lanczos[bg]',
    '[1:v]scale=78:78[icon]',
    '[2:v]scale=218:-1:flags=lanczos[t]',
    '[3:v]scale=175:-1:flags=lanczos[f]',
    '[bg][icon]overlay=64:98[b1]', '[b1][f]overlay=967:164[b2]',
    '[b2][t]overlay=756:89[b3]',
    '[b3]'+','.join([
        label('TERMFORGE',164,122,34,'0xf2a65a',True),
        label('Your remote',64,256,64,bold=True),
        label('workstation.',64,338,64,bold=True),
        label('SSH  ·  SFTP  ·  Workspaces',68,460,26,'0xaab7bf'),
    ])+'[final]'
]
run('-i', ROOT/'creative-source/background.png', '-i', REPO/'assets/icon.png',
    '-i', ROOT/'creative-source/terminal.png', '-i', ROOT/'creative-source/files.png',
    '-filter_complex', ';'.join(filters), '-map', '[final]', '-frames:v', '1',
    '-q:v', '3', '-pix_fmt', 'yuvj420p', '-map_metadata', '-1', social/'social-preview.jpg')

# Editable capture slots are drafts, never upload-ready screenshots.
drafts = REPO/'release/app-store/drafts'
for slug, first, second, caption in [
    ('editor', 'Small edits.', 'Right where you work.', 'Edit remote UTF-8 text files.'),
    ('snippets', 'Useful commands.', 'Ready when you are.', 'Save snippets for your remote workflow.')
]:
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="2868" viewBox="0 0 1320 2868">
<rect width="1320" height="2868" fill="#101213"/>
<g font-family="DejaVu Sans, sans-serif" fill="#e4ebef">
<text x="130" y="102" font-size="32" font-weight="bold" fill="#f2a65a">TERMFORGE</text>
<text x="130" y="198" font-size="70" font-weight="bold">{first}</text>
<text x="130" y="291" font-size="70" font-weight="bold">{second}</text>
<text x="130" y="374" font-size="32">{caption}</text>
<rect x="130" y="416" width="1060" height="2294" fill="#171e24" stroke="#f2a65a" stroke-width="4"/>
<text x="660" y="1480" text-anchor="middle" font-size="52" fill="#f2a65a">CAPTURE REQUIRED</text>
<text x="660" y="1565" text-anchor="middle" font-size="30">Actual app UI only · do not upload this draft</text>
<text x="130" y="2810" font-size="25" fill="#aab0b1">Full access requires trial or lifetime unlock.</text>
</g></svg>'''
    (drafts/(slug+'.svg')).write_text(svg)
print('Prepared Apple preview, poster, social image and editable capture drafts.')
