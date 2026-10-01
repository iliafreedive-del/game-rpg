import time, numpy as np
from sdf import render
from hero import hero_scene
pose = dict(yaw=0, hR=(0.26,0.18,-0.42), hL=(-0.25,0.05,-0.45), fR=(0.12,0.05,0), fL=(-0.12,-0.05,0),
            wdir=(0,0.6,0.8), wup=(1,0,0))
imgs=[]
for k in range(8):
    pose['yaw']=np.radians(k*45)
    scn,_=hero_scene(pose,'sword',shield=True)
    t=time.time(); im=render(scn,128,128,(64,108),ss=2); print(k, round(time.time()-t,2))
    imgs.append(im)
from PIL import Image
sheet=Image.new('RGBA',(128*8,128),(60,58,55,255))
for i,im in enumerate(imgs): sheet.alpha_composite(im,(i*128,0))
sheet=sheet.resize((128*8*2,256),Image.NEAREST); sheet.save('/home/claude/t1.png')
