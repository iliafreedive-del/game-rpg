import numpy as np, time, sys
from sdf import render, PX_PER_M, Scene
from rig import Body
import monsters as M
from pack import trim, pack
OUT='/home/claude/da/assets/sprites'
DIRS=[0,1,3,4,5]      # others mirrored in engine: 2<-0, 7<-3, 6<-4
t0=time.time()
only = sys.argv[1:] or list(M.MODELS)+['beast']
import os, json
HD=float(os.environ.get('HD','1'))
for name in only:
    jf=f'{OUT}/{name}.json'
    if os.path.exists(jf) and len(sys.argv)<2:
        want=PX_PER_M*(1.35 if name.startswith('npc_') else 1.25)*HD
        if json.load(open(jf)).get('ppm',0) >= want*0.99: print('skip',name,flush=True); continue
    frames={}; clipmeta={}
    npc = name.startswith('npc_')
    dirs = [0,1] if npc else DIRS
    sc = PX_PER_M*(1.35 if npc else 1.25)*HD
    big = name=='boss'
    W = int((300 if big else 210)*HD); H = W; ORG=(W//2, int(H*0.78))
    if name=='beast':
        for cl,nf,loop in M.BEAST_CLIPS:
            clipmeta[cl]=[nf,loop]
            for d in dirs:
                for i in range(nf):
                    t=i/nf if loop else i/max(nf-1,1)
                    p=M.beast_clip(cl,t); p['yaw']=np.radians(d*45-90)
                    im=render(M.beast_scene(p),W,H,ORG,scale=sc,ss=2)
                    tr=trim(im,ORG)
                    if tr: frames[f'{cl}_{d}_{i}']=tr
    else:
        fn,bp,clips=M.MODELS[name]; b=Body(**bp)
        for cl,nf,loop,f in clips:
            clipmeta[cl]=[nf,loop]
            for d in dirs:
                for i in range(nf):
                    t=i/nf if loop else i/max(nf-1,1)
                    p=f(t); p['yaw']=np.radians(d*45-90)
                    J=b.solve(p); s=Scene(); fn(s,J,p)
                    im=render(s,W,H,ORG,scale=sc,ss=2)
                    tr=trim(im,ORG)
                    if tr: frames[f'{cl}_{d}_{i}']=tr
    pack(frames,name,OUT,sc,maxw=2048,maxh=2048,extra=dict(clips=clipmeta,dirs=dirs,mirror=True))
    print(name,len(frames),round(time.time()-t0),flush=True)
print('DONE',flush=True)
