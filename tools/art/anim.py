"""Animation clips for humanoids. Each clip: frames, loop, fn(t)->pose dict (character local)."""
import numpy as np
from sdf import norm

def ss(x): x=np.clip(x,0,1); return x*x*(3-2*x)
def lerp(a,b,t): return np.asarray(a,float)*(1-t)+np.asarray(b,float)*t

def keyed(keys, t):
    """keys: list of (time, dict). Smoothly interpolates every numeric/tuple key."""
    for i in range(len(keys)-1):
        t0,a=keys[i]; t1,b=keys[i+1]
        if t<=t1 or i==len(keys)-2:
            u = ss((t-t0)/max(t1-t0,1e-6))
            out={}
            for k in set(a)|set(b):
                va=a.get(k,b.get(k)); vb=b.get(k,a.get(k))
                if isinstance(va,(int,float)): out[k]=va*(1-u)+vb*u
                else: out[k]=tuple(lerp(va,vb,u))
            return out
    return dict(keys[-1][1])

# ------------------------------------------------ base stances
READY = dict(hR=(0.25,0.20,-0.40), hL=(-0.27,0.14,-0.40), fR=(0.13,0.04,0), fL=(-0.13,-0.04,0),
             wdir=(0.05,0.75,0.66), wup=(1,0,0), bdir=(0.05,0.30,1), bup=(1,0,0), lean=0.06,
             epR=(0.7,-0.6,-0.3), epL=(-0.7,-0.6,-0.3), cape=0.12)

def with_(base, **kw):
    d=dict(base); d.update(kw); return d

def idle(t, P=READY, amp=1.0):
    b = np.sin(2*np.pi*t)
    return with_(P, root=(0,0,-0.012*b*amp), lean=P['lean']+0.02*b*amp,
                 hR=tuple(np.array(P['hR'])+[0,0,0.012*b*amp]), hL=tuple(np.array(P['hL'])+[0,0,0.012*b*amp]),
                 cape=P['cape']+0.02*b)

def gait(t, P=READY, run=False, arm_free=(0,0), stride=None, hunch=0.0):
    ph = 2*np.pi*t
    S = stride or (0.40 if run else 0.27)
    lift = 0.17 if run else 0.10
    out = dict(P)
    for s,sg,off in (('R',1,0),('L',-1,np.pi)):
        p = ph+off
        y = S*np.sin(p)
        up = lift*max(0,np.cos(p))**1.4
        out['f'+s] = (sg*0.12, y, up)
    bob = (0.035 if run else 0.022)
    out['root'] = (0, 0.03 if run else 0, -bob*abs(np.sin(ph)) - (0.06 if run else 0.0) - hunch*0.1)
    out['lean'] = P['lean'] + (0.20 if run else 0.05) + hunch
    out['twist'] = 0.10*np.sin(ph)*(1.4 if run else 1)
    sw = (0.30 if run else 0.20)
    for s,sg,off,free in (('R',1,0,arm_free[0]),('L',-1,np.pi,arm_free[1])):
        base = np.array(P['h'+s],float)
        k = sw*(1.0 if free else 0.35)
        dy = -k*np.sin(ph+off)
        base = base + [0, dy, abs(dy)*0.35 + (0.08 if run else 0)]
        out['h'+s] = tuple(base)
    out['cape'] = (0.55 if run else 0.25) + 0.08*np.sin(2*ph)
    out['tabard'] = 0.10*np.sin(ph)
    return out

def hit(t, P=READY):
    k = np.sin(np.pi*min(t*1.3,1))
    return with_(P, lean=P['lean']-0.30*k, twist=0.15*k, root=(0,-0.06*k,-0.03*k), head_pitch=-0.3*k,
                 hR=tuple(np.array(P['hR'])+[0.05*k,-0.05*k,0.10*k]), hL=tuple(np.array(P['hL'])+[-0.05*k,-0.05*k,0.12*k]),
                 cape=P['cape']+0.2*k)

def death(t, P=READY):
    # stagger, knees buckle, fall backwards onto the ground
    k1 = ss(t/0.35); k2 = ss((t-0.25)/0.6)
    lean = P['lean'] - 0.35*k1 - 1.15*k2
    rz = -0.12*k1 - 0.72*k2
    ry = -0.10*k1 - 0.40*k2
    return with_(P, lean=lean, root=(0,ry,rz), head_pitch=-0.3*k1-0.4*k2, twist=0.2*k1,
                 fR=(0.14, 0.10+0.30*k2, 0), fL=(-0.18, -0.05+0.45*k2, 0.0),
                 kpR=(0.3,1,0.6), kpL=(-0.3,1,0.6),
                 hR=(0.40, 0.05-0.1*k2, -0.25+0.25*k2), hL=(-0.40,0.05-0.1*k2,-0.25+0.25*k2),
                 wdir=tuple(norm(lerp(P['wdir'],(0.9,0.3,-0.2),k2))), cape=0.1+0.9*k2)

def dodge(t, P=READY):
    # low evasive lunge: crouch, spring, land
    k = np.sin(np.pi*t)
    return with_(P, lean=P['lean']+0.55*k, root=(0,0.10*k,-0.30*k),
                 fR=(0.13, 0.30*k, 0.0), fL=(-0.13,-0.35*k, 0.06*k),
                 hR=(0.28,0.10,-0.30+0.05*k), hL=(-0.30,-0.10*k,-0.30),
                 cape=0.2+0.8*k, tabard=-0.3*k)

def cast(t, P=READY):
    keys=[(0,dict()),(0.4,dict(hR=(0.22,0.38,0.10),hL=(-0.18,0.42,0.02),lean=0.0,twist=0.0,sdir=(0,0.55,0.83),head_pitch=0.1,cape=0.3)),
          (0.6,dict(hR=(0.20,0.46,0.02),hL=(-0.14,0.50,-0.02),lean=0.15,sdir=(0,0.75,0.65),cape=0.4)),(1.0,dict())]
    for k in (0,3): keys[k]=(keys[k][0],{kk:P[kk] for kk in ('hR','hL','lean','cape')}|{'twist':0.0,'sdir':(0.02,0.24,1.0),'head_pitch':0.0})
    return with_(P, **keyed(keys,t))

# ---------------- one-handed (sword / axe)
def slash1(t, P=READY):
    R={k:P[k] for k in ('hR','wdir','lean','fL')}|dict(twist=0.0,wup=(1,0,0))
    keys=[(0,R),
          (0.32,dict(hR=(0.36,-0.02,0.12), wdir=(0.35,-0.45,0.82), wup=(0.3,0.9,0.2), twist=-0.55, lean=0.02, fL=(-0.13,-0.04,0))),
          (0.52,dict(hR=(0.10,0.52,-0.12), wdir=(-0.35,0.92,-0.1), wup=(0,0.2,1), twist=0.25, lean=0.18, fL=(-0.13,0.22,0))),
          (0.70,dict(hR=(-0.22,0.30,-0.34), wdir=(-0.85,0.25,-0.45), wup=(0,0.3,1), twist=0.50, lean=0.20, fL=(-0.13,0.22,0))),
          (1.0,R)]
    return with_(P, **keyed(keys,t))

def slash2(t, P=READY):
    # backhand rising cut
    R={k:P[k] for k in ('hR','wdir','lean','fR')}|dict(twist=0.0,wup=(1,0,0))
    keys=[(0,R),
          (0.30,dict(hR=(-0.12,0.22,-0.05), wdir=(-0.75,0.1,0.65), wup=(0,1,0), twist=0.50, lean=0.05, fR=(0.13,0.04,0))),
          (0.52,dict(hR=(0.30,0.46,0.02), wdir=(0.85,0.50,0.15), wup=(0,0.3,1), twist=-0.35, lean=0.18, fR=(0.13,0.24,0))),
          (0.72,dict(hR=(0.42,0.18,-0.05), wdir=(0.75,-0.3,0.55), wup=(0,0.5,1), twist=-0.55, lean=0.12, fR=(0.13,0.20,0))),
          (1.0,R)]
    return with_(P, **keyed(keys,t))

# ---------------- two-handed
def two_hand(p):
    """left hand grips below right hand on the handle"""
    w = norm(p['wdir']); h=np.array(p['hR'])
    p['hL'] = tuple(h - w*0.15 + np.array([-0.02,0,0]))
    p['epL'] = (-0.8,-0.2,-0.5)
    return p

def chop2(t, P=READY):
    R={'hR':(0.12,0.30,-0.35),'wdir':(-0.15,0.55,0.82),'lean':0.08,'twist':0.0,'fL':P['fL'],'wup':(1,0,0),'head_pitch':0.0}
    keys=[(0,R),
          (0.40,dict(hR=(0.10,-0.02,0.30), wdir=(0.05,-0.55,0.83), wup=(1,0,0), lean=-0.12, twist=-0.15, fL=(-0.13,0.0,0),head_pitch=0.1)),
          (0.60,dict(hR=(0.04,0.50,-0.28), wdir=(0.0,0.85,-0.52), wup=(1,0,0), lean=0.38, twist=0.05, fL=(-0.13,0.28,0),head_pitch=-0.1)),
          (0.78,dict(hR=(0.04,0.45,-0.38), wdir=(0.0,0.72,-0.69), wup=(1,0,0), lean=0.40, twist=0.05, fL=(-0.13,0.28,0))),
          (1.0,R)]
    return two_hand(with_(P, **keyed(keys,t)))

def sweep2(t, P=READY):
    R={'hR':(0.12,0.30,-0.35),'wdir':(-0.15,0.55,0.82),'lean':0.08,'twist':0.0,'fR':P['fR'],'wup':(1,0,0)}
    keys=[(0,R),
          (0.35,dict(hR=(0.32,0.02,-0.02), wdir=(0.70,-0.55,0.45), wup=(0,0,1), lean=0.05, twist=-0.75, fR=(0.13,-0.05,0))),
          (0.58,dict(hR=(0.02,0.48,-0.12), wdir=(-0.15,0.98,-0.05), wup=(0,0,1), lean=0.22, twist=0.10, fR=(0.13,0.20,0))),
          (0.78,dict(hR=(-0.26,0.26,-0.18), wdir=(-0.90,0.20,-0.2), wup=(0,0,1), lean=0.22, twist=0.65, fR=(0.13,0.20,0))),
          (1.0,R)]
    return two_hand(with_(P, **keyed(keys,t)))

# ---------------- bow
BOW_AIM = dict(hL=(-0.10,0.55,0.02), bdir=(0.10,0.05,1.0), bup=(1,0,0), epL=(-0.9,0,-0.3), twist=0.55, lean=0.02,
               fL=(-0.13,0.14,0), fR=(0.14,-0.12,0), head_yaw=-0.45)
def bow_draw(t, P=READY):
    k = ss(t)
    aim = dict(BOW_AIM)
    base = {kk:P[kk] for kk in ('hL','bdir','fL','fR','lean')}|dict(twist=0.0,head_yaw=0.0,hR=P['hR'])
    a = keyed([(0,base),(0.45,aim|dict(hR=(-0.05,0.52,0.02))),(1.0,aim|dict(hR=(0.08,0.18,0.10)))], t)
    a['draw'] = ss((t-0.35)/0.65)
    return with_(P, **a)

def bow_release(t, P=READY):
    aim = dict(BOW_AIM)
    a = keyed([(0,aim|dict(hR=(0.08,0.18,0.10))),(0.3,aim|dict(hR=(0.16,0.02,0.14))),
               (1.0,{kk:P[kk] for kk in ('hL','bdir','fL','fR','lean','hR')}|dict(twist=0.0,head_yaw=0.0))], t)
    a['draw']=0.0
    return with_(P, **a)

CLIPS = {
  # name: (frames, loop, fn)
  'idle':  (4, True,  lambda t: idle(t)),
  'walk':  (8, True,  lambda t: gait(t, READY, False)),
  'run':   (8, True,  lambda t: gait(t, READY, True)),
  'hit':   (3, False, lambda t: hit(t)),
  'death': (8, False, lambda t: death(t)),
  'dodge': (5, False, lambda t: dodge(t)),
  'cast':  (6, False, lambda t: cast(t)),
  'slash1':(7, False, lambda t: slash1(t)),
  'slash2':(7, False, lambda t: slash2(t)),
  'chop2': (9, False, lambda t: chop2(t)),
  'sweep2':(8, False, lambda t: sweep2(t)),
  'bowdraw':(5, False, lambda t: bow_draw(t)),
  'bowrel':(3, False, lambda t: bow_release(t)),
}
def sample(name, i):
    n, loop, fn = CLIPS[name]
    t = i/n if loop else (i/(n-1) if n>1 else 0)
    return fn(t)
