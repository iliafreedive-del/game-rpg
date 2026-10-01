import numpy as np, sys
from PIL import Image
from sdf import render
from hero import hero_scene
from anim import CLIPS, sample
rows=[('walk','sword',True),('slash1','sword',True),('chop2','greatsword',False),('bowdraw','bow',False),('cast','staff',False),('death','sword',True)]
d=int(sys.argv[1]) if len(sys.argv)>1 else 1
W,H=176,176
sheet=Image.new('RGBA',(W*9,H*len(rows)),(52,48,44,255))
for r,(cl,wp,sh) in enumerate(rows):
    n=CLIPS[cl][0]
    for i in range(n):
        p=sample(cl,i); p['yaw']=np.radians(d*45-90)
        scn,_=hero_scene(p,wp,sh)
        im=render(scn,W,H,(88,140),ss=2)
        sheet.alpha_composite(im,(i*W,r*H))
sheet.save('/home/claude/t2.png')
