"""Bake iso floor images (chunked JPEG) from level json with procedural textures."""
import json, numpy as np, os
from PIL import Image, ImageDraw, ImageFilter
MAPS='/home/claude/da/assets/maps'
rng=np.random.default_rng(7)

def noise(h,w,scale,seed):
    r=np.random.default_rng(seed)
    sh=(max(2,int(h/scale))+2, max(2,int(w/scale))+2)
    a=Image.fromarray((r.random(sh)*255).astype(np.uint8)).resize((w,h),Image.BICUBIC)
    return np.asarray(a,np.float32)/255
def fbm(h,w,base,seed,oct=4):
    r=np.zeros((h,w),np.float32); a=0.5; s=base; tot=0
    for i in range(oct):
        r+=a*noise(h,w,s,seed+i); tot+=a; a*=0.5; s/=2.1
    return r/tot

def voronoi_edges(h,w,cell,seed):
    r=np.random.default_rng(seed)
    gy,gx=h//cell+3, w//cell+3
    pts=r.random((gy,gx,2)).astype(np.float32)
    yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
    cy=(yy/cell).astype(int); cx=(xx/cell).astype(int)
    f1=np.full((h,w),9,np.float32); f2=np.full((h,w),9,np.float32); idv=np.zeros((h,w),np.float32)
    for dy in (-1,0,1):
        for dx in (-1,0,1):
            ny=np.clip(cy+dy,0,gy-1); nx=np.clip(cx+dx,0,gx-1)
            px=(nx+pts[ny,nx,0])*cell; py=(ny+pts[ny,nx,1])*cell
            d=np.hypot(xx-px,yy-py)/cell
            m=d<f1
            f2=np.where(m,f1,np.minimum(f2,d)); idv=np.where(m,(ny*131+nx*71)%97/97.0,idv); f1=np.where(m,d,f1)
    return f1,f2,idv

def project(tex, W, H, scale, out_prefix, bg=(0,0,0)):
    """tex: world-space RGB image (ppt px per tile). Output iso image at `scale` (1 = 64px tile)."""
    ppt = tex.width / W
    ow, oh = int((W+H)*32*scale), int((W+H)*16*scale)
    # screen(x,y) -> world(u,v) in tiles: x = (u-v)*32s + H*32s ; y = (u+v)*16s
    s=scale; a=1/(64*s); b=1/(32*s); ox=H*32*s
    # u = ((x-ox)/(32s) + y/(16s))/2 ; v = (y/(16s) - (x-ox)/(32s))/2 ; tex px = u*ppt
    A = (a*ppt, b*ppt, -ox*a*ppt, -a*ppt, b*ppt, ox*a*ppt)
    img = tex.transform((ow,oh), Image.AFFINE, A, resample=Image.BILINEAR, fillcolor=bg)
    chunks=[]
    CS=1024
    for cy in range(0,oh,CS):
        for cx in range(0,ow,CS):
            c=img.crop((cx,cy,min(cx+CS,ow),min(cy+CS,oh)))
            arr=np.asarray(c)
            if arr.max()<6: continue
            fn=f'{out_prefix}_{cx//CS}_{cy//CS}.jpg'
            c.save(f'{MAPS}/{fn}',quality=84,optimize=True)
            chunks.append([fn,cx,cy,c.width,c.height])
    return dict(w=ow,h=oh,scale=scale,ox=ox,chunks=chunks)

def catacombs():
    L=json.load(open(f'{MAPS}/catacombs.json')); W,H=L['w'],L['h']; rows=L['rows']
    P=40; S=W*P
    walk=np.array([[c not in ' #' for c in r] for r in rows])
    wallm=np.array([[c=='#' for c in r] for r in rows])
    cave=np.zeros_like(walk); x,y,w,h=L['rooms']['cave']; cave[y:y+h,x:x+w]=True; cave[31:36,8:14]=True
    arena=np.zeros_like(walk); x,y,w,h=L['rooms']['arena']; arena[y:y+h,x:x+w]=True
    up=lambda m: np.asarray(Image.fromarray((m*255).astype(np.uint8)).resize((S,S),Image.NEAREST),np.float32)/255
    upb=lambda m,r: np.asarray(Image.fromarray((m*255).astype(np.uint8)).resize((S,S),Image.BILINEAR).filter(ImageFilter.GaussianBlur(r)),np.float32)/255
    walkP=up(walk); caveP=upb(cave,20); arenaP=upb(arena,8)
    yy,xx=np.mgrid[0:S,0:S]
    # slabs: 2x2 per tile, wobbly mortar
    wob=(fbm(S,S,30,1)-0.5)*5
    u=(xx+wob)/(P/2); v=(yy+wob.T)/(P/2)
    fu=u-np.floor(u); fv=v-np.floor(v)
    ed=np.minimum(np.minimum(fu,1-fu),np.minimum(fv,1-fv))*(P/2)
    sid=(np.floor(u)*37+np.floor(v)*113)%61/61.0
    base=np.stack([0.30,0.285,0.27])[None,None]*np.ones((S,S,3),np.float32)
    g=fbm(S,S,80,3); fine=fbm(S,S,6,5,3)
    tint=(0.85+0.3*sid)[...,None]*(0.8+0.4*g)[...,None]*(0.88+0.24*fine)[...,None]
    slab=base*tint
    mort=np.clip(1-(ed-0.8)/1.6,0,1)
    bevel=np.clip(1-ed/4,0,1)
    hl=((fu<0.12)|(fv<0.12))*bevel*0.08
    slab=slab*(1-0.55*mort[...,None]) + hl[...,None]
    # cave: rough rock floor
    rock_f1,rock_f2,rid=voronoi_edges(S,S,26,9)
    rock=np.stack([0.26,0.24,0.20])[None,None]*(0.75+0.5*rid)[...,None]*(0.8+0.4*fine)[...,None]
    rock=rock*(1-0.5*np.clip(1-(rock_f2-rock_f1)*8,0,1))[...,None]
    moss=np.clip((fbm(S,S,40,11)-0.55)*4,0,1)
    rock=rock*(1-moss[...,None]*0.4)+moss[...,None]*np.array([0.10,0.16,0.07])*0.6
    col=slab*(1-caveP[...,None])+rock*caveP[...,None]
    # arena: darker with blood-red runic ring
    col=col*(1-0.25*arenaP[...,None])
    ax,ay,aw,ah=L['rooms']['arena']; cx,cy=(ax+aw/2)*P,(ay+ah/2)*P
    rr=np.hypot(xx-cx,yy-cy)/P
    ring=(np.abs(rr-4.2)<0.07)|(np.abs(rr-5.0)<0.05)
    col[ring]=col[ring]*0.4+np.array([0.35,0.05,0.10])
    # grime + cracks + blood decals
    grime=np.clip(fbm(S,S,120,21)-0.35,0,1)
    col=col*(1-0.5*grime[...,None])
    im=Image.fromarray((np.clip(col,0,1)*255).astype(np.uint8))
    d=ImageDraw.Draw(im,'RGBA')
    r=np.random.default_rng(3)
    fy,fx=np.nonzero(walk)
    for k in range(260):
        i=r.integers(len(fx)); x0,y0=(fx[i]+r.random())*P,(fy[i]+r.random())*P; pts=[(x0,y0)]
        ang=r.uniform(0,6.28)
        for s in range(r.integers(3,8)):
            ang+=r.uniform(-0.8,0.8); x0+=np.cos(ang)*r.uniform(4,14); y0+=np.sin(ang)*r.uniform(4,14); pts.append((x0,y0))
        d.line(pts,fill=(10,8,8,150),width=1)
    blood_rooms=['arena','guard','ossuary','entry']
    for k in range(70):
        rn=blood_rooms[k%4]; x,y,w,h=L['rooms'][rn]
        bx,by=(x+r.random()*w)*P,(y+r.random()*h)*P
        for j in range(r.integers(4,12)):
            rr_=r.uniform(2,11); ox_,oy_=r.normal(0,10,2)
            d.ellipse((bx+ox_-rr_,by+oy_-rr_*0.8,bx+ox_+rr_,by+oy_+rr_*0.8),fill=(70,6,6,int(r.uniform(60,140))))
    col=np.asarray(im,np.float32)/255
    # AO from walls + edge falloff
    ao=upb(wallm,26)
    col=col*(1-0.65*ao[...,None])
    col=col*walkP[...,None]
    tex=Image.fromarray((np.clip(col,0,1)*255).astype(np.uint8))
    meta=project(tex,W,H,1.0,'catacombs_floor')
    L['floor']=meta; json.dump(L,open(f'{MAPS}/catacombs.json','w'))
    print('catacombs',meta['w'],meta['h'],len(meta['chunks']))

def village():
    L=json.load(open(f'{MAPS}/village.json')); W,H=L['w'],L['h']; rows=L['rows']
    P=40; S=W*P
    grid=np.array([[c for c in r] for r in rows])
    def mask(ch,blur):
        m=(grid==ch).astype(np.float32)
        im=Image.fromarray((m*255).astype(np.uint8)).resize((S,S),Image.BILINEAR).filter(ImageFilter.GaussianBlur(blur))
        return np.asarray(im,np.float32)/255
    n1=fbm(S,S,90,1); n2=fbm(S,S,14,2,3); n3=fbm(S,S,4,3,2)
    yy,xx=np.mgrid[0:S,0:S]
    grass=np.array([0.23,0.33,0.13])*(0.75+0.5*n1)[...,None]
    dry=np.clip((fbm(S,S,60,4)-0.55)*3,0,1)
    grass=grass*(1-dry[...,None])+np.array([0.38,0.36,0.18])*dry[...,None]*(0.8+0.4*n2)[...,None]
    grass=grass*(0.78+0.44*n3)[...,None]
    dirt=np.array([0.38,0.29,0.19])*(0.8+0.3*n1)[...,None]*(0.85+0.3*n2)[...,None]
    peb=(n3>0.78); dirt[peb]=dirt[peb]*1.3
    f1,f2,idv=voronoi_edges(S,S,15,5)
    cob=np.array([0.42,0.40,0.37])*(0.7+0.5*idv)[...,None]*(0.9+0.2*n2)[...,None]
    edge=np.clip((f2-f1)*6,0,1)
    cob=cob*(0.35+0.65*edge)[...,None]
    cob=cob+ (np.clip(0.25-f1,0,1)*0.3)[...,None]
    water=np.array([0.08,0.16,0.22])*(0.8+0.4*n2)[...,None]+ (np.sin(xx*0.25+n1*9)*0.5+0.5>0.93)[...,None]*0.06
    forest=np.array([0.10,0.14,0.07])*(0.7+0.6*n2)[...,None]
    md=mask(',',6); mc=mask('#',3); mw=mask('~',4); mf=mask('x',18)
    # noisy transition thresholds
    jit=(n2-0.5)*0.35
    md=np.clip((md+jit-0.25)*2.2,0,1); mc=np.clip((mc+jit*0.5-0.4)*3.5,0,1); mw=np.clip((mw-0.45)*5,0,1)
    col=grass*(1-md[...,None])+dirt*md[...,None]
    col=col*(1-mc[...,None])+cob*mc[...,None]
    shore=np.clip(1-np.abs(mask('~',10)-0.35)*5,0,1)
    col=col*(1-0.35*shore[...,None])
    col=col*(1-mw[...,None])+water*mw[...,None]
    col=col*(1-mf[...,None])+forest*mf[...,None]
    im=Image.fromarray((np.clip(col,0,1)*255).astype(np.uint8)); d=ImageDraw.Draw(im,'RGBA')
    r=np.random.default_rng(5)
    for k in range(9000):   # grass tufts + flowers
        x,y=r.integers(0,S,2); ch=grid[min(int(y/P),H-1),min(int(x/P),W-1)]
        if ch!='.': continue
        if r.random()<0.035:
            c=[(200,190,90),(170,120,190),(220,220,220),(200,80,70)][r.integers(4)]
            d.ellipse((x-1.5,y-1.5,x+1.5,y+1.5),fill=c+(230,))
        else:
            g=int(r.uniform(30,80)); d.line([(x,y),(x+r.uniform(-2,2),y-r.uniform(2,5))],fill=(g,g+50,20,150),width=1)
    tex=im
    meta=project(tex,W,H,1.25,'village_floor',bg=(14,20,10))
    L['floor']=meta; json.dump(L,open(f'{MAPS}/village.json','w'))
    print('village',meta['w'],meta['h'],len(meta['chunks']))
catacombs(); village()
