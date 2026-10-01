"""Enemy + NPC models and their clips."""
import numpy as np
from sdf import Scene, rot, norm
from rig import Body, frame_from
import anim as A
import gear

# ----------------------------------------------------------- skeleton parts
def skull(scn, J, eye='eye_red', mat='bone'):
    Rh=J['Rh']; hd=J['head']
    scn.ell(hd, Rh, (0.095,0.11,0.105), mat)
    scn.box(hd+Rh@[0,0.06,-0.085], Rh, (0.055,0.04,0.025), 0.02, mat)            # jaw
    for sg in (1,-1):
        scn.sphere(hd+Rh@[sg*0.037,0.085,0.005], 0.028, 'black')
        scn.sphere(hd+Rh@[sg*0.037,0.098,0.005], 0.014, eye)
    scn.box(hd+Rh@[0,0.105,-0.035], Rh, (0.012,0.01,0.015), 0.004, 'black')

def ribcage(scn, J, mat='bone'):
    Rc=J['Rc']; ch=J['chest']; pel=J['pel']
    # spine
    scn.cone(pel, J['neck'], 0.022, 0.018, 'oldbone')
    for lv,(z,rx,ry) in enumerate(((-0.05,0.14,0.10),(-0.13,0.15,0.105),(-0.21,0.13,0.095))):
        pts=[]
        for k in range(7):
            a=np.pi*(-0.95+ k*0.95/3)  # half ring front, both sides
            pts.append(ch+Rc@[rx*np.sin(a), ry*np.cos(a)*0.9+0.0, z])
        for i in range(6):
            scn.cone(pts[i],pts[i+1],0.016,0.016,mat)
    scn.ell(ch+Rc@[0,-0.02,-0.02], Rc, (0.17,0.07,0.035), mat)      # collar/shoulder girdle
    scn.ell(pel+Rc@[0,0,0.0], J['Rp'], (0.13,0.08,0.06), mat)      # pelvis

def bone_limbs(scn, J, mat='bone', r=0.028):
    for s in 'RL':
        scn.cone(J['sh'+s], J['el'+s], r, r*0.85, mat)
        scn.sphere(J['el'+s], r*1.25, mat)
        scn.cone(J['el'+s], J['hd'+s], r*0.85, r*0.7, mat)
        fa=norm(J['hd'+s]-J['el'+s])
        scn.ell(J['hd'+s]+fa*0.03, frame_from(fa,J['Rc'][:,0]), (0.035,0.02,0.05), mat)
        scn.cone(J['hip'+s], J['kn'+s], r*1.15, r, mat)
        scn.sphere(J['kn'+s], r*1.35, mat)
        scn.cone(J['kn'+s], J['an'+s], r, r*0.8, mat)
        scn.ell(J['an'+s]+J['R0']@[0,0.05,-0.04], J['R0'], (0.04,0.09,0.025), mat)
        scn.sphere(J['sh'+s], r*1.4, mat)

def rusty_blade(scn, J):
    h=J['hdR']; M=frame_from(J['wdir'],J['wup']); z=M[:,2]
    scn.cone(h-z*0.06, h+z*0.06, 0.016,0.016,'darkleather')
    scn.box(h+z*0.07, M, (0.08,0.018,0.014),0.006,'iron_rust')
    scn.box(h+z*0.40, M, (0.032,0.006,0.33),0.004,'iron_rust')

def round_shield(scn, J, mat='wood'):
    el=J['elL']; hd=J['hdL']; c=(el+hd)/2
    out = norm(np.cross(norm(hd-el), J['Rc'][:,2]));
    if out@J['Rc'][:,0]>0: out=-out
    out=norm(out*0.7+J['Rc'][:,1]*0.7)
    M=frame_from(out, J['Rc'][:,2])
    scn.ell(c+out*0.05, M, (0.21,0.21,0.03), mat)
    scn.ell(c+out*0.055, M, (0.225,0.225,0.018), 'iron_rust')
    scn.sphere(c+out*0.08, 0.04, 'iron_rust')

def skeleton_warrior(scn, J, p):
    skull(scn,J,'eye_red'); ribcage(scn,J); bone_limbs(scn,J)
    Rh=J['Rh']; hd=J['head']
    scn.ell(hd+Rh@[0,-0.01,0.04], Rh, (0.11,0.125,0.085), 'iron_rust')            # rusted cap
    scn.box(J['pel']+J['Rp']@[0,0.10,-0.12], J['Rp']@rot(0,-0.1,0), (0.09,0.01,0.14),0.01,'cloth_brown')
    scn.cone(J['pel']+J['Rp']@[0,0,0.04], J['pel']+J['Rp']@[0,0,0.04]+[0,0,0.001], 0.14,0.14,'darkleather')
    rusty_blade(scn,J); round_shield(scn,J)

def skeleton_archer(scn, J, p):
    skull(scn,J,'eye_blue'); ribcage(scn,J,'oldbone'); bone_limbs(scn,J,'oldbone')
    Rh=J['Rh']; hd=J['head']; Rc=J['Rc']
    scn.ell(hd+Rh@[0,-0.03,0.02], Rh, (0.13,0.14,0.14), 'cloth_green')
    scn.ell(J['chest']+Rc@[0,-0.02,-0.02], Rc, (0.20,0.12,0.06), 'cloth_green')   # mantle
    q0=J['chest']+Rc@[0.08,-0.13,0.05]; q1=J['chest']+Rc@[-0.06,-0.14,-0.35]
    scn.cone(q0,q1,0.05,0.045,'leather')
    for k in range(3): scn.cone(q0+Rc@[0.02*k-0.02,0,0], q0+Rc@[0.02*k-0.02+0.03,0,0.10],0.008,0.008,'cloth_white')
    gear.bow(scn,J,p.get('draw',0),layer=0)

def skeleton_mage(scn, J, p):
    skull(scn,J,'eye_green','oldbone'); bone_limbs(scn,J,'oldbone',0.024)
    Rc=J['Rc']; Rh=J['Rh']; hd=J['head']
    scn.ell(J['chest']-Rc@[0,0,0.12], Rc, (0.17,0.12,0.2), 'cloth_purple')
    scn.cone(J['pel']+J['Rp']@[0,0,0.1], J['R0']@[0,0,0.05]+J['pel']*[1,1,0]+[0,0,0.02], 0.15, 0.30, 'cloth_purple')
    scn.cone(J['pel']+J['Rp']@[0,0,0.08], J['pel']+J['Rp']@[0,0,0.12], 0.16,0.16,'gold')
    scn.ell(hd+Rh@[0,-0.03,0.03], Rh, (0.13,0.14,0.15), 'cloth_purple')
    scn.cone(hd+Rh@[0,-0.05,0.12], hd+Rh@[0,-0.12,0.30], 0.07,0.01,'cloth_purple')
    for s in 'RL':
        scn.cone(J['sh'+s],J['el'+s],0.06,0.075,'cloth_purple')
    gear.staff(scn,J,'eye_green',layer=0)

def elite_guard(scn, J, p):
    skull(scn,J,'eye_red','oldbone'); bone_limbs(scn,J,'oldbone',0.034)
    Rc=J['Rc']; Rh=J['Rh']; hd=J['head']; Rp=J['Rp']
    scn.ell(J['chest']-Rc@[0,0,0.12], Rc, (0.22,0.16,0.22), 'iron_rust')
    scn.ell(J['chest']-Rc@[0,-0.03,0.10], Rc, (0.15,0.15,0.15), 'darksteel')
    scn.cone(J['pel']+Rp@[0,0,0.05], J['pel']+Rp@[0,0,-0.26], 0.18,0.21,'darksteel')
    scn.ell(hd+Rh@[0,-0.01,0.03], Rh, (0.12,0.13,0.12), 'darksteel')
    scn.box(hd+Rh@[0,0.02,0.10], Rh, (0.015,0.12,0.05),0.01,'iron_rust')
    for sg in (1,-1):
        a=hd+Rh@[sg*0.1,0,0.05]; b=hd+Rh@[sg*0.24,0.05,0.12]; c=hd+Rh@[sg*0.28,0.12,0.30]
        scn.cone(a,b,0.04,0.025,'black'); scn.cone(b,c,0.025,0.006,'black')
        sh=J['sh'+('R' if sg>0 else 'L')]
        scn.ell(sh+Rc@[sg*0.04,0,0.04], Rc@rot(0,0,sg*0.4), (0.15,0.15,0.10),'iron_rust')
        scn.cone(sh+Rc@[sg*0.08,0,0.1], sh+Rc@[sg*0.13,0,0.26],0.03,0.004,'darksteel')
    for s in 'RL':
        scn.cone(J['el'+s],J['hd'+s],0.055,0.05,'iron_rust')
        scn.cone(J['kn'+s],J['an'+s],0.06,0.05,'iron_rust')
    # great axe
    h=J['hdR']; M=frame_from(J['wdir'],J['wup']); z=M[:,2]; y=M[:,1]
    scn.cone(h-z*0.3, h+z*0.95, 0.026,0.024,'darkwood')
    scn.box(h+z*0.86+y*0.12, M, (0.016,0.15,0.13),0.01,'darksteel')
    scn.box(h+z*0.86+y*0.26, M, (0.012,0.035,0.22),0.01,'iron_rust')

def ghoul(scn, J, p):
    Rc=J['Rc']; Rh=J['Rh']; hd=J['head']; Rp=J['Rp']
    scn.ell(J['chest']-Rc@[0,0,0.12], Rc, (0.16,0.12,0.2), 'flesh')
    scn.ell(J['mid'], Rc, (0.12,0.09,0.14), 'flesh')
    for k in range(3): scn.cone(J['chest']+Rc@[-0.1,0.10,-0.08-k*0.06], J['chest']+Rc@[0.1,0.10,-0.08-k*0.06], 0.013,0.013,'oldbone')
    scn.box(J['pel']+Rp@[0,0.02,-0.08], Rp, (0.14,0.11,0.12),0.03,'cloth_brown')
    scn.ell(hd, Rh, (0.09,0.12,0.10), 'flesh')
    scn.box(hd+Rh@[0,0.09,-0.06], Rh, (0.06,0.05,0.03), 0.02, 'flesh')
    for sg in (1,-1):
        scn.sphere(hd+Rh@[sg*0.04,0.10,0.02],0.022,'eye_green')
        scn.cone(hd+Rh@[sg*0.02,0.13,-0.07], hd+Rh@[sg*0.02,0.14,-0.11],0.01,0.002,'bone')
    for s in 'RL':
        scn.sphere(J['sh'+s],0.06,'flesh')
        scn.cone(J['sh'+s],J['el'+s],0.05,0.04,'flesh'); scn.cone(J['el'+s],J['hd'+s],0.04,0.035,'flesh')
        fa=norm(J['hd'+s]-J['el'+s]); M=frame_from(fa,Rc[:,0])
        for k in (-1,0,1):
            scn.cone(J['hd'+s], J['hd'+s]+fa*0.13+M[:,0]*0.03*k+M[:,1]*0.03, 0.012,0.002,'bone')
        scn.cone(J['hip'+s],J['kn'+s],0.06,0.045,'flesh'); scn.cone(J['kn'+s],J['an'+s],0.045,0.03,'flesh')
        scn.ell(J['an'+s]+J['R0']@[0,0.05,-0.04],J['R0'],(0.04,0.09,0.03),'flesh')

# ----------------------------------------------------------- boss
def executioner(scn, J, p):
    Rc=J['Rc']; Rh=J['Rh']; hd=J['head']; Rp=J['Rp']; R0=J['R0']
    s=1.0
    scn.ell(J['chest']-Rc@[0,0,0.14], Rc, (0.30,0.21,0.28), 'flesh')
    scn.ell(J['mid']+Rc@[0,0.03,-0.04], Rc, (0.27,0.22,0.22), 'flesh')
    for sg in (1,-1):
        a=J['chest']+Rc@[sg*0.22,0.02,0.02]; b=J['pel']+Rp@[-sg*0.18,0.02,0.1]
        scn.cone(a+Rc@[0,0.19,0],b+Rp@[0,0.21,0],0.028,0.028,'darkleather')
        scn.cone(a+Rc@[0,-0.19,0],b+Rp@[0,-0.21,0],0.028,0.028,'darkleather')
    scn.sphere(J['chest']+Rc@[0,0.2,-0.14],0.04,'iron_rust')
    scn.box(J['pel']+Rp@[0,0,0.08], Rp, (0.28,0.22,0.06),0.03,'darkleather')
    scn.cone(J['pel']+Rp@[0,0,0.05], J['pel']+Rp@[0,0,-0.35], 0.27,0.30,'black')
    scn.box(J['pel']+Rp@[0,0.24,-0.25], Rp@rot(0,-0.1,0), (0.16,0.015,0.32),0.01,'cloth_red')
    # iron collar + chain
    scn.cone(J['neck']-Rc@[0,0,0.03], J['neck'], 0.16,0.15,'iron_rust')
    for k in range(5):
        c=J['chest']+Rc@[0.18-k*0.09,0.22,-0.05-0.05*np.sin(k*0.8)]
        scn.ell(c, Rc@rot(0,0,k*1.57), (0.03,0.012,0.045),'darksteel')
    # hood
    scn.ell(hd+Rh@[0,-0.01,0.02], Rh, (0.16,0.17,0.18), 'black')
    scn.cone(hd+Rh@[0,-0.03,0.14], hd+Rh@[0,-0.07,0.34], 0.12,0.01,'black')
    scn.cone(hd+Rh@[0,0,-0.1], J['chest']+Rc@[0,-0.02,0.02], 0.15,0.26,'black')
    for sg in (1,-1):
        scn.box(hd+Rh@[sg*0.055,0.155,0.02], Rh, (0.03,0.01,0.013),0.006,'purple_glow')
    for sd in 'RL':
        sg = 1 if sd=='R' else -1
        scn.sphere(J['sh'+sd], 0.14, 'flesh')
        scn.ell(J['sh'+sd]+Rc@[sg*0.03,0,0.06], Rc@rot(0,0,sg*0.4), (0.17,0.17,0.10), 'darksteel')
        for k in range(3):
            scn.cone(J['sh'+sd]+Rc@[sg*(0.03+k*0.05),0,0.12],J['sh'+sd]+Rc@[sg*(0.05+k*0.06),0,0.30],0.035,0.004,'iron_rust')
        scn.cone(J['sh'+sd],J['el'+sd],0.12,0.09,'flesh')
        scn.cone(J['el'+sd],J['hd'+sd],0.10,0.085,'darkleather')
        scn.sphere(J['hd'+sd],0.09,'darkleather')
        scn.cone(J['hip'+sd],J['kn'+sd],0.15,0.11,'black')
        scn.cone(J['kn'+sd],J['an'+sd],0.11,0.09,'darkleather')
        scn.ell(J['an'+sd]+R0@[0,0.07,-0.04],R0,(0.10,0.17,0.08),'iron_rust')
    # abyssal great axe
    h=J['hdR']; M=frame_from(J['wdir'],J['wup']); z=M[:,2]; y=M[:,1]
    scn.cone(h-z*0.35, h+z*1.25, 0.04,0.035,'darkwood')
    scn.sphere(h-z*0.38, 0.06, 'iron_rust')
    scn.ell(h+z*1.08+y*0.18, M, (0.025,0.26,0.28), 'darksteel')
    scn.ell(h+z*1.08+y*0.37, M, (0.02,0.08,0.34), 'purple_glow')
    scn.box(h+z*1.08-y*0.1, M, (0.03,0.08,0.05),0.02,'iron_rust')

# ----------------------------------------------------------- NPC humans
def human_head(scn, J, hair='hair', beard=None, hat=None, hatmat=None):
    Rh=J['Rh']; hd=J['head']
    scn.ell(hd, Rh, (0.095,0.105,0.12), 'skin')
    scn.sphere(hd+Rh@[0,0.10,-0.01],0.022,'skin')
    for sg in (1,-1): scn.sphere(hd+Rh@[sg*0.035,0.09,0.02],0.011,'black')
    scn.ell(hd+Rh@[0,-0.015,0.04], Rh, (0.10,0.105,0.10), hair)
    if beard: scn.ell(hd+Rh@[0,0.06,-0.08], Rh, (0.075,0.06,0.10), beard)
    if hat=='wizard':
        scn.ell(hd+Rh@[0,0,0.07],Rh,(0.18,0.18,0.025),hatmat); scn.cone(hd+Rh@[0,0,0.07],hd+Rh@[0,-0.08,0.40],0.10,0.01,hatmat)
    if hat=='hood':
        scn.ell(hd+Rh@[0,-0.02,0.02],Rh,(0.12,0.12,0.14),hatmat)

def robe(scn, J, mat, trim='gold'):
    Rc=J['Rc']; Rp=J['Rp']
    scn.ell(J['chest']-Rc@[0,0,0.14], Rc, (0.18,0.13,0.22), mat)
    scn.cone(J['pel']+Rp@[0,0,0.12], J['pel']*[1,1,0]+[0,0,0.03], 0.17, 0.30, mat)
    scn.cone(J['pel']+Rp@[0,0,0.06], J['pel']+Rp@[0,0,0.10], 0.18,0.18,trim)
    for s in 'RL':
        scn.cone(J['sh'+s],J['el'+s],0.06,0.07,mat); scn.cone(J['el'+s],J['hd'+s],0.07,0.075,mat)
        scn.sphere(J['hd'+s],0.04,'skin')

def elder(scn,J,p):
    robe(scn,J,'cloth_brown','cloth_red'); human_head(scn,J,'beard_grey','beard_grey')
    h=J['hdR']; z=J['sdir']; scn.cone(h-z*0.9,h+z*0.5,0.022,0.028,'wood'); scn.sphere(h+z*0.52,0.04,'wood')

def smith(scn,J,p):
    Rc=J['Rc']; Rp=J['Rp']
    scn.ell(J['chest']-Rc@[0,0,0.13], Rc, (0.22,0.15,0.22), 'skin')
    scn.box(J['chest']+Rc@[0,0.12,-0.30], Rc, (0.17,0.03,0.33),0.03,'leather')
    scn.box(J['pel'], Rp, (0.18,0.13,0.08),0.03,'darkleather')
    human_head(scn,J,'hair','hair')
    for s in 'RL':
        scn.sphere(J['sh'+s],0.075,'skin'); scn.cone(J['sh'+s],J['el'+s],0.07,0.06,'skin'); scn.cone(J['el'+s],J['hd'+s],0.06,0.05,'skin')
        scn.sphere(J['hd'+s],0.045,'darkleather')
        scn.cone(J['hip'+s],J['kn'+s],0.08,0.065,'cloth_brown'); scn.cone(J['kn'+s],J['an'+s],0.065,0.055,'darkleather')
        scn.ell(J['an'+s]+J['R0']@[0,0.05,-0.035],J['R0'],(0.06,0.11,0.05),'darkleather')
    h=J['hdR']; M=frame_from(J['wdir'],J['wup']); z=M[:,2]
    scn.cone(h-z*0.08,h+z*0.35,0.02,0.02,'wood'); scn.box(h+z*0.38,M,(0.04,0.10,0.045),0.01,'darksteel')

def merchant(scn,J,p):
    robe(scn,J,'cloth_green','gold'); human_head(scn,J,'hair',None,'hood','cloth_red')
    Rc=J['Rc']; scn.ell(J['pel']+Rc@[0.2,0.05,-0.05],Rc,(0.07,0.06,0.09),'leather')
    scn.ell(J['chest']+Rc@[0,0.05,-0.02],Rc,(0.19,0.11,0.07),'cloth_red')

def trainer(scn,J,p):
    robe(scn,J,'cloth_blue','gold'); human_head(scn,J,'beard_grey','beard_grey','wizard','cloth_blue')
    h=J['hdR']; z=J['sdir']; scn.cone(h-z*0.9,h+z*0.55,0.02,0.025,'darkwood'); scn.sphere(h+z*0.6,0.05,'ice_glow')

# ----------------------------------------------------------- clips
R = A.READY
MAGE = A.with_(R, hR=(0.26,0.16,-0.34), wdir=(0,0.2,1))
NPC = A.with_(R, hR=(0.24,0.14,-0.38), hL=(-0.24,0.10,-0.42), wdir=(0.1,0.5,0.8), lean=0.02, cape=0.1)
GH = A.with_(R, hR=(0.28,0.30,-0.40), hL=(-0.28,0.30,-0.40), lean=0.35, head_pitch=-0.35)
BIG = A.with_(R, hR=(0.12,0.30,-0.35), wdir=(-0.15,0.55,0.82))
BIG = A.two_hand(dict(BIG))

def claw(t):
    keys=[(0,dict(hR=GH['hR'],hL=GH['hL'],lean=0.35,twist=0.0)),
          (0.35,dict(hR=(0.35,0.05,0.10),hL=(-0.35,0.05,0.10),lean=0.15,twist=0.0)),
          (0.55,dict(hR=(0.05,0.55,-0.30),hL=(-0.30,0.25,-0.1),lean=0.6,twist=0.35)),
          (0.75,dict(hR=(0.25,0.30,-0.2),hL=(-0.05,0.55,-0.30),lean=0.6,twist=-0.35)),
          (1.0,dict(hR=GH['hR'],hL=GH['hL'],lean=0.35,twist=0.0))]
    return A.with_(GH, **A.keyed(keys,t))

def slam(t):
    """boss: raise axe high, hold (telegraph), smash"""
    base={'hR':BIG['hR'],'wdir':BIG['wdir'],'lean':0.08,'root':(0,0,0),'fL':R['fL']}
    keys=[(0,base),(0.35,dict(hR=(0.05,0.0,0.40),wdir=(0,-0.35,0.94),lean=-0.2,root=(0,0,0.05),fL=(-0.13,0.0,0))),
          (0.60,dict(hR=(0.05,-0.02,0.42),wdir=(0,-0.45,0.9),lean=-0.25,root=(0,0,0.06),fL=(-0.13,0.0,0))),
          (0.75,dict(hR=(0.03,0.52,-0.35),wdir=(0,0.8,-0.6),lean=0.5,root=(0,0.1,-0.15),fL=(-0.13,0.32,0))),
          (1.0,base)]
    return A.two_hand(A.with_(BIG, **A.keyed(keys,t)))

def roar(t):
    k=np.sin(np.pi*t)
    return A.with_(BIG, hR=(0.45,0.15,0.05*k-0.3*(1-k)), hL=(-0.45,0.15,0.1*k-0.3*(1-k)), lean=-0.25*k, head_pitch=0.35*k, wdir=(0.3,0.2,0.93))

def talk(t):
    k=np.sin(2*np.pi*t)
    return A.with_(NPC, hL=(-0.20,0.32,-0.12+0.05*k), head_yaw=0.1*k, lean=0.05)

MODELS = {
 # name: (outfit, body params, scale_ppm, dirs, clips{name:(frames,loop,fn)})
 'skel_warrior': (skeleton_warrior, dict(hip=0.92,spine=0.42,shw=0.19), [
     ('idle',4,True,lambda t:A.idle(t,R,1.5)),('walk',8,True,lambda t:A.gait(t,R,False)),
     ('attack',7,False,lambda t:A.slash1(t,R)),('hit',3,False,lambda t:A.hit(t,R)),('death',8,False,lambda t:A.death(t,R))]),
 'skel_archer': (skeleton_archer, dict(hip=0.92,spine=0.42,shw=0.19), [
     ('idle',4,True,lambda t:A.idle(t,R,1.5)),('walk',8,True,lambda t:A.gait(t,R,False)),
     ('attack',8,False,lambda t:(A.bow_draw(min(t/0.62,1),R) if t<0.62 else A.bow_release((t-0.62)/0.38,R))),
     ('hit',3,False,lambda t:A.hit(t,R)),('death',8,False,lambda t:A.death(t,R))]),
 'skel_mage': (skeleton_mage, dict(hip=0.92,spine=0.42,shw=0.18), [
     ('idle',4,True,lambda t:A.idle(t,MAGE,1.5)),('walk',8,True,lambda t:A.gait(t,MAGE,False,stride=0.18)),
     ('attack',6,False,lambda t:A.cast(t,MAGE)),('hit',3,False,lambda t:A.hit(t,MAGE)),('death',8,False,lambda t:A.death(t,MAGE))]),
 'ghoul': (ghoul, dict(hip=0.82,spine=0.40,shw=0.20,ua=0.34,fa=0.34), [
     ('idle',4,True,lambda t:A.idle(t,GH,2)),('walk',8,True,lambda t:A.gait(t,GH,True,arm_free=(1,1),hunch=0.25)),
     ('attack',6,False,claw),('hit',3,False,lambda t:A.hit(t,GH)),('death',8,False,lambda t:A.death(t,GH))]),
 'elite': (elite_guard, dict(hip=1.12,spine=0.52,shw=0.25,ua=0.36,fa=0.33,th=0.54,sh=0.52,head=0.13), [
     ('idle',4,True,lambda t:A.idle(t,BIG,1.2)),('walk',8,True,lambda t:A.two_hand(A.gait(t,BIG,False))),
     ('attack',9,False,lambda t:A.chop2(t,BIG)),('attack2',8,False,lambda t:A.sweep2(t,BIG)),
     ('hit',3,False,lambda t:A.hit(t,BIG)),('death',8,False,lambda t:A.death(t,BIG))]),
 'boss': (executioner, dict(hip=1.35,spine=0.70,shw=0.36,ua=0.46,fa=0.42,th=0.64,sh=0.62,hipw=0.17,neck=0.08,head=0.15), [
     ('idle',4,True,lambda t:A.idle(t,BIG,1.2)),('walk',8,True,lambda t:A.two_hand(A.gait(t,BIG,False,stride=0.38))),
     ('attack',9,False,lambda t:A.chop2(t,BIG)),('attack2',8,False,lambda t:A.sweep2(t,BIG)),
     ('slam',12,False,slam),('roar',8,False,roar),('hit',3,False,lambda t:A.hit(t,BIG)),('death',10,False,lambda t:A.death(t,BIG))]),
 'npc_elder': (elder, dict(), [('idle',6,True,lambda t:A.idle(t,NPC,1)),('talk',6,True,talk)]),
 'npc_smith': (smith, dict(shw=0.25), [('idle',6,True,lambda t:A.idle(t,NPC,1)),('talk',6,True,talk)]),
 'npc_merchant': (merchant, dict(), [('idle',6,True,lambda t:A.idle(t,NPC,1)),('talk',6,True,talk)]),
 'npc_trainer': (trainer, dict(), [('idle',6,True,lambda t:A.idle(t,NPC,1)),('talk',6,True,talk)]),
}

# ----------------------------------------------------------- quadruped cave beast
def beast_scene(p):
    """p: yaw, t, mode"""
    scn=Scene(); R0=rot(p['yaw'])
    t=p.get('t',0); mode=p.get('mode','walk')
    lift=p.get('lift',0); lunge=p.get('lunge',0); jaw=p.get('jaw',0.1); fall=p.get('fall',0); head_dn=p.get('head',0)
    body_h=0.62+p.get('bob',0)-fall*0.45
    roll=fall*1.3
    Rb=R0@rot(0,-p.get('pitch',0),roll)
    c=np.array([0,lunge*0.35,body_h])
    C=R0@c
    scn.ell(C, Rb, (0.30,0.55,0.28), 'fur')
    scn.ell(C+Rb@[0,0.25,0.08], Rb, (0.32,0.30,0.30), 'fur_dark')
    for k in range(4): scn.cone(C+Rb@[0,0.35-k*0.18,0.24], C+Rb@[0,0.30-k*0.18,0.42], 0.05,0.005,'bone')
    # head
    Rhd=Rb@rot(0,-head_dn,0)
    Hc=C+Rb@[0,0.62,0.10]
    scn.ell(Hc, Rhd, (0.17,0.22,0.16), 'fur_dark')
    scn.ell(Hc+Rhd@[0,0.20,-0.03], Rhd, (0.10,0.14,0.08), 'flesh')
    Rj=Rhd@rot(0,-jaw,0)
    scn.ell(Hc+Rhd@[0,0.06,-0.08]+Rj@[0,0.14,-0.02], Rj, (0.09,0.14,0.04),'flesh')
    for sg in (1,-1):
        scn.sphere(Hc+Rhd@[sg*0.09,0.15,0.07],0.028,'eye_red')
        scn.cone(Hc+Rhd@[sg*0.12,-0.02,0.10],Hc+Rhd@[sg*0.30,-0.18,0.30],0.05,0.008,'bone')
        scn.cone(Hc+Rhd@[sg*0.06,0.30,-0.07],Hc+Rhd@[sg*0.07,0.34,0.04],0.02,0.003,'bone')
    # tail
    scn.cone(C+Rb@[0,-0.52,0.05], C+Rb@[0,-0.9,0.0+0.1*np.sin(t*6.28)], 0.07,0.02,'fur')
    # legs
    L1,L2=0.34,0.36
    for i,(lx,ly,ph) in enumerate(((0.2,0.35,0),(-0.2,0.35,np.pi),(0.2,-0.35,np.pi),(-0.2,-0.35,0))):
        hip=C+Rb@[lx*1.1,ly,-0.12]
        if mode in ('walk',):
            s=np.sin(2*np.pi*t+ph); up=0.12*max(0,np.cos(2*np.pi*t+ph))
            foot=R0@np.array([lx*1.2, ly+lunge*0.35+0.22*s, up+0.05])
        else:
            foot=R0@np.array([lx*1.25+fall*0.3, ly+lunge*(0.5 if ly>0 else 0.1), 0.05+lift*(ly>0)])
            foot=foot+ [0,0,0]
        foot[2]=max(foot[2], 0.05)
        pole=R0@np.array([0,-1 if ly>0 else 1,0])
        from rig import ik2
        kn,ft=ik2(hip,foot,L1,L2,pole)
        scn.cone(hip,kn,0.10,0.07,'fur'); scn.cone(kn,ft,0.07,0.05,'fur_dark')
        scn.ell(ft+R0@[0,0.05,-0.02],R0,(0.07,0.10,0.04),'fur_dark')
        for k in (-1,0,1): scn.cone(ft+R0@[k*0.035,0.12,-0.02],ft+R0@[k*0.04,0.18,-0.04],0.012,0.002,'bone')
    return scn

def beast_clip(name, t):
    if name=='idle': return dict(mode='stand', bob=0.015*np.sin(6.28*t), jaw=0.08, t=t)
    if name=='walk': return dict(mode='walk', t=t, bob=0.03*abs(np.sin(6.28*t)))
    if name=='attack':
        k=A.ss(t/0.45)-A.ss((t-0.6)/0.4)
        return dict(mode='stand', lunge=k, jaw=0.1+0.6*np.sin(np.pi*min(t/0.6,1)), head=0.3*k, pitch=0.12*k, lift=0.1*k, t=t)
    if name=='hit': return dict(mode='stand', pitch=-0.15*np.sin(np.pi*t), jaw=0.4, t=t)
    if name=='death': return dict(mode='stand', fall=A.ss(t), jaw=0.5, head=-0.2*t, t=t)
BEAST_CLIPS=[('idle',4,True),('walk',8,True),('attack',7,False),('hit',3,False),('death',7,False)]
