#!/usr/bin/env python3
"""Prepare these specific captures with FFmpeg; originals remain untouched."""
from pathlib import Path
import subprocess,tempfile
root=Path(__file__).resolve().parent
work=tempfile.TemporaryDirectory(prefix='termforge-promo-')
workdir=Path(work.name)
src=root.parent/'promo-assets/promo'; web=root/'assets/media'; store=root.parent/'promo-assets/promo-app-store'; web.mkdir(exist_ok=True);store.mkdir(exist_ok=True)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
commands=[]
def run(args):
    cmd=['ffmpeg','-hide_banner','-loglevel','error','-y',*args];commands.append(cmd);subprocess.run(cmd,check=True)
def box(x,y,w,h,c):return f'drawbox=x={x}:y={y}:w={w}:h={h}:color={c}:t=fill'
def text(t,x,y,size=32,color='0xe4ebef',strong=False):
    return f"drawtext=fontfile={bold if strong else font}:text='{t}':x={x}:y={y}:fontsize={size}:fontcolor={color}"
header=[box(8,174,407,66,'0x202b39'),text('Connection hidden',22,185,30)]
items=[
('servers','IMG_7879.PNG',[box(107,1340,570,145,'0x171e24'),text('Demo server',119,1360,46,strong=True),text('admin@ [host hidden]',119,1426,37,'0x88939e')],['Your servers.','Within reach.'],'Saved profiles. One place to connect.'),
('terminal','IMG_7880.PNG',header+[box(150,744,177,38,'black'),text('admin',153,746,31,'0xc9c9c9'),box(150,1212,177,38,'black'),text('admin',153,1214,31,'0xc9c9c9')],['A real terminal.','On your iPhone.'],'SSH access to the tools on your server.'),
('files','IMG_7882.PNG',header+[box(204,342,430,83,'0x111827'),text('/home/admin',217,362,39)],['Remote files.','Close at hand.'],'Browse and transfer files with SFTP.'),
('keys','IMG_7883.PNG',[box(105,2185,965,123,'0x161b22')],['Your keys.','On your iPhone.'],'Ed25519 keys protected by iOS Keychain.'),
]
for slug,name,filters,lines,subtitle in items:
    clean=workdir/(slug+'-clean.png')
    run(['-i',str(src/name),'-vf',','.join(filters) if filters else 'null','-frames:v','1','-map_metadata','-1',str(clean)])
    run(['-i',str(clean),'-vf','scale=540:-1:flags=lanczos','-frames:v','1','-c:v','libwebp','-quality','78','-compression_level','6','-map_metadata','-1',str(web/(slug+'.webp'))])
    promo=['scale=1060:2294:flags=lanczos','pad=1320:2868:130:416:color=0x101213',text('TERMFORGE',130,65,32,'0xf2a65a',True),text(lines[0],130,135,74,strong=True),text(lines[1],130,228,74,strong=True),text(subtitle,130,341,32),text('Full access requires trial or lifetime unlock.',130,2784,25,'0xaab0b1')]
    run(['-i',str(clean),'-vf',','.join(promo),'-frames:v','1','-q:v','5','-pix_fmt','yuvj420p','-map_metadata','-1',str(store/(slug+'.jpg'))])
    run(['-i',str(store/(slug+'.jpg')),'-vf','scale=540:-1:flags=lanczos','-frames:v','1','-c:v','libwebp','-quality','78','-compression_level','6','-map_metadata','-1',str(web/(slug+'-promo.webp'))])
# Website hero: recolor only htop, preserving the captured text and app chrome.
channels = ["r(X,Y)", "g(X,Y)", "b(X,Y)"]
maximum = "max(r(X,Y),max(g(X,Y),b(X,Y)))"
minimum = "min(r(X,Y),min(g(X,Y),b(X,Y)))"
luma = "(0.2126*r(X,Y)+0.7152*g(X,Y)+0.0722*b(X,Y))"
hero_channels = []
for channel, background, white, amber in zip(channels, [16,18,19], [243,240,233], [255,192,138]):
    tinted = f"if(gt({maximum}-{minimum},25),{background}+({amber}-{background})*{maximum}/255,{background}+({white}-{background})*{luma}/255)"
    hero_channels.append(f"if(between(Y,126,1045),{tinted},{channel})")
hero_filter = "geq=" + ":".join(f"{key}='{expr}'" for key, expr in zip(["r","g","b"],hero_channels))
run(['-i',str(web/'terminal.webp'),'-vf',hero_filter,'-frames:v','1','-c:v','libwebp','-quality','82','-compression_level','6','-map_metadata','-1',str(web/'terminal-website.webp')])

# Retain useful actions, omit connection setup, loading waits, and personal file contents.
clip_specs=[
(56,2, [box(8,108,249,42,'0x202b39'),text('admin@ [host hidden]',14,120,18),box(89,331,88,1035,'black'),text('admin',95,334,19)], 'Remote tools. Live output.'),
(64,4, [box(8,108,249,42,'0x202b39'),text('admin@ [host hidden]',14,120,18),box(124,202,300,51,'0x111827'),text('/home/admin',131,215,25)],'Browse remote files.'),
(138,4, [box(10,165,200,39,'0x111827'),text('Terminal 1',22,173,22),box(10,507,200,40,'0x111827'),text('Terminal 2',22,516,22),box(0,562,270,63,'black'),text('admin@ [host hidden]',6,572,18),box(87,439,88,37,'black')],'Two panes. One workspace.')]
for i,(start,duration,filters,title) in enumerate(clip_specs):
    filters += ['fps=15', 'scale=540:1168:flags=lanczos','pad=540:1240:0:72:color=0x101213',text(title,'(w-text_w)/2',24,23,strong=True)]
    run(['-ss',str(start),'-t',str(duration),'-i',str(src/'1791468217117748.MP4'),'-vf',','.join(filters),'-an','-c:v','libx264','-preset','slow','-crf','29','-pix_fmt','yuv420p','-map_metadata','-1',str(workdir/f'clip-{i}.mp4')])
concat=workdir/'clips.txt';concat.write_text(''.join(f"file '{workdir}/clip-{i}.mp4'\n" for i in range(3)))
run(['-f','concat','-safe','0','-i',str(concat),'-c','copy','-map_metadata','-1','-movflags','+faststart',str(web/'walkthrough.mp4')])
run(['-ss','0.5','-i',str(web/'walkthrough.mp4'),'-frames:v','1','-c:v','libwebp','-quality','78',str(web/'walkthrough-poster.webp')])

print('Created redacted website images, promotional JPEGs, and 10-second walkthrough.')

filters=[box(170,132,260,70,'0x111827'),text('Terminal 1',178,147,32),box(1288,132,260,70,'0x111827'),text('Terminal 2',1300,147,32),box(292,477,185,466,'black'),box(1268,619,405,43,'black'),text('admin@ [host hidden]',1270,625,25),box(1434,688,250,42,'black'),text('[hidden]',1440,693,24),box(1390,864,285,43,'black'),text('[hidden]',1396,870,24),box(1268,909,405,36,'black'),text('admin@ [host hidden]',1270,911,25)]
clean=str(workdir/'workspace-clean.png')
run(['-i',str(src/'IMG_7887.PNG'),'-vf',','.join(filters),'-frames:v','1','-map_metadata','-1',clean])
run(['-i',clean,'-vf','scale=1000:-1:flags=lanczos','-frames:v','1','-c:v','libwebp','-quality','78','-compression_level','6','-map_metadata','-1',str(web/'workspace.webp')])
layout=['scale=2296:1060:flags=lanczos','pad=2868:1320:520:200:color=0x101213',text('TERMFORGE',65,90,30,'0xf2a65a',True),text('More room.',65,255,59,strong=True),text('More',65,339,59,strong=True),text('context.',65,423,59,strong=True),text('Independent',65,610,31),text('SSH terminals.',65,658,31),text('Full access requires',65,1120,24,'0xaab0b1'),text('trial or lifetime unlock.',65,1165,24,'0xaab0b1')]
run(['-i',clean,'-vf',','.join(layout),'-frames:v','1','-q:v','5','-pix_fmt','yuvj420p','-map_metadata','-1',str(store/'workspace.jpg')])
run(['-i',str(store/'workspace.jpg'),'-vf','scale=1000:-1:flags=lanczos','-frames:v','1','-c:v','libwebp','-quality','78','-compression_level','6','-map_metadata','-1',str(web/'workspace-promo.webp')])
print('Created landscape workspace assets and promotional key screenshot.')

# The owner's App Store Connect upload slot is the medium Dynamic Island display.
large=store/'large-display'; large.mkdir(exist_ok=True)
medium=store/'medium-display'; medium.mkdir(exist_ok=True)
for name in ['servers','terminal','files','keys','workspace']:
    source=store/(name+'.jpg')
    source.replace(large/source.name)
    size='2556:1179' if name=='workspace' else '1179:2556'
    run(['-i',str(large/source.name),'-vf','scale='+size+':flags=lanczos,setsar=1',
         '-frames:v','1','-q:v','5','-pix_fmt','yuvj420p','-map_metadata','-1',str(medium/source.name)])
print('Created medium-display upload files; retained large-display exports separately.')

work.cleanup()
