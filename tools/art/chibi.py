"""Chibi low-poly-style heroes (big head, stubby body) — style test."""
import numpy as np
from sdf import render, PX_PER_M, Scene, rot
from PIL import Image
I=np.eye(3)
class T:
    """Places a character: local coords (face +y) rotated by yaw and moved to o."""
    def __init__(self, scn, yaw, o): self.s=scn; self.R=rot(yaw); self.o=np.array(o,float)
    def p(self,v): return self.R@np.asarray(v,float)+self.o
    def cone(self,a,b,ra,rb,m): self.s.cone(self.p(a),self.p(b),ra,rb,m)
    def sphere(self,c,r,m): self.s.sphere(self.p(c),r,m)
    def ell(self,c,M,r,m): self.s.ell(self.p(c),self.R@M,r,m)
    def box(self,c,M,h,rad,m): self.s.box(self.p(c),self.R@M,h,rad,m)
def base(s, skin='flesh', body='cloth_red', pants='darkleather', boots='leather', x=0.0):
    o=np.zeros(3)
    for sg in (1,-1):
        s.cone(o+[sg*0.085,0,0.30],o+[sg*0.09,0,0.12],0.075,0.07,pants)
        s.ell(o+[sg*0.09,0.03,0.07],I,(0.085,0.12,0.075),boots)
    s.ell(o+[0,0,0.42],I,(0.2,0.17,0.2),body)
    s.cone(o+[0,0,0.33],o+[0,0,0.30],0.19,0.19,'darkleather'); s.box(o+[0,0.17,0.315],I,(0.04,0.012,0.03),0.008,'gold')
    for sg in (1,-1):
        a=o+[sg*0.2,0,0.52]; h=o+[sg*0.28,0.06,0.33]
        s.cone(a,h,0.06,0.055,body); s.sphere(h,0.07,skin)
    hc=o+[0,0.0,0.78]
    s.sphere(hc,0.27,skin)
    for sg in (1,-1):
        s.ell(hc+[sg*0.09,0.235,0.0],I,(0.032,0.02,0.045),'black'); s.sphere(hc+[sg*0.08,0.25,0.02],0.011,'cloth_white')
        s.sphere(hc+[sg*0.15,0.2,-0.07],0.035,'cloth_red')
    s.ell(hc+[0,0.265,-0.07],I,(0.035,0.01,0.012),'darkleather')
    return hc,o
def knight(s,x):
    hc,o=base(s,body='steel',pants='darksteel',boots='darksteel',x=x)
    s.ell(o+[0,0.02,0.44],I,(0.205,0.18,0.15),'steel'); s.box(o+[0,0.185,0.44],I,(0.06,0.01,0.08),0.01,'cloth_red'); s.box(o+[0,0.195,0.44],I,(0.012,0.008,0.06),0.003,'gold'); s.box(o+[0,0.195,0.46],I,(0.04,0.008,0.012),0.003,'gold')
    for sg in (1,-1): s.ell(o+[sg*0.2,0,0.56],I,(0.1,0.1,0.07),'steel')
    s.ell(hc+[0,-0.03,0.04],I,(0.29,0.29,0.27),'steel')
    s.box(hc+[0,0.2,0.1],rot(0,0.35,0),(0.2,0.05,0.05),0.03,'steel')
    s.box(hc+[0,0.0,0.28],I,(0.02,0.18,0.06),0.015,'cloth_red')
    s.box(o+[-0.36,0.08,0.4],rot(0.3,0,0),(0.02,0.14,0.17),0.03,'cloth_white'); s.box(o+[-0.375,0.08,0.4],rot(0.3,0,0),(0.012,0.1,0.13),0.02,'cloth_green')
    s.box(o+[0.33,0.12,0.55],rot(0,0.2,0),(0.02,0.012,0.22),0.006,'steel'); s.box(o+[0.33,0.11,0.34],I,(0.07,0.015,0.015),0.006,'gold')
def mage(s,x):
    hc,o=base(s,body='cloth_indigo',pants='cloth_indigo',boots='darkleather',x=x)
    s.cone(o+[0,0,0.36],o+[0,0,0.08],0.2,0.26,'cloth_indigo')
    s.ell(hc+[0,0,0.16],I,(0.44,0.42,0.04),'cloth_indigo')
    s.cone(hc+[0,0,0.16],hc+[-0.06,-0.08,0.66],0.24,0.02,'cloth_indigo'); s.ell(hc+[0,0,0.22],I,(0.25,0.25,0.035),'gold')
    s.sphere(hc+[-0.06,-0.08,0.66],0.04,'gold')
    s.cone(o+[0.31,0.07,0.1],o+[0.33,0.08,0.9],0.02,0.02,'wood'); s.sphere(o+[0.33,0.08,0.95],0.06,'crystal')
def archer(s,x):
    hc,o=base(s,body='cloth_teal',pants='darkleather',boots='leather',x=x)
    s.ell(hc+[0,-0.04,0.03],I,(0.3,0.3,0.29),'cloth_teal'); s.ell(hc+[0,0.08,-0.02],I,(0.25,0.24,0.24),'flesh')
    for sg in (1,-1):
        s.ell(hc+[sg*0.09,0.235,0.0],I,(0.032,0.02,0.045),'black'); s.sphere(hc+[sg*0.08,0.25,0.02],0.011,'cloth_white')
    s.cone(hc+[0,-0.2,0.15],hc+[0,-0.32,0.0],0.08,0.02,'cloth_teal')
    s.cone(o+[-0.32,0.1,0.15],o+[-0.36,0.12,0.75],0.018,0.018,'wood')
S=Scene(); yaw=np.radians(-45)
for fn,k in ((knight,-1),(archer,0),(mage,1)):
    fn(T(S,yaw,[k*0.62,-k*0.62,0]),0)
s=S
im=render(s,620,360,(310,300),scale=PX_PER_M*2.6,ss=2)
bg=Image.new('RGBA',im.size,(40,34,48,255)); bg.alpha_composite(im); bg.save('/home/claude/chibi.png'); print('ok')
