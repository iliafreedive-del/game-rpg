# Запуск: python3 -I tools/art/fx_mobs_prep.py <распакованный dark_ascent_fx_mobs> assets/art/fx  (П21, листы атак мобов от GPT)
# Готовит листы GPT к игре: чёрный фон -> альфа (для сложения на прозрачном оверлее), рецентровка полосы, пересборка crash из исходника
import sys,json
from PIL import Image
import numpy as np
src,dst=sys.argv[1],sys.argv[2]
J=json.load(open(src+'/assets/art/fx/fx_mobs.json'))
def black_to_alpha(rgb):
  rgb=rgb.astype(np.float32); a=rgb.max(-1); a=np.where(a<6,0,a)
  out=np.zeros(rgb.shape[:2]+(4,),np.float32)
  nz=a>0; out[...,:3][nz]=rgb[nz]*255.0/a[nz][:,None]; out[...,3]=a
  return out.clip(0,255).astype(np.uint8)
def save(id_,arr): Image.fromarray(arr,'RGBA').save(f'{dst}/{id_}.webp','WEBP',quality=82,method=6,exact=False)
for k in ['mob_bite','mob_claw','mob_gore']:
  im=np.asarray(Image.open(src+'/'+J[k]['file']).convert('RGB')); save(k,black_to_alpha(im))
# полоса разбега: центрировать каждый кадр по вертикали (у GPT дрейф на ~9 px по строкам — дёргалась бы в цикле)
im=np.asarray(Image.open(src+'/'+J['mob_charge_tele']['file']).convert('RGB')); c=256; out=np.zeros_like(im)
for i in range(16):
  r,cc=divmod(i,4); cell=im[r*c:(r+1)*c,cc*c:(cc+1)*c]; m=cell.max(-1)>24; ys=np.nonzero(m.any(1))[0]
  sh=128-(ys.min()+ys.max())//2; out[r*c:(r+1)*c,cc*c:(cc+1)*c]=np.roll(cell,sh,axis=0)
# полоса — обычное наложение (тёмный край должен остаться тёмным): альфа = яркость x4, цвет как есть
o=out.astype(np.float32); a=np.clip(o.max(-1)*4-30,0,255); t=np.dstack([out,a.astype(np.uint8)]); save('mob_charge_tele',t)
# удар разбега: нормализованный лист GPT порезан мимо строк (кадры залезают в соседние) и с цветной каймой ключа;
# собираем заново из исходника 1536x1024, у которого альфа чистая: 4 колонки по 384, строки — по пустым полосам альфы
s=np.asarray(Image.open(src+'/fx_src/mob_charge_crash.png').convert('RGBA'))
A=s[...,3]>16; H,W=A.shape; cw=W//4
frames=[]
for col in range(4):
  blk=A[:,col*cw:(col+1)*cw]; rows=blk.sum(1)>2; bands=[];y=0
  while y<H:
    if rows[y]:
      y0=y
      while y<H and rows[y]: y+=1
      if bands and y0-bands[-1][1]<45: bands[-1]=(bands[-1][0],y)
      elif y-y0>25: bands.append((y0,y))
    else: y+=1
  frames.append(bands)
print([len(b) for b in frames],frames)
# порядок кадров: по строкам (row-major)
boxes=[]
for row in range(4):
  for col in range(4):
    Y=[0,281,570,870,1024]; blk=A[Y[row]:Y[row+1],col*cw:(col+1)*cw]; ys=np.nonzero(blk.any(1))[0]; y0,y1=Y[row]+ys.min(),Y[row]+ys.max()+1; xs=np.nonzero(blk.any(0))[0]
    boxes.append((col*cw+xs.min(),y0,col*cw+xs.max()+1,y1, col*cw+cw//2))
mw=max(2*max(b[4]-b[0],b[2]-b[4]) for b in boxes); mh=max(b[3]-b[1] for b in boxes)
sc=min(244/mw,226/mh); print('scale',sc,mw,mh)
out=Image.new('RGBA',(1024,1024),(0,0,0,0)); S=Image.fromarray(s,'RGBA')
for i,(x0,y0,x1,y1,cx) in enumerate(boxes):
  r,cc=divmod(i,4); fr=S.crop((x0,y0,x1,y1)); fr=fr.resize((max(1,round((x1-x0)*sc)),max(1,round((y1-y0)*sc))),Image.LANCZOS)
  px=cc*256+128-round((cx-x0)*sc); py=r*256+240-fr.size[1]
  out.alpha_composite(fr,(px,py))
save('mob_charge_crash',np.asarray(out))
J['mob_charge_crash']['anchor']=[0.5,0.94]
J['mob_charge_tele']['blend']='alpha'; J['mob_gore']['anchor']=[0.5,0.92]
json.dump(J,open(dst+'/fx_mobs.json','w'),ensure_ascii=False,indent=1)
