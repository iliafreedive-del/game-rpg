"""DARK ASCENT asset pipeline: orthographic isometric SDF ray-marcher.
Renders procedurally modelled characters/props to RGBA sprites with consistent
lighting, so every in-game asset shares one art style (pre-rendered 3D, D1/D2 approach)."""
import numpy as np
from PIL import Image

PITCH = np.radians(30.0)      # 2:1 dimetric
AZ = np.radians(45.0)
PX_PER_M = 45.2548            # 1 tile (1m) -> 64px wide diamond at zoom 1

def norm(v):
    v = np.asarray(v, float); return v / np.linalg.norm(v)

# camera basis (world z up). Viewer sits toward +x+y.
VIEW_TO = norm([np.cos(AZ)*np.cos(PITCH), np.sin(AZ)*np.cos(PITCH), np.sin(PITCH)])  # from target to eye
FWD = -VIEW_TO
RIGHT = norm([1, -1, 0])
UP = np.cross(RIGHT, FWD)
UP = norm(UP)
if UP[2] < 0: UP = -UP

# ------------------------------------------------------------ noise
def _hash(ix, iy, iz):
    h = (ix * 374761393 + iy * 668265263 + iz * 1274126177) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffff) / 65535.0

def vnoise(p):
    f = np.floor(p); t = p - f; t = t*t*(3-2*t)
    i = f.astype(np.int64)
    ix, iy, iz = i[:,0], i[:,1], i[:,2]
    r = 0
    for dx in (0,1):
        wx = t[:,0] if dx else 1-t[:,0]
        for dy in (0,1):
            wy = t[:,1] if dy else 1-t[:,1]
            for dz in (0,1):
                wz = t[:,2] if dz else 1-t[:,2]
                r = r + wx*wy*wz*_hash(ix+dx, iy+dy, iz+dz)
    return r

def fbm(p, oct=3):
    a, s, r = 0.5, 1.0, 0
    for _ in range(oct):
        r = r + a*vnoise(p*s); s *= 2.03; a *= 0.5
    return r / (1 - 0.5**oct)

# ------------------------------------------------------------ materials
# base rgb, specular, roughness-ish shininess, noise amount, noise scale, emissive
MAT = {
 'steel':   ((0.40,0.41,0.44), 0.65, 30, 0.16, 9, 0),
 'darksteel':((0.19,0.19,0.22), 0.55, 24, 0.16, 9, 0),
 'gold':    ((0.66,0.47,0.20), 0.8, 35, 0.12, 12, 0),
 'bronze':  ((0.55,0.36,0.18), 0.7, 25, 0.15, 10, 0),
 'leather': ((0.33,0.21,0.13), 0.15, 8, 0.25, 14, 0),
 'darkleather':((0.18,0.12,0.08),0.12,8,0.25,14,0),
 'cloth_red':((0.45,0.08,0.07), 0.05, 4, 0.25, 18, 0),
 'cloth_blue':((0.12,0.18,0.40),0.05,4,0.25,18,0),
 'cloth_brown':((0.36,0.26,0.16),0.05,4,0.3,18,0),
 'cloth_green':((0.22,0.30,0.16),0.05,4,0.3,18,0),
 'cloth_purple':((0.28,0.12,0.36),0.05,4,0.3,18,0),
 'cloth_white':((0.72,0.70,0.64),0.05,4,0.25,18,0),
 'black':   ((0.07,0.06,0.07), 0.2, 10, 0.2, 10, 0),
 'skin':    ((0.78,0.56,0.43), 0.12, 10, 0.08, 20, 0),
 'hair':    ((0.20,0.13,0.08), 0.1, 6, 0.4, 30, 0),
 'beard_grey':((0.62,0.60,0.56),0.05,5,0.35,30,0),
 'bone':    ((0.80,0.76,0.62), 0.25, 14, 0.25, 16, 0),
 'oldbone': ((0.62,0.57,0.44), 0.2, 12, 0.3, 16, 0),
 'wood':    ((0.40,0.26,0.14), 0.08, 6, 0.45, 7, 0),
 'darkwood':((0.22,0.14,0.08), 0.06, 6, 0.45, 7, 0),
 'string':  ((0.85,0.82,0.70), 0.1, 6, 0.0, 1, 0),
 'stone':   ((0.42,0.40,0.38), 0.08, 6, 0.45, 5, 0),
 'darkstone':((0.26,0.25,0.25),0.08, 6, 0.45, 5, 0),
 'mossstone':((0.36,0.39,0.31),0.06,6,0.5,5,0),
 'thatch':  ((0.62,0.50,0.26), 0.03, 4, 0.55, 22, 0),
 'plaster': ((0.72,0.66,0.54), 0.03, 4, 0.25, 6, 0),
 'roof_red':((0.42,0.17,0.12),0.06,6,0.35,10,0),
 'leaf':    ((0.20,0.33,0.14), 0.05, 5, 0.6, 5, 0),
 'leaf2':   ((0.30,0.40,0.16), 0.05, 5, 0.6, 5, 0),
 'bark':    ((0.28,0.20,0.13), 0.04, 5, 0.5, 10, 0),
 'water':   ((0.12,0.22,0.30), 1.0, 60, 0.1, 4, 0),
 'eye_red': ((1.0,0.25,0.10), 0, 1, 0, 1, 1.0),
 'eye_blue':((0.35,0.75,1.0), 0, 1, 0, 1, 1.0),
 'eye_green':((0.40,1.0,0.45),0, 1, 0, 1, 1.0),
 'fire':    ((1.0,0.62,0.20), 0, 1, 0.3, 8, 1.0),
 'purple_glow':((0.72,0.35,1.0),0,1,0.3,6,1.0),
 'ice_glow':((0.55,0.85,1.0), 0, 1, 0.2, 6, 0.9),
 'gem_red': ((0.8,0.08,0.10), 1.0, 60, 0.0, 1, 0.35),
 'gem_blue':((0.15,0.35,0.9), 1.0, 60, 0.0, 1, 0.35),
 'gem_green':((0.15,0.7,0.3),1.0,60,0.0,1,0.35),
 'gem_purple':((0.6,0.2,0.85),1.0,60,0.0,1,0.4),
 'potion_red':((0.75,0.05,0.08),0.9,50,0.05,3,0.3),
 'potion_blue':((0.10,0.25,0.85),0.9,50,0.05,3,0.3),
 'glass':   ((0.55,0.62,0.60),1.0,60,0.0,1,0.0),
 'fur':     ((0.30,0.24,0.20),0.05,4,0.6,26,0),
 'fur_dark':((0.16,0.13,0.12),0.05,4,0.6,26,0),
 'flesh':   ((0.45,0.36,0.33),0.15,10,0.4,12,0),
 'paper':   ((0.80,0.72,0.55),0.02,3,0.2,10,0),
 'iron_rust':((0.36,0.26,0.20),0.4,15,0.5,12,0),
 'brick':((0.40,0.37,0.34),0.08,6,0.35,6,0),
 'brick_town':((0.55,0.50,0.44),0.06,6,0.35,6,0),
 'shingle':((0.34,0.20,0.15),0.08,8,0.4,10,0),
 'runes':((0.30,0.28,0.30),0.1,8,0.3,6,0),
 'feather':((0.08,0.09,0.12),0.35,20,0.35,28,0),
 'feather_hi':((0.14,0.22,0.30),0.55,30,0.3,28,0),
 'porcelain':((0.86,0.84,0.80),0.6,40,0.04,8,0),
 'cloth_teal':((0.07,0.22,0.24),0.05,4,0.3,18,0),
 'cloth_indigo':((0.10,0.08,0.26),0.08,6,0.28,18,0),
 'cloth_night':((0.05,0.05,0.10),0.1,8,0.25,18,0),
 'rune_cyan':((0.35,0.95,1.0),0,1,0.2,6,1.0),
 'crystal':((0.45,0.90,1.0),0.9,60,0.05,3,0.75),
 'eye_teal':((0.35,1.0,0.85),0,1,0,1,1.0),
}
MAT_NAMES = list(MAT.keys())
MAT_ID = {n:i for i,n in enumerate(MAT_NAMES)}
MAT_ARR = np.array([MAT[n][0] for n in MAT_NAMES])
MAT_SPEC = np.array([MAT[n][1] for n in MAT_NAMES])
MAT_SHIN = np.array([MAT[n][2] for n in MAT_NAMES], float)
MAT_NOI = np.array([MAT[n][3] for n in MAT_NAMES])
MAT_NSC = np.array([MAT[n][4] for n in MAT_NAMES], float)
MAT_EMI = np.array([MAT[n][5] for n in MAT_NAMES])

# ------------------------------------------------------------ primitives
class Scene:
    def __init__(self):
        self.cones=[]; self.boxes=[]; self.ells=[]
    def cone(self, a, b, ra, rb=None, mat='steel', layer=0):
        if rb is None: rb = ra
        self.cones.append((np.asarray(a,float), np.asarray(b,float), ra, rb, MAT_ID[mat], layer)); return self
    def sphere(self, c, r, mat='steel', layer=0):
        return self.cone(c, np.asarray(c,float)+[0,0,1e-4], r, r, mat, layer)
    def box(self, c, R, he, rad=0.0, mat='stone', layer=0):
        self.boxes.append((np.asarray(c,float), np.asarray(R,float), np.asarray(he,float), rad, MAT_ID[mat], layer)); return self
    def ell(self, c, R, radii, mat='steel', layer=0):
        self.ells.append((np.asarray(c,float), np.asarray(R,float), np.asarray(radii,float), MAT_ID[mat], layer)); return self
    def filtered(self, layers):
        s = Scene()
        s.cones=[p for p in self.cones if p[5] in layers]
        s.boxes=[p for p in self.boxes if p[5] in layers]
        s.ells=[p for p in self.ells if p[4] in layers]
        return s
    def empty(self): return not (self.cones or self.boxes or self.ells)
    def compile(self):
        c = self.cones
        self.cA = np.array([p[0] for p in c]).reshape(-1,3)
        self.cB = np.array([p[1] for p in c]).reshape(-1,3)
        self.cRa = np.array([p[2] for p in c]); self.cRb = np.array([p[3] for p in c])
        self.cM = np.array([p[4] for p in c], int)
        b = self.boxes
        self.bC = np.array([p[0] for p in b]).reshape(-1,3)
        self.bR = np.array([p[1] for p in b]).reshape(-1,3,3)
        self.bH = np.array([p[2] for p in b]).reshape(-1,3)
        self.bRad = np.array([p[3] for p in b]); self.bM = np.array([p[4] for p in b], int)
        self.bRcat = self.bR.transpose(1,0,2).reshape(3,-1) if len(b) else None
        self.bCR = np.einsum('kd,kde->ke', self.bC, self.bR) if len(b) else None
        e = self.ells
        self.eC = np.array([p[0] for p in e]).reshape(-1,3)
        self.eR = np.array([p[1] for p in e]).reshape(-1,3,3)
        self.eD = np.array([p[2] for p in e]).reshape(-1,3)
        self.eM = np.array([p[3] for p in e], int)
        self.eRcat = self.eR.transpose(1,0,2).reshape(3,-1) if len(e) else None
        self.eCR = np.einsum('kd,kde->ke', self.eC, self.eR) if len(e) else None
        self.eInv = 1/self.eD if len(e) else np.zeros((0,3)); self.eInv2 = self.eInv**2
        if not len(b): self.bCR = np.zeros((0,3))
        if not len(e): self.eCR = np.zeros((0,3))
        # bounds
        pts=[]; 
        for p in c: pts += [p[0]-max(p[2],p[3]), p[0]+max(p[2],p[3]), p[1]-max(p[2],p[3]), p[1]+max(p[2],p[3])]
        for p in b:
            r = np.linalg.norm(p[2])+p[3]; pts += [p[0]-r, p[0]+r]
        for p in e:
            r = p[2].max(); pts += [p[0]-r, p[0]+r]
        pts = np.array(pts)
        self.lo = pts.min(0); self.hi = pts.max(0)
        bc=[];br=[]
        for p in c:
            m=(p[0]+p[1])/2; bc.append(m); br.append(np.linalg.norm(p[1]-p[0])/2+max(p[2],p[3])+0.01)
        for p in b: bc.append(p[0]); br.append(np.linalg.norm(p[2])+p[3]+0.01)
        for p in e: bc.append(p[0]); br.append(p[2].max()+0.01)
        self.bsC=np.array(bc).reshape(-1,3); self.bsR=np.array(br)
        return self

    def sub(self, ci, bi, ei):
        s = Scene.__new__(Scene)
        s.cA,s.cB,s.cRa,s.cRb,s.cM = self.cA[ci],self.cB[ci],self.cRa[ci],self.cRb[ci],self.cM[ci]
        s.bC=self.bC[bi]; s.bH=self.bH[bi]; s.bRad=self.bRad[bi]; s.bM=self.bM[bi]; s.bR=self.bR[bi]
        s.bRcat = s.bR.transpose(1,0,2).reshape(3,-1) if len(bi) else None
        s.bCR = self.bCR[bi] if len(bi) else None
        s.eC=self.eC[ei]; s.eD=self.eD[ei]; s.eM=self.eM[ei]; s.eR=self.eR[ei]
        s.eRcat = s.eR.transpose(1,0,2).reshape(3,-1) if len(ei) else None
        s.eCR = self.eCR[ei] if len(ei) else None
        s.eInv=self.eInv[ei]; s.eInv2=self.eInv2[ei]
        return s
    def dist(self, P):
        n = len(P)
        best = np.full(n, 1e9); mat = np.zeros(n, int)
        acc = np.zeros(n)   # smooth-union accumulator for organic materials (soft joints, no blocky seams)
        K = SMOOTH_K
        def soft(d, M):
            nonlocal acc
            if K <= 0: return
            sm = SOFT_MAT[M]            # n x k mask of organic prims
            if sm.any(): acc = acc + (np.exp(-np.clip(d, -0.5, 0.3) / K) * sm).sum(1)
        if len(self.cA):
            d = cone_sdf(P, self.cA, self.cB, self.cRa, self.cRb)  # n x k
            soft(d, self.cM[None].repeat(n, 0))
            i = d.argmin(1); v = d[np.arange(n), i]
            upd = v < best; best = np.where(upd, v, best); mat = np.where(upd, self.cM[i], mat)
        if len(self.bC):
            q = (P@self.bRcat).reshape(n,-1,3) - self.bCR[None]
            q = np.abs(q) - self.bH[None] + self.bRad[None,:,None]
            mq = np.maximum(q,0)
            d = np.sqrt((mq*mq).sum(2)) + np.minimum(q.max(2),0) - self.bRad[None]
            soft(d, self.bM[None].repeat(n, 0))
            i = d.argmin(1); v = d[np.arange(n), i]
            upd = v < best; best = np.where(upd, v, best); mat = np.where(upd, self.bM[i], mat)
        if len(self.eC):
            q = (P@self.eRcat).reshape(n,-1,3) - self.eCR[None]
            a1 = q*self.eInv[None]; a2 = q*self.eInv2[None]
            k0 = np.sqrt((a1*a1).sum(2))
            k1 = np.sqrt((a2*a2).sum(2)) + 1e-9
            d = k0*(k0-1)/k1
            soft(d, self.eM[None].repeat(n, 0))
            i = d.argmin(1); v = d[np.arange(n), i]
            upd = v < best; best = np.where(upd, v, best); mat = np.where(upd, self.eM[i], mat)
        if K > 0:
            ds = np.where(acc > 0, -K * np.log(np.maximum(acc, 1e-30)), 1e9)
            best = np.minimum(best, ds)
        return best, mat

import os as _os
SMOOTH_K = float(_os.environ.get('SMOOTH_K', '0'))
_SOFT = {'flesh', 'bone', 'oldbone', 'leather', 'darkleather', 'fur', 'cloth_red', 'cloth_blue', 'cloth_green', 'cloth_purple', 'cloth_brown',
         'cloth_teal', 'cloth_indigo', 'cloth_night', 'cloth_white', 'steel', 'darksteel', 'feather', 'feather_hi', 'porcelain', 'skin', 'plaster'}
SOFT_MAT = None
def _init_soft():
    global SOFT_MAT
    SOFT_MAT = np.array([name in _SOFT for name in MAT_NAMES], bool)
def cone_sdf(P, A, B, ra, rb):
    # iq round cone, vectorised n x k
    ba = B - A                      # k x3
    l2 = (ba*ba).sum(1) + 1e-12
    rr = ra - rb
    a2 = l2 - rr*rr
    il2 = 1.0/l2
    pa = P[:,None,:] - A[None]      # n k 3
    y = (pa*ba[None]).sum(2)
    z = y - l2
    xv = pa*l2[None,:,None] - y[...,None]*ba[None]
    x2 = (xv*xv).sum(2)
    y2 = y*y*l2[None]; z2 = z*z*l2[None]
    k = np.sign(rr)*rr*rr*x2
    d_mid = (np.sqrt(np.maximum(x2*a2*il2,0)) + y*rr)*il2 - ra
    d_top = np.sqrt(np.maximum(x2+z2,0))*il2 - rb
    d_bot = np.sqrt(np.maximum(x2+y2,0))*il2 - ra
    c_top = np.sign(z)*a2*z2 > k
    c_bot = np.sign(y)*a2*y2 < k
    return np.where(c_top, d_top, np.where(c_bot, d_bot, d_mid))

def rot(yaw=0, pitch=0, roll=0):
    """rotation matrix: yaw about z, pitch about x, roll about y (applied roll->pitch->yaw)"""
    cy,sy=np.cos(yaw),np.sin(yaw); cp,sp=np.cos(pitch),np.sin(pitch); cr,sr=np.cos(roll),np.sin(roll)
    Rz=np.array([[cy,-sy,0],[sy,cy,0],[0,0,1]])
    Rx=np.array([[1,0,0],[0,cp,-sp],[0,sp,cp]])
    Ry=np.array([[cr,0,sr],[0,1,0],[-sr,0,cr]])
    return Rz@Rx@Ry

def boxR(M):
    """convert a local->world rotation matrix into the matrix used in Scene.box (world->local via P@R)"""
    return np.asarray(M)

# ------------------------------------------------------------ renderer
LIGHT = norm([-0.55, 0.35, 0.80])  # world-space key light (from upper-left of screen)
LIGHT = norm(-0.6*RIGHT + 0.5*UP + 0.55*VIEW_TO)
FILL = norm(0.7*RIGHT - 0.1*UP + 0.4*VIEW_TO)

def render(scene, W, H, origin_px, scale=PX_PER_M*1.5, ss=2, depth_ref=None, return_depth=False, outline=True, ground_shadow=False):
    """Render scene. origin_px = pixel position of world origin (0,0,0) in output image.
    depth_ref: optional depth buffer (full SS res) — pixels are dropped where depth_ref is nearer."""
    scene.compile()
    Ws, Hs = W*ss, H*ss
    sc = scale*ss
    # screen bounds of scene bbox
    lo, hi = scene.lo, scene.hi
    corners = np.array([[x,y,z] for x in (lo[0],hi[0]) for y in (lo[1],hi[1]) for z in (lo[2],hi[2])])
    sx = corners@RIGHT*sc + origin_px[0]*ss; sy = -corners@UP*sc + origin_px[1]*ss
    x0=max(int(sx.min())-2,0); x1=min(int(sx.max())+3,Ws); y0=max(int(sy.min())-2,0); y1=min(int(sy.max())+3,Hs)
    rgba = np.zeros((Hs,Ws,4)); depth = np.full((Hs,Ws), 1e9)
    if x1<=x0 or y1<=y0:
        return finish(rgba, ss, outline, depth if return_depth else None)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    u = (xx.ravel()+0.5 - origin_px[0]*ss)/sc; v = -(yy.ravel()+0.5 - origin_px[1]*ss)/sc
    base = u[:,None]*RIGHT + v[:,None]*UP
    # start plane: project bbox onto view axis
    tmin = (corners@FWD).min()-0.05; tmax=(corners@FWD).max()+0.05
    ro = base + FWD*tmin
    # analytic entry via bounding spheres: skip empty rays and jump to first candidate
    oc = scene.bsC[None]-ro[:,None]             # n k 3
    tc = oc@FWD                                  # n k
    perp2 = (oc*oc).sum(2)-tc*tc
    r2 = scene.bsR[None]**2
    inside = perp2 < r2
    th = np.sqrt(np.maximum(r2-perp2,0))
    tent = np.where(inside, tc-th, 1e9).min(1)
    texit = np.where(inside, tc+th, -1e9).max(1)
    has = inside.any(1)
    t = np.maximum(tent,0); hit = np.zeros(len(u), bool)
    nc, nb = len(scene.cA), len(scene.bC)
    TW = 24
    lx = xx.ravel()-x0; ly = yy.ravel()-y0
    tid = (ly//TW)*((x1-x0)//TW+1) + (lx//TW)
    order = np.argsort(tid, kind='stable'); tids = tid[order]
    bounds = np.flatnonzero(np.diff(tids))+1
    for grp in np.split(order, bounds):
        g = grp[has[grp]]
        if not len(g): continue
        cand = np.nonzero(inside[g].any(0))[0]
        sub = scene.sub(cand[cand<nc], cand[(cand>=nc)&(cand<nc+nb)]-nc, cand[cand>=nc+nb]-nc-nb)
        alive = g
        for it in range(70):
            if len(alive)==0: break
            P = ro[alive] + FWD*t[alive,None]
            d,_ = sub.dist(P)
            t[alive] += d*0.9
            h = d < 0.0025
            hit[alive[h]] = True
            alive = alive[(~h) & (t[alive] < texit[alive])]
    idx = np.nonzero(hit)[0]
    if len(idx):
        P = ro[idx] + FWD*t[idx,None]
        d, m = scene.dist(P)
        e = 0.002
        nx = scene.dist(P+[e,0,0])[0]-scene.dist(P-[e,0,0])[0]
        ny = scene.dist(P+[0,e,0])[0]-scene.dist(P-[0,e,0])[0]
        nz = scene.dist(P+[0,0,e])[0]-scene.dist(P-[0,0,e])[0]
        N = np.stack([nx,ny,nz],1); N /= np.linalg.norm(N,axis=1,keepdims=True)+1e-9
        # ambient occlusion
        ao = np.ones(len(idx))
        for i,hh in enumerate((0.03,0.07,0.13,0.22)):
            dd,_ = scene.dist(P+N*hh)
            ao -= (hh-np.maximum(dd,0))*(1.8/(i+1))
        ao = np.clip(ao,0.25,1)
        base_col = MAT_ARR[m].copy()
        nz_ = fbm(P*MAT_NSC[m][:,None], 3)
        base_col = base_col*(1 + (nz_[:,None]-0.5)*2*MAT_NOI[m][:,None])
        for bn,(bw,bh) in (('brick',(0.34,0.17)),('brick_town',(0.30,0.15)),('shingle',(0.22,0.10))):
            sel = m==MAT_ID[bn]
            if sel.any():
                Q=P[sel]; along = np.where(np.abs(N[sel,0])>np.abs(N[sel,1]), Q[:,1], Q[:,0])
                zz = Q[:,2] if bn!='shingle' else Q[:,2]-0.3*(Q[:,0]+Q[:,1])
                row = np.floor(zz/bh); u = along/bw + 0.5*(row%2) + 0.37*_hash(row.astype(np.int64),3,7)
                fu = u-np.floor(u); fv = zz/bh-row
                mort = (np.minimum(fu,1-fu)*bw < 0.018) | (np.minimum(fv,1-fv)*bh < 0.016)
                tint = 0.82+0.3*_hash(np.floor(u).astype(np.int64), row.astype(np.int64), 11)
                c = base_col[sel]*tint[:,None]
                c[mort] *= 0.45
                if np.abs(N[sel,2]).mean()>2: pass
                base_col[sel] = c
        sel = m==MAT_ID['runes']
        if sel.any():
            Q=P[sel]; g = np.sin(Q[:,2]*38+np.sin(Q[:,0]*20+Q[:,1]*20)*2.5)
            rn = (np.abs(g)<0.16)&(fbm(Q*4,2)>0.45)
            c=base_col[sel]; c[rn]=np.array([0.85,0.45,1.3]); base_col[sel]=c
        ndl = N@LIGHT
        diff = np.clip(ndl*0.8+0.2,0,1)**1.3
        fill = np.clip(N@FILL,0,1)*0.25
        sky = 0.18 + 0.12*N[:,2]
        H_ = norm(LIGHT+VIEW_TO)
        spec = np.clip(N@H_,0,1)**MAT_SHIN[m] * MAT_SPEC[m] * 1.2
        rim = np.clip(1-np.abs(N@VIEW_TO),0,1)**3*0.35
        # env reflection for metals: warm below, cool above
        R = 2*(N@VIEW_TO)[:,None]*N - VIEW_TO
        env = np.where(R[:,2:3]>0, np.array([0.30,0.33,0.40]), np.array([0.28,0.18,0.10]))*MAT_SPEC[m][:,None]*0.9
        col = base_col*(diff[:,None]*np.array([1.05,0.96,0.85]) + fill[:,None]*np.array([0.55,0.65,0.95]) + sky[:,None]) * ao[:,None]
        col = col + spec[:,None]*np.array([1,0.93,0.8]) + env*ao[:,None]*0.4 + rim[:,None]*np.array([0.45,0.5,0.7])*ao[:,None]
        emi = MAT_EMI[m][:,None]
        col = col*(1-emi) + (MAT_ARR[m]*(1.1+0.25*nz_[:,None]))*emi
        glow = base_col.max(1) > 1.0
        col[glow] = np.clip(base_col[glow]*0.8,0,1)
        col = np.clip(col,0,1)
        py = yy.ravel()[idx]; px = xx.ravel()[idx]
        dep = tmin + t[idx]
        ok = np.ones(len(idx),bool)
        if depth_ref is not None:
            ok = dep < depth_ref[py,px] - 0.004
        rgba[py[ok],px[ok],:3] = col[ok]; rgba[py[ok],px[ok],3] = 1
        depth[py,px] = dep
    return finish(rgba, ss, outline, depth if return_depth else None)

def finish(rgba, ss, outline, depth):
    Hs, Ws = rgba.shape[:2]
    # premultiplied downsample
    pm = rgba.copy(); pm[...,:3] *= pm[...,3:4]
    small = pm.reshape(Hs//ss, ss, Ws//ss, ss, 4).mean((1,3))
    a = small[...,3:4]
    col = np.where(a>0, small[...,:3]/np.maximum(a,1e-6), 0)
    out = np.concatenate([col, a], 2)
    if outline:
        A = out[...,3]
        pad = np.pad(A,1)
        nb = np.maximum.reduce([pad[:-2,1:-1],pad[2:,1:-1],pad[1:-1,:-2],pad[1:-1,2:]])
        ring = np.clip(nb - A, 0, 1)*0.55
        # composite dark outline beneath
        oc = np.array([0.03,0.02,0.02])
        newA = A + ring*(1-A)
        out[...,:3] = np.where(newA[...,None]>0, (out[...,:3]*A[...,None] + oc*ring[...,None]*(1-A[...,None]))/np.maximum(newA[...,None],1e-6), 0)
        out[...,3] = newA
    img = Image.fromarray((np.clip(out,0,1)*255).astype(np.uint8), 'RGBA')
    if depth is not None: return img, depth
    return img

def to_image(arr):
    return Image.fromarray((np.clip(arr,0,1)*255).astype(np.uint8),'RGBA')
_init_soft()
