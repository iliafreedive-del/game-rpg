import numpy as np
from sdf import render, PX_PER_M, Scene
from hero import BODY
from outfits import OUTFITS
from anim import READY
OUT='/home/claude/da/assets/sprites'
for cls,f in OUTFITS.items():
    p=dict(READY); p['yaw']=np.radians(-45+12); p['orbit']=0.6
    J=BODY.solve(p); s=Scene(); f(s,J,p)
    img=render(s,420,420,(210,560),scale=PX_PER_M*5.2,ss=2,outline=False)
    img.save(f'{OUT}/portrait_{cls}.png'); print(cls)
