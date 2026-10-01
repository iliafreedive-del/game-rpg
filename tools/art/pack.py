import json, numpy as np
from PIL import Image

def trim(im, origin):
    a = np.asarray(im)[...,3]
    ys, xs = np.nonzero(a>2)
    if len(xs)==0: return None
    x0,x1,y0,y1 = xs.min(), xs.max()+1, ys.min(), ys.max()+1
    return im.crop((x0,y0,x1,y1)), (origin[0]-x0, origin[1]-y0)

def pack(frames, prefix, outdir, ppm, maxw=2048, maxh=2048, quantize=True, extra=None):
    """frames: dict name -> (PIL image trimmed, (ax,ay))."""
    items = sorted(frames.items(), key=lambda kv: -kv[1][0].height)
    sheets=[]; meta={}
    cur=None; x=y=rowh=0
    def new():
        return Image.new('RGBA',(maxw,maxh),(0,0,0,0))
    used_h=[]
    for name,(im,(ax,ay)) in items:
        w,h = im.size
        if cur is None: cur=new(); x=y=rowh=0
        if x+w+1>maxw: x=0; y+=rowh+1; rowh=0
        if y+h+1>maxh:
            sheets.append((cur,y)); cur=new(); x=y=rowh=0
        cur.paste(im,(x,y))
        meta[name]=[len(sheets),x,y,w,h,round(float(ax),1),round(float(ay),1)]
        x+=w+1; rowh=max(rowh,h)
    sheets.append((cur,y+rowh+1))
    names=[]
    for i,(sh,hh) in enumerate(sheets):
        hh = min(maxh, int(2**np.ceil(np.log2(max(hh,16))))) if hh<maxh else maxh
        sh = sh.crop((0,0,maxw,hh))
        fn = f'{prefix}_{i}.png'
        if quantize:
            sh = sh.quantize(256, method=Image.FASTOCTREE, dither=Image.Dither.NONE)
        sh.save(f'{outdir}/{fn}', optimize=True)
        names.append(fn)
    data = dict(ppm=ppm, sheets=names, frames=meta)
    if extra: data.update(extra)
    json.dump(data, open(f'{outdir}/{prefix}.json','w'), separators=(',',':'))
    return data
