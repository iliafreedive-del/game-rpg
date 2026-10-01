"""Hand-designed Chapter I levels -> assets/maps/*.json (shared by floor baker and game)."""
import json, numpy as np
OUT='/home/claude/da/assets/maps'

# ============================================================ CATACOMBS
W=H=64
g=np.full((H,W),' ')          # ' ' void, '.' floor, 'D' locked door, 'S' secret wall, 'G' sealed gate
def room(x,y,w,h): g[y:y+h, x:x+w]='.'
def hcor(x0,x1,y,wd=3): g[y:y+wd, min(x0,x1):max(x0,x1)+1]='.'
def vcor(y0,y1,x,wd=3): g[min(y0,y1):max(y0,y1)+1, x:x+wd]='.'
rooms = {
 'entry':(4,4,9,9), 'ossuary':(20,3,13,10), 'gallery':(39,3,14,13), 'cave':(4,20,12,14),
 'cross':(21,20,11,11), 'altar':(41,22,10,9), 'secret':(6,42,7,6), 'guard':(21,38,13,11), 'arena':(41,38,17,17)}
for r in rooms.values(): room(*r)
room(8,31,6,5)          # cave lobe
room(24,48,5,3)         # guard hall alcove
hcor(12,20,7)           # entry -> ossuary
hcor(32,39,8)           # ossuary -> gallery
vcor(12,20,7)           # entry -> cave
vcor(12,20,25)          # ossuary -> cross
hcor(15,21,25)          # cave -> cross
hcor(31,41,26,1)        # cross -> altar (narrow, locked door)
g[26,36]='D'
vcor(30,38,26)          # cross -> guard
vcor(33,42,9,2)         # cave -> secret (secret wall)
g[38,9:11]='S'
hcor(33,41,43,1)        # guard -> arena through sealed gate
g[43,37]='G'
vcor(15,22,45,1)        # gallery -> altar back passage (opens only from altar side: one-way lever) -> keep as dead end window
g[16:22,45]=' '
floor = (g!=' ')
# walls = void tiles adjacent (8-neighbourhood) to walkable
wall = np.zeros_like(floor)
for dy in (-1,0,1):
    for dx in (-1,0,1):
        wall |= np.roll(np.roll(floor,dy,0),dx,1)
wall &= ~floor
rows = [''.join('#' if wall[y,x] else g[y,x] for x in range(W)) for y in range(H)]

def C(name): x,y,w,h=rooms[name]; return (x+w/2, y+h/2)
obj=[]
def o(t,x,y,**k): d=dict(t=t,x=round(float(x),2),y=round(float(y),2)); d.update(k); obj.append(d)
# entry
o('portal',8.5,6.2,to='town'); o('brazier',6,10.5); o('brazier',11,10.5); o('bones',10.5,9)
o('chest',5.5,11.5,id='c_entry')
# ossuary
for i,(x,y) in enumerate(((22.5,5.5),(22.5,9.5),(30.5,5.5),(30.5,9.5))):
    o('sarcophagus',x,y,id=f'sarc{i}', loot='key' if i==3 else 'gold')
o('skulls',26.5,4.5); o('bones',27,10.5); o('candles',26.5,7.5); o('chest',31.8,11.5,id='c_oss')
# gallery with pillars
for x in (42,46,50):
    for y in (6,12): o('pillar',x+0.5,y+0.5)
o('chest',51.5,4.5,id='c_gal',rich=1); o('barrel',40,14.5); o('crate',41,15)
# cave
o('rocks',6,22); o('rocks',13.5,27); o('bones',9,26); o('deadroot',12,31); o('rubble',5.5,32.5); o('chest',9.5,34.5,id='c_cave')
# crossroads
o('pillar',23,22); o('pillar',30,22); o('pillar',23,29); o('pillar',30,29); o('brazier',26.5,25.5)
o('board_dungeon',21.5,21.5)
# altar room (locked)
o('altar_medallion',46,23.5,id='medallion'); o('candles',44,23.5); o('candles',48,23.5); o('chest',49.5,29.5,id='c_alt',rich=1)
o('door',36.5,26.5,id='door_altar',key='key')
# secret room
o('secretwall',9.5,38.5,id='secret1'); o('chest',9.5,45,id='c_secret',rich=1); o('skulls',7.2,44)
# guard hall
o('pillar',23,40); o('pillar',32,40); o('pillar',23,47); o('pillar',32,47); o('bones',27,44); o('chest',26.5,49.5,id='c_guard')
# arena
o('gate',37.5,43.5,id='gate'); 
for a in range(6):
    ang=a/6*2*np.pi; o('pillar',49.5+6*np.cos(ang),46.5+6*np.sin(ang))
o('brazier',44,41); o('brazier',55,41); o('brazier',44,52); o('brazier',55,52); o('skulls',49.5,40)
o('portal_return',49.5,52.5,to='town',hidden=1)
# torches on walls facing into rooms (engine picks sconce walls from this list)
torches=[(7,3),(10,3),(24,2),(29,2),(43,2),(48,2),(3,24),(3,29),(20,23),(20,27),(40,25),(20,41),(20,45),(40,42),(40,49),(44,37),(54,37)]
spawns=[
 # (type, x, y, count, spread)
 ('skel_warrior',10.5,8,2,1.2),
 ('skel_warrior',16,8.5,2,0.8),
 ('skel_warrior',26,6.5,4,2.0),('skel_warrior',27,10,3,1.5),
 ('skel_archer',46,5,2,1.5),('skel_archer',48,13,2,1.5),('skel_warrior',44,9,2,1),
 ('beast',8,24,2,1.5),('beast',11,29,2,1.5),('ghoul',10,33,1,0.5),
 ('skel_warrior',26,24,3,1.5),('skel_mage',28.5,27,1,0.2),('skel_archer',24,28,1,0.2),
 ('skel_warrior',45,27,2,1.2),('skel_mage',47,25.5,1,0.2),
 ('ghoul',9.5,44.5,2,1),
 ('skel_warrior',25,42,2,1.2),('ghoul',30,45,2,1.2),('skel_archer',31,42,1,0.3),
]
story=[('elite',27.5,44.5,'elite_guard'),('boss',49.5,46.5,'boss')]
json.dump(dict(w=W,h=H,rows=rows,rooms={k:list(v) for k,v in rooms.items()},objects=obj,torches=torches,
               spawns=spawns,story=story,start=[8.5,8.5],name='Катакомбы Ордена'),open(f'{OUT}/catacombs.json','w'))
print('\n'.join(rows[:56]))

# ============================================================ VILLAGE
TW=TH=40
t=np.full((TH,TW),'.')   # . grass, , dirt, # cobble, ~ water, x out-of-bounds (dense forest edge)
yy,xx=np.mgrid[0:TH,0:TW]
plaza=((xx-20)**2+(yy-20)**2)<=4.6**2
t[plaza]='#'
def path(pts,wd=1.3):
    for (x0,y0),(x1,y1) in zip(pts,pts[1:]):
        for s in np.linspace(0,1,80):
            cx,cy=x0+(x1-x0)*s,y0+(y1-y0)*s
            m=((xx+0.5-cx)**2+(yy+0.5-cy)**2)<=wd**2
            t[m & (t!='#')]=','
path([(20,20),(15,15),(10,10),(8,8)],1.5)          # to portal
path([(20,20),(26,15),(29,12)])                    # smith
path([(20,20),(14,25),(11,28)])                    # merchant
path([(20,20),(26,25),(29,28)])                    # trainer
path([(20,20),(25,31),(32,34)],1.2)                # graveyard / arrival road
path([(20,20),(20,33),(20,39)],1.4)                # south road (arrival)
pond=((xx-7.5)**2/9+(yy-31)**2/5)<=1
t[pond]='~'
edge=(xx<2)|(yy<2)|(xx>=TW-2)|(yy>=TH-2)
t[edge]='x'
trow=[''.join(r) for r in t]
obj=[]
def o(tt,x,y,**k): d=dict(t=tt,x=round(float(x),2),y=round(float(y),2)); d.update(k); obj.append(d)
o('portal',8.5,7.5,to='catacombs')
o('well',20.5,20.5)
o('house_0',12.5,13.5); o('house_1',30.0,10.5); o('house_2',9.5,20.5); o('house_0',31.5,20.0); o('house_2',13.5,33.0)
o('forge',27.2,13.8); o('hay',33.5,14.5); o('barrel',26,11.5); o('crate',25.4,12.4)
o('stall',13.2,26.2); o('barrel',11.2,24.8); o('crate',15.2,27.5)
o('board',17.2,17.0); o('lamp',16.2,22.5); o('lamp',24.5,17.6); o('lamp',24.2,23.5); o('lamp',15.5,17.4)
o('tree_0',4,15); o('tree_1',5,25); o('tree_0',17,4.5); o('tree_1',25,4); o('tree_0',35,6); o('tree_1',36,16)
o('tree_0',36,27); o('tree_1',27,36); o('tree_0',6,36); o('tree_1',11,5); o('tree_0',4,10); o('tree_1',33,36)
o('rocks',6.5,13.5); o('rocks',34,24); o('rocks',10,37)
for i in range(4): o('grave',29.5+i*1.3,31.2+ (i%2)*0.4)
o('grave',30.5,33.6); o('grave',32.4,33.2); o('deadtree',34.5,32.5)
for x in range(22,29): o('fence_x',x+0.5,8.0)
for y in range(22,29): o('fence_y',35.0,y+0.5)
o('shrine',27.8,27.6)
npcs=[dict(id='elder',name='Староста Эдрик',x=21.5,y=18.6,model='npc_elder'),
      dict(id='smith',name='Кузнец Горан',x=27.0,y=15.4,model='npc_smith'),
      dict(id='merchant',name='Торговка Мира',x=14.6,y=25.2,model='npc_merchant'),
      dict(id='trainer',name='Наставник Элвин',x=28.8,y=26.4,model='npc_trainer')]
json.dump(dict(w=TW,h=TH,rows=trow,objects=obj,npcs=npcs,start=[20.5,31.5],name='Деревня Тихий Брод'),open(f'{OUT}/village.json','w'))
print('\n'.join(trow))
