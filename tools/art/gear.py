"""Weapon / shield geometry attached to rig joints."""
import numpy as np
from sdf import norm, rot
from rig import frame_from

W_LAYER=1; S_LAYER=2

def sword(scn, J, length=0.78, mat='steel', guard='gold', wide=0.030, layer=W_LAYER, hand='hdR'):
    h=J[hand]; M=frame_from(J['wdir'],J['wup']); z=M[:,2]; x=M[:,0]
    scn.cone(h-z*0.07, h+z*0.07, 0.018, 0.018, 'darkleather', layer)
    scn.sphere(h-z*0.10, 0.028, guard, layer)
    scn.box(h+z*0.08, M, (0.11,0.022,0.018), 0.01, guard, layer)
    scn.box(h+z*(0.09+length*0.5), M, (wide,0.007,length*0.5), 0.004, mat, layer)
    scn.box(h+z*(0.09+length*0.28), M, (0.006,0.011,length*0.26), 0.002, 'darksteel', layer)  # fuller

def greatsword(scn, J, layer=W_LAYER):
    h=J['hdR']; M=frame_from(J['wdir'],J['wup']); z=M[:,2]
    scn.cone(h-z*0.22, h+z*0.07, 0.02, 0.02, 'darkleather', layer)
    scn.sphere(h-z*0.25, 0.034, 'darksteel', layer)
    scn.box(h+z*0.09, M, (0.16,0.026,0.022), 0.012, 'darksteel', layer)
    scn.box(h+z*(0.11+0.58), M, (0.042,0.009,0.58), 0.005, 'steel', layer)
    scn.box(h+z*(0.11+0.40), M, (0.008,0.013,0.36), 0.002, 'darksteel', layer)

def axe(scn, J, layer=W_LAYER):
    h=J['hdR']; M=frame_from(J['wdir'],J['wup']); z=M[:,2]; x=M[:,0]; y=M[:,1]
    scn.cone(h-z*0.12, h+z*0.62, 0.022, 0.02, 'wood', layer)
    scn.box(h+z*0.56+y*0.08, M, (0.012,0.10,0.07), 0.01, 'darksteel', layer)
    scn.box(h+z*0.56+y*0.17, M, (0.010,0.03,0.13), 0.008, 'steel', layer)
    scn.box(h+z*0.56-y*0.05, M, (0.02,0.04,0.03), 0.01, 'darksteel', layer)

def staff(scn, J, gem='purple_glow', layer=W_LAYER):
    h=J['hdR']; M=frame_from(J['sdir'],J['wup']); z=M[:,2]
    scn.cone(h-z*0.55, h+z*0.95, 0.02, 0.026, 'darkwood', layer)
    for k in range(3):
        a = k*2.094; off = (M[:,0]*np.cos(a)+M[:,1]*np.sin(a))*0.055
        scn.cone(h+z*0.92, h+z*1.09+off, 0.012, 0.008, 'gold', layer)
    scn.sphere(h+z*1.06, 0.05, gem, layer)
    scn.cone(h-z*0.05, h+z*0.1, 0.026, 0.026, 'leather', layer)

def bow(scn, J, draw=0.0, arrow=True, layer=W_LAYER):
    """Bow held in left hand; string pulled to right hand by `draw` (0..1)."""
    h=J['hdL']; M=frame_from(J['bdir'],J['bup']); z=M[:,2]; x=M[:,0]; y=M[:,1]
    # limbs: arc in plane (z, -y) bending away from the archer
    L=0.62; pts=[]
    bend = 0.10 + 0.07*draw
    for i in range(-5,6):
        s=i/5.0
        pts.append(h + z*(s*L*(1-0.06*draw*abs(s))) + y*(bend*(1-s*s)) - y*bend)
    for i in range(len(pts)-1):
        r = 0.022 if abs(i-5)<2 else 0.016-0.008*abs(i-5)/5
        scn.cone(pts[i],pts[i+1],max(r,0.008),max(r,0.008),'wood' if abs(i-5)>1 else 'darkleather',layer)
    top, bot = pts[-1], pts[0]
    if draw>0.02:
        nock = J['hdR']
    else:
        nock = (top+bot)/2 + y*0.0
    scn.cone(top,nock,0.004,0.004,'string',layer); scn.cone(nock,bot,0.004,0.004,'string',layer)
    if arrow and draw>0.02:
        ad = norm((h + y*0.12) - nock)
        scn.cone(nock, nock+ad*0.78, 0.007,0.007,'wood',layer)
        scn.cone(nock+ad*0.78, nock+ad*0.86, 0.016,0.002,'steel',layer)
        scn.box(nock+ad*0.05, frame_from(ad, x), (0.02,0.002,0.05),0.001,'cloth_red',layer)

def kite_shield(scn, J, layer=S_LAYER, mat='darksteel', face='cloth_red'):
    el=J['elL']; hd=J['hdL']; fa=norm(hd-el); c=(el+hd)/2
    # shield faces outward from the forearm (away from body)
    out = norm(np.cross(fa, J['Rc'][:,2])) 
    if out@J['Rc'][:,0] > 0: out = -out   # left side
    out = norm(out*0.7 + J['Rc'][:,1]*0.7)
    M = frame_from(out, J['Rc'][:,2])
    # shield plate: local z = facing normal; x ≈ up
    c2 = c + out*0.06
    scn.ell(c2, M, (0.30,0.21,0.035), mat, layer)
    scn.ell(c2+out*0.012, M, (0.26,0.17,0.03), face, layer)
    scn.sphere(c2+out*0.04, 0.045, 'gold', layer)
