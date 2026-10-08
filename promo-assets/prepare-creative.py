#!/usr/bin/env python3
"""Compose Apple creative assets from background artwork and redacted app captures."""
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parent
source=root/'creative-source'; out=root/'promo-app-store'
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def label(value,x,y,size,color='0xeff4f8',strong=False):
 return f"drawtext=fontfile={bold if strong else font}:text='{value}':x={x}:y={y}:fontsize={size}:fontcolor={color}"
def render(kind,w,h,icon,terminal,files,copy):
 filters=[f'[0:v]scale={w}:{h}:flags=lanczos,setsar=1[bg]',f'[1:v]scale={icon[2]}:{icon[2]}:flags=lanczos[icon]',f'[2:v]scale={files[2]}:-1:flags=lanczos,pad=iw+12:ih+12:6:6:color=0x303b42[files]',f'[3:v]scale={terminal[2]}:-1:flags=lanczos,pad=iw+12:ih+12:6:6:color=0x303b42[terminal]',f'[bg][icon]overlay={icon[0]}:{icon[1]}[b1]',f'[b1][files]overlay={files[0]}:{files[1]}[b2]',f'[b2][terminal]overlay={terminal[0]}:{terminal[1]}[b3]','[b3]'+','.join(copy)+',format=rgb24[final]']
 dest=out/kind;dest.mkdir(exist_ok=True)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(source/'background.png'),'-i',str(root.parent/'assets/icon.png'),'-i',str(source/'files.png'),'-i',str(source/'terminal.png'),'-filter_complex',';'.join(filters),'-map','[final]','-frames:v','1','-c:v','png','-compression_level','9','-pix_fmt','rgb24','-map_metadata','-1',str(dest/(kind+'.png'))],check=True)
render('header',3840,1646,(530,350,190),(2390,255,520),(2860,435,410),[
 label('TERMFORGE',765,405,66,'0xf2a65a',True),label('Your remote',530,670,148,strong=True),label('workstation.',530,855,148,strong=True),label('SSH  ·  SFTP  ·  Workspaces',540,1090,53,'0xaab7bf')])
render('search-results',1920,1280,(150,260,110),(1080,240,350),(1395,390,315),[
 label('TERMFORGE',292,302,38,'0xf2a65a',True),label('Your servers.',150,535,84,strong=True),label('In your pocket.',150,640,84,strong=True),label('SSH  ·  SFTP  ·  Workspaces',155,805,33,'0xaab7bf')])
print('Created opaque PNG header (3840×1646) and search results (1920×1280).')
