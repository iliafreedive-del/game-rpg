import numpy as np, time, sys, pickle
from sdf import render, PX_PER_M
from hero import BODY, outfit_knight
from rig import Body
from sdf import Scene
import gear
from anim import CLIPS, sample
from pack import trim, pack

OUT='/home/claude/da/assets/sprites'
import os; os.makedirs(OUT, exist_ok=True)
HD=float(os.environ.get('HD','1')); SCALE = PX_PER_M*1.5*HD; W=H=int(200*HD); ORG=(W//2,int(150*HD))
SHARED=['idle','walk','run','hit','death','dodge','cast']
WEAP={'sword':SHARED+['slash1','slash2'],'axe':SHARED+['slash1','slash2'],'greatsword':SHARED+['chop2','sweep2'],
      'staff':SHARED,'bow':SHARED+['bowdraw','bowrel'],'shield':SHARED+['slash1','slash2']}
layers={k:{} for k in ['body']+list(WEAP)}
t0=time.time(); n=0
clips=list(CLIPS)
CK='/home/claude/hero_ck' + ('_hd' if HD>1 else ''); os.makedirs(CK,exist_ok=True)
for d in range(8):
    ckf=f'{CK}/d{d}.pkl'
    if os.path.exists(ckf):
        part=pickle.load(open(ckf,'rb'))
        for k in layers: layers[k].update(part[k])
        print('cached',d,flush=True); continue
    part={k:{} for k in layers}
    for cl in clips:
        nf=CLIPS[cl][0]
        for i in range(nf):
            p=sample(cl,i); p['yaw']=np.radians(d*45-90)
            J=BODY.solve(p)
            sc=Scene(); outfit_knight(sc,J,p)
            im,dep=render(sc,W,H,ORG,scale=SCALE,ss=2,return_depth=True)
            name=f'{cl}_{d}_{i}'
            tr=trim(im,ORG)
            if tr: layers['body'][name]=tr; part['body'][name]=tr
            for w,cls in WEAP.items():
                if cl not in cls: continue
                ws=Scene()
                if w=='sword': gear.sword(ws,J)
                elif w=='axe': gear.axe(ws,J)
                elif w=='greatsword': gear.greatsword(ws,J)
                elif w=='staff': gear.staff(ws,J)
                elif w=='bow': gear.bow(ws,J,p.get('draw',0))
                elif w=='shield': gear.kite_shield(ws,J)
                wi=render(ws,W,H,ORG,scale=SCALE,ss=2,depth_ref=dep)
                tr=trim(wi,ORG)
                if tr: layers[w][name]=tr; part[w][name]=tr
            n+=1
        print(d,cl,n,round(time.time()-t0),flush=True)
    pickle.dump(part,open(ckf,'wb'))
clipmeta={k:[v[0],v[1]] for k,v in CLIPS.items()}
for k,fr in layers.items():
    pack(fr,'hero_'+k,OUT,SCALE,extra=dict(clips=clipmeta,dirs=8))
print('DONE',round(time.time()-t0),flush=True)
