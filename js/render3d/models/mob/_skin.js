// сборка 57: «шкура» нежити подземелий из модели художника (tools/art/glb_mob.py → assets/models/<имя>.bin/.json/.webp).
// Оружие — отдельный предмет внутри модели на своей кости в кулаке (wpnR/wpnL, meta.items), поэтому процедурное оружие не надевается.
// o.bow — лук в кулаке ставится перпендикулярно предплечью (вертикально, рукоятью к цели), когда рука поднята для выстрела;
// o.restDown = { grip } — в покое и на ходу оружие опущено навершием вниз (держит у навершия, доля длины от низа — grip),
// к удару разворачивается обратно в боевой хват.
// o.swing — в атаке и касте древко ставится по фазе: в замахе — вверх (топор чуть вперёд), в ударе — вперёд на цель (посох вперёд-вверх)
// (как нарисовал пользователь, сборка 57, мобы Фьордов); в покое и на ходу — обычный хват.
export function mobSkin(kit, m, name, o = {}) {
  const S = kit.skin;
  if (!(S && S.SKINS.on && S.skinLoaded(name))) return m;
  const { bow, restDown, swing, ...so } = o;
  m = S.attachSkin(kit, m, name, { noEquip: ['handR', 'handL'], rim: 0.6, rimColor: kit.MOB.rimColor.skel, ...so });
  if (!m.skin || !(bow || restDown || swing)) return m;
  const { THREE } = kit, meta = S.skinMeta(name);
  let skel = null; m.root.traverse(x => { if (x.isSkinnedMesh && !x.userData.isOutline) skel = x.skeleton; });
  if (!skel || !meta.items) return m;
  const B = n => skel.getBoneByName(n), root = m.root;
  const fx = [];
  for (const it of meta.items) {
    const wb = B(it.bone); if (!wb) continue;
    const ax = it.axes.map(a => new THREE.Vector3(...a)), rest = wb.position.clone();
    // оси предмета в покое (в системе кости: у костей шкуры поворот покоя нулевой)
    const R0 = new THREE.Matrix4().makeBasis(ax[0], ax[1], ax[2]), R0i = R0.clone().invert();
    if (bow && it.kind === 'bow') fx.push({ type: 'bow', wb, R0i, el: B('el' + it.bone.slice(-1)), hand: wb.parent });
    if (swing && it.kind !== 'bow' && it.kind !== 'shield') fx.push({ type: 'swing', wb, axis: ax[1].clone().normalize(), hand: wb.parent, w: 0, th: it.kind === 'staff' ? [0, 0.95] : [0.35, 1.5] });
    if (restDown && it.kind !== 'bow') {
      // разворот на 180° вокруг оси Z предмета (лезвие остаётся впереди) около точки на древке: хват переезжает к навершию
      const s = (restDown.grip - it.grip) / 2 * it.len;
      fx.push({ type: 'down', wb, rest, P: ax[1].clone().multiplyScalar(s), axis: ax[2].clone().normalize(), w: 1 });
    }
  }
  const sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _y = new THREE.Vector3(), _x = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const rootQ = (o3, out) => { _r.copy(root.matrixWorld).invert().multiply(o3.matrixWorld).decompose(_p, out, _s); return out; };
  const rootP = (o3, out) => out.setFromMatrixPosition(_r.copy(root.matrixWorld).invert().multiply(o3.matrixWorld));
  const DOWN = { idle: 1, walk: 1, hit: 1 }, SWING = { attack: 1, attack2: 1, cast: 1 }, _t = new THREE.Vector3();
  const upd = m.update;
  m.update = (dt, t, env, actor) => {
    if (upd) upd(dt, t, env, actor);
    for (const f of fx) {
      if (f.type === 'down') {
        const tgt = actor && DOWN[actor.clip] ? 1 : 0;
        f.w += (tgt - f.w) * Math.min(1, dt * (tgt ? 6 : 16));   // к удару разворачивается быстро, обратно — плавно
        _q.setFromAxisAngle(f.axis, Math.PI * f.w);
        f.wb.quaternion.copy(_q);
        f.wb.position.copy(f.rest).add(f.P).sub(_a.copy(f.P).applyQuaternion(_q));
      } else if (f.type === 'swing') {
        // по фазе клипа: замах — древко вверх (чуть вперёд), удар — вперёд на цель; к концу клипа — обратно в обычный хват
        const k = actor && SWING[actor.clip] && actor.k != null ? actor.k : null;
        const tgt = k == null ? 0 : 1 - sm((k - 0.75) / 0.25);
        f.w = dt > 0 ? f.w + (tgt - f.w) * Math.min(1, dt * (tgt > f.w ? 14 : 6)) : tgt;   // стоп-кадр (лаборатория) — сразу
        f.wb.quaternion.identity();
        if (f.w < 0.001) continue;
        const th = k == null ? f.th[1] : f.th[0] + (f.th[1] - f.th[0]) * sm((k - 0.4) / 0.15);   // угол от вертикали к цели
        _t.set(0, Math.cos(th), Math.sin(th));
        root.updateMatrixWorld(true);
        rootQ(f.hand, _q2);                                                     // кисть в системе корня (кость оружия в покое = кисть)
        _d.copy(f.axis).applyQuaternion(_q2);                                   // древко сейчас
        _q.setFromUnitVectors(_d, _t);                                          // доворот древка в системе корня
        _q.premultiply(_q2.clone().invert()).multiply(_q2);                     // → в системе кисти
        f.wb.quaternion.identity().slerp(_q, f.w);
      } else {
        // лук: насколько рука поднята вперёд (предплечье к горизонту) — настолько лук вертикально и поперёк руки
        root.updateMatrixWorld(true);
        rootP(f.wb, _a); rootP(f.el, _b); _d.subVectors(_a, _b).normalize();
        const k = Math.min(1, Math.max(0, (_d.y + 0.7) / 0.6)), w = k * k * (3 - 2 * k);
        f.wb.quaternion.identity();
        if (w < 0.001) continue;
        _y.copy(UP).addScaledVector(_d, -UP.dot(_d)).normalize();            // ось лука: вверх, поперёк предплечья
        _x.crossVectors(_y, _d).normalize();                                   // «пузо» лука (ось Z предмета) — по руке к цели
        _m.makeBasis(_x, _y, _d).multiply(f.R0i);                              // поворот в системе корня
        _q.setFromRotationMatrix(_m);
        rootQ(f.hand, _q2);                                                    // кисть в системе корня
        f.wb.quaternion.copy(_q2.invert().multiply(_q)).slerp(_q2.identity(), 1 - w);
      }
    }
  };
  return m;
}
