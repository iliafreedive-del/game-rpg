"""Class outfits beyond the knight: «Вороний страж» (archer) and «Звездочтец Бездны» (mage).
Local frames: x = right, y = forward (face), z = up."""
import numpy as np
from sdf import rot, norm
from rig import frame_from



def _limbs(scn, J, R0, Rc, arm_mat, cuff_mat, glove_mat, leg_mat, boot_mat, bell=False):
    for s, sg in (('R', 1), ('L', -1)):
        sh, el, hdn = J['sh' + s], J['el' + s], J['hd' + s]
        fa = norm(hdn - el)
        if bell:   # wide astrologer sleeves flaring toward the wrist
            scn.cone(sh, el, 0.075, 0.08, arm_mat)
            scn.cone(el, hdn - fa * 0.03, 0.08, 0.115, arm_mat)
            scn.cone(hdn - fa * 0.07, hdn - fa * 0.02, 0.118, 0.118, cuff_mat)
            scn.sphere(hdn + fa * 0.01, 0.038, glove_mat)
        else:
            scn.cone(sh, el, 0.062, 0.055, arm_mat)
            scn.sphere(el, 0.056, arm_mat)
            scn.cone(el, hdn, 0.056, 0.05, cuff_mat)       # leather bracer
            scn.ell(hdn + fa * 0.02, frame_from(fa, Rc[:, 0]), (0.055, 0.05, 0.07), glove_mat)
        hp, kn, an = J['hip' + s], J['kn' + s], J['an' + s]
        scn.cone(hp, kn, 0.092, 0.068, leg_mat)
        scn.cone(kn, an, 0.066, 0.054, leg_mat)
        scn.cone(kn - norm(kn - hp) * 0.02, an + np.array([0, 0, 0.04]), 0.07, 0.06, boot_mat)
        scn.ell(an + R0 @ [0, 0.055, -0.035], R0, (0.065, 0.125, 0.055), boot_mat)


def outfit_archer(scn, J, pose):
    """«Вороний страж»: raven-feather mantle, porcelain beak mask, teal hood, glowing eyes."""
    Rc, Rp, R0 = J['Rc'], J['Rp'], J['R0']
    pel, chest, mid = J['pel'], J['chest'], J['mid']
    # torso: fitted dark leather with a teal sash across
    scn.ell(chest - Rc @ [0, 0, 0.10], Rc, (0.18, 0.13, 0.21), 'darkleather')
    scn.ell(mid - Rc @ [0, 0, 0.04], Rc, (0.16, 0.12, 0.15), 'leather')
    scn.box(chest - Rc @ [0, -0.125, 0.10], Rc @ rot(0, 0, 0) @ rot(0.0, 0.0, 0.6), (0.03, 0.012, 0.22), 0.01, 'cloth_teal')
    scn.box(pel + Rp @ [0, 0, 0.07], Rp, (0.17, 0.13, 0.035), 0.02, 'darkleather')
    scn.box(pel + Rp @ [0, 0.13, 0.07], Rp, (0.03, 0.01, 0.03), 0.005, 'bronze')
    # long split coat tails (teal), swaying
    sw = pose.get('tabard', 0)
    for sg in (1, -1):
        scn.box(pel + Rp @ [sg * 0.09, -0.02, -0.22], Rp @ rot(0, -0.12 + sw * 0.8, sg * 0.10), (0.085, 0.014, 0.24), 0.012, 'cloth_teal')
    # feather mantle: overlapping blades radiating from the shoulders, longer at the back
    top = chest + Rc @ [0, -0.02, 0.02]
    for k in range(-5, 6):
        a = k * 0.28
        dirv = Rc @ norm(np.array([np.sin(a), -np.cos(a) * 0.9, -0.55]))
        L = 0.26 + 0.12 * (1 - abs(k) / 5)
        c = top + Rc @ np.array([np.sin(a) * 0.17, -np.cos(a) * 0.11, 0]) + dirv * L * 0.5
        M = frame_from(dirv, Rc @ np.array([np.cos(a), np.sin(a), 0]))
        scn.ell(c, M, (0.062, 0.016, L * 0.55), 'feather' if k % 2 else 'feather_hi')
    # back cape of long feathers
    cape = pose.get('cape', 0.12)
    Mc = Rc @ rot(0, cape, 0)
    for k in range(-2, 3):
        c = chest + Rc @ [k * 0.07, -0.16, -0.02] + Mc @ [0, -0.02, -0.34 - abs(k) * 0.03]
        scn.ell(c, Mc @ rot(0, 0, k * 0.08), (0.05, 0.015, 0.36 - abs(k) * 0.04), 'feather' if k % 2 else 'feather_hi')
    # quiver
    q0 = chest + Rc @ [0.10, -0.17, 0.02]; q1 = chest + Rc @ [-0.08, -0.15, -0.36]
    scn.cone(q0, q1, 0.05, 0.045, 'darkleather')
    for k in range(3):
        scn.cone(q0 + Rc @ [k * 0.02 - 0.02, 0, 0], q0 + Rc @ [k * 0.02 + 0.02, -0.02, 0.12], 0.012, 0.004, 'cloth_white')
    # head: deep hood + porcelain raven beak mask + teal glowing eyes
    scn.cone(chest, J['neck'] + Rc @ [0, 0, 0.02], 0.07, 0.06, 'cloth_teal')
    Rh = J['Rh']; hd = J['head']
    scn.ell(hd + Rh @ [0, -0.01, 0.0], Rh, (0.125, 0.135, 0.14), 'porcelain')
    scn.cone(hd + Rh @ [0, 0.09, -0.01], hd + Rh @ [0, 0.27, -0.07], 0.05, 0.004, 'porcelain')   # beak
    scn.box(hd + Rh @ [0, 0.105, 0.03], Rh, (0.085, 0.01, 0.012), 0.004, 'black')
    for sg in (1, -1):
        scn.sphere(hd + Rh @ [sg * 0.045, 0.118, 0.028], 0.017, 'eye_teal')
    scn.ell(hd + Rh @ [0, -0.075, 0.035], Rh, (0.155, 0.13, 0.165), 'cloth_teal')                 # hood shell (face open)
    scn.cone(hd + Rh @ [0, -0.06, 0.12], hd + Rh @ [0, -0.16, 0.24], 0.07, 0.01, 'cloth_teal')  # hood peak
    for sg in (1, -1):                                                                          # feather crest
        scn.ell(hd + Rh @ [sg * 0.07, -0.08, 0.16], Rh @ rot(0, -0.6, sg * 0.4), (0.03, 0.01, 0.12), 'feather_hi')
    _limbs(scn, J, R0, Rc, 'cloth_teal', 'darkleather', 'leather', 'darkleather', 'leather')


def outfit_mage(scn, J, pose):
    """«Звездочтец Бездны»: flared indigo robe with glowing runes, high star collar,
    porcelain crescent mask, three crystal shards orbiting the head."""
    Rc, Rp, R0 = J['Rc'], J['Rp'], J['R0']
    pel, chest, mid = J['pel'], J['chest'], J['mid']
    scn.ell(chest - Rc @ [0, 0, 0.10], Rc, (0.18, 0.13, 0.22), 'cloth_indigo')
    scn.ell(mid - Rc @ [0, 0, 0.04], Rc, (0.16, 0.12, 0.15), 'cloth_indigo')
    # flared robe down to the ankles (follows pelvis sway)
    sw = pose.get('tabard', 0)
    base = pel + Rp @ [0, sw * 0.25 + 0.03, -0.62]
    scn.cone(pel + Rp @ [0, 0, 0.06], base, 0.19, 0.35, 'cloth_indigo')
    for s in ('R', 'L'):   # robe folds that follow each leg (hide knees while running)
        hp, kn, an = J['hip' + s], J['kn' + s], J['an' + s]
        scn.cone(hp, kn, 0.16, 0.17, 'cloth_indigo'); scn.cone(kn, an + np.array([0, 0, 0.05]), 0.17, 0.2, 'cloth_indigo')
    scn.cone(base + np.array([0, 0, 0.015]), base + np.array([0, 0, 0.04]), 0.352, 0.346, 'gold')      # hem trim
    scn.cone(pel + Rp @ [0, 0, 0.09], pel + Rp @ [0, 0, 0.04], 0.175, 0.175, 'gold')                  # belt
    # glowing rune stripe down the front and runes on the hem
    scn.box(pel + Rp @ [0, 0.21, -0.28], Rp @ rot(0, 0.24, 0), (0.028, 0.006, 0.26), 0.006, 'rune_cyan')
    for k in range(6):
        a = k * np.pi / 3 + 0.3
        p = base + Rp @ np.array([np.sin(a) * 0.30, np.cos(a) * 0.30, 0.13])
        scn.box(p, Rp @ rot(-a, 0, 0), (0.025, 0.006, 0.025), 0.004, 'rune_cyan')
    # high star collar
    nk = J['neck']
    scn.cone(chest + Rc @ [0, -0.02, 0.04], nk + Rc @ [0, -0.07, 0.06], 0.13, 0.16, 'cloth_night')
    for k in range(-3, 4):
        a = k * 0.35
        tip = nk + Rc @ np.array([np.sin(a) * 0.22, -np.cos(a) * 0.17 - 0.04, 0.16])
        scn.cone(nk + Rc @ np.array([np.sin(a) * 0.13, -np.cos(a) * 0.10 - 0.04, 0.04]), tip, 0.028, 0.004, 'gold')
    # shoulder mantle
    for sg in (1, -1):
        scn.ell(J['sh' + ('R' if sg > 0 else 'L')] + Rc @ [sg * 0.03, 0, 0.03], Rc @ rot(0, 0, sg * 0.35), (0.12, 0.12, 0.08), 'cloth_night')
    # head: hood + porcelain crescent mask with cyan eye slits
    Rh = J['Rh']; hd = J['head']
    scn.ell(hd + Rh @ [0, 0.01, -0.005], Rh, (0.115, 0.12, 0.14), 'porcelain')
    for sg in (1, -1):
        scn.box(hd + Rh @ [sg * 0.045, 0.112, 0.025], Rh @ rot(0, 0, sg * 0.25), (0.03, 0.006, 0.008), 0.003, 'rune_cyan')
    scn.box(hd + Rh @ [0, 0.118, -0.05], Rh, (0.006, 0.004, 0.035), 0.002, 'gold')
    scn.ell(hd + Rh @ [0, -0.075, 0.035], Rh, (0.15, 0.125, 0.165), 'cloth_night')
    # crescent moon crown behind the head
    for k in range(9):
        a = -1.25 + k * 0.31
        p = hd + Rh @ np.array([np.sin(a) * 0.19, -0.10, 0.08 + np.cos(a) * 0.19])
        scn.sphere(p, 0.022 + 0.012 * np.cos(a * 1.2), 'gold')
    # three crystal shards orbiting (angle advances with the animation frame)
    orb = pose.get('orbit', 0.0)
    for k in range(3):
        a = orb + k * 2 * np.pi / 3
        c = hd + np.array([np.cos(a) * 0.27, np.sin(a) * 0.27, 0.16 + 0.05 * np.sin(a * 2)])
        up = norm(np.array([0.2 * np.sin(a), 0.2 * np.cos(a), 1.0]))
        scn.ell(c, frame_from(up, np.array([1.0, 0, 0])), (0.036, 0.036, 0.10), 'crystal')
    _limbs(scn, J, R0, Rc, 'cloth_indigo', 'cloth_night', 'porcelain', 'cloth_indigo', 'darkleather', bell=True)


OUTFITS = {'archer': outfit_archer, 'mage': outfit_mage}


# ---------------------------------------------------------------- v2 knight (detailed, stylised)
from rig import Body as _Body
BODY2 = _Body(head=0.14, shw=0.25, neck=0.085)

def _gauntlet(scn, J, s, Rc):
    el, hd = J['el' + s], J['hd' + s]; fa = norm(hd - el)
    side = Rc[:, 0] * (1 if s == 'R' else -1)
    M = frame_from(fa, side)                          # z = along forearm, x = outward
    scn.cone(hd - fa * 0.07, hd - fa * 0.01, 0.058, 0.07, 'steel')            # flared cuff
    scn.cone(hd - fa * 0.075, hd - fa * 0.065, 0.073, 0.073, 'gold')            # cuff rim
    scn.ell(hd + fa * 0.035, M, (0.05, 0.034, 0.05), 'darksteel')              # back of hand
    # four curled fingers around the grip + thumb
    for k in range(4):
        off = (k - 1.5) * 0.019
        k0 = hd + fa * 0.07 + M[:, 0] * off + M[:, 1] * 0.012
        k1 = k0 + fa * 0.03 - M[:, 1] * 0.02
        k2 = k1 - M[:, 1] * 0.028 - fa * 0.008
        scn.cone(k0, k1, 0.0125, 0.012, 'steel'); scn.cone(k1, k2, 0.012, 0.0105, 'darksteel')
    t0 = hd + fa * 0.03 - M[:, 0] * 0.035; t1 = t0 + fa * 0.035 - M[:, 1] * 0.03 + M[:, 0] * 0.01
    scn.cone(t0, t1, 0.014, 0.011, 'steel')

def outfit_knight2(scn, J, pose):
    Rc, Rp, R0 = J['Rc'], J['Rp'], J['R0']
    pel, chest, mid = J['pel'], J['chest'], J['mid']
    # --- breastplate: two shaped pecs + ridge, plackart lames
    scn.ell(chest - Rc @ [0, 0.0, 0.11], Rc, (0.205, 0.14, 0.2), 'darksteel')
    for sg in (1, -1): scn.ell(chest - Rc @ [sg * 0.075, -0.035, 0.09], Rc @ rot(0, 0, sg * 0.25), (0.11, 0.12, 0.13), 'steel')
    scn.box(chest - Rc @ [0, -0.145, 0.09], Rc, (0.014, 0.022, 0.14), 0.01, 'gold')
    for k in range(3):
        scn.ell(mid - Rc @ [0, -0.01 * k, 0.02 + k * 0.055], Rc, (0.175 - k * 0.006, 0.13 - k * 0.004, 0.05), 'steel' if k % 2 == 0 else 'darksteel')
    # gorget
    scn.cone(chest + Rc @ [0, 0, 0.01], J['neck'] + Rc @ [0, 0, 0.0], 0.12, 0.085, 'steel')
    scn.cone(chest + Rc @ [0, 0, 0.0], chest + Rc @ [0, 0, 0.025], 0.125, 0.125, 'gold')
    # --- belt, buckle, pouch
    scn.box(pel + Rp @ [0, 0, 0.075], Rp, (0.185, 0.14, 0.035), 0.025, 'darkleather')
    scn.box(pel + Rp @ [0, 0.142, 0.075], Rp, (0.035, 0.012, 0.03), 0.008, 'gold')
    scn.box(pel + Rp @ [0.15, 0.06, 0.02], Rp @ rot(0.4, 0, 0), (0.045, 0.03, 0.05), 0.015, 'leather')
    # --- tabard with trim & emblem, tassets
    sw = pose.get('tabard', 0)
    T = Rp @ rot(0, -0.08 + sw, 0)
    scn.box(pel + Rp @ [0, 0.128, -0.17], T, (0.10, 0.012, 0.22), 0.01, 'cloth_red')
    for sx in (1, -1): scn.box(pel + Rp @ [sx * 0.098, 0.13, -0.17], T, (0.009, 0.013, 0.22), 0.004, 'gold')
    scn.box(pel + Rp @ [0, 0.141, -0.10], T, (0.03, 0.006, 0.006), 0.002, 'gold'); scn.box(pel + Rp @ [0, 0.141, -0.10], T, (0.006, 0.006, 0.045), 0.002, 'gold')
    scn.cone(pel + Rp @ [0, 0, 0.03], pel + Rp @ [0, 0, -0.14], 0.19, 0.205, 'darksteel')     # mail skirt
    for s, sg in (('R', 1), ('L', -1)):
        hp, kn = J['hip' + s], J['kn' + s]; th = norm(kn - hp)
        Mt = frame_from(th, R0[:, 0])
        for k in range(2): scn.ell(hp + th * (0.06 + k * 0.07) + R0 @ [sg * 0.02, 0.06, 0], Mt, (0.095, 0.05, 0.06), 'steel' if k == 0 else 'darksteel')   # tassets
    # --- cape in three folded panels
    cape = pose.get('cape', 0.12)
    top = chest + Rc @ [0, -0.15, 0.0]
    for k, (dx, ry) in enumerate([(-0.14, 0.18), (0.0, 0.0), (0.14, -0.18)]):
        Mc = Rc @ rot(ry * 0.6, cape + 0.02 * k, 0)
        scn.box(top + Rc @ [dx, -0.01 - abs(dx) * 0.2, 0] + Mc @ [0, 0, -0.42], Mc, (0.095, 0.014, 0.44), 0.018, 'cloth_red')
    for sg in (1, -1): scn.sphere(top + Rc @ [sg * 0.15, 0.05, 0.03], 0.032, 'gold')
    scn.box(chest - Rc @ [0, 0.135, 0.1], Rc, (0.016, 0.02, 0.15), 0.01, 'darksteel')   # backplate spine
    # --- great helm with crest plume
    Rh = J['Rh']; hd = J['head']
    scn.ell(hd + Rh @ [0, 0, 0.01], Rh, (0.135, 0.145, 0.15), 'steel')
    scn.ell(hd + Rh @ [0, 0.06, -0.035], Rh, (0.12, 0.1, 0.11), 'steel')
    scn.box(hd + Rh @ [0, 0.155, 0.01], Rh, (0.075, 0.012, 0.012), 0.004, 'black')       # eye slit
    scn.box(hd + Rh @ [0, 0.153, -0.03], Rh, (0.006, 0.012, 0.05), 0.002, 'gold')
    for k in range(5): scn.sphere(hd + Rh @ [-0.04 + k * 0.02, 0.15, -0.075], 0.006, 'black')   # breaths
    scn.box(hd + Rh @ [0, 0.02, 0.12], Rh, (0.01, 0.11, 0.035), 0.008, 'gold')          # comb
    for k in range(9):   # tall horse-hair plume sweeping back
        a = -0.5 + k * 0.33
        p = hd + Rh @ [0, 0.02 - np.sin(a) * 0.2, 0.17 + np.cos(a) * 0.12 - k * 0.018]
        scn.ell(p, Rh @ rot(0, -a, 0), (0.032, 0.06, 0.035 + 0.008 * (4 - abs(k - 4))), 'cloth_red')
    # --- arms
    for s, sg in (('R', 1), ('L', -1)):
        sh, el, hdn = J['sh' + s], J['el' + s], J['hd' + s]
        for k in range(3):   # layered pauldron lames
            scn.ell(sh + Rc @ [sg * (0.035 + k * 0.022), 0, 0.055 - k * 0.04], Rc @ rot(0, 0, sg * (0.3 + k * 0.15)), (0.135 - k * 0.012, 0.135 - k * 0.01, 0.075), 'steel' if k != 1 else 'darksteel')
        scn.ell(sh + Rc @ [sg * 0.08, 0, -0.03], Rc @ rot(0, 0, sg * 0.6), (0.115, 0.118, 0.012), 'gold')   # gold rim on the lowest lame
        ua = norm(el - sh)
        scn.cone(sh, el, 0.066, 0.055, 'darksteel')
        M = frame_from(ua, Rc[:, 1])
        scn.ell(el - ua * 0.01, M, (0.07, 0.07, 0.05), 'steel')                          # couter
        scn.ell(el - ua * 0.02 + Rc @ [sg * 0.035, -0.02, 0], frame_from(Rc[:, 0] * sg, ua), (0.012, 0.05, 0.045), 'steel')   # couter wing
        scn.cone(el, hdn - norm(hdn - el) * 0.06, 0.06, 0.05, 'steel')
        _gauntlet(scn, J, s, Rc)
        # --- legs
        hp, kn, an = J['hip' + s], J['kn' + s], J['an' + s]; th = norm(kn - hp); sk = norm(an - kn)
        scn.cone(hp, kn, 0.095, 0.07, 'darkleather')
        scn.ell((hp + kn) / 2 + R0 @ [0, 0.03, 0], frame_from(th, R0[:, 0]), (0.085, 0.066, 0.2), 'steel')
        scn.ell(kn + R0 @ [0, 0.04, 0], frame_from(th, R0[:, 0]), (0.06, 0.04, 0.06), 'steel')     # poleyn
        scn.ell(kn + R0 @ [sg * 0.05, 0.02, 0], frame_from(R0[:, 0] * sg, th), (0.015, 0.055, 0.05), 'darksteel')   # poleyn fan
        scn.cone(kn, an, 0.068, 0.052, 'steel')
        scn.box((kn + an) / 2 + R0 @ [0, 0.055, 0], frame_from(sk, R0[:, 0]), (0.008, 0.01, 0.16), 0.004, 'gold')   # greave ridge
        for k in range(3): scn.ell(an + R0 @ [0, 0.03 + k * 0.04, -0.04 + k * 0.004], R0, (0.07 - k * 0.006, 0.05, 0.045), 'steel' if k % 2 == 0 else 'darksteel')  # sabaton lames
        scn.ell(an + R0 @ [0, 0.14, -0.045], R0, (0.05, 0.05, 0.035), 'steel')

OUTFITS['knight2'] = outfit_knight2
