import numpy as np
from PIL import Image, ImageDraw
from sdf import render, PX_PER_M, Scene
from hero import BODY, outfit_knight
from outfits import outfit_knight2, BODY2
import gear
from anim import sample
poses=[('idle',0,1),('walk',2,0),('slash1',3,3),('run',3,5)]
S=PX_PER_M*3.0; W=H=400; ORG=(200,315)
out=Image.new('RGBA',(W*4,H*2+60),(36,30,28,255))
for row,(body,fn) in enumerate([(BODY,outfit_knight),(BODY2,outfit_knight2)]):
    for k,(cl,i,d) in enumerate(poses):
        p=sample(cl,i); p['yaw']=np.radians(d*45-90)
        J=body.solve(p); sc=Scene(); fn(sc,J,p); gear.sword(sc,J); gear.kite_shield(sc,J)
        im=render(sc,W,H,ORG,scale=S,ss=2)
        out.alpha_composite(im,(k*W,row*(H+60)+30))
d=ImageDraw.Draw(out); d.text((10,6),'СЕЙЧАС',fill=(230,210,160)); d.text((10,H+66),'НОВЫЙ ПРОБНИК',fill=(230,210,160))
# in-game scale (HD sprite size)
small=Image.new('RGBA',(160*8,170),(36,30,28,255)); SS=PX_PER_M*2.25
for row,(body,fn) in enumerate([(BODY,outfit_knight),(BODY2,outfit_knight2)]):
    for k,(cl,i,d) in enumerate(poses):
        p=sample(cl,i); p['yaw']=np.radians(d*45-90); J=body.solve(p); sc=Scene(); fn(sc,J,p); gear.sword(sc,J); gear.kite_shield(sc,J)
        im=render(sc,160,170,(80,135),scale=SS,ss=2); small.alpha_composite(im,((row*4+k)*160,0))
small.save('/home/claude/knight_small.png')
out.save('/home/claude/knight_compare.png'); print('ok')
