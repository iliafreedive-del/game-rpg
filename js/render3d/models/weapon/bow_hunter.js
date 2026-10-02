// Лук следопыта: изогнутые плечи из ясеня с латунными наконечниками, кожаная обмотка рукояти. Держится в левой руке.
// Ось плеч лука повёрнута поперёк предплечья (при вытянутой руке лук стоит вертикально, тетива смотрит на лучника).
// Тетива — две тонких линии от кончиков к «зацепу»: пока лучник не тянет, зацеп на месте, при натяжении он идёт за правой кистью героя
// (update(actor) читает actor.model.bowDraw и позицию сокета handR). На тетиве лежит стрела.
export default {
  id: 'bow_hunter', kind: 'weapon', slot: 'handL',
  build(kit) {
    const { THREE, PAL, part, merge } = kit;
    const mat = kit.mat({ rim: 0.5 }), pts = s => [0, 0.2, 0.4, 0.58, 0.72].map(y => [0, s * y, -0.22 * (y / 0.72) ** 2 + 0.05]);
    const pivot = new THREE.Group(); pivot.rotation.x = Math.PI / 2; pivot.scale.setScalar(1.25);   // лук крупнее: тянуть приходится далеко
    const bow = new THREE.Mesh(merge([
      kit.tube(pts(1), 0.035, 0.014, 0x5a3a1c, { top: 0xb88a50, tex: 'wood' }, 6), kit.tube(pts(-1), 0.035, 0.014, 0x5a3a1c, { top: 0xb88a50, tex: 'wood' }, 6),
      part(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 7), 0x3a2418, [0, 0, 0.05], 0, 1, { top: 0x6a4428, tex: 'leather' }),
      ...[1, -1].map(s => part(new THREE.ConeGeometry(0.025, 0.07, 5), PAL.brass, [0, s * 0.74, -0.16], [s * -1.2, 0, 0], 1, { top: 0xf0c868 })),
      ...[1, -1].map(s => part(new THREE.TorusGeometry(0.04, 0.012, 4, 8), PAL.brass, [0, s * 0.3, -0.01 + 0.0], [Math.PI / 2, 0, 0])),
    ]), mat);
    pivot.add(bow);
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xece0c0 }), cyl = new THREE.CylinderGeometry(0.007, 0.007, 1, 3);
    const s1 = new THREE.Mesh(cyl, stringMat), s2 = new THREE.Mesh(cyl, stringMat); s1.userData.noOutline = s2.userData.noOutline = s1.userData.noBake = s2.userData.noBake = true; pivot.add(s1, s2);
    // стрела на тетиве: древко вдоль +Z лука (в сторону цели), оперение сзади, наконечник спереди
    const arrow = new THREE.Group(), amat = kit.mat({ rim: 0.2 });
    arrow.add(new THREE.Mesh(merge([kit.tube([[0, 0, -0.35], [0, 0, 0.5]], 0.013, 0.013, 0xd8c8a0, { top: 0xf0e4c0 }, 4), part(new THREE.ConeGeometry(0.035, 0.12, 4), 0xcfd6e0, [0, 0, 0.56], [Math.PI / 2, 0, 0], [1, 1, 0.5], { top: 0xffffff, tex: 'metal' }),
      ...[0, 1, 2].map(i => part(new THREE.BoxGeometry(0.1, 0.004, 0.16), 0xc03a2a, [0, 0, -0.3], [0, 0, i * 1.047], 1))]), amat));
    arrow.visible = false; pivot.add(arrow);
    const root = new THREE.Group(); root.add(pivot);
    const TOP = new THREE.Vector3(0, 0.74, -0.16), BOT = new THREE.Vector3(0, -0.74, -0.16), REST = new THREE.Vector3(0, 0, -0.17), N = new THREE.Vector3(), W = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    const seg = (m, a, b) => { const d = W.subVectors(b, a), L = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(Y, d.divideScalar(L || 1)); };
    return {
      root, materials: [mat, amat],
      update(actor) {
        const d = actor.model.bowDraw || 0, hand = actor.model.bones && actor.model.bones.handR;
        N.copy(REST);
        if (d > 0.02 && hand) { actor.root.updateMatrixWorld(true); pivot.updateWorldMatrix(true, false); hand.getWorldPosition(W); pivot.worldToLocal(W); N.lerp(W, Math.min(1, d * 1.15)); }
        seg(s1, TOP, N); seg(s2, N, BOT);
        arrow.visible = d > 0.02;
        if (arrow.visible) { arrow.position.copy(N); arrow.position.z += 0.3; }
      },
    };
  },
};
