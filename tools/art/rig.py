"""Humanoid rig with IK targets. Poses are authored as target positions (hands relative to chest,
feet relative to root) which produces believable limb motion with little data."""
import numpy as np
from sdf import Scene, rot, norm

def ik2(a, t, L1, L2, pole):
    a=np.asarray(a,float); t=np.asarray(t,float)
    d = t-a; D = np.linalg.norm(d)
    D = np.clip(D, abs(L1-L2)+1e-3, L1+L2-1e-3)
    dn = d/ (np.linalg.norm(d)+1e-9); t = a+dn*D
    x = (L1*L1 - L2*L2 + D*D)/(2*D)
    h = np.sqrt(max(L1*L1-x*x,0))
    p = np.asarray(pole,float); p = p - dn*(p@dn); p = p/(np.linalg.norm(p)+1e-9)
    return a+dn*x+p*h, t

class Body:
    """Computes joint positions for a pose."""
    def __init__(self, **pr):
        self.p = dict(hip=0.95, spine=0.46, shw=0.235, ua=0.30, fa=0.28, th=0.46, sh=0.44, ank=0.08,
                      neck=0.09, hipw=0.10, head=0.12)
        self.p.update(pr)
    def solve(self, pose):
        P = self.p
        yaw = pose.get('yaw',0)
        R0 = rot(yaw)
        off = np.array(pose.get('root',(0,0,0)),float)
        pel = R0@ (np.array([0,0,P['hip']])+off)
        Rp = R0@rot(pose.get('twist',0)*0.4, 0, pose.get('roll',0)*0.5)
        Rc = R0@rot(pose.get('twist',0), -pose.get('lean',0), pose.get('roll',0))
        chest = pel + Rc@np.array([0,0,P['spine']])
        J = dict(pel=pel, chest=chest, Rc=Rc, Rp=Rp, R0=R0)
        J['mid'] = pel + Rc@np.array([0,0,P['spine']*0.5])
        J['neck'] = chest + Rc@np.array([0,0,P['neck']])
        Rh = Rc@rot(pose.get('head_yaw',0), -pose.get('head_pitch',0), 0)
        J['Rh']=Rh
        J['head'] = J['neck'] + Rh@np.array([0,0.01,P['head']*0.95])
        for s,sg in (('R',1),('L',-1)):
            sh = chest + Rc@np.array([sg*P['shw'], 0, -0.02])
            J['sh'+s]=sh
            ht = chest + Rc@np.array(pose['h'+s],float)
            pole = Rc@np.array(pose.get('ep'+s,(sg*0.6,-0.8,-0.3)))
            el, hd = ik2(sh, ht, P['ua'], P['fa'], pole)
            J['el'+s]=el; J['hd'+s]=hd
            hp = pel + Rp@np.array([sg*P['hipw'],0,-0.02])
            J['hip'+s]=hp
            ft = R0@(np.array(pose['f'+s],float)+np.array([0,0,P['ank']]))
            kp = R0@np.array(pose.get('kp'+s,(sg*0.15,1,0)))
            kn, an = ik2(hp, ft, P['th'], P['sh'], kp)
            J['kn'+s]=kn; J['an'+s]=an
        J['wdir'] = Rc@norm(pose.get('wdir',(0,0.5,0.8)))
        J['wup'] = Rc@norm(pose.get('wup',(1,0,0)))
        J['bdir'] = Rc@norm(pose.get('bdir',(0,0.25,1)))
        J['bup'] = Rc@norm(pose.get('bup',(1,0,0)))
        J['sdir'] = Rc@norm(pose.get('sdir', norm(np.array(pose.get('wdir',(0,0.5,0.8)))*0.35+np.array([0,0.12,1]))))
        J['yaw']=yaw
        return J

def frame_from(dirv, upv):
    z = norm(dirv); x = np.asarray(upv,float); x = x - z*(x@z); x = norm(x); y = np.cross(z,x)
    return np.stack([x,y,z],1)   # columns: local axes in world

def local_box(scn, c, M, he, rad, mat, layer=0):
    """M: columns = local axes in world. Scene.box expects P@R -> local, so R = M."""
    scn.box(c, M, he, rad, mat, layer)

def local_ell(scn, c, M, radii, mat, layer=0):
    scn.ell(c, M, radii, mat, layer)

def limb(scn, a, b, ra, rb, mat, layer=0):
    scn.cone(a, b, ra, rb, mat, layer)
