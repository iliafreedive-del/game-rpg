import numpy as np, sys, os
from PIL import Image
out=Image.new('RGBA',(320*4,320),(45,40,38,255))
import importlib
for k,K in enumerate(['0','0.012']):
    os.environ['SMOOTH_K']=K
    import sdf; importlib.reload(sdf)
    import hero, outfits, gear, anim; importlib.reload(hero); importlib.reload(outfits); importlib.reload(gear)
    from anim import sample
    for j,(cls,cl,i,d) in enumerate([('knight','run',3,1),('archer','idle',0,1)]):
        p=sample(cl,i); p['yaw']=np.radians(d*45-90)
        J=hero.BODY.solve(p); sc=sdf.Scene()
        if cls=='knight': hero.outfit_knight(sc,J,p); gear.sword(sc,J) if hasattr(gear,'sword') else None
        else: outfits.OUTFITS[cls](sc,J,p)
        im=sdf.render(sc,320,320,(160,245),scale=sdf.PX_PER_M*1.5*1.6,ss=1)
        out.alpha_composite(im,((k*2+j)*320,0))
out.save('/home/claude/prev_soft.png')
