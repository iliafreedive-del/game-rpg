import numpy as np, sys
from sdf import render, PX_PER_M, Scene
from hero import BODY
from outfits import OUTFITS
import gear
from anim import sample
from PIL import Image
cls=sys.argv[1]
SCALE=PX_PER_M*1.5*1.6; W=H=320; ORG=(160,245)
out=Image.new('RGBA',(W*4,H*2),(45,40,38,255))
for k,(cl,i,d) in enumerate([('idle',0,1),('walk',2,0),('idle',0,4),('walk',5,6),('bowdraw' if cls=='archer' else 'cast',3,1),('run',3,2),('dodge',2,1),('death',7,1)]):
    p=sample(cl,i); p['yaw']=np.radians(d*45-90); p['orbit']=i*0.9
    J=BODY.solve(p); sc=Scene(); OUTFITS[cls](sc,J,p)
    if cls=='archer': gear.bow(sc,J,p.get('draw',0))
    else: gear.staff(sc,J)
    im=render(sc,W,H,ORG,scale=SCALE,ss=1)
    out.alpha_composite(im,((k%4)*W,(k//4)*H))
out.save(f'/home/claude/prev_{cls}.png')
