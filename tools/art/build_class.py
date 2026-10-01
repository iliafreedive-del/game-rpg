"""Render class hero sheets: python3 build_class.py archer|mage  (resumable per direction)."""
import numpy as np, time, sys, pickle, os
from sdf import render, PX_PER_M, Scene
from hero import BODY
from outfits import OUTFITS
import gear
from anim import CLIPS, sample
from pack import trim, pack
cls = sys.argv[1]
OUT='/home/claude/da/assets/sprites'
HD=float(os.environ.get('HD','1')); SCALE = PX_PER_M*1.5*HD; W=H=int(200*HD); ORG=(W//2,int(150*HD))
SHARED=['idle','walk','run','hit','death','dodge','cast']
clips = SHARED + (['bowdraw','bowrel'] if cls=='archer' else [])
weap = 'bow' if cls=='archer' else 'staff'
layers={'body':{}, weap:{}}
CK=f'/home/claude/{cls}_ck' + ('_hd' if HD>1 else ''); os.makedirs(CK,exist_ok=True)
t0=time.time(); n=0
for d in range(8):
    ckf=f'{CK}/d{d}.pkl'
    if os.path.exists(ckf):
        part=pickle.load(open(ckf,'rb'))
        for k in layers: layers[k].update(part[k])
        print('cached',d,flush=True); continue
    part={k:{} for k in layers}
    for cl in clips:
        for i in range(CLIPS[cl][0]):
            p=sample(cl,i); p['yaw']=np.radians(d*45-90); p['orbit']=i*0.9+d*0.4
            J=BODY.solve(p)
            sc=Scene(); OUTFITS[cls](sc,J,p)
            im,dep=render(sc,W,H,ORG,scale=SCALE,ss=2,return_depth=True)
            name=f'{cl}_{d}_{i}'
            tr=trim(im,ORG)
            if tr: layers['body'][name]=tr; part['body'][name]=tr
            ws=Scene()
            if weap=='bow': gear.bow(ws,J,p.get('draw',0))
            else: gear.staff(ws,J)
            wi=render(ws,W,H,ORG,scale=SCALE,ss=2,depth_ref=dep)
            tr=trim(wi,ORG)
            if tr: layers[weap][name]=tr; part[weap][name]=tr
            n+=1
        print(cls,d,cl,n,round(time.time()-t0),flush=True)
    pickle.dump(part,open(ckf,'wb'))
clipmeta={k:[v[0],v[1]] for k,v in CLIPS.items()}
for k,fr in layers.items():
    pack(fr,f'hero_{cls}_{k}',OUT,SCALE,extra=dict(clips=clipmeta,dirs=8))
print('DONE',cls,round(time.time()-t0),flush=True)
