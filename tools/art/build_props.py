"""Environment props, floor tiles, item icons, skill icons, portrait."""
import numpy as np, json, os, time
from PIL import Image, ImageDraw, ImageFilter
from sdf import Scene, render, rot, norm, PX_PER_M, RIGHT, UP
from rig import frame_from
import gear
from pack import trim, pack
OUT='/home/claude/da/assets/sprites'; os.makedirs(OUT,exist_ok=True)
SC = PX_PER_M*2   # props at 2x (crisp on retina)
I=np.eye(3)
t0=time.time()

def R(s, W=260, H=320, org=None, outline=False, scale=SC):
    if org is None: H = H + 90; org = (W//2, H-130)   # room below the anchor for wide footprints
    im = render(s, W, H, org, scale=scale, ss=2, outline=outline)
    return trim(im, org)

props={}
import pickle
PCK='/home/claude/props_ck'; os.makedirs(PCK,exist_ok=True)
def add(name, s, **kw):
    f=f'{PCK}/{name}.pkl'
    if os.path.exists(f): r=pickle.load(open(f,'rb'))
    else:
        r=R(s,**kw); pickle.dump(r,open(f,'wb'))
    if r: props[name]=r
    print('prop',name,round(time.time()-t0),flush=True)

# ---------------------------------------------------------------- dungeon
WALL_H=1.55
def wall(var=0, torch=False, crack=False):
    s=Scene()
    s.box([0,0,WALL_H/2],I,(0.5,0.5,WALL_H/2),0.015,'brick')
    s.box([0,0,WALL_H+0.04],I,(0.52,0.52,0.05),0.02,'darkstone')
    s.box([0,0,0.07],I,(0.53,0.53,0.07),0.02,'darkstone')
    rng=np.random.default_rng(var)
    for k in range(var%3):
        p=rng.uniform(-0.4,0.4,2)
        s.box([p[0],0.5,0.3+rng.uniform(0,1)],rot(0,0,rng.uniform(-.3,.3)),(0.08,0.03,0.05),0.02,'darkstone')
    if torch:
        for side in ((0,0.5),(0.5,0)):
            c=np.array([side[0]*1.05,side[1]*1.05,1.05])
            n=np.array([side[0],side[1],0])*2
            s.box(c+n*0.02,I,(0.05,0.05,0.06),0.01,'iron_rust')
            s.cone(c+n*0.03+[0,0,0.02],c+n*0.12+[0,0,0.15],0.03,0.045,'darkwood')
    return s
for v in range(4): add(f'wall_{v}', wall(v))
add('wall_torch', wall(1,torch=True))
def pillar():
    s=Scene(); s.box([0,0,0.1],I,(0.36,0.36,0.1),0.03,'darkstone')
    s.cone([0,0,0.15],[0,0,1.55],0.26,0.23,'stone')
    for k in range(6):
        a=k*np.pi/3; s.cone([0.24*np.cos(a),0.24*np.sin(a),0.2],[0.21*np.cos(a),0.21*np.sin(a),1.5],0.03,0.03,'darkstone')
    s.box([0,0,1.62],I,(0.34,0.34,0.08),0.03,'darkstone'); return s
add('pillar', pillar())
def arch():
    s=Scene()
    for sg in (1,-1):
        s.box([sg*0.42,0,0.8],I,(0.16,0.28,0.8),0.02,'brick')
    for k in range(9):
        a=np.pi*k/8; a2=np.pi*(k+1)/8
        p1=[0.42*np.cos(a),0,1.45+0.42*np.sin(a)]; p2=[0.42*np.cos(a2),0,1.45+0.42*np.sin(a2)]
        s.cone(p1,p2,0.14,0.14,'stone')
    s.box([0,0,1.95],I,(0.58,0.28,0.12),0.02,'darkstone')
    return s
add('arch', arch())
def sarcophagus(open_=False):
    s=Scene(); s.box([0,0,0.32],I,(0.36,0.72,0.32),0.04,'stone')
    s.box([0,0,0.06],I,(0.40,0.76,0.06),0.02,'darkstone')
    if open_:
        s.box([0.25,0.1,0.72],rot(0.4,0,0.3),(0.34,0.70,0.06),0.03,'darkstone')
    else:
        s.box([0,0,0.69],I,(0.38,0.74,0.06),0.03,'darkstone')
        s.ell([0,0.05,0.78],I,(0.18,0.55,0.07),'stone')
        s.sphere([0,-0.5,0.82],0.1,'stone')
    return s
add('sarcophagus', sarcophagus()); add('sarcophagus_open', sarcophagus(True))
def chest(open_=False, rich=False):
    s=Scene(); m='darkwood'
    s.box([0,0,0.2],I,(0.34,0.24,0.2),0.02,m)
    for x in (-0.25,0,0.25): s.box([x,0,0.2],I,(0.03,0.25,0.205),0.005,'gold' if rich else 'iron_rust')
    if open_:
        s.box([0,-0.30,0.52],rot(0,-1.2,0),(0.35,0.18,0.03),0.02,m)
        s.box([0,0,0.36],I,(0.30,0.20,0.02),0.01,'black')
        if rich:
            for k in range(6): s.sphere([np.cos(k)*0.15,np.sin(k*1.7)*0.1,0.38],0.05,'gold')
    else:
        s.cone([-0.34,0,0.40],[0.34,0,0.40],0.24,0.24,m)
        s.box([0,0.25,0.36],I,(0.05,0.02,0.07),0.01,'gold')
    return s
add('chest', chest(), W=160,H=160); add('chest_open', chest(True), W=160,H=160)
add('chest_rich', chest(rich=True), W=160,H=160); add('chest_rich_open', chest(True,True), W=160,H=160)
def door(open_=False, sealed=False):
    s=Scene()
    for sg in (1,-1): s.box([sg*0.55,0,0.95],I,(0.12,0.3,0.95),0.02,'brick')
    s.box([0,0,1.95],I,(0.67,0.3,0.12),0.02,'darkstone')
    if sealed:
        s.box([0,0,0.92],I,(0.44,0.12,0.92),0.02,'runes')
        s.sphere([0,0.14,1.05],0.16,'purple_glow')
        s.cone([0,0.1,1.05],[0,0.2,1.05],0.22,0.22,'darksteel')
    elif open_:
        s.box([0.48,0.25,0.9],rot(1.3),(0.4,0.04,0.88),0.02,'darkwood')
    else:
        s.box([0,0,0.9],I,(0.43,0.06,0.88),0.02,'darkwood')
        for z in (0.35,1.4): s.box([0,0.065,z],I,(0.44,0.012,0.04),0.005,'iron_rust')
        s.sphere([0.25,0.09,0.9],0.05,'iron_rust')
    return s
add('door', door()); add('door_open', door(True)); add('gate_sealed', door(sealed=True))
def bones():
    s=Scene(); rng=np.random.default_rng(3)
    for k in range(7):
        a=rng.uniform(0,6.28); c=rng.uniform(-0.25,0.25,2)
        d=np.array([np.cos(a),np.sin(a),0])*0.16
        s.cone([c[0],c[1],0.03]-d,[c[0],c[1],0.03]+d,0.022,0.018,'oldbone')
    s.ell([0.05,0.05,0.08],rot(0.5,0.3,0),(0.08,0.09,0.08),'oldbone')
    s.sphere([0.08,0.12,0.09],0.025,'black'); return s
add('bones', bones(), W=140,H=120)
def skullpile():
    s=Scene(); rng=np.random.default_rng(5)
    for k in range(9):
        c=rng.uniform(-0.25,0.25,2); z=0.08+0.1*(k>5)
        s.ell([c[0],c[1],z],rot(rng.uniform(0,6)),(0.08,0.09,0.08),'bone')
    return s
add('skulls', skullpile(), W=160,H=140)
def altar(medallion=True):
    s=Scene(); s.box([0,0,0.12],I,(0.45,0.35,0.12),0.03,'darkstone')
    s.box([0,0,0.55],I,(0.35,0.25,0.32),0.03,'stone'); s.box([0,0,0.9],I,(0.42,0.3,0.05),0.02,'darkstone')
    for sg in (1,-1):
        s.cone([sg*0.32,0.2,0.95],[sg*0.32,0.2,1.08],0.03,0.03,'cloth_white')
    if medallion:
        s.cone([0,0,0.96],[0,0,0.98],0.1,0.1,'gold'); s.sphere([0,0,0.99],0.05,'gem_red')
    return s
add('altar_medallion', altar(True)); add('altar', altar(False))
def barrel():
    s=Scene(); s.cone([0,0,0.02],[0,0,0.36],0.26,0.30,'wood'); s.cone([0,0,0.36],[0,0,0.72],0.30,0.26,'wood')
    for z in (0.12,0.36,0.6): s.cone([0,0,z],[0,0,z+0.04],0.285+0.015*(z==0.36),0.285+0.015*(z==0.36),'iron_rust')
    return s
add('barrel', barrel(), W=150,H=180)
def crate():
    s=Scene(); s.box([0,0,0.3],rot(0.3),(0.3,0.3,0.3),0.02,'wood')
    s.box([0,0,0.3],rot(0.3),(0.31,0.31,0.05),0.01,'darkwood'); return s
add('crate', crate(), W=160,H=170)
def candles():
    s=Scene()
    for k,(x,y,h) in enumerate(((0,0,0.35),(0.12,0.08,0.25),(-0.1,0.1,0.2),(0.05,-0.12,0.28))):
        s.cone([x,y,0],[x,y,h],0.035,0.03,'cloth_white')
    return s
add('candles', candles(), W=100,H=100)
def portal():
    s=Scene()
    s.box([0,0,0.08],I,(0.9,0.5,0.08),0.03,'darkstone')
    for sg in (1,-1):
        s.box([sg*0.68,0,1.0],I,(0.16,0.2,0.95),0.03,'runes')
    for k in range(11):
        a=np.pi*k/10; a2=np.pi*(k+1)/10
        s.cone([0.68*np.cos(a),0,1.9+0.5*np.sin(a)],[0.68*np.cos(a2),0,1.9+0.5*np.sin(a2)],0.15,0.15,'runes')
    s.sphere([0,0,2.45],0.1,'purple_glow')
    return s
add('portal', portal(), W=300,H=400)
def rubble():
    s=Scene(); rng=np.random.default_rng(9)
    for k in range(8):
        c=rng.uniform(-0.35,0.35,2); r=rng.uniform(0.06,0.14)
        s.box([c[0],c[1],r*0.6],rot(rng.uniform(0,3),rng.uniform(0,.5)),(r,r*0.8,r*0.6),0.02,'stone')
    return s
add('rubble', rubble(), W=160,H=120)
def brazier():
    s=Scene(); s.cone([0,0,0],[0,0,0.7],0.08,0.05,'darksteel')
    for k in range(3):
        a=k*2.09; s.cone([0.25*np.cos(a),0.25*np.sin(a),0],[0,0,0.3],0.025,0.02,'darksteel')
    s.cone([0,0,0.65],[0,0,0.85],0.12,0.25,'iron_rust'); s.sphere([0,0,0.84],0.19,'fire'); return s
add('brazier', brazier(), W=140,H=220)

# ---------------------------------------------------------------- town
def house(var=0):
    s=Scene(); w,d,h = [(1.6,1.3,1.7),(1.9,1.4,1.8),(1.4,1.4,1.6)][var]
    wallm = ['plaster','brick_town','plaster'][var]
    s.box([0,0,0.12],I,(w+0.06,d+0.06,0.12),0.02,'stone')
    s.box([0,0,h/2+0.1],I,(w,d,h/2),0.02,wallm)
    if wallm=='plaster':
        for x in np.linspace(-w,w,4): s.box([x,d+0.005,h/2+0.1],I,(0.06,0.03,h/2),0.01,'darkwood')
        for y in np.linspace(-d,d,3): s.box([w+0.005,y,h/2+0.1],I,(0.03,0.06,h/2),0.01,'darkwood')
        s.box([0,d+0.01,h*0.62],I,(w,0.03,0.05),0.01,'darkwood'); s.box([w+0.01,0,h*0.62],I,(0.03,d,0.05),0.01,'darkwood')
        s.box([0,d+0.02,h*0.35],rot(0,0,0.9),(0.05,0.02,0.6),0.01,'darkwood')
    # door and windows
    s.box([-w*0.4,d+0.02,0.62],I,(0.24,0.04,0.5),0.02,'darkwood')
    s.box([w*0.45,d+0.02,1.0],I,(0.2,0.03,0.18),0.02,'fire')
    s.box([w*0.45,d+0.035,1.0],I,(0.22,0.02,0.02),0.005,'darkwood'); s.box([w*0.45,d+0.035,1.0],I,(0.02,0.02,0.2),0.005,'darkwood')
    s.box([w+0.02,0.1,1.0],I,(0.03,0.2,0.18),0.02,'fire')
    # roof (gable along x)
    rm = ['thatch','shingle','thatch'][var]
    rh=1.1
    for sg in (1,-1):
        c=np.array([0,sg*d*0.52,h+0.1+rh*0.5]); ang=np.arctan2(rh,d+0.2)
        s.box(c,rot(0,-sg*ang,0),(w+0.22,(d+0.35)*0.62,0.07),0.03,rm)
    s.box([0,0,h+0.1+rh+0.02],I,(w+0.25,0.08,0.06),0.03,'darkwood')
    for sg in (1,-1):
        # gable ends (triangle approx with stacked boxes)
        for k in range(5):
            z=h+0.15+k*rh/5; ww=d*(1-k/5)
            s.box([sg*w*0.99,0,z+0.1],I,(0.03,ww,0.11),0.005,wallm)
    s.box([w*0.5,-d*0.3,h+rh+0.2],I,(0.14,0.14,0.45),0.02,'brick_town')
    return s
for v in range(3): add(f'house_{v}', house(v), W=560,H=560)
def tree(var=0):
    s=Scene(); rng=np.random.default_rng(var+10)
    s.cone([0,0,0],[0.05,0,1.3],0.14,0.09,'bark')
    s.cone([0,0,1.0],[0.35,0.1,1.6],0.06,0.03,'bark'); s.cone([0,0,1.1],[-0.3,0.2,1.7],0.06,0.03,'bark')
    for k in range(9 if var==0 else 6):
        c=[rng.uniform(-0.55,0.55),rng.uniform(-0.55,0.55),rng.uniform(1.5,2.3)]
        s.ell(c,rot(rng.uniform(0,3)),(rng.uniform(0.35,0.55),)*2+(rng.uniform(0.3,0.45),),'leaf' if k%2 else 'leaf2')
    return s
add('tree_0', tree(0), W=340,H=460); add('tree_1', tree(1), W=340,H=460)
def deadtree():
    s=Scene(); s.cone([0,0,0],[0,0.05,1.5],0.14,0.06,'bark')
    for a,z,l in ((0.3,0.9,0.7),(2.5,1.1,0.6),(4.2,1.3,0.5),(1.4,1.45,0.45)):
        s.cone([0,0.03,z],[np.cos(a)*l,np.sin(a)*l,z+0.35],0.05,0.015,'bark')
    return s
add('deadtree', deadtree(), W=300,H=380)
def fence(axis=0):
    s=Scene(); M=I if axis==0 else rot(np.pi/2)
    for x in (-0.45,0.45):
        p=M@[x,0,0]; s.box(p+[0,0,0.4],I,(0.05,0.05,0.4),0.01,'wood')
    for z in (0.3,0.62):
        s.box([0,0,z],M,(0.5,0.025,0.04),0.01,'wood')
    return s
add('fence_x', fence(0), W=200,H=200); add('fence_y', fence(1), W=200,H=200)
def well():
    s=Scene(); s.cone([0,0,0],[0,0,0.55],0.55,0.55,'stone'); s.cone([0,0,0.5],[0,0,0.58],0.45,0.45,'water')
    for sg in (1,-1): s.box([sg*0.5,0,0.9],I,(0.05,0.05,0.5),0.01,'wood')
    s.cone([-0.55,0,1.3],[0.55,0,1.3],0.04,0.04,'darkwood')
    for sg in (1,-1): s.box([0,sg*0.35,1.5],rot(0,sg*0.7,0),(0.65,0.42,0.04),0.02,'shingle')
    return s
add('well', well(), W=280,H=320)
def runebed():
    # circular flowerbed with a ring of glowing rune stones (village centrepiece)
    s=Scene(); import math
    s.ell([0,0,0.05],I,(1.05,1.05,0.09),'stone')                       # low stone rim
    s.ell([0,0,0.10],I,(0.95,0.95,0.08),'darkwood')                    # soil
    for k in range(22):                                              # rim cobbles
        a=k*2*math.pi/22; s.ell([math.cos(a)*1.02,math.sin(a)*1.02,0.12],rot(-a,0,0),(0.12,0.09,0.08),'stone' if k%2 else 'mossstone')
    for k in range(34):                                              # flowers
        a=k*2.39996; r=0.25+0.62*((k*37%34)/34)
        x,y=math.cos(a)*r,math.sin(a)*r
        s.cone([x,y,0.14],[x,y,0.30],0.012,0.010,'leaf')
        s.sphere([x,y,0.32],0.045,['gem_red','potion_blue','cloth_white','gold','cloth_purple'][k%5])
    for k in range(5):                                               # rune stones leaning outward
        a=k*2*math.pi/5+0.3; x,y=math.cos(a)*0.62,math.sin(a)*0.62
        R=rot(-a,0,0)@rot(0,0.12,0)
        s.box([x,y,0.55],R,(0.13,0.07,0.42),0.05,'darkstone')
        s.box([x+math.cos(a)*0.075,y+math.sin(a)*0.075,0.62],R,(0.03,0.012,0.22),0.008,'rune_cyan')
        s.box([x+math.cos(a)*0.075,y+math.sin(a)*0.075,0.72],R,(0.07,0.012,0.02),0.006,'rune_cyan')
    s.ell([0,0,0.6],I,(0.07,0.07,0.45),'crystal')                     # central crystal
    s.sphere([0,0,1.1],0.06,'rune_cyan')
    return s
add('runebed', runebed(), W=360,H=360)

# ---------------- v2.6 decor & biome props
import math
def banner():
    s=Scene(); s.cone([0,0,0],[0,0,2.2],0.04,0.03,'darkwood'); s.cone([-0.45,0,2.1],[0.45,0,2.1],0.03,0.03,'darkwood')
    s.box([0,0.02,1.55],I,(0.40,0.02,0.52),0.02,'cloth_red'); s.box([0,0.02,0.98],rot(0,0,0.785),(0.28,0.02,0.28),0.02,'cloth_red')
    s.box([0,0.045,1.62],I,(0.13,0.01,0.2),0.02,'gold'); s.sphere([0,0.05,1.38],0.07,'gold')
    for x in (-0.45,0.45): s.sphere([x,0,2.1],0.05,'gold')
    return s
def bookshelf():
    s=Scene(); s.box([0,0,0.9],I,(0.55,0.2,0.9),0.02,'darkwood')
    cols=['cloth_red','cloth_blue','cloth_green','cloth_purple','leather','cloth_brown','gold']
    for sh in range(4):
        z=0.25+sh*0.42; s.box([0,0.05,z-0.2],I,(0.54,0.2,0.025),0.0,'wood')
        x=-0.46; k=sh
        while x<0.44:
            w=0.03+0.02*((k*7)%3); h=0.13+0.03*((k*5)%3); s.box([x+w,0.21,z-0.18+h],I,(w,0.035,h),0.005,cols[k%7]); x+=w*2+0.01; k+=1
    return s
def weapon_rack():
    s=Scene(); s.box([0,0,0.05],I,(0.6,0.18,0.05),0.02,'darkwood')
    for x in (-0.55,0.55): s.box([x,0,0.7],I,(0.04,0.04,0.7),0.01,'darkwood')
    s.box([0,0,1.3],I,(0.6,0.05,0.04),0.01,'darkwood'); s.box([0,0,0.5],I,(0.6,0.05,0.03),0.01,'darkwood')
    for k,x in enumerate((-0.35,-0.1,0.15,0.38)):
        s.box([x,0.05,0.85],rot(0,0,(k-1.5)*0.08),(0.025,0.01,0.55),0.004,'steel'); s.box([x,0.05,0.32],I,(0.09,0.02,0.02),0.005,'gold')
    s.cone([0.0,0.12,0.3],[0.0,0.12,1.2],0.02,0.02,'wood'); s.box([0.0,0.14,1.15],I,(0.14,0.02,0.1),0.01,'steel')
    return s
def statue():
    s=Scene(); s.box([0,0,0.25],I,(0.42,0.42,0.25),0.03,'stone'); s.box([0,0,0.52],I,(0.36,0.36,0.03),0.01,'darkstone')
    s.cone([0,0,0.55],[0,0,1.15],0.22,0.26,'stone'); s.ell([0,0,1.35],I,(0.28,0.2,0.26),'stone'); s.ell([0,0,1.72],I,(0.13,0.14,0.15),'stone')
    for sg in (1,-1): s.ell([sg*0.3,0,1.5],I,(0.12,0.12,0.1),'stone'); s.cone([sg*0.3,0,1.45],[sg*0.22,0.2,1.1],0.07,0.06,'stone')
    s.box([0,0.25,1.2],I,(0.035,0.02,0.75),0.01,'darkstone'); s.box([0,0.25,1.55],I,(0.14,0.03,0.025),0.01,'darkstone')
    return s
def throne():
    s=Scene(); s.box([0,0,0.12],I,(0.6,0.55,0.12),0.03,'darkstone'); s.box([0,0,0.45],I,(0.42,0.36,0.1),0.03,'cloth_red')
    s.box([0,-0.34,1.05],I,(0.42,0.08,0.75),0.04,'gold'); s.box([0,-0.29,1.0],I,(0.3,0.03,0.58),0.02,'cloth_red')
    for sg in (1,-1): s.box([sg*0.4,0,0.62],I,(0.05,0.34,0.08),0.02,'gold'); s.sphere([sg*0.42,-0.34,1.82],0.08,'gem_red')
    return s
def rug():
    s=Scene(); s.box([0,0,0.01],I,(1.1,0.75,0.012),0.004,'gold'); s.box([0,0,0.02],I,(1.02,0.67,0.012),0.004,'cloth_red')
    s.box([0,0,0.028],rot(0.785,0,0),(0.34,0.34,0.008),0.004,'gold'); s.box([0,0,0.034],rot(0.785,0,0),(0.26,0.26,0.008),0.004,'cloth_blue')
    s.box([0,0,0.04],rot(0.785,0,0),(0.1,0.1,0.006),0.003,'gold')
    for sg in (1,-1):
        for k in range(12): s.box([sg*1.14,-0.66+k*0.12,0.008],I,(0.04,0.012,0.006),0.0,'gold')
    return s
def crystals():
    s=Scene()
    for k in range(7):
        a=k*2.4; r=0.12+0.08*(k%3); h=0.45+0.35*((k*3)%4)/3
        base=[math.cos(a)*r,math.sin(a)*r,0]; tip=[math.cos(a)*(r+0.15),math.sin(a)*(r+0.15),h]
        s.cone(base,tip,0.09,0.01,'crystal' if k%2 else 'gem_purple')
    s.ell([0,0,0.05],I,(0.35,0.3,0.08),'darkstone'); return s
def mushrooms():
    s=Scene()
    for k in range(5):
        a=k*1.3; r=0.1+0.1*(k%3); x,y=math.cos(a)*r,math.sin(a)*r; h=0.18+0.12*(k%3)
        s.cone([x,y,0],[x,y,h],0.03,0.025,'plaster'); s.ell([x,y,h],I,(0.1+0.03*(k%2),0.1+0.03*(k%2),0.05),'rune_cyan' if k%2 else 'eye_teal')
    return s
def stalagmite():
    s=Scene(); s.cone([0,0,0],[0.03,0.02,1.1],0.3,0.03,'darkstone'); s.cone([0.3,0.1,0],[0.32,0.12,0.55],0.16,0.02,'stone'); s.cone([-0.25,-0.1,0],[-0.26,-0.12,0.4],0.13,0.02,'darkstone'); return s
def lavarock():
    s=Scene(); s.ell([0,0,0.12],I,(0.55,0.42,0.2),'darkstone')
    for k in range(4): a=k*1.6; s.box([math.cos(a)*0.2,math.sin(a)*0.15,0.27],rot(a,0,0),(0.22,0.02,0.02),0.005,'fire')
    return s
def puddle():
    s=Scene(); s.ell([0,0,0.0],I,(0.7,0.5,0.02),'water'); return s
for nm,fn,w,h in [('banner',banner,200,320),('bookshelf',bookshelf,240,300),('weapon_rack',weapon_rack,240,260),('statue',statue,220,300),('throne',throne,240,300),('rug',rug,300,200),('crystals',crystals,200,220),('mushrooms',mushrooms,180,180),('stalagmite',stalagmite,200,240),('lavarock',lavarock,220,180),('puddle',puddle,240,160)]:
    add(nm, fn(), W=w, H=h)
def forge():
    s=Scene(); s.box([0,0,0.45],I,(0.7,0.55,0.45),0.03,'brick_town'); s.box([0,0.2,0.5],I,(0.4,0.4,0.2),0.02,'fire')
    s.box([0.25,-0.2,1.3],I,(0.18,0.18,0.5),0.02,'brick_town')
    # anvil
    s.box([1.1,0.4,0.2],I,(0.12,0.1,0.2),0.02,'darkwood'); s.box([1.1,0.4,0.48],I,(0.3,0.1,0.08),0.03,'darksteel')
    s.cone([1.4,0.4,0.5],[1.52,0.4,0.52],0.06,0.02,'darksteel')
    return s
add('forge', forge(), W=380,H=340)
def stall():
    s=Scene()
    s.box([0,0,0.45],I,(0.9,0.4,0.45),0.02,'wood')
    for x in (-0.85,0.85):
        for y in (-0.35,0.35): s.box([x,y,0.9],I,(0.04,0.04,0.9),0.01,'darkwood')
    for k in range(6):
        s.box([-0.75+k*0.3,0,1.85],rot(0,0.25,0),(0.15,0.55,0.03),0.01,'cloth_red' if k%2 else 'cloth_white')
    for k in range(5): s.sphere([-0.6+k*0.3,0.1,0.95],0.09,['potion_red','potion_blue','gold','leather','potion_red'][k])
    return s
add('stall', stall(), W=320,H=360)
def lamp():
    s=Scene(); s.cone([0,0,0],[0,0,1.8],0.05,0.04,'darkwood'); s.box([0,0,1.95],I,(0.1,0.1,0.13),0.02,'iron_rust')
    s.sphere([0,0,1.95],0.07,'fire'); return s
add('lamp', lamp(), W=120,H=280)
def rocks(v=0):
    s=Scene(); rng=np.random.default_rng(20+v)
    for k in range(3):
        c=rng.uniform(-0.3,0.3,2); r=rng.uniform(0.15,0.3)
        s.ell([c[0],c[1],r*0.5],rot(rng.uniform(0,3)),(r,r*0.8,r*0.7),'mossstone' if k else 'stone')
    return s
add('rocks', rocks(), W=200,H=160)
def hay():
    s=Scene(); s.cone([0,0,0],[0,0,0.5],0.45,0.35,'thatch'); s.ell([0,0,0.5],I,(0.35,0.35,0.25),'thatch'); return s
add('hay', hay(), W=200,H=200)
def board():
    s=Scene()
    for sg in (1,-1): s.box([sg*0.45,0,0.8],I,(0.05,0.05,0.8),0.01,'darkwood')
    s.box([0,0,1.2],I,(0.5,0.04,0.35),0.02,'wood')
    for k,(x,z) in enumerate(((-0.25,1.25),(0.15,1.3),(0.0,1.05))): s.box([x,0.05,z],rot(0,0,0.1*k),(0.12,0.01,0.14),0.005,'paper')
    s.box([0,0,1.6],rot(0,0,0),(0.6,0.25,0.04),0.02,'shingle')
    return s
add('board', board(), W=220,H=300)
def grave():
    s=Scene(); s.box([0,0,0.4],I,(0.22,0.08,0.4),0.06,'mossstone'); s.box([0,0.35,0.05],I,(0.25,0.4,0.05),0.03,'leaf'); return s
add('grave', grave(), W=140,H=180)
pack(props,'props',OUT,SC,quantize=False)

# ---------------------------------------------------------------- icons (item art)
def fit(s, size=96, pad=6):
    s.compile(); lo,hi=s.lo,s.hi
    corners=np.array([[x,y,z] for x in (lo[0],hi[0]) for y in (lo[1],hi[1]) for z in (lo[2],hi[2])])
    u=corners@RIGHT; v=corners@UP
    span=max(u.max()-u.min(), v.max()-v.min())
    sc=(size-2*pad)/span
    org=(size/2 - (u.max()+u.min())/2*sc, size/2 + (v.max()+v.min())/2*sc)
    return render(s,size,size,org,scale=sc,ss=3,outline=True)

class FakeJ(dict): pass
def J_for(hand=(0,0,0), wdir=(0,0,1), wup=(1,0,0)):
    wd=np.array(wdir,float); return {'hdR':np.array(hand,float),'hdL':np.array(hand,float),'wdir':norm(wd),'wup':norm(np.array(wup,float)),
             'sdir':norm(wd),'bdir':norm(wd),'bup':norm(np.array(wup,float)),'elL':np.array(hand)-[0,0,0.3],'Rc':np.eye(3)}
icons={}
D=norm([1,-1,1.6])  # blade diagonal on screen: bottom-left -> top-right
U=norm(np.cross(D,[1,1,0]))
def icon(name,s):
    f=f'{PCK}/icon_{name}.pkl'
    if os.path.exists(f): icons[name]=pickle.load(open(f,'rb'))
    else: icons[name]=(fit(s),(0,0)); pickle.dump(icons[name],open(f,'wb'))
    print('icon',name,flush=True)
s=Scene(); gear.sword(s,J_for(wdir=D,wup=U),layer=0); icon('sword',s)
s=Scene(); gear.greatsword(s,J_for(wdir=D,wup=U),layer=0); icon('greatsword',s)
s=Scene(); gear.axe(s,J_for(wdir=D,wup=norm([1,1,0])),layer=0); icon('axe',s)
s=Scene(); gear.staff(s,J_for(wdir=D,wup=U),layer=0); icon('staff',s)
s=Scene(); gear.bow(s,J_for(wdir=D,wup=norm([1,1,0])),0,layer=0); icon('bow',s)
def shield_icon():
    s=Scene(); n=norm([1,1,0.6]); M=frame_from(n,[0,0,1])
    s.ell([0,0,0],M,(0.30,0.21,0.035),'darksteel'); s.ell(n*0.012,M,(0.26,0.17,0.03),'cloth_red'); s.sphere(n*0.04,0.045,'gold'); return s
icon('shield',shield_icon())
def helmet():
    s=Scene(); Rh=rot(np.radians(45)); hd=np.zeros(3)
    s.ell(hd,Rh,(0.13,0.14,0.15),'steel'); s.box(hd+Rh@[0,0.105,-0.03],Rh,(0.09,0.045,0.085),0.035,'steel')
    s.box(hd+Rh@[0,0.137,0.015],Rh,(0.075,0.02,0.013),0.004,'black'); s.box(hd+Rh@[0,-0.01,0.12],Rh,(0.018,0.13,0.03),0.012,'gold')
    s.ell(hd+Rh@[0,-0.02,-0.07],Rh,(0.14,0.14,0.07),'darksteel'); return s
icon('head',helmet())
def pauldrons():
    s=Scene()
    for sg in (1,-1):
        c=np.array([sg*0.2,-sg*0.2,0]); M=rot(np.radians(45))@rot(0,0,sg*0.4)
        s.ell(c,M,(0.14,0.14,0.10),'steel'); s.ell(c+[0,0,0.04],M,(0.07,0.10,0.035),'gold')
    return s
icon('shoulders',pauldrons())
def chestpiece():
    s=Scene(); M=rot(np.radians(45))
    s.ell([0,0,0.1],M,(0.215,0.155,0.22),'steel'); s.ell(M@[0,0.035,0.11],M,(0.14,0.14,0.15),'darksteel')
    s.box(M@[0,0.15,0.08],M,(0.012,0.02,0.12),0.008,'gold'); s.ell([0,0,-0.12],M,(0.18,0.135,0.12),'darksteel'); return s
icon('chest',chestpiece())
def gloves():
    s=Scene()
    for sg in (1,-1):
        c=np.array([sg*0.12,-sg*0.12,0])
        s.cone(c+[0,0,-0.15],c+[0,0,0.05],0.06,0.05,'steel'); s.ell(c+[0,0,0.12],rot(0.8),(0.062,0.056,0.08),'darkleather')
    return s
icon('hands',gloves())
def legs():
    s=Scene(); M=rot(np.radians(45))
    s.cone(M@[0,0,0.3],M@[0,0,0.1],0.19,0.2,'darksteel')
    for sg in (1,-1):
        s.cone(M@[sg*0.1,0,0.15],M@[sg*0.12,0,-0.3],0.1,0.07,'darkleather')
        s.ell(M@[sg*0.12,0.04,-0.05],M,(0.088,0.07,0.2),'steel'); s.sphere(M@[sg*0.12,0.04,-0.3],0.07,'steel')
    return s
icon('legs',legs())
def boots():
    s=Scene()
    for sg in (1,-1):
        c=np.array([sg*0.14,-sg*0.14,0]); M=rot(np.radians(45))
        s.cone(c+[0,0,0.3],c,0.065,0.055,'steel'); s.ell(c+M@[0,0.06,-0.04],M,(0.07,0.13,0.06),'leather')
    return s
icon('feet',boots())
def amulet():
    s=Scene()
    for k in range(12):
        a=k/12*np.pi*1.2+np.pi*0.9; b=(k+1)/12*np.pi*1.2+np.pi*0.9
        s.cone([0.2*np.cos(a),0,0.25+0.25*np.sin(a)],[0.2*np.cos(b),0,0.25+0.25*np.sin(b)],0.012,0.012,'gold')
    M=frame_from([1,1,0.3],[0,0,1]); s.ell([0,0,0.0],M,(0.1,0.1,0.03),'gold'); s.ell([0.02,0.02,0.0],M,(0.06,0.06,0.03),'gem_red'); return s
icon('amulet',amulet())
def ring():
    s=Scene(); M=rot(0.6,0.9,0)
    for k in range(14):
        a=k/14*2*np.pi; b=(k+1)/14*2*np.pi
        s.cone(M@[0.1*np.cos(a),0.1*np.sin(a),0],M@[0.1*np.cos(b),0.1*np.sin(b),0],0.025,0.025,'gold')
    s.sphere(M@[0,0.12,0.0],0.045,'gem_blue'); return s
icon('ring',ring())
def potion(m):
    s=Scene(); s.sphere([0,0,0.12],0.14,'glass'); s.sphere([0,0,0.11],0.125,m)
    s.cone([0,0,0.22],[0,0,0.36],0.05,0.045,'glass'); s.cone([0,0,0.34],[0,0,0.40],0.05,0.05,'leather'); return s
icon('potion_hp',potion('potion_red')); icon('potion_mp',potion('potion_blue'))
def goldpile():
    s=Scene(); rng=np.random.default_rng(4)
    for k in range(10):
        c=rng.uniform(-0.12,0.12,2); s.cone([c[0],c[1],0.012*k],[c[0],c[1],0.012*k+0.012],0.06,0.06,'gold')
    return s
icon('gold',goldpile())
def medallion():
    s=Scene(); M=frame_from([1,1,0.4],[0,0,1])
    s.ell([0,0,0],M,(0.16,0.16,0.03),'gold'); s.ell(M@[0,0,0.02],M,(0.11,0.11,0.02),'bronze')
    s.sphere(M@[0,0,0.04],0.05,'gem_purple'); return s
icon('medallion',medallion())
def scroll():
    s=Scene(); s.cone([-0.2,0.2,0],[0.2,-0.2,0],0.07,0.07,'paper'); s.cone([-0.22,0.22,0],[-0.19,0.19,0],0.075,0.075,'cloth_red'); return s
icon('scroll',scroll())
def keyi():
    s=Scene(); s.cone([-0.15,0.15,0],[0.15,-0.15,0],0.02,0.02,'gold')
    for k in range(10):
        a=k/10*6.28; b=(k+1)/10*6.28; c=np.array([-0.2,0.2,0])
        s.cone(c+[0.07*np.cos(a),0.07*np.sin(a),0],c+[0.07*np.cos(b),0.07*np.sin(b),0],0.018,0.018,'gold')
    s.box([0.12,-0.12,-0.05],rot(np.radians(45)),(0.02,0.02,0.05),0.005,'gold'); return s
icon('key',keyi())
pack(icons,'icons',OUT,96/0.5,quantize=False,maxw=1024,maxh=1024)

# portrait (hero bust)
from hero import BODY, outfit_knight
from anim import READY
p=dict(READY); p['yaw']=np.radians(-45+12)
J=BODY.solve(p); s=Scene(); outfit_knight(s,J,p)
img=render(s,420,420,(210,560),scale=PX_PER_M*5.2,ss=2,outline=False)
img.save(f'{OUT}/portrait.png')
print('DONE',round(time.time()-t0),flush=True)
