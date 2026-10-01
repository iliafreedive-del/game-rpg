import numpy as np
from sdf import Scene, rot, norm
from rig import Body, frame_from
import gear

BODY = Body()

def outfit_knight(scn, J, pose):
    Rc, Rp, R0 = J['Rc'], J['Rp'], J['R0']
    pel, chest, mid = J['pel'], J['chest'], J['mid']
    # torso: layered breastplate over mail
    scn.ell(chest-Rc@[0,0,0.12], Rc, (0.215,0.155,0.22), 'steel')
    scn.ell(chest-Rc@[0,-0.035,0.11], Rc, (0.14,0.14,0.15), 'darksteel')
    scn.box(chest-Rc@[0,-0.15,0.08], Rc, (0.012,0.02,0.12), 0.008, 'gold')          # sternum ridge
    scn.ell(mid-Rc@[0,0,0.04], Rc, (0.18,0.135,0.15), 'darksteel')
    scn.box(pel+Rp@[0,0,0.07], Rp, (0.19,0.14,0.04), 0.025, 'leather')             # belt
    scn.box(pel+Rp@[0,0.14,0.07], Rp, (0.04,0.012,0.035), 0.006, 'gold')
    # mail skirt + tabard
    sw = pose.get('tabard',0)
    scn.cone(pel+Rp@[0,0,0.02], pel+Rp@[0,0,-0.24], 0.19, 0.20, 'darksteel')
    scn.box(pel+Rp@[0,0.13,-0.20], Rp@rot(0,-0.10+sw,0), (0.11,0.014,0.24), 0.012, 'cloth_red')
    scn.box(pel+Rp@[0,0.143,-0.12], Rp@rot(0,-0.10+sw,0), (0.035,0.006,0.10), 0.004, 'gold')
    # cape
    cape = pose.get('cape',0.12)
    Mc = Rc@rot(0, cape, 0)
    top = chest + Rc@[0,-0.15,-0.01]
    scn.box(top + Mc@[0,-0.02,-0.40], Mc, (0.24,0.016,0.42), 0.02, 'cloth_red')
    scn.cone(top+Rc@[-0.18,0.02,0.02], top+Rc@[0.18,0.02,0.02], 0.035, 0.035, 'darkleather')
    # head: great helm with swept horns
    scn.cone(chest, J['neck']+Rc@[0,0,0.02], 0.08, 0.07, 'darksteel')
    Rh = J['Rh']; hd = J['head']
    scn.ell(hd, Rh, (0.13,0.14,0.15), 'steel')
    scn.box(hd+Rh@[0,0.105,-0.03], Rh, (0.09,0.045,0.085), 0.035, 'steel')
    scn.box(hd+Rh@[0,0.137,0.015], Rh, (0.075,0.02,0.013), 0.004, 'black')
    scn.box(hd+Rh@[0,0.14,-0.05], Rh, (0.008,0.012,0.05), 0.003, 'gold')
    scn.ell(hd+Rh@[0,-0.02,-0.07], Rh, (0.14,0.14,0.07), 'darksteel')
    for sg in (1,-1):
        a = hd+Rh@[sg*0.11,0.0,0.06]; b = hd+Rh@[sg*0.22,-0.04,0.13]; c = hd+Rh@[sg*0.25,-0.10,0.24]
        scn.cone(a,b,0.035,0.024,'bone'); scn.cone(b,c,0.024,0.006,'bone')
    # shoulders & arms
    for s,sg in (('R',1),('L',-1)):
        sh, el, hdn = J['sh'+s], J['el'+s], J['hd'+s]
        scn.ell(sh+Rc@[sg*0.035,0,0.04], Rc@rot(0,0,sg*0.35), (0.14,0.14,0.10), 'steel')
        scn.ell(sh+Rc@[sg*0.07,0,0.01], Rc@rot(0,0,sg*0.5), (0.115,0.125,0.07), 'darksteel')
        scn.ell(sh+Rc@[sg*0.02,0,0.10], Rc@rot(0,0,sg*0.2), (0.07,0.10,0.035), 'gold')
        scn.cone(sh, el, 0.07, 0.06, 'darksteel')
        scn.sphere(el, 0.066, 'steel')
        scn.cone(el, hdn, 0.064, 0.052, 'steel')
        fa = norm(hdn-el)
        scn.ell(el+fa*0.10, frame_from(fa, Rc[:,0]), (0.07,0.07,0.06), 'darkleather')  # cuff
        scn.ell(hdn+fa*0.02, frame_from(fa, Rc[:,0]), (0.062,0.056,0.075), 'darksteel')
        # legs
        hp, kn, an = J['hip'+s], J['kn'+s], J['an'+s]
        scn.cone(hp, kn, 0.10, 0.072, 'darkleather')
        th = norm(kn-hp)
        scn.ell((hp+kn)/2+R0@[0,0.035,0], frame_from(th, R0[:,0]), (0.088,0.07,0.21), 'steel')
        scn.sphere(kn+R0@[0,0.03,0], 0.07, 'steel')
        scn.cone(kn, an, 0.07, 0.055, 'steel')
        scn.ell(an+R0@[0,0.055,-0.035], R0, (0.07,0.13,0.06), 'leather')
        scn.ell(an+R0@[0,0.0,0.03], R0, (0.075,0.075,0.05), 'darkleather')

def hero_scene(pose, weapon='sword', shield=False):
    J = BODY.solve(pose)
    scn = Scene()
    outfit_knight(scn, J, pose)
    if weapon=='sword': gear.sword(scn, J)
    elif weapon=='greatsword': gear.greatsword(scn, J)
    elif weapon=='axe': gear.axe(scn, J)
    elif weapon=='staff': gear.staff(scn, J)
    elif weapon=='bow': gear.bow(scn, J, pose.get('draw',0))
    if shield: gear.kite_shield(scn, J)
    return scn, J
